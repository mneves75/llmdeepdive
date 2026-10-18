"""Lesson 17.5: measure a backend's boundary, and clean up exactly what a run owns.

``probe_boundary`` records what a backend actually allows. The subprocess
backend's report is the honest one: limits applied, isolation absent. An ADR
quotes these measured values instead of the backend's description of itself.
"""

import os
import tempfile
import unittest
from pathlib import Path

from agentlab.sandbox.boundary import probe_boundary
from agentlab.sandbox.interpreter import InterpreterRequest, SubprocessBackend
from agentlab.sandbox.process import Limits


class MeasuredBoundary(unittest.TestCase):
    def test_the_subprocess_backend_report(self):
        if os.geteuid() == 0:
            self.skipTest("RLIMIT_NPROC is not enforced for root; run the suite as an ordinary user")
        report = probe_boundary(SubprocessBackend())
        self.assertEqual(
            report,
            {
                "reads_host_file": True,  # no filesystem isolation
                "inherits_environment": False,  # env={} holds
                "starts_processes": False,  # RLIMIT_NPROC holds for a non-root user
                "output_bounded": True,  # RLIMIT_FSIZE on stdout holds
            },
        )

    def test_positive_control_a_looser_backend_measures_differently(self):
        # The probes can tell configurations apart, so a pass above is not vacuous.
        loose = SubprocessBackend(limits=Limits(allow_processes=True, max_file_bytes=64 * 1024 * 1024))
        report = probe_boundary(loose)
        self.assertTrue(report["starts_processes"])
        self.assertFalse(report["output_bounded"])


class ExactCleanup(unittest.TestCase):
    def setUp(self):
        self.parent = tempfile.TemporaryDirectory()
        self.root = Path(self.parent.name)
        # Another run's workspace with the same prefix: cleanup by pattern would delete it.
        self.neighbour = self.root / "agentlab-sandbox-neighbour"
        self.neighbour.mkdir()

    def tearDown(self):
        self.parent.cleanup()

    def remaining(self) -> list[str]:
        return sorted(p.name for p in self.root.iterdir())

    def test_the_workspace_is_removed_after_a_normal_run(self):
        SubprocessBackend(temp_root=self.root).run(InterpreterRequest(request_id="r1", code="open('out/a.txt', 'w').write('a')"))
        self.assertEqual(self.remaining(), ["agentlab-sandbox-neighbour"])

    def test_the_workspace_is_removed_after_a_timeout(self):
        backend = SubprocessBackend(limits=Limits(wall_seconds=1), temp_root=self.root)
        response = backend.run(InterpreterRequest(request_id="r2", code="import time\nwhile True:\n    time.sleep(0.1)"))
        self.assertTrue(response.timed_out)
        self.assertEqual(self.remaining(), ["agentlab-sandbox-neighbour"])

    def test_the_workspace_is_removed_when_the_guest_locks_its_files(self):
        code = "import os\nos.makedirs('out/locked')\nopen('out/locked/x', 'w').write('x')\nos.chmod('out/locked', 0)"
        SubprocessBackend(temp_root=self.root).run(InterpreterRequest(request_id="r3", code=code))
        self.assertEqual(self.remaining(), ["agentlab-sandbox-neighbour"])
