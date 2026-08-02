SUPERGOAL_PHASE_START
Phase: 8 of 12 — Backend: Worker API, D1, progress & quizzes
Task: Deliberately late — the site must be complete and fast without it.
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `wrangler d1 migrations apply --local`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 8
Evidence required: 1 item(s)
Depends on phases: 3, 7

## Why

Deliberately late — the site must be complete and fast without it.

## Work

- D1 schema + `0001_init.sql` (anonymous learners, lesson progress, quiz attempts, feedback), `deleted_at` soft delete everywhere, indices for every query path
- `/api/progress` (GET/PUT), `/api/quiz/attempt`, `/api/feedback`, `/api/health`
- Anonymous client-generated token; no cookies, no PII, no accounts
- localStorage-first progress with background sync and offline tolerance
- Rate limiting on all write endpoints
- Zod validation on every request body; typed responses
- Daily retention sweep

## Acceptance criteria (all must pass — verify each in transcript)

- `wrangler d1 migrations apply` succeeds locally and on staging.
- Every endpoint has tests for success, invalid input (400), rate-limited (429), and missing/garbage token; all exit 0.
- No endpoint returns PII or accepts an email/name field — asserted by a schema test.
- Progress survives: set progress → hard reload → progress restored; verified in a real browser and shown as evidence.
- With the API unreachable (simulated failure), the site still renders and progress still works from localStorage — no error UI on content pages.
- **No HTML response varies by token**: same URL fetched with and without a token returns byte-identical HTML; asserted by hash comparison.
- Every HTML response carries `public` caching; every `/api/*` response carries `no-store`.
- p95 < 50 ms holds for all HTML routes; `/api/*` p95 reported separately with its own budget.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `wrangler d1 migrations apply --local`
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
