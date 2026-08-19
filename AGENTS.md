# AGENTS.md — llmdeepdive.com

How to work in this repo. Read before non-trivial changes. `CLAUDE.md` points here.

## What this is

A free, open-source, bilingual (EN + pt-BR) interactive course on large language
models — from what a parameter is through efficient inference. Static site on
Cloudflare Workers, MIT licensed.

## Commands

```bash
pnpm install
pnpm dev                 # astro dev
pnpm build               # static output to dist/
pnpm typecheck           # astro check, 0 errors required
pnpm lint                # ast-grep scan; no-explicit-any is error-severity
pnpm test                # node --test tests/
pnpm content:parity      # EN/pt-BR lesson parity
pnpm content:stubs       # no TODO/TBD/Lorem, word floor
pnpm content:graph       # prerequisite ids resolve, no cycles
pnpm content:citations   # citations present or reason given
pnpm content:assets      # every referenced asset exists
pnpm content:figures     # every <Figure id> resolves; both locales; labels differ
pnpm links               # every internal link in dist/ resolves (runs in build)
pnpm a11y:contrast       # palette stays above accessible contrast ratios
pnpm budget              # per-route JS budget
pnpm audit --audit-level=high
pnpm bench --target staging --iter 20   # needs BENCH_STAGING_URL, or --base <url>
pnpm deploy:staging
```

`--target staging` reads its URL from `BENCH_STAGING_URL` because the staging
Worker sits on an account-specific `*.workers.dev` subdomain. `production` and
`local` are fixed; `--base <url>` overrides any of them.

## Working in parallel

Concurrent content sessions must **not** each run `pnpm build` — several running
at once collide on `dist/`. Give each session a disjoint set of track
directories, and run the build once at the end. That disjoint-directory rule is
also why the figure registry is split per track (see **Figures**).

## Engineering principles

These override convenience. When one conflicts with "just make it work", these win.

- **Do not preserve backward compatibility.** Remove obsolete paths outright.
  No compatibility layers, no fallbacks, no migration shims kept "just in case".
- **Choose the simplest implementation that fully meets the current
  requirements.** No speculative abstraction, configuration or indirection for
  needs nobody has yet.
- **Grow the system in layers.** Start from the smallest version that works end
  to end, then add each capability on top of something that already works.
  Never trade a working product for unfinished complexity.
- **Keep components modular with clearly separated concerns.**
- **Prefer established, well-maintained libraries** where they reduce total
  complexity or improve reliability. Do not reimplement common functionality
  without a stated reason.
- **Use the dependencies already here before adding or hand-rolling.** Do not
  assume a library lacks a capability — check its docs and types first. (The
  search dialog is a `<dialog>` element precisely because focus trapping,
  Escape and background inertness come free from the platform.)
- **Make architectural decisions for the long term.** Do not accept a stopgap
  that only works for now and is meant to be replaced later.

## Non-negotiable invariants

**1. No HTML is ever personalised.** Every page is byte-identical for every
visitor. Progress lives in `localStorage` and nowhere else. This is what makes
the whole site edge-cacheable and the performance target reachable. A change
that makes HTML vary per visitor is a regression, not an optimisation.

**2. Nothing a learner writes leaves the browser.** There is no server to send
it to. Adding one to store progress or teach-back prose would break the
product's privacy boundary.

**3. A missing translation fails the build.** Astro i18n `fallback` is
deliberately unset — `fallbackType: 'rewrite'` would silently serve English at a
pt-BR URL. `content-parity.mjs` is the gate.

**4. Three.js is never on the critical path.** Dynamic `import()` behind an
`IntersectionObserver`, after a WebGL feature check, with a real `.catch()`.
Poster renders first; WebGL replaces it. One long-lived `Stage`, never one
renderer per lab.

The explorer's current contract is the **Signal Observatory**: every component
in `COMPONENTS` has a selectable 3D port, an evidence-drawer state and a valid
lesson link. The specimen keeps visible input→output direction and bilingual
layer identity. Its material hierarchy is graphite frame + smoked glass +
ceramic tokens, with cyan reserved for signal and one amber FFN core; do not
restore rainbow slabs. Keep the model procedural unless a real interaction
requirement justifies a downloaded asset. Update
`tests/transformer-scene.test.mjs` when that mapping or geometry changes, then
verify `/explore/` in a real desktop and mobile browser.

Two rules the geometry has already broken once each:

- **The scene must fit the stage envelope.** Nothing auto-frames the model —
  camera, fov, fog and floor are fixed constants. `src/lib/three/envelope.ts`
  publishes `FIT_SIZE` and `STAGE_FLOOR_Y`; a scene that outgrows them does not
  merely sit off-centre, it sinks through the floor and clips the canvas at
  whatever size the author happened to be looking at. The regression test
  asserts both. A review harness with its own camera and no floor will not
  catch this — only `/explore/` will.
- **A concept render is proportion and material intent, not a contract.** It has
  no obligation to be architecturally true, and matching its silhouette once put
  a *third* residual bypass into the model; a decoder block has exactly two.
  When the picture and the architecture disagree, the architecture wins — this
  is a teaching product. Silhouette-similarity scores against a generated
  reference are not a gate; the tests and `/explore/` are.

**5. No `any`.** `unknown` plus a type guard. `ast-grep scan` blocks commits.

**6. The CSP lives on one `_headers` line with a hard 2,000-character limit.**
Cloudflare *drops* a `_headers` line above 2,000 characters, and the site then
serves **no CSP at all** — silently, with every local gate green. The line is at
1,693. `gen-headers.mjs` appends a sha256 per distinct inline `<script>` (~55
chars) and per distinct inline `<style>` (~110, because style hashes go into
both `style-src` and `style-src-elem`). That is roughly five scripts or two
styles of headroom for the whole site.

Three rules follow, and they are why the figure system ships zero JavaScript:

- **Never `define:vars` on a `<style>`.** It emits one inline `<style>` per
  component instance, one hash each, and destroys the policy. Pass values as
  `style="--x: 42"` attributes; `style-src-attr 'unsafe-inline'` permits them.
- **A component's `<script>` must be data-free and byte-identical everywhere**,
  reading parameters from `data-*`. That is why 210 lesson pages produce only
  nine distinct script hashes.
- A static scoped `<style>` in an `.astro` file costs **zero** hashes — Astro
  links it into `_astro/*.css`. All component CSS goes there, and per-route CSS
  is budgeted at 72 KB by `bundle-budget.mjs`.

`tests/rendered-html.test.mjs` asserts the line stays under 1,900.

## Performance: read this before touching the bench

`scripts/bench.mjs` reports **two** numbers and they mean different things:

- **server** — observed latency minus a measured TCP-handshake RTT. What the
  site controls. This is what the gate is on (< 50 ms p95).
- **wire** — what the measuring machine actually saw, including ~40 ms of
  São Paulo→edge physics that no optimisation can remove.

Quoting the wire number as "the site is slow" or the server number as "what
users experience" are both wrong. The report prints both for that reason.

Four countermeasures are baked in because benchmarks here have lied before:
`--iter` is floored at 16 (a p95 over 5 samples is just the maximum); every
route asserts its **own** unique `data-page-marker` and duplicates are a hard
error (a shared footer string once passed pages serving only a skeleton);
`loadavg` is recorded per run; and deltas under ~5% are noise on a loaded
machine, not wins.

`--self-test` forces an impossible budget and **requires** every route to fail.
A gate never seen red is not a gate. Run it after changing the harness.

## Cloudflare

**Static assets only. There is no Worker script and no binding of any kind** —
`wrangler deploy --dry-run` should report assets and `No bindings found`. An
HTML request therefore never starts an isolate, which is the entire performance
argument. Do not add `main` or bindings to `wrangler.jsonc`.

- `compatibility_date` is the date the config was actually tested, not an old
  pinned example. Keep it current when you touch the deploy.
- Named environments do **not** inherit `assets` or anything else. Every `env.*`
  re-declares the whole block or staging goes up broken and silent.
- `wrangler deploy` exits 0 with empty output in non-TTY. **Never trust its
  stdout.** Verify with `wrangler versions list` plus a live smoke request.
- The staging canary is the real explorer flow: open `/explore/`, inspect the
  server-rendered `[data-detail-cta]` href, click “View lesson”, and require the
  track-qualified lesson page to render. A green local link gate does not prove
  that the newest asset version reached the live Worker.
- Run wrangler and vite under Node, never Bun — wrangler hangs silently after
  its first API call under Bun.
- Smart Placement stays off: static assets already serve from the nearest
  location, and there is no Worker to place.
- Asset limits: 100,000 files per version, 25 MiB each. The build emits ~600.
- `_headers` is generated by `scripts/gen-headers.mjs` from hashes of the actual
  inline scripts in the output, so editing an inline script cannot silently
  break the CSP.
- `not_found_handling: "404-page"` needs a real `404.html` to resolve to.
  `src/pages/404.astro` and `src/pages/pt-br/404.astro` are it; without them
  every bad URL returns a zero-byte body, which is how it shipped once already.
- **The not-found walk matches a literal `404.html`, and `html_handling:
  "auto-trailing-slash"` hides one.** The walk climbs from the requested path
  (`/pt-br/x/404.html` → `/pt-br/404.html` → `/404.html`), but that mode
  307-redirects `/file.html` to `/file`, and a sibling `404/index.html` claims
  `/pt-br/404/` and shadows the literal name. `finalize-dist.mjs` therefore
  emits `<locale>/404.html` **and deletes the directory form**. Both halves are
  load-bearing; with only the copy, pt-BR still served the English page. No
  local gate can see this — the asset router decides it, so the only proof is a
  live request for a missing pt-BR URL.
- **Never set `Cache-Control: no-transform` on HTML.** It does stop Cloudflare
  rewriting the payload at the edge, which is tempting as a way to block
  injected third-party scripts — and it disables the CDN's Brotli/gzip on those
  responses at the same time, because the directive forbids every intermediary
  from transforming the body and Cloudflare is one. Uncompressed HTML is a far
  worse regression than the thing it fixes.
- **The zone can inject script the build never emitted.** Cloudflare Web
  Analytics with automatic setup adds `static.cloudflareinsights.com/beacon.min.js`
  at the edge, for browser requests only — invisible to `curl` without a browser
  `User-Agent` and `Accept`, and absent from `dist/`. The hash-pinned CSP blocks
  it, so it collects nothing and logs a violation in every visitor's console.
  The fix is `auto_install: false` on the RUM site, not a CSP allowlist: a
  third-party script origin would cost the property that makes the privacy
  claim structural. Check for edge injection with browser headers after any
  zone change.

## Static-only architecture

There is no API, no database and no server-side state. This is a decision, not
an omission.

The consequence worth keeping: **the privacy promise is structural.** Teach-back
prose and quiz results cannot reach a server because there is no server.

Completion is local and unchanged: a lesson completes when the teach-back is
≥80 characters and ≥15 words **and** the quiz is answered correctly.

## Content

Lessons: `src/content/lessons/{en,pt-br}/<track>/<id>.mdx`. Schema in
`src/content.config.ts` (Astro 7 path, Zod 4).

Every lesson is **concept → analogy → optional lab → teach-back → quiz**. A
lesson completes only when the teach-back is ≥80 characters and ≥15 words *and*
the quiz is answered correctly.

Markdown runs on the **unified** pipeline, pinned over Astro 7's Sätteri default
— see `docs/adr/0001`. Math, callouts (`:::note`, `:::insight`, `:::warning`,
`:::caveat`), heading anchors and Shiki all work; verify against emitted HTML if
you change the pipeline.

**Math is MathML only — do not restore KaTeX's default output.** `rehype-katex`
defaults to `htmlAndMathml`, which emits two parallel renderings and relies on
`katex.min.css` to hide one. That stylesheet was never imported here, so every
formula on the site rendered *twice* — 340 display blocks and 817 inline spans
across 91 lessons, in production, invisible to every gate because both halves
are valid HTML. `output: 'mathml'` renders natively, needs no stylesheet and no
font download (the zero-network-font rule), and is what a screen reader reads.
Importing the CSS instead would cost ~23 KB render-blocking plus font files.

## Figures

Lesson bodies had **no visuals at all** before 0.5.0. Authors now write
`<Figure id="…" />` in MDX **with no import** — `src/pages/**/lessons/[...slug].astro`
supplies the component via `<Content components={{ Figure }} />`, and MDX throws
at build time naming the component if that wiring is lost.

One registry entry serves both locales, so the MDX call is byte-identical in
`en` and `pt-br` and a missing translation is a **type** error, not a gate
failure. Definitions live in `src/lib/figures/<track>.ts` — one file per track,
matching the disjoint-directory rule concurrent content work already follows,
because a single registry file would conflict across every session at once.

Four primitives, and the rule that picks the medium is per-*content*, not
per-kind: **SVG draws geometry, HTML holds every string.** pt-BR runs 15–25%
longer than English and SVG `<text>` does not wrap, so a label in an `<svg>` is
a clipped label.

- `flow`, `stack` → real `<ol>`s. They are ordered lists; no ARIA needed.
- `grid` → a real `<table>` with `<th scope>`. A masked attention matrix *is* a
  table, and screen readers already navigate one announcing both headers.
- `plot` → inline SVG for the curve; ticks, axis titles and a `<details>` data
  table in HTML. A one-line alt cannot convey a curve.

Stepped figures use native `<input type="radio">` plus sibling selectors: zero
JavaScript, zero CSP hashes, zero bundle budget, keyboard operation free. The
input is `.visually-hidden` and **never** `display: none`, which would remove it
from the tab order; the focus ring moves to the visible label.

Two cascade traps, both already hit: `.prose :global(ol)` in `Lesson.astro` has
specificity (0,1,1) while Astro scopes components with `:where()`, contributing
**zero** — so a single-class figure selector loses and every flow renders as a
prose list. Figure list roots double their class. And `.prose` sets
`font-size: 1.3rem`, so figures set their own sizes explicitly.

Numbers come from `src/lib/model-facts.ts` and nowhere else.

`pnpm content:figures` resolves every referenced id against the real registry
and the real corpus, requires both locales to reference the same figures, and
flags a pt-BR label identical to its English twin unless it is notation or a
term AGENTS.md keeps in English. It cannot judge whether a figure is *true* —
that still needs a reader.

pt-BR is a real translation, not machine output. Industry-standard English terms
(*embedding*, *attention*, *fine-tuning*) stay English inside Portuguese prose.

**Numbers are localised, notation is not.** pt-BR prose groups thousands with a
period and marks decimals with a comma (`262.144`, `1,5 MiB`); EN prose keeps the
EN convention. Inside `$…$` and `$$…$$` nothing is localised — math is
byte-identical across locales — *except* prose inside `\text{…}`, which is
translated. Two independent reviews found the same defect when this drifted: one
comma meaning thousands in a sentence and decimals two sentences later.

**Never write a bare `$` before a digit.** `remark-math` parses it as the start
of an inline formula and swallows the sentence into garbled KaTeX. Prices are
written `USD 0.45`. This shipped once and was caught only by comparing rendered
HTML, not by any gate.

**Qwen3.8-27B is the course's running worked example.** Every number about it
comes from the model card and its `config.json`; the model has **no technical
report**, so training-token counts, dataset composition, cutoff and training
compute must never be stated. The KV-cache arithmetic is derived once in lesson
7.2 and the memory budget once in 9.3; every other lesson references them rather
than re-deriving, because four parallel writers produced three different budgets
for the same card before this rule existed.

Comparison tables are supported: GFM tables render, and `rehypeTableScroll`
(`src/lib/markdown/tables.mjs`) wraps each one in a focusable, labelled,
horizontally scrollable region so a wide table never makes the page scroll.

**Labs are real, and they are measured.** A lesson declares
`lab: { id, kind, budgetKb }`; `Lesson.astro` renders the component matching the
id from `src/components/labs/`. A lab **server-renders its defaults**, so a
reader without JavaScript gets a worked example, not an apology — and those
defaults must reproduce the lesson's own worked numbers, or the page contradicts
itself. Do not add a no-JS submit button: pages are prerendered and never read a
query string, so the control would lie. `pnpm budget` enforces the declared
`budgetKb` and counts **inline** script bytes, because Astro inlines small
scripts and they are otherwise invisible to every budget.

## External systems reference

The published corpus is tracks 0–9; documentation must describe that shipped
scope exactly.

The project's implementation reference for Kimi K3's 2.8-trillion-parameter MoE
in C is [Colibrì](https://github.com/JustVugg/colibri), specifically its
`c/kimi_k3.c` engine and `docs/kimi_k3.md`. It streams routed experts directly
from the original MXFP4 checkpoint with `pread` and optional `O_DIRECT`.
Memory and throughput figures are hardware- and revision-specific; cite the
upstream measurement instead of repeating a fixed memory requirement.

## Docs

`MEMORY.md` (curated state) + `FOR_YOU_KNOW.md` (plain-language explainer) +
`PRODUCT.md` (product facts) + `DESIGN.md` (visual system). Read them when
opening the repo.
