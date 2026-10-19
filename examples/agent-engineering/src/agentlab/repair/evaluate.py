"""Lesson 21.5: compare the original and the repaired code on tests the loop never saw.

Both versions run the visible tests plus a held-out set written apart from the
loop. Each test lands in one of four groups, the way SWE-bench names them:
fail-to-pass (the repair fixed it), pass-to-pass (still works), pass-to-fail
(a regression) and fail-to-fail (still broken). A regression means the
original is safer than the repair; a test still failing means a person decides.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

from agentlab.repair.patch import Patch, apply
from agentlab.repair.runner import TestRun, run_suite


@dataclass(frozen=True)
class Evaluation:
    verdict: Literal["ship", "escalate", "keep_original"]
    reason: str
    fail_to_pass: frozenset[str]
    pass_to_pass: frozenset[str]
    pass_to_fail: frozenset[str]
    fail_to_fail: frozenset[str]
    original_passed: int
    repaired_passed: int
    total: int


def _modules(files: Mapping[str, str]) -> tuple[str, ...]:
    return tuple(sorted(name.removesuffix(".py") for name in files))


def evaluate(project: Mapping[str, str], patch: Patch, visible: tuple[str, ...], held_out: Mapping[str, str]) -> Evaluation:
    """Run the original and the patched project against the visible and held-out tests."""
    tests = visible + _modules(held_out)
    before: TestRun = run_suite({**project, **held_out}, tests)
    after: TestRun = run_suite({**apply(project, patch), **held_out}, tests)
    everything = before.passed | before.failed | after.passed | after.failed
    groups = {
        "fail_to_pass": (everything - before.passed) & after.passed,
        "pass_to_pass": before.passed & after.passed,
        "pass_to_fail": before.passed - after.passed,
        "fail_to_fail": everything - before.passed - after.passed,
    }
    counts = {"original_passed": len(before.passed), "repaired_passed": len(after.passed), "total": len(everything)}
    if after.ran is None or after.skipped or after.ran < (before.ran or 0):
        return Evaluation("keep_original", "the repaired run did not report every test", **groups, **counts)
    if groups["pass_to_fail"]:
        return Evaluation("keep_original", f"regression: {', '.join(sorted(groups['pass_to_fail']))}", **groups, **counts)
    if groups["fail_to_fail"]:
        return Evaluation("escalate", f"still failing: {', '.join(sorted(groups['fail_to_fail']))}", **groups, **counts)
    return Evaluation("ship", f"{len(after.passed)} of {len(everything)} tests pass and nothing regressed", **groups, **counts)
