"""Lesson 14.3: durable checkpoints with compare-and-swap, plus the outbox table.

One SQLite file holds two tables. ``run_state`` keeps the latest committed
``RunState`` per run as JSON, with a ``version`` column. ``outbox`` keeps the
external effects a step decided on. ``save`` writes both in one transaction,
so after a crash either the new state and its effects exist, or neither does.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterable
from pathlib import Path

from pydantic import ValidationError

from agentlab.domain import InvoiceDraft, RunState

SCHEMA = """
CREATE TABLE IF NOT EXISTS run_state (
    run_id  TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    body    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
    idempotency_key TEXT PRIMARY KEY,
    run_id          TEXT NOT NULL,
    payload         TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('pending', 'reconciling', 'done')),
    result          TEXT
);
"""

Effect = tuple[str, InvoiceDraft]


class StaleWrite(RuntimeError):
    """Someone committed a newer version since this writer read the run."""


class CheckpointStore:
    def __init__(self, path: str | Path) -> None:
        # Autocommit mode: every transaction below is opened and closed explicitly.
        self._db = sqlite3.connect(path, isolation_level=None)
        self._db.executescript(SCHEMA)

    def close(self) -> None:
        self._db.close()

    def load(self, run_id: str) -> RunState | None:
        """The last committed state, or None. An unknown schema raises instead of being guessed."""
        row = self._db.execute("SELECT body FROM run_state WHERE run_id = ?", (run_id,)).fetchone()
        if row is None:
            return None
        try:
            return RunState.model_validate_json(row[0])
        except ValidationError as error:
            raise ValueError(f"stored state for {run_id} does not match schema version 1") from error

    def save(self, state: RunState, expected_version: int, effects: Iterable[Effect] = ()) -> RunState:
        """Commit ``state`` as version ``expected_version + 1``, with its effects, or raise ``StaleWrite``.

        The ``WHERE version = ?`` clause is the compare-and-swap: the update
        matches a row only if nobody committed since this writer read it.
        """
        new = RunState.model_validate({**state.model_dump(), "version": expected_version + 1})
        self._db.execute("BEGIN IMMEDIATE")
        try:
            if expected_version == 0:
                cursor = self._db.execute(
                    "INSERT INTO run_state (run_id, version, body) VALUES (?, 1, ?) ON CONFLICT (run_id) DO NOTHING",
                    (new.run_id, new.model_dump_json()),
                )
            else:
                cursor = self._db.execute(
                    "UPDATE run_state SET version = ?, body = ? WHERE run_id = ? AND version = ?",
                    (new.version, new.model_dump_json(), new.run_id, expected_version),
                )
            if cursor.rowcount != 1:
                raise StaleWrite(f"{new.run_id} is no longer at version {expected_version}")
            for key, draft in effects:
                self._db.execute(
                    "INSERT INTO outbox (idempotency_key, run_id, payload, status) VALUES (?, ?, ?, 'pending')",
                    (key, new.run_id, draft.model_dump_json()),
                )
            self._db.execute("COMMIT")
        except BaseException:
            self._db.execute("ROLLBACK")
            raise
        return new

    def outbox(self, status: str) -> list[Effect]:
        rows = self._db.execute(
            "SELECT idempotency_key, payload FROM outbox WHERE status = ? ORDER BY idempotency_key", (status,)
        ).fetchall()
        return [(key, InvoiceDraft.model_validate_json(payload)) for key, payload in rows]

    def outbox_result(self, key: str) -> tuple[str, str | None] | None:
        row = self._db.execute("SELECT status, result FROM outbox WHERE idempotency_key = ?", (key,)).fetchone()
        return None if row is None else (row[0], row[1])

    def mark(self, key: str, status: str, result: str | None = None) -> None:
        self._db.execute("UPDATE outbox SET status = ?, result = ? WHERE idempotency_key = ?", (status, result, key))
