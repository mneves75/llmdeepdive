"""Lesson 20.4: a Slack button click as an approval callback.

Three layers, in order, each with its own job:

1. ``handle_callback`` authenticates the request as Slack's (the v0 HMAC
   signature over the raw body, and a timestamp within five minutes), parses
   it, writes it to a durable inbox keyed by the body's hash and returns at
   once, because Slack expects the HTTP 200 within three seconds.
2. ``process_callbacks`` later maps the Slack workspace and user to a
   company ``Principal`` through the runtime's own directory. A name or role
   inside the payload is never read.
3. ``ApprovalStore.decide`` checks that this principal may approve this exact
   request and records the decision once, judged at the time the click arrived.

A crash between ``decide`` and ``finish`` reprocesses the row; ``decide`` then
answers "already approved" and nothing changes twice.
"""

from __future__ import annotations

import hashlib
import hmac
import sqlite3
from collections.abc import Mapping
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qs

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from agentlab.approval.store import ApprovalStore, Outcome
from agentlab.domain import Principal

TOLERANCE = timedelta(minutes=5)


class _Slack(BaseModel):
    # Slack sends many fields we do not use; the ones we read must have the right types.
    model_config = ConfigDict(strict=True, extra="ignore", frozen=True)


class _Id(_Slack):
    id: str = Field(min_length=1, max_length=64)


class _Action(_Slack):
    action_id: Literal["approve", "deny"]
    value: str = Field(min_length=1, max_length=64)  # the approval id our app put on the button


class BlockActions(_Slack):
    type: Literal["block_actions"]
    team: _Id
    user: _Id
    actions: list[_Action] = Field(min_length=1, max_length=1)


def sign(secret: str, timestamp: str, body: bytes) -> str:
    """Slack's v0 signature: HMAC-SHA256 of ``v0:{timestamp}:{body}``, hex, prefixed ``v0=``."""
    base = b"v0:" + timestamp.encode("ascii") + b":" + body
    return "v0=" + hmac.new(secret.encode("utf-8"), base, hashlib.sha256).hexdigest()


def verify(secret: str, headers: Mapping[str, str], body: bytes, now: datetime) -> bool:
    """True only for a body Slack signed within five minutes of ``now``."""
    lower = {name.lower(): value for name, value in headers.items()}
    timestamp = lower.get("x-slack-request-timestamp", "")
    signature = lower.get("x-slack-signature", "")
    if not (timestamp.isascii() and timestamp.isdigit()):
        return False
    if abs(now.timestamp() - int(timestamp)) > TOLERANCE.total_seconds():
        return False  # possibly a replay of a request someone captured earlier
    # Constant-time comparison, so response timing does not reveal how many characters matched.
    return hmac.compare_digest(sign(secret, timestamp, body).encode(), signature.encode("utf-8", "replace"))


class SlackInbox:
    """Verified clicks, written before the 200 goes back, processed afterwards."""

    def __init__(self, path: str | Path) -> None:
        self._db = sqlite3.connect(path, isolation_level=None)
        self._db.execute(
            """CREATE TABLE IF NOT EXISTS slack_inbox (
                delivery_key TEXT PRIMARY KEY,
                body         TEXT NOT NULL,
                received_at  TEXT NOT NULL,
                outcome      TEXT
            )"""
        )

    def close(self) -> None:
        self._db.close()

    def add(self, body: bytes, received_at: datetime) -> bool:
        """False when the same body was already queued: a duplicate delivery."""
        key = hashlib.sha256(body).hexdigest()
        cursor = self._db.execute(
            "INSERT INTO slack_inbox (delivery_key, body, received_at) VALUES (?, ?, ?) ON CONFLICT (delivery_key) DO NOTHING",
            (key, body.decode("utf-8"), received_at.isoformat()),
        )
        return cursor.rowcount == 1

    def unprocessed(self) -> list[tuple[str, BlockActions, datetime]]:
        rows = self._db.execute("SELECT delivery_key, body, received_at FROM slack_inbox WHERE outcome IS NULL ORDER BY rowid").fetchall()
        return [(key, parse(body.encode("utf-8")), datetime.fromisoformat(at)) for key, body, at in rows]

    def finish(self, key: str, outcome: str) -> None:
        self._db.execute("UPDATE slack_inbox SET outcome = ? WHERE delivery_key = ?", (outcome, key))


def parse(body: bytes) -> BlockActions:
    """The form field ``payload`` holds the JSON; raises ``ValueError`` if anything is off."""
    fields = parse_qs(body.decode("utf-8"), strict_parsing=True)
    if list(fields) != ["payload"] or len(fields["payload"]) != 1:
        raise ValueError("expected exactly one payload field")
    return BlockActions.model_validate_json(fields["payload"][0])


def handle_callback(inbox: SlackInbox, secret: str, headers: Mapping[str, str], body: bytes, now: datetime) -> int:
    """The HTTP handler's whole job: authenticate, validate, queue, answer. No decision here."""
    if not verify(secret, headers, body, now):
        return 401
    try:
        parse(body)
    except (UnicodeDecodeError, ValueError, ValidationError):
        return 400
    inbox.add(body, now)  # a duplicate is acknowledged too; it is just not queued twice
    return 200


def process_callbacks(inbox: SlackInbox, store: ApprovalStore, directory: Mapping[tuple[str, str], Principal]) -> list[Outcome]:
    """The worker: turn each queued click into at most one decision."""
    outcomes = []
    for key, click, received_at in inbox.unprocessed():
        action = click.actions[0]
        approver = directory.get((click.team.id, click.user.id))
        if approver is None:
            outcome = Outcome(False, store.status(action.value) or "unknown", f"{click.user.id} in {click.team.id} is not in the directory")
        else:
            outcome = store.decide(action.value, approver, approve=action.action_id == "approve", now=received_at)
        inbox.finish(key, outcome.reason)
        outcomes.append(outcome)
    return outcomes
