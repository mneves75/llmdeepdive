"""Lesson 14.4: delivering outbox effects at least once, with one logical result.

Delivery may repeat: a crash or a lost reply leaves the sender unsure whether
the write happened. The idempotency key makes a repeat harmless, because the
receiving service returns the result it already recorded for that key. An
outcome the sender cannot know moves the row to ``reconciling``, and
``reconcile`` asks the service what it recorded before anything is resent.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol

from agentlab.domain import InvoiceDraft
from agentlab.state.checkpoints import CheckpointStore


def idempotency_key(run_id: str, operation: str) -> str:
    """Derived from durable identifiers, so a replayed step produces the same key."""
    return f"{run_id}:{operation}"


class OutcomeUnknown(Exception):
    """The request may or may not have taken effect (a timeout, a dropped connection)."""


class InvoiceService(Protocol):
    def create(self, key: str, draft: InvoiceDraft) -> str: ...
    def find(self, key: str) -> str | None: ...


@dataclass
class FakeInvoiceService:
    """An accounts-payable system that deduplicates by idempotency key.

    ``fail_next`` injects one failure: ``before_write`` loses the request,
    ``after_write`` records the invoice and then loses the reply.
    """

    invoices: dict[str, str] = field(default_factory=dict)
    fail_next: Literal["before_write", "after_write"] | None = None
    create_calls: int = 0

    def create(self, key: str, draft: InvoiceDraft) -> str:
        self.create_calls += 1
        failure, self.fail_next = self.fail_next, None
        if failure == "before_write":
            raise OutcomeUnknown("request lost")
        number = self.invoices.setdefault(key, f"AP-{len(self.invoices) + 1:04d}")
        if failure == "after_write":
            raise OutcomeUnknown("reply lost")
        return number

    def find(self, key: str) -> str | None:
        return self.invoices.get(key)


def deliver_pending(store: CheckpointStore, service: InvoiceService) -> None:
    """Send every pending effect once; record the result or the uncertainty."""
    for key, draft in store.outbox("pending"):
        try:
            number = service.create(key, draft)
        except OutcomeUnknown:
            store.mark(key, "reconciling")
            continue
        store.mark(key, "done", number)


def reconcile(store: CheckpointStore, service: InvoiceService) -> None:
    """Resolve each uncertain effect by asking the service what it recorded."""
    for key, _draft in store.outbox("reconciling"):
        number = service.find(key)
        if number is None:
            store.mark(key, "pending")  # it never happened: safe to send again
        else:
            store.mark(key, "done", number)
