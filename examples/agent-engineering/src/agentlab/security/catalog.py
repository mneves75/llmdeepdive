"""Lesson 16.3: pin the tool catalog an agent was approved against.

A tool server can add a tool, reword a description or relabel a tool between
two runs. The controller records a hash of each approved definition, and a tool
is usable only while its current definition hashes to the same value. Anything
new or changed waits for a person to approve it again. Tool results never
appear here: permissions are computed from the grant and the catalog alone.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass

from pydantic import Field, JsonValue

from agentlab.domain import Record


class ToolDefinition(Record):
    """What a tool server advertises. Every field may change; none is trusted."""

    name: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    description: str = Field(max_length=2000)
    input_schema: dict[str, JsonValue]
    annotations: dict[str, JsonValue] = {}


def fingerprint(tool: ToolDefinition) -> str:
    """SHA-256 of the definition as canonical JSON (sorted keys), so key order cannot change it."""
    canonical = json.dumps(tool.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


@dataclass(frozen=True)
class Grant:
    role: str
    pinned: dict[str, str]  # tool name -> fingerprint a person approved


class EscalationRefused(PermissionError):
    """A delegate asked for a tool its parent does not hold."""


def _by_name(catalog: Iterable[ToolDefinition]) -> dict[str, ToolDefinition]:
    tools: dict[str, ToolDefinition] = {}
    for tool in catalog:
        if tool.name in tools:
            # Two definitions under one name: which one runs is the server's choice, not ours.
            raise ValueError(f"the catalog defines {tool.name} twice")
        tools[tool.name] = tool
    return tools


def approve(role: str, catalog: Iterable[ToolDefinition], names: set[str]) -> Grant:
    """Record a person's approval of ``names`` as they are defined right now."""
    tools = _by_name(catalog)
    unknown = names - tools.keys()
    if unknown:
        raise ValueError(f"not in the catalog: {sorted(unknown)}")
    return Grant(role, {name: fingerprint(tools[name]) for name in names})


@dataclass(frozen=True)
class CatalogReview:
    usable: frozenset[str]
    new: frozenset[str]
    changed: frozenset[str]
    missing: frozenset[str]


def review_catalog(grant: Grant, catalog: Iterable[ToolDefinition]) -> CatalogReview:
    """Compare today's catalog with the pinned grant. Only exact matches stay usable."""
    current = {name: fingerprint(tool) for name, tool in _by_name(catalog).items()}
    return CatalogReview(
        usable=frozenset(name for name, pin in grant.pinned.items() if current.get(name) == pin),
        new=frozenset(current.keys() - grant.pinned.keys()),
        changed=frozenset(name for name, pin in grant.pinned.items() if name in current and current[name] != pin),
        missing=frozenset(grant.pinned.keys() - current.keys()),
    )


def delegate(parent: Grant, role: str, names: set[str]) -> Grant:
    """Give a sub-agent a subset of the parent's tools, with the parent's pins."""
    extra = names - parent.pinned.keys()
    if extra:
        raise EscalationRefused(f"{parent.role} cannot delegate what it does not hold: {sorted(extra)}")
    return Grant(role, {name: parent.pinned[name] for name in names})
