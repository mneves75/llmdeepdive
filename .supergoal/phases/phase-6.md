SUPERGOAL_PHASE_START
Phase: 6 of 12 — Content: Tracks 4–6 (transformer, pretraining, alignment)
Task: Deliver: Content: Tracks 4–6 (transformer, pretraining, alignment).
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/content-graph.mjs`, `node scripts/bundle-budget.mjs`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 5
Evidence required: 1 item(s)
Depends on phases: 5

## Why

Deliver: Content: Tracks 4–6 (transformer, pretraining, alignment).

## Work

- Tracks 4, 5, 6 (38 lessons) in both languages.
- Visualizations 5–8 (multi-head attention, RoPE, transformer anatomy, sharding) built on the Phase 4 harness.
- Includes the full annotated build-a-GPT lesson (4.13) with runnable code.

## Acceptance criteria (all must pass — verify each in transcript)

- Lesson count for tracks 4–6 = 38 in each language; parity exits 0.
- Stub, citation and graph checkers exit 0.
- Lesson 4.13's code is extracted and executed by a test that asserts it trains and loss decreases; test exits 0.
- Visualizations 5–8 satisfy every Phase 4 harness invariant (single context, rAF pause, dispose, poster, budget) — re-asserted, not assumed.
- All track 4–6 routes p95 < 50 ms.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `node scripts/content-parity.mjs`
- `node scripts/content-stubs.mjs`
- `node scripts/content-graph.mjs`
- `node scripts/bundle-budget.mjs`
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
