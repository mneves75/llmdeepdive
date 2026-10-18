"""Lesson 15.2: a JSON-RPC 2.0 dispatcher and response correlation, as MCP uses them."""

import json
import unittest

from agentlab.tools.jsonrpc import (
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    PARSE_ERROR,
    Dispatcher,
    PendingCalls,
    ProtocolViolation,
    RpcError,
)


def add(params, request_id, emit):
    if not isinstance(params.get("a"), int) or not isinstance(params.get("b"), int):
        raise RpcError(INVALID_PARAMS, "a and b must be integers")
    return {"sum": params["a"] + params["b"]}


def crash(params, request_id, emit):
    raise KeyError("database password is hunter2")


def dispatcher() -> Dispatcher:
    d = Dispatcher()
    d.method("add", add)
    d.method("crash", crash)
    return d


def one(lines: list[str]) -> dict:
    """The dispatcher's single reply, parsed."""
    assert len(lines) == 1, lines
    return json.loads(lines[0])


class Requests(unittest.TestCase):
    def test_a_result_carries_the_request_id_string_or_integer(self):
        for request_id in (7, "req-7"):
            reply = one(dispatcher().handle(json.dumps({"jsonrpc": "2.0", "id": request_id, "method": "add", "params": {"a": 2, "b": 3}})))
            self.assertEqual(reply, {"jsonrpc": "2.0", "id": request_id, "result": {"sum": 5}})

    def test_invalid_json_is_a_parse_error_with_a_null_id(self):
        reply = one(dispatcher().handle('{"jsonrpc": "2.0", "id": 1, "method": "add"'))
        self.assertEqual((reply["id"], reply["error"]["code"]), (None, PARSE_ERROR))

    def test_a_batch_is_refused_as_one_invalid_request(self):
        batch = json.dumps([{"jsonrpc": "2.0", "id": 1, "method": "add", "params": {"a": 1, "b": 1}}])
        reply = one(dispatcher().handle(batch))
        self.assertEqual((reply["id"], reply["error"]["code"]), (None, INVALID_REQUEST))

    def test_null_and_boolean_ids_are_invalid(self):
        for request_id in (None, True):
            with self.subTest(request_id=request_id):
                reply = one(dispatcher().handle(json.dumps({"jsonrpc": "2.0", "id": request_id, "method": "add", "params": {"a": 1, "b": 1}})))
                self.assertEqual((reply["id"], reply["error"]["code"]), (None, INVALID_REQUEST))

    def test_missing_version_or_method_is_an_invalid_request(self):
        for message in ({"id": 1, "method": "add"}, {"jsonrpc": "2.0", "id": 1}, {"jsonrpc": "1.0", "id": 1, "method": "add"}):
            with self.subTest(message=message):
                reply = one(dispatcher().handle(json.dumps(message)))
                self.assertEqual((reply["id"], reply["error"]["code"]), (1, INVALID_REQUEST))

    def test_params_must_be_an_object(self):
        reply = one(dispatcher().handle(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "add", "params": [2, 3]})))
        self.assertEqual(reply["error"]["code"], INVALID_PARAMS)

    def test_an_unknown_method_names_the_error_and_keeps_the_id(self):
        reply = one(dispatcher().handle(json.dumps({"jsonrpc": "2.0", "id": 4, "method": "multiply"})))
        self.assertEqual((reply["id"], reply["error"]["code"]), (4, METHOD_NOT_FOUND))

    def test_a_handler_crash_is_an_internal_error_that_leaks_nothing(self):
        with self.assertLogs("agentlab.tools.jsonrpc", level="ERROR"):
            reply = one(dispatcher().handle(json.dumps({"jsonrpc": "2.0", "id": 9, "method": "crash"})))
        self.assertEqual((reply["id"], reply["error"]["code"]), (9, INTERNAL_ERROR))
        self.assertNotIn("hunter2", json.dumps(reply))


class Notifications(unittest.TestCase):
    def test_a_notification_gets_no_reply_even_when_it_fails(self):
        d = dispatcher()
        self.assertEqual(d.handle(json.dumps({"jsonrpc": "2.0", "method": "add", "params": {"a": 1, "b": 2}})), [])
        self.assertEqual(d.handle(json.dumps({"jsonrpc": "2.0", "method": "no_such_method"})), [])
        with self.assertLogs("agentlab.tools.jsonrpc", level="ERROR"):
            self.assertEqual(d.handle(json.dumps({"jsonrpc": "2.0", "method": "crash"})), [])


class Correlation(unittest.TestCase):
    def test_responses_are_matched_by_id_in_any_order(self):
        pending = PendingCalls()
        first, second = pending.new_id(), pending.new_id()
        self.assertNotEqual(first, second)
        self.assertEqual(pending.settle({"jsonrpc": "2.0", "id": second, "result": {}}), second)
        self.assertEqual(pending.settle({"jsonrpc": "2.0", "id": first, "result": {}}), first)

    def test_a_response_nobody_asked_for_is_a_protocol_violation(self):
        pending = PendingCalls()
        with self.assertRaises(ProtocolViolation):
            pending.settle({"jsonrpc": "2.0", "id": 99, "result": {}})

    def test_a_second_response_to_the_same_request_is_a_protocol_violation(self):
        pending = PendingCalls()
        request_id = pending.new_id()
        pending.settle({"jsonrpc": "2.0", "id": request_id, "result": {}})
        with self.assertRaises(ProtocolViolation):
            pending.settle({"jsonrpc": "2.0", "id": request_id, "result": {}})

    def test_a_late_response_to_a_cancelled_request_is_ignored(self):
        pending = PendingCalls()
        request_id = pending.new_id()
        pending.cancel(request_id)
        self.assertIsNone(pending.settle({"jsonrpc": "2.0", "id": request_id, "result": {}}))


if __name__ == "__main__":
    unittest.main()
