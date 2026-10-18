"""Lessons 20.3 and 20.5: the durable wait, and what may end it.

A wait for a person is a row, not a process. ``open`` writes the request as
``pending`` into the same SQLite file as track 14's checkpoints and outbox, and
nothing runs until a callback, a sweeper or a cancellation calls one of the
methods below. Each method takes ``now`` from its caller, so a test can move
three days ahead without waiting.

Every status change happens inside ``BEGIN IMMEDIATE`` and as a
compare-and-swap (``WHERE status = ?``), so two workers on the same file cannot
both win. ``execute`` checks the approval at the moment of use and queues the
effect in track 14's outbox in the same transaction: it is the only path from
an approval to an effect, and it can succeed once.

    pending  -> approved | denied | expired | revoked
    approved -> consumed | expired | revoked
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from agentlab.approval.binding import check_approver, content_sha256, covers
from agentlab.domain import ApprovalRequest, InvoiceDraft, Principal
from agentlab.state import checkpoints

SCHEMA = """
CREATE TABLE IF NOT EXISTS approval (
    approval_id TEXT PRIMARY KEY,
    run_id      TEXT NOT NULL,
    request     TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked', 'consumed')),
    decided_by  TEXT,
    updated_at  TEXT
);
"""


@dataclass(frozen=True)
class Outcome:
    ok: bool
    status: str
    reason: str


class ApprovalStore:
    def __init__(self, path: str | Path) -> None:
        self._db = sqlite3.connect(path, isolation_level=None)
        # The outbox table belongs to track 14; creating it here is a no-op if it exists.
        self._db.executescript(checkpoints.SCHEMA + SCHEMA)

    def close(self) -> None:
        self._db.close()

    @contextmanager
    def _transaction(self) -> Iterator[None]:
        self._db.execute("BEGIN IMMEDIATE")  # take the write lock before reading
        try:
            yield
        except BaseException:
            self._db.execute("ROLLBACK")
            raise
        self._db.execute("COMMIT")

    def _read(self, approval_id: str) -> tuple[ApprovalRequest, str, str] | None:
        row = self._db.execute("SELECT request, status, run_id FROM approval WHERE approval_id = ?", (approval_id,)).fetchone()
        return None if row is None else (ApprovalRequest.model_validate_json(row[0]), row[1], row[2])

    def _move(self, approval_id: str, frm: str, to: str, now: datetime, decided_by: str | None = None) -> None:
        cursor = self._db.execute(
            "UPDATE approval SET status = ?, decided_by = COALESCE(?, decided_by), updated_at = ? WHERE approval_id = ? AND status = ?",
            (to, decided_by, now.isoformat(), approval_id, frm),
        )
        if cursor.rowcount != 1:
            raise checkpoints.StaleWrite(f"{approval_id} is no longer {frm}")

    def open(self, request: ApprovalRequest, run_id: str) -> None:
        """Start waiting. The run's worker can now stop; nothing sleeps."""
        if content_sha256(request.invoice) != request.content_sha256:
            raise ValueError(f"{request.approval_id}: hash does not match its draft")
        try:
            self._db.execute(
                "INSERT INTO approval (approval_id, run_id, request, status) VALUES (?, ?, ?, 'pending')",
                (request.approval_id, run_id, request.model_dump_json()),
            )
        except sqlite3.IntegrityError as error:
            raise ValueError(f"{request.approval_id} already exists") from error

    def status(self, approval_id: str) -> str | None:
        found = self._read(approval_id)
        return None if found is None else found[1]

    def waiting(self) -> list[ApprovalRequest]:
        """What a restarted process resumes: every request still waiting for a person."""
        rows = self._db.execute("SELECT request FROM approval WHERE status = 'pending' ORDER BY approval_id").fetchall()
        return [ApprovalRequest.model_validate_json(row[0]) for row in rows]

    def decide(self, approval_id: str, approver: Principal, *, approve: bool, now: datetime) -> Outcome:
        """Record one person's decision, once, before the deadline."""
        with self._transaction():
            found = self._read(approval_id)
            if found is None:
                return Outcome(False, "unknown", f"no approval {approval_id}")
            request, status, _run = found
            if status != "pending":
                return Outcome(False, status, f"already {status}")
            if now >= request.expires_at:
                self._move(approval_id, "pending", "expired", now)
                return Outcome(False, "expired", "the decision arrived after the deadline")
            who = check_approver(request, approver)
            if not who.allowed:
                return Outcome(False, status, who.reason)
            to = "approved" if approve else "denied"
            self._move(approval_id, "pending", to, now, decided_by=approver.user_id)
            return Outcome(True, to, who.reason)

    def revoke(self, approval_id: str, now: datetime) -> Outcome:
        """Cancel a request or withdraw an approval, unless it was already used."""
        with self._transaction():
            found = self._read(approval_id)
            if found is None:
                return Outcome(False, "unknown", f"no approval {approval_id}")
            status = found[1]
            if status not in ("pending", "approved"):
                return Outcome(False, status, f"already {status}")
            self._move(approval_id, status, "revoked", now)
            return Outcome(True, "revoked", f"revoked while {status}")

    def expire_due(self, now: datetime) -> list[str]:
        """The sweeper: end every wait whose deadline has passed."""
        expired = []
        with self._transaction():
            for request, status in self._open_rows():
                if now >= request.expires_at:
                    self._move(request.approval_id, status, "expired", now)
                    expired.append(request.approval_id)
        return expired

    def _open_rows(self) -> list[tuple[ApprovalRequest, str]]:
        rows = self._db.execute("SELECT request, status FROM approval WHERE status IN ('pending', 'approved') ORDER BY approval_id").fetchall()
        return [(ApprovalRequest.model_validate_json(body), status) for body, status in rows]

    def execute(self, approval_id: str, draft: InvoiceDraft, now: datetime) -> Outcome:
        """Time of use: re-check status, draft and deadline, then consume and queue the effect atomically."""
        with self._transaction():
            found = self._read(approval_id)
            if found is None:
                return Outcome(False, "unknown", f"no approval {approval_id}")
            request, status, run_id = found
            if status != "approved":
                return Outcome(False, status, f"cannot execute: {status}")
            check = covers(request, draft, now)
            if not check.allowed:
                if now >= request.expires_at:
                    self._move(approval_id, "approved", "expired", now)
                    return Outcome(False, "expired", check.reason)
                return Outcome(False, status, check.reason)
            self._move(approval_id, "approved", "consumed", now)
            self._db.execute(
                "INSERT INTO outbox (idempotency_key, run_id, payload, status) VALUES (?, ?, ?, 'pending')",
                (request.operation_id, run_id, draft.model_dump_json()),
            )
            return Outcome(True, "consumed", "effect queued in the outbox")
