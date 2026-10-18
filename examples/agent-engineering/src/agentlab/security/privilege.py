"""Lesson 16.4: least privilege for each agent, secrets it never sees, and safe rendering.

- ``ROLE_GRANTS``: each role holds only the tools its job needs. The gate in
  ``agentlab.security.gate`` refuses anything outside the caller's grant.
- ``ExtractedInvoice``: the only shape the mail reader can hand on. A field the
  attacker would like to set has no slot to land in.
- ``CredentialBroker``: attaches a secret to an allowlisted outbound call, so
  the secret never enters the model's context or a tool result.
- ``render_untrusted``: shows outside text to a person as inert text.
"""

from __future__ import annotations

import html
import json
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from decimal import Decimal

from pydantic import Field, JsonValue

from agentlab.domain import Record

ROLE_GRANTS: dict[str, frozenset[str]] = {
    "mail_reader": frozenset({"lookup_po"}),
    "invoice_drafter": frozenset({"lookup_po", "create_invoice_draft"}),
    "records_clerk": frozenset({"lookup_po", "write_purchase_record"}),
}


class ExtractedInvoice(Record):
    """What the mail reader may report about a message: two fields, nothing else."""

    po_id: str = Field(pattern=r"^PO-\d{4}$")
    total: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


Transport = Callable[[str, dict[str, str], dict], JsonValue]


@dataclass
class CredentialBroker:
    """Holds one secret and the only destinations it may be sent to."""

    routes: dict[str, str]  # tool name -> fixed URL; the model cannot choose the destination
    secret: str = field(repr=False)
    transport: Transport = field(repr=False)

    def call(self, tool: str, arguments: dict) -> JsonValue:
        url = self.routes.get(tool)
        if url is None:
            raise PermissionError(f"no credential route for {tool}")
        reply = self.transport(url, {"Authorization": f"Bearer {self.secret}"}, arguments)
        text = json.dumps(reply)
        # A service that echoes the header (in a debug field or an error) must not leak it onward.
        return json.loads(text.replace(self.secret, "[redacted]")) if self.secret in text else reply


MARKDOWN_LINK = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
BARE_URL = re.compile(r"\b(?:https?|javascript|data|file):\S+", re.IGNORECASE)


def render_untrusted(text: str) -> str:
    """Return HTML-safe text with every link and image target removed.

    Escaping stops markup; removing targets stops a reviewer's browser from
    fetching an attacker's URL, which could carry data in its query string.
    """
    text = MARKDOWN_LINK.sub(lambda match: f"{match.group(1)} [link removed]", text)
    return html.escape(BARE_URL.sub("[link removed]", text))
