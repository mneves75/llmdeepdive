"""Lesson 15.2: JSON-RPC 2.0 framing, as MCP revision 2026-07-28 uses it.

``Dispatcher`` is the receiving side: one line in, zero or more lines out.
``PendingCalls`` is the sending side's bookkeeping: which request ids are
still waiting, so each response is matched to its request and a response
nobody asked for is caught.

MCP narrows JSON-RPC in three ways this code enforces: an id is a string or
an integer, never null; ``params`` is an object; and a message is one object
per line, so a JSON-RPC batch (an array) is refused.
"""

from __future__ import annotations

import itertools
import json
import logging
from collections.abc import Callable

PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

log = logging.getLogger(__name__)

# A handler returns this when its response comes later (a subscription stream).
NO_RESPONSE = object()

Emit = Callable[[dict], None]
Handler = Callable[[dict, "str | int | None", Emit], object]


class RpcError(Exception):
    """An error the peer should see, with a JSON-RPC code."""

    def __init__(self, code: int, message: str, data: object = None) -> None:
        super().__init__(message)
        self.code, self.message, self.data = code, message, data


class ProtocolViolation(Exception):
    """The peer broke the protocol (an unknown response id, a malformed line)."""


def encode(message: dict) -> str:
    # ensure_ascii escapes every non-ASCII character, so no line separator can appear inside a message.
    return json.dumps(message, ensure_ascii=True, separators=(",", ":"))


def error_response(request_id: str | int | None, code: int, message: str, data: object = None) -> dict:
    error: dict = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": error}


def is_valid_id(value: object) -> bool:
    return isinstance(value, str) or (isinstance(value, int) and not isinstance(value, bool))


class Dispatcher:
    def __init__(self) -> None:
        self._methods: dict[str, Handler] = {}

    def method(self, name: str, handler: Handler) -> None:
        self._methods[name] = handler

    def handle(self, line: str) -> list[str]:
        """Process one incoming line; return the lines to write back, in order."""
        out: list[str] = []
        reply = self._reply(line, lambda message: out.append(encode(message)))
        if reply is not None:
            out.append(encode(reply))
        return out

    def _reply(self, line: str, emit: Emit) -> dict | None:
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            return error_response(None, PARSE_ERROR, "Parse error")
        if not isinstance(message, dict):
            return error_response(None, INVALID_REQUEST, "Invalid Request: one JSON object per line; batches are not supported")
        notification = "id" not in message
        request_id = message.get("id")
        if not notification and not is_valid_id(request_id):
            return error_response(None, INVALID_REQUEST, "Invalid Request: id must be a string or an integer")
        if message.get("jsonrpc") != "2.0" or not isinstance(message.get("method"), str):
            # The sender must never get a reply to a notification, even an error.
            return None if notification else error_response(request_id, INVALID_REQUEST, "Invalid Request")
        params = message.get("params", {})
        handler = self._methods.get(message["method"])
        try:
            if not isinstance(params, dict):
                raise RpcError(INVALID_PARAMS, "params must be an object")
            if handler is None:
                raise RpcError(METHOD_NOT_FOUND, f"Method not found: {message['method'][:64]}")
            result = handler(params, request_id, emit)
        except RpcError as error:
            return None if notification else error_response(request_id, error.code, error.message, error.data)
        except Exception:
            # Details go to the server's log (stderr), never to the peer.
            log.exception("handler for %s failed", message["method"][:64])
            return None if notification else error_response(request_id, INTERNAL_ERROR, "Internal error")
        if notification or result is NO_RESPONSE:
            return None
        return {"jsonrpc": "2.0", "id": request_id, "result": result}


class PendingCalls:
    """Request ids still waiting for a response, on the sending side."""

    def __init__(self) -> None:
        self._ids = itertools.count(1)
        self._waiting: set[int] = set()
        self._cancelled: set[int] = set()

    def new_id(self) -> int:
        request_id = next(self._ids)  # never reused, so no two outstanding requests share an id
        self._waiting.add(request_id)
        return request_id

    def cancel(self, request_id: int) -> None:
        """Stop waiting; a response that arrives later is ignored, as the spec asks."""
        self._waiting.discard(request_id)
        self._cancelled.add(request_id)

    def settle(self, response: dict) -> int | None:
        """Return the id this response answers, None for a cancelled request, or raise."""
        request_id = response.get("id")
        if not is_valid_id(request_id):  # also stops True from matching id 1
            raise ProtocolViolation(f"response without a usable id: {str(request_id)[:64]}")
        if request_id in self._waiting:
            self._waiting.remove(request_id)
            return request_id
        if request_id in self._cancelled:
            self._cancelled.remove(request_id)
            return None
        raise ProtocolViolation(f"response for id {request_id!r}, which is not waiting for one")
