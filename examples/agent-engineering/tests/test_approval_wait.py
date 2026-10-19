"""Lesson 20.3: a durable wait is a row with a deadline, not a sleeping process."""

import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from agentlab.approval.binding import build_request
from agentlab.approval.store import ApprovalStore
from agentlab.domain import InvoiceDraft, Principal

T0 = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)
BUYER = Principal(user_id="u-buyer", tenant_id="tenant-a", roles=frozenset({"buyer"}))
APPROVER = Principal(user_id="u-approver", tenant_id="tenant-a", roles=frozenset({"invoice_approver"}))
DRAFT = InvoiceDraft(invoice_id="INV-0042", version=1, tenant_id="tenant-a", payee="Supplier Gamma", amount=Decimal("10000.00"), currency="USD")
REQUEST = build_request(DRAFT, approval_id="ap-1", operation_id="run-1:submit_invoice", requester=BUYER, now=T0, ttl=timedelta(days=3))


class DurableWait(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "runs.sqlite"
        self.store = ApprovalStore(self.path)
        self.store.open(REQUEST, run_id="run-1")

    def tearDown(self):
        self.store.close()
        self.dir.cleanup()

    def reopen(self) -> ApprovalStore:
        """A new process over the same file: nothing survives but what was committed."""
        self.store.close()
        self.store = ApprovalStore(self.path)
        return self.store

    def test_a_wait_survives_a_restart_and_is_decided_days_later(self):
        store = self.reopen()
        self.assertEqual([r.approval_id for r in store.waiting()], ["ap-1"])
        outcome = store.decide("ap-1", APPROVER, approve=True, now=T0 + timedelta(days=2, hours=23))
        self.assertTrue(outcome.ok)
        self.assertEqual(self.reopen().status("ap-1"), "approved")
        self.assertEqual(self.store.waiting(), [])

    def test_a_denial_is_recorded(self):
        self.assertEqual(self.store.decide("ap-1", APPROVER, approve=False, now=T0).status, "denied")

    def test_a_late_decision_is_refused_and_the_wait_expires(self):
        outcome = self.store.decide("ap-1", APPROVER, approve=True, now=T0 + timedelta(days=3))
        self.assertFalse(outcome.ok)
        self.assertEqual(self.store.status("ap-1"), "expired")

    def test_the_sweeper_expires_only_what_is_due(self):
        self.assertEqual(self.store.expire_due(T0 + timedelta(days=3) - timedelta(seconds=1)), [])
        self.assertEqual(self.store.expire_due(T0 + timedelta(days=3)), ["ap-1"])
        self.assertEqual(self.store.status("ap-1"), "expired")

    def test_a_request_is_decided_once(self):
        self.store.decide("ap-1", APPROVER, approve=True, now=T0)
        second = self.store.decide("ap-1", APPROVER, approve=False, now=T0)
        self.assertFalse(second.ok)
        self.assertEqual(self.store.status("ap-1"), "approved")

    def test_a_refused_approver_leaves_the_wait_pending(self):
        outcome = self.store.decide("ap-1", BUYER, approve=True, now=T0)
        self.assertFalse(outcome.ok)
        self.assertEqual(self.store.status("ap-1"), "pending")

    def test_opening_the_same_approval_twice_is_refused(self):
        with self.assertRaises(ValueError):
            self.store.open(REQUEST, run_id="run-1")


if __name__ == "__main__":
    unittest.main()
