"""Lesson 18.4: accept a downloaded report only after checking where it came from, where it goes and what it holds.

A click that "worked" proves nothing about the file. The portal's banner can
say the export finished when it failed, an error page can arrive under a
``.csv`` name, and a well-formed file can hold last month's rows. Each check
here catches one of those, and each runs on the file, not on the page.
"""

from __future__ import annotations

import csv
import io
import re
import urllib.parse
from decimal import Decimal, InvalidOperation
from pathlib import Path

REPORT_COLUMNS = ("po_id", "supplier", "item", "quantity", "unit_price", "currency", "status", "period")
MAX_REPORT_BYTES = 1024 * 1024
PO_ID = re.compile(r"^PO-\d{4}$")
CSV_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.csv$")


class ReportRejected(ValueError):
    """The download is not the report that was asked for."""


def check_download_url(url: str, origin: str) -> None:
    """The file must come from the portal itself: same scheme, host and port."""
    parts = urllib.parse.urlsplit(url)
    if f"{parts.scheme}://{parts.netloc}" != origin:
        raise ReportRejected(f"download came from {parts.scheme}://{parts.netloc}, not {origin}")


def safe_destination(folder: Path, suggested_name: str) -> Path:
    """Where to save a download. The name comes from the server's header, so it is untrusted input."""
    if not CSV_NAME.match(suggested_name):
        raise ReportRejected(f"refusing file name {suggested_name!r}")
    target = (folder / suggested_name).resolve()
    if target.parent != folder.resolve():
        raise ReportRejected(f"{suggested_name!r} would land outside {folder}")
    if target.exists():
        raise ReportRejected(f"{target.name} already exists; a download never overwrites a file")
    return target


def validate_report(path: Path, *, period: str) -> list[dict[str, str]]:
    """Parse the file as the report for ``period`` or raise ``ReportRejected`` saying why not."""
    raw = path.read_bytes()
    if len(raw) > MAX_REPORT_BYTES:
        raise ReportRejected(f"{len(raw)} bytes is larger than any report")
    if raw.lstrip()[:1] == b"<":
        raise ReportRejected("the file is HTML, not CSV (an error or login page saved under a .csv name)")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ReportRejected("the file is not UTF-8 text") from error
    reader = csv.DictReader(io.StringIO(text, newline=""))
    if tuple(reader.fieldnames or ()) != REPORT_COLUMNS:
        raise ReportRejected(f"unexpected columns {reader.fieldnames}")
    rows = list(reader)
    if not rows:
        raise ReportRejected("the report has no rows")
    for number, row in enumerate(rows, start=2):
        if row["period"] != period:
            raise ReportRejected(f"line {number} is for period {row['period']}, not {period}")
        if not PO_ID.match(row["po_id"]):
            raise ReportRejected(f"line {number}: bad po_id {row['po_id']!r}")
        try:
            if int(row["quantity"]) <= 0 or Decimal(row["unit_price"]) <= 0:
                raise ValueError
        except (ValueError, InvalidOperation) as error:
            raise ReportRejected(f"line {number}: bad quantity or unit_price") from error
    return rows
