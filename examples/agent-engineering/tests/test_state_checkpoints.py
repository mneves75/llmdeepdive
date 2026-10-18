"""Lesson 14.3: a SQLite checkpoint store with compare-and-swap and a restart test."""

import sqlite3
import subprocess
import sys
import tempfile
import textwrap
import unittest
from decimal import Decimal
from pathlib import Path

from agentlab.domain import InvoiceDraft, Principal, RunState
from agentlab.state.checkpoints import CheckpointStore, StaleWrite
from agentlab.state.transitions import advance

DRAFT = InvoiceDraft(invoice_id="INV-0001", version=1, tenant_id="tenant-a", payee="Supplier Alpha", amount=Decimal("500.00"), currency="USD")


def new_run() -> RunState:
    return RunState(run_id="run-1", principal=Principal(user_id="u1", tenant_id="tenant-a"))


class Checkpoints(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "runs.sqlite"
        self.store = CheckpointStore(self.path)

    def tearDown(self):
        self.store.close()
        self.dir.cleanup()

    def test_a_saved_state_round_trips_with_a_new_version(self):
        saved = self.store.save(advance(new_run(), "checked"), expected_version=0)
        self.assertEqual(saved.version, 1)
        self.assertEqual(self.store.load("run-1"), saved)

    def test_a_restart_restores_the_last_committed_state(self):
        committed = self.store.save(advance(new_run(), "checked"), expected_version=0)
        advance(committed, "ready")  # computed in memory; the process dies before saving it
        self.store.close()
        restarted = CheckpointStore(self.path)
        self.addCleanup(restarted.close)
        self.assertEqual(restarted.load("run-1"), committed)

    def test_a_stale_write_is_rejected(self):
        first = self.store.save(advance(new_run(), "checked"), expected_version=0)
        other = CheckpointStore(self.path)  # a second worker on the same run
        self.addCleanup(other.close)
        seen_by_other = other.load("run-1")
        self.store.save(advance(first, "ready"), expected_version=first.version)
        with self.assertRaises(StaleWrite):
            other.save(advance(seen_by_other, "needs_info"), expected_version=seen_by_other.version)
        self.assertEqual(self.store.load("run-1").status, "ready")

    def test_a_second_first_write_is_rejected(self):
        self.store.save(new_run(), expected_version=0)
        with self.assertRaises(StaleWrite):
            self.store.save(new_run(), expected_version=0)

    def test_an_unknown_schema_version_is_refused_on_load(self):
        self.store.save(new_run(), expected_version=0)
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE run_state SET body = replace(body, '\"schema_version\":1', '\"schema_version\":2')")
        with self.assertRaises(ValueError):
            self.store.load("run-1")

    def test_a_crash_inside_the_transaction_leaves_neither_state_nor_effect(self):
        self.store.save(advance(new_run(), "checked"), expected_version=0)
        self.store.close()
        # A real process dies (os._exit) after the UPDATE and the first outbox
        # INSERT have run, but before COMMIT.
        script = textwrap.dedent(f"""
            import os
            from agentlab.state.checkpoints import CheckpointStore
            from agentlab.state.transitions import advance
            from agentlab.domain import InvoiceDraft
            store = CheckpointStore({str(self.path)!r})
            state = store.load("run-1")
            draft = InvoiceDraft.model_validate_json({DRAFT.model_dump_json()!r})
            def effects():
                yield ("run-1:create_invoice", draft)
                os._exit(1)
            store.save(advance(state, "ready"), expected_version=state.version, effects=effects())
        """)
        child = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 1, child.stderr)
        self.store = CheckpointStore(self.path)
        self.assertEqual((self.store.load("run-1").status, self.store.load("run-1").version), ("checked", 1))
        self.assertEqual(self.store.outbox("pending"), [])

    def test_state_and_effect_commit_together(self):
        state = self.store.save(advance(new_run(), "checked"), expected_version=0)
        self.store.save(advance(state, "ready"), expected_version=state.version, effects=[("run-1:create_invoice", DRAFT)])
        self.assertEqual(self.store.outbox("pending"), [("run-1:create_invoice", DRAFT)])


if __name__ == "__main__":
    unittest.main()
