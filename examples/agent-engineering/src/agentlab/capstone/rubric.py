"""Lesson 25.5: the capstone verdict as code, so nobody grades it by impression.

Two verdicts, never merged:

- ``project``: the required artifacts, three postmortems, the 100-case suite
  of lesson 23.3 with its held-out split, and no safety violation anywhere.
- ``applied_mastery``: the project, plus fresh live-model trials of at least
  ten held-out scenarios with three trials each, every trial reported, every
  capability covered and shown succeeding at least once.

The four evidence kinds stay separate: ``Verdict.evidence`` counts trials per
kind, and only ``live-model-tested`` trials that name a model and a revision
count toward applied mastery. A scripted run relabelled "live" is reported
and ignored. One observed safety violation, of any kind of evidence, blocks
both verdicts: a high success rate cannot buy back an unsafe effect.

Where the work is published is the learner's choice; ``visibility`` exists so
a test can show the verdict never reads it. The course's CI never runs a live
model, so nothing in CI can produce applied mastery.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from agentlab.evals.corpus import CATEGORIES, HELD_OUT, Case

EvidenceKind = Literal["source-reviewed", "fixture-tested", "live-model-tested", "environment-tested"]

ARTIFACTS = (
    "architecture_diagram", "state_transition_table", "threat_model", "version_fixture_manifest",
    "results_100_case", "cost_latency_report", "postmortems", "adr_vs_baseline",
)
CAPABILITIES = ("ordinary", "tool_failure", "injection", "memory_loss", "approval", "cancellation", "recovery")
MIN_SCENARIOS = 10
TRIALS = 3
POSTMORTEMS = 3


@dataclass(frozen=True)
class Trial:
    scenario_id: str
    stratum: str
    trial: int
    success: bool
    safety_violations: tuple[str, ...]
    evidence: EvidenceKind
    model: str | None = None
    model_revision: str | None = None


@dataclass(frozen=True)
class Submission:
    artifacts: frozenset[str]
    postmortems: int
    suite: tuple[Case, ...]
    trials: tuple[Trial, ...]
    visibility: Literal["private", "public"] = "private"


@dataclass(frozen=True)
class Verdict:
    project: bool
    applied_mastery: bool
    blocked: bool
    reasons: tuple[str, ...]
    evidence: dict[str, int]


def check_suite(cases: Sequence[Case]) -> list[str]:
    """The 100-case corpus with a stratified held-out split, as lesson 23.3 builds it."""
    problems = []
    if len(cases) != sum(CATEGORIES.values()):
        problems.append(f"{sum(CATEGORIES.values())} cases expected, found {len(cases)}")
    held = [case for case in cases if case.split == "held_out"]
    if len(held) != HELD_OUT:
        problems.append(f"{HELD_OUT} held-out cases expected, found {len(held)}")
    missing = sorted(set(CATEGORIES) - {case.category for case in held})
    if held and missing:
        problems.append(f"held-out split has no case of: {', '.join(missing)}")
    return problems


def is_live(trial: Trial) -> bool:
    """Live evidence names the model and its revision; a label alone is not evidence."""
    return trial.evidence == "live-model-tested" and bool(trial.model) and bool(trial.model_revision) and trial.model != "scripted"


def _applied(trials: Sequence[Trial]) -> list[str]:
    problems = []
    by_scenario: dict[str, list[Trial]] = {}
    for trial in trials:
        by_scenario.setdefault(trial.scenario_id, []).append(trial)
    if len(by_scenario) < MIN_SCENARIOS:
        problems.append(f"{len(by_scenario)} live scenarios; at least {MIN_SCENARIOS} are required")
    for scenario, runs in sorted(by_scenario.items()):
        if sorted(run.trial for run in runs) != list(range(1, TRIALS + 1)):
            problems.append(f"{scenario}: trials {sorted(run.trial for run in runs)} reported; all {TRIALS} must be reported in full")
    for capability in CAPABILITIES:
        runs = [trial for trial in trials if trial.stratum == capability]
        if not runs:
            problems.append(f"no live scenario covers {capability}")
        elif not any(run.success for run in runs):
            problems.append(f"{capability} has no successful live trial")
    return problems


def grade(submission: Submission) -> Verdict:
    reasons: list[str] = []
    violations = [f"{t.scenario_id}.t{t.trial} ({t.evidence}): {v}" for t in submission.trials for v in t.safety_violations]
    reasons += [f"safety violation blocks the verdict: {v}" for v in violations]
    project_problems = [f"missing artifact: {name}" for name in ARTIFACTS if name not in submission.artifacts]
    if submission.postmortems < POSTMORTEMS:
        project_problems.append(f"{submission.postmortems} postmortems; {POSTMORTEMS} are required")
    project_problems += check_suite(submission.suite)
    reasons += project_problems
    mislabelled = [t for t in submission.trials if t.evidence == "live-model-tested" and not is_live(t)]
    if mislabelled:
        reasons.append(f"{len(mislabelled)} trials labelled live-model-tested name no model and revision; not counted as live")
    live = [t for t in submission.trials if is_live(t)]
    if not live:
        reasons.append("no live-model-tested trials: fixture evidence shows the controls work, not that a model does")
    applied_problems = _applied(live) if live else ["no live trials"]
    if live:
        reasons += applied_problems
    evidence = Counter("live-model-tested" if is_live(t) else ("fixture-tested" if t.evidence == "live-model-tested" else t.evidence) for t in submission.trials)
    blocked = bool(violations)
    project = not blocked and not project_problems
    return Verdict(project, project and not applied_problems, blocked, tuple(reasons), dict(sorted(evidence.items())))


def trials_from_report(report: dict) -> tuple[Trial, ...]:
    """The benchmark report's runs as rubric trials, keeping the report's own evidence label and model."""
    det = report["deterministic"]
    model = det["model"]
    return tuple(
        Trial(run["case_id"], run["stratum"], run["trial"], run["success"], tuple(run["safety_violations"]), det["evidence_kind"], model["name"], model["revision"])
        for run in det["runs"]
    )
