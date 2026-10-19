"""Lessons 15.3 and 15.4: the server as a real stdio process, used by two independent clients."""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

from agentlab.fixtures import load_purchases
from agentlab.tools.client import McpClient, StdioTransport, TransportClosed
from agentlab.tools.queries import build_sqlite

# A second client that shares no code with agentlab.tools.client: only the wire format.
SECOND_CLIENT = textwrap.dedent("""
    import json, subprocess, sys
    server = subprocess.Popen(sys.argv[1:], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
    meta = {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}
    def ask(i, method, params):
        server.stdin.write(json.dumps({"jsonrpc": "2.0", "id": "second-" + str(i), "method": method, "params": {**params, "_meta": meta}}) + "\\n")
        server.stdin.flush()
        reply = json.loads(server.stdout.readline())
        assert reply["id"] == "second-" + str(i), reply
        return reply["result"]
    names, cursor = [], None
    for i in range(10):
        page = ask(i, "tools/list", {} if cursor is None else {"cursor": cursor})
        names += [t["name"] for t in page["tools"]]
        cursor = page.get("nextCursor")
        if cursor is None:
            break
    own = ask(20, "tools/call", {"name": "lookup_purchase_order", "arguments": {"po_id": "PO-1001"}})
    other = ask(21, "tools/call", {"name": "lookup_purchase_order", "arguments": {"po_id": "PO-2001"}})
    server.stdin.close()
    print(json.dumps({"names": names, "own": own["structuredContent"], "other_is_error": other["isError"], "exit": server.wait(timeout=10)}))
""")


class StdioServer(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "purchases.sqlite"
        build_sqlite(self.path, load_purchases())
        self.argv = [sys.executable, "-m", "agentlab.tools.server", "--db", str(self.path)]
        self.env = {**os.environ, "AGENTLAB_USER_ID": "u1", "AGENTLAB_TENANT_ID": "tenant-a"}

    def tearDown(self):
        self.dir.cleanup()

    def test_our_client_lists_and_calls_over_stdio(self):
        transport = StdioTransport(self.argv, env=self.env)
        self.addCleanup(transport.close)
        client = McpClient(transport)
        self.assertEqual(client.discover()["supportedVersions"], ["2026-07-28"])
        self.assertEqual(client.refresh_catalog(), ["list_purchase_orders", "lookup_purchase_order", "search_purchase_orders"])
        client.catalog.approve("lookup_purchase_order")
        result = client.call_tool("lookup_purchase_order", {"po_id": "PO-1001"})
        self.assertEqual(result["structuredContent"]["po_id"], "PO-1001")

    def test_a_second_independent_client_interoperates(self):
        child = subprocess.run([sys.executable, "-c", SECOND_CLIENT, *self.argv], env=self.env, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report["names"], ["list_purchase_orders", "lookup_purchase_order", "search_purchase_orders"])
        self.assertEqual(report["own"]["supplier"], "Supplier Alpha")
        self.assertTrue(report["other_is_error"])
        self.assertEqual(report["exit"], 0)  # closing stdin shut the server down

    def test_stdout_carries_only_protocol_messages_and_notifications_get_no_reply(self):
        lines = [
            json.dumps({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 41}}),
            "this is not json",
            json.dumps({"jsonrpc": "2.0", "id": 1, "method": "server/discover", "params": {"_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}}}),
        ]
        child = subprocess.run(self.argv, input="\n".join(lines) + "\n", env=self.env, capture_output=True, text=True, timeout=60)
        replies = [json.loads(line) for line in child.stdout.splitlines()]
        self.assertEqual([r.get("id", "missing") for r in replies], [None, 1])  # parse error, then discover; nothing for the notification
        self.assertEqual(child.returncode, 0)

    def test_the_server_refuses_to_start_without_a_principal(self):
        env = {k: v for k, v in self.env.items() if k != "AGENTLAB_TENANT_ID"}
        child = subprocess.run(self.argv, input="", env=env, capture_output=True, text=True, timeout=60)
        self.assertNotEqual(child.returncode, 0)
        self.assertEqual(child.stdout, "")
        self.assertIn("AGENTLAB_TENANT_ID", child.stderr)

    def test_a_dead_server_is_reported_not_waited_on_forever(self):
        transport = StdioTransport(self.argv, env=self.env)
        self.addCleanup(transport.close)
        client = McpClient(transport, timeout_s=30)
        client.discover()
        transport.process.kill()
        transport.process.wait(timeout=10)
        with self.assertRaises(TransportClosed):
            client.discover()


if __name__ == "__main__":
    unittest.main()
