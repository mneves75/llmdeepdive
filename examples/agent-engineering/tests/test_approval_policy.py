"""Lesson 20.1: which actions wait for a person, and what that person is shown."""

import unittest
from decimal import Decimal

from agentlab.approval.policy import needs_approval, preview
from agentlab.domain import InvoiceDraft


def draft(amount: str, currency: str = "USD") -> InvoiceDraft:
    return InvoiceDraft(invoice_id="INV-0042", version=1, tenant_id="tenant-a", payee="Supplier Gamma", amount=Decimal(amount), currency=currency)


class ApprovalPolicy(unittest.TestCase):
    def test_a_local_read_needs_no_approval(self):
        self.assertFalse(needs_approval("lookup_po").required)

    def test_a_reversible_draft_needs_no_approval(self):
        self.assertFalse(needs_approval("create_invoice_draft", draft("10000.00")).required)

    def test_submitting_a_10000_usd_invoice_needs_approval(self):
        need = needs_approval("submit_invoice", draft("10000.00"))
        self.assertTrue(need.required)
        self.assertIn("1000.00", need.reason)

    def test_the_limit_itself_needs_approval(self):
        self.assertTrue(needs_approval("submit_invoice", draft("1000.00")).required)

    def test_a_small_submission_passes_below_the_limit(self):
        # Positive control: without it, a policy that held everything would pass every test above.
        self.assertFalse(needs_approval("submit_invoice", draft("999.99")).required)

    def test_a_currency_without_a_limit_is_held(self):
        self.assertTrue(needs_approval("submit_invoice", draft("10.00", "EUR")).required)

    def test_an_irreversible_action_without_an_amount_is_held(self):
        self.assertTrue(needs_approval("email_supplier").required)

    def test_an_unknown_tool_is_held(self):
        self.assertTrue(needs_approval("pay_invoice", draft("1.00")).required)


class Preview(unittest.TestCase):
    def test_the_preview_shows_every_bound_field(self):
        text = preview(draft("10000.00"))
        for part in ("INV-0042", "version 1", "Supplier Gamma", "10000.00 USD"):
            self.assertIn(part, text)


if __name__ == "__main__":
    unittest.main()
