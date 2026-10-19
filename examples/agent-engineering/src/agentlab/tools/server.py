"""Lessons 15.2–15.4: a deliberately small MCP server, revision 2026-07-28, over stdio.

Implemented: per-request ``_meta`` (protocol version and client capabilities,
checked on every request), ``server/discover``, ``tools/list`` with opaque
cursors, ``tools/call`` with tool errors as ``isError`` results,
``subscriptions/listen`` for ``toolsListChanged`` only, and
``notifications/cancelled`` for those subscriptions.

Not implemented, on purpose: resources, prompts, completions, logging,
progress, multi round-trip requests (``input_required``), extensions, the
Streamable HTTP transport and its authorization, cancelling a request in
flight (requests are handled one at a time, so each one has finished before
a cancellation could be read), closing a subscription gracefully (the spec
asks for a completing ``subscriptions/listen`` result before shutdown; this
server just exits on end of input), result caching beyond ``ttlMs: 0``, and the
legacy ``initialize`` handshake. This is a learning subset, not a compliant
implementation; use a maintained SDK for real servers.

The principal comes from the environment of the process, set by whoever
launches it (lesson 15.5): MCP's stdio transport takes credentials from the
environment rather than from the protocol.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import io
import json
import os
import sys
from collections.abc import Sequence

from agentlab.domain import Principal
from agentlab.tools.contracts import Tool, ToolRejected, validate_arguments
from agentlab.tools.jsonrpc import INVALID_PARAMS, METHOD_NOT_FOUND, NO_RESPONSE, Dispatcher, Emit, RpcError, encode, is_valid_id

PROTOCOL_VERSION = "2026-07-28"
SUPPORTED_VERSIONS = [PROTOCOL_VERSION]
UNSUPPORTED_PROTOCOL_VERSION = -32022  # defined by the MCP specification

VERSION_KEY = "io.modelcontextprotocol/protocolVersion"
CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities"
SUBSCRIPTION_KEY = "io.modelcontextprotocol/subscriptionId"
SERVER_INFO = {"name": "agentlab-purchasing", "version": "0.1.0"}

# Small on purpose, so the exercise's three tools need two pages.
PAGE_SIZE = 2


def check_request_meta(params: dict) -> None:
    """Every request states its version and capabilities; the server remembers nothing between requests."""
    meta = params.get("_meta")
    if not isinstance(meta, dict) or not isinstance(meta.get(VERSION_KEY), str) or not isinstance(meta.get(CAPABILITIES_KEY), dict):
        raise RpcError(INVALID_PARAMS, "missing required _meta fields", {"required": [VERSION_KEY, CAPABILITIES_KEY]})
    if meta[VERSION_KEY] not in SUPPORTED_VERSIONS:
        raise RpcError(UNSUPPORTED_PROTOCOL_VERSION, "Unsupported protocol version", {"supported": SUPPORTED_VERSIONS, "requested": meta[VERSION_KEY][:64]})


class McpServer:
    def __init__(self, principal: Principal, tools: Sequence[Tool]) -> None:
        self.principal = principal
        self._tools = {tool.name: tool for tool in tools}
        self._subscriptions: dict[str | int, None] = {}  # open subscriptions/listen requests, by request id
        self._dispatcher = Dispatcher()
        for name, handler in {
            "server/discover": self._discover,
            "tools/list": self._list_tools,
            "tools/call": self._call_tool,
            "subscriptions/listen": self._listen,
        }.items():
            self._dispatcher.method(name, self._with_meta(handler))
        self._dispatcher.method("notifications/cancelled", self._cancelled)
        self._dispatcher.method("initialize", self._legacy_initialize)

    def handle(self, line: str) -> list[str]:
        return self._dispatcher.handle(line)

    def replace_tools(self, tools: Sequence[Tool]) -> list[str]:
        """Swap the catalog (a deploy, a feature flag) and return the notifications to send.

        The server only says that the list changed. Deciding whether a new
        tool may be used is the client's job, and it starts from "no".
        """
        self._tools = {tool.name: tool for tool in tools}
        return [
            encode({"jsonrpc": "2.0", "method": "notifications/tools/list_changed", "params": {"_meta": {SUBSCRIPTION_KEY: sid}}})
            for sid in self._subscriptions
        ]

    @staticmethod
    def _with_meta(handler):
        def checked(params: dict, request_id, emit: Emit):
            check_request_meta(params)
            return handler(params, request_id, emit)

        return checked

    def _discover(self, params: dict, request_id, emit: Emit) -> dict:
        return {
            "resultType": "complete",
            "supportedVersions": SUPPORTED_VERSIONS,
            "capabilities": {"tools": {"listChanged": True}},
            "_meta": {"io.modelcontextprotocol/serverInfo": SERVER_INFO},
            "ttlMs": 0,
            "cacheScope": "private",
        }

    def _list_tools(self, params: dict, request_id, emit: Emit) -> dict:
        names = sorted(self._tools)  # a deterministic order, as the spec recommends
        after = _decode_cursor(params["cursor"]) if "cursor" in params else ""
        remaining = [name for name in names if name > after]
        page = remaining[:PAGE_SIZE]
        result: dict = {"resultType": "complete", "tools": [self._tools[n].definition() for n in page], "ttlMs": 0, "cacheScope": "private"}
        if len(remaining) > PAGE_SIZE:
            result["nextCursor"] = _encode_cursor(page[-1])
        return result

    def _call_tool(self, params: dict, request_id, emit: Emit) -> dict:
        name, arguments = params.get("name"), params.get("arguments", {})
        if not isinstance(name, str) or not isinstance(arguments, dict):
            raise RpcError(INVALID_PARAMS, "tools/call needs a string name and an object of arguments")
        tool = self._tools.get(name)
        if tool is None:
            raise RpcError(INVALID_PARAMS, f"Unknown tool: {name[:64]}")  # a protocol error, per the spec
        try:
            value = tool.run(self.principal, validate_arguments(name, arguments, {name: tool.arguments}))
        except ToolRejected as rejected:
            # A tool error goes back as a result, so the model can read it and correct itself.
            return {"resultType": "complete", "content": [{"type": "text", "text": str(rejected)}], "isError": True}
        return {"resultType": "complete", "content": [{"type": "text", "text": json.dumps(value)}], "structuredContent": value, "isError": False}

    def _listen(self, params: dict, request_id, emit: Emit) -> object:
        wanted = params.get("notifications")
        honoured = {"toolsListChanged": True} if isinstance(wanted, dict) and wanted.get("toolsListChanged") is True else {}
        if honoured:
            self._subscriptions[request_id] = None
        # Only the types this server supports are acknowledged; the client compares.
        emit({"jsonrpc": "2.0", "method": "notifications/subscriptions/acknowledged", "params": {"_meta": {SUBSCRIPTION_KEY: request_id}, "notifications": honoured}})
        return NO_RESPONSE  # the response would end the stream

    def _cancelled(self, params: dict, request_id, emit: Emit) -> None:
        # Unknown or finished requests are ignored, as the spec allows.
        cancelled = params.get("requestId")
        if is_valid_id(cancelled):
            self._subscriptions.pop(cancelled, None)

    def _legacy_initialize(self, params: dict, request_id, emit: Emit) -> None:
        # The spec asks a modern-only server to name its versions here: legacy clients cannot fall forward.
        raise RpcError(METHOD_NOT_FOUND, "initialize is not supported; send per-request _meta instead", {"supported": SUPPORTED_VERSIONS})


def _encode_cursor(name: str) -> str:
    return base64.urlsafe_b64encode(name.encode()).decode()


def _decode_cursor(cursor: object) -> str:
    """Accept only cursors this server could have issued; b64decode alone skips stray characters."""
    try:
        name = base64.urlsafe_b64decode(cursor.encode()).decode() if isinstance(cursor, str) else None
    except (ValueError, binascii.Error):
        name = None
    if name is None or _encode_cursor(name) != cursor:
        raise RpcError(INVALID_PARAMS, "invalid cursor")
    return name


def serve_stdio(server: McpServer, stdin: io.TextIOBase, stdout: io.TextIOBase) -> None:
    """One JSON-RPC message per line in each direction; returns when stdin closes."""
    for line in stdin:
        if line.strip():
            for out in server.handle(line):
                stdout.write(out + "\n")
            stdout.flush()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="agentlab purchasing MCP server (learning subset, stdio)")
    parser.add_argument("--db", required=True, help="SQLite file built by agentlab.tools.queries.build_sqlite")
    args = parser.parse_args(argv)
    missing = [name for name in ("AGENTLAB_USER_ID", "AGENTLAB_TENANT_ID") if not os.environ.get(name)]
    if missing:
        # Fail closed: a server that guessed a tenant would serve someone else's data.
        print(f"refusing to start: {', '.join(missing)} not set by the launcher", file=sys.stderr)
        return 2
    from agentlab.tools.queries import SqliteReadOnly, purchasing_tools

    principal = Principal(user_id=os.environ["AGENTLAB_USER_ID"], tenant_id=os.environ["AGENTLAB_TENANT_ID"])
    db = SqliteReadOnly(args.db)
    try:
        stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
        stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", newline="\n")
        serve_stdio(McpServer(principal, purchasing_tools(db)), stdin, stdout)
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
