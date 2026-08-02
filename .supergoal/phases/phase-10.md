SUPERGOAL_PHASE_START
Phase: 10 of 12 — Performance campaign to the 50 ms gate
Task: A dedicated, measured optimization pass over the *complete* site — the first point at
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `node scripts/bench.mjs --iter 20 --all-routes`
Acceptance criteria: 7
Evidence required: 1 item(s)
Depends on phases: 9

## Why

A dedicated, measured optimization pass over the *complete* site — the first point at
which "every page" is a meaningful set.

## Work

- measured baseline for every route; optimization work; final report with before/after; caching headers finalized (immutable hashed assets, HTML policy); image and font pipeline finalized; client-side budget report.

## Acceptance criteria (all must pass — verify each in transcript)

- **Every route in the sitemap** (both languages, all lessons, all index pages) measured with `--iter ≥ 20`; report lists `n`, p50, p95 and load average per route.
- **100% of routes p95 < 50 ms.** Any route that cannot reach it is listed explicitly with its measured number and the reason — silent omission is a failure.
- Measurement runs against the deployed Cloudflare edge, not localhost.
- Before/after table included; any delta under 5% is labelled "within noise" rather than claimed as a win.
- Client budget report: per-route initial JS/CSS, largest contentful paint, total blocking time, for the 5 heaviest routes, in a real browser.
- Hashed assets serve `public, max-age=31536000, immutable`; HTML serves an explicit `Cache-Control`; verified by `curl -I` on real URLs.
- The bench is re-proven able to fail at the end of the phase (red probe → red, removed).

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `node scripts/bench.mjs --iter 20 --all-routes`

## Evidence required in transcript

- the full route table, before/after table, `curl -I` header dumps.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
