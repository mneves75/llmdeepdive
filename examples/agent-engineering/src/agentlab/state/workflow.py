"""Lesson 14.1: the least complex system that does the job, and how to know it did.

A supplier who always writes the same invoice layout needs no model: a fixed
pattern reads it, and refusing anything else is the safe answer. Whatever
system produced a total, success is judged against the trusted purchase
record, never against what the system says it did.
"""

from __future__ import annotations

import re
from decimal import Decimal

SUBJECT = re.compile(r"^Subject: Invoice for (PO-\d{4})$", re.MULTILINE)
TOTAL = re.compile(r"(\d+) x USD ([\d,]+\.\d{2}) = USD ([\d,]+\.\d{2})")


def parse_supplier_invoice(text: str) -> tuple[str, Decimal]:
    """Return (purchase order id, invoice total) from the supplier's fixed layout.

    Raises ``ValueError`` on any other layout: a parser that guesses would turn
    a format change into a wrong payment instead of an error someone sees.
    """
    subject, total = SUBJECT.search(text), TOTAL.search(text)
    if subject is None or total is None:
        raise ValueError("not the expected invoice layout")
    return subject.group(1), Decimal(total.group(3).replace(",", ""))


def invoice_matches_purchase(po_id: str, total: Decimal, purchases: list[dict], tenant_id: str) -> list[str]:
    """The task success assertion: problems found, or an empty list.

    It compares the claimed total with quantity x unit price from the
    purchase record of the run's own tenant, so another tenant's order is
    treated as missing.
    """
    record = next((p for p in purchases if p["po_id"] == po_id and p["tenant_id"] == tenant_id), None)
    if record is None:
        return [f"{po_id} is not a purchase order of {tenant_id}"]
    expected = record["quantity"] * Decimal(record["unit_price"])
    if total != expected:
        return [f"total {total} but the purchase order expected {expected}"]
    return []
