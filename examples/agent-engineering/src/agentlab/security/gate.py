"""Lesson 16.2: the policy gate that decides every tool call, outside the model.

The model proposes a ``ToolRequest``; this module decides it from three things
the attacker cannot write: the agent's grant (an allowlist), the trusted
``Principal`` the controller built, and the purchase records. Nothing here reads
the supplier's message, so nothing in that message can change a decision.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from pydantic import Field, ValidationError

from agentlab.domain import Principal, Record, ToolRequest

# The single-agent assistant of 16.2: it may read orders and draft invoices.
# Approving is a person's decision (track 20), so no agent grant contains it.
ASSISTANT_GRANT = frozenset({"lookup_po", "create_invoice_draft"})


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str


class LookupArgs(Record):
    po_id: str = Field(pattern=r"^PO-\d{4}$")


class DraftArgs(Record):
    po_id: str = Field(pattern=r"^PO-\d{4}$")
    payee: str = Field(min_length=1, max_length=120)
    # A string, because JSON has no decimal type and a float would round money.
    amount: str = Field(pattern=r"^\d{1,10}\.\d{2}$")
    currency: Literal["USD", "BRL", "EUR"]


class RecordWriteArgs(Record):
    po_id: str = Field(pattern=r"^PO-\d{4}$")
    status: Literal["open", "received", "closed"]


def _own_order(po_id: str, principal: Principal, purchases: list[dict]) -> dict | None:
    """The tenant comes from the Principal; a tenant named in the request is never read."""
    return next((p for p in purchases if p["po_id"] == po_id and p["tenant_id"] == principal.tenant_id), None)


def _check_lookup(arguments: LookupArgs, principal: Principal, purchases: list[dict]) -> Decision:
    if _own_order(arguments.po_id, principal, purchases) is None:
        return Decision(False, f"{arguments.po_id} is not a purchase order of {principal.tenant_id}")
    return Decision(True, "read of the caller's own order")


def _check_draft(arguments: DraftArgs, principal: Principal, purchases: list[dict]) -> Decision:
    order = _own_order(arguments.po_id, principal, purchases)
    if order is None:
        return Decision(False, f"{arguments.po_id} is not a purchase order of {principal.tenant_id}")
    if arguments.payee != order["supplier"]:
        return Decision(False, f"payee {arguments.payee!r} is not the supplier on {arguments.po_id}")
    expected = order["quantity"] * Decimal(order["unit_price"])
    if Decimal(arguments.amount) != expected or arguments.currency != order["currency"]:
        return Decision(False, f"amount {arguments.amount} {arguments.currency} but {arguments.po_id} expects {expected} {order['currency']}")
    return Decision(True, "draft matches the purchase record")


def _check_record_write(arguments: RecordWriteArgs, principal: Principal, purchases: list[dict]) -> Decision:
    if _own_order(arguments.po_id, principal, purchases) is None:
        return Decision(False, f"{arguments.po_id} is not a purchase order of {principal.tenant_id}")
    return Decision(True, "status change on the caller's own order")


CHECKS: dict[str, tuple[type[Record], Callable]] = {
    "lookup_po": (LookupArgs, _check_lookup),
    "create_invoice_draft": (DraftArgs, _check_draft),
    "write_purchase_record": (RecordWriteArgs, _check_record_write),
}


def authorize(request: ToolRequest, principal: Principal, grant: frozenset[str], purchases: list[dict]) -> Decision:
    """Allow a request only if every check passes; anything unrecognised is refused.

    Order matters for the reason a reviewer reads, not for safety: each check
    alone is enough to refuse.
    """
    if request.tool not in grant:
        return Decision(False, f"{request.tool} is not granted to this agent")
    if request.tool not in CHECKS:
        return Decision(False, f"no policy check exists for {request.tool}")
    schema, check = CHECKS[request.tool]
    try:
        arguments = schema.model_validate_json(json.dumps(request.arguments))
    except ValidationError as error:
        return Decision(False, f"arguments rejected: {error.error_count()} problem(s)")
    return check(arguments, principal, purchases)
