# ROADMAP — llmdeepdive.com

Free bilingual (EN + pt-BR) interactive LLM course, absolute basics → frontier, on Cloudflare
Workers + D1, with Three.js visualizations. Hard gate: **p95 < 50 ms per route**, every
feature browser-verified.

Project root: `/Users/mneves/dev/MEUS_SITES/llmdeepdive.com`
Curriculum: `.supergoal/CURRICULUM.md` · Analysis: `.supergoal/THINKING.md`

**Keystone invariant:** no HTML is ever personalized. Progress is client-side, optionally
mirrored to D1 under an anonymous token. Any change that makes HTML vary per visitor is a
regression.

---

## Phase 1 — Foundation, edge & the honest bench

**Why:** Nothing can be measured or trusted until the site is on the real edge and the
measuring instrument has been proven able to fail.

**Deliverables:**
- `package.json`, `pnpm-workspace.yaml`, `tsconfig.json` (strict, no `any`)
- Astro project scaffold with TypeScript + Tailwind v4
- `wrangler.jsonc` — one Worker, static assets + `/api/*`, `staging` and `production` envs
  each redeclaring assets/vars/bindings
- `src/worker/index.ts` thin entrypoint
- `scripts/bench.mjs` — the performance harness
- `scripts/check.mjs` — aggregate gate (build + typecheck + lint + tests)
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `MEMORY.md`, `FOR_YOU_KNOW.md`, `CHANGELOG.md`
- `.gitignore`, git repo initialized, ast-grep kit installed with pre-commit hook
- Deployed staging Worker + `llmdeepdive.com` zone verified reachable

**Acceptance criteria:**
1. `pnpm build` exits 0 and emits `dist/` containing at least one HTML file.
2. `pnpm typecheck` exits 0 with `strict: true` and zero errors.
3. `ast-grep scan` exits 0; the `no-explicit-any` rule is present and error-severity.
4. `wrangler deploy --env staging` succeeds, verified by `versions list` showing the new
   version ID **and** a live 200 from the staging URL (not by deploy stdout).
5. `dig +short llmdeepdive.com` returns Cloudflare IPs and `https://llmdeepdive.com/` returns
   200 from the deployed Worker.
6. `scripts/bench.mjs` accepts `--iter` (default 20, minimum enforced at 16), records
   `os.loadavg()` per run, and prints per-route `n`, p50, p95 computed as a true percentile.
7. **The bench is proven able to fail:** a deliberately delayed probe route is added, bench
   run against it exits non-zero and reports it over budget; the probe is then removed and
   the removal verified by `grep`. Both the red and green transcripts are shown.
8. The bench asserts a **per-page unique content marker** supplied per route, and fails if a
   route returns 200 without its marker. Demonstrated by pointing a route at a wrong marker
   and observing a failure.

**Mandatory commands:** `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/bench.mjs --iter 20`

**Evidence:** full transcripts of the bench RED run and GREEN run; `versions list` output;
`curl -sI https://llmdeepdive.com/` headers.

**Depends on:** none

---

## Phase 2 — Design system & visual identity

**Why:** The visual language must exist before 100+ content pages are written against it,
or every page needs retrofitting.

**Deliverables:**
- Design tokens (color, type scale, spacing, radii, motion) as CSS custom properties
- Dark-first theme + light theme, switchable, respecting `prefers-color-scheme`
- Typography system with self-hosted variable fonts, subset, `font-display: swap`
- Core components: header, track sidebar, lesson layout, breadcrumb, prev/next, callout
  (note/warning/insight/math), code block with copy + language label, figure/caption,
  quiz shell, progress indicator, footer, 404, search modal shell
- `/design` internal reference page rendering every component in every state
- Accessibility baseline: focus-visible everywhere, skip link, landmark regions

**Acceptance criteria:**
1. `/design` renders every component listed above; screenshot evidence at 390 px, 768 px and
   1440 px in both themes (6 screenshots minimum).
2. Every text/background pair on `/design` meets WCAG AA (≥4.5:1 body, ≥3:1 large), verified
   by a computed-contrast script that exits non-zero on failure — not by eye.
3. Keyboard-only traversal of `/design` reaches every interactive element with a visible
   focus ring; evidenced by an automated tab-order dump.
4. Zero layout shift on `/design`: measured CLS = 0.
5. Fonts are self-hosted (no third-party font requests in the network log) and total font
   payload ≤ 120 KB.
6. Theme toggle persists across reload. No flash of wrong theme, established two ways:
   (a) a synchronous inline `<script>` in `<head>` sets the theme attribute before any
   stylesheet paints — asserted by a test that the script exists, is not `defer`/`async`, and
   precedes the first `<link rel=stylesheet>` in the emitted HTML; (b) a browser trace
   confirms the `<html>` theme attribute never changes value after first paint.
7. `pnpm build`, `pnpm typecheck`, `pnpm lint` all exit 0.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/a11y-contrast.mjs`

**Evidence:** the 6+ screenshots, contrast script output, tab-order dump.

**Depends on:** 1

---

## Phase 3 — Content architecture & bilingual pipeline

**Why:** The frontmatter contract and i18n routing block all content work; changing it later
means rewriting ~200 files.

**Deliverables:**
- Content collection schema for `track` and `lesson` (zod-validated frontmatter: id, track,
  order, title, summary, difficulty, prerequisites[], unlocks[], visual?, citations[],
  updated date, lang)
- Routing: `/en/...` and `/pt/...`, root `/` negotiating language and redirecting
- Language switcher preserving the current lesson
- `hreflang` alternates, canonical URLs, per-language `sitemap.xml`, RSS per language
- Auto-generated OG images per lesson
- Track index pages, lesson prev/next from the graph, prerequisite links
- Parity checker script: every lesson id exists in both `en` and `pt`
- Stub checker script: fails on `TODO`, `TBD`, `Lorem`, or body under a word floor
- 4 real pilot lessons (0.1, 1.2, 4.2, 7.4 — one per difficulty tier) in **both** languages

**Acceptance criteria:**
1. `node scripts/content-parity.mjs` exits 0 and reports equal lesson counts for en/pt.
2. `node scripts/content-stubs.mjs` exits 0 (no stub markers, no lesson under the word floor).
3. Invalid frontmatter fails the build — demonstrated by temporarily breaking one lesson,
   showing the build error, then reverting.
4. `/` redirects to `/en/` or `/pt/` per `Accept-Language`; both verified by curl.
5. Every lesson page emits correct `hreflang` pairs and a self-canonical; verified by script
   across all pages.
6. `sitemap.xml` lists every page in both languages; count matches the content collection.
7. The 4 pilot lessons render in both languages with working prev/next and prerequisites.
8. `node scripts/bench.mjs --iter 20` — all existing routes still p95 < 50 ms.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/bench.mjs --iter 20`

**Evidence:** parity + stub script output; the deliberate frontmatter-break build failure and
its revert; curl output for language negotiation.

**Depends on:** 1, 2

---

## Phase 4 — WebGL harness & first visualizations

**Why:** The shared renderer must exist before twelve scenes are written, or they become
twelve independent WebGL contexts to unpick.

**Deliverables:**
- Shared renderer harness: single WebGL context checked out per scene, poster-first
  rendering, `IntersectionObserver` mount, rAF paused when offscreen **or** tab hidden, full
  `dispose()` on unmount, `prefers-reduced-motion` → poster + manual opt-in
- Per-scene KB budget manifest + a CI check asserting it
- Visualizations 1–4: 3D vector explorer (0.4), linear-transform morph (0.5), embedding
  space explorer (1.5), loss landscape descent (2.6)

**Acceptance criteria:**
1. A page with all 4 scenes creates **at most one** `WebGLRenderingContext`/`WebGL2` context,
   asserted in-browser.
2. rAF callback count is 0 while a scene is scrolled offscreen and 0 while the tab is
   hidden — asserted by instrumented counter in a real browser, printed as evidence.
3. Unmounting a scene releases GPU resources: `renderer.info.memory.geometries` and
   `.textures` return to baseline; printed before/after.
4. With JS disabled, every visualization still shows its poster image and caption.
5. `prefers-reduced-motion: reduce` yields a static poster and no rAF loop until opt-in.
6. No route's initial JS payload grows by more than its declared budget; budget check exits 0.
7. Lesson routes containing a visualization still measure p95 < 50 ms.
8. Screenshot evidence of each of the 4 scenes rendered.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/bundle-budget.mjs`, `node scripts/bench.mjs --iter 20`

**Evidence:** context-count assertion, rAF counters, GPU memory before/after, 4 screenshots.

**Depends on:** 2, 3

---

## Phase 5 — Content: Tracks 0–3 (foundations → sequence models)

**Deliverables:** all lessons in Tracks 0, 1, 2, 3 (29 lessons) in EN and pt-BR, with their
non-WebGL visuals, quizzes, and citations. Visualizations 1–4 wired into their lessons.

**Acceptance criteria:**
1. Lesson count for tracks 0–3 = 29 in `en` and 29 in `pt`; parity script exits 0.
2. Stub checker exits 0 across all of them.
3. Every lesson has ≥1 quiz question with a stored correct answer and an explanation.
4. Every lesson's frontmatter has either ≥1 entry in `citations[]` (each with title, author,
   year and URL) or an explicit `citationsNotRequired: "<reason>"` string. The citation
   checker exits non-zero if any lesson has neither, and if any citation entry is missing a
   field. No "claim detection" heuristics — the rule is binary per lesson.
5. Every lesson's `prerequisites` resolve to existing lesson ids; graph checker exits 0.
6. All track 0–3 routes p95 < 50 ms.
7. `node scripts/content-spell.mjs` exits 0 for both `en` and `pt` dictionaries, with a
   committed project word list for domain terms.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/content-graph.mjs`, `node scripts/content-citations.mjs`, `node scripts/content-spell.mjs`, `node scripts/bench.mjs --iter 20`

**Depends on:** 3, 4

---

## Phase 6 — Content: Tracks 4–6 (transformer, pretraining, alignment)

**Deliverables:** Tracks 4, 5, 6 (38 lessons) in both languages. Visualizations 5–8
(multi-head attention, RoPE, transformer anatomy, sharding) built on the Phase 4 harness.
Includes the full annotated build-a-GPT lesson (4.13) with runnable code.

**Acceptance criteria:**
1. Lesson count for tracks 4–6 = 38 in each language; parity exits 0.
2. Stub, citation and graph checkers exit 0.
3. Lesson 4.13's code is extracted and executed by a test that asserts it trains and loss
   decreases; test exits 0.
4. Visualizations 5–8 satisfy every Phase 4 harness invariant (single context, rAF pause,
   dispose, poster, budget) — re-asserted, not assumed.
5. All track 4–6 routes p95 < 50 ms.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/content-graph.mjs`, `node scripts/bundle-budget.mjs`, `node scripts/bench.mjs --iter 20`

**Depends on:** 5

---

## Phase 7 — Content: Tracks 7–10 + capstones

**Deliverables:** Tracks 7, 8, 9, 10 (47 lessons) + 5 capstones in both languages.
Visualizations 9–12 (KV cache, MoE routing, ANN traversal, residual stream / SAE).

**Acceptance criteria:**
1. Lesson count for tracks 7–10 = 47 plus 5 capstones, in each language; parity exits 0.
2. Stub, citation and graph checkers exit 0.
3. Visualizations 9–12 satisfy every harness invariant.
4. **Full-course totals:** 104 lessons + 5 capstones present in both languages, zero stubs,
   zero unresolved prerequisites, 12 visualizations registered.
5. All routes p95 < 50 ms.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/content-parity.mjs`, `node scripts/content-stubs.mjs`, `node scripts/content-graph.mjs`, `node scripts/bundle-budget.mjs`, `node scripts/bench.mjs --iter 20`

**Depends on:** 6

---

## Phase 8 — Backend: Worker API, D1, progress & quizzes

**Why:** Deliberately late — the site must be complete and fast without it.

**Deliverables:**
- D1 schema + `0001_init.sql` (anonymous learners, lesson progress, quiz attempts, feedback),
  `deleted_at` soft delete everywhere, indices for every query path
- `/api/progress` (GET/PUT), `/api/quiz/attempt`, `/api/feedback`, `/api/health`
- Anonymous client-generated token; no cookies, no PII, no accounts
- localStorage-first progress with background sync and offline tolerance
- Rate limiting on all write endpoints
- Zod validation on every request body; typed responses
- Daily retention sweep

**Acceptance criteria:**
1. `wrangler d1 migrations apply` succeeds locally and on staging.
2. Every endpoint has tests for success, invalid input (400), rate-limited (429), and
   missing/garbage token; all exit 0.
3. No endpoint returns PII or accepts an email/name field — asserted by a schema test.
4. Progress survives: set progress → hard reload → progress restored; verified in a real
   browser and shown as evidence.
5. With the API unreachable (simulated failure), the site still renders and progress still
   works from localStorage — no error UI on content pages.
6. **No HTML response varies by token**: same URL fetched with and without a token returns
   byte-identical HTML; asserted by hash comparison.
7. Every HTML response carries `public` caching; every `/api/*` response carries `no-store`.
8. p95 < 50 ms holds for all HTML routes; `/api/*` p95 reported separately with its own
   budget.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `wrangler d1 migrations apply --local`, `node scripts/bench.mjs --iter 20`

**Depends on:** 3, 7

---

## Phase 9 — Search & navigation

**Deliverables:** bilingual full-text search across all lessons, keyboard-first (`/` and
`⌘K`), results grouped by track with difficulty badges; course map / graph view; "continue
where you left off"; per-track and overall progress.

**Acceptance criteria:**
1. Searching a term present only in one lesson returns that lesson as the top result, in both
   languages; asserted for ≥10 fixture queries per language.
2. Search returns results in < 100 ms measured client-side on a warm index, and adds zero
   blocking bytes to initial page load (index fetched lazily on first open).
3. Search works with the Worker unreachable if the static-index path is used; if D1 FTS5 is
   used instead, an explicit fallback is implemented and tested.
4. `⌘K` and `/` both open search; `Esc` closes; arrow keys navigate; `Enter` opens. All
   verified by keyboard-only automation.
5. Course map renders all 104 lessons with prerequisite edges and completion state.
6. p95 < 50 ms unchanged on all routes.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/bench.mjs --iter 20`

**Depends on:** 7, 8

---

## Phase 10 — Performance campaign to the 50 ms gate

**Why:** A dedicated, measured optimization pass over the *complete* site — the first point at
which "every page" is a meaningful set.

**Deliverables:** measured baseline for every route; optimization work; final report with
before/after; caching headers finalized (immutable hashed assets, HTML policy); image and
font pipeline finalized; client-side budget report.

**Acceptance criteria:**
1. **Every route in the sitemap** (both languages, all lessons, all index pages) measured
   with `--iter ≥ 20`; report lists `n`, p50, p95 and load average per route.
2. **100% of routes p95 < 50 ms.** Any route that cannot reach it is listed explicitly with
   its measured number and the reason — silent omission is a failure.
3. Measurement runs against the deployed Cloudflare edge, not localhost.
4. Before/after table included; any delta under 5% is labelled "within noise" rather than
   claimed as a win.
5. Client budget report: per-route initial JS/CSS, largest contentful paint, total blocking
   time, for the 5 heaviest routes, in a real browser.
6. Hashed assets serve `public, max-age=31536000, immutable`; HTML serves an explicit
   `Cache-Control`; verified by `curl -I` on real URLs.
7. The bench is re-proven able to fail at the end of the phase (red probe → red, removed).

**Mandatory commands:** `pnpm build`, deploy to staging, `node scripts/bench.mjs --iter 20 --all-routes`

**Evidence:** the full route table, before/after table, `curl -I` header dumps.

**Depends on:** 9

---

## Phase 11 — Full browser QA of every feature

**Why:** The user's bar is "100% of features working as designed", which only a real browser
can establish.

**Deliverables:** an executable QA suite covering every feature in both languages on mobile
and desktop viewports, plus a written QA report with per-feature pass/fail and screenshots.

**Acceptance criteria:**
1. Every navigational surface exercised: home, both language roots, all 11 track indexes,
   a sample of ≥20 lessons per language, course map, search, 404.
2. All 12 visualizations loaded, rendered and screenshotted in a real browser; each confirmed
   interactive (a scripted interaction changes the rendered output, verified by pixel diff).
3. Every quiz answered correctly and incorrectly; correct feedback shown in both cases.
4. Progress: complete a lesson → reload → still complete → clear data → reset. Verified.
5. Language switch from any lesson lands on the same lesson in the other language, for ≥10
   sampled lessons.
6. Zero console errors and zero failed network requests across the entire sweep; the log is
   printed as evidence.
7. Mobile (390 px) and desktop (1440 px) both pass; no horizontal scroll at 320 px.
8. Every failure found is fixed and re-verified in the same phase; the report lists what was
   found and what was fixed.

**Mandatory commands:** `pnpm build`, deploy staging, `pnpm qa` (browser suite), `pnpm test`

**Evidence:** QA report, screenshot set, console/network log.

**Depends on:** 10

---

## Phase 12 — Polish & Harden (mandatory final phase)

**Deliverables:** security headers + CSP by hash; SEO completeness; a11y audit; error/empty/
loading states; privacy page (cookieless analytics or none, LGPD/GDPR-honest); docs
(`README`, `AGENTS.md`, `FOR_YOU_KNOW.md`, `MEMORY.md`, `CHANGELOG.md`); production deploy on
`llmdeepdive.com`; rollback runbook.

**Acceptance criteria:**
1. CSP present with no `unsafe-inline` for scripts; HSTS, `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy` set. Verified by `curl -I` against production.
2. `security-audit` skill run; every finding either fixed or explicitly accepted in writing
   with a reason.
3. Automated a11y audit across ≥20 pages in both languages reports zero critical/serious
   violations; remaining items listed with justification.
4. Every error/empty/loading state has a designed treatment; screenshot evidence for 404,
   search-no-results, offline, WebGL-unavailable, API-unreachable.
5. Lighthouse (or equivalent) on 5 representative pages: Performance ≥ 95, Accessibility
   ≥ 95, Best Practices ≥ 95, SEO ≥ 95 — actual numbers printed, not claimed.
6. Production deployed to `https://llmdeepdive.com`, verified by `versions list` + live smoke
   returning 200 with the expected content marker.
7. **Final gate re-run on production:** 100% of routes p95 < 50 ms, full table printed.
8. `MEMORY.md`, `FOR_YOU_KNOW.md` and `CHANGELOG.md` reflect the shipped state.
9. `autoreview` run with zero accepted-and-unfixed findings.

**Mandatory commands:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/bench.mjs --iter 20 --all-routes --target production`, `pnpm qa`

**Depends on:** 11

---

## Totals

12 phases · 104 lessons + 5 capstones × 2 languages · 12 WebGL visualizations · 1 hard perf
gate re-verified in phases 1, 3, 4, 5, 6, 7, 8, 9, 10 and 12.
