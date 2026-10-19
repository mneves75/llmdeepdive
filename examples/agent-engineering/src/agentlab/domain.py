"""Records shared by every track.

The project is a purchasing assistant for a fictional company. It reads a
request and an untrusted supplier message, looks up purchase records, gathers
evidence, proposes an invoice and waits for a person to authorize it. Nothing
here sends a real invoice or moves money.

Two rules hold in every record:

- Identity and permissions come from the trusted runtime (a ``Principal`` the
  controller builds), never from JSON a model wrote.
- Models are strict: wrong types and unknown fields fail validation instead of
  being coerced or ignored. Validation proves shape, not authorization.

Strict mode validates Python objects as they are, so JSON text goes through
``Model.model_validate_json``: ``model_validate(json.loads(text))`` rejects a
``frozenset`` or ``Decimal`` field because JSON has no such types.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, JsonValue

SCHEMA_VERSION = 1

Sha256 = Field(pattern=r"^[0-9a-f]{64}$")


class Record(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)


class Principal(Record):
    """Who a run acts for. Built by the controller from authenticated input."""

    user_id: str = Field(min_length=1, max_length=64)
    tenant_id: str = Field(min_length=1, max_length=64)
    roles: frozenset[str] = frozenset()


class EvidenceRef(Record):
    """A pointer to a stored artifact by content hash, instead of a copy of it."""

    source: str = Field(min_length=1, max_length=200)
    sha256: str = Sha256
    note: str | None = Field(default=None, max_length=500)


class ToolRequest(Record):
    """What a model asked for. Structurally valid is not the same as allowed."""

    schema_version: Literal[1] = SCHEMA_VERSION
    run_id: str = Field(min_length=1, max_length=64)
    operation_id: str = Field(min_length=1, max_length=64)
    tool: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    arguments: dict[str, JsonValue]


class ToolResult(Record):
    operation_id: str = Field(min_length=1, max_length=64)
    ok: bool
    value: JsonValue = None
    # Bounded so a hostile tool cannot flood the context through an error.
    error: str | None = Field(default=None, max_length=500)


class InvoiceDraft(Record):
    invoice_id: str = Field(pattern=r"^INV-[0-9]{4}$")
    version: int = Field(ge=1)
    tenant_id: str = Field(min_length=1, max_length=64)
    payee: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: Literal["USD", "BRL", "EUR"]


class ApprovalRequest(Record):
    """Binds a decision to one exact operation; see track 20."""

    approval_id: str = Field(min_length=1, max_length=64)
    operation_id: str = Field(min_length=1, max_length=64)
    invoice: InvoiceDraft
    content_sha256: str = Sha256
    # The user_id of the trusted Principal that asked; never a name a model wrote.
    requested_by: str = Field(min_length=1, max_length=64)
    # Aware, so an expiry check compares instants rather than two local clocks.
    expires_at: AwareDatetime


class ExecutionEvent(Record):
    """One line of a run's history. ``parent`` is the causing event's ``seq``."""

    run_id: str
    seq: int = Field(ge=0)
    kind: str = Field(pattern=r"^[a-z][a-z0-9_.]{0,63}$")
    at: AwareDatetime
    parent: int | None = None
    data: dict[str, JsonValue] = {}


RunStatus = Literal["received", "checked", "needs_info", "ready", "awaiting_approval", "completed", "failed", "cancelled"]


class RunState(Record):
    """The durable state of one run. ``version`` increases on every committed write."""

    schema_version: Literal[1] = SCHEMA_VERSION
    run_id: str = Field(min_length=1, max_length=64)
    principal: Principal
    status: RunStatus = "received"
    step: int = Field(default=0, ge=0)
    max_steps: int = Field(default=12, ge=1)
    version: int = Field(default=0, ge=0)
    evidence: tuple[EvidenceRef, ...] = ()
