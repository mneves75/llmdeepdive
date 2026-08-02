SUPERGOAL_PHASE_START
Phase: 5 of 12 — Content: Tracks 0–3 (foundations → sequence models)
Task: Deliver: Content: Tracks 0–3 (foundations → sequence models).
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/content-graph.mjs`, `node scripts/content-citations.mjs`, `node scripts/content-spell.mjs`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 7
Evidence required: 1 item(s)
Depends on phases: 3, 4

## Why

Deliver: Content: Tracks 0–3 (foundations → sequence models).

## Work

- all lessons in Tracks 0, 1, 2, 3 (29 lessons) in EN and pt-BR, with their non-WebGL visuals, quizzes, and citations.
- Visualizations 1–4 wired into their lessons.

## Acceptance criteria (all must pass — verify each in transcript)

- Lesson count for tracks 0–3 = 29 in `en` and 29 in `pt`; parity script exits 0.
- Stub checker exits 0 across all of them.
- Every lesson has ≥1 quiz question with a stored correct answer and an explanation.
- Every lesson's frontmatter has either ≥1 entry in `citations[]` (each with title, author, year and URL) or an explicit `citationsNotRequired: "<reason>"` string. The citation checker exits non-zero if any lesson has neither, and if any citation entry is missing a field. No "claim detection" heuristics — the rule is binary per lesson.
- Every lesson's `prerequisites` resolve to existing lesson ids; graph checker exits 0.
- All track 0–3 routes p95 < 50 ms.
- `node scripts/content-spell.mjs` exits 0 for both `en` and `pt` dictionaries, with a committed project word list for domain terms.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `node scripts/content-parity.mjs`
- `node scripts/content-stubs.mjs`
- `node scripts/content-graph.mjs`
- `node scripts/content-citations.mjs`
- `node scripts/content-spell.mjs`
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
