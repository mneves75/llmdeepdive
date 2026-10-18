"""Lesson 14.2: a finite-state transition system with a step budget.

The table lists every legal move. Anything else, including a move a model
proposed, raises. The one cycle (``checked`` -> ``needs_info`` -> ``checked``)
is bounded by ``RunState.max_steps``: the transition that would use the last
step without finishing the run ends it in ``failed`` instead.
"""

from __future__ import annotations

from collections.abc import Callable

from agentlab.domain import RunState

TERMINAL = frozenset({"completed", "failed", "cancelled"})

# Track 20 adds ``awaiting_approval``; until then no row leads to it.
TRANSITIONS: dict[str, frozenset[str]] = {
    "received": frozenset({"checked", "cancelled", "failed"}),
    "checked": frozenset({"needs_info", "ready", "cancelled", "failed"}),
    "needs_info": frozenset({"checked", "cancelled", "failed"}),
    "ready": frozenset({"completed", "cancelled", "failed"}),
    "completed": frozenset(),
    "failed": frozenset(),
    "cancelled": frozenset(),
}


class IllegalTransition(ValueError):
    """The table has no row for this move."""


def advance(state: RunState, to: str) -> RunState:
    """Return the next state, or raise ``IllegalTransition``.

    The new record is validated again, because ``model_copy`` would accept a
    status the record does not allow.
    """
    if to not in TRANSITIONS.get(state.status, frozenset()):
        raise IllegalTransition(f"{state.status} -> {to} is not in the table")
    step = state.step + 1
    if step >= state.max_steps and to not in TERMINAL:
        to = "failed"  # the budget is spent and the run has not finished
    return RunState.model_validate({**state.model_dump(), "status": to, "step": step})


def run_until_terminal(state: RunState, decide: Callable[[RunState], str]) -> RunState:
    """Ask ``decide`` for each next status until the run reaches a terminal state.

    The loop always ends: every move adds a step, and the budget turns the
    last one into ``failed``.
    """
    while state.status not in TERMINAL:
        state = advance(state, decide(state))
    return state
