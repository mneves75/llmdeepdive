"""Lesson 21.1: which signals count as corrective feedback, and which only advise.

Every run here is a real subprocess (lesson 17.2's runner) over the synthetic
pricing module. Each negative case sits next to a positive control, so a broken
runner cannot make a "not passed" verdict true by accident.
"""

import unittest

from agentlab.repair.feedback import classify, next_step
from agentlab.repair.runner import load_project, run_suite
from agentlab.sandbox.process import Limits

PROJECT = load_project()
TESTS = ("test_pricing",)
FIX = PROJECT["pricing.py"].replace("if quantity > BULK_UNITS:", "if quantity >= BULK_UNITS:")


def patched(source: str) -> dict[str, str]:
    return {**PROJECT, "pricing.py": source}


class WhatTheRunSays(unittest.TestCase):
    def test_the_planted_bug_is_an_assertion_at_the_failing_test(self):
        feedback = classify(run_suite(PROJECT, TESTS))
        self.assertEqual(feedback.kind, "assertion")
        self.assertEqual(feedback.failure.test_id, "test_pricing.LineTotal.test_ten_units_get_the_bulk_discount")
        self.assertEqual(feedback.failure.frame.file, "test_pricing.py")

    def test_the_one_line_fix_passes_every_test(self):
        run = run_suite(patched(FIX), TESTS)
        self.assertEqual(classify(run).kind, "passed")
        self.assertEqual(run.ran, 3)

    def test_a_syntax_error_is_compiler_feedback(self):
        feedback = classify(run_suite(patched(FIX.replace("if quantity >= BULK_UNITS:", "if quantity >= BULK_UNITS")), TESTS))
        self.assertEqual(feedback.kind, "syntax")
        self.assertEqual(feedback.failure.error_type, "SyntaxError")

    def test_an_unexpected_exception_is_a_runtime_error_inside_the_module(self):
        feedback = classify(run_suite(patched(FIX.replace("total = quantity * unit_price", "total = quantity * unit_price + None")), TESTS))
        self.assertEqual(feedback.kind, "runtime")
        self.assertEqual(feedback.failure.error_type, "TypeError")
        self.assertEqual(feedback.failure.frame.file, "pricing.py")

    def test_a_loop_that_never_ends_is_stopped_by_a_resource_limit(self):
        hang = FIX.replace('    """Price of one invoice line.', '    while True:\n        pass\n    """Price of one invoice line.')
        run = run_suite(patched(hang), TESTS, Limits(cpu_seconds=1, wall_seconds=5))
        self.assertEqual(classify(run).kind, "limit")

    def test_a_missing_dependency_is_the_environment_not_the_code(self):
        feedback = classify(run_suite(patched("import invoice_rates_service\n" + FIX), TESTS))
        self.assertEqual(feedback.kind, "environment")


class ExitCodeZeroIsNotAPass(unittest.TestCase):
    """A patch shares the runner's process, so it can end the run before any test reports."""

    def test_a_module_that_exits_at_import_reports_nothing(self):
        run = run_suite(patched("import sys\nsys.exit(0)\n" + FIX), TESTS)
        self.assertEqual(run.exit_code, 0)  # what a harness that checks only the exit code would accept
        self.assertEqual(classify(run, minimum_tests=3).kind, "incomplete")

    def test_skipped_tests_do_not_count_as_passing(self):
        skip_all = "import unittest\nunittest.TestCase.setUp = lambda self: self.skipTest('skipped')\n" + FIX
        run = run_suite(patched(skip_all), TESTS)
        self.assertEqual(len(run.skipped), 3)
        self.assertEqual(run.failed, frozenset())
        self.assertEqual(classify(run, minimum_tests=3).kind, "incomplete")

    def test_fewer_tests_than_the_baseline_is_incomplete(self):
        run = run_suite(patched(FIX), TESTS)
        self.assertEqual(classify(run, minimum_tests=3).kind, "passed")
        self.assertEqual(classify(run, minimum_tests=4).kind, "incomplete")


class CriticOpinionsAdviseOnly(unittest.TestCase):
    def setUp(self):
        self.failing = classify(run_suite(PROJECT, TESTS))
        self.passing = classify(run_suite(patched(FIX), TESTS))

    def test_a_critic_approval_cannot_turn_a_failing_test_into_acceptance(self):
        self.assertEqual(next_step(self.failing, critic="approve"), "repair")

    def test_passing_tests_are_accepted_without_a_critic(self):
        self.assertEqual(next_step(self.passing), "accept")
        self.assertEqual(next_step(self.passing, critic="approve"), "accept")

    def test_a_critic_objection_on_passing_tests_goes_to_a_person(self):
        self.assertEqual(next_step(self.passing, critic="object"), "escalate")

    def test_an_environment_failure_is_escalated_not_repaired(self):
        broken = classify(run_suite(patched("import invoice_rates_service\n" + FIX), TESTS))
        self.assertEqual(next_step(broken), "escalate")


if __name__ == "__main__":
    unittest.main()
