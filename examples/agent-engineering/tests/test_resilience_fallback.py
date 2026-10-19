"""Lesson 24.3: an API-to-browser fallback runs only for a retired read route, as the same principal."""

import unittest
from datetime import UTC, datetime

from agentlab.domain import Principal
from agentlab.gui.control import Outcome, Target
from agentlab.resilience.classify import Contract, Failure
from agentlab.resilience.fallback import read_report, report_target

NOW = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)
REPORT = "GET /v1/reports/{period}"
RETIRED = Contract(live=frozenset(), retired={REPORT: "portal_report_download"})
BUYER = Principal(user_id="u-buyer-1", tenant_id="tenant-a", roles=frozenset({"buyer", "reports_reader"}))
ROWS = ({"po_id": "PO-1001", "period": "2026-03"},)


class FakeBrowser:
    def __init__(self, outcome=Outcome("done", "1 rows for 2026-03", ROWS)):
        self.outcome, self.calls = outcome, []

    def __call__(self, target, period):
        self.calls.append((target, period))
        return self.outcome


def api_failing(error, effect="read"):
    return lambda period: Failure(error, REPORT, effect)


def attempt(api, *, contract=RETIRED, principal=BUYER, account="buyer.test", accounts=None, browser=None):
    browser = browser or FakeBrowser()
    accounts = {"buyer.test": BUYER} if accounts is None else accounts
    result = read_report("2026-03", api=api, contract=contract, now=NOW, principal=principal,
                         portal_account=account, accounts=accounts, browser=browser)
    return result, browser


class Allowed(unittest.TestCase):
    def test_a_retired_route_falls_back_to_the_fixed_button_as_the_same_principal(self):
        result, browser = attempt(api_failing("http: status 410"))
        self.assertEqual(result.source, "browser")
        self.assertEqual(result.rows, ROWS)
        self.assertEqual(browser.calls, [(Target(role="button", name="Download March 2026 CSV"), "2026-03")])

    def test_a_working_api_never_touches_the_browser(self):
        result, browser = attempt(lambda period: list(ROWS))
        self.assertEqual((result.source, browser.calls), ("api", []))


class Refused(unittest.TestCase):
    def assert_refused(self, result, browser, words):
        self.assertEqual(result.source, "none")
        self.assertEqual(browser.calls, [])
        self.assertIn(words, result.reason)

    def test_401_and_403_never_fall_back(self):
        for status in (401, 403):
            with self.subTest(status=status):
                self.assert_refused(*attempt(api_failing(f"http: status {status}")), "stop")

    def test_a_404_on_a_live_route_never_falls_back(self):
        live = Contract(live=frozenset({REPORT}), retired={})
        self.assert_refused(*attempt(api_failing("http: status 404"), contract=live), "not visible")

    def test_an_uncertain_write_never_falls_back(self):
        self.assert_refused(*attempt(api_failing("transport: TimeoutError", effect="write")), "reconcile")

    def test_a_portal_account_for_another_user_is_refused(self):
        shared = Principal(user_id="svc-portal", tenant_id="tenant-a", roles=frozenset({"buyer", "reports_reader"}))
        self.assert_refused(*attempt(api_failing("http: status 410"), accounts={"buyer.test": shared}), "different principal")

    def test_a_portal_account_with_more_permissions_is_refused(self):
        broader = Principal(user_id="u-buyer-1", tenant_id="tenant-a", roles=frozenset({"buyer", "reports_reader", "invoice_approver"}))
        self.assert_refused(*attempt(api_failing("http: status 410"), accounts={"buyer.test": broader}), "different principal")

    def test_an_unmapped_portal_account_is_refused(self):
        self.assert_refused(*attempt(api_failing("http: status 410"), accounts={}), "not mapped")

    def test_a_principal_without_the_permission_cannot_use_the_detour(self):
        clerk = Principal(user_id="u-clerk-1", tenant_id="tenant-a", roles=frozenset({"buyer"}))
        self.assert_refused(*attempt(api_failing("http: status 410"), principal=clerk, accounts={"buyer.test": clerk}), "reports_reader")


class Postcondition(unittest.TestCase):
    def test_a_browser_run_that_does_not_verify_is_no_result(self):
        browser = FakeBrowser(Outcome("failed", "line 2 is for period 2026-03, not 2026-06"))
        result, browser = attempt(api_failing("http: status 410"), browser=browser)
        self.assertEqual((result.source, result.rows), ("none", ()))
        self.assertIn("not 2026-06", result.reason)


class Target_(unittest.TestCase):
    def test_periods_map_to_one_fixed_button_and_others_are_refused(self):
        self.assertEqual(report_target("2026-07").name, "Download July 2026 CSV")
        for bad in ("2026-13", "26-03", "2026-03; drop"):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                report_target(bad)


if __name__ == "__main__":
    unittest.main()
