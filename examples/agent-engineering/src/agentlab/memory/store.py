"""Lesson 19.4: a memory store with expiry, eviction and deletion that follows lineage.

Two different reasons to remove a record, with two different rules:

- **Eviction** frees space. Expired records go first; then the unpinned
  record with the lowest retention score. A summary of an evicted source stays,
  because keeping the short version is the point of summarising.
- **Deletion** honours a request to forget. It removes the source and every
  record derived from it, directly or through another derived record, from the
  records and from the vector index's own copy.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Literal

from agentlab.domain import Principal
from agentlab.memory.records import MemoryRecord, visible
from agentlab.memory.retrieval import retrieve


class MemoryStore:
    def __init__(self, *, now: Callable[[], datetime], half_life: timedelta) -> None:
        self._now = now
        self._half_life = half_life
        self._records: dict[str, MemoryRecord] = {}
        # A vector store keeps its own copy of each record next to the vector, so
        # deleting the record alone would leave the text searchable here.
        self._vector_index: dict[str, MemoryRecord] = {}
        self._hits: Counter[str] = Counter()

    def add(self, record: MemoryRecord) -> None:
        if record.memory_id in self._records:
            raise ValueError(f"{record.memory_id} already exists")
        for source in (*record.derived_from, *filter(None, [record.supersedes])):
            if self._records[source].tenant_id != record.tenant_id:  # KeyError for an unknown source
                raise ValueError(f"{record.memory_id} cannot derive from another tenant's {source}")
        self._records[record.memory_id] = record
        self._vector_index[record.memory_id] = record

    def vector_ids(self) -> set[str]:
        return set(self._vector_index)

    def search(self, query: str, principal: Principal, *, k: int = 3, method: Literal["bm25", "toy_vector"] = "bm25") -> list[tuple[float, MemoryRecord]]:
        source = self._records if method == "bm25" else self._vector_index
        results = retrieve(source.values(), query, principal, now=self._now(), k=k, method=method)
        self._hits.update(record.memory_id for _, record in results)
        return results

    def retention_score(self, record: MemoryRecord) -> float:
        """Halves every ``half_life`` of age, times one plus the number of past retrievals."""
        age = self._now() - record.created_at
        return 0.5 ** (age / self._half_life) * (1 + self._hits[record.memory_id])

    def evict(self, capacity: int) -> list[str]:
        """Drop expired records, then the lowest-scoring unpinned ones until ``capacity`` is met.

        Pinned records are never evicted for space, so a store full of pinned
        records can stay over capacity; the caller sees it in ``len(vector_ids())``.
        """
        now = self._now()
        removed = [i for i, r in self._records.items() if r.expires_at is not None and r.expires_at <= now]
        for memory_id in removed:
            self._remove(memory_id)
        while len(self._records) > capacity:
            unpinned = [r for r in self._records.values() if not r.pinned]
            if not unpinned:
                break
            victim = min(unpinned, key=lambda r: (self.retention_score(r), r.created_at, r.memory_id))
            self._remove(victim.memory_id)
            removed.append(victim.memory_id)
        return removed

    def forget(self, memory_id: str, principal: Principal) -> list[str]:
        """Delete a record and everything derived from it. Returns the removed ids."""
        if not visible(self._records[memory_id], principal):
            raise PermissionError(f"{principal.user_id} may not delete {memory_id}")
        doomed = [memory_id]
        changed = True
        while changed:
            changed = False
            for record in self._records.values():
                if record.memory_id not in doomed and any(source in doomed for source in record.derived_from):
                    doomed.append(record.memory_id)
                    changed = True
        for doomed_id in doomed:
            self._remove(doomed_id)
        return doomed

    def _remove(self, memory_id: str) -> None:
        del self._records[memory_id]
        del self._vector_index[memory_id]
        self._hits.pop(memory_id, None)
