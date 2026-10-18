"""Lesson 21.2: turn a test run's output into a small, redacted failure record.

unittest prints each failing test as a block: a ``FAIL:`` or ``ERROR:`` header,
then a traceback whose frames run from the oldest call to the newest, then the
exception. The relevant frame is the newest one inside the project: for a
failed assertion that is the assertion line in the test, for an exception it is
the line in the module that raised it.

Everything in this output is untrusted text. Code under test, and data it
copied from outside, can print anything, including instructions. The parser
extracts a location and an error type; the message travels on only redacted,
bounded and marked as data.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

MAX_MESSAGE = 500  # the same bound as ToolResult.error: a failure cannot flood the context

FRAME = re.compile(r'^  File "(?P<file>[^"]+)", line (?P<line>\d+)(?:, in (?P<function>.+))?$')
HEADER = re.compile(r"^(?P<outcome>FAIL|ERROR): \S+ \((?P<test_id>[\w.]+)\)")
EXCEPTION = re.compile(r"^(?P<type>[A-Za-z_][\w.]*)(?::\s?(?P<rest>.*))?$")
CARETS = re.compile(r"^\s*[\^~]+\s*$")

# shortcut: three common secret shapes, not every secret format; the real control is
# never giving the sandbox a secret (lesson 17.3). Add a pattern when a new shape appears.
SECRETS = (
    re.compile(r"(://)[^/\s:@]+:[^/\s@]+(?=@)"),  # user:password inside a URL
    re.compile(r"(?i)(\bbearer )[\w.~+/-]+=*"),  # an HTTP bearer token
    re.compile(r"(?i)(\b(?:api_?key|token|secret|password)(?:['\"]?: ?['\"]|=))[^\s'\",&]+"),  # key=value, 'key': 'value'
)


@dataclass(frozen=True)
class Frame:
    file: str
    line: int
    function: str | None
    code: str | None


@dataclass(frozen=True)
class Failure:
    test_id: str
    outcome: str  # FAIL: an assert* method failed; ERROR: any other exception
    error_type: str
    message: str  # redacted and bounded; still untrusted
    frame: Frame | None

    @property
    def signature(self) -> str:
        """What stays the same when the same check fails again with different values."""
        where = f"{self.frame.file}:{self.frame.line}" if self.frame else "?"
        return f"{self.test_id}|{self.error_type}|{where}"


def redact(text: str) -> str:
    for pattern in SECRETS:
        text = pattern.sub(r"\1[redacted]", text)  # keep the label, drop the value
    return text


def parse_failure(stderr: str) -> Failure | None:
    """The first failing test in a unittest report, or None if no test failed."""
    for chunk in stderr.split("=" * 70 + "\n"):
        header = HEADER.match(chunk)
        if header is None or "-" * 70 + "\n" not in chunk:
            continue
        traceback = chunk.split("-" * 70 + "\n")[1].rstrip("\n").splitlines()
        return _read_traceback(header["test_id"], header["outcome"], traceback)
    # No test block: the run crashed before unittest reported, for example a syntax error at import.
    if "Traceback (most recent call last):\n" in stderr:
        traceback = stderr.rsplit("Traceback (most recent call last):\n", 1)[1].rstrip("\n").splitlines()
        return _read_traceback("(loading the tests)", "ERROR", traceback)
    return None


def _read_traceback(test_id: str, outcome: str, lines: list[str]) -> Failure:
    frames: list[Frame] = []
    rest = 0  # index of the first line after the last frame and its source line
    for index, line in enumerate(lines):
        match = FRAME.match(line)
        if match is None:
            continue
        nxt = lines[index + 1] if index + 1 < len(lines) else ""
        code = nxt.strip() if nxt.startswith("    ") and not CARETS.match(nxt) else None
        frames.append(Frame(match["file"], int(match["line"]), match["function"], code))
        rest = index + (2 if code is not None else 1)
    tail = [line for line in lines[rest:] if not CARETS.match(line) and not line.startswith("    ")]
    first = EXCEPTION.match(tail[0]) if tail else None
    error_type = first["type"].rsplit(".", 1)[-1] if first else "unknown"
    message = redact("\n".join(tail))[:MAX_MESSAGE]  # redact first, so a cut cannot split a secret
    # Project files carry bare names; library frames keep absolute paths, and the runner is main.py or <...>.
    relevant = next((f for f in reversed(frames) if "/" not in f.file and f.file != "main.py" and not f.file.startswith("<")), None)
    return Failure(test_id, outcome, error_type, message, relevant)
