"""Lesson 24.1: classify a failure before choosing stop, retry, reconcile or a fallback candidate."""

import unittest
from datetime import UTC, datetime

from agentlab.resilience.classify import Contract, Failure, classify, retry_after_seconds

NOW = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)
PO = "GET /v2/purchase-orders/{po_id}"
REPORT = "GET /v1/reports/{period}"
OLD_EXPORT = "GET /v1/exports/{period}"
INVOICE = "POST /v2/invoices"
CONTRACT = Contract(live=frozenset({PO, REPORT, INVOICE}), retired={REPORT: "portal_report_download", OLD_EXPORT: None})


def verdict(error, route=PO, effect="read", **extra):
    return classify(Failure(error=error, route=route, effect=effect, **extra), CONTRACT, NOW)


class NotFound(unittest.TestCase):
    def test_a_404_on_a_live_route_stops_because_missing_and_hidden_look_the_same(self):
        # RFC 9110 lets a server answer 404 for a resource it will not disclose, so this
        # 404 may be another tenant's order. Neither a retry nor a fallback is safe.
        result = verdict("http: status 404")
        self.assertEqual(result.action, "stop")
        self.assertIn("not visible", result.reason)

    def test_a_404_on_a_route_outside_the_contract_is_the_clients_bug(self):
        result = verdict("http: status 404", route="GET /v2/purchase-order/{po_id}")
        self.assertEqual(result.action, "stop")
        self.assertIn("wrong route", result.reason)

    def test_a_retired_read_route_with_an_approved_equivalent_is_a_fallback_candidate(self):
        for status in (404, 410):
            with self.subTest(status=status):
                result = verdict(f"http: status {status}", route=REPORT)
                self.assertEqual(result.action, "fallback")
                self.assertEqual(result.equivalent, "portal_report_download")

    def test_a_retired_route_without_an_equivalent_stops(self):
        self.assertEqual(verdict("http: status 410", route=OLD_EXPORT).action, "stop")

    def test_a_retired_route_is_never_a_fallback_for_a_write(self):
        retired_write = Contract(live=frozenset(), retired={INVOICE: "portal_invoice_form"})
        result = classify(Failure("http: status 410", INVOICE, "write", idempotency_key="run-1:create_invoice"), retired_write, NOW)
        self.assertEqual(result.action, "stop")


class Authorization(unittest.TestCase):
    def test_401_and_403_stop_even_on_a_retired_route(self):
        for status in (401, 403):
            with self.subTest(status=status):
                self.assertEqual(verdict(f"http: status {status}", route=REPORT).action, "stop")


class Transient(unittest.TestCase):
    def test_429_and_503_retry_after_the_servers_delay(self):
        result = verdict("http: status 429", retry_after="120")
        self.assertEqual((result.action, result.wait_s), ("retry", 120.0))
        result = verdict("http: status 503", retry_after="Sun, 18 Oct 2026 09:00:30 GMT")
        self.assertEqual((result.action, result.wait_s), ("retry", 30.0))

    def test_a_read_that_timed_out_or_hit_a_5xx_retries(self):
        for error in ("transport: TimeoutError", "http: status 500", "http: status 502", "http: status 504"):
            with self.subTest(error=error):
                self.assertEqual(verdict(error).action, "retry")

    def test_an_unkeyed_write_with_an_unknown_outcome_reconciles(self):
        for error in ("transport: TimeoutError", "http: status 504", "http: status 503"):
            with self.subTest(error=error):
                self.assertEqual(verdict(error, route=INVOICE, effect="write").action, "reconcile")

    def test_a_keyed_write_may_retry_because_a_repeat_returns_the_recorded_result(self):
        # Control for the case above: the idempotency key from lesson 14.4 is what makes it safe.
        result = verdict("transport: TimeoutError", route=INVOICE, effect="write", idempotency_key="run-1:create_invoice")
        self.assertEqual(result.action, "retry")


class Other(unittest.TestCase):
    def test_a_protocol_error_stops(self):
        self.assertEqual(verdict("protocol: reply is not JSON").action, "stop")

    def test_other_client_errors_stop(self):
        for status in (400, 409, 422):
            with self.subTest(status=status):
                self.assertEqual(verdict(f"http: status {status}").action, "stop")

    def test_an_unrecognised_error_string_stops(self):
        self.assertEqual(verdict("something odd").action, "stop")
        self.assertEqual(verdict("http: status teapot").action, "stop")


class RetryAfter(unittest.TestCase):
    def test_both_forms_and_garbage(self):
        self.assertEqual(retry_after_seconds("0", NOW), 0.0)
        self.assertEqual(retry_after_seconds("Sun, 18 Oct 2026 09:02:00 GMT", NOW), 120.0)
        self.assertEqual(retry_after_seconds("Sun, 18 Oct 2026 08:00:00 GMT", NOW), 0.0)  # a date in the past means now
        for bad in (None, "-5", "1.5", "²", "soon", ""):
            with self.subTest(bad=bad):
                self.assertIsNone(retry_after_seconds(bad, NOW))


if __name__ == "__main__":
    unittest.main()
