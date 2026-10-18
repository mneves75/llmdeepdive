"""Lesson 15.3: an MCP client for the subset in ``server.py``, and a catalog that grants nothing by itself.

``McpClient`` sends requests with the per-request ``_meta`` the 2026-07-28
revision requires, matches responses by id, follows ``tools/list`` cursors
and treats an unknown ``resultType`` as invalid.

``ToolCatalog`` separates what a server *offers* from what the user
*approved*. Approval is recorded against a fingerprint of the exact tool
definition, so a new tool, or an approved tool whose description or schema
changed, needs a new approval before the model may call it. Tool
descriptions are untrusted text from the server.
"""

from __future__ import annotations

import hashlib
import json
import queue
import subprocess
import threading
from collections.abc import Mapping
from dataclasses import dataclass, field

from agentlab.tools.jsonrpc import PendingCalls, ProtocolViolation
from agentlab.tools.server import CAPABILITIES_KEY, PROTOCOL_VERSION, SUBSCRIPTION_KEY, VERSION_KEY

CLIENT_INFO = {"name": "agentlab-client", "version": "0.1.0"}

__all__ = ["McpClient", "ProtocolViolation", "RemoteError", "RequestTimeout", "StdioTransport", "ToolCatalog", "ToolNotApproved", "TransportClosed"]


class TransportClosed(Exception):
    """The server's stream ended: the process exited or closed stdout."""


class RequestTimeout(Exception):
    """No message arrived in time."""


class RemoteError(Exception):
    """The server answered with a JSON-RPC error."""

    def __init__(self, code: int, message: str, data: object = None) -> None:
        super().__init__(f"{code}: {message}")
        self.code, self.message, self.data = code, message, data


class ToolNotApproved(Exception):
    """The model asked for a tool the user has not approved in its current form."""


class StdioTransport:
    """Launches the server as a child process and exchanges one JSON message per line."""

    def __init__(self, argv: list[str], env: Mapping[str, str] | None = None) -> None:
        self.process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", env=env)
        self._lines: queue.Queue[str | None] = queue.Queue()
        # A reader thread lets receive() wait with a timeout instead of blocking forever on readline.
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self) -> None:
        for line in self.process.stdout:
            self._lines.put(line)
        self._lines.put(None)  # end of stream

    def send(self, line: str) -> None:
        try:
            self.process.stdin.write(line + "\n")
            self.process.stdin.flush()
        except (BrokenPipeError, ValueError, OSError) as error:
            raise TransportClosed("server stdin is closed") from error

    def receive(self, timeout: float) -> str:
        try:
            line = self._lines.get(timeout=timeout)
        except queue.Empty:
            raise RequestTimeout(f"no message within {timeout} s") from None
        if line is None:
            self._lines.put(None)  # every later receive sees the end too
            raise TransportClosed(f"server exited with code {self.process.poll()}")
        return line

    def close(self) -> None:
        """The spec's shutdown order: close stdin, wait, then terminate, then kill."""
        if self.process.stdin and not self.process.stdin.closed:
            try:
                self.process.stdin.close()
            except OSError:
                pass
        for stop in (lambda: None, self.process.terminate, self.process.kill):
            stop()
            try:
                self.process.wait(timeout=5)
                break
            except subprocess.TimeoutExpired:
                continue
        if self.process.stdout:
            self.process.stdout.close()


def fingerprint(definition: dict) -> str:
    return hashlib.sha256(json.dumps(definition, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


@dataclass
class ToolCatalog:
    offered: dict[str, dict] = field(default_factory=dict)
    approved: dict[str, str] = field(default_factory=dict)  # name -> fingerprint the user approved
    stale: bool = False

    def update(self, tools: list[dict]) -> list[str]:
        """Record what the server offers now; return the names that are new or changed, to show the user."""
        previous, self.offered = self.offered, {tool["name"]: tool for tool in tools}
        self.stale = False
        return [name for name, tool in self.offered.items() if name not in previous or fingerprint(previous[name]) != fingerprint(tool)]

    def approve(self, name: str) -> None:
        """Called by the host after the user saw this exact definition and said yes."""
        self.approved[name] = fingerprint(self.offered[name])

    def callable_definitions(self) -> list[dict]:
        """The only tools the model is shown or may call."""
        return [tool for name, tool in self.offered.items() if self.approved.get(name) == fingerprint(tool)]


class McpClient:
    def __init__(self, transport, timeout_s: float = 10.0) -> None:
        self._transport = transport
        self._timeout_s = timeout_s
        self._pending = PendingCalls()
        self.catalog = ToolCatalog()
        self.notifications: list[dict] = []
        self._subscription: int | None = None

    def _send(self, request_id: int, method: str, params: dict | None) -> None:
        meta = {VERSION_KEY: PROTOCOL_VERSION, "io.modelcontextprotocol/clientInfo": CLIENT_INFO, CAPABILITIES_KEY: {}}
        self._transport.send(json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": {**(params or {}), "_meta": meta}}))

    def _next_message(self, timeout: float) -> dict:
        line = self._transport.receive(timeout)
        try:
            message = json.loads(line)
        except json.JSONDecodeError as error:
            raise ProtocolViolation("server wrote a line that is not JSON") from error
        if not isinstance(message, dict):
            raise ProtocolViolation("server wrote a message that is not an object")
        return message

    def request(self, method: str, params: dict | None = None) -> dict:
        request_id = self._pending.new_id()
        self._send(request_id, method, params)
        while True:
            try:
                message = self._next_message(self._timeout_s)
            except RequestTimeout:
                self._pending.cancel(request_id)
                self._transport.send(json.dumps({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": request_id, "reason": "timeout"}}))
                raise
            if "id" not in message:
                self._on_notification(message)
                continue
            if self._pending.settle(message) != request_id:
                continue  # a late answer to a request this client already cancelled
            if "error" in message:
                error = message["error"]
                raise RemoteError(error.get("code"), str(error.get("message"))[:200], error.get("data"))
            result = message.get("result")
            if not isinstance(result, dict) or result.get("resultType", "complete") != "complete":
                raise ProtocolViolation(f"unsupported result for {method}")
            return result

    def _on_notification(self, message: dict) -> None:
        self.notifications.append(message)
        meta = (message.get("params") or {}).get("_meta") or {}
        if message.get("method") == "notifications/tools/list_changed" and meta.get(SUBSCRIPTION_KEY) == self._subscription:
            self.catalog.stale = True  # re-list later; nothing becomes callable here

    def poll(self) -> None:
        """Read any notifications already waiting, without blocking."""
        while True:
            try:
                message = self._next_message(0)
            except RequestTimeout:
                return
            if "id" in message:
                raise ProtocolViolation("unexpected response while idle")
            self._on_notification(message)

    def discover(self) -> dict:
        return self.request("server/discover")

    def subscribe_to_tool_changes(self) -> None:
        """Open a subscriptions/listen stream; its response only comes when the stream ends."""
        request_id = self._pending.new_id()
        self._subscription = request_id
        self._send(request_id, "subscriptions/listen", {"notifications": {"toolsListChanged": True}})
        while True:
            message = self._next_message(self._timeout_s)
            self._on_notification(message)
            if message.get("method") == "notifications/subscriptions/acknowledged":
                if message["params"].get("notifications", {}).get("toolsListChanged") is not True:
                    raise ProtocolViolation("server did not agree to send tool-list changes")
                return

    def list_tools(self, max_pages: int = 20) -> list[dict]:
        """Follow cursors to the end, but not forever: a server could hand out cursors endlessly."""
        tools: list[dict] = []
        cursor = None
        for _ in range(max_pages):
            result = self.request("tools/list", {} if cursor is None else {"cursor": cursor})
            tools += result["tools"]
            cursor = result.get("nextCursor")
            if cursor is None:  # "" is a valid cursor, so only absence ends the list
                return tools
        raise ProtocolViolation(f"tools/list did not end within {max_pages} pages")

    def refresh_catalog(self) -> list[str]:
        return self.catalog.update(self.list_tools())

    def call_tool(self, name: str, arguments: dict) -> dict:
        if name not in {tool["name"] for tool in self.catalog.callable_definitions()}:
            raise ToolNotApproved(f"{name[:64]} is not approved in its current form")
        return self.request("tools/call", {"name": name, "arguments": arguments})
