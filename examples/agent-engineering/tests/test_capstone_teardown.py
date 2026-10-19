"""Lesson 25.4: the teardown is rendered from the report, and a clean process reproduces the report."""

import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from agentlab.capstone.benchmark import run_benchmark
from agentlab.capstone.teardown import SECTIONS, licenses, render_teardown, reproduces, review_teardown


class Teardown(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run_benchmark(seed=2026)
        cls.text = render_teardown(cls.report)

    def test_the_rendered_teardown_has_every_section_and_names_its_evidence(self):
        self.assertEqual(review_teardown(self.text, self.report), [])
        for section in SECTIONS:
            self.assertIn(f"## {section}", self.text)
        self.assertIn("fixture-tested", self.text)
        self.assertIn(self.report["digest"], self.text)

    def test_failures_are_listed_in_the_results(self):
        self.assertIn("memory-loss-po1001.t1", self.text)

    def test_a_missing_or_empty_section_is_flagged(self):
        without = self.text.replace("## Limitations", "## Notes")
        self.assertIn("missing section: Limitations", review_teardown(without, self.report))
        start = self.text.index("## Licenses")
        empty = self.text[:start] + "## Licenses\n\n"
        self.assertIn("empty section: Licenses", review_teardown(empty, self.report))

    def test_a_teardown_that_drops_the_evidence_kind_is_flagged(self):
        vague = self.text.replace("fixture-tested", "tested")
        self.assertIn("the evidence kind fixture-tested is not stated", review_teardown(vague, self.report))

    def test_licenses_come_from_the_installed_packages(self):
        table = licenses()
        self.assertEqual(table["pydantic"], ("2.13.5", "MIT"))
        self.assertEqual(table["agentlab"][1], "MIT")


class CleanReproduction(unittest.TestCase):
    def test_a_fresh_process_in_an_empty_directory_reproduces_the_digest(self):
        local = run_benchmark(seed=2026)
        with tempfile.TemporaryDirectory() as empty:
            out = Path(empty) / "report.json"
            # -I ignores PYTHON* variables and the current directory; a different hash seed must not matter.
            env = {"PATH": os.environ.get("PATH", ""), "PYTHONHASHSEED": "12345"}
            subprocess.run([sys.executable, "-I", "-m", "agentlab.capstone.benchmark", str(out)], cwd=empty, env=env, check=True, capture_output=True, timeout=120)
            fresh = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(reproduces(local, fresh), [])

    def test_a_changed_outcome_is_named_not_just_a_different_hash(self):
        local = run_benchmark(seed=2026, trials=1)
        tampered = copy.deepcopy(local)
        tampered["deterministic"]["runs"][0]["success"] = False
        tampered["digest"] = "0" * 64
        problems = reproduces(local, tampered)
        self.assertIn("digest differs", problems[0])
        self.assertTrue(any("ordinary-po1001.t1" in p for p in problems), problems)


if __name__ == "__main__":
    unittest.main()
