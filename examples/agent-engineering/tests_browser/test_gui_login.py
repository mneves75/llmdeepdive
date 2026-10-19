"""Lesson 18.3: sign in from a vault, keep secrets out of the trace, pause when the session expires."""

import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

from agentlab.gui.browser import fetch_report, sign_in
from agentlab.gui.control import ActionBudget, Target
from agentlab.gui.portal import ACCOUNT, Portal
from agentlab.gui.session import Credential, CredentialVault
from agentlab.gui.trace import Trace

MARCH = Target(role="button", name="Download March 2026 CSV")


def setUpModule():
    global PLAYWRIGHT, BROWSER
    PLAYWRIGHT = sync_playwright().start()
    BROWSER = PLAYWRIGHT.chromium.launch()


def tearDownModule():
    BROWSER.close()
    PLAYWRIGHT.stop()


class Login(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 3, 31, 9, 0, tzinfo=UTC)
        self.portal = Portal(clock=lambda: self.now)
        self.origin = self.portal.start()
        self.addCleanup(self.portal.close)
        self.vault = CredentialVault({self.origin: Credential(ACCOUNT["username"], ACCOUNT["password"])})
        self.trace = Trace(run_id="r1", secrets=(ACCOUNT["password"],), clock=lambda: self.now)
        context = BROWSER.new_context()
        self.addCleanup(context.close)
        self.page = context.new_page()
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = Path(folder.name)

    def fetch(self, budget):
        return fetch_report(self.page, MARCH, period="2026-03", folder=self.folder, portal_origin=self.origin, budget=budget, trace=self.trace)

    def test_signing_in_reaches_the_reports_page(self):
        self.page.goto(self.origin + "/login")
        self.assertEqual(sign_in(self.page, self.vault, self.origin, ActionBudget(5), self.trace), "ready")
        self.assertEqual(self.fetch(ActionBudget(5)).status, "done")

    def test_the_password_is_nowhere_in_the_trace(self):
        self.page.goto(self.origin + "/login")
        sign_in(self.page, self.vault, self.origin, ActionBudget(5), self.trace)
        self.fetch(ActionBudget(5))
        self.assertNotIn(ACCOUNT["password"], self.trace.text())
        self.assertIn('"target": "textbox:Password", "value": "[secret]"', self.trace.text())

    def test_page_scripts_cannot_read_the_session_cookie(self):
        self.page.goto(self.origin + "/login")
        sign_in(self.page, self.vault, self.origin, ActionBudget(5), self.trace)
        self.assertEqual(self.page.evaluate("document.cookie"), "")  # HttpOnly
        self.assertEqual(len(self.page.context.cookies()), 1)  # the browser still sends it

    def test_a_lookalike_login_page_gets_no_credential(self):
        clone = Portal()
        clone_origin = clone.start()
        self.addCleanup(clone.close)
        self.page.goto(clone_origin + "/login")
        with self.assertRaises(PermissionError):
            sign_in(self.page, self.vault, self.origin, ActionBudget(5), self.trace)
        self.assertEqual(self.page.get_by_label("Password").input_value(), "")
        self.assertEqual(clone.sessions, {})

    def test_an_expired_session_pauses_instead_of_retrying(self):
        self.page.goto(self.origin + "/login")
        sign_in(self.page, self.vault, self.origin, ActionBudget(5), self.trace)
        self.now += timedelta(minutes=16)
        self.page.reload()
        budget = ActionBudget(5)
        outcome = self.fetch(budget)
        self.assertEqual(outcome.status, "needs_login")
        self.assertEqual(budget.spent, ["observe"])  # one look, no clicks
        self.assertEqual(self.portal.exports_served, [])

    def test_a_one_time_code_hands_the_run_to_a_person(self):
        guarded = Portal(mfa=True)
        origin = guarded.start()
        self.addCleanup(guarded.close)
        vault = CredentialVault({origin: Credential(ACCOUNT["username"], ACCOUNT["password"])})
        self.page.goto(origin + "/login")
        self.assertEqual(sign_in(self.page, vault, origin, ActionBudget(5), self.trace), "needs_human")
        self.assertEqual(self.page.get_by_label("One-time code").input_value(), "")


if __name__ == "__main__":
    unittest.main()
