"""Lesson 20.4: a Slack approval callback is verified, queued, deduplicated and authorized.

Slack signs the raw form-encoded body, so these tests sign exactly those bytes.
No test talks to Slack.
"""

import json
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlencode

from agentlab.approval.binding import build_request
from agentlab.approval.slack import SlackInbox, handle_callback, process_callbacks, sign
from agentlab.approval.store import ApprovalStore
from agentlab.domain import InvoiceDraft, Principal

# Test-only value. A real signing secret lives in a secret store, never in code.
TEST_SIGNING_SECRET = "test-only-signing-secret-not-real"

T0 = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)
BUYER = Principal(user_id="u-buyer", tenant_id="tenant-a", roles=frozenset({"buyer"}))
APPROVER = Principal(user_id="u-approver", tenant_id="tenant-a", roles=frozenset({"invoice_approver"}))
COLLEAGUE = Principal(user_id="u-colleague", tenant_id="tenant-a", roles=frozenset({"buyer"}))
# The runtime's own mapping from a Slack (workspace, user) to a company principal.
DIRECTORY = {("T0TEST", "U0APPROVER1"): APPROVER, ("T0TEST", "U0COLLEAGUE"): COLLEAGUE, ("T0TEST", "U0BUYER"): BUYER}
DRAFT = InvoiceDraft(invoice_id="INV-0042", version=1, tenant_id="tenant-a", payee="Supplier Gamma", amount=Decimal("10000.00"), currency="USD")


def body(user: str = "U0APPROVER1", action: str = "approve", approval_id: str = "ap-1", team: str = "T0TEST", action_ts: str = "1792400400.000100") -> bytes:
    payload = {
        "type": "block_actions",
        "team": {"id": team},
        "user": {"id": user, "team_id": team},
        "actions": [{"action_id": action, "value": approval_id, "type": "button", "action_ts": action_ts}],
    }
    return urlencode({"payload": json.dumps(payload)}).encode()


def headers(raw: bytes, at: datetime, secret: str = TEST_SIGNING_SECRET) -> dict[str, str]:
    timestamp = str(int(at.timestamp()))
    return {"X-Slack-Request-Timestamp": timestamp, "X-Slack-Signature": sign(secret, timestamp, raw)}


class SlackCallbacks(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        path = Path(self.dir.name) / "runs.sqlite"
        self.store = ApprovalStore(path)
        self.inbox = SlackInbox(path)
        self.store.open(build_request(DRAFT, approval_id="ap-1", operation_id="run-1:submit_invoice", requester=BUYER, now=T0, ttl=timedelta(days=3)), run_id="run-1")

    def tearDown(self):
        self.inbox.close()
        self.store.close()
        self.dir.cleanup()

    def deliver(self, raw: bytes, sent: datetime, received: datetime | None = None, secret: str = TEST_SIGNING_SECRET) -> int:
        return handle_callback(self.inbox, TEST_SIGNING_SECRET, headers(raw, sent, secret), raw, now=received or sent)

    def test_a_signed_click_by_an_approver_is_queued_then_approves(self):
        self.assertEqual(self.deliver(body(), T0), 200)
        self.assertEqual(self.store.status("ap-1"), "pending")  # acknowledged before any decision
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertTrue(outcome.ok)
        self.assertEqual(self.store.status("ap-1"), "approved")

    def test_a_forged_signature_is_rejected(self):
        self.assertEqual(self.deliver(body(), T0, secret="a-guess"), 401)
        self.assertEqual(process_callbacks(self.inbox, self.store, DIRECTORY), [])

    def test_a_body_changed_after_signing_is_rejected(self):
        raw = body()
        signed = headers(raw, T0)
        self.assertEqual(handle_callback(self.inbox, TEST_SIGNING_SECRET, signed, body(action="deny"), now=T0), 401)

    def test_a_replay_older_than_five_minutes_is_rejected(self):
        self.assertEqual(self.deliver(body(), T0, received=T0 + timedelta(minutes=5, seconds=1)), 401)

    def test_a_delivery_inside_five_minutes_is_accepted(self):
        self.assertEqual(self.deliver(body(), T0, received=T0 + timedelta(minutes=5)), 200)

    def test_missing_headers_are_rejected(self):
        self.assertEqual(handle_callback(self.inbox, TEST_SIGNING_SECRET, {}, body(), now=T0), 401)

    def test_header_names_are_case_insensitive(self):
        raw = body()
        lowered = {name.lower(): value for name, value in headers(raw, T0).items()}
        self.assertEqual(handle_callback(self.inbox, TEST_SIGNING_SECRET, lowered, raw, now=T0), 200)

    def test_a_duplicate_delivery_is_queued_once(self):
        raw = body()
        self.assertEqual(self.deliver(raw, T0), 200)
        self.assertEqual(self.deliver(raw, T0 + timedelta(seconds=2)), 200)
        self.assertEqual(len(process_callbacks(self.inbox, self.store, DIRECTORY)), 1)

    def test_a_second_click_cannot_change_the_decision(self):
        self.deliver(body(), T0)
        self.deliver(body(action="deny", action_ts="1792400460.000200"), T0 + timedelta(minutes=1))
        first, second = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertTrue(first.ok)
        self.assertFalse(second.ok)
        self.assertEqual(self.store.status("ap-1"), "approved")

    def test_a_click_after_expiry_is_refused(self):
        late = T0 + timedelta(days=3, minutes=1)
        self.assertEqual(self.deliver(body(), late), 200)
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertFalse(outcome.ok)
        self.assertEqual(self.store.status("ap-1"), "expired")

    def test_a_click_is_judged_by_when_it_arrived_not_when_it_was_processed(self):
        self.deliver(body(), T0 + timedelta(days=3) - timedelta(minutes=1))
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)  # processed after the deadline
        self.assertTrue(outcome.ok)

    def test_an_unknown_slack_user_cannot_approve(self):
        self.deliver(body(user="U0STRANGER"), T0)
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertFalse(outcome.ok)
        self.assertEqual(self.store.status("ap-1"), "pending")

    def test_a_known_user_without_the_role_cannot_approve(self):
        self.deliver(body(user="U0COLLEAGUE"), T0)
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertFalse(outcome.ok)

    def test_the_requester_cannot_approve_from_slack(self):
        self.deliver(body(user="U0BUYER"), T0)
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertFalse(outcome.ok)

    def test_the_same_user_id_in_another_workspace_is_a_stranger(self):
        self.deliver(body(team="T0OTHER"), T0)
        [outcome] = process_callbacks(self.inbox, self.store, DIRECTORY)
        self.assertFalse(outcome.ok)

    def test_a_signed_but_malformed_payload_is_a_bad_request(self):
        raw = urlencode({"payload": "{not json"}).encode()
        self.assertEqual(self.deliver(raw, T0), 400)

    def test_an_unknown_action_is_a_bad_request(self):
        self.assertEqual(self.deliver(body(action="approve_all"), T0), 400)


if __name__ == "__main__":
    unittest.main()


class AbsurdTimestamp(unittest.TestCase):
    def test_an_absurd_timestamp_is_rejected_not_an_error(self):
        # Python refuses to parse an int of more than 4,300 digits; the handler must answer 401, not crash.
        from agentlab.approval.slack import verify

        headers = {"X-Slack-Request-Timestamp": "9" * 5000, "X-Slack-Signature": "v0=00"}
        self.assertFalse(verify("test-only-secret", headers, b"", datetime(2026, 10, 18, tzinfo=UTC)))
        # Control: a well-formed but stale timestamp is also refused, by the window.
        self.assertFalse(verify("test-only-secret", {**headers, "X-Slack-Request-Timestamp": "1"}, b"", datetime(2026, 10, 18, tzinfo=UTC)))
