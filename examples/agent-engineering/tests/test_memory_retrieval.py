"""Lesson 19.2: ingestion, a toy lexical retriever, and access control before ranking."""

import unittest
from datetime import UTC, datetime, timedelta

from agentlab.domain import Principal
from agentlab.fixtures import load_purchases, load_supplier_message
from agentlab.memory.records import MemoryRecord
from agentlab.memory.retrieval import chunk_message, purchase_records, retrieve, tokens, toy_vector

NOW = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)
BUYER_A = Principal(user_id="u1", tenant_id="tenant-a")
BUYER_B = Principal(user_id="u7", tenant_id="tenant-b")
CORPUS = purchase_records(load_purchases(), at=NOW)


def ids(results):
    return [record.memory_id for _, record in results]


class Ingestion(unittest.TestCase):
    def test_tokens_keep_identifiers_and_prices_whole(self):
        self.assertEqual(tokens("PO-1001: USD 12.50, qty 5,000."), ["po-1001", "usd", "12.50", "qty", "5,000"])

    def test_every_chunk_points_back_to_its_source(self):
        chunks = chunk_message("msg-injection", "tenant-a", load_supplier_message("injection"), at=NOW, max_words=20, overlap=5)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(c.derived_from == ("msg-injection",) and c.origin == "external" for c in chunks))

    def test_chunking_keeps_the_end_of_a_long_message(self):
        text = load_supplier_message("injection")
        chunks = chunk_message("msg-injection", "tenant-a", text, at=NOW, max_words=20, overlap=5)
        self.assertEqual(set(tokens(text)), {t for c in chunks for t in tokens(c.text)})


class Retrieval(unittest.TestCase):
    def test_a_relevant_authorized_record_is_found(self):
        self.assertEqual(ids(retrieve(CORPUS, "M8 hex bolts unit price", BUYER_A, now=NOW, k=1)), ["po-1001"])

    def test_access_control_runs_before_ranking(self):
        # The query matches tenant-b's order better ("400 boxes"). Filtering after a
        # top-1 ranking would return PO-2001 or nothing; filtering first returns PO-1001.
        query = "400 boxes of M8 hex bolts"
        self.assertEqual(ids(retrieve(CORPUS, query, BUYER_B, now=NOW, k=1)), ["po-2001"])  # positive control
        self.assertEqual(ids(retrieve(CORPUS, query, BUYER_A, now=NOW, k=1)), ["po-1001"])

    def test_naming_another_tenant_in_the_query_grants_nothing(self):
        results = retrieve(CORPUS, "tenant-b PO-2001 pallet jack", BUYER_A, now=NOW, k=6)
        self.assertTrue(all(record.tenant_id == "tenant-a" for _, record in results))

    def test_expired_records_are_not_retrieved(self):
        stale = MemoryRecord(memory_id="note-1", tenant_id="tenant-a", kind="episodic", origin="user", text="Gate code for the dock is 4471.",
                             created_at=NOW - timedelta(days=2), expires_at=NOW - timedelta(days=1))
        self.assertEqual(ids(retrieve([stale], "dock gate code", BUYER_A, now=NOW - timedelta(days=1, hours=1))), ["note-1"])  # control
        self.assertEqual(retrieve([stale], "dock gate code", BUYER_A, now=NOW), [])

    def test_a_superseded_record_is_not_retrieved(self):
        old = MemoryRecord(memory_id="addr-1", tenant_id="tenant-a", kind="semantic", origin="user", text="Deliver to dock 2.", created_at=NOW)
        new = MemoryRecord(memory_id="addr-2", tenant_id="tenant-a", kind="semantic", origin="user", text="Deliver to dock 5.", created_at=NOW, supersedes="addr-1")
        self.assertEqual(ids(retrieve([old], "deliver dock", BUYER_A, now=NOW)), ["addr-1"])  # control
        self.assertEqual(ids(retrieve([old, new], "deliver dock", BUYER_A, now=NOW)), ["addr-2"])

    def test_ties_are_broken_by_id_so_runs_repeat(self):
        twins = [MemoryRecord(memory_id=i, tenant_id="tenant-a", kind="episodic", origin="user", text="same words", created_at=NOW) for i in ("b", "a")]
        self.assertEqual(ids(retrieve(twins, "same words", BUYER_A, now=NOW)), ["a", "b"])


class ToyVector(unittest.TestCase):
    def test_vectors_are_stable_across_processes(self):
        # hashlib, not hash(): Python salts hash() per process, so an index built
        # with it would stop matching after a restart.
        self.assertEqual([round(x, 6) for x in toy_vector("hex bolts", dims=8)], [0.0, 0.0, 0.0, 0.707107, 0.0, 0.0, 0.0, 0.707107])

    def test_vector_retrieval_finds_word_overlap_only(self):
        self.assertEqual(ids(retrieve(CORPUS, "safety gloves", BUYER_A, now=NOW, k=1, method="toy_vector")), ["po-1003"])
        # A toy: shared word forms, not meaning. "glove" misses "gloves"...
        self.assertEqual(retrieve(CORPUS, "glove", BUYER_A, now=NOW, method="toy_vector"), [])
        # ...and "mittens" lands in the same 64-slot bucket as "safety": a hash collision, not understanding.
        self.assertEqual(ids(retrieve(CORPUS, "mittens", BUYER_A, now=NOW, method="toy_vector")), ["po-1003"])


if __name__ == "__main__":
    unittest.main()
