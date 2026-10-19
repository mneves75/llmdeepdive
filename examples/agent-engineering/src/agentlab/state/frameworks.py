"""Lesson 14.5: the track's run in LangGraph 1.2.12 and in Temporal 1.34.0.

Needs the ``frameworks`` dependency group; the core package never imports
this module. LangGraph saves a checkpoint after each step of the graph and
resumes from the last one. Temporal records an event history on its server
and rebuilds a workflow by replaying it, so finished activities are not run
again, while an activity interrupted mid-attempt is retried.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta
from typing import TypedDict

from temporalio import activity, workflow
from temporalio.common import RetryPolicy

# Temporal re-imports this module inside its workflow sandbox. These imports
# are passed through so the sandbox reuses the already loaded modules.
with workflow.unsafe.imports_passed_through():
    from langgraph.checkpoint.sqlite import SqliteSaver
    from langgraph.graph import END, START, StateGraph

    from agentlab.domain import InvoiceDraft
    from agentlab.state.outbox import FakeInvoiceService, idempotency_key


class GraphState(TypedDict):
    status: str
    supplier_answered: bool


def build_graph(conn: sqlite3.Connection, check: Callable[[GraphState], dict], on_received: Callable[[GraphState], None]):
    """received -> check -> (needs_info -> check)* -> completed, checkpointed to SQLite.

    ``check`` and ``on_received`` are injected so a test can crash a step and
    count how often each one runs.
    """

    def receive(state: GraphState) -> dict:
        on_received(state)
        return {"status": "received"}

    def ask_supplier(state: GraphState) -> dict:
        return {"status": "needs_info"}

    def complete(state: GraphState) -> dict:
        return {"status": "completed"}

    def route(state: GraphState) -> str:
        return "ask_supplier" if state["status"] == "needs_info" else "complete"

    builder = StateGraph(GraphState)
    builder.add_node("receive", receive)
    builder.add_node("check", check)
    builder.add_node("ask_supplier", ask_supplier)
    builder.add_node("complete", complete)
    builder.add_edge(START, "receive")
    builder.add_edge("receive", "check")
    builder.add_conditional_edges("check", route, ["ask_supplier", "complete"])
    builder.add_edge("ask_supplier", "check")
    builder.add_edge("complete", END)
    return builder.compile(checkpointer=SqliteSaver(conn))


@dataclass
class InvoiceActivities:
    """Activities run outside the workflow and may touch the world."""

    service: FakeInvoiceService
    checks: int = 0

    @activity.defn
    async def check_purchase(self, draft_json: str) -> None:
        self.checks += 1

    @activity.defn
    async def create_invoice(self, draft_json: str) -> str:
        info = activity.info()
        # Temporal's recommended key: the same on every retry, unique per workflow run.
        key = idempotency_key(info.workflow_run_id, info.activity_id)
        return self.service.create(key, InvoiceDraft.model_validate_json(draft_json))


@workflow.defn
class InvoiceWorkflow:
    """Deterministic orchestration: no clock, no I/O, only activities and timers."""

    @workflow.run
    async def run(self, draft_json: str) -> str:
        await workflow.execute_activity_method(
            InvoiceActivities.check_purchase, draft_json, start_to_close_timeout=timedelta(seconds=30)
        )
        await workflow.sleep(timedelta(days=3))  # a durable timer: the supplier's dispute window
        return await workflow.execute_activity_method(
            InvoiceActivities.create_invoice,
            draft_json,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(initial_interval=timedelta(seconds=1), maximum_attempts=5),
        )
