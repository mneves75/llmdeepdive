"""Lesson 20.1: deciding which actions wait for a person.

The policy reads two facts the model cannot change: what kind of effect a tool
has (looked up by tool name in a table the company wrote) and the amount on a
draft the policy gate of lesson 16.2 already checked against the purchase
record. Anything the table does not know is held, so a new tool starts out
needing a person rather than not needing one.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from agentlab.domain import InvoiceDraft

Effect = Literal["read", "reversible", "irreversible"]

EFFECTS: dict[str, Effect] = {
    "lookup_po": "read",
    "create_invoice_draft": "reversible",  # a draft can be deleted; nothing has left the company
    "submit_invoice": "irreversible",  # accounts payable schedules the payment
    "email_supplier": "irreversible",  # a sent message cannot be recalled
}

# Irreversible actions below these amounts proceed without a person.
AUTO_LIMITS: dict[str, Decimal] = {"USD": Decimal("1000.00")}


@dataclass(frozen=True)
class Need:
    required: bool
    reason: str


def needs_approval(tool: str, draft: InvoiceDraft | None = None) -> Need:
    """Hold an action for a person unless it is known to be safe to run alone."""
    effect = EFFECTS.get(tool)
    if effect is None:
        return Need(True, f"{tool} has no effect class, so it is held for a person")
    if effect == "read":
        return Need(False, "a read changes nothing")
    if effect == "reversible":
        return Need(False, "a reversible write can be undone")
    if draft is None:
        return Need(True, f"{tool} cannot be undone and has no amount to bound it")
    limit = AUTO_LIMITS.get(draft.currency)
    if limit is None:
        return Need(True, f"no automatic limit is set for {draft.currency}")
    if draft.amount >= limit:
        return Need(True, f"{draft.amount} {draft.currency} is at or above the {limit} {draft.currency} limit")
    return Need(False, f"below the {limit} {draft.currency} limit")


def preview(draft: InvoiceDraft) -> str:
    """The exact text an approver sees: every field the approval will be bound to."""
    return f"Submit {draft.invoice_id} version {draft.version} to {draft.payee} for {draft.amount} {draft.currency}"
