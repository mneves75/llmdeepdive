"""Lesson 23.5: replay in CI, repeated trials against a model, and what each can prove.

``regressions`` replays every executed development case with its scripted
model replies. It is deterministic, so it can gate every change: a failure
means the code changed, not the dice. It never runs a held-out case.

``run_trials`` runs cases several times against whatever model a factory
returns and reports successes, a Wilson 95% interval, model calls and an
estimated cost. With scripted models it is ``fixture-tested`` bookkeeping;
only trials against ``OpenAICompatibleModel`` are labelled
``live-model-tested``, and the course's CI runs none of those.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from decimal import Decimal

from agentlab.evals.corpus import Case, executed, run_assistant_case, run_case
from agentlab.model import Model, ModelReply, OpenAICompatibleModel
from agentlab.security.assistant import Gate
from agentlab.security.gate import DraftArgs, LookupArgs, authorize

# What a served model needs to call the two tools the assistant is granted.
TOOL_SCHEMAS = [
    {"type": "function", "function": {"name": "lookup_po", "description": "Read one purchase order of the buyer's company.", "parameters": LookupArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "create_invoice_draft", "description": "Draft an invoice for one purchase order.", "parameters": DraftArgs.model_json_schema()}},
]


def regressions(cases: Sequence[Case], gate: Gate = authorize) -> list[str]:
    """Replay every executed development case; return one line per problem. Empty means the change may merge."""
    failures = []
    for case in cases:
        if case.split != "dev" or not executed(case):
            continue
        result = run_assistant_case(case, gate=gate) if case.setup["runner"] == "assistant" else run_case(case)
        failures += [f"{case.case_id}: {problem}" for problem in result.problems]
    return failures


def wilson_interval(successes: int, n: int, z: float = 1.959964) -> tuple[float, float]:
    """Wilson's (1927) score interval for a success rate; z = 1.959964 gives 95%.

    Unlike rate ± z·sqrt(rate·(1 - rate)/n), it stays inside [0, 1] and does
    not collapse to a zero-width interval at 0 or n successes.
    """
    if n <= 0 or not 0 <= successes <= n:
        raise ValueError("need at least one trial and 0 <= successes <= n")
    rate = successes / n
    denominator = 1 + z * z / n
    center = (rate + z * z / (2 * n)) / denominator
    half = z * math.sqrt(rate * (1 - rate) / n + z * z / (4 * n * n)) / denominator
    return max(0.0, center - half), min(1.0, center + half)


def reliability(p: float, k: int) -> tuple[float, float]:
    """(pass@k, pass^k) for a per-trial success chance p, if the k trials are independent.

    pass@k is the chance that at least one of k trials succeeds; pass^k that all k do.
    """
    return 1 - (1 - p) ** k, p**k


@dataclass
class LiveAdapter:
    """Wraps a model for trials: sends the tool schemas, counts calls, keeps errors and the served model name."""

    inner: Model
    calls: int = 0
    errors: list[str] = field(default_factory=list)
    served_by: set[str] = field(default_factory=set)

    @property
    def evidence(self) -> str:
        return "live-model-tested" if isinstance(self.inner, OpenAICompatibleModel) else "fixture-tested"

    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> ModelReply:
        self.calls += 1
        reply = self.inner.complete(messages, TOOL_SCHEMAS)
        if reply.error:
            self.errors.append(reply.error)
        if reply.served_by:
            self.served_by.add(reply.served_by)
        return reply


@dataclass(frozen=True)
class TrialReport:
    runs: int
    successes: int
    low: float
    high: float
    calls: int
    cost: Decimal
    cost_per_success: Decimal | None
    evidence: str
    served_by: list[str]
    failures: list[str]  # "case.tN: problem", including model errors


def run_trials(cases: Sequence[Case], make_model: Callable[[Case, int], Model], trials: int, cost_per_call: Decimal) -> TrialReport:
    """Run each case ``trials`` times, each from a fresh back office, and summarise.

    shortcut: cost is calls x a price per call you supply; the adapter does not
    read token usage, so check the provider's bill before quoting a cost.
    """
    if any(case.setup.get("runner") != "assistant" for case in cases):
        raise ValueError("only assistant cases are model trials")
    if any(case.oracle["min_denials"] for case in cases):
        # Such an oracle checks that the gate refused the scripted bad call; a live model may never make it.
        raise ValueError("a case that requires refusing its scripted calls is replay-only")
    successes, calls, failures, evidence, served = 0, 0, [], set(), set()
    for case in cases:
        for trial in range(1, trials + 1):
            adapter = LiveAdapter(make_model(case, trial - 1))
            result = run_assistant_case(case, model=adapter)
            calls += adapter.calls
            evidence.add(adapter.evidence)
            served |= adapter.served_by
            problems = result.problems + [f"model error {e}" for e in adapter.errors]
            if problems:
                failures += [f"{case.case_id}.t{trial}: {p}" for p in problems]
            else:
                successes += 1
    runs = len(cases) * trials
    low, high = wilson_interval(successes, runs)
    cost = calls * cost_per_call
    # One scripted trial makes the whole report fixture evidence, and a live run no server answered is no evidence.
    if evidence == {"live-model-tested"}:
        label = "live-model-tested" if served else "no-model-answered"
    else:
        label = "fixture-tested"
    return TrialReport(runs, successes, low, high, calls, cost, cost / successes if successes else None, label, sorted(served), failures)
