"""Lesson 19.5: compare memory strategies by recall, false memories and tokens."""

import unittest
from datetime import UTC, datetime

from agentlab.memory.evaluation import QUERIES, build_scenario, evaluate, naive_retrieval, retrieval

NOW = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)
BUDGET = 500


class Harness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scenario = build_scenario(now=NOW)
        cls.reports = evaluate(cls.scenario, budget=BUDGET)

    def test_every_strategy_reports_tokens_and_misses(self):
        self.assertEqual(list(self.reports), ["no_memory", "raw_window", "summary", "retrieval"])
        for name, report in self.reports.items():
            with self.subTest(name):
                self.assertEqual(len(report.hits) + len(report.missed), len(QUERIES))

    def test_no_memory_recalls_nothing_and_invents_nothing(self):
        report = self.reports["no_memory"]
        self.assertEqual((report.recall, report.false_memory_rate, report.mean_context_tokens), (0.0, 0.0, 0.0))

    def test_a_raw_window_misses_what_a_pinned_summary_keeps(self):
        self.assertLess(self.reports["raw_window"].recall, self.reports["summary"].recall)
        self.assertIn("pay-po-1001", self.reports["raw_window"].missed)
        self.assertIn("pay-po-1001", self.reports["summary"].hits)

    def test_retrieval_recalls_the_purchase_records_the_summary_never_saw(self):
        self.assertIn("price-m8", self.reports["retrieval"].hits)
        self.assertIn("price-m8", self.reports["summary"].missed)

    def test_no_strategy_recovers_the_attackers_payee_or_another_tenants_price(self):
        for name, report in self.reports.items():
            with self.subTest(name):
                self.assertEqual(report.false_memories, ())

    def test_the_attack_text_reached_the_context_only_as_untrusted_evidence(self):
        payee = next(q for q in QUERIES if q.query_id == "payee-po-1002")
        context = retrieval(self.scenario, payee, BUDGET)
        self.assertTrue(any("omega" in line.lower() for line in context.untrusted))  # it was retrieved: the check is not vacuous
        self.assertFalse(any("omega" in line.lower() for line in context.trusted))

    def test_a_retriever_that_ignores_provenance_is_caught(self):
        report = evaluate(self.scenario, budget=BUDGET, strategies={"naive": naive_retrieval})["naive"]
        self.assertIn("payee-po-1002", report.false_memories)
        # Recall alone would rank the unsafe retriever first: the attack text also says "Supplier Alpha".
        self.assertGreater(report.recall, self.reports["retrieval"].recall)

    def test_the_numbers_lesson_19_5_reports(self):
        table = {name: (r.recall, r.false_memory_rate, r.mean_context_tokens) for name, r in self.reports.items()}
        self.assertEqual(table, {"no_memory": (0.0, 0.0, 0.0), "raw_window": (0.25, 0.0, 436.0),
                                 "summary": (0.75, 0.0, 431.0), "retrieval": (0.875, 0.0, 84.125)})
        self.assertEqual(self.reports["retrieval"].missed, ("payee-po-1002",))  # the attack text and chat turns outranked PO-1002


if __name__ == "__main__":
    unittest.main()
