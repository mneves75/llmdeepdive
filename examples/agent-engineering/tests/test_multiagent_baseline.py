"""Lesson 22.1: one agent against three, measured on the same fixture tasks."""

import unittest
from decimal import Decimal

from agentlab.model import ModelReply, ScriptedModel
from agentlab.multiagent.baseline import (
    TASKS,
    Call,
    Metrics,
    compare,
    critical_path,
    measure,
    run_single,
    run_team,
)

TENANT = "tenant-a"
TOTALS = {"PO-1001": "500.00", "PO-1002": "1134.00", "PO-1003": "780.00", "PO-1004": "10000.00"}


def single_model(po_ids):
    return ScriptedModel([ModelReply(text=f"{po} {TOTALS[po]}") for po in po_ids])


def team_models(po_ids, synthesis=None):
    lines = [f"{po} {TOTALS[po]}" for po in po_ids]
    return {
        "planner": ScriptedModel([ModelReply(text="One worker per supplier message.")]),
        "worker": ScriptedModel([ModelReply(text=line) for line in lines]),
        "synthesizer": ScriptedModel([ModelReply(text=synthesis if synthesis is not None else "\n".join(lines))]),
    }


def run_both(task_id, synthesis=None):
    task = TASKS[task_id]
    single = measure(run_single(task, single_model(task.po_ids)), TENANT)
    team = measure(run_team(task, team_models(task.po_ids, synthesis)), TENANT)
    return single, team


class CriticalPath(unittest.TestCase):
    def test_parallel_calls_count_once_and_a_chain_counts_every_link(self):
        fan_out = (Call("p", 10, 1), Call("w", 10, 1, after=(0,)), Call("w", 10, 1, after=(0,)), Call("s", 10, 1, after=(1, 2)))
        chain = (Call("a", 10, 1), Call("a", 10, 1, after=(0,)), Call("a", 10, 1, after=(1,)), Call("a", 10, 1, after=(2,)))
        self.assertEqual(critical_path(fan_out), 3)
        self.assertEqual(critical_path(chain), 4)

    def test_a_call_cannot_wait_for_a_later_call(self):
        # A forward reference would let a trace hide a cycle and report a short path.
        with self.assertRaises(ValueError):
            critical_path((Call("a", 1, 1, after=(1,)), Call("b", 1, 1)))


class Measurement(unittest.TestCase):
    def test_one_invoice_three_agents_cost_more_and_are_slower(self):
        single, team = run_both("one-invoice")
        self.assertTrue(single.success and team.success)
        self.assertEqual((single.critical_path, team.critical_path), (1, 3))
        self.assertGreater(team.input_tokens + team.output_tokens, single.input_tokens + single.output_tokens)

    def test_four_invoices_three_agents_are_shorter_and_read_less(self):
        # More calls, yet fewer tokens: each worker reads one message, while the single agent re-reads all before it.
        single, team = run_both("four-invoices")
        self.assertEqual((single.critical_path, team.critical_path), (4, 3))
        self.assertEqual((single.calls, team.calls), (4, 6))
        self.assertGreater(single.input_tokens, team.input_tokens)

    def test_the_single_agent_rereads_its_growing_context(self):
        task = TASKS["four-invoices"]
        run = run_single(task, single_model(task.po_ids))
        inputs = [call.input_tokens for call in run.calls]
        self.assertEqual(inputs, sorted(inputs))
        self.assertLess(inputs[0], inputs[-1])

    def test_success_is_checked_against_the_purchase_records_not_the_agents_word(self):
        task = TASKS["one-invoice"]
        wrong = ScriptedModel([ModelReply(text="PO-1001 5000.00")])
        self.assertFalse(measure(run_single(task, wrong), TENANT).success)

    def test_a_dropped_line_in_the_synthesis_is_a_failure(self):
        _, team = run_both("four-invoices", synthesis="PO-1001 500.00\nPO-1002 1134.00\nPO-1003 780.00")
        self.assertFalse(team.success)


class Comparison(unittest.TestCase):
    def setUp(self):
        self.single = [run_both(task_id)[0] for task_id in ("one-invoice", "four-invoices")]

    def test_the_team_is_not_adopted_when_it_is_slower_on_the_mix(self):
        team = [run_both(task_id)[1] for task_id in ("one-invoice", "four-invoices")]
        verdict = compare(self.single, team, max_cost_ratio=Decimal("3"))
        self.assertFalse(verdict.adopt)
        self.assertTrue(any("critical path" in reason for reason in verdict.reasons))

    def test_a_faster_team_that_loses_a_task_is_not_adopted(self):
        single = [run_both("four-invoices")[0]]
        team = [run_both("four-invoices", synthesis="PO-1001 500.00")[1]]
        verdict = compare(single, team, max_cost_ratio=Decimal("10"))
        self.assertFalse(verdict.adopt)
        self.assertIn("four-invoices", " ".join(verdict.reasons))

    def test_a_faster_team_within_the_cost_limit_is_adopted(self):
        # Positive control: without it, a compare() that always refused would pass every test above.
        single, team = run_both("four-invoices")
        verdict = compare([single], [team], max_cost_ratio=Decimal("10"))
        self.assertTrue(verdict.adopt, verdict.reasons)

    def test_a_faster_team_over_the_cost_limit_is_not_adopted(self):
        single = Metrics("t", 4, 700, 20, Decimal("0.0004"), 4, True)
        team = Metrics("t", 6, 2000, 60, Decimal("0.0012"), 3, True)
        verdict = compare([single], [team], max_cost_ratio=Decimal("2"))
        self.assertFalse(verdict.adopt)
        self.assertIn("3.00 times", verdict.reasons[0])

    def test_results_on_different_tasks_cannot_be_compared(self):
        single = [run_both("one-invoice")[0]]
        team = [run_both("four-invoices")[1]]
        with self.assertRaises(ValueError):
            compare(single, team, max_cost_ratio=Decimal("3"))


if __name__ == "__main__":
    unittest.main()
