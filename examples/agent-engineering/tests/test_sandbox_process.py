"""Lesson 17.2: resource limits on an untrusted Python subprocess.

Each negative test has a positive control next to it, so a broken script or a
missing interpreter cannot make the negative pass by accident. These tests use
real processes and real time: a subprocess timeout cannot take an injected clock.
"""

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

from agentlab.sandbox.process import Limits, SandboxSetupError, run_python

FORK_EIGHT = """
import os
made = 0
try:
    for _ in range(8):
        pid = os.fork()
        if pid == 0:
            os._exit(0)
        os.waitpid(pid, 0)
        made += 1
except BlockingIOError:
    print("fork refused after", made)
else:
    print("forked", made)
"""

# Bounded even if the limit fails: at most 64 x 16 MiB = 1 GiB of address space.
GROW_TO_ONE_GIB = """
chunks = []
for _ in range(64):
    chunks.append(bytearray(16 * 1024 * 1024))
print("grew to 1 GiB")
"""


def running(pid: int) -> bool:
    """Alive and not a zombie. In a container without an init, a killed orphan stays a zombie."""
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    stat = Path(f"/proc/{pid}/stat")  # Linux only; macOS's launchd reaps orphans at once
    return not (stat.exists() and stat.read_text().rsplit(")", 1)[1].split()[0] == "Z")


class Sandboxed(unittest.TestCase):
    def run_code(self, code: str, limits: Limits = Limits()):
        # A new, empty directory per run: nothing from an earlier run is visible.
        with tempfile.TemporaryDirectory(prefix="agentlab-test-") as workdir:
            return run_python(code, Path(workdir), limits)


class ResourceLimits(Sandboxed):
    def test_benign_script_runs(self):
        result = self.run_code("print(sum(range(10)))")
        self.assertEqual(result.exit_code, 0)
        self.assertEqual(result.stdout, b"45\n")
        self.assertFalse(result.timed_out)
        self.assertFalse(result.stdout_truncated)

    def test_busy_loop_is_stopped_by_the_cpu_limit(self):
        started = time.monotonic()
        result = self.run_code("while True:\n    pass", Limits(cpu_seconds=1, wall_seconds=20))
        # The CPU limit, not the wall clock, ended it: SIGXCPU at the soft limit, SIGKILL at the hard one.
        self.assertFalse(result.timed_out)
        self.assertIn(result.signal, {"SIGXCPU", "SIGKILL"})
        self.assertLess(time.monotonic() - started, 15)

    def test_sleeping_loop_is_stopped_by_the_wall_clock(self):
        # Sleeping uses no CPU, so RLIMIT_CPU never fires; only the timeout catches it.
        result = self.run_code("import time\nwhile True:\n    time.sleep(0.1)", Limits(wall_seconds=1))
        self.assertTrue(result.timed_out)
        self.assertEqual(result.signal, "SIGKILL")

    def test_oversized_output_is_cut_at_the_file_limit(self):
        limits = Limits(max_file_bytes=64 * 1024)
        result = self.run_code('import sys\nsys.stdout.write("x" * 10_000_000)', limits)
        self.assertEqual(len(result.stdout), 64 * 1024)
        self.assertTrue(result.stdout_truncated)
        small = self.run_code('print("x" * 100)', limits)
        self.assertFalse(small.stdout_truncated)

    def test_fork_pressure_is_refused(self):
        if os.geteuid() == 0:
            self.skipTest("RLIMIT_NPROC is not enforced for root; run the suite as an ordinary user")
        refused = self.run_code(FORK_EIGHT)
        self.assertEqual(refused.stdout, b"fork refused after 0\n")
        allowed = self.run_code(FORK_EIGHT, Limits(allow_processes=True))
        self.assertEqual(allowed.stdout, b"forked 8\n")

    def test_open_files_are_capped(self):
        code = "files = []\ntry:\n    for _ in range(200):\n        files.append(open('main.py'))\nexcept OSError:\n    print('stopped at', len(files))\nelse:\n    print('opened 200')"
        capped = self.run_code(code, Limits(max_open_files=32))
        self.assertTrue(capped.stdout.startswith(b"stopped at "))
        roomy = self.run_code(code, Limits(max_open_files=512))
        self.assertEqual(roomy.stdout, b"opened 200\n")

    def test_memory_growth_is_stopped_where_the_os_enforces_it(self):
        probe = self.run_code("pass")
        if sys.platform.startswith("linux"):
            self.assertTrue(probe.memory_limited, "Linux supports RLIMIT_AS; the sandbox must apply it")
        if not probe.memory_limited:
            self.skipTest(f"setrlimit(RLIMIT_AS) is refused on {sys.platform}; this OS gives no address-space bound")
        result = self.run_code(GROW_TO_ONE_GIB, Limits(memory_bytes=256 * 1024 * 1024))
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn(b"MemoryError", result.stderr)
        roomy = self.run_code(GROW_TO_ONE_GIB, Limits(memory_bytes=4 * 1024 * 1024 * 1024))
        self.assertEqual(roomy.stdout, b"grew to 1 GiB\n")


class Cleanup(Sandboxed):
    def test_a_background_process_is_killed_with_its_group(self):
        code = "import os, time\npid = os.fork()\nif pid == 0:\n    time.sleep(60)\n    os._exit(0)\nprint(pid)"
        result = self.run_code(code, Limits(allow_processes=True))
        self.assertEqual(result.exit_code, 0)
        left_behind = int(result.stdout)
        # The kill is sent before run_python returns; the OS may need a moment to reap the orphan.
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if not running(left_behind):
                return
            time.sleep(0.02)
        self.fail(f"process {left_behind} survived the run")

    def test_a_limit_that_cannot_be_set_stops_the_run(self):
        with tempfile.TemporaryDirectory() as workdir:
            # setrlimit refuses a negative value on every OS. On Linux it also refuses raising an
            # inherited hard limit, the realistic case; macOS accepted max_open_files=2**62 silently.
            with self.assertRaises(SandboxSetupError):
                run_python("open('ran', 'w').write('yes')", Path(workdir), Limits(max_open_files=-2))
            # Fail closed: the untrusted code never started.
            self.assertFalse((Path(workdir) / "ran").exists())
