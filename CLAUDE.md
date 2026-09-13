# CLAUDE.md

See **[AGENTS.md](./AGENTS.md)** — it is the canonical guidance for this repo and
covers commands, invariants, the performance gate, Cloudflare rules, the Signal
Observatory's procedural material contract, the live “View lesson” deployment
canary and the external Kimi K3 in C systems reference.

This file exists only so Claude Code finds it; keep it a pointer, not a copy.

Two sections there are load-bearing and easy to skim past: **Engineering
principles** (no backward compatibility, simplest thing that fully works,
prefer existing deps over hand-rolling) and **External systems reference** (the
source for the Kimi K3 C implementation).

## Package management

- **Use pnpm exclusively.** Never use `npm install`, `yarn`, or `bun install` — they ignore `pnpm-lock.yaml` and create duplicate physical copies of every dependency.
- Setup / CI: `pnpm install --frozen-lockfile`
- Add dependency: `pnpm add <pkg>` · dev: `pnpm add -D <pkg>` · workspace pkg: `pnpm --filter <name> add <pkg>`
- Run scripts: `pnpm <script>`
- `node_modules/` is disposable: hardlinked views into the shared pnpm store. Deleting it is always safe; reinstall is fast and offline. Never commit or edit it.
- `pnpm-lock.yaml` is the source of truth: commit it, never hand-edit.
