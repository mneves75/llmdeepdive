# agentlab — exercises for tracks 14–25

The runnable half of llmdeepdive.com's agent-engineering tracks. You build one
system across twelve tracks: a purchasing assistant for a fictional company. It
reads a request and an untrusted supplier message, looks up purchase records,
gathers evidence, proposes an invoice and waits for a person to authorize it.
Nothing here sends a real invoice, calls a real company or moves money; every
name, amount and account in `src/agentlab/fixtures/` is invented.

Each lesson says which module and test it uses. The lessons explain the
mechanism; this project lets you run it, break it and watch the test catch it.

## Setup

You need [uv](https://docs.astral.sh/uv/) 0.9 or newer. It installs the pinned
Python (3.13, from `.python-version`) and the locked dependencies.

```bash
cd examples/agent-engineering
uv sync --frozen
uv run --frozen python -m unittest discover -s tests
```

The core suite needs one dependency (Pydantic) and no network, API key, model
or GPU. Three optional groups add what single lessons need:

| Group | For | Run |
|---|---|---|
| `frameworks` | LangGraph and Temporal walkthroughs (14.5, 20.3) | `uv sync --frozen --group frameworks` then `uv run --frozen python -m unittest discover -s tests_frameworks` |
| `browser` | The synthetic legacy portal (track 18) | `uv sync --frozen --group browser`, `uv run --frozen playwright install chromium`, then `uv run --frozen python -m unittest discover -s tests_browser` |
| `postgres` | The MCP server against a real Postgres (15.4) | `uv sync --frozen --group postgres`, set `AGENTLAB_PG_DSN`, then `uv run --frozen python -m unittest discover -s tests_postgres` |

The Temporal tests start Temporal's own time-skipping test server, which the
SDK downloads on first use, so they need network once.

## What a passing test proves

Four kinds of evidence, never merged:

- **source-reviewed**: a lesson's claim was checked against a primary source.
- **fixture-tested**: the code passed against scripted model replies and
  synthetic tools. Every test in `tests/` is this kind. It proves the control
  logic, not that a real model behaves.
- **live-model-tested**: the same scenario ran against a real model through
  `agentlab.model.OpenAICompatibleModel` (llama-server, mlx-lm's server or a
  provider you choose), with the model and revision recorded. Track 23 explains
  how; nothing in CI does this.
- **environment-tested**: the code ran against the real external system
  (Postgres, a browser, Temporal's test server, a microVM). The optional groups
  above are this kind, for the systems they name.

## Supported environments

- Core suite: Linux x86_64 and macOS (arm64), Python 3.13 via uv. Windows and
  WSL are untested; do not assume they work.
- Track 17's microVM exercise needs Linux x86_64 with a working `/dev/kvm`.
  macOS, ordinary containers and typical hosted CI runners are not substitutes.
  This repository's CI does not run it; the lesson labels its commands as not
  executed here.
- No exercise needs a paid API. Live-model trials can use a local model.

## Layout

- `src/agentlab/domain.py` — records shared by every track (`RunState`,
  `ToolRequest`, `ToolResult`, `EvidenceRef`, `ApprovalRequest`,
  `ExecutionEvent`). Identity comes from the trusted runtime as a `Principal`,
  never from model output.
- `src/agentlab/model.py` — `ScriptedModel` (offline, deterministic) and
  `OpenAICompatibleModel` (live trials).
- `src/agentlab/fixtures/` — synthetic purchase records for two tenants and
  supplier messages, one of them carrying a prompt-injection attempt.
- `src/agentlab/<topic>/` — one package per track, added by that track.
- `tests/` — the core, offline suite that CI runs on every change.
