"""Lesson 24.1: name the failure before choosing what to do about it.

Four answers are possible. ``stop`` hands the failure to a person or to the
caller with a reason. ``retry`` repeats the same request later. ``reconcile``
asks the other side what happened before anything is sent again (lesson
14.4). ``fallback`` names a reviewed equivalent route as a *candidate*; the
gate in ``agentlab.resilience.fallback`` decides whether it may run.

The error strings use ``agentlab.model.OpenAICompatibleModel``'s prefixes
(``transport:``, ``http:``, ``protocol:``). The adapter cannot know which
route it called in the API's contract, whether the call writes, or what the
``Retry-After`` header said, so the controller that made the call fills those
fields in ``Failure``.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Literal

Action = Literal["stop", "retry", "reconcile", "fallback"]
Effect = Literal["read", "write"]

# The server declined or broke before answering; the request may be repeated if repeating is safe.
TRANSIENT = frozenset({408, 429, 500, 502, 503, 504})


@dataclass(frozen=True)
class Failure:
    """One failed call, as the controller saw it."""

    error: str
    route: str
    effect: Effect
    idempotency_key: str | None = None
    retry_after: str | None = None


@dataclass(frozen=True)
class Contract:
    """The routes this client was built against, and those the API owner has retired.

    ``retired`` maps a route to the name of an equivalent a person reviewed, or
    to None. A route is retired because someone recorded it, never because it
    answered 404 once.
    """

    live: frozenset[str]
    retired: Mapping[str, str | None]


@dataclass(frozen=True)
class Verdict:
    action: Action
    reason: str
    wait_s: float | None = None
    equivalent: str | None = None


def retry_after_seconds(value: str | None, now: datetime) -> float | None:
    """Seconds to wait from a ``Retry-After`` value (delay-seconds or an HTTP-date), or None if absent or invalid."""
    if value is None:
        return None
    value = value.strip()
    if re.fullmatch(r"[0-9]+", value):
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if when.tzinfo is None:
        return None  # an HTTP-date is always GMT; a date without a zone is not one
    return max(0.0, (when - now).total_seconds())


def classify(failure: Failure, contract: Contract, now: datetime) -> Verdict:
    """Choose what to do about one failure. Anything not recognised stops."""
    kind, _, detail = failure.error.partition(": ")
    if kind == "protocol":
        return Verdict("stop", f"malformed reply ({detail}); the same request would get the same reply")
    if kind == "transport":
        return _repeat_if_safe(failure, f"no reply arrived ({detail})", None)
    status = re.fullmatch(r"status ([0-9]{3})", detail)
    if kind != "http" or status is None:
        return Verdict("stop", f"unrecognised failure {failure.error!r}")
    code = int(status.group(1))
    if code == 401:
        return Verdict("stop", "credentials missing or rejected; the controller must authenticate again")
    if code == 403:
        return Verdict("stop", "forbidden; repeating with the same credentials will not change the answer")
    if code in (404, 410):
        return _not_found(failure, contract, code)
    if code in TRANSIENT:
        return _repeat_if_safe(failure, f"HTTP {code}", retry_after_seconds(failure.retry_after, now))
    return Verdict("stop", f"HTTP {code} is a problem with the request, which a retry repeats")


def _not_found(failure: Failure, contract: Contract, code: int) -> Verdict:
    if failure.route in contract.retired:
        equivalent = contract.retired[failure.route]
        if failure.effect == "write":
            return Verdict("stop", f"{failure.route} is retired; a write is never moved to another channel")
        if equivalent is None:
            return Verdict("stop", f"{failure.route} is retired and has no approved equivalent")
        return Verdict("fallback", f"{failure.route} is retired (HTTP {code})", equivalent=equivalent)
    if failure.route not in contract.live:
        return Verdict("stop", f"wrong route: {failure.route} is not in the contract this client was built against")
    return Verdict("stop", f"HTTP {code}: the resource is missing or not visible to this principal")


def _repeat_if_safe(failure: Failure, what: str, wait_s: float | None) -> Verdict:
    """A read can be repeated; a write only with an idempotency key, otherwise ask first."""
    if failure.effect == "write" and failure.idempotency_key is None:
        return Verdict("reconcile", f"{what} on a write without an idempotency key: find out whether it happened")
    return Verdict("retry", what, wait_s=wait_s)
