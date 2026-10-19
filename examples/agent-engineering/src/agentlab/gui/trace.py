"""Lesson 18.3: a trace of every browser action that never holds a secret.

Traces get copied into bug reports, dashboards and evaluation sets, so a
password written once into a trace is a password published. ``record`` scrubs
every string in an event against the run's secrets before the event exists,
which also catches a secret that leaks through a field nobody marked as
secret, such as a URL.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime

from pydantic import JsonValue

from agentlab.domain import ExecutionEvent


def scrub(value: JsonValue, secrets: tuple[str, ...]) -> JsonValue:
    """Replace every secret inside strings, lists and dicts with ``[secret]``."""
    if isinstance(value, str):
        for secret in secrets:
            value = value.replace(secret, "[secret]")
        return value
    if isinstance(value, list):
        return [scrub(item, secrets) for item in value]
    if isinstance(value, dict):
        return {key: scrub(item, secrets) for key, item in value.items()}
    return value


@dataclass
class Trace:
    run_id: str
    secrets: tuple[str, ...] = field(repr=False)
    clock: Callable[[], datetime] = field(repr=False)
    events: list[ExecutionEvent] = field(default_factory=list)

    def record(self, kind: str, **data: JsonValue) -> None:
        clean = {key: scrub(value, self.secrets) for key, value in data.items()}
        self.events.append(ExecutionEvent(run_id=self.run_id, seq=len(self.events), kind=kind, at=self.clock(), data=clean))

    def text(self) -> str:
        return json.dumps([event.model_dump(mode="json") for event in self.events])
