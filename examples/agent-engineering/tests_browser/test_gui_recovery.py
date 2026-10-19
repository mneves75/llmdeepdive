"""Lesson 18.5: recover from the expected, escalate on the unknown, and verify the file, not the click."""

import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

from agentlab.gui.browser import fetch_report, stable_view_digest
from agentlab.gui.control import ActionBudget, Target
from agentlab.gui.portal import COOKIE, Portal
from agentlab.gui.trace import Trace


def setUpModule():
    global PLAYWRIGHT, BROWSER
    PLAYWRIGHT = sync_playwright().start()
    BROWSER = PLAYWRIGHT.chromium.launch()


def tearDownModule():
    BROWSER.close()
    PLAYWRIGHT.stop()


def button(month):
    return Target(role="button", name=f"Download {month} 2026 CSV")


class Recovery(unittest.TestCase):
    def open(self, **options):
        self.portal = Portal(**options)
        self.origin = self.portal.start()
        self.addCleanup(self.portal.close)
        context = BROWSER.new_context()
        self.addCleanup(context.close)
        context.add_cookies([{"name": COOKIE, "value": self.portal.issue_session(), "url": self.origin}])
        self.page = context.new_page()
        self.page.goto(self.origin + "/reports")
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = Path(folder.name)
        self.trace = Trace(run_id="r1", secrets=(), clock=lambda: datetime(2026, 3, 31, 9, 0, tzinfo=UTC))

    def fetch(self, target, period, budget):
        return fetch_report(self.page, target, period=period, folder=self.folder, portal_origin=self.origin,
                            budget=budget, trace=self.trace, timeout_ms=2000)

    def test_the_maintenance_dialog_blocks_a_plain_click(self):
        self.open(notice=True)
        with self.assertRaises(PlaywrightTimeout):
            self.page.get_by_role("button", name="Download March 2026 CSV").click(timeout=500)

    def test_the_run_dismisses_the_dialog_then_downloads(self):
        self.open(notice=True)
        budget = ActionBudget(6)
        outcome = self.fetch(button("March"), "2026-03", budget)
        self.assertEqual(outcome.status, "done")
        self.assertEqual(budget.spent, ["observe", "dismiss", "observe", "click"])
        self.assertIn("gui.dismiss", [event.kind for event in self.trace.events])

    def test_a_budget_too_small_escalates_before_acting(self):
        self.open(notice=True)
        outcome = self.fetch(button("March"), "2026-03", ActionBudget(2))
        self.assertEqual(outcome.status, "needs_human")
        self.assertIn("2 actions spent", outcome.reason)
        self.assertEqual(self.portal.exports_served, [])

    def test_an_unknown_layout_escalates_without_clicking(self):
        self.open(layout="c")
        outcome = self.fetch(button("March"), "2026-03", ActionBudget(6))
        self.assertEqual(outcome.status, "needs_human")
        self.assertIn("layout", outcome.reason)
        self.assertEqual(self.portal.exports_served, [])

    def test_the_redesigned_layout_recovers(self):
        self.open(layout="b")
        self.assertEqual(self.fetch(button("March"), "2026-03", ActionBudget(6)).status, "done")

    def test_a_wrong_csv_fails_despite_a_successful_click(self):
        self.open()
        outcome = self.fetch(button("June"), "2026-06", ActionBudget(6))
        self.assertEqual(self.portal.exports_served, ["2026-06"])  # the click worked and a file arrived
        self.assertEqual(outcome.status, "failed")
        self.assertIn("period 2026-03, not 2026-06", outcome.reason)
        self.assertEqual(list(self.folder.iterdir()), [])


class MaskedScreenshot(unittest.TestCase):
    def setUp(self):
        self.portal = Portal()
        origin = self.portal.start()
        self.addCleanup(self.portal.close)
        context = BROWSER.new_context()
        self.addCleanup(context.close)
        context.add_cookies([{"name": COOKIE, "value": self.portal.issue_session(), "url": origin}])
        self.page = context.new_page()
        self.page.clock.install(time=datetime(2026, 3, 31, 9, 0, tzinfo=UTC))
        self.page.goto(origin + "/reports")

    def test_the_ticking_clock_changes_the_raw_screenshot(self):
        before = self.page.screenshot()
        self.page.clock.run_for(1000)
        self.assertNotEqual(before, self.page.screenshot())

    def test_with_the_clock_masked_the_view_is_stable(self):
        before = stable_view_digest(self.page)
        self.page.clock.run_for(1000)
        self.assertEqual(before, stable_view_digest(self.page))

    def test_a_real_change_still_shows_through_the_mask(self):
        before = stable_view_digest(self.page)
        self.page.evaluate("document.getElementById('banner').textContent = 'Export complete. Your download has started.'")
        self.assertNotEqual(before, stable_view_digest(self.page))


if __name__ == "__main__":
    unittest.main()
