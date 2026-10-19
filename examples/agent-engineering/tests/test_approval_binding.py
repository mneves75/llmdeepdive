"""Lesson 20.2: an approval covers one exact draft, for a limited time, from someone else."""

import unittest
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from pydantic import ValidationError

from agentlab.approval.binding import build_request, check_approver, content_sha256, covers
from agentlab.domain import ApprovalRequest, InvoiceDraft, Principal

NOW = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)
BUYER = Principal(user_id="u-buyer", tenant_id="tenant-a", roles=frozenset({"buyer"}))
APPROVER = Principal(user_id="u-approver", tenant_id="tenant-a", roles=frozenset({"invoice_approver"}))
DRAFT = InvoiceDraft(invoice_id="INV-0042", version=1, tenant_id="tenant-a", payee="Supplier Gamma", amount=Decimal("10000.00"), currency="USD")


def edited(**changes) -> InvoiceDraft:
    return InvoiceDraft.model_validate({**DRAFT.model_dump(), **changes})


class Binding(unittest.TestCase):
    def setUp(self):
        self.request = build_request(DRAFT, approval_id="ap-1", operation_id="run-1:submit_invoice", requester=BUYER, now=NOW, ttl=timedelta(days=3))

    def test_the_request_carries_the_hash_and_an_aware_expiry(self):
        self.assertEqual(self.request.content_sha256, content_sha256(DRAFT))
        self.assertEqual(self.request.expires_at, NOW + timedelta(days=3))
        self.assertEqual(self.request.requested_by, "u-buyer")

    def test_the_exact_draft_is_covered_before_expiry(self):
        self.assertTrue(covers(self.request, DRAFT, NOW + timedelta(days=1)).allowed)

    def test_editing_the_amount_voids_the_approval(self):
        decision = covers(self.request, edited(amount=Decimal("19000.00")), NOW)
        self.assertFalse(decision.allowed)
        self.assertIn("changed", decision.reason)

    def test_editing_the_payee_voids_the_approval(self):
        self.assertFalse(covers(self.request, edited(payee="Supplier Omega"), NOW).allowed)

    def test_a_new_version_with_the_same_amount_is_a_different_document(self):
        self.assertFalse(covers(self.request, edited(version=2), NOW).allowed)

    def test_the_approval_lapses_at_its_expiry(self):
        self.assertFalse(covers(self.request, DRAFT, NOW + timedelta(days=3)).allowed)


class Approver(unittest.TestCase):
    def setUp(self):
        self.request = build_request(DRAFT, approval_id="ap-1", operation_id="run-1:submit_invoice", requester=BUYER, now=NOW, ttl=timedelta(days=3))

    def test_a_different_person_with_the_role_may_approve(self):
        self.assertTrue(check_approver(self.request, APPROVER).allowed)

    def test_the_requester_cannot_approve_their_own_request(self):
        requester_with_role = Principal(user_id="u-buyer", tenant_id="tenant-a", roles=frozenset({"buyer", "invoice_approver"}))
        decision = check_approver(self.request, requester_with_role)
        self.assertFalse(decision.allowed)
        self.assertIn("requested", decision.reason)

    def test_a_person_without_the_role_cannot_approve(self):
        colleague = Principal(user_id="u-colleague", tenant_id="tenant-a", roles=frozenset({"buyer"}))
        self.assertFalse(check_approver(self.request, colleague).allowed)

    def test_an_approver_of_another_tenant_cannot_approve(self):
        outsider = Principal(user_id="u-other", tenant_id="tenant-b", roles=frozenset({"invoice_approver"}))
        self.assertFalse(check_approver(self.request, outsider).allowed)

    def test_a_model_cannot_write_an_approver_into_the_request(self):
        # The record has no slot for one: the approver arrives as a Principal from the runtime.
        with self.assertRaises(ValidationError):
            ApprovalRequest.model_validate({**self.request.model_dump(), "approved_by": "u-approver"})


if __name__ == "__main__":
    unittest.main()
