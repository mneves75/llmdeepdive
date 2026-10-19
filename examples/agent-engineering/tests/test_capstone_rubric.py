"""Lesson 25.5: the capstone verdict, with four kinds of evidence kept apart and safety as a veto."""

import unittest
from dataclasses import replace

from agentlab.capstone.benchmark import run_benchmark
from agentlab.capstone.rubric import ARTIFACTS, CAPABILITIES, Submission, Trial, check_suite, grade, trials_from_report
from agentlab.evals.corpus import build_corpus

CORPUS = tuple(build_corpus())


def live_trials(**overrides):
    """30 synthetic live trials: 10 scenarios across every capability, 3 trials each, one failure."""
    strata = list(CAPABILITIES) + ["ordinary", "approval", "recovery"]
    trials = []
    for n, stratum in enumerate(strata):
        for t in (1, 2, 3):
            trials.append(Trial(f"s{n:02d}", stratum, t, success=not (n == 0 and t == 3), safety_violations=(), evidence="live-model-tested", model="local-model-q4", model_revision="rev-2026-10-01"))
    return tuple(replace(trial, **overrides) for trial in trials)


def submission(trials, **overrides):
    base = Submission(artifacts=frozenset(ARTIFACTS), postmortems=3, suite=CORPUS, trials=trials)
    return replace(base, **overrides)


class Verdict(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture_trials = trials_from_report(run_benchmark(seed=2026))

    def test_the_courses_own_benchmark_passes_the_project_but_not_applied_mastery(self):
        verdict = grade(submission(self.fixture_trials))
        self.assertTrue(verdict.project)
        self.assertFalse(verdict.applied_mastery)
        self.assertEqual(verdict.evidence, {"fixture-tested": 30})
        self.assertTrue(any("live-model-tested" in reason for reason in verdict.reasons))

    def test_a_complete_live_submission_demonstrates_applied_mastery(self):
        verdict = grade(submission(self.fixture_trials + live_trials()))
        self.assertEqual((verdict.project, verdict.applied_mastery, verdict.blocked), (True, True, False), verdict.reasons)
        self.assertEqual(verdict.evidence, {"fixture-tested": 30, "live-model-tested": 30})

    def test_one_observed_safety_violation_blocks_everything(self):
        trials = list(live_trials())
        trials[4] = replace(trials[4], safety_violations=("invoice to Supplier Omega for 11340.00 does not match PO-1002",))
        verdict = grade(submission(self.fixture_trials + tuple(trials)))
        self.assertEqual((verdict.project, verdict.applied_mastery, verdict.blocked), (False, False, True))

    def test_relabelled_fixture_evidence_does_not_count_as_live(self):
        relabelled = live_trials(model=None, model_revision=None)
        verdict = grade(submission(self.fixture_trials + relabelled))
        self.assertFalse(verdict.applied_mastery)
        self.assertNotIn("live-model-tested", verdict.evidence)

    def test_a_dropped_trial_means_the_results_were_not_reported_in_full(self):
        verdict = grade(submission(live_trials()[:-1]))
        self.assertFalse(verdict.applied_mastery)
        self.assertTrue(any("in full" in reason for reason in verdict.reasons), verdict.reasons)

    def test_a_capability_with_no_success_is_not_demonstrated(self):
        trials = tuple(replace(t, success=False) if t.stratum == "cancellation" else t for t in live_trials())
        verdict = grade(submission(trials))
        self.assertFalse(verdict.applied_mastery)
        self.assertTrue(any("cancellation" in reason for reason in verdict.reasons))

    def test_fewer_than_ten_scenarios_is_not_enough(self):
        trials = tuple(t for t in live_trials() if t.scenario_id != "s09")
        self.assertFalse(grade(submission(trials)).applied_mastery)

    def test_a_missing_artifact_fails_the_project_and_is_named(self):
        verdict = grade(submission(self.fixture_trials, artifacts=frozenset(ARTIFACTS) - {"adr_vs_baseline"}))
        self.assertFalse(verdict.project)
        self.assertIn("missing artifact: adr_vs_baseline", verdict.reasons)

    def test_fewer_than_three_postmortems_fails_the_project(self):
        self.assertFalse(grade(submission(self.fixture_trials, postmortems=2)).project)

    def test_publishing_is_a_choice_the_verdict_never_reads(self):
        private = grade(submission(self.fixture_trials + live_trials(), visibility="private"))
        public = grade(submission(self.fixture_trials + live_trials(), visibility="public"))
        self.assertEqual(private, public)


class Suite(unittest.TestCase):
    def test_track_23s_corpus_has_the_shape_the_rubric_asks_for(self):
        self.assertEqual(check_suite(CORPUS), [])

    def test_a_corpus_without_held_out_cases_is_rejected(self):
        dev_only = tuple(case.model_validate({**case.model_dump(), "split": "dev"}) for case in CORPUS)
        self.assertIn("20 held-out cases expected, found 0", check_suite(dev_only))


if __name__ == "__main__":
    unittest.main()
