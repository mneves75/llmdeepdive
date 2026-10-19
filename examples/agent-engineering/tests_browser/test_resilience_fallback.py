"""Lesson 24.3: the retired-route fallback against the real synthetic portal, in a real browser."""

import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

from agentlab.domain import Principal
from agentlab.fixtures import load_purchases
from agentlab.gui.browser import fetch_report
from agentlab.gui.control import ActionBudget
from agentlab.gui.portal import ACCOUNT, COOKIE, Portal
from agentlab.gui.trace import Trace
from agentlab.resilience.classify import Contract, Failure
from agentlab.resilience.fallback import read_report

REPORT = "GET /v1/reports/{period}"
RETIRED = Contract(live=frozenset(), retired={REPORT: "portal_report_download"})
BUYER = Principal(user_id="u-buyer-1", tenant_id=ACCOUNT["tenant_id"], roles=frozenset({"buyer", "reports_reader"}))


def setUpModule():
    global PLAYWRIGHT, BROWSER
    PLAYWRIGHT = sync_playwright().start()
    BROWSER = PLAYWRIGHT.chromium.launch()


def tearDownModule():
    BROWSER.close()
    PLAYWRIGHT.stop()


class PortalFallback(unittest.TestCase):
    def setUp(self):
        self.portal = Portal()
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
        self.trace = Trace(run_id="r1", secrets=(), clock=lambda: datetime(2026, 10, 18, 9, 0, tzinfo=UTC))

    def browser(self, target, period):
        return fetch_report(self.page, target, period=period, folder=self.folder, portal_origin=self.origin,
                            budget=ActionBudget(4), trace=self.trace, timeout_ms=3000)

    def read(self, period, error):
        return read_report(period, api=lambda p: Failure(error, REPORT, "read"), contract=RETIRED,
                           now=datetime(2026, 10, 18, 9, 0, tzinfo=UTC), principal=BUYER,
                           portal_account=ACCOUNT["username"], accounts={ACCOUNT["username"]: BUYER}, browser=self.browser)

    def test_a_retired_route_is_served_by_the_portal_and_verified(self):
        result = self.read("2026-03", "http: status 410")
        self.assertEqual(result.source, "browser")
        expected = [p["po_id"] for p in load_purchases() if p["tenant_id"] == "tenant-a"]
        self.assertEqual([row["po_id"] for row in result.rows], expected)
        self.assertEqual(self.portal.exports_served, ["2026-03"])

    def test_a_403_never_reaches_the_portal(self):
        result = self.read("2026-03", "http: status 403")
        self.assertEqual(result.source, "none")
        self.assertEqual(self.portal.exports_served, [])

    def test_a_fallback_file_that_fails_its_checks_is_no_result(self):
        # June's export holds March's rows: the detour ran, but it did not reach the destination.
        result = self.read("2026-06", "http: status 410")
        self.assertEqual((result.source, result.rows), ("none", ()))
        self.assertEqual(self.portal.exports_served, ["2026-06"])
        self.assertEqual(list(self.folder.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
