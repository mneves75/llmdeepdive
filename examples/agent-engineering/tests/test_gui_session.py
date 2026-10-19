"""Lesson 18.3: credentials from a vault, a trace that never holds them, and pages that stop the run."""

import json
import unittest
from datetime import UTC, datetime

from agentlab.domain import ExecutionEvent
from agentlab.gui.session import Credential, CredentialVault, classify_page
from agentlab.gui.trace import Trace

ORIGIN = "http://127.0.0.1:8123"
PASSWORD = "synthetic-portal-pass-0000"


def vault() -> CredentialVault:
    return CredentialVault({ORIGIN: Credential(username="buyer.test", password=PASSWORD)})


def clock() -> datetime:
    return datetime(2026, 3, 31, 9, 0, tzinfo=UTC)


class Vault(unittest.TestCase):
    def test_the_registered_origin_gets_its_credential(self):
        self.assertEqual(vault().release(f"{ORIGIN}/login").username, "buyer.test")

    def test_a_lookalike_origin_gets_nothing(self):
        for url in ("http://127.0.0.1:9999/login", "http://localhost:8123/login", "https://127.0.0.1:8123/login",
                    "http://127.0.0.1:8123.evil.invalid/login"):
            with self.subTest(url=url), self.assertRaises(PermissionError):
                vault().release(url)

    def test_the_password_never_appears_in_a_repr(self):
        self.assertNotIn(PASSWORD, repr(vault()))
        self.assertNotIn(PASSWORD, repr(vault().release(ORIGIN)))


class Redaction(unittest.TestCase):
    def test_a_secret_fill_is_recorded_without_its_value(self):
        trace = Trace(run_id="r1", secrets=(PASSWORD,), clock=clock)
        trace.record("gui.fill", target="textbox:Password", value=PASSWORD)
        self.assertNotIn(PASSWORD, trace.text())
        self.assertIn("[secret]", trace.text())

    def test_a_secret_leaking_through_another_field_is_still_removed(self):
        trace = Trace(run_id="r1", secrets=(PASSWORD,), clock=clock)
        trace.record("gui.navigate", url=f"{ORIGIN}/login?debug={PASSWORD}", notes=[f"typed {PASSWORD}"])
        self.assertNotIn(PASSWORD, trace.text())

    def test_ordinary_values_are_kept(self):
        trace = Trace(run_id="r1", secrets=(PASSWORD,), clock=clock)
        trace.record("gui.fill", target="textbox:Username", value="buyer.test")
        event = json.loads(trace.text())[0]
        self.assertEqual(event["data"], {"target": "textbox:Username", "value": "buyer.test"})

    def test_events_are_ordered_execution_events_with_an_aware_time(self):
        trace = Trace(run_id="r1", secrets=(), clock=clock)
        trace.record("gui.observe")
        trace.record("gui.click", target="button:Sign in")
        self.assertIsInstance(trace.events[1], ExecutionEvent)
        self.assertEqual([e.seq for e in trace.events], [0, 1])
        self.assertEqual(trace.events[0].at.tzinfo, UTC)


class PageState(unittest.TestCase):
    def test_the_reports_page_is_ready(self):
        self.assertEqual(classify_page(f"{ORIGIN}/reports", '- heading "Monthly reports" [level=1]', ORIGIN), "ready")

    def test_a_redirect_to_the_login_page_needs_login(self):
        self.assertEqual(classify_page(f"{ORIGIN}/login?expired=1", '- heading "Sign in"', ORIGIN), "needs_login")

    def test_a_one_time_code_prompt_needs_a_person(self):
        self.assertEqual(classify_page(f"{ORIGIN}/verify", '- textbox "One-time code"', ORIGIN), "needs_human")

    def test_a_page_on_another_origin_needs_a_person(self):
        self.assertEqual(classify_page("http://127.0.0.1:9999/reports", '- heading "Monthly reports"', ORIGIN), "needs_human")


if __name__ == "__main__":
    unittest.main()
