"""Lesson 24.3: when a retired API route may be replaced by the legacy portal.

The fallback is a detour, and it must reach the same permitted destination.
It runs only when lesson 24.1's classifier names a reviewed equivalent for a
retired *read* route, when the portal account maps to exactly the run's
``Principal`` (same user, tenant and roles), and when that principal holds
the permission the API route required. The browser then presses a button
fixed in code, never one a model chose, and its result counts only if track
18's checks accepted the downloaded file.

Nothing here imports Playwright: the browser step arrives as a function, so
the core suite tests the gate and ``tests_browser`` runs it against the real
synthetic portal with ``agentlab.gui.browser.fetch_report``.
"""

from __future__ import annotations

import calendar
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from agentlab.domain import Principal
from agentlab.gui.control import Outcome, Target
from agentlab.resilience.classify import Contract, Failure, Verdict, classify


@dataclass(frozen=True)
class Equivalent:
    """A browser route a person reviewed as doing what one retired API route did, with the same permission."""

    name: str
    replaces: str
    required_role: str


EQUIVALENTS = {
    "portal_report_download": Equivalent("portal_report_download", replaces="GET /v1/reports/{period}", required_role="reports_reader"),
}


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str
    equivalent: Equivalent | None = None


@dataclass(frozen=True)
class ReportResult:
    source: Literal["api", "browser", "none"]
    rows: tuple[dict[str, str], ...]
    reason: str


def report_target(period: str) -> Target:
    """The one button that exports ``period`` ("2026-03" -> "Download March 2026 CSV")."""
    match = re.fullmatch(r"(\d{4})-(0[1-9]|1[0-2])", period)
    if match is None:
        raise ValueError(f"not a report period: {period!r}")
    return Target(role="button", name=f"Download {calendar.month_name[int(match.group(2))]} {match.group(1)} CSV")


def may_fall_back(verdict: Verdict, failure: Failure, *, principal: Principal, portal_account: str,
                  accounts: Mapping[str, Principal]) -> Decision:
    """Every condition must hold; the first one that fails is the reason given."""
    if verdict.action != "fallback":
        return Decision(False, f"24.1 said {verdict.action}: {verdict.reason}")
    equivalent = EQUIVALENTS.get(verdict.equivalent or "")
    if equivalent is None or equivalent.replaces != failure.route or failure.effect != "read":
        return Decision(False, f"no reviewed read equivalent for {failure.route}")
    acting = accounts.get(portal_account)
    if acting is None:
        return Decision(False, f"portal account {portal_account!r} is not mapped to a principal")
    if acting != principal:
        return Decision(False, "the portal session would act as a different principal (user, tenant or roles)")
    if equivalent.required_role not in principal.roles:
        return Decision(False, f"{principal.user_id} lacks {equivalent.required_role}, which the API route required too")
    return Decision(True, f"{equivalent.name} replaces {failure.route}", equivalent)


def read_report(period: str, *, api: Callable[[str], Sequence[dict[str, str]] | Failure], contract: Contract, now: datetime,
                principal: Principal, portal_account: str, accounts: Mapping[str, Principal],
                browser: Callable[[Target, str], Outcome]) -> ReportResult:
    """Ask the API; on failure, use the portal only if ``may_fall_back`` allows it. Retrying is lesson 24.2's job."""
    answer = api(period)
    if not isinstance(answer, Failure):
        return ReportResult("api", tuple(answer), "the API answered")
    decision = may_fall_back(classify(answer, contract, now), answer, principal=principal,
                             portal_account=portal_account, accounts=accounts)
    if not decision.allowed:
        return ReportResult("none", (), decision.reason)
    outcome = browser(report_target(period), period)
    if outcome.status != "done":
        return ReportResult("none", (), f"the fallback did not produce a verified report: {outcome.reason}")
    return ReportResult("browser", outcome.rows, f"{decision.reason}: {outcome.reason}")
