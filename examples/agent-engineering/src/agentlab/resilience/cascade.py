"""Lesson 24.4: try the cheap model first, and pay for the expensive one only when a check fails.

A cascade asks its tiers in order and returns the first answer that passes
``accept``. Before each call it checks two limits. The deadline: a tier
whose slowest acceptable call would end after it is skipped. The budget:
the tier's price is reserved in the shared ``Ledger`` first, so a halted or
spent budget stops the cascade before the model is called. The check decides
everything, so it must compare with trusted data, never with the model's own
confidence.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Literal

from agentlab.fixtures import load_purchases
from agentlab.model import Model, ModelReply
from agentlab.resilience.budget import Ledger
from agentlab.state.workflow import invoice_matches_purchase


@dataclass(frozen=True)
class Tier:
    name: str
    model: Model
    price: int  # micro-dollars: the most one call may cost, reserved before the call
    latency_s: float  # the slowest call this tier is allowed to take


@dataclass(frozen=True)
class CascadeResult:
    status: Literal["accepted", "escalated"]
    tier: str | None
    reply: ModelReply | None
    reason: str
    spent: int


def invoice_check(tenant_id: str) -> Callable[[ModelReply], bool]:
    """Accept an ``extract_invoice`` call only if its total matches the tenant's purchase record (lesson 14.1)."""
    purchases = load_purchases()

    def accept(reply: ModelReply) -> bool:
        call = reply.tool_call or {}
        arguments = call.get("arguments") or {}
        if call.get("name") != "extract_invoice" or not isinstance(arguments.get("po_id"), str):
            return False
        try:
            total = Decimal(str(arguments.get("total")))
        except InvalidOperation:
            return False
        return invoice_matches_purchase(arguments["po_id"], total, purchases, tenant_id) == []

    return accept


def run_cascade(tiers: Sequence[Tier], messages: list[dict], *, accept: Callable[[ModelReply], bool], ledger: Ledger,
                budget_id: str, run_id: str, clock: Callable[[], datetime], deadline: datetime) -> CascadeResult:
    spent = 0
    for tier in tiers:
        if clock() + timedelta(seconds=tier.latency_s) > deadline:
            return CascadeResult("escalated", None, None, f"deadline: {tier.name} could end after {deadline.isoformat()}", spent)
        reservation = f"{run_id}:{tier.name}"
        if not ledger.reserve(budget_id, reservation, tier.price):
            return CascadeResult("escalated", None, None, f"budget refused {tier.name} (spent or halted)", spent)
        reply = tier.model.complete(messages)
        # shortcut: the fixture prices every call at the tier's price; with a real provider, settle the usage it reports.
        ledger.settle(reservation, tier.price)
        spent += tier.price
        if reply.error is None and accept(reply):
            return CascadeResult("accepted", tier.name, reply, f"{tier.name} passed the check", spent)
    return CascadeResult("escalated", None, None, "no tier produced an answer that passed the check", spent)
