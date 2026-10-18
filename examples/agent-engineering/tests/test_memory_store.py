"""Lesson 19.4: TTL, recency-and-use eviction, and deletion that reaches derived records."""

import unittest
from datetime import UTC, datetime, timedelta

from agentlab.domain import Principal
from agentlab.memory.records import MemoryRecord
from agentlab.memory.store import MemoryStore

T0 = datetime(2026, 10, 1, 9, 0, tzinfo=UTC)
BUYER_A = Principal(user_id="u1", tenant_id="tenant-a")


class Clock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


def rec(memory_id: str, text: str, **fields) -> MemoryRecord:
    base = dict(memory_id=memory_id, tenant_id="tenant-a", kind="episodic", origin="user", text=text, created_at=T0)
    return MemoryRecord(**{**base, **fields})


def found(store: MemoryStore, query: str) -> list[str]:
    return [r.memory_id for _, r in store.search(query, BUYER_A, k=10)]


class Eviction(unittest.TestCase):
    def setUp(self):
        self.clock = Clock(T0 + timedelta(days=10))
        self.store = MemoryStore(now=self.clock, half_life=timedelta(days=7))

    def test_expired_records_go_first_even_when_pinned(self):
        self.store.add(rec("otp", "one-time dock code 4471", pinned=True, expires_at=T0 + timedelta(days=1)))
        self.store.add(rec("note", "dock opens at 7"))
        self.assertEqual(self.store.evict(capacity=10), ["otp"])

    def test_a_pinned_commitment_survives_capacity_eviction(self):
        self.store.add(rec("commit", "We will pay PO-1001 within 30 days of delivery.", pinned=True))
        self.store.add(rec("chat", "Thanks, talk tomorrow.", created_at=T0 + timedelta(days=9)))
        self.assertEqual(self.store.evict(capacity=1), ["chat"])

    def test_an_often_used_old_record_outlives_a_fresh_unused_one(self):
        self.store.add(rec("old-used", "Supplier Beta ships gloves on Mondays."))
        self.store.add(rec("fresh-unused", "Coffee machine on floor 2 is broken.", created_at=T0 + timedelta(days=8)))
        for _ in range(3):
            found(self.store, "Supplier Beta gloves")
        self.assertEqual(self.store.evict(capacity=1), ["fresh-unused"])

    def test_without_use_recency_decides(self):
        self.store.add(rec("old-used", "Supplier Beta ships gloves on Mondays."))
        self.store.add(rec("fresh-unused", "Coffee machine on floor 2 is broken.", created_at=T0 + timedelta(days=8)))
        self.assertEqual(self.store.evict(capacity=1), ["old-used"])  # control for the test above

    def test_eviction_keeps_a_summary_of_an_evicted_source(self):
        # Eviction frees space; it is not a deletion request, so derived records stay.
        self.store.add(rec("turn-3", "Ask the warehouse lead before accepting a partial delivery."))
        self.store.add(rec("sum-1", "Partial deliveries need the warehouse lead.", origin="model", derived_from=("turn-3",), pinned=True))
        self.assertEqual(self.store.evict(capacity=1), ["turn-3"])
        self.assertEqual(found(self.store, "partial delivery warehouse"), ["sum-1"])


class Deletion(unittest.TestCase):
    def setUp(self):
        self.store = MemoryStore(now=Clock(T0), half_life=timedelta(days=7))
        self.store.add(rec("turn-12", "My mobile number is 555-0142, call me about late deliveries."))
        self.store.add(rec("turn-13", "Deliveries to dock 5 only."))
        self.store.add(rec("turn-20", "Never order shelving from Supplier Gamma again."))
        self.store.add(rec("sum-1", "Buyer: call 555-0142 about late deliveries; deliveries to dock 5.", origin="model", derived_from=("turn-12", "turn-13")))
        self.store.add(rec("sum-2", "Buyer avoids Supplier Gamma for shelving.", origin="model", derived_from=("turn-20",)))
        self.store.add(rec("fact-1", "Late-delivery contact: 555-0142.", kind="semantic", derived_from=("sum-1",)))

    def test_forgetting_a_source_removes_every_record_derived_from_it(self):
        self.assertEqual(sorted(found(self.store, "555-0142")), ["fact-1", "sum-1", "turn-12"])  # control: reachable before
        removed = self.store.forget("turn-12", BUYER_A)
        self.assertEqual(sorted(removed), ["fact-1", "sum-1", "turn-12"])
        self.assertEqual(found(self.store, "555-0142"), [])
        self.assertNotIn("sum-1", self.store.vector_ids())  # the derived index forgets too

    def test_records_from_other_sources_survive(self):
        self.store.forget("turn-12", BUYER_A)
        self.assertEqual(sorted(found(self.store, "Supplier Gamma shelving")), ["sum-2", "turn-20"])
        self.assertEqual(found(self.store, "dock 5"), ["turn-13"])

    def test_vector_search_cannot_reach_a_forgotten_record(self):
        removed = set(self.store.forget("turn-12", BUYER_A))
        results = self.store.search("555-0142 late deliveries", BUYER_A, k=10, method="toy_vector")
        self.assertEqual([r.memory_id for _, r in results], ["turn-13"])
        self.assertFalse(removed & {r.memory_id for _, r in results})

    def test_another_tenant_cannot_forget_my_records(self):
        with self.assertRaises(PermissionError):
            self.store.forget("turn-12", Principal(user_id="u7", tenant_id="tenant-b"))
        self.assertIn("turn-12", self.store.vector_ids())

    def test_a_derived_record_needs_its_sources_to_exist(self):
        with self.assertRaises(KeyError):
            self.store.add(rec("sum-9", "orphan summary", origin="model", derived_from=("turn-99",)))


if __name__ == "__main__":
    unittest.main()
