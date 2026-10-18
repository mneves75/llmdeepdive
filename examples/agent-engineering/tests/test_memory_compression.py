"""Lesson 19.3: a context budget, and compression measured by the facts it loses."""

import unittest

from agentlab.memory.compression import (
    FACTS,
    approx_tokens,
    context_budget,
    conversation,
    drop_stopwords,
    pin_ledger,
    recent_window,
    score,
    total_tokens,
)

BUDGET = 500


class Budget(unittest.TestCase):
    def test_the_lessons_worked_example(self):
        # Same numbers as the 19.3 calculator (src/lib/lab-math.ts contextBudget).
        parts = dict(reserve_output=4096, instructions=1200, tools=2400, chunks=6, chunk_tokens=800, history=21000)
        small = context_budget(window=32768, **parts)
        self.assertEqual((small.input_limit, small.fixed, small.used, small.over, small.history_limit, small.verdict),
                         (28672, 8400, 29400, 728, 20272, "over"))
        large = context_budget(window=131072, **parts)
        self.assertEqual((large.headroom, large.verdict), (97576, "fits"))
        self.assertEqual(context_budget(window=8192, **parts).verdict, "fixed_over")

    def test_the_counter_is_an_approximation_that_never_returns_zero_for_text(self):
        self.assertEqual(approx_tokens(""), 0)
        self.assertEqual(approx_tokens("ok"), 1)
        self.assertEqual(approx_tokens("x" * 401), 101)


class Conversation(unittest.TestCase):
    def test_fifty_turns_with_every_scored_fact_stated_once(self):
        turns = conversation()
        self.assertEqual(len(turns), 50)
        self.assertEqual(sorted(t.fact for t in turns if t.fact), sorted(f.fact_id for f in FACTS))
        self.assertGreater(total_tokens(turns), BUDGET)  # otherwise nothing needs compressing

    def test_the_uncompressed_conversation_keeps_every_fact(self):
        report = score(conversation(), FACTS)
        self.assertEqual((len(report.kept), report.lost, report.flipped), (len(FACTS), (), ()))


class Compression(unittest.TestCase):
    def test_every_compressor_fits_the_budget(self):
        for compress in (recent_window, drop_stopwords, pin_ledger):
            with self.subTest(compress.__name__):
                self.assertLessEqual(total_tokens(compress(conversation(), BUDGET)), BUDGET)

    def test_a_recency_window_loses_early_commitments(self):
        report = score(recent_window(conversation(), BUDGET), FACTS)
        self.assertIn("pay-po-1001", report.lost)

    def test_dropping_stopwords_flips_a_negation_into_an_instruction(self):
        report = score(drop_stopwords(conversation(), BUDGET), FACTS)
        self.assertIn("hold-po-1003", report.flipped)

    def test_a_pinned_ledger_keeps_every_fact_within_budget(self):
        kept = pin_ledger(conversation(), BUDGET)
        report = score(kept, FACTS)
        self.assertEqual((len(report.kept), report.lost, report.flipped), (len(FACTS), (), ()))
        self.assertLess(total_tokens(kept), total_tokens(conversation()))

    def test_a_ledger_larger_than_the_budget_is_an_error_not_a_silent_cut(self):
        with self.assertRaises(ValueError):
            pin_ledger(conversation(), 20)


if __name__ == "__main__":
    unittest.main()
