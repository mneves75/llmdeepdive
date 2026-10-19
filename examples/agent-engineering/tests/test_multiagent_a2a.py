"""Lesson 22.4: a minimal A2A v1.0.1 subset between two separately started processes.

The server runs as its own process (``python -m agentlab.multiagent.a2a``) on
127.0.0.1; the client is this test process. Nothing leaves the machine.
"""

import json
import os
import subprocess
import sys
import unittest
import urllib.error
import urllib.request
from importlib.resources import files

from agentlab.multiagent.a2a import A2AClient, A2AError, IncompatibleAgent, choose_interface, parse_send_result

TOKENS = {"token-tenant-a": "tenant-a", "token-tenant-b": "tenant-b"}  # synthetic, not secrets
FIXTURE = json.loads((files("agentlab.fixtures") / "multiagent" / "a2a_exchange.json").read_text(encoding="utf-8"))


class Server:
    """Start the agent as a separate process and read the address it prints."""

    def __enter__(self):
        env = {**os.environ, "AGENTLAB_A2A_TOKENS": json.dumps(TOKENS)}
        self.process = subprocess.Popen([sys.executable, "-m", "agentlab.multiagent.a2a", "--port", "0"], stdout=subprocess.PIPE, text=True, env=env)
        line = self.process.stdout.readline()
        if not line.startswith("listening "):
            self.process.kill()
            raise RuntimeError(f"server did not start: {line!r}")
        self.base = line.split()[1]
        return self

    def __exit__(self, *exc):
        self.process.terminate()
        self.process.wait(timeout=10)
        self.process.stdout.close()


def post(url, body, headers):
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status, dict(response.headers), json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), None


def rpc(method, params, request_id=7):
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}


def lookup(po_id, message_id="msg-x", **message):
    return {"message": {"messageId": message_id, "role": "ROLE_USER", "parts": [{"data": {"poId": po_id}}], **message}}


class PinnedExchange(unittest.TestCase):
    def test_card_and_first_exchange_match_the_pinned_fixture(self):
        with Server() as server:
            with urllib.request.urlopen(f"{server.base}/.well-known/agent-card.json", timeout=5) as response:
                card = json.loads(response.read())  # public: no credentials needed to discover
            expected = json.loads(json.dumps(FIXTURE["agentCard"]).replace("{base}", server.base))
            self.assertEqual(card, expected)
            headers = {"Authorization": "Bearer token-tenant-a", "A2A-Version": "1.0"}
            status, _, body = post(f"{server.base}/a2a/v1", FIXTURE["sendMessage"]["request"], headers)
            self.assertEqual((status, body), (200, FIXTURE["sendMessage"]["response"]))


class Exchange(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = Server().__enter__()
        cls.endpoint = f"{cls.server.base}/a2a/v1"

    @classmethod
    def tearDownClass(cls):
        cls.server.__exit__(None, None, None)

    def call(self, method, params, version="1.0", token="token-tenant-a"):
        headers = {"Authorization": f"Bearer {token}"}
        if version is not None:
            headers["A2A-Version"] = version
        return post(self.endpoint, rpc(method, params), headers)

    def test_the_client_discovers_sends_and_reads_back_the_task(self):
        client = A2AClient(self.server.base, token="token-tenant-a")
        client.discover()
        task = client.send_message("msg-c1", [{"data": {"poId": "PO-1003"}}])
        self.assertEqual(task["status"]["state"], "TASK_STATE_COMPLETED")
        self.assertEqual(task["artifacts"][0]["parts"][0]["data"]["total"], "780.00")
        self.assertEqual(client.get_task(task["id"]), task)

    def test_missing_or_wrong_credentials_get_401_with_a_challenge(self):
        for headers in ({"A2A-Version": "1.0"}, {"A2A-Version": "1.0", "Authorization": "Bearer guess"}):
            status, response_headers, _ = post(self.endpoint, rpc("SendMessage", lookup("PO-1001")), headers)
            self.assertEqual(status, 401)
            self.assertTrue(response_headers["WWW-Authenticate"].startswith("Bearer"))

    def test_incompatible_versions_are_refused_with_version_not_supported(self):
        # An absent header means 0.3 (section 3.6.2), which this 1.0-only agent does not serve.
        for version in (None, "0.3", "0.5", "2.0"):
            _, _, body = self.call("SendMessage", lookup("PO-1001"), version=version)
            self.assertNotIn("result", body, version)
            self.assertEqual(body["error"]["code"], -32009)

    def test_a_patch_number_does_not_change_the_negotiated_version(self):
        # Section 3.6: patch numbers MUST not be considered when negotiating, so 1.0.1 means 1.0.
        _, _, body = self.call("SendMessage", lookup("PO-1001"), version="1.0.1")
        self.assertEqual(body["result"]["task"]["status"]["state"], "TASK_STATE_COMPLETED")

    def test_capabilities_the_card_does_not_declare_are_refused(self):
        self.assertEqual(self.call("SendStreamingMessage", lookup("PO-1001"))[2]["error"]["code"], -32004)
        self.assertEqual(self.call("CreateTaskPushNotificationConfig", {"taskId": "task-1"})[2]["error"]["code"], -32003)

    def test_another_tenants_order_is_rejected_without_its_data(self):
        _, _, body = self.call("SendMessage", lookup("PO-2001"))
        task = body["result"]["task"]
        self.assertEqual(task["status"]["state"], "TASK_STATE_REJECTED")
        self.assertNotIn("artifacts", task)
        self.assertNotIn("Supplier", json.dumps(body))

    def test_a_task_is_invisible_to_another_tenant(self):
        _, _, created = self.call("SendMessage", lookup("PO-1001"))
        task_id = created["result"]["task"]["id"]
        self.assertEqual(self.call("GetTask", {"id": task_id})[2]["result"]["id"], task_id)
        _, _, other = self.call("GetTask", {"id": task_id}, token="token-tenant-b")
        self.assertEqual(other["error"]["code"], -32001)  # same answer as a task that never existed

    def test_a_finished_task_accepts_no_more_messages(self):
        _, _, created = self.call("SendMessage", lookup("PO-1001"))
        task_id = created["result"]["task"]["id"]
        _, _, again = self.call("SendMessage", lookup("PO-1001", taskId=task_id))
        self.assertEqual(again["error"]["code"], -32004)
        self.assertEqual(self.call("CancelTask", {"id": task_id})[2]["error"]["code"], -32002)

    def test_a_message_without_parts_is_invalid_params(self):
        _, _, body = self.call("SendMessage", {"message": {"messageId": "m", "role": "ROLE_USER", "parts": []}})
        self.assertEqual(body["error"]["code"], -32602)


CARD = FIXTURE["agentCard"]


class ClientChecks(unittest.TestCase):
    def test_a_card_offering_only_an_older_version_is_refused_before_any_request(self):
        old = {**CARD, "supportedInterfaces": [{"url": "http://127.0.0.1:9/a2a", "protocolBinding": "JSONRPC", "protocolVersion": "0.3"}]}
        with self.assertRaises(IncompatibleAgent):
            choose_interface(old, origin="http://127.0.0.1:9")

    def test_the_preferred_compatible_interface_is_chosen(self):
        card = {**CARD, "supportedInterfaces": [
            {"url": "http://127.0.0.1:9/grpc", "protocolBinding": "GRPC", "protocolVersion": "1.0"},
            {"url": "http://127.0.0.1:9/a2a/v1", "protocolBinding": "JSONRPC", "protocolVersion": "1.0"},
        ]}
        self.assertEqual(choose_interface(card, origin="http://127.0.0.1:9")["url"], "http://127.0.0.1:9/a2a/v1")

    def test_a_card_that_points_elsewhere_does_not_receive_the_token(self):
        moved = {**CARD, "supportedInterfaces": [{"url": "http://collector.invalid/a2a", "protocolBinding": "JSONRPC", "protocolVersion": "1.0"}]}
        with self.assertRaises(IncompatibleAgent):
            choose_interface(moved, origin="http://127.0.0.1:9")

    def test_unknown_fields_in_a_response_are_ignored_but_a_bad_state_is_not(self):
        task = {**FIXTURE["sendMessage"]["response"]["result"]["task"], "addedInAFutureMinor": True}
        self.assertEqual(parse_send_result({"task": task})["id"], "task-1")
        with self.assertRaises(A2AError):
            parse_send_result({"task": {**task, "status": {"state": "DONE"}}})
        with self.assertRaises(A2AError):
            parse_send_result({"task": task, "message": {}})


if __name__ == "__main__":
    unittest.main()
