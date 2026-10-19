"""Lesson 14.4: idempotency keys, an outbox and reconciliation of unknown outcomes."""

import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from agentlab.domain import InvoiceDraft, Principal, RunState
from agentlab.state.checkpoints import CheckpointStore
from agentlab.state.outbox import FakeInvoiceService, deliver_pending, idempotency_key, reconcile
from agentlab.state.transitions import advance

DRAFT = InvoiceDraft(invoice_id="INV-0001", version=1, tenant_id="tenant-a", payee="Supplier Alpha", amount=Decimal("500.00"), currency="USD")


class Outbox(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.store = CheckpointStore(Path(self.dir.name) / "runs.sqlite")
        self.service = FakeInvoiceService()
        self.key = idempotency_key("run-1", "create_invoice")
        state = RunState(run_id="run-1", principal=Principal(user_id="u1", tenant_id="tenant-a"))
        checked = self.store.save(advance(state, "checked"), expected_version=0)
        self.store.save(advance(checked, "ready"), expected_version=checked.version, effects=[(self.key, DRAFT)])

    def tearDown(self):
        self.store.close()
        self.dir.cleanup()

    def test_a_clean_delivery_marks_the_effect_done(self):
        deliver_pending(self.store, self.service)
        self.assertEqual(self.store.outbox("pending"), [])
        self.assertEqual(self.store.outbox_result(self.key), ("done", "AP-0001"))

    def test_a_duplicated_delivery_produces_one_logical_invoice(self):
        # The service wrote the invoice, then the reply was lost: the sender
        # cannot tell, so it sends again with the same key.
        self.service.fail_next = "after_write"
        deliver_pending(self.store, self.service)
        self.assertEqual(self.service.create(self.key, DRAFT), "AP-0001")
        self.assertEqual(len(self.service.invoices), 1)

    def test_different_operations_still_create_different_invoices(self):
        # Control: deduplication is per key, not "only ever one invoice".
        self.service.create(idempotency_key("run-1", "create_invoice"), DRAFT)
        self.service.create(idempotency_key("run-2", "create_invoice"), DRAFT)
        self.assertEqual(len(self.service.invoices), 2)

    def test_an_unknown_outcome_enters_reconciling(self):
        self.service.fail_next = "after_write"
        deliver_pending(self.store, self.service)
        self.assertEqual(self.store.outbox_result(self.key), ("reconciling", None))

    def test_reconciliation_finds_a_write_that_happened(self):
        self.service.fail_next = "after_write"
        deliver_pending(self.store, self.service)
        reconcile(self.store, self.service)
        self.assertEqual(self.store.outbox_result(self.key), ("done", "AP-0001"))
        self.assertEqual(self.service.create_calls, 1)

    def test_reconciliation_requeues_a_write_that_never_happened(self):
        self.service.fail_next = "before_write"
        deliver_pending(self.store, self.service)
        reconcile(self.store, self.service)
        self.assertEqual(self.store.outbox_result(self.key), ("pending", None))
        deliver_pending(self.store, self.service)
        self.assertEqual(self.store.outbox_result(self.key), ("done", "AP-0001"))
        self.assertEqual(len(self.service.invoices), 1)


if __name__ == "__main__":
    unittest.main()
