"""Lesson 24.4: a model cascade that respects a check, a shared budget, a deadline and a kill switch."""

import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

from agentlab.model import ModelReply, ScriptedModel
from agentlab.resilience.budget import Ledger, usd
from agentlab.resilience.cascade import Tier, invoice_check, run_cascade

START = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)
MESSAGES = [{"role": "user", "content": "Read the supplier invoice for PO-1001 and call extract_invoice."}]


def extracted(total):
    return ModelReply(tool_call={"name": "extract_invoice", "arguments": {"po_id": "PO-1001", "total": total}})


RIGHT, WRONG = extracted("500.00"), extracted("5000.00")


class Cascade(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.ledger = Ledger(Path(folder.name) / "budget.sqlite")
        self.addCleanup(self.ledger.close)
        self.ledger.open_budget("run-7", usd("0.05"))

    def run_with(self, small, large, deadline=timedelta(minutes=1)):
        self.small, self.large = ScriptedModel(small), ScriptedModel(large)
        tiers = [Tier("small", self.small, price=usd("0.002"), latency_s=2.0),
                 Tier("large", self.large, price=usd("0.03"), latency_s=20.0)]
        return run_cascade(tiers, MESSAGES, accept=invoice_check("tenant-a"), ledger=self.ledger, budget_id="run-7",
                           run_id="run-7", clock=lambda: START, deadline=START + deadline)

    def test_a_cheap_answer_that_passes_the_check_stops_the_cascade(self):
        result = self.run_with([RIGHT], [])
        self.assertEqual((result.status, result.tier, result.spent), ("accepted", "small", usd("0.002")))
        self.assertEqual(self.large.calls, [])

    def test_a_cheap_answer_that_fails_the_check_moves_up_one_tier(self):
        result = self.run_with([WRONG], [RIGHT])
        self.assertEqual((result.status, result.tier, result.spent), ("accepted", "large", usd("0.032")))

    def test_a_provider_error_moves_up_too(self):
        result = self.run_with([ModelReply(error="transport: TimeoutError")], [RIGHT])
        self.assertEqual((result.status, result.tier), ("accepted", "large"))

    def test_no_tier_passing_escalates_to_a_person(self):
        result = self.run_with([WRONG], [WRONG])
        self.assertEqual((result.status, result.tier), ("escalated", None))
        self.assertIn("no tier", result.reason)

    def test_a_tier_the_budget_cannot_cover_is_never_called(self):
        self.ledger.reserve("run-7", "another-worker", usd("0.03"))  # USD 0.02 left for this run
        result = self.run_with([WRONG], [RIGHT])
        self.assertEqual(result.status, "escalated")
        self.assertIn("budget", result.reason)
        self.assertEqual(self.large.calls, [])

    def test_a_tier_too_slow_for_the_deadline_is_never_called(self):
        result = self.run_with([WRONG], [RIGHT], deadline=timedelta(seconds=10))
        self.assertIn("deadline", result.reason)
        self.assertEqual(self.large.calls, [])

    def test_the_kill_switch_stops_every_tier(self):
        self.ledger.halt("run-7")
        result = self.run_with([RIGHT], [RIGHT])
        self.assertEqual(result.status, "escalated")
        self.assertEqual((self.small.calls, self.large.calls), ([], []))


class Check(unittest.TestCase):
    def test_the_check_compares_with_the_purchase_record_not_with_the_model(self):
        check = invoice_check("tenant-a")
        self.assertTrue(check(RIGHT))
        self.assertFalse(check(WRONG))
        self.assertFalse(check(ModelReply(text="The total is USD 500.00.")))
        self.assertFalse(check(ModelReply(tool_call={"name": "extract_invoice", "arguments": {"po_id": "PO-2001", "total": "4760.00"}})))
        self.assertFalse(check(ModelReply(tool_call={"name": "extract_invoice", "arguments": {"po_id": "PO-1001", "total": "lots"}})))


if __name__ == "__main__":
    unittest.main()
