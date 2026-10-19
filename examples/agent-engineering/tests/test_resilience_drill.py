"""Lesson 24.5: a recovery drill ends in a bounded, labelled result or a clear escalation, never a duplicate effect."""

import dataclasses
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

from agentlab.domain import Principal
from agentlab.resilience.drill import Chaos, ChaosModel, ChaosService, SimulatedCrash, run_batch
from agentlab.resilience.retry import CircuitBreaker
from agentlab.state.checkpoints import CheckpointStore
from agentlab.state.outbox import FakeInvoiceService

BATCH = ["PO-1001", "PO-1002", "PO-1003", "PO-1004"]
BUYER = Principal(user_id="u-buyer-1", tenant_id="tenant-a", roles=frozenset({"buyer"}))
NOW = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)


class Drill(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.path = Path(folder.name) / "runs.sqlite"
        self.accounts_payable = FakeInvoiceService()  # the external system: it outlives any crash of ours
        self.chaos = Chaos.load()

    def drill(self, chaos, **options):
        store = CheckpointStore(self.path)
        self.addCleanup(store.close)
        self.model = ChaosModel(chaos)
        breaker = CircuitBreaker(threshold=2, open_for=timedelta(minutes=5), clock=lambda: NOW)
        return run_batch("batch-1", BATCH, model=self.model, store=store, service=ChaosService(self.accounts_payable, chaos),
                         breaker=breaker, clock=lambda: NOW, principal=BUYER, **options)

    def labels(self, report):
        return {item.po_id: item.label for item in report.items}

    def test_a_calm_run_completes_every_invoice_once(self):
        calm = dataclasses.replace(self.chaos, provider_down_for=frozenset(), lost_reply_after_write=frozenset())
        report = self.drill(calm)
        self.assertEqual(set(self.labels(report).values()), {"complete"})
        self.assertEqual(len(self.accounts_payable.invoices), 4)

    def test_an_outage_degrades_what_it_can_and_escalates_the_rest(self):
        report = self.drill(self.chaos)
        self.assertEqual(self.labels(report), {"PO-1001": "complete", "PO-1002": "degraded", "PO-1003": "escalated", "PO-1004": "degraded"})
        # Two failures on PO-1002 open the breaker; PO-1003 and PO-1004 never reach the provider while it stays open.
        self.assertEqual(self.model.calls, ["PO-1001", "PO-1002", "PO-1002"])
        self.assertEqual(len(self.accounts_payable.invoices), 3)
        self.assertEqual(self.accounts_payable.create_calls, 3)  # PO-1004's lost reply was reconciled, not resent
        self.assertEqual([i.ap_number for i in report.items if i.po_id == "PO-1004"], ["AP-0003"])
        self.assertIn("fixed-layout parser", report.items[1].reason)

    def test_a_crash_after_a_commit_resumes_without_a_second_invoice_or_a_lost_label(self):
        with self.assertRaises(SimulatedCrash):
            self.drill(self.chaos, crash_after="PO-1002")
        self.assertEqual(self.accounts_payable.invoices, {})  # PO-1001 and PO-1002 were queued, nothing delivered
        recovered = dataclasses.replace(self.chaos, provider_down_for=frozenset())
        report = self.drill(recovered)
        self.assertEqual(self.labels(report), {"PO-1001": "complete", "PO-1002": "degraded", "PO-1003": "complete", "PO-1004": "complete"})
        self.assertEqual(self.model.calls, ["PO-1003", "PO-1004"])  # checkpointed items were not read again
        self.assertEqual(len(self.accounts_payable.invoices), 4)

    def test_running_the_same_batch_twice_changes_nothing(self):
        self.drill(self.chaos)
        again = self.drill(self.chaos)
        self.assertEqual(len(self.accounts_payable.invoices), 3)
        self.assertEqual(self.accounts_payable.create_calls, 3)
        self.assertEqual(self.labels(again)["PO-1003"], "escalated")

    def test_cancelling_starts_nothing_new_and_delivers_what_was_committed(self):
        report = self.drill(self.chaos, cancelled=lambda: self.model.calls != [])  # the operator cancels after the first item
        self.assertEqual(self.labels(report), {"PO-1001": "complete", "PO-1002": "cancelled", "PO-1003": "cancelled", "PO-1004": "cancelled"})
        self.assertEqual(len(self.accounts_payable.invoices), 1)


if __name__ == "__main__":
    unittest.main()
