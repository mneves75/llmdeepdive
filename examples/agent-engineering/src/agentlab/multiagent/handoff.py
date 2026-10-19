"""Lesson 22.2: a typed handoff between agents, and the evidence check types cannot do.

A worker's model writes a ``Report``: a schema version, the task it answers
and exactly one result, chosen by ``status`` (a discriminated union). The
controller wraps it in a ``Handoff`` with the sender's identity, which the
controller knows because it started that worker; the model never writes it.

Validation proves shape. ``check_claims`` then asks whether each claim is
true: every cited hash must be in the controller's evidence store for this
tenant, and at least one trusted source (a purchase record) must state the
claimed value. A supplier's message is evidence that the supplier said
something, never proof that it is so. Free text is allowed in ``note`` and
``question`` as an untrusted payload: people may read it, no code obeys it.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, ValidationError

from agentlab.domain import EvidenceRef, Principal, Record, Sha256
from agentlab.state.workflow import parse_supplier_invoice


class Claim(Record):
    po_id: str = Field(pattern=r"^PO-\d{4}$")
    fact: Literal["payee", "total"]
    value: str = Field(min_length=1, max_length=120)
    evidence: tuple[Annotated[str, Sha256], ...] = Field(min_length=1, max_length=4)
    note: str | None = Field(default=None, max_length=500)  # untrusted text, never parsed for control


class Done(Record):
    status: Literal["done"]
    claims: tuple[Claim, ...] = Field(min_length=1, max_length=20)


class NeedsInfo(Record):
    status: Literal["needs_info"]
    question: str = Field(min_length=1, max_length=500)


class Failed(Record):
    status: Literal["failed"]
    error: Literal["no_evidence", "tool_error", "out_of_scope"]
    detail: str | None = Field(default=None, max_length=300)


class Report(Record):
    """What a worker's model may write: nothing about who it is or what it may do."""

    schema_version: Literal[1]
    task_id: str = Field(min_length=1, max_length=64)
    result: Annotated[Done | NeedsInfo | Failed, Field(discriminator="status")]


class Handoff(Record):
    report: Report
    sender: Principal  # set by the controller from the worker it started
    role: str


class HandoffRejected(ValueError):
    """The report failed validation; the reason is bounded so a hostile payload cannot flood a log."""


def receive(text: str, *, sender: Principal, role: str, task_id: str) -> Handoff:
    try:
        report = Report.model_validate_json(text)
    except ValidationError as error:
        first = error.errors()[0]
        location = ".".join(str(part) for part in first["loc"]) or "body"
        raise HandoffRejected(f"{error.error_count()} problem(s), first at {location}: {first['type']}"[:300]) from None
    if report.task_id != task_id:
        raise HandoffRejected(f"report answers {report.task_id[:64]!r}, not the assigned task")
    return Handoff(report=report, sender=sender, role=role)


@dataclass(frozen=True)
class Evidence:
    ref: EvidenceRef
    trusted: bool
    facts: dict[tuple[str, str], str]  # (po_id, fact) -> value, extracted by trusted code


class EvidenceStore:
    """Content-addressed evidence for one tenant. A hash it does not hold supports nothing."""

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self._items: dict[str, Evidence] = {}

    def _add(self, source: str, content: bytes, trusted: bool, facts: dict[tuple[str, str], str]) -> EvidenceRef:
        ref = EvidenceRef(source=source, sha256=hashlib.sha256(content).hexdigest())
        self._items[ref.sha256] = Evidence(ref, trusted, facts)
        return ref

    def add_record(self, record: dict) -> EvidenceRef:
        """A purchase record from the system of record: trusted, if it belongs to this tenant."""
        if record["tenant_id"] != self.tenant_id:
            raise ValueError(f"{record['po_id']} belongs to another tenant")
        total = record["quantity"] * Decimal(record["unit_price"])
        facts = {(record["po_id"], "payee"): record["supplier"], (record["po_id"], "total"): f"{total:.2f}"}
        content = json.dumps(record, sort_keys=True, separators=(",", ":")).encode()
        return self._add(f"purchases/{record['po_id']}", content, True, facts)

    def add_message(self, name: str, text: str) -> EvidenceRef:
        """A supplier message: what the supplier claims, kept so a claim can cite it, never trusted."""
        try:
            po_id, total = parse_supplier_invoice(text)
            facts = {(po_id, "total"): f"{total:.2f}"}
        except ValueError:
            facts = {}
        return self._add(f"supplier_messages/{name}", text.encode(), False, facts)

    def get(self, sha256: str) -> Evidence | None:
        return self._items.get(sha256)


def check_claims(handoff: Handoff, store: EvidenceStore) -> list[str]:
    """Problems with the report's claims; an empty list means every claim is supported."""
    result = handoff.report.result
    if not isinstance(result, Done):
        return []
    if handoff.sender.tenant_id != store.tenant_id:
        return ["the sender's tenant does not own this evidence store"]
    return [problem for claim in result.claims if (problem := claim_problem(claim, store))]


def claim_problem(claim: Claim, store: EvidenceStore) -> str | None:
    """Why one claim is unsupported, or None. Untrusted evidence may be cited; it never suffices."""
    key, label = (claim.po_id, claim.fact), f"{claim.po_id} {claim.fact}"
    cited = [store.get(sha) for sha in claim.evidence]
    if any(item is None for item in cited):
        return f"{label}: cites unknown evidence"
    stated = [item.facts[key] for item in cited if item.trusted and key in item.facts]
    if not stated:
        return f"{label}: no trusted evidence states it"
    if claim.value not in stated:
        return f"{label}: the record says {stated[0]!r}, not {claim.value[:120]!r}"
    return None
