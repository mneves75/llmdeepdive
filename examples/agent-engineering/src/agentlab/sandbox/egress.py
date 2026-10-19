"""Lesson 17.3: deciding whether one outbound connection is allowed.

Default deny: only (host, port) pairs on the allowlist pass, and only when every
address the name resolves to is public. The caller connects to the returned
address, never to the name again, so a second DNS answer cannot swap in a
metadata or private address after the check (DNS rebinding).

This is a policy decision, not enforcement. Code inside a sandbox can open any
socket it likes; only host or VM controls (a firewall on the TAP device, a
network namespace with no route) actually drop the packets.
"""

from __future__ import annotations

import ipaddress
from collections.abc import Callable, Sequence
from dataclasses import dataclass

Address = ipaddress.IPv4Address | ipaddress.IPv6Address
Resolver = Callable[[str], Sequence[str]]

# IANA lists RFC 6052's well-known NAT64 prefix as globally reachable, so is_global calls it
# public, but a NAT64 gateway turns 64:ff9b::a9fe:a9fe into 169.254.169.254.
NAT64 = ipaddress.IPv6Network("64:ff9b::/96")


@dataclass(frozen=True)
class EgressPolicy:
    allowed: frozenset[tuple[str, int]]  # (lowercase host name, port)


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str
    address: str | None = None  # connect to exactly this address


def check_egress(host: str, port: int, policy: EgressPolicy, resolve: Resolver) -> Decision:
    name = host.lower().rstrip(".")
    if (name, port) not in policy.allowed:
        return Decision(False, f"{name}:{port} is not on the allowlist")
    answers = [ipaddress.ip_address(a) for a in resolve(name)]  # resolved once, then pinned
    if not answers:
        return Decision(False, f"{name} has no addresses")
    for address in answers:
        if not is_public(address):
            return Decision(False, f"{name} resolved to non-public {address}")
    return Decision(True, "allowed", str(answers[0]))


def is_public(address: Address) -> bool:
    """Globally reachable, judging an IPv4 address carried inside IPv6 by the IPv4 part."""
    if isinstance(address, ipaddress.IPv6Address) and address in NAT64:
        return ipaddress.IPv4Address(int(address) & 0xFFFFFFFF).is_global
    # Python 3.13 judges ::ffff:a.b.c.d by its IPv4 part; 6to4 (2002::/16) is not global.
    return address.is_global
