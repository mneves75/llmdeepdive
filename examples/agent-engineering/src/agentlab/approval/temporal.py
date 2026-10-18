"""Lesson 20.3: the approval wait as a Temporal 1.34.0 workflow.

Needs the ``frameworks`` dependency group; the core package never imports this
module. The workflow waits on a condition with a timeout, which Temporal turns
into a durable timer on its server: no worker has to stay alive during the
wait. A decision arrives as an Update. Its validator runs the same checks as
the core store (approver, hash) and rejects a bad decision before Temporal
writes it to the workflow's history.

The ``approver_json`` an Update carries is runtime data: the Slack or Teams
adapter builds it from an authenticated callback. It is never model output.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import timedelta

from temporalio import activity, workflow

with workflow.unsafe.imports_passed_through():
    from agentlab.approval.binding import check_approver
    from agentlab.domain import ApprovalRequest, Principal
    from agentlab.state.outbox import FakeInvoiceService


@dataclass
class SubmitActivities:
    service: FakeInvoiceService = field(default_factory=FakeInvoiceService)

    @activity.defn
    async def submit_invoice(self, request_json: str) -> str:
        request = ApprovalRequest.model_validate_json(request_json)
        # The operation id is the idempotency key: the same on every retry of this submission.
        return self.service.create(request.operation_id, request.invoice)


@workflow.defn
class ApprovalWorkflow:
    @workflow.init
    def __init__(self, request_json: str) -> None:
        self.request = ApprovalRequest.model_validate_json(request_json)
        self.decision: str | None = None
        self.decided_by: str | None = None

    @workflow.run
    async def run(self, request_json: str) -> str:
        started = workflow.now()
        remaining = self.request.expires_at - started
        if remaining <= timedelta(0):
            return "expired"
        try:
            await workflow.wait_condition(lambda: self.decision is not None, timeout=remaining)
        except asyncio.TimeoutError:
            return "expired"
        waited = workflow.now() - started
        if self.decision == "deny":
            return f"denied by {self.decided_by} after {waited}"
        number = await workflow.execute_activity_method(
            SubmitActivities.submit_invoice, request_json, start_to_close_timeout=timedelta(seconds=30)
        )
        return f"{number} approved by {self.decided_by} after {waited}"

    @workflow.update
    def decide(self, approver_json: str, decision: str, content_sha256: str) -> str:
        self.decision, self.decided_by = decision, Principal.model_validate_json(approver_json).user_id
        return decision

    @decide.validator
    def check_decision(self, approver_json: str, decision: str, content_sha256: str) -> None:
        """Raising here rejects the Update before it reaches the history."""
        if self.decision is not None:
            raise ValueError(f"already {self.decision}")
        if decision not in ("approve", "deny"):
            raise ValueError(f"unknown decision {decision!r}")
        if content_sha256 != self.request.content_sha256:
            raise ValueError("the approver saw a different draft")
        who = check_approver(self.request, Principal.model_validate_json(approver_json))
        if not who.allowed:
            raise ValueError(who.reason)
