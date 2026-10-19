"""Lesson 20.2: binding an approval to one exact operation.

An ``ApprovalRequest`` (from ``agentlab.domain``) names the operation, carries
the draft and the SHA-256 of its canonical JSON, the requester's user id and an
aware expiry. The approver is not in it: the approver arrives later as a
``Principal`` the runtime built from an authenticated callback, and is checked
against the request. Whether the approval was already used lives in the store
(``agentlab.approval.store``), because one-use is state, not content.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta

from agentlab.domain import ApprovalRequest, InvoiceDraft, Principal

APPROVER_ROLE = "invoice_approver"


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str


def content_sha256(draft: InvoiceDraft) -> str:
    """Hash of the draft as sorted, compact JSON, so equal drafts always hash equal."""
    canonical = json.dumps(draft.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build_request(draft: InvoiceDraft, *, approval_id: str, operation_id: str, requester: Principal, now: datetime, ttl: timedelta) -> ApprovalRequest:
    return ApprovalRequest(
        approval_id=approval_id,
        operation_id=operation_id,
        invoice=draft,
        content_sha256=content_sha256(draft),
        requested_by=requester.user_id,
        expires_at=now + ttl,
    )


def check_approver(request: ApprovalRequest, approver: Principal) -> Decision:
    """Someone else, in the same tenant, holding the approver role."""
    if approver.user_id == request.requested_by:
        return Decision(False, f"{approver.user_id} requested this approval and cannot grant it")
    if approver.tenant_id != request.invoice.tenant_id:
        return Decision(False, f"{approver.user_id} belongs to another tenant")
    if APPROVER_ROLE not in approver.roles:
        return Decision(False, f"{approver.user_id} does not hold {APPROVER_ROLE}")
    return Decision(True, f"{approver.user_id} may approve")


def covers(request: ApprovalRequest, draft: InvoiceDraft, now: datetime) -> Decision:
    """Does the approval still cover the draft about to be executed?"""
    if now >= request.expires_at:
        return Decision(False, f"the approval expired at {request.expires_at.isoformat()}")
    if content_sha256(draft) != request.content_sha256:
        return Decision(False, "the draft changed after it was approved")
    return Decision(True, "the approved draft, unchanged and in time")
