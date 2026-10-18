"""Lesson 17.5: measure what a backend actually allows, instead of trusting its description.

Each probe is a short guest script; the controller compares what it printed
with the marker that means "the guest could do this". The result is a table of
observed facts for an architecture decision record. Network probes are left out
on purpose: they need a destination you control and a host-level firewall to
test against (lesson 17.3).
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from agentlab.sandbox.interpreter import Backend, InterpreterRequest

FORK = """
import os
pid = os.fork()
if pid == 0:
    os._exit(0)
os.waitpid(pid, 0)
print("started")
"""

FLOOD = 32 * 1024 * 1024  # bytes the output probe writes


def probe_boundary(backend: Backend) -> dict[str, bool]:
    with tempfile.TemporaryDirectory(prefix="agentlab-probe-") as host:
        # A file the guest was never given, outside any workspace.
        secret = Path(host) / "host-secret.txt"
        secret.write_text("host-only data", encoding="utf-8")
        probes = {
            "reads_host_file": (f"print(open({str(secret)!r}).read())", "host-only data\n"),
            "inherits_environment": ("import os\nprint('PATH' in os.environ or 'HOME' in os.environ)", "True\n"),
            "starts_processes": (FORK, "started\n"),
        }
        report = {name: _stdout(backend, name, code) == marker for name, (code, marker) in probes.items()}
    report["output_bounded"] = len(_stdout(backend, "output", f"import sys\nsys.stdout.write('x' * {FLOOD})")) < FLOOD
    return report


def _stdout(backend: Backend, probe: str, code: str) -> str:
    return backend.run(InterpreterRequest(request_id=f"probe-{probe.replace('_', '-')}", code=code)).stdout
