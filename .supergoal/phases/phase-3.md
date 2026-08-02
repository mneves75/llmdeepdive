SUPERGOAL_PHASE_START
Phase: 3 of 12 — Content architecture & bilingual pipeline
Task: The frontmatter contract and i18n routing block all content work; changing it later
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 8
Evidence required: 1 item(s)
Depends on phases: 1, 2

## Why

The frontmatter contract and i18n routing block all content work; changing it later
means rewriting ~200 files.

## Work

- Content collection schema for `track` and `lesson` (zod-validated frontmatter: id, track, order, title, summary, difficulty, prerequisites[], unlocks[], visual?, citations[], updated date, lang)
- Routing: `/en/...` and `/pt/...`, root `/` negotiating language and redirecting
- Language switcher preserving the current lesson
- `hreflang` alternates, canonical URLs, per-language `sitemap.xml`, RSS per language
- Auto-generated OG images per lesson
- Track index pages, lesson prev/next from the graph, prerequisite links
- Parity checker script: every lesson id exists in both `en` and `pt`
- Stub checker script: fails on `TODO`, `TBD`, `Lorem`, or body under a word floor
- 4 real pilot lessons (0.1, 1.2, 4.2, 7.4 — one per difficulty tier) in **both** languages

## Acceptance criteria (all must pass — verify each in transcript)

- `node scripts/content-parity.mjs` exits 0 and reports equal lesson counts for en/pt.
- `node scripts/content-stubs.mjs` exits 0 (no stub markers, no lesson under the word floor).
- Invalid frontmatter fails the build — demonstrated by temporarily breaking one lesson, showing the build error, then reverting.
- `/` redirects to `/en/` or `/pt/` per `Accept-Language`; both verified by curl.
- Every lesson page emits correct `hreflang` pairs and a self-canonical; verified by script across all pages.
- `sitemap.xml` lists every page in both languages; count matches the content collection.
- The 4 pilot lessons render in both languages with working prev/next and prerequisites.
- `node scripts/bench.mjs --iter 20` — all existing routes still p95 < 50 ms.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `node scripts/content-parity.mjs`
- `node scripts/content-stubs.mjs`
- `node scripts/bench.mjs --iter 20`

## Evidence required in transcript

- parity + stub script output; the deliberate frontmatter-break build failure and its revert; curl output for language negotiation.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
