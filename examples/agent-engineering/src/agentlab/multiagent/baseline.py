"""Lesson 22.1: decide whether to divide work by measuring both designs on the same tasks.

Two systems read the same supplier invoices and report each total:

- ``run_single``: one agent reads the messages one after another, keeping
  its whole conversation, so every call re-reads everything before it.
- ``run_team``: a planner, one worker per message (in parallel) and a
  synthesizer that merges the workers' lines.

``measure`` turns a run into numbers (tokens, cost, critical path, success)
and ``compare`` refuses to call the team a win unless it passes every task
the single agent passed, is shorter on the critical path and stays within a
cost limit. Success is judged against the purchase records, never against
what an agent reports about itself.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal
from importlib.resources import files

from agentlab.fixtures import load_purchases, load_supplier_message
from agentlab.memory.compression import approx_tokens
from agentlab.model import Model
from agentlab.state.workflow import invoice_matches_purchase

# Illustrative prices in USD per million tokens, not any provider's list price (lesson 9.10).
PRICE_IN = Decimal("0.50")
PRICE_OUT = Decimal("2.00")

LINE = re.compile(r"^(PO-\d{4}) (\d+\.\d{2})$", re.MULTILINE)


def _message(po_id: str) -> str:
    if po_id == "PO-1001":
        return load_supplier_message("benign")
    return (files("agentlab.fixtures") / "multiagent" / f"invoice_{po_id.replace('-', '').lower()}.txt").read_text(encoding="utf-8")


@dataclass(frozen=True)
class Task:
    task_id: str
    po_ids: tuple[str, ...]


TASKS = {
    "one-invoice": Task("one-invoice", ("PO-1001",)),
    "four-invoices": Task("four-invoices", ("PO-1001", "PO-1002", "PO-1003", "PO-1004")),
}


@dataclass(frozen=True)
class Call:
    """One model call: what it read, what it wrote, and which calls it had to wait for."""

    agent: str
    input_tokens: int
    output_tokens: int
    after: tuple[int, ...] = ()


@dataclass(frozen=True)
class Run:
    task: Task
    calls: tuple[Call, ...]
    answer: str


def _tokens(messages: list[dict]) -> int:
    return sum(approx_tokens(message["content"]) for message in messages)


def run_single(task: Task, model: Model) -> Run:
    """One agent, one growing conversation: call k waits for call k-1 and re-reads it."""
    messages = [
        {"role": "system", "content": "You read supplier invoices. Reply with one line: the PO id and the total."},
        {"role": "user", "content": f"Report the invoice total for each of {', '.join(task.po_ids)}."},
    ]
    calls: list[Call] = []
    lines: list[str] = []
    for po_id in task.po_ids:
        messages.append({"role": "user", "content": _message(po_id)})
        reply = model.complete(messages).text or ""
        calls.append(Call("single", _tokens(messages), approx_tokens(reply), after=(len(calls) - 1,) if calls else ()))
        messages.append({"role": "assistant", "content": reply})
        lines.append(reply)
    return Run(task, tuple(calls), "\n".join(lines))


def run_team(task: Task, models: dict[str, Model]) -> Run:
    """Planner, then one worker per message (independent of each other), then a synthesizer."""
    plan_messages = [
        {"role": "system", "content": "You split invoice work between workers."},
        {"role": "user", "content": f"Plan the work for {', '.join(task.po_ids)}."},
    ]
    plan = models["planner"].complete(plan_messages).text or ""
    calls = [Call("planner", _tokens(plan_messages), approx_tokens(plan))]
    worker_lines: list[str] = []
    for po_id in task.po_ids:
        # Each worker gets its own short context: the plan and one message, nothing from its siblings.
        messages = [
            {"role": "system", "content": "You read one supplier invoice. Reply with one line: the PO id and the total."},
            {"role": "user", "content": f"Plan: {plan}\nYour message is about {po_id}."},
            {"role": "user", "content": _message(po_id)},
        ]
        line = models["worker"].complete(messages).text or ""
        calls.append(Call("worker", _tokens(messages), approx_tokens(line), after=(0,)))
        worker_lines.append(line)
    merge_messages = [
        {"role": "system", "content": "Merge the workers' lines into one report, one line per PO."},
        {"role": "user", "content": "\n".join(worker_lines)},
    ]
    answer = models["synthesizer"].complete(merge_messages).text or ""
    calls.append(Call("synthesizer", _tokens(merge_messages), approx_tokens(answer), after=tuple(range(1, len(calls)))))
    return Run(task, tuple(calls), answer)


def critical_path(calls: tuple[Call, ...]) -> int:
    """The longest chain of calls that must run one after another.

    shortcut: every call counts as one unit of latency; weight calls by
    their output tokens if replies differ a lot in length.
    """
    depth: list[int] = []
    for index, call in enumerate(calls):
        if any(parent >= index for parent in call.after):
            raise ValueError(f"call {index} waits for a call that comes after it")
        depth.append(1 + max((depth[parent] for parent in call.after), default=0))
    return max(depth, default=0)


@dataclass(frozen=True)
class Metrics:
    task_id: str
    calls: int
    input_tokens: int
    output_tokens: int
    cost_usd: Decimal
    critical_path: int
    success: bool
    problems: tuple[str, ...] = field(default=())


def measure(run: Run, tenant_id: str) -> Metrics:
    """Numbers for one run; success means every requested total matches the purchase record."""
    purchases = load_purchases()
    reported = dict(LINE.findall(run.answer))
    problems = [f"{po_id} missing from the answer" for po_id in run.task.po_ids if po_id not in reported]
    for po_id, total in reported.items():
        problems += invoice_matches_purchase(po_id, Decimal(total), purchases, tenant_id)
    tokens_in = sum(call.input_tokens for call in run.calls)
    tokens_out = sum(call.output_tokens for call in run.calls)
    cost = (tokens_in * PRICE_IN + tokens_out * PRICE_OUT) / 1_000_000
    return Metrics(run.task.task_id, len(run.calls), tokens_in, tokens_out, cost, critical_path(run.calls), not problems, tuple(problems))


@dataclass(frozen=True)
class Verdict:
    adopt: bool
    reasons: tuple[str, ...]


def compare(baseline: list[Metrics], candidate: list[Metrics], *, max_cost_ratio: Decimal) -> Verdict:
    """Adopt the candidate only if it keeps every success, shortens the critical path and stays within the cost limit."""
    if sorted(m.task_id for m in baseline) != sorted(m.task_id for m in candidate):
        raise ValueError("the two designs were measured on different tasks")
    base = {m.task_id: m for m in baseline}
    reasons = [f"the candidate failed {m.task_id}, which the baseline passed" for m in candidate if base[m.task_id].success and not m.success]
    base_path, cand_path = sum(m.critical_path for m in baseline), sum(m.critical_path for m in candidate)
    if cand_path >= base_path:
        reasons.append(f"no shorter critical path: {cand_path} calls against {base_path}")
    base_cost = sum(m.cost_usd for m in baseline)
    if base_cost == 0:
        raise ValueError("the baseline cost nothing, so no cost ratio exists")
    ratio = sum(m.cost_usd for m in candidate) / base_cost
    if ratio > max_cost_ratio:
        reasons.append(f"costs {ratio:.2f} times the baseline, over the limit of {max_cost_ratio}")
    return Verdict(not reasons, tuple(reasons))
