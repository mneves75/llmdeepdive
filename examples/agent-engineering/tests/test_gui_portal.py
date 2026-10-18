"""The synthetic legacy portal of track 18, exercised over HTTP without a browser."""

import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime, timedelta
from http.cookiejar import CookieJar

from agentlab.gui.portal import ACCOUNT, Portal, report_csv


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class PortalOverHttp(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 3, 31, 9, 0, tzinfo=UTC)
        self.portal = Portal(clock=lambda: self.now)
        self.url = self.portal.start()
        self.addCleanup(self.portal.close)
        self.jar = CookieJar()
        self.http = urllib.request.build_opener(NoRedirect, urllib.request.HTTPCookieProcessor(self.jar))

    def get(self, path):
        try:
            return self.http.open(self.url + path, timeout=5)
        except urllib.error.HTTPError as error:
            return error

    def log_in(self, password=ACCOUNT["password"]):
        form = urllib.parse.urlencode({"username": ACCOUNT["username"], "password": password}).encode()
        try:
            return self.http.open(self.url + "/login", data=form, timeout=5)
        except urllib.error.HTTPError as error:
            return error

    def test_the_right_password_sets_an_http_only_session_and_redirects(self):
        reply = self.log_in()
        self.assertEqual((reply.status, reply.headers["Location"]), (303, "/reports"))
        self.assertIn("HttpOnly", reply.headers["Set-Cookie"])
        self.assertEqual(self.get("/reports").status, 200)

    def test_a_wrong_password_gets_no_session(self):
        self.assertEqual(self.log_in(password="wrong").status, 401)
        self.assertEqual(len(self.jar), 0)
        self.assertEqual(self.get("/reports").headers["Location"], "/login")

    def test_an_expired_session_redirects_to_the_login_page(self):
        self.log_in()
        self.now += timedelta(minutes=16)
        reply = self.get("/reports")
        self.assertEqual((reply.status, reply.headers["Location"]), (303, "/login?expired=1"))

    def test_the_march_export_is_a_csv_attachment(self):
        self.log_in()
        reply = self.get("/export?period=2026-03")
        self.assertEqual(reply.headers["Content-Disposition"], 'attachment; filename="report-2026-03.csv"')
        self.assertEqual(reply.read().decode(), report_csv("2026-03"))

    def test_the_april_export_fails_on_the_server(self):
        self.log_in()
        self.assertEqual(self.get("/export?period=2026-04").status, 500)

    def test_an_export_without_a_session_never_sends_data(self):
        self.assertEqual(self.get("/export?period=2026-03").status, 303)


if __name__ == "__main__":
    unittest.main()
