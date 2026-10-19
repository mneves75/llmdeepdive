"""Lesson 23.4: deterministic checks first, a judge only for wording, and controls that catch a broken grader."""

import unittest
from collections import Counter

from agentlab.evals.corpus import build_corpus, run_case
from agentlab.evals.graders import ModelJudge, calibrate, cohens_kappa, grade_trial, load_labelled, trusted
from agentlab.model import ModelReply, ScriptedModel
from agentlab.security.gate import Decision, authorize
from agentlab.security.redteam import run_red_team

LABELLED = load_labelled()
HUMAN = [item["label"] for item in LABELLED]


def scripted_judge(labels):
    """A judge whose model replies are fixed: it tests the calibration code, not any real judge."""
    return ModelJudge(ScriptedModel([ModelReply(text=label.upper()) for label in labels]))


# Agrees with the labels except on reply-08 (Portuguese, wrongly failed) and reply-18 (claims pre-approval, wrongly passed).
GOOD = ["fail" if i == 7 else "pass" if i == 17 else label for i, label in enumerate(HUMAN)]


class Kappa(unittest.TestCase):
    def test_the_worked_example(self):
        self.assertEqual(HUMAN.count("pass"), 14)
        self.assertAlmostEqual(cohens_kappa(GOOD, HUMAN), (0.9 - 0.58) / (1 - 0.58))

    def test_perfect_agreement_is_one_and_chance_agreement_is_zero(self):
        self.assertEqual(cohens_kappa(HUMAN, HUMAN), 1.0)
        self.assertEqual(cohens_kappa(["pass"] * 20, HUMAN), 0.0)

    def test_kappa_is_undefined_when_both_raters_never_vary(self):
        self.assertIsNone(cohens_kappa(["pass"] * 4, ["pass"] * 4))


class Calibration(unittest.TestCase):
    def test_a_judge_close_to_the_labels_is_trusted(self):
        result = calibrate(scripted_judge(GOOD), LABELLED)
        self.assertEqual((result.agreement, round(result.kappa, 3)), (0.9, 0.762))
        self.assertEqual(result.disagreements, ["reply-08", "reply-18"])
        self.assertTrue(trusted(result))

    def test_an_always_pass_judge_agrees_70_percent_and_is_still_rejected(self):
        result = calibrate(scripted_judge(["pass"] * 20), LABELLED)
        self.assertEqual((result.agreement, result.kappa), (0.7, 0.0))
        self.assertFalse(trusted(result))

    def test_an_inverted_judge_is_rejected(self):
        result = calibrate(scripted_judge(["fail" if label == "pass" else "pass" for label in HUMAN]), LABELLED)
        self.assertLess(result.kappa, 0)
        self.assertFalse(trusted(result))

    def test_an_unreadable_verdict_counts_as_a_disagreement_not_a_pass(self):
        judge = ModelJudge(ScriptedModel([ModelReply(text="The reply looks fine to me.")]))
        self.assertEqual(judge.grade("Draft created."), "invalid")

    def test_two_judges_that_share_a_blind_spot_agree_with_each_other_not_with_people(self):
        # Agreement between judges is not evidence that either is right.
        twin = list(GOOD)
        self.assertEqual(cohens_kappa(GOOD, twin), 1.0)
        self.assertLess(cohens_kappa(twin, HUMAN), 1.0)
        # Even with a third judge that is always right, two correlated judges outvote it.
        majority = [max(set(votes), key=votes.count) for votes in zip(GOOD, twin, HUMAN)]
        self.assertEqual(majority, GOOD)


class DeterministicChecksDecideFirst(unittest.TestCase):
    def test_a_lenient_judge_cannot_rescue_a_run_whose_effects_are_wrong(self):
        model = ScriptedModel([ModelReply(text="PASS")])
        verdict = grade_trial(["drafts: missing 1 required"], "Draft created for PO-1001.", ModelJudge(model))
        self.assertFalse(verdict.passed)
        self.assertEqual(model.calls, [])  # the judge was never asked

    def test_the_judge_scores_the_wording_of_a_run_that_passed_the_checks(self):
        self.assertTrue(grade_trial([], "Draft for PO-1001 saved, not yet approved.", ModelJudge(ScriptedModel([ModelReply(text="PASS")]))).passed)
        verdict = grade_trial([], "Invoice approved and sent.", ModelJudge(ScriptedModel([ModelReply(text="FAIL")])))
        self.assertEqual((verdict.passed, verdict.problems), (False, ["judge: fail"]))


allow_all = lambda *args: Decision(True, "broken gate")  # noqa: E731
deny_all = lambda *args: Decision(False, "broken gate")  # noqa: E731


class ControlsCatchABrokenSafetyGate(unittest.TestCase):
    def setUp(self):
        self.cases = [c for c in build_corpus() if c.category in ("ordinary", "tool_failure", "injection")]

    def failing(self, gate):
        return Counter(c.category for c in self.cases if run_case(c, gate=gate).problems)

    def test_the_real_gate_passes_every_control(self):
        self.assertEqual(self.failing(authorize), {})

    def test_a_gate_that_allows_everything_fails_the_negative_controls(self):
        # The four malformed tool names never reach a gate, and the two unsafe-link
        # cases are stopped by the renderer, so those still pass; 35 of 65 fail.
        self.assertEqual(self.failing(allow_all), {"tool_failure": 16, "injection": 13, "ordinary": 6})
        self.assertNotEqual(run_red_team(gate=allow_all).findings, [])

    def test_a_gate_that_refuses_everything_fails_the_positive_controls(self):
        # Attack cases alone would certify this gate: refusing everything is safe and useless.
        self.assertEqual(self.failing(deny_all), {"ordinary": 30})
        self.assertIn("benign control: expected one correct draft, got 0", run_red_team(gate=deny_all).findings)


if __name__ == "__main__":
    unittest.main()
