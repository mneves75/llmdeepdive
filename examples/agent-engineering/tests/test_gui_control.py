"""Lessons 18.1 and 18.5: a model proposes a semantic target; the controller counts every action."""

import unittest

from agentlab.gui.control import ActionBudget, BudgetExhausted, propose_target
from agentlab.model import ModelReply, ScriptedModel

SNAPSHOT = '- button "Download March 2026 CSV" [ref=e9]\n- button "Download April 2026 CSV" [ref=e12]'
TASK = "Download the March 2026 report."


def click(**arguments):
    return ScriptedModel([ModelReply(tool_call={"name": "click", "arguments": arguments})])


class ProposeTarget(unittest.TestCase):
    def test_a_role_and_name_become_a_target(self):
        target = propose_target(click(role="button", name="Download March 2026 CSV"), TASK, SNAPSHOT)
        self.assertEqual((target.role, target.name), ("button", "Download March 2026 CSV"))

    def test_the_page_reaches_the_model_marked_as_untrusted(self):
        model = click(role="button", name="Download March 2026 CSV")
        propose_target(model, TASK, SNAPSHOT)
        page_message = model.calls[0][-1]["content"]
        self.assertTrue(page_message.startswith('<untrusted source="portal page">'))
        self.assertIn(SNAPSHOT, page_message)

    def test_a_css_selector_or_coordinates_are_not_a_target(self):
        for arguments in ({"css": "#report-table button"}, {"role": "button", "name": "x", "x": 10, "y": 20}):
            with self.subTest(arguments=arguments):
                self.assertIsNone(propose_target(click(**arguments), TASK, SNAPSHOT))

    def test_prose_instead_of_a_call_is_not_a_target(self):
        model = ScriptedModel([ModelReply(text="I clicked the download button.")])
        self.assertIsNone(propose_target(model, TASK, SNAPSHOT))


class Budget(unittest.TestCase):
    def test_actions_within_the_budget_are_counted(self):
        budget = ActionBudget(limit=3)
        for what in ("observe", "click", "observe"):
            budget.spend(what)
        self.assertEqual(budget.spent, ["observe", "click", "observe"])

    def test_the_action_past_the_budget_raises(self):
        budget = ActionBudget(limit=2)
        budget.spend("observe")
        budget.spend("click")
        with self.assertRaises(BudgetExhausted):
            budget.spend("click")
        self.assertEqual(len(budget.spent), 2)


if __name__ == "__main__":
    unittest.main()
