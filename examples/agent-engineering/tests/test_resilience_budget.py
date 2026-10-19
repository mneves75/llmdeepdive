"""Lesson 24.4: a spending ledger that concurrent workers cannot overspend."""

import sqlite3
import tempfile
import unittest
from pathlib import Path

from agentlab.resilience.budget import Ledger, usd
from agentlab.state.checkpoints import StaleWrite

LIMIT = usd("1.00")
CALL = usd("0.60")


def naive_read(path, budget_id):
    """The bug this lesson is about: read the total now, decide, write the new total later."""
    with sqlite3.connect(path) as db:
        return db.execute("SELECT committed_micros, limit_micros FROM budget WHERE budget_id = ?", (budget_id,)).fetchone()


def naive_write(path, budget_id, seen, amount):
    committed, limit = seen
    if committed + amount > limit:
        return False
    with sqlite3.connect(path) as db:
        db.execute("UPDATE budget SET committed_micros = ? WHERE budget_id = ?", (committed + amount, budget_id))
    return True


class Ledgers(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.path = Path(folder.name) / "budget.sqlite"
        # Two workers, two connections to one file, as two processes would have.
        self.a, self.b = Ledger(self.path), Ledger(self.path)
        self.addCleanup(self.a.close)
        self.addCleanup(self.b.close)
        self.a.open_budget("run-7", LIMIT)


class StaleReads(Ledgers):
    def test_check_then_write_lets_two_workers_overspend(self):
        seen_a, seen_b = naive_read(self.path, "run-7"), naive_read(self.path, "run-7")
        granted = [naive_write(self.path, "run-7", seen_a, CALL), naive_write(self.path, "run-7", seen_b, CALL)]
        self.assertEqual(granted, [True, True])  # USD 1.20 of calls approved against USD 1.00
        self.assertEqual(self.a.read("run-7").committed, CALL)  # and the ledger lost one of them

    def test_compare_and_swap_makes_the_second_worker_read_again(self):
        seen_a, seen_b = self.a.read("run-7"), self.b.read("run-7")
        self.assertTrue(self.a.try_reserve(seen_a, "call-a", CALL))
        with self.assertRaises(StaleWrite):
            self.b.try_reserve(seen_b, "call-b", CALL)
        self.assertFalse(self.b.reserve("run-7", "call-b", CALL))  # the fresh read shows USD 0.40 left
        self.assertEqual(self.a.read("run-7").committed, CALL)

    def test_two_calls_that_fit_both_get_through(self):
        # Control: the stale write is retried, not turned into a refusal.
        seen_a, seen_b = self.a.read("run-7"), self.b.read("run-7")
        self.assertTrue(self.a.try_reserve(seen_a, "call-a", usd("0.40")))
        with self.assertRaises(StaleWrite):
            self.b.try_reserve(seen_b, "call-b", usd("0.40"))
        self.assertTrue(self.b.reserve("run-7", "call-b", usd("0.40")))
        self.assertEqual(self.a.read("run-7").committed, usd("0.80"))


class KillSwitch(Ledgers):
    def test_a_halt_between_read_and_reserve_wins(self):
        seen = self.a.read("run-7")
        self.b.halt("run-7")
        with self.assertRaises(StaleWrite):
            self.a.try_reserve(seen, "call-a", usd("0.01"))
        self.assertFalse(self.a.reserve("run-7", "call-a", usd("0.01")))

    def test_a_call_already_running_can_still_settle_after_a_halt(self):
        self.a.reserve("run-7", "call-a", CALL)
        self.b.halt("run-7")
        self.a.settle("call-a", usd("0.25"))
        self.assertEqual(self.a.read("run-7").committed, usd("0.25"))


class Settlement(Ledgers):
    def test_settle_keeps_the_actual_cost_and_frees_the_rest(self):
        self.a.reserve("run-7", "call-a", CALL)
        self.a.settle("call-a", usd("0.25"))
        snapshot = self.a.read("run-7")
        self.assertEqual((snapshot.committed, snapshot.remaining), (usd("0.25"), usd("0.75")))

    def test_release_frees_everything_and_happens_once(self):
        self.a.reserve("run-7", "call-a", CALL)
        self.a.release("call-a")
        self.assertEqual(self.a.read("run-7").committed, 0)
        with self.assertRaises(ValueError):
            self.b.settle("call-a", usd("0.10"))

    def test_a_cost_above_the_reservation_is_recorded_and_halts_spending(self):
        self.a.reserve("run-7", "call-a", usd("0.10"))
        self.a.settle("call-a", usd("0.15"))
        snapshot = self.a.read("run-7")
        self.assertEqual((snapshot.committed, snapshot.halted), (usd("0.15"), True))

    def test_a_duplicate_reservation_id_changes_nothing(self):
        self.a.reserve("run-7", "call-a", usd("0.10"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.a.reserve("run-7", "call-a", usd("0.10"))
        self.assertEqual(self.a.read("run-7").committed, usd("0.10"))

    def test_amounts_must_be_positive_whole_micro_dollars(self):
        with self.assertRaises(ValueError):
            self.a.reserve("run-7", "call-a", 0)
        with self.assertRaises(ValueError):
            usd("0.0000001")


if __name__ == "__main__":
    unittest.main()
