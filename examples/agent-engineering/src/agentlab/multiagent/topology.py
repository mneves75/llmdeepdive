"""Lesson 22.3: what a supervisor owns, and what peers sharing state must guard themselves.

- ``add_evidence``: peers append to one shared ``RunState`` through the
  compare-and-swap store of lesson 14.3. A stale write is refused, re-read
  and retried a bounded number of times, instead of silently overwriting.
- ``plan_peers``: peers that wait on each other's output form a graph; a
  cycle in it is a deadlock, so the plan is refused before anyone starts.
- ``supervise``: a supervisor fans work out to children and fans results in.
  One required failure cancels the children still running, undoes the
  finished ones with a bounded number of attempts and ends in a defined
  state: ``completed``, ``partial`` or ``failed``.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Literal

from agentlab.domain import EvidenceRef, RunState
from agentlab.state.checkpoints import CheckpointStore, StaleWrite


class Contention(RuntimeError):
    """Every attempt lost the race; the caller decides what happens next."""


def add_evidence(store: CheckpointStore, run_id: str, ref: EvidenceRef, *, attempts: int = 3, between: Callable[[], None] = lambda: None) -> RunState:
    """Append ``ref`` to the run's evidence without losing a concurrent append.

    ``between`` runs after the read and before the write; tests use it to
    place another peer's commit exactly there.
    """
    for _ in range(attempts):
        current = store.load(run_id)
        if current is None:
            raise KeyError(run_id)
        between()
        changed = RunState.model_validate({**current.model_dump(), "evidence": (*current.evidence, ref)})
        try:
            return store.save(changed, expected_version=current.version)
        except StaleWrite:
            continue  # someone committed after our read: read again, never overwrite
    raise Contention(f"{run_id}: lost the write race {attempts} times")


class DeadlockRefused(ValueError):
    def __init__(self, cycle: list[str]) -> None:
        super().__init__(" -> ".join([*cycle, cycle[0]]))
        self.cycle = cycle


def plan_peers(waits_on: dict[str, set[str]]) -> list[str]:
    """An order in which every peer starts after the peers it waits on, or ``DeadlockRefused``."""
    for peer, needs in waits_on.items():
        unknown = needs - waits_on.keys()
        if unknown:
            raise ValueError(f"{peer} waits on {sorted(unknown)}, which nobody starts")
    order: list[str] = []
    state: dict[str, str] = {}  # "open" while on the current path, "done" once ordered

    def visit(peer: str, path: list[str]) -> None:
        if state.get(peer) == "done":
            return
        if state.get(peer) == "open":
            raise DeadlockRefused(path[path.index(peer):])  # the wait chain came back to this peer
        state[peer] = "open"
        for need in sorted(waits_on[peer]):
            visit(need, [*path, peer])
        state[peer] = "done"
        order.append(peer)

    for peer in waits_on:
        visit(peer, [])
    return order


@dataclass(frozen=True)
class Child:
    name: str
    run: Callable[[], Awaitable[object]]
    required: bool = True
    undo: Callable[[], None] | None = None  # compensation if the whole fan-out fails


@dataclass(frozen=True)
class FanIn:
    status: Literal["completed", "partial", "failed"]
    results: dict[str, object]
    failed: dict[str, str]
    cancelled: tuple[str, ...]
    undone: tuple[str, ...]
    cleanup_pending: tuple[str, ...]  # compensations that kept failing: a person or a reconciler takes over


async def supervise(children: list[Child], *, cleanup_attempts: int = 2) -> FanIn:
    """Run children concurrently; a required failure stops the rest and undoes what finished.

    shortcut: a child that swallows cancellation and keeps running would make
    this wait for it; production code puts a deadline on the cancel too.
    """
    by_task = {asyncio.create_task(child.run(), name=child.name): child for child in children}
    pending = set(by_task)
    results: dict[str, object] = {}
    failed: dict[str, str] = {}
    cancelled: list[str] = []
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in sorted(done, key=lambda t: children.index(by_task[t])):
            child = by_task[task]
            if task.exception() is None:
                results[child.name] = task.result()
            else:
                failed[child.name] = repr(task.exception())[:200]
        if any(by_task[t].required for t in done if t.exception() is not None):
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)  # let each child run its cleanup
            cancelled = [child.name for task, child in by_task.items() if task in pending]
            pending = set()
    required_failed = any(child.required and child.name in failed for child in children)
    undone: list[str] = []
    stuck: list[str] = []
    if required_failed:
        for child in children:
            if child.name in results and child.undo is not None:
                (undone if _undo(child.undo, cleanup_attempts) else stuck).append(child.name)
    status = "failed" if required_failed else "partial" if failed else "completed"
    return FanIn(status, results, failed, tuple(cancelled), tuple(undone), tuple(stuck))


def _undo(undo: Callable[[], None], attempts: int) -> bool:
    for _ in range(attempts):
        try:
            undo()
            return True
        except Exception:  # noqa: BLE001 - every failure counts as one attempt
            continue
    return False
