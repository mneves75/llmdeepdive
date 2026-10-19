"""Lesson 22.3: shared-state races, deadlock refusal and a supervisor's fan-in under failure.

Everything is deterministic: interleavings are written out step by step and the
asyncio children coordinate through events, never through sleeps.
"""

import asyncio
import tempfile
import unittest
from pathlib import Path

from agentlab.domain import EvidenceRef, Principal, RunState
from agentlab.multiagent.topology import Child, Contention, DeadlockRefused, add_evidence, plan_peers, supervise
from agentlab.state.checkpoints import CheckpointStore, StaleWrite

BUYER = Principal(user_id="buyer-7", tenant_id="tenant-a")
REF_A = EvidenceRef(source="purchases/PO-1001", sha256="a" * 64)
REF_B = EvidenceRef(source="purchases/PO-1003", sha256="b" * 64)


def with_ref(state: RunState, ref: EvidenceRef) -> RunState:
    return RunState.model_validate({**state.model_dump(), "evidence": (*state.evidence, ref)})


class SharedState(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = CheckpointStore(Path(self.tmp.name) / "runs.sqlite")
        self.store.save(RunState(run_id="r1", principal=BUYER), expected_version=0)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_a_plain_shared_dict_loses_an_update(self):
        board = {"r1": RunState(run_id="r1", principal=BUYER)}
        seen_by_a, seen_by_b = board["r1"], board["r1"]  # both peers read before either writes
        board["r1"] = with_ref(seen_by_a, REF_A)
        board["r1"] = with_ref(seen_by_b, REF_B)
        self.assertEqual(board["r1"].evidence, (REF_B,))  # A's evidence is gone and nobody was told

    def test_the_same_interleaving_against_compare_and_swap_is_refused(self):
        seen_by_a, seen_by_b = self.store.load("r1"), self.store.load("r1")
        self.store.save(with_ref(seen_by_a, REF_A), expected_version=seen_by_a.version)
        with self.assertRaises(StaleWrite):
            self.store.save(with_ref(seen_by_b, REF_B), expected_version=seen_by_b.version)

    def test_add_evidence_rereads_after_a_conflict_and_keeps_both(self):
        def peer_a_commits_first():
            if REF_A not in self.store.load("r1").evidence:
                current = self.store.load("r1")
                self.store.save(with_ref(current, REF_A), expected_version=current.version)

        state = add_evidence(self.store, "r1", REF_B, between=peer_a_commits_first)
        self.assertEqual(state.evidence, (REF_A, REF_B))

    def test_retries_are_bounded_when_another_writer_always_wins(self):
        def always_first():
            current = self.store.load("r1")
            self.store.save(current, expected_version=current.version)

        with self.assertRaises(Contention):
            add_evidence(self.store, "r1", REF_B, attempts=3, between=always_first)
        self.assertNotIn(REF_B, self.store.load("r1").evidence)


class Deadlock(unittest.TestCase):
    def test_peers_waiting_on_each_other_are_refused_before_they_start(self):
        with self.assertRaises(DeadlockRefused) as caught:
            plan_peers({"researcher": {"reviewer"}, "coder": {"researcher"}, "reviewer": {"coder"}})
        self.assertEqual(set(caught.exception.cycle), {"researcher", "coder", "reviewer"})

    def test_an_acyclic_plan_returns_an_order_that_respects_every_wait(self):
        order = plan_peers({"researcher": set(), "coder": {"researcher"}, "reviewer": {"coder", "researcher"}})
        self.assertEqual(order, ["researcher", "coder", "reviewer"])

    def test_waiting_on_a_peer_nobody_started_is_an_error(self):
        with self.assertRaises(ValueError):
            plan_peers({"coder": {"researcher"}})


async def value(result):
    return result


async def fail(message):
    raise RuntimeError(message)


async def wait_forever(log, name):
    try:
        await asyncio.Event().wait()
    finally:
        log.append(f"{name} released its lock")  # runs because cancellation raises inside the await


class FanIn(unittest.TestCase):
    def test_all_children_succeed(self):
        result = asyncio.run(supervise([Child("po-1001", lambda: value("500.00")), Child("po-1003", lambda: value("780.00"))]))
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.results, {"po-1001": "500.00", "po-1003": "780.00"})

    def test_an_optional_child_failing_gives_a_partial_result(self):
        children = [Child("po-1001", lambda: value("500.00")), Child("supplier-rating", lambda: fail("portal timed out"), required=False)]
        result = asyncio.run(supervise(children))
        self.assertEqual(result.status, "partial")
        self.assertEqual(result.results, {"po-1001": "500.00"})
        self.assertIn("portal timed out", result.failed["supplier-rating"])
        self.assertEqual((result.cancelled, result.undone), ((), ()))

    def test_a_required_failure_cancels_running_siblings_and_undoes_finished_ones(self):
        log, undone = [], []
        children = [
            Child("reserve-number", lambda: value("INV-0001"), undo=lambda: undone.append("INV-0001")),
            Child("po-1003", lambda: fail("record missing")),
            Child("po-1004", lambda: wait_forever(log, "po-1004")),
        ]
        result = asyncio.run(supervise(children))
        self.assertEqual(result.status, "failed")
        self.assertEqual(result.cancelled, ("po-1004",))
        self.assertEqual(log, ["po-1004 released its lock"])
        self.assertEqual((result.undone, undone), (("reserve-number",), ["INV-0001"]))
        self.assertEqual(result.results, {"reserve-number": "INV-0001"})  # what happened is still recorded

    def test_cleanup_that_keeps_failing_is_bounded_and_left_for_a_person(self):
        attempts = []

        def broken_undo():
            attempts.append(1)
            raise ConnectionError("numbering service down")

        children = [Child("reserve-number", lambda: value("INV-0001"), undo=broken_undo), Child("po-1003", lambda: fail("record missing"))]
        result = asyncio.run(supervise(children, cleanup_attempts=2))
        self.assertEqual(result.status, "failed")
        self.assertEqual(len(attempts), 2)
        self.assertEqual((result.undone, result.cleanup_pending), ((), ("reserve-number",)))


if __name__ == "__main__":
    unittest.main()
