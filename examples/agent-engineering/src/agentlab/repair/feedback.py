"""Lesson 21.1: classify what a run says, and decide what a critic's opinion may change.

Executable signals (a syntax error, a failed assertion, an exception, a
resource limit) are measurements of the code. An environment failure (a
missing dependency, a sandbox that could not start) is a measurement of the
machine: editing the allowed files cannot install a package, so it goes to a
person. A critic's opinion is advice. It may send a passing patch to a person,
and it can never turn a failing test into an accepted patch.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from agentlab.repair.failure import Failure, parse_failure
from agentlab.repair.runner import TestRun

Kind = Literal["passed", "syntax", "assertion", "runtime", "limit", "incomplete", "environment"]
Step = Literal["accept", "repair", "escalate"]


@dataclass(frozen=True)
class Feedback:
    kind: Kind
    detail: str
    failure: Failure | None = None

    @property
    def signature(self) -> str:
        return self.failure.signature if self.failure else self.kind


def classify(run: TestRun, minimum_tests: int = 1) -> Feedback:
    """What the run measured. Passing needs a summary, no failure, no skip and at least ``minimum_tests`` tests.

    Pass the baseline's test count as ``minimum_tests``: a patch cannot delete a
    protected test, but it can stop tests from running.
    """
    if run.setup_error is not None:
        return Feedback("environment", f"the sandbox did not start: {run.setup_error}")
    if run.timed_out or run.exit_code < 0:
        return Feedback("limit", "the run was stopped by a time or resource limit")
    if run.ran is not None and not run.failed and not run.skipped and run.ran >= max(minimum_tests, 1):
        return Feedback("passed", f"{run.ran} tests passed")
    failure = parse_failure(run.stderr)
    if failure is not None:
        if failure.error_type in ("SyntaxError", "IndentationError"):
            return Feedback("syntax", failure.message, failure)
        if failure.error_type == "ModuleNotFoundError":
            return Feedback("environment", failure.message, failure)
        return Feedback("assertion" if failure.error_type == "AssertionError" else "runtime", failure.message, failure)
    if run.ran is None:
        return Feedback("incomplete", f"the run ended with exit code {run.exit_code} before reporting any result")
    return Feedback("incomplete", f"{run.ran} tests ran ({len(run.skipped)} skipped); at least {minimum_tests} must run and none may skip")


def next_step(feedback: Feedback, critic: Literal["approve", "object"] | None = None) -> Step:
    """Tests decide; a critic can only add doubt."""
    if feedback.kind == "environment":
        return "escalate"
    if feedback.kind != "passed":
        return "repair"  # whatever the critic said
    return "escalate" if critic == "object" else "accept"
