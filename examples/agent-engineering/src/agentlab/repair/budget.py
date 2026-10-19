"""Lesson 21.4: the repair budget, kept in SQLite so a restart cannot reset it.

An attempt is charged before the model is called, in its own committed
transaction. A process that dies during the attempt therefore comes back with
the attempt already counted; what it loses is only that attempt's measured
tokens and time. Writes use lesson 14.3's compare-and-swap on a version column.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

from pydantic import Field

from agentlab.domain import Record
from agentlab.state.checkpoints import StaleWrite

SCHEMA = """
CREATE TABLE IF NOT EXISTS repair_budget (
    run_id  TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    body    TEXT NOT NULL
);
"""


class AttemptRecord(Record):
    number: int = Field(ge=1)
    hypothesis: str | None = None
    patch_sha256: str | None = None
    result: str  # a feedback kind, or "rejected: <reason>"
    signature: str | None = None  # set only when the patch ran


class Spent(Record):
    version: int = Field(default=0, ge=0)
    attempts: int = Field(default=0, ge=0)  # repair attempts, not counting the initial failing run
    tokens: int = Field(default=0, ge=0)
    seconds: float = Field(default=0.0, ge=0)
    history: tuple[AttemptRecord, ...] = ()


@dataclass(frozen=True)
class Budget:
    max_attempts: int = 3
    max_tokens: int = 20_000
    max_seconds: float = 600.0

    def exhausted(self, spent: Spent) -> str | None:
        """Why no further attempt may start, or None."""
        if spent.attempts >= self.max_attempts:
            return f"budget: {spent.attempts} of {self.max_attempts} repair attempts used"
        if spent.tokens >= self.max_tokens:
            return f"budget: tokens {spent.tokens} of {self.max_tokens}"
        if spent.seconds >= self.max_seconds:
            return f"budget: wall time {spent.seconds:.0f} of {self.max_seconds:.0f} seconds"
        return None


class BudgetStore:
    def __init__(self, path: str | Path) -> None:
        self._db = sqlite3.connect(path, isolation_level=None)
        self._db.executescript(SCHEMA)

    def close(self) -> None:
        self._db.close()

    def load(self, run_id: str) -> Spent:
        row = self._db.execute("SELECT body FROM repair_budget WHERE run_id = ?", (run_id,)).fetchone()
        return Spent() if row is None else Spent.model_validate_json(row[0])

    def charge(self, run_id: str, spent: Spent, *, attempts: int = 0, tokens: int = 0, seconds: float = 0.0, record: AttemptRecord | None = None) -> Spent:
        """Commit ``spent`` plus these amounts, or raise ``StaleWrite`` if another writer got there first."""
        new = Spent.model_validate({
            **spent.model_dump(),
            "version": spent.version + 1,
            "attempts": spent.attempts + attempts,
            "tokens": spent.tokens + tokens,
            "seconds": spent.seconds + float(seconds),
            "history": spent.history + ((record,) if record else ()),
        })
        if spent.version == 0:
            sql, args = "INSERT INTO repair_budget (run_id, version, body) VALUES (?, 1, ?) ON CONFLICT (run_id) DO NOTHING", (run_id, new.model_dump_json())
        else:
            sql, args = "UPDATE repair_budget SET version = ?, body = ? WHERE run_id = ? AND version = ?", (new.version, new.model_dump_json(), run_id, spent.version)
        if self._db.execute(sql, args).rowcount != 1:
            raise StaleWrite(f"the budget of {run_id} changed since version {spent.version}")
        return new


@dataclass(frozen=True)
class RetryOdds:
    p_success: float
    p_escalate: float
    expected_attempts: float
    expected_cost: float
    worst_cost: float


def retry_odds(success: float, attempts: int, cost_per_attempt: float) -> RetryOdds:
    """The arithmetic of lesson 21.4's calculator (``retryBudget`` in src/lib/lab-math.ts).

    Assumes every attempt succeeds independently with probability ``success``.
    Attempt k runs only if the k - 1 before it failed, so the expected number of
    attempts counts the successful one and never the initial failing run.
    """
    fail = 1 - success
    expected = sum(fail ** k for k in range(attempts))
    return RetryOdds(1 - fail**attempts, fail**attempts, expected, expected * cost_per_attempt, attempts * cost_per_attempt)
