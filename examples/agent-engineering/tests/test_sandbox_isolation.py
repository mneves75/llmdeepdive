"""Lesson 17.1: resource limits are not isolation.

The same run is bounded (the CPU loop dies) and not isolated (it reads a host
file it was never given). Both facts hold at once; neither cancels the other.
"""

import tempfile
import unittest
from pathlib import Path

from agentlab.sandbox.process import Limits, run_python


class LimitsAreNotABoundary(unittest.TestCase):
    def setUp(self):
        self.host = tempfile.TemporaryDirectory()
        self.secret = Path(self.host.name) / "host-secret.txt"
        self.secret.write_text("host-only data\n", encoding="utf-8")
        self.workdir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.workdir.cleanup()
        self.host.cleanup()

    def test_the_limits_are_applied(self):
        result = run_python("while True:\n    pass", Path(self.workdir.name), Limits(cpu_seconds=1, wall_seconds=20))
        # Not the wall clock: the timeout also ends in SIGKILL, so check which limit fired.
        self.assertFalse(result.timed_out)
        self.assertIn(result.signal, {"SIGXCPU", "SIGKILL"})

    def test_the_same_process_reads_a_host_file_it_was_never_given(self):
        # The file lives outside the working directory; nobody passed it in.
        code = f"print(open({str(self.secret)!r}).read(), end='')"
        result = run_python(code, Path(self.workdir.name))
        self.assertEqual(result.stdout, b"host-only data\n")

    def test_positive_control_a_missing_file_is_an_error(self):
        # Proves the read above found the real file, not something the script made up.
        code = f"open({str(self.secret) + '.missing'!r})"
        result = run_python(code, Path(self.workdir.name))
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn(b"FileNotFoundError", result.stderr)
