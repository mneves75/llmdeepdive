"""Lesson 23.5: deterministic replay in CI, repeated trials with an interval, and honest evidence labels."""

import unittest
from decimal import Decimal

from agentlab.domain import Principal
from agentlab.evals.corpus import build_corpus, run_case
from agentlab.evals.trials import TOOL_SCHEMAS, LiveAdapter, regressions, reliability, run_trials, wilson_interval
from agentlab.model import ModelReply, OpenAICompatibleModel, ScriptedModel
from agentlab.security.gate import authorize

CASES = build_corpus()
ORDINARY = [c for c in CASES if c.category == "ordinary"][:10]


def replay(case):
    return ScriptedModel([ModelReply(tool_call=call) for call in case.setup["calls"]] + [ModelReply(text=case.setup["reply"])])


class Interval(unittest.TestCase):
    def test_24_of_30_is_80_percent_between_about_62_7_and_90_5(self):
        # The same numbers as the cost-per-success lab of lesson 25.2.
        low, high = wilson_interval(24, 30)
        self.assertAlmostEqual(low, 0.6268, delta=5e-4)
        self.assertAlmostEqual(high, 0.9050, delta=5e-4)

    def test_the_interval_stays_inside_zero_and_one(self):
        self.assertEqual(wilson_interval(30, 30)[1], 1.0)
        self.assertEqual(wilson_interval(0, 30)[0], 0.0)

    def test_no_trials_is_an_error_not_an_interval(self):
        with self.assertRaises(ValueError):
            wilson_interval(0, 0)

    def test_pass_at_k_and_pass_hat_k_under_independence(self):
        at_least_one, every = reliability(0.8, 3)
        self.assertAlmostEqual(at_least_one, 0.992)
        self.assertAlmostEqual(every, 0.512)


class Replay(unittest.TestCase):
    def test_the_dev_suite_passes_and_never_touches_held_out_cases(self):
        self.assertEqual(regressions(CASES), [])

    def test_an_injected_regression_is_caught(self):
        def tenant_blind(request, principal, grant, purchases):
            # A "refactor" that checks the order against whichever tenant owns it.
            owner = next((p["tenant_id"] for p in purchases if p["po_id"] == request.arguments.get("po_id")), principal.tenant_id)
            return authorize(request, Principal.model_validate({**principal.model_dump(), "tenant_id": owner}), grant, purchases)

        failures = regressions(CASES, gate=tenant_blind)
        self.assertTrue(failures)
        self.assertTrue(all(f.split(":")[0].startswith(("tool-", "inj-")) for f in failures), failures)

    def test_a_valid_alternative_path_is_accepted(self):
        case = ORDINARY[0]  # scripted as lookup then draft
        draft = case.oracle["required"]["drafts"][0]
        other = ScriptedModel([ModelReply(tool_call={"name": "create_invoice_draft", "arguments": draft}), ModelReply(text="Done.")])
        self.assertEqual(run_case(case, model=other).problems, [])


class StubServer:
    """Stands in for a served model so the adapter can be tested offline."""

    def __init__(self, replies):
        self.replies, self.tools_seen = list(replies), []

    def complete(self, messages, tools=None):
        self.tools_seen.append(tools)
        return self.replies.pop(0)


class Trials(unittest.TestCase):
    def test_thirty_scripted_trials_report_rate_interval_and_cost(self):
        lying = ScriptedModel([ModelReply(text="Draft created.")])

        def make_model(case, trial):
            # Six of thirty trials claim success without drafting anything.
            return ScriptedModel(list(lying.replies)) if trial == 2 and ORDINARY.index(case) < 6 else replay(case)

        report = run_trials(ORDINARY, make_model, trials=3, cost_per_call=Decimal("0.01"))
        self.assertEqual((report.runs, report.successes), (30, 24))
        self.assertAlmostEqual(report.low, 0.6268, delta=5e-4)
        # A replayed trial makes one call per scripted tool call plus the reply; a lying trial makes one.
        replayed = sum(len(c.setup["calls"]) + 1 for c in ORDINARY) * 3
        self.assertEqual(report.calls, replayed - sum(len(c.setup["calls"]) for c in ORDINARY[:6]))
        self.assertEqual(report.cost, report.calls * Decimal("0.01"))
        self.assertEqual(report.cost_per_success, report.cost / 24)
        self.assertEqual(len(report.failures), 6)

    def test_scripted_trials_are_never_labelled_live(self):
        claims = ScriptedModel([ModelReply(text="Draft created.", served_by="some-big-model")])
        report = run_trials(ORDINARY[:1], lambda case, trial: claims, trials=1, cost_per_call=Decimal("0"))
        self.assertEqual(report.evidence, "fixture-tested")

    def test_a_served_model_is_labelled_live(self):
        self.assertEqual(LiveAdapter(OpenAICompatibleModel("http://127.0.0.1:9/v1", model="m")).evidence, "live-model-tested")

    def test_a_live_run_that_no_server_answered_is_not_evidence(self):
        model = OpenAICompatibleModel("http://127.0.0.1:9/v1", model="m", timeout_s=1)
        report = run_trials(ORDINARY[:1], lambda case, trial: model, trials=1, cost_per_call=Decimal("0"))
        self.assertEqual((report.evidence, report.successes), ("no-model-answered", 0))
        self.assertTrue(any("model error transport:" in f for f in report.failures), report.failures)

    def test_the_adapter_sends_the_tool_schemas_and_keeps_errors(self):
        server = StubServer([ModelReply(error="transport: ConnectionRefusedError")])
        adapter = LiveAdapter(server)
        adapter.complete([{"role": "user", "content": "x"}])
        self.assertEqual(server.tools_seen, [TOOL_SCHEMAS])
        self.assertEqual((adapter.calls, adapter.errors), (1, ["transport: ConnectionRefusedError"]))

    def test_cases_that_grade_a_refusal_of_scripted_calls_are_replay_only(self):
        with self.assertRaises(ValueError):
            run_trials([c for c in CASES if c.category == "tool_failure"][:1], lambda case, trial: replay(case), trials=1, cost_per_call=Decimal("0"))

    def test_crash_cases_are_not_model_trials(self):
        with self.assertRaises(ValueError):
            run_trials([c for c in CASES if c.category == "crash"][:1], lambda case, trial: None, trials=1, cost_per_call=Decimal("0"))


if __name__ == "__main__":
    unittest.main()
