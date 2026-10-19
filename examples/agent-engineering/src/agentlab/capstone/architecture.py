"""Lesson 25.1: the architecture review written as data that tests check.

Three questions a reviewer asks, each answered by code instead of a slide:

- Does the threat model cover every tool the assembled system exposes?
  Track 16's model predates track 20's ``submit_invoice``; assembling the
  tracks is what reveals the gap, and ``THREAT_MODEL`` closes it.
- Would something simpler do? ``baseline_decision`` is lesson 14.1's fixed
  parser plus the purchase record: no model at all.
- Why does each component exist? Every entry in ``COMPONENTS`` names the
  requirement it serves, the simpler alternative and a test that shows the
  alternative falls short; ``review_components`` fails a reason nobody tested.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from agentlab.approval.policy import EFFECTS
from agentlab.security.assistant import FakeBackOffice
from agentlab.security.threats import ASSISTANT_THREAT_MODEL, ThreatModel
from agentlab.state.workflow import invoice_matches_purchase, parse_supplier_invoice

# Every tool the model can name plus every action the controller can take on approval.
CATALOG: tuple[str, ...] = tuple(sorted(set(FakeBackOffice([]).tools()) | set(EFFECTS)))

THREAT_MODEL = ThreatModel(
    sources=ASSISTANT_THREAT_MODEL.sources,
    capabilities={**ASSISTANT_THREAT_MODEL.capabilities, "submit_invoice": "write", "email_supplier": "write"},
    # Both are irreversible, so lesson 20.1's policy holds them for a person.
    owners={**ASSISTANT_THREAT_MODEL.owners, "submit_invoice": "human_approver", "email_supplier": "human_approver"},
)


def baseline_decision(message: str, purchases: list[dict], tenant_id: str) -> tuple[str, str, str]:
    """``("submit", po_id, total)`` when the fixed layout parses and matches the record, else ``("escalate", reason, "")``."""
    try:
        po_id, total = parse_supplier_invoice(message)
    except ValueError as error:
        return ("escalate", str(error), "")
    problems = invoice_matches_purchase(po_id, total, purchases, tenant_id)
    if problems:
        return ("escalate", problems[0], "")
    return ("submit", po_id, f"{total.quantize(Decimal('0.01'))}")


@dataclass(frozen=True)
class Component:
    name: str
    kind: Literal["model", "code", "person"]
    why: str  # the requirement this component serves
    simpler_alternative: str
    evidence: str  # dotted id of a test that shows the alternative falls short


_T = "tests.test_capstone_"
COMPONENTS: tuple[Component, ...] = (
    Component(
        "model",
        "model",
        "read supplier messages whose layout the fixed parser refuses",
        "lesson 14.1's parser, which needs no model",
        _T + "architecture.Baseline.test_the_parser_refuses_the_free_form_message",
    ),
    Component(
        "policy_gate",
        "code",
        "refuse tool calls an injected message talks the model into",
        "an instruction in the system prompt",
        _T + "assistant.Run.test_a_broken_gate_shows_up_as_a_safety_violation",
    ),
    Component(
        "approver",
        "person",
        "a person decides irreversible invoices at or above USD 1,000",
        "submit every draft the gate allowed",
        _T + "assistant.Run.test_a_large_invoice_waits_for_the_approver_and_the_wait_is_not_latency",
    ),
    Component(
        "outbox",
        "code",
        "one invoice per run even when a reply is lost",
        "call the invoice service directly and retry on error",
        _T + "assistant.Run.test_a_lost_reply_is_reconciled_into_exactly_one_invoice",
    ),
    Component(
        "sandbox",
        "code",
        "render the receipt with bounded CPU, memory and output",
        "run the rendering code in the controller's process",
        "tests.test_sandbox_process",
    ),
)


def _resolves(dotted: str) -> bool:
    """True if ``dotted`` names an importable test module, class or method.

    shortcut: ``tests.`` ids resolve only when run from ``examples/agent-engineering/``,
    as the README says; from another directory every evidence link reports missing.
    """
    parts = dotted.split(".")
    for cut in range(len(parts), 0, -1):
        try:
            target = importlib.import_module(".".join(parts[:cut]))
        except ImportError:
            continue
        for name in parts[cut:]:
            if not hasattr(target, name):
                return False
            target = getattr(target, name)
        return True
    return False


def review_components(components: tuple[Component, ...]) -> list[str]:
    """Every component must say why it exists and point at a test that exists."""
    problems = []
    for component in components:
        if not component.why.strip():
            problems.append(f"{component.name}: no reason to exist")
        if not component.simpler_alternative.strip():
            problems.append(f"{component.name}: no simpler alternative considered")
        if not _resolves(component.evidence):
            problems.append(f"{component.name}: evidence {component.evidence} is not a test that exists")
    return problems
