"""Lesson 15.1: from a model's tool call to a validated, authorized request.

Two separate gates. The argument model checks *shape*: types, exact enums,
numeric ranges and no unknown fields, in Pydantic strict mode so nothing is
coerced. ``authorize_record`` checks *permission* against the trusted
``Principal``. A request can pass the first and fail the second: a perfectly
formed lookup of another tenant's purchase order is still not allowed.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from agentlab.domain import Principal, ToolRequest

# A rejection goes back to the model, so it is short and never repeats the input.
MAX_ERROR_CHARS = 300


class ToolRejected(Exception):
    """A request the boundary refused. The message is safe to show the model."""


class Arguments(BaseModel):
    # Strict: "5" is not 5. Forbid: an extra field is an error, not ignored.
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)


class LookupPurchaseOrder(Arguments):
    po_id: str = Field(pattern=r"^PO-[0-9]{4}$", description="Purchase order number, for example PO-1001.")


class ListPurchaseOrders(Arguments):
    status: Literal["open", "received"] | None = None
    limit: int = Field(default=10, ge=1, le=50)


class SearchPurchaseOrders(Arguments):
    # Free text on purpose: no pattern can protect it, so the query must (lesson 15.4).
    item_contains: str = Field(min_length=2, max_length=60)
    limit: int = Field(default=10, ge=1, le=50)


ARGUMENTS: dict[str, type[Arguments]] = {
    "lookup_purchase_order": LookupPurchaseOrder,
    "list_purchase_orders": ListPurchaseOrders,
    "search_purchase_orders": SearchPurchaseOrders,
}


@dataclass(frozen=True)
class Tool:
    """A tool as the server publishes it: name, description, argument model and code.

    ``run`` receives the trusted principal from the server, never from the model.
    """

    name: str
    description: str
    arguments: type[Arguments]
    run: Callable[[Principal, Arguments], dict]

    def definition(self) -> dict:
        return {"name": self.name, "description": self.description, "inputSchema": self.arguments.model_json_schema()}


def to_tool_request(tool_call: dict, run_id: str, operation_id: str) -> ToolRequest:
    """Wrap a model's tool call (``ModelReply.tool_call``) in the shared record."""
    try:
        return ToolRequest.model_validate(
            {"run_id": run_id, "operation_id": operation_id, "tool": tool_call.get("name"), "arguments": tool_call.get("arguments")}
        )
    except ValidationError as error:
        raise ToolRejected(_describe(error)) from error


def validate_arguments(tool: str, arguments: dict, models: dict[str, type[Arguments]] = ARGUMENTS) -> Arguments:
    """Check the arguments against the tool's model, or raise ``ToolRejected``."""
    model = models.get(tool)
    if model is None:
        raise ToolRejected(f"unknown tool: {tool[:64]}")
    try:
        return model.model_validate(arguments)
    except ValidationError as error:
        raise ToolRejected(_describe(error)) from error


def authorize_record(principal: Principal, record: dict | None, po_id: str) -> dict:
    """Allow a record only if it belongs to the caller's tenant.

    Missing and forbidden get the same answer: saying "forbidden" would tell
    the caller that another tenant's order exists.
    """
    if record is None or record["tenant_id"] != principal.tenant_id:
        raise ToolRejected(f"purchase order {po_id} not found")
    return record


def _describe(error: ValidationError) -> str:
    """Field names and reasons only; the rejected input could be huge or hostile."""
    parts = [f"{'.'.join(str(p) for p in e['loc']) or 'arguments'}: {e['msg']}" for e in error.errors(include_input=False, include_url=False)]
    return "; ".join(parts)[:MAX_ERROR_CHARS]
