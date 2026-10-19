"""Lesson 25.2: repeated trials into a reproducible report, and the cost of one success."""

import json
import tempfile
import unittest
from pathlib import Path

from agentlab.capstone.assistant import CASES
from agentlab.capstone.benchmark import cost_per_success, fixture_manifest, load_fixture_bytes, run_benchmark, write_report
from agentlab.security.gate import Decision


class CostPerSuccess(unittest.TestCase):
    def test_the_labs_worked_example(self):
        # The same arithmetic as costPerSuccess in src/lib/lab-math.ts, which the lesson's calculator runs.
        result = cost_per_success(runs=30, successes=24, model_cost=0.08, sandbox_cost=0.02, review_minutes=1.5, review_hourly=40)
        self.assertAlmostEqual(result["cost_per_run"], 1.10)
        self.assertAlmostEqual(result["total"], 33.00)
        self.assertAlmostEqual(result["per_success"], 1.375)
        self.assertAlmostEqual(result["rate"], 0.8)
        self.assertAlmostEqual(result["low"], 0.6268, delta=5e-4)
        self.assertAlmostEqual(result["high"], 0.9050, delta=5e-4)

    def test_no_success_has_no_cost_per_success(self):
        result = cost_per_success(runs=10, successes=0, model_cost=0.1, sandbox_cost=0, review_minutes=0, review_hourly=0)
        self.assertIsNone(result["per_success"])
        self.assertEqual(result["low"], 0)


class Report(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run_benchmark(seed=2026)

    def test_ten_scenarios_times_three_trials_with_every_failure_kept(self):
        runs = self.report["deterministic"]["runs"]
        self.assertEqual(len(runs), 30)
        self.assertEqual(self.report["deterministic"]["summary"]["successes"], 24)
        failed = sorted({run["case_id"] for run in runs if not run["success"]})
        self.assertEqual(failed, ["memory-loss-po1001", "tool-failure-wrong-tenant-po1001"])

    def test_costs_waits_and_retries_are_reported_separately(self):
        summary = self.report["deterministic"]["summary"]
        self.assertEqual(set(summary["cost_usd"]), {"model", "sandbox", "review", "total", "per_success"})
        self.assertGreater(summary["human_wait_s"]["max"], 0)
        self.assertEqual(summary["retries"], 3)  # one per trial of the provider-503 scenario
        self.assertEqual(summary["reconciliations"], 3)  # one per trial of the lost reply
        self.assertEqual(set(summary["latency_ms"]), {"p50", "p90", "max"})

    def test_the_report_says_what_kind_of_evidence_it_is(self):
        deterministic = self.report["deterministic"]
        self.assertEqual(deterministic["evidence_kind"], "fixture-tested")
        self.assertEqual(deterministic["model"], {"kind": "scripted", "name": None, "revision": None})
        self.assertEqual(self.report["environment"]["clock"], "injected")

    def test_the_same_seed_reproduces_the_same_digest(self):
        again = run_benchmark(seed=2026)
        self.assertEqual(again["digest"], self.report["digest"])
        self.assertEqual(json.dumps(again["deterministic"], sort_keys=True), json.dumps(self.report["deterministic"], sort_keys=True))

    def test_another_seed_changes_timing_and_digest_but_not_outcomes(self):
        other = run_benchmark(seed=7)
        self.assertNotEqual(other["digest"], self.report["digest"])
        outcomes = lambda report: [(r["case_id"], r["trial"], r["success"]) for r in report["deterministic"]["runs"]]
        self.assertEqual(outcomes(other), outcomes(self.report))

    def test_a_changed_fixture_changes_the_manifest(self):
        files = load_fixture_bytes()
        changed = {**files, "purchases.json": files["purchases.json"].replace(b"12.50", b"12.60")}
        self.assertNotEqual(fixture_manifest(changed)["sha256"], fixture_manifest(files)["sha256"])
        self.assertEqual(self.report["deterministic"]["fixture_manifest"], fixture_manifest(files))

    def test_safety_violations_are_counted_not_averaged_away(self):
        injection = tuple(case for case in CASES if case.stratum == "injection")
        broken = run_benchmark(seed=2026, trials=1, cases=injection, gate=lambda *args: Decision(True, "broken gate"))
        self.assertGreater(broken["deterministic"]["summary"]["safety_violations"], 0)
        self.assertEqual(self.report["deterministic"]["summary"]["safety_violations"], 0)

    def test_write_report_writes_the_json_it_returns(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "report.json"
            report = write_report(path, seed=2026, trials=1)
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["digest"], report["digest"])


if __name__ == "__main__":
    unittest.main()
