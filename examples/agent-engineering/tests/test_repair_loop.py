"""Lesson 21.4: at most three repair attempts, token and time limits, and counters that survive a restart.

"Three attempts" means three repair attempts after the initial failing run.
The scripted model proposes patches; the tests decide. Time comes from an
injected clock, so the wall-time limit is tested without waiting.
"""

import tempfile
import unittest
from pathlib import Path

from agentlab.model import ModelReply, ScriptExhausted, ScriptedModel
from agentlab.repair.budget import Budget, BudgetStore, retry_odds
from agentlab.repair.loop import RepairTask, repair
from agentlab.repair.runner import load_project

PROJECT = load_project()
SOURCE = PROJECT["pricing.py"]
FIX = SOURCE.replace("if quantity > BULK_UNITS:", "if quantity >= BULK_UNITS:")
TASK = RepairTask(project=PROJECT, tests=("test_pricing",), allowed=frozenset({"pricing.py"}), goal="Make test_pricing pass.")


def propose(content: str, hypothesis: str = "The bulk discount condition is off by one unit.", path: str = "pricing.py") -> ModelReply:
    return ModelReply(tool_call={"name": "propose_patch", "arguments": {"hypothesis": hypothesis, "path": path, "content": content}})


def review(verdict: str) -> ModelReply:
    return ModelReply(tool_call={"name": "review", "arguments": {"verdict": verdict, "reason": "The diff reads well."}})


# Three different wrong patches: each fails in a different way, so none is a repeat.
WRONG = [
    propose(SOURCE.replace("BULK_DISCOUNT = Decimal(\"0.05\")", "BULK_DISCOUNT = Decimal(\"0.5\")"), "The discount rate is too small."),
    propose(SOURCE.replace("if quantity > BULK_UNITS:", "if quantity >= BULK_UNITS"), "Ten units should qualify."),
    propose(SOURCE.replace("total = quantity * unit_price", "total = quantity * unit_price + None"), "Force a recomputation of the total."),
]


class Clock:
    """Advances by ``step`` seconds on every reading."""

    def __init__(self, step: float) -> None:
        self.now, self.step = 0.0, step

    def __call__(self) -> float:
        self.now += self.step
        return self.now


class Loop(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="agentlab-test-")
        self.path = Path(self.tmp.name) / "budget.db"
        self.store = BudgetStore(self.path)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_a_passing_run_needs_no_repair_and_no_model_call(self):
        model = ScriptedModel([])
        outcome = repair(RepairTask(project={**PROJECT, "pricing.py": FIX}, tests=TASK.tests, allowed=TASK.allowed, goal=TASK.goal), model, self.store, "run-0")
        self.assertEqual((outcome.status, model.calls), ("not_needed", []))

    def test_a_fix_on_the_second_attempt_is_accepted(self):
        outcome = repair(TASK, ScriptedModel([WRONG[0], propose(FIX)]), self.store, "run-1")
        self.assertEqual(outcome.status, "repaired")
        self.assertEqual(outcome.spent.attempts, 2)
        self.assertEqual(outcome.patch.content, FIX)

    def test_the_third_failed_repair_escalates(self):
        model = ScriptedModel(WRONG + [propose(FIX)])  # a fourth reply exists; the loop must not ask for it
        outcome = repair(TASK, model, self.store, "run-2")
        self.assertEqual(outcome.status, "escalated")
        self.assertEqual(len(model.calls), 3)
        self.assertEqual(outcome.reason, "budget: 3 of 3 repair attempts used")
        self.assertEqual([a.result for a in outcome.attempts], ["assertion", "syntax", "runtime"])

    def test_counters_survive_a_restart_mid_attempt(self):
        with self.assertRaises(ScriptExhausted):
            repair(TASK, ScriptedModel([WRONG[0]]), self.store, "run-3")  # dies inside attempt 2
        self.store.close()
        self.store = BudgetStore(self.path)  # a new process opens the same file
        self.assertEqual(self.store.load("run-3").attempts, 2)  # charged before the model call
        model = ScriptedModel([WRONG[2], propose(FIX)])
        outcome = repair(TASK, model, self.store, "run-3")
        self.assertEqual(len(model.calls), 1)
        self.assertEqual((outcome.status, outcome.spent.attempts), ("escalated", 3))

    def test_the_same_failure_twice_in_a_row_stops_early(self):
        rate = lambda r: propose(SOURCE.replace('Decimal("0.05")', f'Decimal("{r}")'), f"The discount rate should be {r}.")
        outcome = repair(TASK, ScriptedModel([rate("0.5"), rate("0.25"), propose(FIX)]), self.store, "run-4")
        self.assertEqual(outcome.status, "escalated")
        self.assertTrue(outcome.reason.startswith("repeated failure:"))
        self.assertEqual(outcome.spent.attempts, 2)

    def test_the_token_budget_stops_the_loop(self):
        outcome = repair(TASK, ScriptedModel(WRONG + [propose(FIX)]), self.store, "run-5", Budget(max_tokens=1_000))
        self.assertEqual(outcome.status, "escalated")
        self.assertTrue(outcome.reason.startswith("budget: tokens"))
        self.assertLess(outcome.spent.attempts, 3)

    def test_the_wall_time_budget_stops_the_loop(self):
        outcome = repair(TASK, ScriptedModel(WRONG + [propose(FIX)]), self.store, "run-6", Budget(max_seconds=150), clock=Clock(100.0))
        self.assertEqual(outcome.status, "escalated")
        self.assertTrue(outcome.reason.startswith("budget: wall time"))
        self.assertEqual(outcome.spent.attempts, 2)

    def test_a_critic_approval_does_not_end_the_loop_while_the_tests_fail(self):
        critic = ScriptedModel([review("approve"), review("approve")])
        outcome = repair(TASK, ScriptedModel([WRONG[0], propose(FIX)]), self.store, "run-7", critic=critic)
        self.assertEqual(outcome.status, "repaired")
        self.assertEqual(outcome.attempts[0].result, "assertion")

    def test_a_critic_objection_to_passing_tests_escalates(self):
        outcome = repair(TASK, ScriptedModel([propose(FIX)]), self.store, "run-8", critic=ScriptedModel([review("object")]))
        self.assertEqual((outcome.status, outcome.reason), ("escalated", "critic objected to a passing patch: The diff reads well."))


class RetryOdds(unittest.TestCase):
    def test_the_lesson_numbers(self):
        odds = retry_odds(success=0.4, attempts=3, cost_per_attempt=0.12)
        self.assertAlmostEqual(odds.p_success, 0.784)
        self.assertAlmostEqual(odds.p_escalate, 0.216)
        self.assertAlmostEqual(odds.expected_attempts, 1.96)
        self.assertAlmostEqual(odds.expected_cost, 0.2352)
        self.assertAlmostEqual(odds.worst_cost, 0.36)


if __name__ == "__main__":
    unittest.main()
