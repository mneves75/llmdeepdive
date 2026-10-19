"""Lesson 18.4: the CSV is done when the file checks out, not when the banner says so."""

import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

from agentlab.fixtures import load_purchases
from agentlab.gui.browser import click_point, download_report, observe, screenshot_frame
from agentlab.gui.control import ActionBudget
from agentlab.gui.coordinates import viewport_to_image
from agentlab.gui.marks import parse_marks
from agentlab.gui.portal import COOKIE, Portal
from agentlab.gui.trace import Trace

DELAY_MS = 400  # the export arrives this long after the banner already claims success


def setUpModule():
    global PLAYWRIGHT, BROWSER
    PLAYWRIGHT = sync_playwright().start()
    BROWSER = PLAYWRIGHT.chromium.launch()


def tearDownModule():
    BROWSER.close()
    PLAYWRIGHT.stop()


class Download(unittest.TestCase):
    def setUp(self):
        self.portal = Portal(download_delay_ms=DELAY_MS)
        url = self.portal.start()
        self.addCleanup(self.portal.close)
        context = BROWSER.new_context(device_scale_factor=2)
        self.addCleanup(context.close)
        context.add_cookies([{"name": COOKIE, "value": self.portal.issue_session(), "url": url}])
        self.page = context.new_page()
        self.page.goto(url + "/reports")
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        self.folder = Path(root.name) / "downloads" / "run-1"
        self.folder.mkdir(parents=True)
        self.trace = Trace(run_id="r1", secrets=(), clock=lambda: datetime(2026, 3, 31, 9, 0, tzinfo=UTC))

    def export(self, month, period, timeout_ms=3000):
        button = self.page.get_by_role("button", name=f"Download {month} 2026 CSV", exact=True)
        return download_report(self.page, button.click, period=period, folder=self.folder, trace=self.trace, timeout_ms=timeout_ms)

    def test_the_delayed_march_export_matches_the_fixture(self):
        outcome = self.export("March", "2026-03")
        self.assertEqual(outcome.status, "done")
        expected = [p["po_id"] for p in load_purchases() if p["tenant_id"] == "tenant-a"]
        self.assertEqual([row["po_id"] for row in outcome.rows], expected)
        self.assertEqual([p.name for p in self.folder.iterdir()], ["report-2026-03.csv"])

    def test_a_failed_export_is_caught_although_the_banner_says_complete(self):
        outcome = self.export("April", "2026-04", timeout_ms=1500)
        self.assertEqual(outcome.status, "failed")
        self.assertIn("no download started", outcome.reason)
        self.assertEqual(self.page.get_by_role("status").inner_text(), "Export complete. Your download has started.")

    def test_an_html_page_named_csv_is_refused_and_removed(self):
        outcome = self.export("May", "2026-05")
        self.assertEqual(outcome.status, "failed")
        self.assertIn("HTML", outcome.reason)
        self.assertEqual(list(self.folder.iterdir()), [])

    def test_a_file_name_that_climbs_out_of_the_folder_is_refused(self):
        outcome = self.export("July", "2026-07")
        self.assertEqual(outcome.status, "failed")
        self.assertIn("refusing file name", outcome.reason)
        self.assertEqual(list(self.folder.iterdir()), [])
        self.assertFalse((self.folder.parent.parent / "report-2026-07.csv").exists())

    def test_screenshot_only_the_same_checks_apply(self):
        # A vision model sees only the screenshot and answers with an image pixel (scripted here).
        _, frame = screenshot_frame(self.page)
        march = next(m for m in parse_marks(observe(self.page)) if m.name == "Download March 2026 CSV")
        x, y = viewport_to_image(*march.center, frame)
        press = lambda: click_point(self.page, frame, x, y, ActionBudget(2), self.trace)  # noqa: E731
        outcome = download_report(self.page, press, period="2026-03", folder=self.folder, trace=self.trace, timeout_ms=3000)
        self.assertEqual(outcome.status, "done")
        self.assertEqual(len(outcome.rows), 4)


if __name__ == "__main__":
    unittest.main()
