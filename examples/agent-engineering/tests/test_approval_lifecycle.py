"""Lesson 20.5: deny, expire, revoke and resume, and a race that yields at most one effect."""

import itertools
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from agentlab.approval.binding import build_request
from agentlab.approval.store import ApprovalStore
from agentlab.domain import InvoiceDraft, Principal
from agentlab.state.checkpoints import CheckpointStore
from agentlab.state.outbox import FakeInvoiceService, deliver_pending

T0 = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)
BUYER = Principal(user_id="u-buyer", tenant_id="tenant-a", roles=frozenset({"buyer"}))
APPROVER = Principal(user_id="u-approver", tenant_id="tenant-a", roles=frozenset({"invoice_approver"}))
DRAFT = InvoiceDraft(invoice_id="INV-0042", version=1, tenant_id="tenant-a", payee="Supplier Gamma", amount=Decimal("10000.00"), currency="USD")


def request(approval_id: str = "ap-1", draft: InvoiceDraft = DRAFT):
    return build_request(draft, approval_id=approval_id, operation_id="run-1:submit_invoice", requester=BUYER, now=T0, ttl=timedelta(days=3))


class Lifecycle(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "runs.sqlite"
        self.store = ApprovalStore(self.path)
        self.addCleanup(self.store.close)
        self.store.open(request(), run_id="run-1")
        self.checkpoints = CheckpointStore(self.path)
        self.addCleanup(self.checkpoints.close)

    def tearDown(self):
        self.doCleanups()
        self.dir.cleanup()

    def effects(self) -> int:
        return len(self.checkpoints.outbox("pending")) + len(self.checkpoints.outbox("done"))

    def test_an_approved_draft_is_executed_once_through_the_outbox(self):
        self.store.decide("ap-1", APPROVER, approve=True, now=T0)
        self.assertTrue(self.store.execute("ap-1", DRAFT, now=T0).ok)
        self.assertFalse(self.store.execute("ap-1", DRAFT, now=T0).ok)  # one use
        service = FakeInvoiceService()
        deliver_pending(self.checkpoints, service)
        self.assertEqual(self.store.status("ap-1"), "consumed")
        self.assertEqual(service.create_calls, 1)

    def test_a_pending_request_cannot_be_executed(self):
        self.assertFalse(self.store.execute("ap-1", DRAFT, now=T0).ok)
        self.assertEqual(self.effects(), 0)

    def test_an_edited_draft_is_not_executed(self):
        self.store.decide("ap-1", APPROVER, approve=True, now=T0)
        changed = InvoiceDraft.model_validate({**DRAFT.model_dump(), "payee": "Supplier Omega"})
        self.assertFalse(self.store.execute("ap-1", changed, now=T0).ok)
        self.assertEqual(self.effects(), 0)

    def test_an_approval_not_used_before_expiry_lapses(self):
        self.store.decide("ap-1", APPROVER, approve=True, now=T0)
        self.assertFalse(self.store.execute("ap-1", DRAFT, now=T0 + timedelta(days=3)).ok)
        self.assertEqual(self.store.status("ap-1"), "expired")
        self.assertEqual(self.effects(), 0)

    def test_a_revoked_request_cannot_be_approved(self):
        self.assertTrue(self.store.revoke("ap-1", now=T0).ok)
        self.assertFalse(self.store.decide("ap-1", APPROVER, approve=True, now=T0).ok)

    def test_revoking_after_execution_is_too_late(self):
        self.store.decide("ap-1", APPROVER, approve=True, now=T0)
        self.store.execute("ap-1", DRAFT, now=T0)
        outcome = self.store.revoke("ap-1", now=T0)
        self.assertFalse(outcome.ok)
        self.assertEqual(outcome.status, "consumed")  # the effect is queued; undoing it is a new action
        self.assertEqual(self.effects(), 1)

    def test_a_revocation_between_check_and_use_wins(self):
        self.store.decide("ap-1", APPROVER, approve=True, now=T0)
        other_worker = ApprovalStore(self.path)
        self.addCleanup(other_worker.close)
        self.assertEqual(self.store.status("ap-1"), "approved")  # time of check
        other_worker.revoke("ap-1", now=T0)
        self.assertFalse(self.store.execute("ap-1", DRAFT, now=T0).ok)  # time of use re-checks
        self.assertEqual(self.effects(), 0)

    def test_a_denied_run_resumes_with_a_new_request(self):
        self.store.decide("ap-1", APPROVER, approve=False, now=T0)
        corrected = InvoiceDraft.model_validate({**DRAFT.model_dump(), "version": 2, "amount": Decimal("9500.00")})
        self.assertFalse(self.store.execute("ap-1", corrected, now=T0).ok)
        self.store.open(request("ap-2", corrected), run_id="run-1")
        self.store.decide("ap-2", APPROVER, approve=True, now=T0)
        self.assertTrue(self.store.execute("ap-2", corrected, now=T0).ok)
        self.assertEqual(self.effects(), 1)


class Race(unittest.TestCase):
    """Every order of approve, revoke and two workers' execute, on two connections."""

    def run_order(self, order: tuple[str, ...]) -> tuple[int, list[str]]:
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "runs.sqlite"
            worker_a, worker_b = ApprovalStore(path), ApprovalStore(path)
            checkpoints = CheckpointStore(path)
            try:
                worker_a.open(request(), run_id="run-1")
                steps = {
                    "approve": lambda: worker_a.decide("ap-1", APPROVER, approve=True, now=T0),
                    "revoke": lambda: worker_b.revoke("ap-1", now=T0),
                    "execute_a": lambda: worker_a.execute("ap-1", DRAFT, now=T0),
                    "execute_b": lambda: worker_b.execute("ap-1", DRAFT, now=T0),
                }
                won = [step for step in order if steps[step]().ok]
                return len(checkpoints.outbox("pending")), won
            finally:
                worker_a.close()
                worker_b.close()
                checkpoints.close()

    def test_every_interleaving_yields_at_most_one_permitted_effect(self):
        for order in itertools.permutations(["approve", "revoke", "execute_a", "execute_b"]):
            with self.subTest(order=order):
                effects, won = self.run_order(order)
                position = {step: i for i, step in enumerate(order)}
                # An effect is permitted iff some execute comes after approve and before revoke.
                permitted = any(position["approve"] < position[e] < position["revoke"] for e in ("execute_a", "execute_b"))
                self.assertEqual(effects, 1 if permitted else 0)
                self.assertLessEqual(sum(step.startswith("execute") for step in won), 1)


if __name__ == "__main__":
    unittest.main()
