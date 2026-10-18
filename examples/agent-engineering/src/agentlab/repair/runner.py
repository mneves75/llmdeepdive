"""Run a project's tests in lesson 17.2's resource-limited subprocess.

A project is a snapshot: a mapping from bare file name to text. Every run
writes the snapshot to a new, empty directory, so no attempt sees what an
earlier attempt changed. The child prints one JSON summary line after the
tests; a run that ends before printing it has not reported, whatever its exit
code says.

The code under test runs in the same process as the test runner, so it can
change what the runner reports. These checks catch honest mistakes; they are
not a defence against a patch written to fake its own results.
"""

from __future__ import annotations

import json
import tempfile
from collections.abc import Mapping
from dataclasses import dataclass
from importlib.resources import files
from pathlib import Path

from agentlab.sandbox.process import Limits, SandboxSetupError, run_python

_FIXTURES = files("agentlab.fixtures") / "repair"

# Runs as the child's main.py. -I keeps the working directory off sys.path, so it is added back.
_RUNNER = """
import json, sys, unittest
sys.path.insert(0, ".")
suite = unittest.defaultTestLoader.loadTestsFromNames({names})
def ids(tests):
    for test in tests:
        yield from ids(test) if isinstance(test, unittest.TestSuite) else [test.id()]
every = list(ids(suite))
result = unittest.TextTestRunner(stream=sys.stderr, verbosity=2).run(suite)
bad = {{test.id() for test, _ in result.failures + result.errors}} | {{test.id() for test in result.unexpectedSuccesses}}
skipped = {{test.id() for test, _ in result.skipped}}
print(json.dumps({{"ran": result.testsRun, "passed": [i for i in every if i not in bad | skipped], "failed": sorted(bad), "skipped": sorted(skipped)}}))
"""


@dataclass(frozen=True)
class TestRun:
    __test__ = False  # not a unittest case, despite the name

    exit_code: int
    timed_out: bool
    stderr: str  # file paths relative to the project
    ran: int | None = None  # None: the run never printed its summary
    passed: frozenset[str] = frozenset()
    failed: frozenset[str] = frozenset()
    skipped: frozenset[str] = frozenset()
    setup_error: str | None = None


def _load(folder: str) -> dict[str, str]:
    return {entry.name: entry.read_text(encoding="utf-8") for entry in (_FIXTURES / folder).iterdir() if entry.name.endswith(".py")}


def load_project() -> dict[str, str]:
    """The synthetic pricing module with its visible tests: the snapshot every repair starts from."""
    return _load("project")


def load_held_out() -> dict[str, str]:
    """Tests the repair loop never sees (lesson 21.5)."""
    return _load("held_out")


def run_suite(project: Mapping[str, str], tests: tuple[str, ...], limits: Limits = Limits()) -> TestRun:
    """Write ``project`` to a new directory and run the named test modules there."""
    with tempfile.TemporaryDirectory(prefix="agentlab-repair-") as tmp:
        workdir = Path(tmp)
        for name, text in project.items():
            if Path(name).name != name or name == "main.py":
                raise ValueError(f"not a bare project file name: {name!r}")
            (workdir / name).write_text(text, encoding="utf-8")
        try:
            result = run_python(_RUNNER.format(names=json.dumps(list(tests))), workdir, limits)
        except SandboxSetupError as error:
            return TestRun(exit_code=125, timed_out=False, stderr="", setup_error=str(error))
        stderr = result.stderr.decode("utf-8", errors="replace")
        # Longest first: on macOS /var is a link to /private/var, and both spellings appear.
        for prefix in sorted({str(workdir.resolve()) + "/", str(workdir) + "/"}, key=len, reverse=True):
            stderr = stderr.replace(prefix, "")  # host paths say nothing about the bug
    summary = _summary(result.stdout.decode("utf-8", errors="replace"))
    if summary is None:
        return TestRun(result.exit_code, result.timed_out, stderr)
    return TestRun(
        result.exit_code, result.timed_out, stderr,
        ran=summary["ran"], passed=frozenset(summary["passed"]), failed=frozenset(summary["failed"]), skipped=frozenset(summary["skipped"]),
    )


def _summary(stdout: str) -> dict | None:
    """The last stdout line, if it is the runner's summary."""
    lines = stdout.strip().splitlines()
    try:
        summary = json.loads(lines[-1]) if lines else None
    except json.JSONDecodeError:
        return None
    return summary if isinstance(summary, dict) and set(summary) == {"ran", "passed", "failed", "skipped"} else None
