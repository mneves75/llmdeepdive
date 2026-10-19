"""Lesson 25.2: run every held-out scenario several times and write one reproducible report.

The report has two parts. ``deterministic`` holds everything a second person
must get byte for byte: the evidence kind, the model, the seed, the fixture
manifest (a SHA-256 per file the runs read), every run's outcome, cost and
timing, and the summary. ``digest`` is the SHA-256 of that part as canonical
JSON, so "I reproduced it" is one comparison. ``environment`` records the
Python, Pydantic and agentlab versions and the clock; it is kept out of the
digest because a reader on another machine legitimately differs there.

Costs are split the way they are paid: model tokens, sandbox runs and the
minutes a person spends deciding approvals. Human waiting time is reported
apart from latency, because a run that waits two days for an approver is not
two days slow. The prices are illustrative, not any provider's list price.

Run it with ``python -m agentlab.capstone.benchmark report.json``.
"""

from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
from decimal import ROUND_HALF_UP, Decimal
from importlib.metadata import version
from importlib.resources import files
from pathlib import Path

import pydantic

from agentlab.capstone.assistant import CASES, FIXTURE_FILES, Case, RunRecord, run_in_fresh_dir
from agentlab.evals.trials import wilson_interval
from agentlab.multiagent.baseline import PRICE_IN, PRICE_OUT
from agentlab.security.assistant import Gate
from agentlab.security.gate import authorize

TRIALS = 3
SANDBOX_PER_RUN = Decimal("0.02")  # USD per sandbox run, illustrative
REVIEW_MINUTES = Decimal("1.5")  # per approval decision, illustrative
REVIEW_HOURLY = Decimal("40")  # USD per hour of the approver's time, illustrative
CENT = Decimal("0.000001")


def cost_per_success(*, runs: int, successes: int, model_cost: float, sandbox_cost: float, review_minutes: float, review_hourly: float) -> dict:
    """The arithmetic of ``costPerSuccess`` in the site's ``src/lib/lab-math.ts``, which the 25.2 calculator runs.

    Failed runs are paid for too, so the cost of one success is the whole bill
    divided by the successes, not the cost of one run.
    """
    cost_per_run = model_cost + sandbox_cost + review_minutes / 60 * review_hourly
    total = cost_per_run * runs
    low, high = wilson_interval(successes, runs) if runs > 0 else (0.0, 0.0)
    return {
        "cost_per_run": cost_per_run,
        "total": total,
        "per_success": total / successes if successes else None,
        "rate": successes / runs if runs else 0.0,
        "low": low,
        "high": high,
    }


def load_fixture_bytes() -> dict[str, bytes]:
    """Only the files the capstone reads: hashing the whole fixtures tree would change with every new track."""
    return {path: (files("agentlab.fixtures") / path).read_bytes() for path in FIXTURE_FILES}


def fixture_manifest(blobs: dict[str, bytes]) -> dict:
    hashes = {path: hashlib.sha256(blob).hexdigest() for path, blob in sorted(blobs.items())}
    return {"files": hashes, "sha256": hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()}


def _usd(value: Decimal) -> str:
    return str(value.quantize(CENT, rounding=ROUND_HALF_UP))


def _costs(run: RunRecord) -> dict[str, Decimal]:
    model = (run.tokens_in * PRICE_IN + run.tokens_out * PRICE_OUT) / 1_000_000
    return {
        "model": model,
        "sandbox": run.sandbox_runs * SANDBOX_PER_RUN,
        "review": run.approvals_decided * REVIEW_MINUTES / 60 * REVIEW_HOURLY,
    }


def _nearest_rank(values: list[int], q: float) -> int:
    """The smallest value with at least ``q`` of the values at or below it."""
    ordered = sorted(values)
    return ordered[max(math.ceil(q * len(ordered)) - 1, 0)] if ordered else 0


def _run_row(run: RunRecord) -> dict:
    costs = _costs(run)
    return {
        "case_id": run.case_id,
        "stratum": run.stratum,
        "trial": run.trial,
        "seed": run.seed,
        "expected": run.expected,
        "outcome": run.outcome,
        "status": run.status,
        "success": run.success,
        "safety_violations": list(run.violations),
        "model_calls": run.model_calls,
        "tokens_in": run.tokens_in,
        "tokens_out": run.tokens_out,
        "refusals": run.refusals,
        "retries": run.retries,
        "resends": run.resends,
        "reconciliations": run.reconciliations,
        "sandbox_runs": run.sandbox_runs,
        "latency_ms": run.latency_ms,
        "human_wait_s": run.human_wait_s,
        "cost_usd": {name: _usd(value) for name, value in costs.items()},
    }


def summarize(runs: list[RunRecord]) -> dict:
    successes = sum(run.success for run in runs)
    low, high = wilson_interval(successes, len(runs))
    totals = {name: sum((_costs(run)[name] for run in runs), Decimal(0)) for name in ("model", "sandbox", "review")}
    total = sum(totals.values(), Decimal(0))
    waits = [run.human_wait_s for run in runs if run.human_wait_s]
    latencies = [run.latency_ms for run in runs]
    return {
        "runs": len(runs),
        "successes": successes,
        "rate": round(successes / len(runs), 6),
        "wilson95": [round(low, 6), round(high, 6)],
        "safety_violations": sum(len(run.violations) for run in runs),
        "retries": sum(run.retries for run in runs),
        "resends": sum(run.resends for run in runs),
        "reconciliations": sum(run.reconciliations for run in runs),
        "cost_usd": {**{name: _usd(value) for name, value in totals.items()}, "total": _usd(total), "per_success": _usd(total / successes) if successes else None},
        "latency_ms": {"p50": _nearest_rank(latencies, 0.5), "p90": _nearest_rank(latencies, 0.9), "max": max(latencies)},
        "human_wait_s": {"runs": len(waits), "p50": _nearest_rank(waits, 0.5), "max": max(waits, default=0)},
        "failed_runs": [f"{run.case_id}.t{run.trial}" for run in runs if not run.success],
    }


def digest(deterministic: dict) -> str:
    return hashlib.sha256(json.dumps(deterministic, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def run_benchmark(*, seed: int = 2026, trials: int = TRIALS, cases: tuple[Case, ...] = CASES, gate: Gate = authorize) -> dict:
    """Every case ``trials`` times, each in a fresh directory, and the report built from what happened."""
    runs = [run_in_fresh_dir(case, trial=trial, seed=seed, gate=gate) for case in cases for trial in range(1, trials + 1)]
    deterministic = {
        "suite": "capstone-held-out",
        # Scripted replies make this fixture evidence. A live trial swaps the model and a wall clock
        # in, records the served model and revision, and changes this label; the course's CI never does.
        "evidence_kind": "fixture-tested",
        "model": {"kind": "scripted", "name": None, "revision": None},
        "seed": seed,
        "trials": trials,
        "scenarios": len(cases),
        "fixture_manifest": fixture_manifest(load_fixture_bytes()),
        "prices": {"model_in_per_million": str(PRICE_IN), "model_out_per_million": str(PRICE_OUT), "sandbox_per_run": str(SANDBOX_PER_RUN), "review_minutes_per_decision": str(REVIEW_MINUTES), "review_hourly": str(REVIEW_HOURLY), "note": "illustrative, not any provider's price"},
        "runs": [_run_row(run) for run in runs],
        "summary": summarize(runs),
    }
    return {
        "schema": 1,
        "deterministic": deterministic,
        "digest": digest(deterministic),
        "environment": {"python": platform.python_version(), "pydantic": pydantic.VERSION, "agentlab": version("agentlab"), "platform": sys.platform, "clock": "injected"},
    }


def write_report(path: Path, **options) -> dict:
    report = run_benchmark(**options)
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m agentlab.capstone.benchmark REPORT.json")
    written = write_report(Path(sys.argv[1]))
    summary = written["deterministic"]["summary"]
    print(f"{summary['successes']}/{summary['runs']} succeeded, {summary['safety_violations']} safety violations, digest {written['digest'][:12]}")
