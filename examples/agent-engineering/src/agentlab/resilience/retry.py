"""Lesson 24.2: retry without turning an outage into a retry storm.

Three limits work together. Full jitter spreads each client's waits over
``[0, min(cap, base * 2**attempt)]``, the shape of ``ExpoBackoffFullJitter``
in the simulator behind AWS's 2015 backoff post, so clients that failed
together do not retry together. A ``RetryBudget`` caps retries per time
window for the whole process, whatever each call's own attempt limit says.
A ``CircuitBreaker`` stops calling a dependency that keeps failing and lets
one trial call through after a pause.

Every clock and the sleep are injected, so a test simulates ten minutes of
outage in milliseconds and counts exactly how many calls reached the provider.
"""

from __future__ import annotations

import random
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Literal, TypeVar

from agentlab.resilience.classify import Contract, Failure, Verdict, classify

T = TypeVar("T")
Clock = Callable[[], datetime]


def full_jitter(attempt: int, *, base_s: float, cap_s: float, rng: random.Random) -> float:
    """Seconds to wait before retry number ``attempt + 1``: uniform between zero and the capped exponential."""
    return rng.uniform(0.0, min(cap_s, base_s * 2**attempt))


@dataclass
class RetryBudget:
    """At most ``limit`` retries in any ``window``, shared by every call in the process."""

    limit: int
    window: timedelta
    clock: Clock
    _spent: deque[datetime] = field(default_factory=deque)

    def try_spend(self) -> bool:
        now = self.clock()
        while self._spent and now - self._spent[0] >= self.window:
            self._spent.popleft()
        if len(self._spent) >= self.limit:
            return False
        self._spent.append(now)
        return True


@dataclass
class CircuitBreaker:
    """closed: calls go through. open: calls fail at once. half_open: one trial call decides."""

    threshold: int
    open_for: timedelta
    clock: Clock
    state: Literal["closed", "open", "half_open"] = "closed"
    failures: int = 0
    opened_at: datetime | None = None
    trial_running: bool = False

    def allow(self) -> bool:
        if self.state == "open" and self.opened_at is not None and self.clock() - self.opened_at >= self.open_for:
            self.state, self.trial_running = "half_open", False
        if self.state == "closed":
            return True
        if self.state == "half_open" and not self.trial_running:
            self.trial_running = True
            return True
        return False

    def record(self, *, ok: bool) -> None:
        if ok:
            self.state, self.failures, self.trial_running = "closed", 0, False
            return
        self.failures += 1
        if self.state == "half_open" or self.failures >= self.threshold:
            self.state, self.opened_at, self.trial_running = "open", self.clock(), False


@dataclass(frozen=True)
class CallResult:
    value: object | None
    verdict: Verdict | None  # None when the call succeeded
    attempts: int

    @property
    def ok(self) -> bool:
        return self.verdict is None


def call_with_retries(call: Callable[[], T | Failure], *, contract: Contract, max_attempts: int, breaker: CircuitBreaker,
                      budget: RetryBudget, rng: random.Random, clock: Clock, sleep: Callable[[float], None],
                      base_s: float = 0.5, cap_s: float = 30.0, max_wait_s: float = 60.0) -> CallResult:
    """Call until success, a verdict other than retry, or a limit. ``call`` returns a value or a ``Failure``."""
    for attempt in range(max_attempts):
        if not breaker.allow():
            return CallResult(None, Verdict("stop", f"circuit open since {breaker.opened_at}; not calling"), attempt)
        result = call()
        if not isinstance(result, Failure):
            breaker.record(ok=True)
            return CallResult(result, None, attempt + 1)
        verdict = classify(result, contract, clock())
        # Only retry and reconcile verdicts say the dependency is unwell; a 403 or 404 is a healthy answer.
        breaker.record(ok=verdict.action in ("stop", "fallback"))
        if verdict.action != "retry":
            return CallResult(None, verdict, attempt + 1)
        if attempt + 1 == max_attempts:
            return CallResult(None, Verdict("stop", f"gave up after {max_attempts} attempts: {verdict.reason}"), max_attempts)
        wait = max(verdict.wait_s or 0.0, full_jitter(attempt, base_s=base_s, cap_s=cap_s, rng=rng))
        if wait > max_wait_s:
            return CallResult(None, Verdict("stop", f"asked to wait {wait:.0f} s, longer than this call may wait"), attempt + 1)
        if not budget.try_spend():
            return CallResult(None, Verdict("stop", f"retry budget spent: {verdict.reason}"), attempt + 1)
        sleep(wait)
    raise ValueError("max_attempts must be at least 1")
