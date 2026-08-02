SUPERGOAL_PHASE_START
Phase: 9 of 12 — Search & navigation
Task: Deliver: Search & navigation.
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 6
Evidence required: 1 item(s)
Depends on phases: 7, 8

## Why

Deliver: Search & navigation.

## Work

- bilingual full-text search across all lessons, keyboard-first (`/` and `⌘K`), results grouped by track with difficulty badges; course map / graph view; "continue where you left off"; per-track and overall progress.

## Acceptance criteria (all must pass — verify each in transcript)

- Searching a term present only in one lesson returns that lesson as the top result, in both languages; asserted for ≥10 fixture queries per language.
- Search returns results in < 100 ms measured client-side on a warm index, and adds zero blocking bytes to initial page load (index fetched lazily on first open).
- Search works with the Worker unreachable if the static-index path is used; if D1 FTS5 is used instead, an explicit fallback is implemented and tested.
- `⌘K` and `/` both open search; `Esc` closes; arrow keys navigate; `Enter` opens. All verified by keyboard-only automation.
- Course map renders all 104 lessons with prerequisite edges and completion state.
- p95 < 50 ms unchanged on all routes.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `node scripts/bench.mjs --iter 20`

## Evidence required in transcript

- Exit code and last ~10 lines of every mandatory command.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
