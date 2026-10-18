"""Lesson 21.5: judge a repair by tests the loop never saw, and by what it broke.

Three patches all pass the visible tests. Only the held-out tests tell the
real fix from two overfitted ones, and one of those is worse than no repair.
"""

import tempfile
import unittest
from pathlib import Path

from agentlab.model import ModelReply, ScriptedModel
from agentlab.repair.budget import BudgetStore
from agentlab.repair.evaluate import evaluate
from agentlab.repair.loop import RepairTask, repair
from agentlab.repair.patch import Patch
from agentlab.repair.runner import load_held_out, load_project

PROJECT = load_project()
HELD_OUT = load_held_out()
SOURCE = PROJECT["pricing.py"]
VISIBLE = ("test_pricing",)
TWELVE = "test_pricing_held_out.HeldOut.test_twelve_units_get_the_bulk_discount"
ROUNDING = "test_pricing_held_out.HeldOut.test_a_discounted_line_rounds_half_up_to_the_cent"
TEN = "test_pricing.LineTotal.test_ten_units_get_the_bulk_discount"

FIX = SOURCE.replace("if quantity > BULK_UNITS:", "if quantity >= BULK_UNITS:")
# Overfit 1: discount exactly ten units. Passes the visible tests, breaks twelve.
EXACTLY_TEN = SOURCE.replace("if quantity > BULK_UNITS:", "if quantity == BULK_UNITS:")
# Overfit 2: special-case the visible test's numbers. Breaks nothing, fixes nothing else.
SPECIAL_CASE = SOURCE.replace(
    "    total = quantity * unit_price\n",
    '    if (quantity, unit_price) == (10, Decimal("12.00")):\n        return Decimal("114.00")\n    total = quantity * unit_price\n',
)


def patch(content: str) -> Patch:
    return Patch(hypothesis="The bulk discount misses an order of exactly ten units.", path="pricing.py", content=content)


class HeldOutEvaluation(unittest.TestCase):
    def test_the_real_fix_passes_visible_and_held_out_tests(self):
        result = evaluate(PROJECT, patch(FIX), VISIBLE, HELD_OUT)
        self.assertEqual(result.verdict, "ship")
        self.assertEqual(result.fail_to_pass, frozenset({TEN, ROUNDING}))
        self.assertEqual(result.pass_to_fail, frozenset())
        self.assertEqual((result.original_passed, result.repaired_passed, result.total), (3, 5, 5))

    def test_a_patch_that_breaks_a_passing_test_is_worse_than_no_repair(self):
        result = evaluate(PROJECT, patch(EXACTLY_TEN), VISIBLE, HELD_OUT)
        self.assertEqual(result.verdict, "keep_original")
        self.assertEqual(result.pass_to_fail, frozenset({TWELVE}))
        self.assertIn(TEN, result.fail_to_pass)  # the visible test alone would call this a success

    def test_a_patch_that_only_fits_the_visible_test_is_escalated(self):
        result = evaluate(PROJECT, patch(SPECIAL_CASE), VISIBLE, HELD_OUT)
        self.assertEqual(result.verdict, "escalate")
        self.assertEqual(result.fail_to_fail, frozenset({ROUNDING}))
        self.assertEqual(result.pass_to_fail, frozenset())

    def test_an_incomplete_repaired_run_is_never_shipped(self):
        result = evaluate(PROJECT, patch("import sys\nsys.exit(0)\n" + FIX), VISIBLE, HELD_OUT)
        self.assertEqual(result.verdict, "keep_original")


class HeldOutStaysHeldOut(unittest.TestCase):
    def test_the_loop_never_sees_the_held_out_tests(self):
        with tempfile.TemporaryDirectory(prefix="agentlab-test-") as tmp:
            store = BudgetStore(Path(tmp) / "budget.db")
            try:
                model = ScriptedModel([ModelReply(tool_call={"name": "propose_patch", "arguments": patch(EXACTLY_TEN).model_dump()})])
                task = RepairTask(project=PROJECT, tests=VISIBLE, allowed=frozenset({"pricing.py"}), goal="Make test_pricing pass.")
                outcome = repair(task, model, store, "run-held-out")
            finally:
                store.close()
        self.assertEqual(outcome.status, "repaired")  # the loop's own tests accept the overfit
        prompts = "\n".join(m["content"] for call in model.calls for m in call)
        self.assertNotIn("twelve", prompts)
        self.assertNotIn("test_pricing_held_out", prompts)
        self.assertEqual(evaluate(PROJECT, outcome.patch, VISIBLE, HELD_OUT).verdict, "keep_original")


if __name__ == "__main__":
    unittest.main()
