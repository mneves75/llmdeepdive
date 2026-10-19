"""Lesson 14.5: the track's mechanisms in LangGraph 1.2.12 and Temporal 1.34.0.

Needs the ``frameworks`` dependency group. The Temporal tests start Temporal's
time-skipping test server, which the SDK downloads on first use.
"""

import asyncio
import sqlite3
import tempfile
import unittest
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from langgraph.errors import GraphRecursionError
from temporalio.api.enums.v1 import EventType
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from agentlab.domain import InvoiceDraft
from agentlab.state.frameworks import InvoiceActivities, InvoiceWorkflow, build_graph
from agentlab.state.outbox import FakeInvoiceService

DRAFT = InvoiceDraft(invoice_id="INV-0001", version=1, tenant_id="tenant-a", payee="Supplier Alpha", amount=Decimal("500.00"), currency="USD")


class FlakyCheck:
    """A check node that crashes on its first call, the way a process dies mid-step."""

    def __init__(self) -> None:
        self.calls = 0

    def __call__(self, state: dict) -> dict:
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("worker died during check")
        return {"status": "ready" if state["supplier_answered"] else "needs_info"}


class LangGraphRestart(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "graph.sqlite"
        self.config = {"configurable": {"thread_id": "run-1"}, "recursion_limit": 8}

    def tearDown(self):
        self.dir.cleanup()

    def open_graph(self, check, received):
        conn = sqlite3.connect(self.path, check_same_thread=False)
        self.addCleanup(conn.close)
        return build_graph(conn, check=check, on_received=received)

    def test_a_restart_resumes_after_the_last_checkpoint(self):
        check, received = FlakyCheck(), []
        with self.assertRaises(RuntimeError):
            self.open_graph(check, received.append).invoke({"status": "received", "supplier_answered": True}, self.config, durability="sync")
        # A new graph object over the same file, as after a process restart.
        final = self.open_graph(check, received.append).invoke(None, self.config, durability="sync")
        self.assertEqual(final["status"], "completed")
        self.assertEqual(len(received), 1)  # finished before the crash: not run again
        self.assertEqual(check.calls, 2)  # interrupted mid-step: runs again

    def test_the_recursion_limit_is_the_step_budget(self):
        never_answered = {"status": "received", "supplier_answered": False}
        graph = self.open_graph(lambda state: {"status": "needs_info"}, lambda _: None)
        with self.assertRaises(GraphRecursionError):
            graph.invoke(never_answered, self.config)

    def test_an_answered_run_finishes_inside_the_budget(self):
        graph = self.open_graph(lambda state: {"status": "ready"}, lambda _: None)
        self.assertEqual(graph.invoke({"status": "received", "supplier_answered": True}, self.config)["status"], "completed")


class TemporalRestart(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # The SDK gives its local test server a fixed 5 s to start, which a loaded
        # machine can miss; retry only that startup error, never a test failure.
        for attempt in range(3):
            try:
                self.env = await WorkflowEnvironment.start_time_skipping()
                return
            except RuntimeError as error:
                if "did not start" not in str(error) or attempt == 2:
                    raise

    async def asyncTearDown(self):
        await self.env.shutdown()

    def worker(self, activities: InvoiceActivities) -> Worker:
        # max_cached_workflows=0 disables the sticky cache, so the second worker
        # rebuilds the workflow by replaying its history.
        return Worker(
            self.env.client,
            task_queue="invoices",
            workflows=[InvoiceWorkflow],
            activities=[activities.check_purchase, activities.create_invoice],
            max_cached_workflows=0,
        )

    async def wait_for_event(self, handle, event_type: int) -> None:
        for _ in range(200):
            history = await handle.fetch_history()
            if any(event.event_type == event_type for event in history.events):
                return
            await asyncio.sleep(0.05)
        self.fail(f"{EventType.Name(event_type)} never appeared")

    async def test_a_worker_restart_replays_history_without_repeating_finished_work(self):
        service = FakeInvoiceService(fail_next="after_write")  # the first attempt loses its reply
        activities = InvoiceActivities(service)
        async with self.worker(activities):
            handle = await self.env.client.start_workflow(
                InvoiceWorkflow.run, DRAFT.model_dump_json(), id="run-1", task_queue="invoices"
            )
            await self.wait_for_event(handle, EventType.EVENT_TYPE_TIMER_STARTED)
        # Worker 1 is gone while the run waits on a three-day timer.
        async with self.worker(activities):
            number = await handle.result()

        self.assertEqual(number, "AP-0001")
        self.assertEqual(activities.checks, 1)  # completed before the restart: replayed from history
        self.assertEqual(service.create_calls, 2)  # retried after the lost reply
        self.assertEqual(len(service.invoices), 1)  # one logical invoice thanks to the key

        events = (await handle.fetch_history()).events
        kinds = [EventType.Name(event.event_type) for event in events]
        self.assertIn("EVENT_TYPE_TIMER_FIRED", kinds)
        self.assertEqual(kinds.count("EVENT_TYPE_ACTIVITY_TASK_COMPLETED"), 2)
        self.assertNotIn("EVENT_TYPE_ACTIVITY_TASK_FAILED", kinds)  # a retried attempt leaves no event of its own
        self.assertEqual(kinds[-1], "EVENT_TYPE_WORKFLOW_EXECUTION_COMPLETED")
        timer_started = next(e for e in events if e.event_type == EventType.EVENT_TYPE_TIMER_STARTED)
        timer_fired = next(e for e in events if e.event_type == EventType.EVENT_TYPE_TIMER_FIRED)
        waited = timer_fired.event_time.ToDatetime() - timer_started.event_time.ToDatetime()
        self.assertGreaterEqual(waited, timedelta(days=3))


if __name__ == "__main__":
    unittest.main()
