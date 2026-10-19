"""Lesson 25.4: the teardown, rendered from the benchmark report so the two cannot disagree.

Six sections, in the order a second person needs them: how to set up, what
was run and how, what came out, where the result stops applying, which
artifacts exist (with hashes) and under which licenses. ``review_teardown``
fails a missing or empty section and a teardown that does not state its
evidence kind and report digest. ``reproduces`` compares two reports by
digest and, when they differ, names the runs that changed, because "the hash
is different" tells nobody where to look.
"""

from __future__ import annotations

import re
from importlib.metadata import metadata

SECTIONS = ("Setup", "Methodology", "Results", "Limitations", "Artifact manifest", "Licenses")

# The core suite's runtime: the project and Pydantic with its own dependencies.
RUNTIME = ("agentlab", "pydantic", "pydantic-core", "annotated-types", "typing-extensions", "typing-inspection")

LIMITATIONS = (
    "Every run used a scripted model, so this is fixture-tested evidence: it shows the controls work, not that any real model succeeds.",
    "With a scripted model the three trials of a scenario cannot disagree; repeated trials measure something only against a live model.",
    "Latency and waiting times come from an injected clock and illustrate the report's shape; they are not measurements.",
    "Prices are illustrative. Ten scenarios with three trials each is a teaching check, not a production reliability estimate.",
)


def licenses() -> dict[str, tuple[str, str]]:
    """Version and license of each runtime distribution, read from the installed metadata."""
    table = {}
    for name in RUNTIME:
        meta = metadata(name)
        table[name] = (meta["Version"], meta.get("License-Expression") or meta.get("License") or "unknown")
    return table


def render_teardown(report: dict) -> str:
    det, env = report["deterministic"], report["environment"]
    summary = det["summary"]
    low, high = summary["wilson95"]
    per_scenario: dict[str, list[bool]] = {}
    for run in det["runs"]:
        per_scenario.setdefault(run["case_id"], []).append(run["success"])
    rows = "\n".join(f"| {case} | {sum(results)} of {len(results)} |" for case, results in per_scenario.items())
    files = "\n".join(f"- `{path}` sha256 `{sha}`" for path, sha in det["fixture_manifest"]["files"].items())
    lic = "\n".join(f"- {name} {version}: {license}" for name, (version, license) in licenses().items())
    return f"""# Capstone teardown

## Setup

From `examples/agent-engineering/`: `uv sync --frozen`, then
`uv run --frozen python -m agentlab.capstone.benchmark report.json`.
Recorded environment: Python {env['python']}, Pydantic {env['pydantic']}, agentlab {env['agentlab']}, {env['platform']}, clock {env['clock']}.

## Methodology

{det['scenarios']} held-out scenarios, {det['trials']} trials each, suite seed {det['seed']}, each trial in a fresh directory.
Evidence kind: {det['evidence_kind']}. Model: {det['model']['kind']}.
Success means the environment ended in the expected state with no safety violation; the model's own words are not graded.

## Results

{summary['successes']} of {summary['runs']} runs succeeded ({summary['rate']:.0%}; Wilson 95% interval {low:.1%} to {high:.1%}).
Safety violations: {summary['safety_violations']}. Model retries: {summary['retries']}. Reconciliations: {summary['reconciliations']}.
Cost (USD): model {summary['cost_usd']['model']}, sandbox {summary['cost_usd']['sandbox']}, review {summary['cost_usd']['review']}, total {summary['cost_usd']['total']}, per success {summary['cost_usd']['per_success']}.
Latency (ms, simulated): p50 {summary['latency_ms']['p50']}, p90 {summary['latency_ms']['p90']}, max {summary['latency_ms']['max']}. Human wait (s, simulated): {summary['human_wait_s']['runs']} runs, p50 {summary['human_wait_s']['p50']}, max {summary['human_wait_s']['max']}.
Failed runs: {', '.join(summary['failed_runs']) or 'none'}.

| Scenario | Successes |
|---|---|
{rows}

## Limitations

{chr(10).join('- ' + line for line in LIMITATIONS)}

## Artifact manifest

- report digest `{report['digest']}`
- fixture manifest sha256 `{det['fixture_manifest']['sha256']}`
{files}

## Licenses

{lic}
"""


def review_teardown(text: str, report: dict) -> list[str]:
    """Missing or empty sections, and the two facts a reader must find: evidence kind and digest."""
    problems = []
    headings = [(m.group(1).strip(), m.end()) for m in re.finditer(r"^## (.+)$", text, re.MULTILINE)]
    names = [name for name, _ in headings]
    for section in SECTIONS:
        if section not in names:
            problems.append(f"missing section: {section}")
            continue
        i = names.index(section)
        body = text[headings[i][1]: text.find("\n## ", headings[i][1]) if i + 1 < len(headings) else len(text)]
        if not body.strip():
            problems.append(f"empty section: {section}")
    kind = report["deterministic"]["evidence_kind"]
    if kind not in text:
        problems.append(f"the evidence kind {kind} is not stated")
    if report["digest"] not in text:
        problems.append("the report digest is not stated")
    return problems


def reproduces(expected: dict, actual: dict) -> list[str]:
    """Empty when the deterministic parts match; otherwise the digest and every run that differs."""
    if expected["digest"] == actual["digest"] and expected["deterministic"] == actual["deterministic"]:
        return []
    problems = [f"digest differs: {expected['digest'][:12]} vs {actual['digest'][:12]}"]
    key = lambda run: f"{run['case_id']}.t{run['trial']}"
    theirs = {key(run): run for run in actual["deterministic"]["runs"]}
    for run in expected["deterministic"]["runs"]:
        other = theirs.get(key(run))
        if other != run:
            changed = "missing" if other is None else ", ".join(name for name in run if run[name] != other.get(name))
            problems.append(f"{key(run)}: {changed}")
    if expected["deterministic"]["fixture_manifest"] != actual["deterministic"]["fixture_manifest"]:
        problems.append("fixture manifest differs: the runs read different fixture files")
    return problems
