"""Lesson 17.2: an untrusted Python script in a subprocess with resource limits.

This bounds resources. It is NOT an isolation boundary: the child runs as the
same user, on the same kernel, with the same filesystem and network as the
caller (lesson 17.1 shows it reading a host file). Use it to keep an honest
mistake from eating the machine; put hostile code behind a VM (lesson 17.4).

The limits are set by a small bootstrap inside the child, before the script
starts, instead of ``preexec_fn``, which Python documents as unsafe in a
program with threads. The bootstrap reports through a pipe it closes before the
script runs, so the script cannot forge the report.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


class SandboxSetupError(RuntimeError):
    """A required limit could not be set, so the untrusted code was never started."""


@dataclass(frozen=True)
class Limits:
    cpu_seconds: int = 2
    wall_seconds: float = 10.0
    # Address space. macOS refuses RLIMIT_AS, so this one is applied where the OS allows
    # and reported in RunResult.memory_limited instead of failing every run there.
    memory_bytes: int | None = 256 * 1024 * 1024
    # RLIMIT_FSIZE: caps every file the script writes, stdout and stderr included.
    max_file_bytes: int = 1024 * 1024
    max_open_files: int = 64
    # RLIMIT_NPROC counts every process of the user, so the only portable setting is 0: no new processes.
    allow_processes: bool = False


@dataclass(frozen=True)
class RunResult:
    exit_code: int  # negative: killed by that signal number
    timed_out: bool
    stdout: bytes
    stderr: bytes
    stdout_truncated: bool
    stderr_truncated: bool
    memory_limited: bool

    @property
    def signal(self) -> str | None:
        return signal.Signals(-self.exit_code).name if self.exit_code < 0 else None


# Runs inside the child. Required limits fail closed (exit 125); memory is best effort.
_BOOTSTRAP = """
import json, os, resource, runpy, sys
limits, report = json.loads(sys.argv[1]), int(sys.argv[2])
def cap(name, soft, hard=None):
    resource.setrlimit(getattr(resource, name), (soft, soft if hard is None else hard))
try:
    cap("RLIMIT_CPU", limits["cpu_seconds"], limits["cpu_seconds"] + 1)
    cap("RLIMIT_FSIZE", limits["max_file_bytes"])
    cap("RLIMIT_NOFILE", limits["max_open_files"])
    if not limits["allow_processes"]:
        cap("RLIMIT_NPROC", 0)
except (ValueError, OSError) as error:
    os.write(report, json.dumps({"error": repr(error)}).encode())
    sys.exit(125)
memory_limited = False
if limits["memory_bytes"] is not None:
    try:
        cap("RLIMIT_AS", limits["memory_bytes"])
        memory_limited = True
    except (ValueError, OSError):
        pass
os.write(report, json.dumps({"memory_limited": memory_limited}).encode())
os.close(report)
sys.argv = ["main.py"]
runpy.run_path("main.py", run_name="__main__")
"""


def run_python(code: str, workdir: Path, limits: Limits = Limits()) -> RunResult:
    """Run ``code`` as ``workdir/main.py`` with an empty environment and the given limits.

    The caller owns ``workdir`` and should give every run a new, empty one.
    """
    (workdir / "main.py").write_text(code, encoding="utf-8")
    settings = json.dumps(limits.__dict__)
    report_read, report_write = os.pipe()
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        try:
            child = subprocess.Popen(
                [sys.executable, "-I", "-B", "-c", _BOOTSTRAP, settings, str(report_write)],
                cwd=workdir,
                env={},  # nothing inherited: no tokens, no PATH, no HOME
                stdin=subprocess.DEVNULL,
                stdout=out,  # files, not pipes: RLIMIT_FSIZE bounds them and the parent never buffers a flood
                stderr=err,
                pass_fds=(report_write,),
                start_new_session=True,  # its own process group, so one kill reaches its children
            )
        finally:
            os.close(report_write)
        try:
            child.wait(timeout=limits.wall_seconds)
            timed_out = False
        except subprocess.TimeoutExpired:
            timed_out = True
        _kill_group(child.pid)
        child.wait()
        with os.fdopen(report_read, "rb") as pipe:
            report = json.loads(pipe.read(4096) or b"{}")
        if "memory_limited" not in report:
            raise SandboxSetupError(report.get("error", "the child exited before applying its limits"))
        stdout, stdout_truncated = _read_bounded(out, limits.max_file_bytes)
        stderr, stderr_truncated = _read_bounded(err, limits.max_file_bytes)
    return RunResult(child.returncode, timed_out, stdout, stderr, stdout_truncated, stderr_truncated, report["memory_limited"])


def _kill_group(pgid: int) -> None:
    """Kill the group the child leads: exactly the processes this run started.

    A process that called setsid() has left the group and survives; only a cgroup
    or a VM teardown reaches it. shortcut: the group is killed after the leader is
    reaped on a normal exit, so a recycled pid could in theory be hit; a pidfd or a
    cgroup removes that race.
    """
    try:
        os.killpg(pgid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def _read_bounded(file, limit: int) -> tuple[bytes, bool]:
    """At most ``limit`` bytes, and whether the file reached the limit (treated as cut)."""
    size = file.seek(0, os.SEEK_END)
    file.seek(0)
    return file.read(limit), size >= limit
