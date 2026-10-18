"""Lesson 16.2: indirect prompt injection meets a policy gate outside the model."""

import unittest
from datetime import UTC, datetime

from agentlab.domain import Principal, ToolRequest
from agentlab.fixtures import load_purchases, load_supplier_message
from agentlab.model import ModelReply, ScriptedModel
from agentlab.security.assistant import FakeBackOffice, as_untrusted, keyword_detector, run_assistant
from agentlab.security.gate import ASSISTANT_GRANT, authorize

TENANT_A = Principal(user_id="buyer-7", tenant_id="tenant-a", roles=frozenset({"buyer"}))
NEVER_DETECTS = lambda text: False  # noqa: E731 (a detector configured to miss every attack)
ALWAYS_DETECTS = lambda text: True  # noqa: E731


def call(tool, **arguments):
    return ModelReply(tool_call={"name": tool, "arguments": arguments})


def obeys_injection():
    """A model that does exactly what the hidden comment asks: the worst case the gate must survive."""
    return ScriptedModel([
        call("create_invoice_draft", po_id="PO-1002", payee="Supplier Omega", amount="11340.00", currency="USD"),
        call("approve_invoice", po_id="PO-1002"),
        ModelReply(text="Invoice created and approved."),
    ])


def honest_drafter(po_id="PO-1001", payee="Supplier Alpha", amount="500.00"):
    return ScriptedModel([
        call("lookup_po", po_id=po_id),
        call("create_invoice_draft", po_id=po_id, payee=payee, amount=amount, currency="USD"),
        ModelReply(text="Draft ready for approval."),
    ])


def run(model, message, detector):
    office = FakeBackOffice(load_purchases())
    outcome = run_assistant(model, message, TENANT_A, ASSISTANT_GRANT, office.tools(), office.purchases, detector=detector)
    return office, outcome


class InjectionCannotGrantAWrite(unittest.TestCase):
    def test_a_missed_injection_still_gets_no_write(self):
        office, outcome = run(obeys_injection(), load_supplier_message("injection"), NEVER_DETECTS)
        self.assertFalse(outcome.flagged)
        self.assertEqual((office.drafts, office.approvals), ([], []))
        self.assertEqual([tool for tool, _ in outcome.denied], ["create_invoice_draft", "approve_invoice"])

    def test_detection_adds_a_review_flag_but_does_not_change_decisions(self):
        office, outcome = run(obeys_injection(), load_supplier_message("injection"), keyword_detector)
        self.assertTrue(outcome.flagged)
        self.assertEqual((office.drafts, office.approvals), ([], []))

    def test_benign_control_produces_one_correct_draft(self):
        office, outcome = run(honest_drafter(), load_supplier_message("benign"), NEVER_DETECTS)
        self.assertEqual(outcome.denied, [])
        self.assertEqual(office.drafts, [{"po_id": "PO-1001", "payee": "Supplier Alpha", "amount": "500.00", "currency": "USD"}])

    def test_a_false_alarm_flags_a_benign_message_without_blocking_correct_work(self):
        office, outcome = run(honest_drafter(), load_supplier_message("benign"), ALWAYS_DETECTS)
        self.assertTrue(outcome.flagged)
        self.assertEqual(len(office.drafts), 1)

    def test_every_decision_is_audited(self):
        _, outcome = run(obeys_injection(), load_supplier_message("injection"), NEVER_DETECTS)
        kinds = [event.kind for event in outcome.audit]
        self.assertEqual(kinds, ["run.started", "policy.denied", "policy.denied", "run.finished"])
        self.assertEqual(outcome.audit[1].data["tool"], "create_invoice_draft")


class Authorize(unittest.TestCase):
    def setUp(self):
        self.purchases = load_purchases()

    def decide(self, tool, **arguments):
        request = ToolRequest(run_id="r1", operation_id="op1", tool=tool, arguments=arguments)
        return authorize(request, TENANT_A, ASSISTANT_GRANT, self.purchases)

    def test_the_tenant_comes_from_the_principal_not_the_request(self):
        # PO-2001 exists, for tenant-b. A tenant argument in the request would be ignored, so it is refused as unknown.
        decision = self.decide("lookup_po", po_id="PO-2001")
        self.assertFalse(decision.allowed)
        self.assertIn("not a purchase order of tenant-a", decision.reason)
        self.assertFalse(self.decide("lookup_po", po_id="PO-2001", tenant_id="tenant-b").allowed)

    def test_payee_and_amount_must_match_the_purchase_record(self):
        self.assertTrue(self.decide("create_invoice_draft", po_id="PO-1002", payee="Supplier Alpha", amount="1134.00", currency="USD").allowed)
        self.assertIn("payee", self.decide("create_invoice_draft", po_id="PO-1002", payee="Supplier Omega", amount="1134.00", currency="USD").reason)
        self.assertIn("amount", self.decide("create_invoice_draft", po_id="PO-1002", payee="Supplier Alpha", amount="11340.00", currency="USD").reason)

    def test_unknown_arguments_are_refused(self):
        decision = self.decide("create_invoice_draft", po_id="PO-1002", payee="Supplier Alpha", amount="1134.00", currency="USD", approved=True)
        self.assertFalse(decision.allowed)
        self.assertIn("arguments", decision.reason)

    def test_a_granted_tool_without_a_policy_check_is_refused(self):
        # Fail-safe default: being on the allowlist is not enough without a rule that checks the arguments.
        request = ToolRequest(run_id="r1", operation_id="op1", tool="archive_message", arguments={})
        decision = authorize(request, TENANT_A, ASSISTANT_GRANT | {"archive_message"}, self.purchases)
        self.assertFalse(decision.allowed)
        self.assertIn("no policy check", decision.reason)


class UntrustedWrapping(unittest.TestCase):
    def test_outside_text_is_marked_as_data(self):
        message = as_untrusted("supplier_message", "hello")
        self.assertEqual(message["role"], "user")
        self.assertIn('<untrusted source="supplier_message">', message["content"])

    def test_the_model_sees_the_injection_as_data_and_is_told_so(self):
        model = obeys_injection()
        run(model, load_supplier_message("injection"), NEVER_DETECTS)
        first_call = model.calls[0]
        self.assertEqual(first_call[0]["role"], "system")
        self.assertNotIn("Supplier Omega", first_call[0]["content"])
        self.assertIn("Supplier Omega", first_call[-1]["content"])
        self.assertTrue(first_call[-1]["content"].startswith("<untrusted"))


if __name__ == "__main__":
    unittest.main()
