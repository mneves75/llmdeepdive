"""The synthetic legacy portal every track 18 exercise drives.

A fictional supplier portal with no API: sign in, open the reports page,
press a button, get a CSV. It runs on 127.0.0.1 on a port the operating
system picks, inside the test that needs it, and it has the faults the
lessons teach against:

- the session expires after ``session_ttl`` on an injected clock, and every
  page then redirects to ``/login?expired=1``;
- ``mfa=True`` sends a correct sign-in to a one-time-code page instead;
- the banner says "Export complete" when the button is pressed, before the
  server answers, and the export arrives ``download_delay_ms`` later;
- of the five monthly exports, only March is good: April fails on the
  server, May sends an HTML error page as ``report-2026-05.csv``, June sends
  a well-formed file holding March's rows, and July names its file
  ``../../report-2026-07.csv``;
- ``layout`` "a" is a table, "b" the same roles and names in a restructured
  page, and "c" a layout whose buttons no longer say what they export;
- ``notice=True`` covers the page with a maintenance dialog until dismissed.

The account in ``fixtures/gui/account.json`` is synthetic.
"""

from __future__ import annotations

import csv
import io
import json
import secrets
import threading
import urllib.parse
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files

from agentlab.fixtures import load_purchases
from agentlab.gui.report import REPORT_COLUMNS

PAGES = files("agentlab.fixtures") / "gui"
ACCOUNT: dict[str, str] = json.loads((PAGES / "account.json").read_text(encoding="utf-8"))
COOKIE = "portal_session"
NOTICE = (
    '<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="notice-title"><div>'
    '<h2 id="notice-title">Scheduled maintenance</h2>'
    "<p>The portal will be offline on Sunday from 02:00 to 04:00.</p>"
    "<button data-dismiss>Dismiss</button></div></div>"
)


def report_csv(period: str) -> str:
    """The report the portal should send for ``period``: the tenant's purchase records."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(REPORT_COLUMNS)
    for record in load_purchases():
        if record["tenant_id"] == ACCOUNT["tenant_id"]:
            writer.writerow([*(record[column] for column in REPORT_COLUMNS[:-1]), period])
    return out.getvalue()


# period -> (HTTP status, attachment file name or None for an inline page, body).
EXPORTS: dict[str, tuple[int, str | None, Callable[[], str]]] = {
    "2026-03": (200, "report-2026-03.csv", lambda: report_csv("2026-03")),
    "2026-04": (500, None, lambda: "<!doctype html><title>Error</title><p>Export failed.</p>"),
    "2026-05": (200, "report-2026-05.csv", lambda: "<!doctype html><title>Error</title><p>Export failed.</p>"),
    "2026-06": (200, "report-2026-06.csv", lambda: report_csv("2026-03")),
    "2026-07": (200, "../../report-2026-07.csv", lambda: report_csv("2026-07")),
}


class Portal:
    def __init__(self, *, clock: Callable[[], datetime] = lambda: datetime.now(UTC), session_ttl: timedelta = timedelta(minutes=15),
                 layout: str = "a", download_delay_ms: int = 0, notice: bool = False, mfa: bool = False) -> None:
        if layout not in ("a", "b", "c"):
            raise ValueError(f"unknown layout {layout!r}")
        self.clock, self.session_ttl, self.layout = clock, session_ttl, layout
        self.download_delay_ms, self.notice, self.mfa = download_delay_ms, notice, mfa
        self.sessions: dict[str, datetime] = {}
        self.exports_served: list[str] = []
        self._server: ThreadingHTTPServer | None = None

    def start(self) -> str:
        """Serve on 127.0.0.1 with an ephemeral port; return the base URL."""
        handler = type("Handler", (_PortalHandler,), {"portal": self})
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self._server.daemon_threads = True
        threading.Thread(target=self._server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True).start()
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    def close(self) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
            self._server = None

    def issue_session(self) -> str:
        """Start a session as a correct sign-in would; tests that are not about login use it directly."""
        token = secrets.token_hex(16)
        self.sessions[token] = self.clock()
        return token

    def session_state(self, cookie_header: str | None) -> str:
        """'valid', 'expired' or 'none' for the request's session cookie."""
        token = _cookie(cookie_header)
        if token is None or token not in self.sessions:
            return "none"
        return "valid" if self.clock() - self.sessions[token] < self.session_ttl else "expired"


def _cookie(header: str | None) -> str | None:
    for part in (header or "").split(";"):
        name, _, value = part.strip().partition("=")
        if name == COOKIE:
            return value
    return None


class _PortalHandler(BaseHTTPRequestHandler):
    portal: Portal

    def log_message(self, format: str, *args: object) -> None:  # keep test output clean
        pass

    def send(self, status: int, body: str, content_type: str = "text/html; charset=utf-8", headers: dict[str, str] | None = None) -> None:
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(data)

    def redirect(self, location: str, headers: dict[str, str] | None = None) -> None:
        self.send(303, "", headers={"Location": location, **(headers or {})})

    def page(self, name: str, **values: str) -> str:
        text = (PAGES / name).read_text(encoding="utf-8")
        for key, value in values.items():
            text = text.replace("{{" + key + "}}", value)
        return text

    def login_page(self, status: int, message: str = "") -> None:
        self.send(status, self.page("login.html", message=f'<p role="alert">{message}</p>' if message else ""))

    def require_session(self) -> bool:
        state = self.portal.session_state(self.headers.get("Cookie"))
        if state != "valid":
            self.redirect("/login?expired=1" if state == "expired" else "/login")
        return state == "valid"

    def do_GET(self) -> None:
        url = urllib.parse.urlsplit(self.path)
        if url.path in ("/portal.js", "/portal.css"):
            kind = "text/javascript" if url.path.endswith(".js") else "text/css"
            self.send(200, (PAGES / url.path[1:]).read_text(encoding="utf-8"), f"{kind}; charset=utf-8")
        elif url.path == "/":
            self.redirect("/reports")
        elif url.path == "/login":
            expired = urllib.parse.parse_qs(url.query).get("expired") == ["1"]
            self.login_page(200, "Your session has expired. Please sign in again." if expired else "")
        elif url.path == "/verify":
            self.send(200, self.page("verify.html"))
        elif url.path == "/reports":
            if self.require_session():
                notice = NOTICE if self.portal.notice else ""
                self.send(200, self.page(f"reports_{self.portal.layout}.html", user=ACCOUNT["username"],
                                         delay=str(self.portal.download_delay_ms), notice=notice))
        elif url.path == "/export":
            if self.require_session():
                self.export(urllib.parse.parse_qs(url.query).get("period", [""])[0])
        else:
            self.send(404, "<!doctype html><title>Not found</title><p>Not found.</p>")

    def export(self, period: str) -> None:
        if period not in EXPORTS:
            self.send(404, "<!doctype html><title>Not found</title><p>No such report.</p>")
            return
        status, filename, body = EXPORTS[period]
        self.portal.exports_served.append(period)
        if filename is None:
            self.send(status, body())
        else:
            self.send(status, body(), "text/csv; charset=utf-8", {"Content-Disposition": f'attachment; filename="{filename}"'})

    def do_POST(self) -> None:
        if urllib.parse.urlsplit(self.path).path != "/login":
            self.send(404, "<!doctype html><title>Not found</title><p>Not found.</p>")
            return
        length = min(int(self.headers.get("Content-Length") or 0), 4096)
        form = urllib.parse.parse_qs(self.rfile.read(length).decode("utf-8"))
        given = {field: form.get(field, [""])[0].encode() for field in ("username", "password")}
        if not all(secrets.compare_digest(given[field], ACCOUNT[field].encode()) for field in given):
            self.login_page(401, "Wrong username or password.")
            return
        if self.portal.mfa:
            self.redirect("/verify")
            return
        token = self.portal.issue_session()
        cookie = f"{COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={int(self.portal.session_ttl.total_seconds())}"
        self.redirect("/reports", {"Set-Cookie": cookie})
