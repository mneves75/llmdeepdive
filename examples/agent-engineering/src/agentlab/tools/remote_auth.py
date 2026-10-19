"""Lesson 15.5: what a remote (HTTP) MCP server checks on an access token's claims.

This is a fixture, not an authorization server or a token library. It takes
claims that a maintained library has *already* verified (signature, issuer,
algorithm) and makes the four decisions the lesson is about: is the token
for this server (audience), does it carry the needed scopes, has it expired,
and was it revoked. It does no cryptography and no OAuth flow; never use it
in place of a real library.

Failures map to the HTTP answers the MCP authorization spec requires: 401
for an invalid, expired or revoked token, 403 for a valid token with too
few scopes.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class AccessClaims(BaseModel):
    # Strict types, but extra claims are ignored: real tokens carry many we do not use.
    model_config = ConfigDict(strict=True, extra="ignore", frozen=True)

    iss: str = Field(min_length=1)
    sub: str = Field(min_length=1)
    aud: str | list[str] = Field(min_length=1)
    scope: str = ""
    exp: int
    jti: str = Field(min_length=1)


@dataclass(frozen=True)
class Decision:
    allowed: bool
    status: int
    error: str | None = None
    www_authenticate: str | None = None
    subject: str | None = None


def check_access(claims: dict, *, resource: str, required_scopes: frozenset[str], now: datetime, revoked: frozenset[str]) -> Decision:
    """Decide on one request. ``now`` is injected so expiry is tested without waiting."""
    try:
        token = AccessClaims.model_validate(claims)
    except ValidationError:
        return _invalid("malformed claims")
    audiences = [token.aud] if isinstance(token.aud, str) else token.aud
    if resource not in audiences:
        return _invalid("token was issued for another resource")  # the audience check MCP requires (RFC 8707)
    if token.exp <= int(now.timestamp()):
        return _invalid("token expired")
    if token.jti in revoked:
        return _invalid("token revoked")
    if not required_scopes <= set(token.scope.split()):
        needed = " ".join(sorted(required_scopes))
        return Decision(False, 403, "insufficient_scope", f'Bearer error="insufficient_scope", scope="{needed}"')
    return Decision(True, 200, subject=token.sub)


def _invalid(description: str) -> Decision:
    return Decision(False, 401, "invalid_token", f'Bearer error="invalid_token", error_description="{description}"')
