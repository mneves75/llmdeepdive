"""Lesson 17.4: the interpreter contract between the controller and a sandbox backend.

The controller sends an ``InterpreterRequest`` and receives an
``InterpreterResponse``. What runs in between is a backend: here a subprocess
(lesson 17.2), and in the reference design a Firecracker microVM that receives
the same JSON over vsock. Every run gets a new workspace, and the workspace is
destroyed when the run ends, whatever happened inside.

Outputs are untrusted. Artifacts are read without following symlinks, counted
and size-capped, so a guest cannot turn "collect my results" into "read a host
file" or "flood the controller".
"""

from __future__ import annotations

import hashlib
import os
import re
import stat
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from pydantic import ConfigDict, Field

from agentlab.domain import Record, Sha256
from agentlab.sandbox.process import Limits, run_python

ARTIFACT_NAME = re.compile(r"[A-Za-z0-9._-]{1,64}")


class InputFile(Record):
    # A bare name: no directory, no "..", and never main.py, so an input cannot overwrite the script.
    name: str = Field(pattern=r"^[a-z0-9_-]{1,40}\.csv$")
    content: str = Field(max_length=1_000_000)


class InterpreterRequest(Record):
    request_id: str = Field(pattern=r"^[A-Za-z0-9-]{1,64}$")
    code: str = Field(min_length=1, max_length=20_000)
    files: tuple[InputFile, ...] = Field(default=(), max_length=8)


class Artifact(Record):
    model_config = ConfigDict(ser_json_bytes="base64", val_json_bytes="base64")

    name: str = Field(pattern=f"^{ARTIFACT_NAME.pattern}$")
    size: int = Field(ge=0)
    sha256: str = Sha256
    content: bytes


class InterpreterResponse(Record):
    request_id: str
    exit_code: int
    timed_out: bool
    stdout: str  # already cut to Limits.max_file_bytes by the backend
    stderr: str
    output_truncated: bool
    memory_limited: bool  # False where the OS refused the address-space limit
    artifacts: tuple[Artifact, ...]
    rejected: tuple[str, ...]  # outputs not collected, with the reason


class Backend(Protocol):
    def run(self, request: InterpreterRequest) -> InterpreterResponse: ...


@dataclass(frozen=True)
class SubprocessBackend:
    """Resource limits only; lesson 17.5 measures what it does not isolate."""

    limits: Limits = field(default_factory=Limits)
    max_artifacts: int = 8
    max_artifact_bytes: int = 256 * 1024
    temp_root: Path | None = None

    def run(self, request: InterpreterRequest) -> InterpreterResponse:
        # create -> upload -> execute -> collect -> destroy; the with-block destroys the
        # exact directory it created, on success, on timeout and on an exception.
        with tempfile.TemporaryDirectory(prefix="agentlab-sandbox-", dir=self.temp_root) as root:
            workdir = Path(root)
            for item in request.files:
                (workdir / item.name).write_text(item.content, encoding="utf-8")
            (workdir / "out").mkdir()
            result = run_python(request.code, workdir, self.limits)
            artifacts, rejected = collect_artifacts(workdir / "out", self.max_artifacts, self.max_artifact_bytes)
        return InterpreterResponse(
            request_id=request.request_id,
            exit_code=result.exit_code,
            timed_out=result.timed_out,
            stdout=result.stdout.decode("utf-8", errors="replace"),
            stderr=result.stderr.decode("utf-8", errors="replace"),
            output_truncated=result.stdout_truncated or result.stderr_truncated,
            memory_limited=result.memory_limited,
            artifacts=tuple(artifacts),
            rejected=tuple(rejected),
        )


def collect_artifacts(out: Path, max_count: int, max_bytes: int) -> tuple[list[Artifact], list[str]]:
    """Regular files directly in ``out``, in name order, within a count and a total-size budget."""
    if out.is_symlink() or not out.is_dir():
        return [], ["out: not a directory"]
    artifacts: list[Artifact] = []
    rejected: list[str] = []
    budget = max_bytes
    for name in sorted(os.listdir(out)):
        if not ARTIFACT_NAME.fullmatch(name):
            rejected.append(f"{name!r}: not an allowed name")
            continue
        if len(artifacts) == max_count:
            rejected.append(f"{name}: over the artifact count limit")
            continue
        try:
            # O_NOFOLLOW: a symlink fails instead of being read through.
            # O_NONBLOCK: a FIFO the guest left behind cannot hang the controller.
            fd = os.open(out / name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        except OSError:
            rejected.append(f"{name}: not a regular file")
            continue
        with os.fdopen(fd, "rb") as file:
            info = os.fstat(file.fileno())
            if not stat.S_ISREG(info.st_mode):
                rejected.append(f"{name}: not a regular file")
                continue
            if info.st_size > budget:
                rejected.append(f"{name}: over the artifact size budget")
                continue
            data = file.read(budget + 1)[:budget]
        budget -= len(data)
        artifacts.append(Artifact(name=name, size=len(data), sha256=hashlib.sha256(data).hexdigest(), content=data))
    return artifacts, rejected
