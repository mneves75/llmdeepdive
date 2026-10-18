"""Lesson 18.4: a downloaded report is accepted only after its origin, place, type and content check out."""

import tempfile
import unittest
from pathlib import Path

from agentlab.fixtures import load_purchases
from agentlab.gui.portal import report_csv
from agentlab.gui.report import REPORT_COLUMNS, ReportRejected, check_download_url, safe_destination, validate_report

ORIGIN = "http://127.0.0.1:8123"


class Destination(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.folder = Path(temporary.name)

    def test_a_plain_name_lands_inside_the_folder(self):
        self.assertEqual(safe_destination(self.folder, "report-2026-03.csv"), self.folder.resolve() / "report-2026-03.csv")

    def test_a_name_that_climbs_out_is_refused(self):
        for name in ("../../report-2026-07.csv", "/etc/report.csv", "..", "sub/report.csv", ""):
            with self.subTest(name=name), self.assertRaises(ReportRejected):
                safe_destination(self.folder, name)

    def test_only_a_csv_name_is_accepted(self):
        with self.assertRaises(ReportRejected):
            safe_destination(self.folder, "report-2026-03.exe")

    def test_an_existing_file_is_never_overwritten(self):
        (self.folder / "report-2026-03.csv").write_text("x")
        with self.assertRaises(ReportRejected):
            safe_destination(self.folder, "report-2026-03.csv")


class DownloadUrl(unittest.TestCase):
    def test_the_portal_origin_passes(self):
        check_download_url(f"{ORIGIN}/export?period=2026-03", ORIGIN)

    def test_another_origin_is_refused(self):
        for url in ("http://127.0.0.1:9999/export", "https://127.0.0.1:8123/export", "http://127.0.0.1:8123.evil.invalid/export"):
            with self.subTest(url=url), self.assertRaises(ReportRejected):
                check_download_url(url, ORIGIN)


class Content(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.folder = Path(temporary.name)

    def write(self, text: str) -> Path:
        path = self.folder / "report.csv"
        path.write_text(text, encoding="utf-8")
        return path

    def test_the_portal_report_matches_the_fixture_rows(self):
        rows = validate_report(self.write(report_csv("2026-03")), period="2026-03")
        expected = [p for p in load_purchases() if p["tenant_id"] == "tenant-a"]
        self.assertEqual([r["po_id"] for r in rows], [p["po_id"] for p in expected])
        self.assertEqual(rows[0]["unit_price"], "12.50")

    def test_an_html_page_saved_as_csv_is_refused(self):
        with self.assertRaisesRegex(ReportRejected, "HTML"):
            validate_report(self.write("<!doctype html><title>Error</title><p>Export failed</p>"), period="2026-03")

    def test_unexpected_columns_are_refused(self):
        text = report_csv("2026-03").replace("unit_price", "price", 1)
        with self.assertRaisesRegex(ReportRejected, "columns"):
            validate_report(self.write(text), period="2026-03")

    def test_a_well_formed_report_for_the_wrong_period_is_refused(self):
        with self.assertRaisesRegex(ReportRejected, "period"):
            validate_report(self.write(report_csv("2026-03")), period="2026-06")

    def test_an_empty_report_is_refused(self):
        with self.assertRaisesRegex(ReportRejected, "no rows"):
            validate_report(self.write(",".join(REPORT_COLUMNS) + "\n"), period="2026-03")

    def test_a_bad_amount_is_refused(self):
        text = report_csv("2026-03").replace("12.50", "twelve", 1)
        with self.assertRaisesRegex(ReportRejected, "unit_price"):
            validate_report(self.write(text), period="2026-03")


if __name__ == "__main__":
    unittest.main()
