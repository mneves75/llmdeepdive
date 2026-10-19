"""Lesson 25.3: reconstruct a failed run from its event log, then check the write-up.

The event log is the evidence. Each ``ExecutionEvent`` has a sequence number,
a simulated time and a ``parent``: the event that caused it. ``timeline``
prints the log in order with every string scrubbed, ``first_failure`` finds
the first sign of trouble and ``causal_chain`` walks parents back from the
verdict, which is how a reader gets from "the run failed" to "because".

Two redactions run on every string: the run's known secrets (lesson 18.3's
``scrub``) and the common secret shapes of lesson 21.2's ``redact``. Raw
input never needs redacting here, because the run logged only the hash of the
supplier's message. ``review_postmortem`` checks the human half: every field
filled, evidence that points at real events, and no secret or quoted raw input.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, fields

from agentlab.domain import ExecutionEvent
from agentlab.gui.trace import scrub
from agentlab.repair.failure import redact

FAILURE_KINDS = frozenset({
    "policy.denied", "draft.missing", "model.gave_up", "approval.expired", "approval.revoked",
    "approval.unusable", "outbox.reconciling", "run.failed", "run.cancelled",
})
MAX_VALUE = 200  # characters of one field shown in a timeline line


def _clean(value: object, secrets: tuple[str, ...]) -> str:
    text = redact(str(scrub(value, secrets)))
    return text if len(text) <= MAX_VALUE else text[:MAX_VALUE] + "..."


def timeline(events: Sequence[ExecutionEvent], secrets: tuple[str, ...] = ()) -> list[str]:
    """One line per event: offset from the first event, sequence, kind, cause and scrubbed fields."""
    if not events:
        return []
    start = events[0].at
    lines = []
    for event in events:
        offset = (event.at - start).total_seconds()
        cause = f" <- #{event.parent}" if event.parent is not None else ""
        details = " ".join(f"{key}={_clean(value, secrets)}" for key, value in sorted(event.data.items()))
        lines.append(f"+{offset:.3f}s #{event.seq} {event.kind}{cause} {details}".rstrip())
    return lines


def first_failure(events: Sequence[ExecutionEvent]) -> ExecutionEvent | None:
    return next((event for event in events if event.kind in FAILURE_KINDS), None)


def causal_chain(events: Sequence[ExecutionEvent], seq: int) -> list[int]:
    """Sequence numbers from ``seq`` back to the root, following ``parent``."""
    by_seq = {event.seq: event for event in events}
    chain: list[int] = []
    current: int | None = seq
    while current is not None and current in by_seq and current not in chain:  # a cycle cannot loop forever
        chain.append(current)
        current = by_seq[current].parent
    return chain


@dataclass(frozen=True)
class Postmortem:
    title: str
    impact: str
    timeline: tuple[str, ...]
    root_cause: str
    counterfactual: str  # what would have prevented it, stated as a checkable change
    remaining_risk: str
    recovery_evidence: tuple[int, ...]  # event sequence numbers that show the recovery or the safe stop


def review_postmortem(postmortem: Postmortem, events: Sequence[ExecutionEvent], *, secrets: tuple[str, ...] = (), raw_inputs: tuple[str, ...] = ()) -> list[str]:
    """Problems a reviewer must fix before the postmortem is shared; an empty list means none found."""
    problems = []
    texts = {f.name: getattr(postmortem, f.name) for f in fields(postmortem) if f.name != "recovery_evidence"}
    for name, value in texts.items():
        if not (value.strip() if isinstance(value, str) else value):
            problems.append(f"{name} is empty")
    known = {event.seq for event in events}
    problems += [f"evidence #{seq} is not an event in this run's log" for seq in postmortem.recovery_evidence if seq not in known]
    if not postmortem.recovery_evidence:
        problems.append("no event shows the recovery or the safe stop")
    written = "\n".join(value if isinstance(value, str) else "\n".join(value) for value in texts.values())
    problems += [f"a secret appears in the postmortem ({len(secret)} characters)" for secret in secrets if secret in written]
    # A quoted line of the original message is raw user data; long lines only, so "Regards," is not a leak.
    for raw in raw_inputs:
        leaked = [line.strip() for line in raw.splitlines() if len(line.strip()) >= 20 and line.strip() in written]
        if leaked:
            problems.append(f"{len(leaked)} line(s) of raw input quoted; describe it or cite its hash instead")
    return problems
