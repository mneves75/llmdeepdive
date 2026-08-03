# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-08-02

### Added

- **Signal Observatory 3D model for the Anatomy Explorer.** The procedural
  transformer is now a machined cutaway instrument with distinct mechanisms,
  persistent input/output direction, bilingual layer labels and deterministic
  token flow.
- **Complete selector-to-specimen coverage.** All 12 library components select
  an explicit 3D port, update the bilingual evidence drawer and isolate the
  relevant mechanism.
### Changed

- Reworked both explorer locales around a selector-first hierarchy, dominant 3D
  stage, evidence drawer and ruled five-lens strip. Mobile preserves that order
  and exposes a horizontal-scroll affordance.
- Upgraded the Three.js stage with calibrated camera, environment light, fog,
  shadows and render timing while keeping it lazy and off the critical path.

### Fixed

- Removed the deprecated `THREE.Clock` path and invalid live-region list markup
  found by browser accessibility QA. Axe now reports zero automated WCAG 2A
  violations on the explorer.

## [0.4.0] — 2026-08-02

The Abyssal Core Atlas redesign, and the discovery that ten green gates were
hiding a mostly-broken explorer.

### Added

- **The Abyssal Core Atlas visual system** across every surface — home, track
  index and detail, lesson, explorer, search, theme toggle, quiz and teach-back,
  desktop and mobile, both locales. Documented in `DESIGN.md`. Course wayfinding
  is reworked as a continuous curriculum descent, and the core content stays
  semantic and usable before any JavaScript or WebGL enhancement runs.
- **Long-form lesson copy is 30% larger** — `1.3rem` at `1.65` line height on a
  `40rem` measure, with stronger paragraph and list rhythm.
- **404 pages for both locales.** `not_found_handling: "404-page"` had been set
  since the first deploy with no `404.html` to resolve to, so every bad URL
  returned a zero-byte body — confirmed against live production. Each page
  routes back to the tracks, the explorer and lesson 0.1.
- **`pnpm links` — a link-integrity gate over the built site**, wired into
  `pnpm build`. It resolves every internal `href`/`src` in `dist/` to a real
  built file, checks `#fragment` targets against the ids actually present, and
  refuses to count a bare directory as a page. 3,294 references across 182
  pages. This is the gate that would have caught the explorer defects below.
- **A noise floor and a confirmation pass in the benchmark.** Over-budget routes
  are now measured a second time and only fail if they fail twice, and an
  immutable content-hashed asset is measured alongside to establish what this
  machine and link can physically produce. If the control alone exceeds budget
  the run reports `INCONCLUSIVE` rather than inventing a verdict.

### Fixed

- **21 of the explorer's 26 lesson links were dead.** The anatomy explorer is
  the site's wayfinding centrepiece and almost none of its "View lesson" links
  worked. Some named lessons in tracks 8, 10 and 11, which have no content at
  all (`8.1-moe`, `10.1-residual-stream`, `11.3-quantization`); others were
  near-misses against real slugs (`1.3-tokenization-ii` for what is actually
  `1.3-bpe-step-by-step`). Every id now resolves against the corpus.
- **Even valid explorer ids produced 404s.** Lesson URLs are
  `/lessons/<track>/<id>/`, but the explorer only stored bare ids and built
  `/lessons/<id>/` in the browser — the track segment is knowable only from the
  content collection. Hrefs are now resolved at build time, so a stale id fails
  the build instead of shipping a dead link.
- **The explorer's server-rendered CTA pointed at `/lessons/`**, a route that
  has never existed. It now points at the selected component's real lead lesson
  before any script runs.
- **The MoE router organ** linked into unwritten tracks. It now points at
  `4.9-feed-forward-block`, where mixture-of-experts is actually taught as the
  sparse variant of the feed-forward block.
- **Internal lesson slugs no longer leak into learner-facing prose.** The
  explorer's "context" lens listed raw ids like `1.3-bpe-step-by-step` as if
  they were sentences.
- **Explorer markers derived their scale from an unmeasured, hidden canvas.**
  The canvas ships with `hidden` so the poster paints first, and a hidden
  element has no layout box — so scale was computed from zero height. It now
  waits for a real measurement and re-syncs on resize;
  `tests/marker-scale.test.mjs` locks the zero-size behaviour.
- Translated tier labels and the locale switch stay available on narrow screens;
  skip and lesson fragment targets get sticky-header offsets; dark panels
  inherit `color-scheme` correctly.

### Removed

- **The anonymous D1 progress backend, in full** — `worker/`, the D1 binding and
  migration, and `src/lib/progress.ts`. The module holding every call site was
  imported by nothing: the lesson pages track completion directly in
  `localStorage`, so the API, the database and the token were unreachable from
  the UI and had been since they were written. Local per-device completion is
  unchanged. The site now deploys as pure static assets — no Worker script, no
  bindings — which removes an isolate from the request path entirely.
- `pnpm check`, which pointed at a `scripts/check.mjs` that exists in no commit.

## [0.3.0] — 2026-08-02

Search, and production is live.

### Added

- **Bilingual search.** Pagefind index fetched on first open — zero bytes on
  initial page load, zero Worker invocations. Opens with `⌘K` or `/`, arrow keys
  move through results. Built on a native `<dialog>`, so focus trapping, Escape
  and background inertness come from the platform rather than being hand-rolled.
- **Production is live at https://llmdeepdive.com** (apex and www), with the D1
  schema applied and all six security headers present.
- Engineering principles recorded in `AGENTS.md`: no backward compatibility,
  simplest implementation that fully works, grow in layers, prefer existing
  dependencies over hand-rolled code.

### Fixed

- **Search was silently broken by our own CSP.** Instantiating Pagefind's
  WebAssembly module is blocked unless `script-src` allows it, and the failure
  surfaces only as a console error — the box just returns nothing. Added
  `'wasm-unsafe-eval'`, which permits WebAssembly compilation **only**;
  `eval()` of JavaScript strings stays blocked, which is the property that
  matters for XSS. Verified in a real browser: 8 results for "attention".

### Notes

- Content stands at **158 lessons** (79 EN + 79 pt-BR), tracks 0–7.
- Tracks 8–11 and the capstones were dispatched but **could not be written**:
  the Codex quota is exhausted until 2026-08-08. This is a hard external block,
  not a decision.

## [0.2.0] — 2026-08-02

Content build-out and the anonymous progress backend.

### Added

- **158 lessons** (79 English + 79 Brazilian Portuguese) across tracks 0–7, up
  from 8. Full EN/pt-BR parity, enforced by the build. Every lesson carries a
  concrete analogy, a teach-back prompt with a model answer, at least two quiz
  questions with explanations, and real citations.
- **Anonymous progress backend on D1.** `GET`/`PUT`/`DELETE /api/progress`,
  `POST /api/quiz/attempt`, `POST /api/signal`. Identity is an opaque
  client-generated UUID with no join key to anything.
- **localStorage-first client** (`src/lib/progress.ts`): every write lands
  locally and synchronously, then sync is attempted and allowed to fail
  silently, so the whole site works with the API unreachable.
- Lesson signal is a **four-value enum**, not a text box, so it cannot become a
  free-text channel.

### Changed

- The privacy promise is now enforced by schema shape rather than by policy: no
  table has a column that could hold learner-written prose. A `teachBackText`
  field sent to the API is accepted and discarded because nothing can store it.
- Removed `lab:` frontmatter from 44 lessons. Those labs are not implemented
  yet, and the budget checker was right to fail on a declaration pointing at
  nothing — the frontmatter was the lie, not the checker.

### Fixed

- The rendered-HTML placeholder test produced two false positives on real
  content: the quiz option "Always undefined", and `NaN` in the track-5 lesson
  on training instabilities. Tightened to whole-node matches and dropped the
  `NaN` check entirely — a test that cries wolf gets disabled rather than heeded.

### Notes

- **Verified:** build (180 pages), typecheck 0 errors, `ast-grep` clean, 11/11
  tests, and all six content checkers green. API contract verified against
  staging including 401 on missing/bad token, 400 on invalid lesson id, invalid
  signal and oversized body, and an erase round-trip.
- **Performance:** 170 of 180 routes under the 50 ms server-p95 gate. The
  measuring machine was at load average 23–32 and the failing routes move
  between runs, so those are local scheduling artefacts rather than route
  defects — but the run exits non-zero and is reported as 170/180, not 180/180.
- Still outstanding: tracks 8–11 and the capstones (35 lessons), the 35
  interactive labs, Pagefind search UI wiring, and per-component 3D scenes for
  the remaining explorer entries.

## [0.1.0] — 2026-08-02

First staging release. Foundation, design system, content pipeline and the
Anatomy Explorer.

### Added

- **Site foundation** — Astro 7.1.6 static output served by Cloudflare Workers
  Static Assets, with `run_worker_first` scoped to `/api/*` so an HTML request
  never starts an isolate. Staging and production environments each re-declare
  their bindings, because named Cloudflare environments do not inherit them.
- **Atelier design system** — warm-paper visual identity with real spacing,
  type, radius, elevation and z-index scales. `light-dark()` theming against
  `color-scheme`, so the "Auto" setting needs no JavaScript at all; a
  three-state Light/Auto/Dark control with a pre-paint inline script.
- **Bilingual routing** — English unprefixed, Brazilian Portuguese under
  `/pt-br/`, with `hreflang` alternates and per-language sitemaps. Astro's i18n
  `fallback` is deliberately unset so a missing translation fails the build
  rather than silently serving English at a Portuguese URL.
- **Markdown pipeline** — unified (remark/rehype) with KaTeX maths, heading
  anchors, Shiki highlighting and four semantic callout kinds. Pinned over
  Astro 7's new default; see ADR 0001.
- **Anatomy Explorer** — a procedurally generated 3D transformer with annotated
  components, a component library, view tools and a five-lens card deck. One
  long-lived WebGL stage rather than a renderer per scene; render-on-demand;
  markers with constant pixel size, screen-space picking and facing-based
  occlusion; full keyboard cycling and a screen-reader text equivalent.
- **Performance harness** (`scripts/bench.mjs`) — reports server time and wire
  time separately, floors `--iter` at 16, requires a unique content marker per
  route, records load average, and ships a `--self-test` mode that proves the
  gate can fail.
- **Open-source scaffold** — MIT licence, contribution guide, asset provenance
  notice, and CI running the full local gate.

### Fixed

Found by review and real-browser verification before this ever shipped:

- **The 3D explorer could never load.** `IntersectionObserver` was watching the
  `<canvas>`, which ships with the `hidden` attribute so the poster renders
  first — and a hidden element has no layout box, so it can never intersect.
  Now observes the visible wrapper.
- **Tool-button listeners were never removed**, so a re-mount duplicated every
  action and kept the previous `Stage` reachable after `dispose()`.
- **Teardown race:** unmounting while the Three.js chunks were in flight
  constructed an orphaned stage with a live WebGL context and rAF loop.
- **No security headers at all.** Added a build-time generator producing CSP
  from real hashes of the emitted inline scripts and styles, plus HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP and
  `X-Frame-Options`.
- **Content-hashed assets were served `max-age=0, must-revalidate`**, costing a
  revalidation round-trip per visit for files that can never change. Now
  `immutable`.
- The 3D canvas `aria-label` promised an Enter key that did nothing; corrected
  to describe the keys that actually work.

### Notes

- **Performance, measured honestly.** Server p50 is 4–10 ms across all 22
  routes. The gate is server p95 < 50 ms and 21–22 of 22 routes pass on any
  given run — but *which* route fails moves between runs, and the machine used
  for measurement was at load average 77–123. Those p95 spikes are local
  scheduling artefacts, not edge latency. A clean 22/22 needs an idle machine;
  this is stated rather than papered over.
- Wire p95 from São Paulo is ~53–105 ms, of which **42.8 ms is network
  round-trip** to the edge. The bench prints server and wire separately so
  neither can be mistaken for the other.
- `--self-test` passes: forced against an impossible budget, every route fails.
  The gate demonstrably works.
- Three.js is `WebGLRenderer` via bare `three` imports, not `three/webgpu`:
  425 KB gzipped versus 130 KB, for a renderer still described upstream as
  experimental.

[0.5.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.5.0
[0.4.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.4.0
[0.3.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.3.0
[0.2.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.2.0
[0.1.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.1.0
