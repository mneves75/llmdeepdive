"""Lesson 22.4: a deliberately small subset of A2A v1.0.1, served and called over localhost.

A2A (Agent2Agent) lets one agent hand a task to another agent it does not
control. This module is a learning subset, not a compliant implementation:

- Discovery: an Agent Card at ``/.well-known/agent-card.json``.
- JSON-RPC binding over HTTP: ``SendMessage`` (blocking), ``GetTask`` and
  ``CancelTask``. Every task here finishes inside ``SendMessage``, so a
  cancel always meets a terminal task.
- Every request carries ``A2A-Version``; the agent serves 1.0 only and an
  absent header means 0.3 (section 3.6.2).
- A static bearer token, declared in the card, authenticated on every call.

Not implemented: streaming, ``SubscribeToTask``, push notifications,
``ListTasks`` (an operation section 3 defines, refused here), the extended card,
multi-turn input (a ``taskId`` only ever meets a terminal task), task
history and ``historyLength``, ``url``/``raw`` parts, extensions, card
signatures, card caching headers (section 8.6), tenants, the gRPC and
HTTP+JSON bindings, the ``A2A-Version`` request-parameter form (only the
header is read) and TLS (required in production by section 7.1). A
client-supplied ``contextId`` is accepted and kept. Requests for the
operations in that list get the error the specification assigns to an
undeclared capability or an unsupported operation.
"""

from __future__ import annotations

import argparse
import hmac
import itertools
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, ValidationError, model_validator
from pydantic.alias_generators import to_camel

from agentlab.domain import Principal
from agentlab.fixtures import load_purchases
from agentlab.tools.jsonrpc import INVALID_PARAMS, Dispatcher, RpcError

PROTOCOL_VERSION = "1.0"  # Major.Minor only: patch numbers are never negotiated (section 3.6)
WELL_KNOWN = "/.well-known/agent-card.json"
RPC_PATH = "/a2a/v1"
MAX_BODY = 64 * 1024

# Section 5.4, JSON-RPC column.
TASK_NOT_FOUND = -32001
TASK_NOT_CANCELABLE = -32002
PUSH_NOT_SUPPORTED = -32003
UNSUPPORTED_OPERATION = -32004
INVALID_AGENT_RESPONSE = -32006
VERSION_NOT_SUPPORTED = -32009

# Operations outside the subset, with the error the specification assigns (sections 3.3.4 and 5.4).
REFUSED = {
    "SendStreamingMessage": (UNSUPPORTED_OPERATION, "Streaming is not supported"),
    "SubscribeToTask": (UNSUPPORTED_OPERATION, "Streaming is not supported"),
    "GetExtendedAgentCard": (UNSUPPORTED_OPERATION, "No extended agent card"),
    "ListTasks": (UNSUPPORTED_OPERATION, "Not in this subset"),
    **{name: (PUSH_NOT_SUPPORTED, "Push notifications are not supported") for name in (
        "CreateTaskPushNotificationConfig", "GetTaskPushNotificationConfig", "ListTaskPushNotificationConfigs", "DeleteTaskPushNotificationConfig",
    )},
}

TERMINAL = {"TASK_STATE_COMPLETED", "TASK_STATE_FAILED", "TASK_STATE_CANCELED", "TASK_STATE_REJECTED"}
TaskState = Literal[
    "TASK_STATE_SUBMITTED", "TASK_STATE_WORKING", "TASK_STATE_COMPLETED", "TASK_STATE_FAILED",
    "TASK_STATE_CANCELED", "TASK_STATE_INPUT_REQUIRED", "TASK_STATE_REJECTED", "TASK_STATE_AUTH_REQUIRED",
]


class Wire(BaseModel):
    """The JSON shape on the wire: camelCase names, and unknown fields ignored (section 5.7)."""

    model_config = ConfigDict(extra="ignore", alias_generator=to_camel, populate_by_name=True, frozen=True, strict=True)


class Part(Wire):
    text: str | None = None
    data: JsonValue = None
    url: str | None = None
    raw: str | None = None
    media_type: str | None = None

    @model_validator(mode="after")
    def _one_kind(self) -> Part:
        kinds = {"text", "data", "url", "raw"} & self.model_fields_set
        if len(kinds) != 1:
            raise ValueError("a part holds exactly one of text, data, url or raw")
        if kinds & {"url", "raw"}:
            raise ValueError("url and raw parts are outside this subset")
        return self


class Message(Wire):
    message_id: str = Field(min_length=1, max_length=128)
    role: Literal["ROLE_USER", "ROLE_AGENT"]
    parts: list[Part] = Field(min_length=1, max_length=8)  # list: strict mode reads a JSON array as a list
    context_id: str | None = None
    task_id: str | None = None


class SendMessageRequest(Wire):
    message: Message


class TaskStatus(Wire):
    state: TaskState


class Artifact(Wire):
    artifact_id: str = Field(min_length=1)
    parts: list[Part] = Field(min_length=1)


class Task(Wire):
    id: str = Field(min_length=1)
    context_id: str | None = None
    status: TaskStatus
    artifacts: list[Artifact] = []


class LookupInput(BaseModel):
    """The skill's own input contract, stricter than the protocol: one field, nothing else."""

    model_config = ConfigDict(extra="forbid", strict=True)
    poId: str = Field(pattern=r"^PO-\d{4}$")  # noqa: N815 - the wire name


def error_info(reason: str, **metadata: str) -> list[dict]:
    """Error details as section 9.5 asks: an array of objects that each carry ``@type``."""
    return [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": reason, "domain": "a2a-protocol.org", "metadata": metadata}]


def negotiated(header: str | None) -> str:
    """The Major.Minor a request asks for; an empty or absent header means 0.3 (section 3.6.2)."""
    requested = (header or "").strip() or "0.3"
    return ".".join(requested.split(".")[:2])


class RecordsAgent:
    """The remote agent: looks up one purchase order for the authenticated caller's tenant."""

    def __init__(self, base_url: str, tokens: dict[str, Principal]) -> None:
        self.base_url = base_url
        self._tokens = tokens
        self._tasks: dict[str, tuple[str, dict]] = {}  # task id -> (owner, task)
        self._ids = itertools.count(1)

    def card(self) -> dict:
        return {
            "name": "Purchase records agent",
            "description": "Looks up one purchase order of the caller's tenant and returns its supplier and total. Synthetic data only.",
            "supportedInterfaces": [{"url": self.base_url + RPC_PATH, "protocolBinding": "JSONRPC", "protocolVersion": PROTOCOL_VERSION}],
            "version": "0.1.0",
            "capabilities": {"streaming": False, "pushNotifications": False, "extendedAgentCard": False},
            "securitySchemes": {"bearer": {"httpAuthSecurityScheme": {"scheme": "Bearer"}}},
            "securityRequirements": [{"schemes": {"bearer": {"list": []}}}],
            "defaultInputModes": ["application/json"],
            "defaultOutputModes": ["application/json"],
            "skills": [{
                "id": "lookup-purchase-order",
                "name": "Look up a purchase order",
                "description": 'Send one data part {"poId": "PO-1001"}; the artifact holds the supplier, total and currency.',
                "tags": ["purchasing"],
                "examples": ['{"poId": "PO-1001"}'],
            }],
        }

    def authenticate(self, authorization: str | None) -> Principal | None:
        scheme, _, token = (authorization or "").partition(" ")
        if scheme != "Bearer":
            return None
        for known, principal in self._tokens.items():
            if hmac.compare_digest(known.encode(), token.encode()):
                return principal
        return None

    def handle(self, body: str, *, version: str | None, principal: Principal) -> list[str]:
        """One JSON-RPC request in, its response out. The HTTP layer has already authenticated it."""
        owner = f"{principal.tenant_id}/{principal.user_id}"
        operations = {
            "SendMessage": lambda params: self._send(params, principal, owner),
            "GetTask": lambda params: self._owned(params, owner),
            "CancelTask": lambda params: self._cancel(params, owner),
        }
        dispatcher = Dispatcher()
        for name in (*operations, *REFUSED):
            dispatcher.method(name, lambda params, _id, _emit, name=name: _run(name, params, version, operations))
        return dispatcher.handle(body)

    def _send(self, params: dict, principal: Principal, owner: str) -> dict:
        try:
            request = SendMessageRequest.model_validate(params)
        except ValidationError as error:
            raise RpcError(INVALID_PARAMS, "Invalid parameters", error_info("INVALID_PARAMS", problems=str(error.error_count()))) from None
        message = request.message
        if message.role != "ROLE_USER":
            raise RpcError(INVALID_PARAMS, "Invalid parameters", error_info("INVALID_ROLE"))
        if message.task_id is not None:
            self._owned({"id": message.task_id}, owner)  # TaskNotFound if it is not the caller's
            raise RpcError(UNSUPPORTED_OPERATION, "Task is in a terminal state")  # every task here is
        number = next(self._ids)
        task = {"id": f"task-{number}", "contextId": message.context_id or f"ctx-{number}"}
        task |= self._lookup(message, principal, task)
        self._tasks[task["id"]] = (owner, task)
        return {"task": task}

    def _lookup(self, message: Message, principal: Principal, task: dict) -> dict:
        """The skill. Outcomes of the work are task states; protocol mistakes were errors above."""
        try:
            [part] = message.parts
            query = LookupInput.model_validate(part.data)
        except (ValueError, ValidationError):
            return _rejected(task, 'This skill takes one data part {"poId": "PO-0000"}.')
        order = next((p for p in load_purchases() if p["po_id"] == query.poId and p["tenant_id"] == principal.tenant_id), None)
        if order is None:
            # Same words whether the order is missing or another tenant's (section 3.3.2).
            return _rejected(task, f"No purchase order {query.poId} for this caller.")
        total = order["quantity"] * Decimal(order["unit_price"])
        data = {"poId": order["po_id"], "supplier": order["supplier"], "total": f"{total:.2f}", "currency": order["currency"]}
        return {
            "status": {"state": "TASK_STATE_COMPLETED"},
            "artifacts": [{"artifactId": "artifact-1", "name": "purchase-order", "parts": [{"data": data, "mediaType": "application/json"}]}],
        }

    def _owned(self, params: dict, owner: str) -> dict:
        task_id = params.get("id")
        entry = self._tasks.get(task_id) if isinstance(task_id, str) else None
        if entry is None or entry[0] != owner:
            raise RpcError(TASK_NOT_FOUND, "Task not found")  # never reveal another caller's task
        return entry[1]

    def _cancel(self, params: dict, owner: str) -> dict:
        task = self._owned(params, owner)
        if task["status"]["state"] in TERMINAL:
            raise RpcError(TASK_NOT_CANCELABLE, "Task cannot be canceled")
        raise AssertionError("unreachable: every task in this subset is terminal")


def _run(name: str, params: dict, version: str | None, operations: dict) -> dict:
    # Checked on every request: there is no session in which a version was agreed once.
    if negotiated(version) != PROTOCOL_VERSION:
        details = error_info("VERSION_NOT_SUPPORTED", requested=negotiated(version)[:16], supported=PROTOCOL_VERSION)
        raise RpcError(VERSION_NOT_SUPPORTED, "Version not supported", details)
    if name in REFUSED:
        raise RpcError(*REFUSED[name])
    return operations[name](params)


def _rejected(task: dict, text: str) -> dict:
    note = {"messageId": f"{task['id']}-status", "role": "ROLE_AGENT", "contextId": task["contextId"], "taskId": task["id"], "parts": [{"text": text}]}
    return {"status": {"state": "TASK_STATE_REJECTED", "message": note}}


class _Handler(BaseHTTPRequestHandler):
    agent: RecordsAgent

    def do_GET(self) -> None:  # noqa: N802 - http.server's name
        if self.path != WELL_KNOWN:
            return self._send(404, b"")
        self._send(200, json.dumps(self.agent.card()).encode(), "application/json")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != RPC_PATH:
            return self._send(404, b"")
        principal = self.agent.authenticate(self.headers.get("Authorization"))
        if principal is None:
            return self._send(401, b"", extra={"WWW-Authenticate": 'Bearer realm="a2a"'})
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self._send(413, b"")
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        lines = self.agent.handle(body, version=self.headers.get("A2A-Version"), principal=principal)
        self._send(200, lines[0].encode(), "application/json") if lines else self._send(204, b"")

    def _send(self, status: int, body: bytes, content_type: str | None = None, extra: dict | None = None) -> None:
        self.send_response(status)
        headers = {**({"Content-Type": content_type} if content_type else {}), **(extra or {})}
        for name, value in headers.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A002 - keep test output clean
        pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Serve the purchase records agent on 127.0.0.1.")
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args(argv)
    tenants = json.loads(os.environ.get("AGENTLAB_A2A_TOKENS", "{}"))
    tokens = {token: Principal(user_id=f"client-{tenant}", tenant_id=tenant) for token, tenant in tenants.items()}
    server = HTTPServer(("127.0.0.1", args.port), _Handler)
    base = f"http://127.0.0.1:{server.server_port}"
    _Handler.agent = RecordsAgent(base, tokens)
    print(f"listening {base}", flush=True)
    server.serve_forever()
    return 0


# Client side ------------------------------------------------------------------


class IncompatibleAgent(Exception):
    """The card offers nothing this client can safely use; nothing was sent."""


class A2AError(Exception):
    def __init__(self, code: int, message: str) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code


def _origin(url: str) -> tuple[str, str]:
    parts = urllib.parse.urlsplit(url)
    return parts.scheme, parts.netloc


def choose_interface(card: dict, *, origin: str) -> dict:
    """The first JSON-RPC interface at protocol 1.0, and only on the origin the card came from."""
    offered = card.get("supportedInterfaces") or []
    for interface in offered:
        if interface.get("protocolBinding") == "JSONRPC" and negotiated(interface.get("protocolVersion")) == PROTOCOL_VERSION:
            if _origin(interface.get("url", "")) != _origin(origin):
                # A card can name any URL; following it blindly would hand the bearer token to that host.
                raise IncompatibleAgent(f"the card points its interface at {_origin(interface.get('url', ''))[1]!r}")
            return interface
    raise IncompatibleAgent(f"no JSONRPC interface at {PROTOCOL_VERSION}; offered {[(i.get('protocolBinding'), i.get('protocolVersion')) for i in offered]}")


def parse_send_result(result: dict) -> dict:
    """``SendMessageResponse`` is a oneof: exactly a task or a message, checked before use."""
    present = [key for key in ("task", "message") if key in result]
    if len(present) != 1:
        raise A2AError(INVALID_AGENT_RESPONSE, f"expected a task or a message, got {present}")
    try:
        (Task if present[0] == "task" else Message).model_validate(result[present[0]])
    except ValidationError as error:
        raise A2AError(INVALID_AGENT_RESPONSE, f"{present[0]} does not match the schema: {error.error_count()} problem(s)") from None
    return result[present[0]]


class A2AClient:
    def __init__(self, base_url: str, token: str, timeout_s: float = 5.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.__token = token
        self.timeout_s = timeout_s
        self.endpoint: str | None = None
        self._ids = itertools.count(1)

    def __repr__(self) -> str:
        return f"A2AClient({self.base_url!r})"  # never the token

    def discover(self) -> dict:
        with urllib.request.urlopen(self.base_url + WELL_KNOWN, timeout=self.timeout_s) as response:  # noqa: S310 - test-local URL
            card = json.loads(response.read(MAX_BODY))
        self.endpoint = choose_interface(card, origin=self.base_url)["url"]
        return card

    def _call(self, method: str, params: dict) -> dict:
        if self.endpoint is None:
            raise IncompatibleAgent("call discover() first")
        request_id = next(self._ids)
        body = json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}).encode()
        headers = {"Content-Type": "application/json", "A2A-Version": PROTOCOL_VERSION, "Authorization": f"Bearer {self.__token}"}
        try:
            with urllib.request.urlopen(urllib.request.Request(self.endpoint, data=body, headers=headers), timeout=self.timeout_s) as response:  # noqa: S310
                reply = json.loads(response.read(MAX_BODY))
        except urllib.error.HTTPError as error:
            raise A2AError(error.code, "HTTP error") from None
        if reply.get("id") != request_id:
            raise A2AError(INVALID_AGENT_RESPONSE, "response id does not match the request")
        if "error" in reply:
            raise A2AError(reply["error"].get("code", 0), str(reply["error"].get("message", ""))[:200])
        return reply["result"]

    def send_message(self, message_id: str, parts: list[dict]) -> dict:
        return parse_send_result(self._call("SendMessage", {"message": {"messageId": message_id, "role": "ROLE_USER", "parts": parts}}))

    def get_task(self, task_id: str) -> dict:
        return parse_send_result({"task": self._call("GetTask", {"id": task_id})})


if __name__ == "__main__":
    raise SystemExit(main())
