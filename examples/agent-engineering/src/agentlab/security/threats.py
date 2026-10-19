"""Lesson 16.1: the assistant's threat model as data a test can check.

A diagram on a wiki drifts from the code. Writing the same model down as data
lets a test fail when a new tool appears without a decision about it, or when
a write boundary is "owned" by the model itself, for example by a sentence in
the system prompt.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Literal

Trust = Literal["trusted", "untrusted"]
Effect = Literal["read", "write"]

# Components that live inside the model's context. An instruction there is a
# request to the model, so none of them can enforce a boundary.
MODEL_SIDE = frozenset({"model", "system_prompt"})


@dataclass(frozen=True)
class ThreatModel:
    sources: Mapping[str, Trust]
    capabilities: Mapping[str, Effect]
    owners: Mapping[str, str]


def review_threat_model(model: ThreatModel, catalog: Iterable[str]) -> list[str]:
    """Return every gap a reviewer must close; an empty list means none was found."""
    problems = [f"{tool} is in the catalog but not in the threat model" for tool in catalog if tool not in model.capabilities]
    for tool, effect in model.capabilities.items():
        owner = model.owners.get(tool)
        if effect == "write" and owner is None:
            problems.append(f"{tool} writes and has no owner")
        elif effect == "write" and owner in MODEL_SIDE:
            problems.append(f"{tool} writes, so its owner must sit outside the model, not {owner}")
    for source, trust in model.sources.items():
        if trust == "untrusted" and model.owners.get(source) in (None, *MODEL_SIDE):
            problems.append(f"{source} is untrusted and has no owner outside the model")
    return problems


ASSISTANT_THREAT_MODEL = ThreatModel(
    sources={
        "principal": "trusted",  # built by the controller from the authenticated session
        "buyer_request": "trusted",
        "supplier_message": "untrusted",
        "retrieved_document": "untrusted",
        "tool_result": "untrusted",
        "portal_screenshot": "untrusted",
    },
    capabilities={
        "lookup_po": "read",
        "create_invoice_draft": "write",
        "approve_invoice": "write",
        "send_email": "write",
        "write_purchase_record": "write",
    },
    owners={
        "supplier_message": "untrusted_boundary",
        "retrieved_document": "untrusted_boundary",
        "tool_result": "untrusted_boundary",
        "portal_screenshot": "untrusted_boundary",
        "lookup_po": "policy_gate",
        "create_invoice_draft": "policy_gate",
        "approve_invoice": "human_approver",
        "send_email": "policy_gate",
        "write_purchase_record": "policy_gate",
    },
)
