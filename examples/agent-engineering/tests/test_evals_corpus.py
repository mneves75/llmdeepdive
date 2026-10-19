"""Lesson 23.3: a 100-case corpus whose manifest says how each case is set up, judged and sourced."""

import json
import unittest
from collections import Counter

from pydantic import ValidationError

from agentlab.evals.corpus import CATEGORIES, Case, build_corpus, executed, manifest_json, run_case
from agentlab.state.outbox import FakeInvoiceService


class TheManifest(unittest.TestCase):
    def setUp(self):
        self.cases = build_corpus()

    def test_the_plan_distribution(self):
        self.assertEqual(Counter(c.category for c in self.cases), {"ordinary": 30, "tool_failure": 20, "injection": 15, "crash": 15, "approval": 10, "degradation": 10})
        self.assertEqual(len({c.case_id for c in self.cases}), 100)

    def test_twenty_held_out_cases_stratified_by_category(self):
        held = Counter(c.category for c in self.cases if c.split == "held_out")
        self.assertEqual(held, {"ordinary": 6, "tool_failure": 4, "injection": 3, "crash": 3, "approval": 2, "degradation": 2})

    def test_the_same_seed_gives_the_same_bytes(self):
        self.assertEqual(manifest_json(build_corpus(seed=7)), manifest_json(build_corpus(seed=7)))

    def test_another_seed_changes_which_cases_are_held_out_but_not_how_many(self):
        other = build_corpus(seed=8)
        held = lambda cases: {c.case_id for c in cases if c.split == "held_out"}  # noqa: E731
        self.assertNotEqual(held(self.cases), held(other))
        self.assertEqual(len(held(other)), 20)

    def test_every_case_records_setup_oracle_seed_effects_and_provenance(self):
        for case in self.cases:
            self.assertTrue(case.setup.get("runner"), case.case_id)
            self.assertIn("required", case.oracle, case.case_id)
            self.assertIsInstance(case.seed, int)
            self.assertIsInstance(case.allowed_effects, dict)
            self.assertTrue(case.provenance, case.case_id)

    def test_the_manifest_round_trips_as_strict_json(self):
        rows = json.loads(manifest_json(self.cases))
        self.assertEqual([Case.model_validate_json(json.dumps(row)) for row in rows], self.cases)

    def test_a_fixture_path_outside_the_fixtures_is_refused(self):
        case = next(c for c in self.cases if c.category == "injection")
        bad = Case.model_validate({**case.model_dump(), "setup": {**case.setup, "message": {"fixture": "../domain.py"}}})
        with self.assertRaises(ValueError):
            run_case(bad)

    def test_an_unknown_category_is_refused(self):
        with self.assertRaises(ValidationError):
            Case.model_validate({**self.cases[0].model_dump(), "category": "misc"})


class RunningTheCorpus(unittest.TestCase):
    def setUp(self):
        self.cases = build_corpus()

    def test_which_categories_run_here_and_which_are_manifest_only(self):
        runs = {category: {executed(c) for c in self.cases if c.category == category} for category in CATEGORIES}
        self.assertEqual(runs, {"ordinary": {True}, "tool_failure": {True}, "injection": {True}, "crash": {True}, "approval": {False}, "degradation": {False}})

    def test_every_executed_case_passes_against_the_real_components(self):
        results = [run_case(c) for c in self.cases if executed(c)]
        self.assertEqual(len(results), 80)
        self.assertEqual([r for r in results if r.problems], [])

    def test_a_manifest_only_case_cannot_be_run_by_accident(self):
        with self.assertRaises(LookupError):
            run_case(next(c for c in self.cases if c.category == "approval"))

    def test_a_service_that_ignores_idempotency_keys_fails_the_crash_cases(self):
        class Forgetful(FakeInvoiceService):
            def create(self, key, draft):
                return super().create(f"{key}#{self.create_calls}", draft)

            def find(self, key):
                return None

        crashes = [c for c in self.cases if c.category == "crash"]
        failed = [c.case_id for c in crashes if run_case(c, service=Forgetful()).problems]
        # Without deduplication, only the three cases whose service happened to write exactly once still pass.
        self.assertEqual(len(failed), 12)


if __name__ == "__main__":
    unittest.main()
