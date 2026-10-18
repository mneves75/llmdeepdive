"""Lesson 20.3: a three-day approval wait in Temporal 1.34.0, with a worker restart.

Needs the ``frameworks`` dependency group. Temporal's time-skipping test server
moves the clock forward, so three simulated days take seconds; the SDK
downloads that server on first use.
"""

import asyncio
import unittest
from datetime import timedelta
from decimal import Decimal

from temporalio.api.enums.v1 import EventType
from temporalio.client import WorkflowUpdateFailedError
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from agentlab.approval.binding import build_request
from agentlab.approval.temporal import ApprovalWorkflow, SubmitActivities
from agentlab.domain import InvoiceDraft, Principal

BUYER = Principal(user_id="u-buyer", tenant_id="tenant-a", roles=frozenset({"buyer"}))
APPROVER = Principal(user_id="u-approver", tenant_id="tenant-a", roles=frozenset({"invoice_approver"}))
DRAFT = InvoiceDraft(invoice_id="INV-0042", version=1, tenant_id="tenant-a", payee="Supplier Gamma", amount=Decimal("10000.00"), currency="USD")


class TemporalApprovalWait(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # The SDK gives its local test server a fixed 5 s to start, which a loaded
        # machine can miss; retry only that startup error, never a test failure.
        for attempt in range(5):
            try:
                self.env = await WorkflowEnvironment.start_time_skipping()
                break
            except RuntimeError as error:
                if "did not start" not in str(error) or attempt == 4:
                    raise
        self.activities = SubmitActivities()
        now = await self.env.get_current_time()
        self.request = build_request(DRAFT, approval_id="ap-1", operation_id="run-1:submit_invoice", requester=BUYER, now=now, ttl=timedelta(days=3))

    async def asyncTearDown(self):
        await self.env.shutdown()

    def worker(self) -> Worker:
        # max_cached_workflows=0: the second worker rebuilds the workflow from its history.
        return Worker(
            self.env.client,
            task_queue="approvals",
            workflows=[ApprovalWorkflow],
            activities=[self.activities.submit_invoice],
            max_cached_workflows=0,
        )

    async def start(self):
        return await self.env.client.start_workflow(ApprovalWorkflow.run, self.request.model_dump_json(), id="run-1", task_queue="approvals")

    async def wait_for_event(self, handle, event_type: int) -> None:
        for _ in range(200):
            if any(event.event_type == event_type for event in (await handle.fetch_history()).events):
                return
            await asyncio.sleep(0.05)
        self.fail(f"{EventType.Name(event_type)} never appeared")

    async def kinds(self, handle) -> list[str]:
        return [EventType.Name(event.event_type) for event in (await handle.fetch_history()).events]

    async def test_an_approval_a_day_later_survives_a_worker_restart(self):
        async with self.worker():
            handle = await self.start()
            await self.wait_for_event(handle, EventType.EVENT_TYPE_TIMER_STARTED)
        await self.env.sleep(timedelta(days=1))  # a day passes with no worker running at all
        async with self.worker():
            with self.assertRaises(WorkflowUpdateFailedError):  # the requester approving their own invoice
                await handle.execute_update(ApprovalWorkflow.decide, args=[BUYER.model_dump_json(), "approve", self.request.content_sha256])
            with self.assertRaises(WorkflowUpdateFailedError):  # an approval of a different draft
                await handle.execute_update(ApprovalWorkflow.decide, args=[APPROVER.model_dump_json(), "approve", "0" * 64])
            await handle.execute_update(ApprovalWorkflow.decide, args=[APPROVER.model_dump_json(), "approve", self.request.content_sha256])
            result = await asyncio.wait_for(handle.result(), timeout=60)

        self.assertTrue(result.startswith("AP-0001 approved by u-approver after 1 day"), result)
        self.assertEqual(self.activities.service.create_calls, 1)
        kinds = await self.kinds(handle)
        self.assertEqual(kinds.count("EVENT_TYPE_WORKFLOW_EXECUTION_UPDATE_ACCEPTED"), 1)  # rejected Updates left no trace
        self.assertIn("EVENT_TYPE_TIMER_CANCELED", kinds)  # the decision ended the wait before its deadline

    async def test_no_decision_in_three_days_expires_without_an_effect(self):
        async with self.worker():
            handle = await self.start()
            result = await asyncio.wait_for(handle.result(), timeout=60)
        self.assertEqual(result, "expired")
        self.assertEqual(self.activities.service.create_calls, 0)
        self.assertIn("EVENT_TYPE_TIMER_FIRED", await self.kinds(handle))

    async def test_a_denial_ends_the_wait_without_an_effect(self):
        async with self.worker():
            handle = await self.start()
            await handle.execute_update(ApprovalWorkflow.decide, args=[APPROVER.model_dump_json(), "deny", self.request.content_sha256])
            result = await asyncio.wait_for(handle.result(), timeout=60)
        self.assertTrue(result.startswith("denied by u-approver"), result)
        self.assertEqual(self.activities.service.create_calls, 0)


if __name__ == "__main__":
    unittest.main()
