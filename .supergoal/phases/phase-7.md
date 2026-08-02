SUPERGOAL_PHASE_START
Phase: 7 of 12 — Content: Tracks 7–10 + capstones
Task: Deliver: Content: Tracks 7–10 + capstones.
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/content-graph.mjs`, `node scripts/bundle-budget.mjs`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 5
Evidence required: 1 item(s)
Depends on phases: 6

## Why

Deliver: Content: Tracks 7–10 + capstones.

## Work

- Tracks 7, 8, 9, 10 (47 lessons) + 5 capstones in both languages.
- Visualizations 9–12 (KV cache, MoE routing, ANN traversal, residual stream / SAE).

## Acceptance criteria (all must pass — verify each in transcript)

- Lesson count for tracks 7–10 = 47 plus 5 capstones, in each language; parity exits 0.
- Stub, citation and graph checkers exit 0.
- Visualizations 9–12 satisfy every harness invariant.
- **Full-course totals:** 104 lessons + 5 capstones present in both languages, zero stubs, zero unresolved prerequisites, 12 visualizations registered.
- All routes p95 < 50 ms.

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
