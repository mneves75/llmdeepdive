"""Lesson 14.2: a transition table with an illegal-move rejection and a step budget."""

import unittest

from agentlab.domain import Principal, RunState
from agentlab.model import ModelReply, ScriptedModel
from agentlab.state.transitions import IllegalTransition, advance, run_until_terminal


def new_run(max_steps: int = 12) -> RunState:
    return RunState(run_id="run-1", principal=Principal(user_id="u1", tenant_id="tenant-a"), max_steps=max_steps)


def scripted_decider(*statuses: str):
    """A model that proposes the next status as plain text; the table decides."""
    model = ScriptedModel([ModelReply(text=status) for status in statuses])
    return model, lambda state: model.complete([{"role": "user", "content": f"status is {state.status}; next?"}]).text


class Transitions(unittest.TestCase):
    def test_a_legal_move_advances_and_counts_a_step(self):
        state = advance(new_run(), "checked")
        self.assertEqual((state.status, state.step), ("checked", 1))

    def test_an_illegal_move_is_rejected(self):
        with self.assertRaises(IllegalTransition):
            advance(new_run(), "completed")

    def test_nothing_leaves_a_terminal_state(self):
        cancelled = advance(new_run(), "cancelled")
        with self.assertRaises(IllegalTransition):
            advance(cancelled, "checked")


class Budget(unittest.TestCase):
    def test_one_revision_loop_still_completes(self):
        model, decide = scripted_decider("checked", "needs_info", "checked", "ready", "completed")
        final = run_until_terminal(new_run(max_steps=6), decide)
        self.assertEqual((final.status, final.step), ("completed", 5))

    def test_a_loop_that_never_settles_stops_at_the_budget(self):
        model, decide = scripted_decider(*(["checked", "needs_info"] * 10))
        final = run_until_terminal(new_run(max_steps=5), decide)
        self.assertEqual((final.status, final.step), ("failed", 5))
        self.assertEqual(len(model.calls), 5)

    def test_a_model_proposing_an_illegal_jump_is_stopped(self):
        model, decide = scripted_decider("checked", "completed")
        with self.assertRaises(IllegalTransition):
            run_until_terminal(new_run(), decide)


if __name__ == "__main__":
    unittest.main()
