"""Lesson 24.4: a spending ledger that concurrent workers cannot overspend.

Each worker reserves a call's worst-case cost before making the call, and
settles the real cost (or releases the reservation) afterwards. A worker that
checks a total it read earlier and then writes a new total can be wrong by
the time it writes: two workers both see USD 1.00 free and both spend USD 0.60.
Here the write is a compare-and-swap on a ``version`` column, as in lesson
14.3: it succeeds only if nobody changed the budget since the worker read
it, and otherwise raises ``StaleWrite`` so the worker reads again.

Money is stored as whole micro-dollars (USD 1 = 1,000,000) because SQLite
has no decimal type and floats cannot hold USD 0.10 exactly.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from agentlab.state.checkpoints import StaleWrite

SCHEMA = """
CREATE TABLE IF NOT EXISTS budget (
    budget_id        TEXT PRIMARY KEY,
    limit_micros     INTEGER NOT NULL CHECK (limit_micros >= 0),
    committed_micros INTEGER NOT NULL DEFAULT 0,
    version          INTEGER NOT NULL DEFAULT 0,
    halted           INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reservation (
    reservation_id TEXT PRIMARY KEY,
    budget_id      TEXT NOT NULL REFERENCES budget (budget_id),
    held_micros    INTEGER NOT NULL CHECK (held_micros > 0),
    status         TEXT NOT NULL CHECK (status IN ('held', 'settled', 'released')),
    actual_micros  INTEGER
);
"""


def usd(amount: str) -> int:
    """``usd("0.60")`` -> 600000 micro-dollars. Refuses anything finer than a micro-dollar."""
    micros = Decimal(amount) * 1_000_000
    if micros != micros.to_integral_value():
        raise ValueError(f"{amount} is not a whole number of micro-dollars")
    return int(micros)


@dataclass(frozen=True)
class Snapshot:
    budget_id: str
    limit: int
    committed: int  # held by running calls plus spent by finished ones
    version: int
    halted: bool

    @property
    def remaining(self) -> int:
        return self.limit - self.committed


class Ledger:
    def __init__(self, path: str | Path) -> None:
        self._db = sqlite3.connect(path, isolation_level=None, timeout=5.0)
        self._db.executescript(SCHEMA)

    def close(self) -> None:
        self._db.close()

    @contextmanager
    def _transaction(self) -> Iterator[None]:
        self._db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self._db.execute("COMMIT")
        except BaseException:
            self._db.execute("ROLLBACK")
            raise

    def open_budget(self, budget_id: str, limit: int) -> None:
        self._db.execute("INSERT INTO budget (budget_id, limit_micros) VALUES (?, ?)", (budget_id, limit))

    def read(self, budget_id: str) -> Snapshot:
        row = self._db.execute(
            "SELECT limit_micros, committed_micros, version, halted FROM budget WHERE budget_id = ?", (budget_id,)
        ).fetchone()
        if row is None:
            raise KeyError(budget_id)
        return Snapshot(budget_id, row[0], row[1], row[2], bool(row[3]))

    def try_reserve(self, seen: Snapshot, reservation_id: str, amount: int) -> bool:
        """Hold ``amount`` if ``seen`` is still current. False: halted or over the limit. ``StaleWrite``: read again."""
        if amount <= 0:
            raise ValueError("a reservation must be positive")
        if seen.halted or seen.committed + amount > seen.limit:
            return False
        with self._transaction():
            cursor = self._db.execute(
                "UPDATE budget SET committed_micros = ?, version = version + 1 WHERE budget_id = ? AND version = ?",
                (seen.committed + amount, seen.budget_id, seen.version),
            )
            if cursor.rowcount != 1:
                raise StaleWrite(f"budget {seen.budget_id} changed since version {seen.version}")
            self._db.execute(
                "INSERT INTO reservation (reservation_id, budget_id, held_micros, status) VALUES (?, ?, ?, 'held')",
                (reservation_id, seen.budget_id, amount),
            )
        return True

    def reserve(self, budget_id: str, reservation_id: str, amount: int) -> bool:
        """Read and try until the reservation is held or refused. Each retry means another worker made progress."""
        while True:
            try:
                return self.try_reserve(self.read(budget_id), reservation_id, amount)
            except StaleWrite:
                continue

    def settle(self, reservation_id: str, actual: int) -> None:
        """Replace the held amount with what the call really cost. A cost above the hold halts the budget."""
        self._close_reservation(reservation_id, "settled", actual)

    def release(self, reservation_id: str) -> None:
        """The call cost nothing (it never ran); give the whole hold back."""
        self._close_reservation(reservation_id, "released", 0)

    def halt(self, budget_id: str) -> None:
        """The kill switch. It bumps the version, so a worker holding an older snapshot must read again and see it."""
        self._db.execute("UPDATE budget SET halted = 1, version = version + 1 WHERE budget_id = ?", (budget_id,))

    def _close_reservation(self, reservation_id: str, status: str, actual: int) -> None:
        with self._transaction():
            row = self._db.execute(
                "SELECT budget_id, held_micros FROM reservation WHERE reservation_id = ? AND status = 'held'", (reservation_id,)
            ).fetchone()
            if row is None:
                raise ValueError(f"{reservation_id} is not a held reservation")
            budget_id, held = row
            self._db.execute(
                "UPDATE reservation SET status = ?, actual_micros = ? WHERE reservation_id = ?", (status, actual, reservation_id)
            )
            # A mis-estimate is recorded as spent (the money is gone) and stops further spending until a person looks.
            self._db.execute(
                "UPDATE budget SET committed_micros = committed_micros - ? + ?, version = version + 1,"
                " halted = MAX(halted, ?) WHERE budget_id = ?",
                (held, actual, int(actual > held), budget_id),
            )
