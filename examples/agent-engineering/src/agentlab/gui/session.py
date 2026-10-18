"""Lesson 18.3: credentials bound to one origin, and the page states that stop a run.

The vault follows lesson 16.4's credential broker: the model never holds the
password. The controller asks the vault for the credential of the page it is
on, and the vault answers only for the exact origin it was registered with,
so a lookalike login page on another port or host gets nothing.

``classify_page`` turns an observation into one of three states. Only
``ready`` lets the run act. An expired session is ``needs_login``: the run
pauses and the controller decides whether to sign in again, instead of the
agent repeating a click that now lands on the login page. A one-time code,
a CAPTCHA or a page outside the portal is ``needs_human``: nothing here
tries to get past them.
"""

from __future__ import annotations

import urllib.parse
from dataclasses import dataclass, field
from typing import Literal

PageState = Literal["ready", "needs_login", "needs_human"]

HUMAN_CHALLENGES = ("one-time code", "verification code", "captcha", "verify you are human")


def origin_of(url: str) -> str:
    parts = urllib.parse.urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}"


@dataclass(frozen=True)
class Credential:
    username: str
    password: str = field(repr=False)


@dataclass(frozen=True)
class CredentialVault:
    """Credentials keyed by exact origin (scheme, host and port)."""

    by_origin: dict[str, Credential] = field(repr=False)

    def release(self, page_url: str) -> Credential:
        credential = self.by_origin.get(origin_of(page_url))
        if credential is None:
            raise PermissionError(f"no credential for {origin_of(page_url)}")
        return credential


def classify_page(url: str, snapshot: str, portal_origin: str) -> PageState:
    """Decide from the URL and the accessibility snapshot whether the run may act on this page."""
    if origin_of(url) != portal_origin:
        return "needs_human"
    text = snapshot.lower()
    if any(challenge in text for challenge in HUMAN_CHALLENGES):
        return "needs_human"
    if urllib.parse.urlsplit(url).path == "/login":
        return "needs_login"
    return "ready"
