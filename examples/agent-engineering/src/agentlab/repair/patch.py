"""Lesson 21.3: what a repair may change, checked before anything runs.

A patch replaces one whole file and says why (its hypothesis). It is refused
when it touches a test, leaves the allowed files, changes nothing, repeats an
earlier attempt, or changes more lines than a minimal fix needs. Tests are
read-only whatever the allowed list says: a repair that edits the check it
must pass has not repaired anything.
"""

from __future__ import annotations

import difflib
import hashlib
from collections.abc import Collection, Mapping

from pydantic import Field

from agentlab.domain import Record

MAX_CHANGED_LINES = 10  # removed plus added lines; a larger change is a rewrite, and a person should read it


class Patch(Record):
    hypothesis: str = Field(min_length=10, max_length=500)
    # A bare module name: no directory, so no path can leave the project.
    path: str = Field(pattern=r"^[a-z_][a-z0-9_]*\.py$")
    content: str = Field(max_length=20_000)

    @property
    def sha256(self) -> str:
        return hashlib.sha256(f"{self.path}\0{self.content}".encode()).hexdigest()


def is_test(path: str) -> bool:
    """unittest's default discovery pattern, test*.py."""
    return path.startswith("test")


def changed_lines(before: str, after: str) -> int:
    diff = difflib.unified_diff(before.splitlines(), after.splitlines(), lineterm="", n=0)
    return sum(1 for line in diff if line[:1] in "+-" and not line.startswith(("+++", "---")))


def check_patch(patch: Patch, project: Mapping[str, str], allowed: Collection[str], seen: Collection[str] = ()) -> str | None:
    """Why ``patch`` is refused, or None if it may run."""
    if is_test(patch.path):
        return f"tests are read-only: {patch.path}"
    if patch.path not in allowed:
        return f"outside the allowed files: {patch.path}"
    before = project.get(patch.path, "")
    if patch.content == before:
        return "changes nothing"
    if patch.sha256 in seen:
        return "repeats an earlier attempt"
    changed = changed_lines(before, patch.content)
    if changed > MAX_CHANGED_LINES:
        return f"too large: {changed} changed lines, at most {MAX_CHANGED_LINES}"
    return None


def apply(project: Mapping[str, str], patch: Patch) -> dict[str, str]:
    """A new snapshot; the original is never modified, so every attempt starts clean."""
    return {**project, patch.path: patch.content}
