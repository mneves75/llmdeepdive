"""Lesson 19.1: memory records that say where they came from and who may read them.

"Working", "episodic" and "semantic" are a teaching taxonomy, not a protocol:
working memory is the current run's state, episodic memory is dated records of
what happened or was said, semantic memory is facts the assistant may rely on
later. What makes a record safe to reuse is not its kind but its provenance
(``origin`` and ``derived_from``) and its access rule (``tenant_id`` and
``readers``).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, Field

from agentlab.domain import Principal, Record

MemoryKind = Literal["working", "episodic", "semantic"]
# user: the authenticated person said it. system_of_record: a company database
# returned it. external: someone outside wrote it (a supplier e-mail). model: a
# model wrote it (a summary, an extraction).
Origin = Literal["user", "system_of_record", "external", "model"]
TRUSTED_ORIGINS: frozenset[str] = frozenset({"user", "system_of_record"})


class MemoryRecord(Record):
    memory_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_.:-]{0,63}$")
    tenant_id: str = Field(min_length=1, max_length=64)
    kind: MemoryKind
    origin: Origin
    text: str = Field(min_length=1, max_length=4000)
    created_at: AwareDatetime
    # Empty means every user of the tenant; otherwise only these user ids.
    readers: frozenset[str] = frozenset()
    # The memory_ids this record was made from, so deleting a source can find it.
    derived_from: tuple[str, ...] = ()
    supersedes: str | None = None
    expires_at: AwareDatetime | None = None
    # Pinned records are never evicted to save space; expiry still applies.
    pinned: bool = False


def visible(record: MemoryRecord, principal: Principal) -> bool:
    """The access rule. The principal comes from the trusted runtime, never from a query."""
    return record.tenant_id == principal.tenant_id and (not record.readers or principal.user_id in record.readers)


class UnverifiedFact(ValueError):
    """A claim would become a fact without a trusted source behind it."""


def _narrowest(a: frozenset[str], b: frozenset[str]) -> frozenset[str]:
    if a and b:
        if not a & b:
            # An empty reader set means "the whole tenant", so it cannot stand for "nobody".
            raise UnverifiedFact("no reader may see both sources")
        return a & b
    return a or b


def promote(observation: MemoryRecord, corroboration: MemoryRecord | None, *, memory_id: str, at: datetime) -> MemoryRecord:
    """Turn an episodic observation into a semantic fact, or refuse.

    A transcript line records that someone *said* something. A user's own
    statement may stand as the user's claim; text from outside the company or
    from a model needs a same-tenant record from the system of record that
    agrees with it. The fact lists both sources and is never readable by more
    people than either source.
    """
    if observation.kind != "episodic":
        raise ValueError("only an episodic observation can be promoted")
    if corroboration is not None and corroboration.tenant_id != observation.tenant_id:
        raise UnverifiedFact("corroboration comes from another tenant")
    if observation.origin not in TRUSTED_ORIGINS and (corroboration is None or corroboration.origin != "system_of_record"):
        raise UnverifiedFact(f"{observation.origin} text needs a system-of-record source before it is a fact")
    sources = (observation,) if corroboration is None else (observation, corroboration)
    return MemoryRecord(
        memory_id=memory_id,
        tenant_id=observation.tenant_id,
        kind="semantic",
        origin=sources[-1].origin,
        text=observation.text,
        created_at=at,
        readers=_narrowest(observation.readers, corroboration.readers if corroboration else frozenset()),
        derived_from=tuple(s.memory_id for s in sources),
    )
