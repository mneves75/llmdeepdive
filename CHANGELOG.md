# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- A 23-second launch video, `brag-output/brag.mp4` (poster `brag.jpg`, post text `share-copy.txt`). Every scene after the opening line is the built site itself, driven by script; `brag-output/work/` holds the scripts that rebuild it from `dist/`, and `brag-plan.md` the storyboard, measurements and rebuild steps.

## [0.8.1] — 2026-09-25

### Fixed

- Portuguese lessons called a course track "track" 49 times across 35 lessons ("da track 7", "nesta track") while the interface, breadcrumbs and cards say "trilha". Since 0.8.0 lesson summaries are the descriptions search engines show, so the English word also reached pt-BR search snippets. The prose now says "trilha", and each changed lesson's date moved to 2026-09-25.
- `pnpm content:parity` (part of every build) now fails when pt-BR lesson prose says "track"; code spans such as `--track` are not prose and stay legal.

## [0.8.0] — 2026-09-25

Search and share metadata for every page, generated from the corpus. No new pages: Google's guide to its AI search features says pages made for query variations mainly to manipulate results violate its scaled content abuse policy, so the work went into the 238 pages that already teach something.

### Added

- Every page describes itself in one JSON-LD graph. The home pages carry `WebSite` and `Organization`, which Google reads for the site name; every other page carries a `BreadcrumbList`; every lesson adds an `Article` with its headline, summary, last-updated date, track, language, tier, licence and the sources it cites. The `Article` names no image, because Google asks for images relevant to the article rather than logos or captions, and the social card is both; it stays the page's link-preview image. Only types Google supports for such pages are used: no `Course` (Google's course list is for instructor-led courses with a roster of students), no `FAQPage` (Google retired FAQ results in May 2026) and no quiz markup. The graph adds about 2.3 KB to a page (at most 3.2 KB).
- Every page has its own 1200×630 social card at `/og/<page>.png`, showing its headline, its place in the course (track, lesson, tier) and, for lessons and tracks, the four tiers with its own lit. Cards are drawn at build time from the same data as the page, with fonts bundled into the build (Roboto Condensed, plus Roboto's maths subset for the √ in lesson 4.3), so a rebuild produces the same bytes. A character no bundled font covers fails the build instead of rendering blank. Link previews use the large-image card (`summary_large_image`), and pages allow large image previews in search (`max-image-preview:large`).
- `<lastmod>` for 236 of the 238 sitemap URLs, taken from each lesson's `updated` date. A track page takes its newest lesson; a home page and the track index take the newest lesson in their language; the explorer has no content date and gets none.
- `/llms.txt`, an [llmstxt.org](https://llmstxt.org/)-shaped index of every track and lesson in both languages. Google Search does not read it, so it is served with `X-Robots-Tag: noindex` and never competes with the pages it lists.
- `tests/seo.test.mjs` checks all of this against the build: complete metadata on every page, a built 1200×630 card for every `og:image`, JSON-LD that matches the visible page, sitemap dates equal to lesson dates, and every `llms.txt` link resolving. Planted defects for each check were caught before release.

### Changed

- Titles name their subject. A lesson title gains its track when the whole title still fits 60 characters ("MLX · Building & Serving Stacks — llmdeepdive"; 28 of 212 lessons); longer titles already carry their subject. The home, track index, track and explorer titles now say "LLM" and fit in 60 characters ("How LLMs actually work: free bilingual course — llmdeepdive", "The Transformer · LLM course — llmdeepdive"). The pt-BR home title, description, footer and cards say "gratuito" rather than "livre", because in Brazil a "curso livre" usually means a non-accredited course rather than a free one, and the home description says "trilhas" instead of "tracks".
- The favicon is the header's mark, a cyan ring and crosshair on the abyss ground. The cream "L" tile it replaces predated the redesign. The organisation logo in the structured data is drawn from it at 512px.
- Pages also declare `og:site_name` and `og:locale:alternate`; lessons are `og:type` `article` with `article:modified_time` and `article:section`.

### Fixed

- Lesson dates were stale. v0.6.2 and v0.6.3 revised summaries, quiz answers and model answers in 211 lessons on 2026-09-13 but moved only 12 of their `updated` dates, and v0.6.4 corrected two pt-BR citations on 2026-09-15 without moving theirs, so 199 lessons still showed an August date. Each lesson is now dated by its last content change in the Git history (201 dates moved), and `tests/content-dates.test.mjs` fails when a commit changes a lesson without advancing its date. The date is what the sitemap, `dateModified` and `article:modified_time` now publish, so it has to be true.
- The 404 pages declared a canonical URL and language alternates pointing at `/404` addresses that do not exist. They are now `noindex` and declare neither, and carry no card or structured data.

### Security

- `fflate`, reached only through `satori` at build time, is overridden to 0.7.5 for GHSA-px8p-9vwx-vf98, so `pnpm audit` stays clean at every level.
- JSON-LD blocks are data, which browsers never run and CSP does not govern. The header generator, the CSP test and the JavaScript budget now skip them; hashing them would have added one CSP hash per page and pushed the policy line past Cloudflare's limit in a single build. The line stays at 1,585 characters with seven script hashes.

## [0.7.0] — 2026-09-23

A design review of every surface (two independent assessments, detector and three-engine browser evidence) and the fixes it called for.

### Fixed

- Search results were unreadable: every title ran into its excerpt as one paragraph, and the dialog sat pinned to the left edge. Results are built by script, so they carry no Astro scope attribute and none of their styles ever applied; Tailwind's preflight had also removed the dialog's centring. Both are restated, and the rule is in `AGENTS.md`.
- Search excerpts no longer start with "Skip to content" or carry quiz answers, dates, prerequisites or raw TeX. Pagefind now indexes `<main>` only, without lesson chrome, answers or TeX source, and a result is shown only when a highlighted word begins like a query term: Pagefind's fallback to shorter query prefixes had made nonsense queries return lessons through one-letter formula symbols.
- Portuguese track pages labelled every track in English ("FOUNDATIONS · 8 aulas"). Tier names now come from one shared table, and the pt-BR home and lesson copy says "trilhas" and "explicação" instead of "tracks" and "teach-back".
- Lessons and tracks were numbered three different ways (slug `1.3-bpe-step-by-step` in the rail, "02" on the home map, "02.03" on track pages). Every surface now shows the position from the id: track 1, lesson 1.3.
- The home page's primary action sat on the bottom edge of a 1440×900 screen; the hero now sizes by viewport height too.
- WCAG fixes: field borders and the teach-back focus ring reach 3:1 (they measured about 2.1:1 and 1.6:1); header links, summaries and track rows are 44px tall and the theme switch 42px, all well above WCAG's 24px minimum; the search close control is 44px and its name includes its visible "Esc"; the lesson status no longer re-announces itself on load; a focused element is never hidden under sticky chrome.

### Changed

- The quiz tells you which answers are wrong ("Not yet — reread and try again") in words and colour, and each explanation stays hidden until its question is answered right, then opens by itself, so a lesson is completed by answering rather than by reading ahead. A quiz you passed before keeps its explanations. Without JavaScript the explanations stay readable, since nothing can be checked there.
- Track pages mark the lessons you finished and count them per track. The lesson page records completion in this browser only; the HTML every visitor receives is unchanged.
- The home hero's cutaway is now the curriculum itself: four strata, one per tier, each linking to its first track with its track range and lesson count, instead of four decorative labels and five markers that matched nothing.
- On phones the header scrolls away, so a lesson's section strip is the only sticky chrome (the two together took 22% of an 844px screen); the strip keeps the current section in view, and the language switch moved into the nav row instead of disappearing.
- The lesson rail marks the section being read (a small observer in the lesson script), and its rule fills as you read where scroll-driven animation is supported. Pages cross-fade under a fixed header in browsers with cross-document view transitions. The gauge and the cross-fade are CSS only and off under reduced motion.
- The teach-back shows progress toward its 80-character, 15-word rule.
- The search button shows `/` as its shortcut, which works on every keyboard; ⌘K and Ctrl+K still open search. The home hero drops its row of headline numbers, which the strata now carry. The explorer's annotation callout uses the design system's callout shadow.
- Icons are one authored inline-SVG set instead of Unicode glyphs; eyebrow labels above headings are gone, with lesson part numbers (`01/05`) inside their headings; callouts use a tinted outline instead of a side stripe; the 404 page and track headers follow the design system; lesson titles are capped at the documented headline size.
- `pnpm a11y:contrast` also gates non-text contrast (field borders and the focus ring at 3:1 on every surface).
- One more inline script hash (the track-page progress reader): seven in total, and the CSP line is at 1,585 of the 1,900-character budget.

## [0.6.8] — 2026-09-23

### Fixed

- The build is reproducible again. Pagefind wrote the two search languages in a different order from one build to the next, so rebuilding the released commit made `pnpm verify:live` report `pagefind/pagefind-entry.json` as not matching production. `finalize-dist.mjs` now sorts them; three consecutive builds are byte-identical, and a test fails if the order is unsorted.

### Added

- `pnpm verify:live` requests the home page with browser headers and requires it byte-identical to `dist/`, naming the Web Analytics beacon if the zone injected it. Cloudflare injects scripts only into browser-like requests, so the existing byte check could not see them; the self-test covers the new check. Web Analytics stays disabled for this site: the course promises no tracking, and allowing a third-party script origin would give up that promise.

## [0.6.7] — 2026-09-23

### Fixed

- Following "View lesson" while the 3D explorer is still loading no longer logs "3D stage failed to start". WebKit and Firefox cancel the explorer's code the moment navigation starts, and that was reported as a failure; the Navigation API's `navigate` event (Chrome 102, Firefox 147, Safari 26.2) now marks the page as leaving first. A failure that really happens is still reported and restores the poster. No `beforeunload` listener is used, so the page stays in Firefox's back/forward cache and iOS Safari is covered too.
- A page restored from the back/forward cache after being left mid-load reloads itself, as it would had the browser not cached it, so the 3D view loads again; before, it stayed a poster, because Chromium never retries a module import that failed once in the same page. The restore is replayed in Chromium and Firefox with a synthetic persisted `pageshow`, because Playwright's engines reload on back instead of restoring from the cache; a real cache restore has not been observed. Playwright's WebKit keeps a failed module even across a plain reload, so there the explorer may still stay a poster until the next visit.

### Added

- `pnpm render:check` covers the explorer lifecycle in every engine with WebGL: leaving while the 3D view is still loading (with the next page held back two seconds) must stay silent, coming back must load the 3D view, a replayed back/forward-cache restore must restart it (in Chromium and Firefox; Playwright's WebKit cannot load a failed module again even after a reload, so the check reports that case as not covered rather than passed), and a broken 3D chunk must be reported with the poster restored. On the 0.6.6 build it fails the leave case in WebKit and Firefox and the restore case in all three engines.
- `pnpm verify:live --target staging|production` proves a deployment: every built file byte-identical on the target, the generated CSP, Brotli, localized 404 pages, the `www` redirect on production, and a real explorer → lesson click in Chromium, WebKit and Firefox (a 200 response with the lesson's own article, so a 404 page cannot pass) at the current version with no page error, CSP violation or explorer error. `--self-test` gives each check a wrong expectation or an injected violation and requires every one to be caught.

### Changed

- `bench` and `verify:live` share one target list (`scripts/targets.mjs`).

## [0.6.6] — 2026-09-23

### Security

- `devalue` (reached through `astro`) moves from 5.9.0 to 5.9.4 for GHSA-9rgm-9g3h-6x36, a denial of service on malformed input. It runs only at build time here, but `pnpm audit` now reports no vulnerability at any level.

### Changed

- `AGENTS.md` keeps its rules and drops the release history already recorded here and in `MEMORY.md`, plus a `pnpm --filter` command this single-package repo cannot use; `CLAUDE.md` points to its package-management section instead of copying it. The stated CSP headroom is corrected to roughly six scripts or three styles, which is what the 1,900-character budget leaves.

## [0.6.5] — 2026-09-15

### Added

- Teach-back answers can be cleared with "Clear my answer". The prose exists only in this browser, so this is the only place a learner on a shared profile can remove it; a failure to clear is reported rather than hidden.
- `pnpm render:check` loads every route in Chromium, WebKit and Firefox and fails on horizontal overflow at 320px, duplicate ids, uncaught page errors, scroll regions whose semantics disagree with their overflow, and inline formulas that leave the text baseline. Chromium repeats the sweep with a wide system font, because the site's layout depends on the fonts a visitor has installed. Its `--self-test` injects each defect and must fail. CI runs both.

### Fixed

- Inline formulas sit exactly on the text baseline in Firefox too. The first render-check run found 0.6.4's `inline-flex` formulas 1.3px low there; engines with `baseline-source` now use `inline-block` with `baseline-source: first`, and WebKit keeps `inline-flex`.

- Pages no longer scroll sideways on phones whose system fonts are wider than condensed Avenir. CI's Linux fonts pushed the pt-BR "Trilhas de aprendizagem" title 40px past a 320px screen; a wide-font sweep then found the same fragility on 109 routes. Headings may now break an over-long word, the curriculum titles hyphenate ("APREN-DIZAGEM"), single-column home sections no longer size themselves to their longest word, and long API names in citation titles and prose links wrap.

### Changed

- Both calculators compute through one shared module (`src/lib/lab-math.ts`) for the server-rendered example and the live update, and share input handling (`src/lib/lab-form.ts`); verdict copy reaches the browser through `data-*`, so the scripts carry no duplicated text.

### Security

- `pnpm-workspace.yaml` states the one-day `minimumReleaseAge` explicitly.
- The rendered-site test pins the number of inline script and style hashes, because the header generator trusts every inline block it finds; a new one is now a reviewed change.

## [0.6.4] — 2026-09-15

### Fixed

- Inline formulas sit on the text line again. 0.6.3 made every inline formula an `inline-block` scroll container, which lifted each one above the baseline like a superscript and loosened line spacing across every lesson with maths; they now scroll as `inline-flex`, which keeps the baseline, so long formulas still stay within a phone screen.
- Matrices render with column gaps. The CSS reset had removed MathML's cell padding, so `[2 0; 0 1/2]` read as "01/2".
- Calculators accept "1,5" and "1.5" on any browser. Inputs no longer rely on `type="number"`, which Chrome parses in the browser's language and Safari rewrites. An invalid input now clears every result instead of leaving the last answer beside the error; the error is announced, and an overflow says so instead of blaming valid inputs.
- A lesson no longer claims completion when the quiz result could not be saved, and loading a lesson no longer writes an empty teach-back answer or reports it as saved.
- Model answers containing `$$` no longer render empty formulas, and a malformed formula fails the build instead of shipping an error.
- The theme control treats an unrecognised stored value as "auto" and clears it, reports when the browser cannot save the choice, and follows a change made in another tab.
- The explorer reacts when reduced motion is switched on or off while it is open. Its motion control, now labelled "Animate", pauses both rotation and the token flow, and reduced motion also removes drag inertia.
- Short equations and tables that fit are no longer announced as scrollable regions or placed in the tab order; wide ones keep those semantics.
- Search announces "8 results" rather than a bare number.

### Changed

- Content parity now also compares each lesson's order, tier, prerequisites, unlocks, lab, citation policy, cited sources and quiz option counts across languages, and each track's id, order and tier.
- Track metadata is JSON only; the unused YAML track format is no longer accepted, so every track the site loads is also checked for parity.
- pt-BR citations list "contribuidores" consistently.

### Security

- The build fails when the Content-Security-Policy line exceeds its 1,900-character budget, so a deploy can no longer ship a policy Cloudflare would silently drop. The search script no longer uses per-locale inline data, reducing inline script hashes from nine to six and the policy line from 1,693 to 1,531 characters.
- Removed the obsolete `interest-cohort` Permissions-Policy feature, which browsers report as unrecognised.
- CI checkout no longer leaves the job token on disk for later steps.

## [0.6.3] — 2026-09-13

### Fixed

- Wide formulas, long headings and tensor names now stay within narrow screens; plot labels remain readable in mobile Safari, and the 3D explorer keeps its dimensions after resizing.
- Teach-back answers render native MathML, report storage failures honestly, and complete a lesson only after the answer is saved and the quiz passes.
- Calculators validate empty, negative and out-of-range inputs, accept continuous numeric values, localize their output, and explain when the memory pool cannot fit one sequence.
- Search keyboard navigation wraps correctly; explorer keyboard navigation starts at the correct end, and 3D controls remain disabled until rendering is available.
- Bilingual training-cost calculations, Transformers and MLX examples, quantization comparisons and explorer explanations now agree with their cited sources.
- Navigation language labels, curriculum counts and social-card metadata now describe the content accurately.
- Benchmark confirmation requests retain HTTP and page-identity failures; privacy diagnostics identify violations without printing the private values.

### Changed

- Contributor instructions include every content and privacy gate, and the assistant contract requires checking rendered output after meaningful visual changes.

## [0.6.2] — 2026-09-13

### Added

- Lesson 7.12 now includes a bilingual Kimi K3 in C case study, with pinned sources explaining weight streaming, process RSS, storage requirements and the limits of upstream performance measurements.
- Content gates now parse bilingual MDX to keep mathematical notation identical across locales, catch high-confidence pt-BR number-format drift, and reject quiz answer keys that collapse onto one position.

### Fixed

- A fresh-source review of all 212 lessons corrected technical, arithmetic and translation defects across every track. The Qwen3.8-27B deployment campaign is now taught as protocol-bound evidence: template semantics, reasoning budget, realized context, correctness canaries, runtime and harness all travel with a benchmark number.
- The Gated DeltaNet matrix-state budget is 144 MiB per sequence in the current Transformers reference float32 path, not a universal 72 MiB. Lesson 7.2, lesson 9.3, the shared fact sheet and the interactive memory lab now agree.
- The memory lab now recalculates on both `input` and `change`, so selecting a different context updates its per-sequence cost and concurrency in real use.
- The pinned Q4_K_M text artifact is now reported at its exact 17,106,773,984-byte size (17.1 GB / 15.93 GiB), MI300X capacity uses the runtime-reported roughly 192 GiB pool, and checkpoint/file-size throughput quotients are labeled as planning heuristics rather than hard roofline bounds.
- Lesson 8.8 now configures Ollama's supported presence penalty explicitly in both languages and keeps its teach-back answer consistent with the Modelfile.
- The contributor guide uses the current Kimi reference, and the Markdown ADR now documents nested unified plugins and MathML-only output.
- The privacy gate recognizes the exact public GitHub service addresses used in Dependabot commit metadata, while still rejecting other addresses and lookalike domains.

### Changed

- The home page, explorer and project documentation now use [Kimi K3 in C](https://github.com/FareedKhan-dev/kimi-k3-in-c) as the external Kimi K3 systems reference.
- Quiz choices were redistributed in both locales without changing their grading semantics, removing the site-wide correct-position shortcut.
- Cloudflare's compatibility date is now 2026-09-13.

### Security

- Updated Astro, Wrangler and affected transitive dependencies to clear the build toolchain's critical, high and moderate dependency advisories.
- Removed obsolete package release-age exceptions; the updated dependencies satisfy the default age policy.

## [0.6.1] — 2026-08-19

### Fixed

- **Lesson 7.13's graded frontmatter still argued the position 0.6.0 corrected.**
  Rewriting the body left the teach-back opening "The name carries five fields"
  against a body that now says a free-text repository id carries clues rather
  than fields; left a quiz asking why quantizing leaves prompt processing
  "roughly unchanged" when the shipped table shows it slipping from 923 to 709
  tokens per second; and left another quiz explanation pairing Llama-3.1-8B's
  4.8944 bpw with "a 27-billion-parameter model" in one sentence — the exact
  conflation the lesson's own note warns against. Frontmatter is graded content;
  it has to move with the prose.
- The 0.6.0 changelog entry described the throughput figure as showing "prefill
  stays flat", which is the claim 0.6.0 corrected before shipping.
- The date regression test compared a bag of digits, so it would have passed a
  lesson whose day equals its month (2026-08-08 rendered as 08-07 still offers
  an 8 from the month). It compares the whole rendered string against the same
  UTC formatting now; reverting the fix trips two assertions instead of one.

## [0.6.0] — 2026-08-19

### Added

- **Lesson 7.13, "Choosing and judging a community quant".** The course taught
  every mechanism behind a Hub quantization and none of the vocabulary printed
  on one. The new lesson reads a repository name for the clues it may carry, introduces
  **bpw** as the name for the effective rate lesson 7.9 already computed,
  explains why it is fractional (metadata is counted in, and mixed recipes
  assign different widths per layer), separates importance-matrix calibration
  from the IQ formats, and closes with the procedure for comparing two artifacts
  on your own machine.
- **Two figures on 7.13**, and `LLAMA_CPP_QUANT_BENCH` in `model-facts.ts` to
  feed them. The plot carries llama.cpp's whole published Llama-3.1-8B table —
  explicitly not Qwen3.8-27B numbers — and it is deliberately the *whole* table,
  because an earlier four-row version happened to be monotonic and made the
  figure argue a law the full data denies. What it actually shows: every
  quantized build decodes two to three times faster than F16 (lesson 7.3's
  memory-bound decode, measured), prompt processing never improves and in fact
  slips from 923 to 709 tokens per second, and below about 8 bits size stops
  predicting speed entirely — `Q2_K_S` at 2.97 bpw is the fastest artifact in
  the table, beating every 4-bit build.
- Chat templates as **separately distributed, swappable artifacts** in 8.2,
  plus tool calling as a format the template renders and the harness parses.
- `mlx-community`, mlx-lm's mixed recipes and `--target-bpw` in 8.9; the IQ
  family and the imatrix-versus-IQ distinction in 8.7.

- **`pnpm privacy` — a gate for what a public repo leaks that is not a secret.**
  The full-history Gitleaks scan passed on every commit while an absolute home
  path, a third party's email address and an account-specific deploy subdomain
  sat in tracked files. None is a credential, so none was in scope for it. The
  new check scans tracked file contents *and* commit metadata — author,
  committer, subject, body — because a name in a commit's author field is
  exactly as public as one in a file and no file-level scan can see it.

  Two design choices worth stating. Email addresses are **allowlisted**, not
  denylisted: only an allowlist catches the address nobody thought to forbid,
  which is the failure mode that actually occurred. And the shipped rules
  describe **shapes, not names** — a gate that hardcoded the names it forbids
  would publish that list to everyone who clones the repo, which is the leak it
  exists to prevent. Names are injected through `PRIVATE_REFS_NAMES`; when it is
  unset the check warns rather than passing quietly, because a rule that
  silently did not run is worse than one that is absent.

### Fixed

- **Every lesson on the site showed a date one day early.** `coerce.date()`
  reads frontmatter as UTC midnight and `toLocaleDateString(locale)` rendered it
  in the *build machine's* zone, so all 212 pages were off by one from São Paulo
  — and the emitted HTML depended on where it was built, which a byte-identical
  static site cannot afford. Formatting is pinned to UTC, with a regression test
  that pins the mechanism rather than one machine's output.
- **A corpus-wide review pass corrected more than thirty verified defects
  across all ten tracks**, in both locales. The largest classes: the `q_proj` 6144 regression
  had survived in 0.4, 4.13, 7.6 and a 4.11 quiz explanation (the weight is
  5120→12288, split per head); five arithmetic errors (finite-difference cost
  in 2.5, `1.1^64` in 2.8, an epsilon ratio in 2.8, a softmax in 3.5, a
  rematerialization figure in 5.10); bf16's ULP stated as `2^-8` throughout 5.9
  when bfloat16 has seven explicit fraction bits; a claimed 100 GB saving from
  mixed precision that does not exist, since pure fp32 AdamW costs the same 16
  bytes per parameter; a dimensionally invalid matrix composition in 2.2; three
  statements about Qwen3.8-27B's training corpus and post-training that the
  model card does not support; 7.11 re-deriving the memory budget 9.3 owns using
  the very subtraction 9.3 stages as the classic error; and a roofline claim in
  9.2 whose frontmatter and quiz contradicted the lesson body.
- A missing decision table and a dropped cross-reference in pt-BR (7.11, 0.6).

### Changed

- `compatibility_date` moved to 2026-08-19, the date this deploy was actually
  tested against the live edge.

## [0.5.0] — 2026-08-19

Initial public release.

### Added

- **The course.** 105 lessons in each of English and Brazilian Portuguese —
  210 in total — across tracks 0–9, from *what is a parameter?* through
  efficient inference, the serving stacks that run a model (PyTorch,
  Transformers, `torch.compile` and CUDA graphs, vLLM, SGLang, TensorRT-LLM,
  llama.cpp/GGUF, Ollama, MLX, Modular MAX and Mojo, managed endpoints) and the
  silicon underneath (memory bandwidth versus FLOPs, the roofline, NVIDIA
  Hopper/Blackwell, AMD ROCm, Apple unified memory, Qualcomm Hexagon, Cerebras
  wafer scale, interconnects, cost per token). Every lesson runs
  concept → analogy → optional lab → teach-back → quiz, and completes only when
  the teach-back is substantive *and* the quiz is right.
- **One real model carries the whole course.** Every mechanism is worked through
  Qwen3.8-27B. Its layout — 64 layers as 16 × (3 Gated DeltaNet → 1 Gated
  Attention) — is the course's central contrast: only 16 layers build a KV
  cache, so 16 GiB of cache stands against what was then estimated as roughly 72 MiB of constant recurrent
  state at the native 262,144-token context. The KV arithmetic is derived once
  in 7.2 and the memory budget once in 9.3; every other lesson references them.
  `src/lib/model-facts.ts` holds those numbers as a typed module with per-value
  provenance, so no lesson invents its own.
- **A figure system with zero JavaScript.** Authors write `<Figure id="…" />` in
  MDX with no import, and one registry entry serves both locales, so bilingual
  parity is structural — a missing pt-BR label is a *type* error. Four
  primitives cover the recurring shapes: `flow` and `stack` render as real
  `<ol>`s, `grid` as a real `<table>` with row and column headers (a masked
  attention matrix *is* a table, which deletes a primitive's worth of ARIA), and
  `plot` as inline SVG with every string kept in HTML. Stepped figures switch
  with native radio inputs and sibling selectors: zero JavaScript, zero CSP
  hashes, zero bundle budget, keyboard operation free.
- **Labs that compute real numbers.** 9.3 carries a memory-budget calculator
  (usable memory, weight precision, context length and runtime reserve in;
  weights, KV pool, per-sequence cost and concurrent sequences out) whose
  defaults reproduce the lesson's worked example exactly. 9.10 carries the
  capstone cost comparison, where the break-even between a managed endpoint and
  rented GPUs moves with volume, price and throughput. Both server-render their
  defaults, so a reader without JavaScript gets a worked example rather than an
  apology, and both are localized.
- **The Signal Observatory** — an accessible Three.js explorer built as a
  machined instrument assembly: four collared posts, a stepped plinth, per-deck
  corner sockets, a central signal rail with a node at every layer, ceramic
  logit banks and an amber compute core, with bilingual layer labels and a
  selectable port for each of the 12 library components. Geometry is procedural,
  so the explorer costs tens of kilobytes rather than the tens of megabytes a
  GLB would. `src/lib/three/envelope.ts` publishes the stage envelope
  (`FIT_SIZE`, `STAGE_FLOOR_Y`) the fixed camera, fog and floor are tuned for,
  with a regression test asserting the built instrument fits it.
- **Local-only progress and Pagefind search.** No accounts, no server, no
  tracking: every page is byte-identical for every visitor and nothing a learner
  writes leaves the browser.
- **The gate set.** EN/pt-BR lesson parity, no stubs, a resolvable prerequisite
  graph, citations present or a reason given, every referenced asset and figure
  id resolving in both locales, internal-link integrity across `dist/`, palette
  contrast, a per-route JS budget and a per-route 72 KB CSS budget, a `_headers`
  CSP line asserted under 1,900 characters, and `pnpm audit --audit-level=high`.
  CI runs all of it plus a full-history Gitleaks scan.
- `scripts/finalize-dist.mjs` emits a literal `404.html` for every non-default
  locale, so Cloudflare's `not_found_handling` walk resolves one instead of
  falling back to English.
- `public/robots.txt` pointing at the sitemap index, and
  `Cross-Origin-Resource-Policy: same-site`.

### Changed

- **Math renders as MathML only.** `rehype-katex` defaults to
  `output: 'htmlAndMathml'`, which emits a MathML tree *and* an HTML tree and
  relies on `katex.min.css` to hide one. That stylesheet was never imported, so
  every formula rendered twice — 340 display blocks and 817 inline spans across
  91 lessons. MathML is native in every current browser, needs no stylesheet and
  no font download, and is the representation a screen reader wants. Importing
  KaTeX's CSS instead would have cost ~23 KB of render-blocking CSS plus
  self-hosted fonts to fix a bug that has a free fix.
- **The 187 callouts per locale are visible.** They had always emitted a
  semantic `<aside role="note">`, but the only CSS was `border-radius`, so the
  course's main rhythm device read as ordinary body prose. Each kind now carries
  its encoded pigment and an eyebrow label.
- Comparison tables render, with `rehypeTableScroll` wrapping each in a
  focusable, labelled scroll region so a wide table never makes the page scroll
  sideways on a phone.
- The lesson rail derives its links *and* every section number from one
  `sections` array, and lesson bodies can carry `##` subheadings.
- Lesson and track counts are computed from the collections rather than written
  as literals in five places that drifted whenever a lesson landed.

### Fixed

- **The query projection is 5120 → 12288, and it is gated.** Six lessons said
  5120 → 6144. These are *gated* attention layers with the gate fused into the
  same matrix: `config.json` sets `attn_output_gate: true`, and
  `Qwen3_5Attention` subclasses `Qwen3NextAttention` unchanged, whose `q_proj`
  is `nn.Linear(hidden, heads * head_dim * 2)`. The split is **per head,
  interleaved** — the tensor is viewed as 24 heads of 512 and each head's last
  axis is cut into 256 query + 256 gate, not one 6144-row query block followed
  by one 6144-row gate block, and that distinction decides whether a checkpoint
  conversion is correct. The gate activation is **sigmoid**, applied in the
  attention forward (`output_gate_type: "swish"` belongs to the Gated DeltaNet
  path), and `o_proj` receives the **gated attention output**, which merely
  shares the 6144 width. Corrected in 4.2, 4.5, 4.11, 4.14, 5.9, 5.10 and 8.1
  across both locales, including quiz answers and the activation-memory
  arithmetic that depended on it.
- Lesson 4.14's tensor names now match the real checkpoint index, which nests
  the text stack under `model.language_model.` and the vision tower under
  `model.visual.`, with `lm_head.weight` at the top level — and its advice to
  grep `model.layers.` was itself wrong, because `language_model.layers.` ends
  with that exact substring.
- Lesson 3.6 printed a delta rule that did not conform to its own state
  convention: the state is read with a transpose, so the retrieval and the
  rank-1 update had to be transposed too. The wrong form also survived in the
  teach-back model answer, in both locales.
- A bare `$` before a digit is parsed by `remark-math` as the start of an inline
  formula, so pricing written as `$0.45` was swallowed into garbled KaTeX.
  Prices are written `USD 0.45`. Caught by comparing rendered HTML, not by any
  gate.
- Numeric corrections across the corpus: 7.2's claim that a 64 GiB-per-sequence
  estimate overflows a 192 GB accelerator at two users (54 + 2 × 68.72 GB fits;
  three do not) and its calling 16 GiB "a quarter" of an 80 GB card (21.5%);
  9.3's usable-capacity reasoning, which used a decimal-to-binary conversion
  yielding a different figure than the one stated; 9.2 describing a 32×
  improvement as tenfold; 8.4, 8.12 and 9.3 giving three different KV-pool
  figures for the same 80 GB card, with 8.12 omitting the per-sequence Gated
  DeltaNet state its own quiz flags as an error; 4.3 dividing by `√16` in prose
  while deriving `√256` three paragraphs above; 4.16 calling a 227× contrast
  "nearly three orders of magnitude"; 4.15 describing what was then estimated as a 1.5 MiB per-layer state
  as "a few megabytes". 5.10's activation estimate is explicitly scoped to a
  uniform full-attention model — applying a full-attention layer's cost to all
  64 layers of a 3:1 hybrid was never sound.
- Unsourced claims removed: a "within days of release" quantization timeline and
  a "first serious attempt" superlative that Halide, TVM, XLA and Triton
  predate. Comparisons to Jamba and Granite-H carry a citation.
- **pt-BR number localisation was internally inconsistent** — one comma meaning
  thousands in one sentence and decimals two sentences later. pt-BR prose now
  groups thousands with a period and marks decimals with a comma; math stays
  international, except prose inside `\text{…}`, which is translated. Roughly
  200 further editorial corrections (false friends, agreement, regency,
  terminology consistency), plus a pre-existing drift where 3.5's pt-BR edition
  carried one fewer inline-math expression than its English twin.
- The explorer showed **three** residual bypass routes. A decoder block has
  exactly two, each starting at the input of the sub-layer it skips; the third
  existed only to match a concept render and taught an architecture that does
  not exist. A test pins the route set. Deck geometry was likewise
  re-proportioned to fit the stage envelope after a revision that matched a
  render's proportions sank the plinth through the floor.
- The cost lab priced a workload beyond one GPU's capacity as a single rented
  GPU, so it could call USD 1,825 the cheaper option for work that machine
  cannot do in a month; it now scales the fleet and reports GPU count and fleet
  utilisation. Its legend also promised three options and rendered two, and
  reported the rented GPU as cheaper when both costs were zero.
- The bundle budget counts inline `<script>` bytes. Astro inlines small scripts,
  and the gate only walked `<script src>` graphs, so inline JS was invisible to
  both the route budget and the per-lab budget. It also matched route paths by
  substring, and the English route `lessons/<track>/<id>` is a substring of the
  Portuguese one, so every lab was charged twice; paths are compared for
  equality.
- Both labs offered a no-JavaScript "Recompute" button that could never
  recompute: the page is prerendered and never reads the submitted query. The
  static worked example stands on its own; the buttons are gone.
- Dead documentation links: `docs.modular.com/max` 307-redirects to
  `max.modular.com`, and `nvidia.com/en-us/data-center/technologies/` returns
  404.

### Security

- Citation URLs are restricted to `http(s)`. `z.string().url()` accepts
  `javascript:`, `data:` and `vbscript:`, and the value is rendered straight
  into an `<a href>`. The CSP blocks execution, so this is defence in depth
  rather than a closed hole, but a schema that accepts a script URI is one
  review lapse from shipping one.
- `worker-src` does not allow `blob:`. Pagefind loads its worker from a path,
  verified by exercising search under the generated policy; `blob:` was unearned
  surface for turning a script foothold into arbitrary worker code.
- The search dialog accepts site-relative result URLs only, so a poisoned index
  cannot produce a `javascript:` or off-site `href`.
- `Permissions-Policy` denies `browsing-topics`.
- Unreferenced Pagefind UI bundles — hundreds of KB of unused JavaScript
  containing `innerHTML` sinks — are pruned from `dist/` instead of being
  uploaded on every deploy.
- `nanoid` is held at `^3.3.18` (GHSA-2v37-7h3g-55p8: a custom generator with
  size zero loops indefinitely). It reaches the project only through postcss
  under vite, so it is build-time and never shipped, but
  `pnpm audit --audit-level=high` is a CI gate.
