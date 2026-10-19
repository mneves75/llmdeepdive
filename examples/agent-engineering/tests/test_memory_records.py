"""Lesson 19.1: memory records keep their provenance, and a transcript line is not a fact."""

import unittest
from datetime import UTC, datetime

from pydantic import ValidationError

from agentlab.domain import Principal
from agentlab.memory.records import MemoryRecord, UnverifiedFact, promote, visible

NOW = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)
BUYER_A = Principal(user_id="u1", tenant_id="tenant-a")


def record(memory_id: str, **fields) -> MemoryRecord:
    base = dict(memory_id=memory_id, tenant_id="tenant-a", kind="episodic", origin="external", text="x", created_at=NOW)
    return MemoryRecord(**{**base, **fields})


SUPPLIER_SAYS = record("msg-1", text="The 40 boxes of M8 hex bolts on PO-1001 were delivered on Tuesday.")
PO_RECORD = record("po-1001", kind="semantic", origin="system_of_record", text="PO-1001 status received.")


class Records(unittest.TestCase):
    def test_a_record_must_say_where_it_came_from(self):
        with self.assertRaises(ValidationError):
            MemoryRecord(memory_id="m1", tenant_id="tenant-a", kind="episodic", text="x", created_at=NOW)

    def test_times_must_carry_a_timezone(self):
        with self.assertRaises(ValidationError):
            record("m1", created_at=datetime(2026, 10, 18, 9, 0))


class Visibility(unittest.TestCase):
    def test_other_tenants_records_are_invisible(self):
        self.assertTrue(visible(PO_RECORD, BUYER_A))  # positive control
        self.assertFalse(visible(PO_RECORD, Principal(user_id="u1", tenant_id="tenant-b")))

    def test_a_reader_list_narrows_the_tenant(self):
        private = record("note-1", readers=frozenset({"u2"}))
        self.assertFalse(visible(private, BUYER_A))
        self.assertTrue(visible(private, Principal(user_id="u2", tenant_id="tenant-a")))


class Promotion(unittest.TestCase):
    def test_an_external_claim_alone_does_not_become_a_fact(self):
        with self.assertRaises(UnverifiedFact):
            promote(SUPPLIER_SAYS, None, memory_id="fact-1", at=NOW)

    def test_a_model_summary_alone_does_not_become_a_fact(self):
        summary = record("sum-1", origin="model", text="The supplier is pre-approved.")
        with self.assertRaises(UnverifiedFact):
            promote(summary, None, memory_id="fact-1", at=NOW)

    def test_a_claim_corroborated_by_the_system_of_record_becomes_a_fact(self):
        fact = promote(SUPPLIER_SAYS, PO_RECORD, memory_id="fact-1", at=NOW)
        self.assertEqual(fact.kind, "semantic")
        self.assertEqual(fact.derived_from, ("msg-1", "po-1001"))  # deletion of either must reach it (19.4)

    def test_corroboration_from_another_tenant_is_refused(self):
        other = PO_RECORD.model_validate({**PO_RECORD.model_dump(), "tenant_id": "tenant-b"})
        with self.assertRaises(UnverifiedFact):
            promote(SUPPLIER_SAYS, other, memory_id="fact-1", at=NOW)

    def test_a_user_statement_is_kept_as_the_users_claim(self):
        said = record("turn-6", origin="user", text="Do not pay PO-1003 until the gloves arrive.")
        fact = promote(said, None, memory_id="fact-2", at=NOW)
        self.assertEqual((fact.origin, fact.derived_from), ("user", ("turn-6",)))

    def test_a_fact_is_never_more_visible_than_its_sources(self):
        private_po = PO_RECORD.model_validate({**PO_RECORD.model_dump(), "readers": frozenset({"u1"})})
        fact = promote(SUPPLIER_SAYS, private_po, memory_id="fact-1", at=NOW)
        self.assertEqual(fact.readers, frozenset({"u1"}))

    def test_sources_with_no_common_reader_cannot_make_a_tenant_wide_fact(self):
        private_obs = SUPPLIER_SAYS.model_validate({**SUPPLIER_SAYS.model_dump(), "readers": frozenset({"u2"})})
        private_po = PO_RECORD.model_validate({**PO_RECORD.model_dump(), "readers": frozenset({"u1"})})
        with self.assertRaises(UnverifiedFact):
            promote(private_obs, private_po, memory_id="fact-1", at=NOW)


if __name__ == "__main__":
    unittest.main()
