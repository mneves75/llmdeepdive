"""Model adapters.

``ScriptedModel`` replays fixed replies so every exercise runs offline and
deterministically. Evidence produced with it is ``fixture-tested`` only.
``OpenAICompatibleModel`` talks to any server that implements the
``/v1/chat/completions`` shape (llama-server, mlx-lm's server, a hosted
provider) for the live trials of track 23; evidence from it is
``live-model-tested`` and records the model name the server reported, which
is the server's claim, not proof of the weights behind it.

Every failure comes back as ``ModelReply.error`` with a class prefix
(``transport:``, ``http:``, ``protocol:``), so a caller can classify it as
track 24 teaches instead of catching whatever the network library raises.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Protocol

# A reply larger than this is refused rather than read into memory.
MAX_REPLY_BYTES = 4 * 1024 * 1024


@dataclass(frozen=True)
class ModelReply:
    text: str | None = None
    tool_call: dict | None = None
    error: str | None = None
    served_by: str | None = None


class Model(Protocol):
    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> ModelReply: ...


class ScriptExhausted(RuntimeError):
    """The run asked for more model calls than the script provides."""


@dataclass
class ScriptedModel:
    replies: list[ModelReply]
    calls: list[list[dict]] = field(default_factory=list)

    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> ModelReply:
        self.calls.append(messages)
        if len(self.calls) > len(self.replies):
            # A silent default reply would hide a loop that never terminates.
            raise ScriptExhausted(f"call {len(self.calls)} but the script has {len(self.replies)} replies")
        return self.replies[len(self.calls) - 1]


@dataclass
class OpenAICompatibleModel:
    base_url: str
    model: str
    # repr=False: a key must never reach a trace, a log or an assertion message.
    api_key: str | None = field(default=None, repr=False)
    timeout_s: float = 60.0

    def __post_init__(self) -> None:
        if urllib.parse.urlsplit(self.base_url).scheme not in ("http", "https"):
            raise ValueError("base_url must be an http or https URL")

    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> ModelReply:
        body: dict = {"model": self.model, "messages": messages}
        if tools:
            body["tools"] = tools
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(f"{self.base_url.rstrip('/')}/chat/completions", data=json.dumps(body).encode(), headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_s) as response:  # noqa: S310 (scheme checked in __post_init__)
                raw = response.read(MAX_REPLY_BYTES + 1)
        except urllib.error.HTTPError as error:
            return ModelReply(error=f"http: status {error.code}")
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            return ModelReply(error=f"transport: {type(error).__name__}")
        if len(raw) > MAX_REPLY_BYTES:
            return ModelReply(error=f"protocol: reply larger than {MAX_REPLY_BYTES} bytes")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return ModelReply(error="protocol: reply is not JSON")
        served_by = payload.get("model")
        message = (payload.get("choices") or [{}])[0].get("message") or {}
        calls = message.get("tool_calls") or []
        if not calls:
            return ModelReply(text=message.get("content"), served_by=served_by)
        if len(calls) > 1:
            # Silently running the first of several calls would drop the others.
            return ModelReply(error=f"protocol: {len(calls)} tool calls in one reply; this adapter handles one", served_by=served_by)
        function = calls[0].get("function") or {}
        try:
            arguments = json.loads(function.get("arguments") or "{}")
        except json.JSONDecodeError as error:
            return ModelReply(error=f"protocol: tool arguments are not valid JSON: {error.msg}", served_by=served_by)
        return ModelReply(tool_call={"name": function.get("name"), "arguments": arguments}, served_by=served_by)
