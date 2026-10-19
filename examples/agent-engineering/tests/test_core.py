"""The shared records and the model adapters every track builds on."""

import json
import threading
import unittest
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, HTTPServer

from pydantic import ValidationError

from datetime import UTC, datetime

from agentlab.domain import ApprovalRequest, ExecutionEvent, InvoiceDraft, Principal, RunState, ToolRequest, ToolResult
from agentlab.fixtures import load_purchases, load_supplier_message
from agentlab.model import ModelReply, OpenAICompatibleModel, ScriptExhausted, ScriptedModel


class StrictRecords(unittest.TestCase):
    def test_wrong_types_are_rejected_not_coerced(self):
        with self.assertRaises(ValidationError):
            ToolRequest(run_id="r1", operation_id="op1", tool="lookup_po", arguments="po=1")
        with self.assertRaises(ValidationError):
            InvoiceDraft(invoice_id="INV-0001", version="1", tenant_id="t", payee="p", amount=Decimal("1.00"), currency="USD")

    def test_unknown_fields_are_rejected(self):
        with self.assertRaises(ValidationError):
            ToolRequest(run_id="r1", operation_id="op1", tool="lookup_po", arguments={}, approved=True)

    def test_structurally_valid_is_not_authorized(self):
        # A perfectly shaped request for another tenant's invoice still validates:
        # authorization is a separate check (tracks 15 and 16), not a schema property.
        request = ToolRequest(run_id="r1", operation_id="op1", tool="read_invoice", arguments={"invoice_id": "INV-9001"})
        self.assertEqual(request.arguments["invoice_id"], "INV-9001")

    def test_bounded_error_field(self):
        with self.assertRaises(ValidationError):
            ToolResult(operation_id="op1", ok=False, error="x" * 501)

    def test_run_state_carries_trusted_principal(self):
        state = RunState(run_id="r1", principal=Principal(user_id="u1", tenant_id="tenant-a", roles=frozenset({"buyer"})))
        self.assertEqual(state.status, "received")
        with self.assertRaises(ValidationError):
            RunState.model_validate({**state.model_dump(), "status": "shipped"})


    def test_times_must_carry_a_timezone(self):
        # A naive expiry cannot be compared with an aware clock: approval checks would crash, or worse, compare local times.
        invoice = InvoiceDraft(invoice_id="INV-0001", version=1, tenant_id="tenant-a", payee="Supplier Alpha", amount=Decimal("500.00"), currency="USD")
        common = dict(approval_id="a1", operation_id="op1", invoice=invoice, content_sha256="0" * 64, requested_by="u1")
        with self.assertRaises(ValidationError):
            ApprovalRequest(**common, expires_at=datetime(2026, 10, 21, 12, 0))
        ApprovalRequest(**common, expires_at=datetime(2026, 10, 21, 12, 0, tzinfo=UTC))
        with self.assertRaises(ValidationError):
            ExecutionEvent(run_id="r1", seq=0, kind="run.started", at=datetime(2026, 10, 18, 9, 0))

    def test_empty_tenant_is_rejected(self):
        with self.assertRaises(ValidationError):
            InvoiceDraft(invoice_id="INV-0001", version=1, tenant_id="", payee="p", amount=Decimal("1.00"), currency="USD")

    def test_principal_round_trips_through_json(self):
        principal = Principal(user_id="u1", tenant_id="tenant-a", roles=frozenset({"buyer"}))
        self.assertEqual(Principal.model_validate_json(principal.model_dump_json()), principal)


class Fixtures(unittest.TestCase):
    def test_purchases_are_synthetic_and_multi_tenant(self):
        purchases = load_purchases()
        self.assertEqual({row["tenant_id"] for row in purchases}, {"tenant-a", "tenant-b"})
        self.assertTrue(all(row["po_id"].startswith("PO-") for row in purchases))

    def test_supplier_messages_include_an_attack(self):
        self.assertIn("ignore", load_supplier_message("injection").lower())
        self.assertNotIn("ignore", load_supplier_message("benign").lower())


class Scripted(unittest.TestCase):
    def test_replays_in_order_and_records_calls(self):
        model = ScriptedModel([ModelReply(text="hello"), ModelReply(tool_call={"name": "lookup_po", "arguments": {"po_id": "PO-1001"}})])
        self.assertEqual(model.complete([{"role": "user", "content": "hi"}]).text, "hello")
        self.assertEqual(model.complete([{"role": "user", "content": "again"}]).tool_call["name"], "lookup_po")
        self.assertEqual(len(model.calls), 2)

    def test_exhausted_script_fails_loudly(self):
        model = ScriptedModel([])
        with self.assertRaises(ScriptExhausted):
            model.complete([{"role": "user", "content": "hi"}])


class _FakeServer(BaseHTTPRequestHandler):
    reply: dict = {}

    def do_POST(self):  # noqa: N802 (http.server API)
        length = int(self.headers["Content-Length"])
        body = json.loads(self.rfile.read(length))
        _FakeServer.seen = body
        payload = json.dumps(_FakeServer.reply).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


class OpenAICompatible(unittest.TestCase):
    def setUp(self):
        self.server = HTTPServer(("127.0.0.1", 0), _FakeServer)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}/v1"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def test_parses_text_and_tool_calls(self):
        _FakeServer.reply = {"model": "local-test", "choices": [{"message": {"content": None, "tool_calls": [
            {"id": "c1", "type": "function", "function": {"name": "lookup_po", "arguments": "{\"po_id\": \"PO-1001\"}"}}]}}]}
        model = OpenAICompatibleModel(self.base, model="local-test")
        reply = model.complete([{"role": "user", "content": "find PO-1001"}], tools=[{"type": "function", "function": {"name": "lookup_po", "parameters": {"type": "object"}}}])
        self.assertEqual(reply.tool_call, {"name": "lookup_po", "arguments": {"po_id": "PO-1001"}})
        self.assertEqual(_FakeServer.seen["model"], "local-test")
        self.assertEqual(reply.served_by, "local-test")

    def test_api_key_never_appears_in_repr(self):
        self.assertNotIn("sk-test-secret", repr(OpenAICompatibleModel(self.base, model="m", api_key="sk-test-secret")))

    def test_only_http_urls_are_accepted(self):
        with self.assertRaises(ValueError):
            OpenAICompatibleModel("file:///etc/passwd", model="m")

    def test_transport_failure_is_a_classified_error(self):
        model = OpenAICompatibleModel("http://127.0.0.1:9/v1", model="m", timeout_s=2)
        reply = model.complete([{"role": "user", "content": "x"}])
        self.assertIsNone(reply.text)
        self.assertTrue(reply.error.startswith("transport:"), reply.error)

    def test_several_tool_calls_are_refused_not_truncated(self):
        call = {"function": {"name": "lookup_po", "arguments": "{}"}}
        _FakeServer.reply = {"model": "m", "choices": [{"message": {"tool_calls": [call, call]}}]}
        reply = OpenAICompatibleModel(self.base, model="m").complete([{"role": "user", "content": "x"}])
        self.assertIsNone(reply.tool_call)
        self.assertIn("2 tool calls", reply.error)

    def test_malformed_tool_arguments_are_an_error_not_a_guess(self):
        _FakeServer.reply = {"model": "m", "choices": [{"message": {"tool_calls": [{"function": {"name": "lookup_po", "arguments": "{po_id: PO-1001"}}]}}]}
        model = OpenAICompatibleModel(self.base, model="m")
        reply = model.complete([{"role": "user", "content": "x"}])
        self.assertIsNone(reply.tool_call)
        self.assertIn("not valid JSON", reply.error)


if __name__ == "__main__":
    unittest.main()
