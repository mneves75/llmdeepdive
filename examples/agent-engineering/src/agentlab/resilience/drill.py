"""Lesson 24.5: a recovery drill over a batch of supplier invoices.

``run_batch`` turns each invoice into a draft for accounts payable. The model
reads the invoice through lesson 24.2's breaker and retries. When it cannot,
the batch degrades to lesson 14.1's fixed-layout parser, labels the result
``degraded`` and writes that label into the checkpoint, so a crash cannot
lose it. An invoice the parser cannot read, or whose total disagrees with the
purchase record, is ``escalated`` and commits nothing. Drafts leave through
lesson 14.4's outbox, so a lost reply is reconciled instead of resent and a
rerun after a crash creates no second invoice.

``Chaos`` reads the fault schedule from ``fixtures/resilience/chaos.json``;
``ChaosModel`` and ``ChaosService`` apply it.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from importlib.resources import files
from typing import Literal

from agentlab.domain import EvidenceRef, InvoiceDraft, Principal, RunState
from agentlab.fixtures import load_purchases
from agentlab.model import ModelReply
from agentlab.resilience.classify import Contract, Failure
from agentlab.resilience.retry import CircuitBreaker, RetryBudget, call_with_retries
from agentlab.security.assistant import as_untrusted
from agentlab.state.checkpoints import CheckpointStore
from agentlab.state.outbox import FakeInvoiceService, deliver_pending, idempotency_key, reconcile
from agentlab.state.transitions import advance
from agentlab.state.workflow import invoice_matches_purchase, parse_supplier_invoice

FIXTURES = files("agentlab.fixtures") / "resilience"
ROUTE = "POST /v1/chat/completions"
CONTRACT = Contract(live=frozenset({ROUTE}), retired={})
PO_ID = re.compile(r"PO-\d{4}")
DEGRADED = "degraded: read by the fixed-layout parser while the model was unavailable"
Label = Literal["complete", "degraded", "escalated", "queued", "cancelled"]


class SimulatedCrash(RuntimeError):
    """The process died right after a checkpoint committed."""


@dataclass(frozen=True)
class Chaos:
    replies: dict[str, str]
    provider_down_for: frozenset[str]
    lost_reply_after_write: frozenset[str]
    crash_after_commit: str | None

    @classmethod
    def load(cls) -> Chaos:
        data = json.loads((FIXTURES / "chaos.json").read_text(encoding="utf-8"))
        return cls(data["replies"], frozenset(data["provider_down_for"]), frozenset(data["lost_reply_after_write"]),
                   data["crash_after_commit"])


@dataclass
class ChaosModel:
    """A model provider that is down for some invoices and otherwise extracts the scheduled total."""

    chaos: Chaos
    calls: list[str] = field(default_factory=list)

    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> ModelReply:
        po_id = PO_ID.search(messages[1]["content"]).group(0)
        self.calls.append(po_id)
        if po_id in self.chaos.provider_down_for:
            return ModelReply(error="transport: ConnectionRefusedError")
        return ModelReply(tool_call={"name": "extract_invoice", "arguments": {"po_id": po_id, "total": self.chaos.replies[po_id]}})


@dataclass
class ChaosService:
    """Accounts payable that loses its reply, once, after writing the invoices the schedule names."""

    inner: FakeInvoiceService
    chaos: Chaos
    lost: set[str] = field(default_factory=set)

    def create(self, key: str, draft: InvoiceDraft) -> str:
        po_id = PO_ID.search(key).group(0)
        if po_id in self.chaos.lost_reply_after_write and po_id not in self.lost:
            self.lost.add(po_id)
            self.inner.fail_next = "after_write"
        return self.inner.create(key, draft)

    def find(self, key: str) -> str | None:
        return self.inner.find(key)


@dataclass(frozen=True)
class ItemResult:
    po_id: str
    label: Label
    reason: str
    ap_number: str | None = None


@dataclass(frozen=True)
class DrillReport:
    items: tuple[ItemResult, ...]

    @property
    def escalations(self) -> list[ItemResult]:
        return [item for item in self.items if item.label == "escalated"]


def run_batch(batch_id: str, po_ids: Sequence[str], *, model: ChaosModel, store: CheckpointStore, service: ChaosService,
              breaker: CircuitBreaker, clock: Callable[[], datetime], principal: Principal,
              cancelled: Callable[[], bool] = lambda: False, crash_after: str | None = None) -> DrillReport:
    """Process each invoice once, deliver what was committed, and report every item with a label."""
    results: dict[str, ItemResult] = {}
    budget = RetryBudget(limit=10, window=breaker.open_for, clock=clock)  # shared by the whole batch
    for po_id in po_ids:
        run_id = f"{batch_id}:{po_id}"
        if store.load(run_id) is not None:
            continue  # committed by an earlier run: never read or queued twice
        if cancelled():
            results[po_id] = ItemResult(po_id, "cancelled", "the operator cancelled the batch before this item started")
            continue
        outcome = _draft(po_id, model, breaker, budget, clock, principal)
        if isinstance(outcome, ItemResult):
            results[po_id] = outcome
            continue
        draft, evidence = outcome
        state = RunState(run_id=run_id, principal=principal)
        checked = store.save(RunState.model_validate({**advance(state, "checked").model_dump(), "evidence": (evidence,)}), 0)
        store.save(advance(checked, "ready"), checked.version, effects=[(idempotency_key(run_id, "create_invoice"), draft)])
        if po_id == crash_after:
            raise SimulatedCrash(f"crashed after committing {run_id}")
    deliver_pending(store, service)
    reconcile(store, service)
    deliver_pending(store, service)  # effects reconciliation found were never written
    for po_id in po_ids:
        if po_id not in results:
            results[po_id] = _committed_result(po_id, store.load(f"{batch_id}:{po_id}"), store)
    return DrillReport(tuple(results[po_id] for po_id in po_ids))


def _draft(po_id: str, model: ChaosModel, breaker: CircuitBreaker, budget: RetryBudget, clock: Callable[[], datetime],
           principal: Principal) -> tuple[InvoiceDraft, EvidenceRef] | ItemResult:
    text = (FIXTURES / "invoices" / f"{po_id}.txt").read_text(encoding="utf-8")
    messages = [{"role": "system", "content": "Extract the purchase order id and the invoice total."},
                {"role": "user", "content": f"Read the supplier invoice for {po_id} and call extract_invoice."},
                as_untrusted("supplier invoice", text)]

    def ask() -> ModelReply | Failure:
        reply = model.complete(messages)
        return Failure(reply.error, ROUTE, "read") if reply.error else reply

    answer = call_with_retries(ask, contract=CONTRACT, max_attempts=2, breaker=breaker, budget=budget, rng=random.Random(po_id), clock=clock, sleep=lambda seconds: None)
    if answer.ok:
        arguments = answer.value.tool_call["arguments"]
        found, total, note = arguments["po_id"], Decimal(arguments["total"]), "read by the model"
    else:
        try:
            found, total = parse_supplier_invoice(text)
        except ValueError:
            return ItemResult(po_id, "escalated", f"model unavailable ({answer.verdict.reason}) and the invoice is not in the fixed layout")
        note = DEGRADED
    problems = [f"the invoice names {found}"] if found != po_id else invoice_matches_purchase(po_id, total, load_purchases(), principal.tenant_id)
    if problems:
        return ItemResult(po_id, "escalated", "; ".join(problems))
    record = next(p for p in load_purchases() if p["po_id"] == po_id)
    draft = InvoiceDraft(invoice_id=f"INV-{po_id[3:]}", version=1, tenant_id=principal.tenant_id, payee=record["supplier"],
                         amount=total, currency=record["currency"])
    evidence = EvidenceRef(source=f"supplier-invoice/{po_id}", sha256=hashlib.sha256(text.encode()).hexdigest(), note=note)
    return draft, evidence


def _committed_result(po_id: str, state: RunState, store: CheckpointStore) -> ItemResult:
    """Read the label back from the checkpoint, so a resumed run reports exactly what the first run decided."""
    note = state.evidence[0].note or ""
    status, number = store.outbox_result(idempotency_key(state.run_id, "create_invoice")) or ("missing", None)
    if status != "done":
        return ItemResult(po_id, "queued", f"committed; delivery is {status} and will be reconciled on the next run")
    return ItemResult(po_id, "degraded" if note == DEGRADED else "complete", note, number)
