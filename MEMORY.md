# Project Memory

## Current Direction

- **0.6.3 closes the end-to-end review with verified rendering and interactions.**
  Deployed on 2026-09-13 from `99c14d8`, tagged `v0.6.3-beta1` for staging
  and `v0.6.3` for production. Staging version `696b2d5b` and production
  version `bfa69e5b` are active at 100%. All 531 public output files match the
  same artifact on staging, apex and www; localized 404s, Brotli and the
  1,666-character CSP value (1,693-character generated line) were verified.
  CI passed all 88 tests and every documented gate. A real Chromium sweep
  covered all 238 routes at 320px and 1440px: 476 rendered checks with no
  overflow, duplicate IDs, invalid default numeric inputs or missing structure.
  Chrome and iPhone Safari checks exercised explorer-to-lesson navigation;
  Chrome also verified search, quiz completion, saved-answer reload, storage
  failure, calculators, no-JS/no-WebGL fallback and initial reduced motion.
  The plot was inspected in mobile Safari and the 3D model from multiple angles.
  All 238 staging routes passed 20-request performance checks after two initial
  spikes cleared at 25.7 ms and 23.3 ms server p95. The immutable control was
  16.5 ms; the worst first-pass server p95 was 63.2 ms, after subtracting the
  measured 36.1 ms RTT. The impossible-budget self-test also passed.
  Its three bounded follow-ups (theme preference hardening, live reduced
  motion, structural bilingual parity) closed in 0.6.4.

- **0.6.2 combines the corpus corrections with the Kimi K3 in C reference.**
  Lesson 7.12 now explains streamed inference in both languages. The release
  also corrects Ollama's presence-penalty example and updates Astro, Wrangler
  and affected transitive dependencies to clear the dependency audit.
  Deployed on 2026-09-13 from `3c26b05`, tagged `v0.6.2-beta2` for staging
  and `v0.6.2` for production. Both environments serve the same artifact;
  production version `f15ad327` is active at 100% on the apex and www domains.
  CI passed all 70 tests and the dependency audit. Live desktop and mobile
  explorer-to-lesson flows, bilingual Kimi content, localized 404s, Brotli and
  the 1,666-character CSP were verified. All 238 staging routes passed the
  server-p95 gate; two initial spikes cleared on confirmation, with separate
  20-request exact-content checks. The worst final server p95 was 34.9 ms.
  CI also exposed public GitHub service addresses in a fetched Dependabot
  branch; the privacy gate now allows only those exact addresses and tests
  that other addresses and lookalike domains still fail.

- **The 2026-08-20 review audited all 212 lessons and made benchmark identity a
  first-class teaching rule.** Qwen3.8-27B results now carry their template,
  reasoning policy, output budget, runtime, quantization, KV policy, speculative
  decoder, harness and workload. The BlackwellBoy campaign is used as bounded
  deployment evidence, never as a universal model score. Quiz answer positions
  are distributed and parity-checked, while a parser-backed gate protects math
  notation and pt-BR number localization.
- **The reference DeltaNet state is 144 MiB per sequence in float32, not 72 MiB
  universally.** The official config selects float32 state and the current
  Transformers reference path materializes 48 x 128 x 128 matrices in that
  dtype across 48 DeltaNet layers. Lesson 7.2 owns the derivation; lesson 9.3
  owns the resulting memory budget. Other runtimes may choose another state
  dtype or layout and must be measured.

- **0.6.0 added lesson 7.13 and then found the corpus was wrong in thirty-odd
  places.** The lesson closes a real gap — the course taught every mechanism
  behind a Hub quantization and none of the vocabulary printed on one (`bpw`,
  `imatrix`, IQ formats, `mlx-community`, mixed recipes and `--target-bpw`) — but
  the more valuable output was the review sweep it triggered. Nine fresh-context
  readers over all ten tracks in both locales found: the `q_proj` 6144 regression
  still alive in four places; five arithmetic errors including a finite-difference
  cost off by a factor of a thousand; bf16's ULP stated as `2^-8` throughout 5.9;
  a 100 GB mixed-precision saving that does not exist; a dimensionally invalid
  matrix composition; three forbidden training claims; an ownership violation in
  7.11; and a roofline lesson whose frontmatter contradicted its own body.
  **Every content gate was green the whole time.**
- **A site-wide date bug shipped in 0.5.0 and no gate could see it.**
  `toLocaleDateString(locale)` formatted a UTC-midnight frontmatter date in the
  build machine's zone, so all 212 pages read one day early from São Paulo — and
  the HTML depended on where it was built. Found by opening the page, not by any
  check. Fixed with `timeZone: 'UTC'`, guarded by a test that asserts the
  *mechanism* rather than the rendered string, because a UTC CI runner produces
  the correct output with the bug still present.

- **0.5.1 corrected the course's most-repeated architectural number.** Six
  lessons said `q_proj` maps 5120 → 6144. These are *gated* attention layers:
  `attn_output_gate: true`, and `Qwen3_5Attention` subclasses
  `Qwen3NextAttention` unchanged, whose `q_proj` is
  `nn.Linear(hidden, heads*head_dim*2)` — so the weight is 5120 → **12288**,
  split **per head** into 256 query + 256 gate, with **sigmoid** applied to the
  attention output just before `o_proj`. Lesson 4.14's tensor names were wrong
  too (`model.language_model.` / `model.visual.` prefixes).

- **0.5.0 gave the course a visual layer, and fixed a site-wide math bug.**
  Lesson bodies had zero visuals across 105 lessons and ~160,000 words. There is
  now a figure system (`<Figure id>` in MDX with no import, one bilingual
  registry entry per figure, four primitives, CSS-only steppers, zero
  JavaScript) with the first six figures on 1.3, 4.2, 4.4, 7.2, 9.2 and 9.3.
  The 187 callouts per locale are styled — they had only a `border-radius` and
  read as body prose. And `rehype-katex` was emitting BOTH its HTML and MathML
  renderings while `katex.min.css` was never imported, so every formula on the
  live site rendered twice; the pipeline is now MathML-only.

- **0.3.0 rebuilt the course around Qwen3.8-27B** and added tracks 8 (serving
  stacks: PyTorch, Transformers, vLLM, SGLang, TensorRT-LLM, llama.cpp, Ollama,
  MLX, Modular MAX, managed endpoints) and 9 (hardware: NVIDIA, AMD, Apple,
  Qualcomm, Cerebras, roofline, memory budgets, cost per token). 105 lessons per
  locale across 10 tracks at that release.
- The Abyssal Core Atlas redesign is **merged into `main`**, together with the
  explorer-link, 404 and gate work. `design/reimagine-all-pages` is where it was
  developed and is fully contained in `main`.
- Visual system: **Abyssal Core Atlas**, documented in `DESIGN.md`.
- Explorer expression: **Signal Observatory** — a mature procedural cutaway
  with bilingual layer labels, explicit input→output flow and selectable ports
  for all 12 library components. Version 0.1 replaces rainbow slabs with a
  graphite/smoked-glass instrument, cyan signal paths, ceramic token tiles and
  one amber compute core.
- **Fitting the model to a concept render is closed, not adopted.** Chasing a
  reference silhouette cost real accuracy — it added a third residual bypass,
  and a decoder block has exactly two — and the residual gap turned out to be a
  lens mismatch rather than a geometry defect. A concept render is proportion
  and material intent, not a contract; see the invariant in `AGENTS.md`. The
  binding constraint is the stage envelope in `src/lib/three/envelope.ts`,
  asserted by `tests/transformer-scene.test.mjs`.
- **0.2.0 was deployed to production** (version `44082f2b`, 100%), tagged `v0.2.0`,
  with `v0.2.0-beta1..3` marking the staging rounds. Verified on the live site,
  not from the deploy's stdout.
- **One open item, account-side and unresolved:** Cloudflare Web Analytics still
  has automatic setup on for this zone, so the edge injects a beacon the CSP
  blocks. Set `auto_install: false` on the RUM site (dashboard: Web Analytics →
  Manage site → Advanced options → Disable). Nothing leaks meanwhile — the
  script never executes — but the config claims analytics that do not exist.

  Confirmed still live on 2026-09-13 on both production domains after the
  0.6.3 deployment; staging does not inject the beacon. It
  cannot be fixed from this repo: wrangler's OAuth token returns
  `10000 Authentication error` against `/accounts/{id}/rum/site_info/list`, so
  this needs the dashboard or an API token scoped for RUM. Verify in one
  command — the browser headers are load-bearing, because the edge does not
  inject for a bare `curl`:

  ```bash
  curl -s https://llmdeepdive.com/ \
    -H 'User-Agent: Mozilla/5.0' -H 'Accept: text/html' | grep -c cloudflareinsights
  ```
- Product facts and non-visual constraints are captured separately in
  `PRODUCT.md`.
- The only canonical public site is `https://llmdeepdive.com/`.

## Project Environment

- Web-only Astro 7 static site: no iOS/Android app, Metro, API, database or
  Worker bindings. Cloudflare serves `dist/` as static assets.
- Use pnpm 11.17 with Node >=22.13; CI runs Node 22.13. Build with `pnpm build`
  and validate production output with `pnpm preview` in a real browser.

## Durable Decisions

- **The CSP is one `_headers` line with 369 characters of headroom.**
  Cloudflare drops a line over 2,000 chars and the site then serves no CSP at
  all, silently, with every local gate green. Measured at 1,531 in 0.6.4;
  `gen-headers.mjs` fails the build over 1,900 and `tests/rendered-html.test.mjs`
  asserts the same. Each distinct inline `<style>` costs
  ~110 chars (hashed into both `style-src` and `style-src-elem`), each inline
  `<script>` ~55. This is why the figure system ships zero JavaScript and never
  uses `define:vars` on a style block.
- **A figure is data, not markup.** One registry entry per figure serves both
  locales, so bilingual parity is a type error rather than a gate failure, and
  every number traces to `src/lib/model-facts.ts`. Figure ids may not contain a
  lab id — `bundle-budget.mjs` bills labs by substring match across `dist/`.

- **One model carries the whole course.** Qwen3.8-27B is the running worked
  example. Its numbers live in a fact sheet verified against the model's own
  `config.json`; nothing about it may be asserted from memory. It has **no
  technical report**, so training tokens, data mix, cutoff and compute are never
  stated.
- **Each derivation has exactly one owner.** Lesson 7.2 owns the KV-cache
  arithmetic, 9.3 owns the memory budget. Four parallel writers once produced
  three different budgets for the same 80 GB card; referencing beats re-deriving.
- **The Observatory shows the baseline, not the specimen.** The 3D scene models
  a uniform decoder block. Qwen3.8-27B uses that block once every four layers,
  and a fixed callout in 4.11/4.15/4.16/7.2/7.6 says so. No lesson claims the
  scene depicts the course model.
- **The site is static-only.** It deploys as assets with no Worker script or
  bindings. Progress and learner prose remain in the browser; adding a server
  would break that privacy boundary.
- **The Kimi K3 systems reference is external.**
  [Kimi K3 in C](https://github.com/FareedKhan-dev/kimi-k3-in-c) replaces Colibrì
  as the reference on the home page and in the explorer. Lesson 7.12 explains
  expert/trunk streaming and the distinction between process RSS, disk capacity
  and generation speed in both locales, using upstream revision `ac1584a`.
  The engine and checkpoint remain external; measurement guidance is in
  `AGENTS.md` under **External systems reference**.
- **A review sweep is worth more than another gate.** 0.6.0's nine fresh-context
  readers found thirty-odd real defects — wrong arithmetic, a wrong float format,
  forbidden claims, an ownership violation — across a corpus where every gate was
  green. Gates prove format. Only a reader with fresh context proves truth, and
  the cheapest version is one reader per track, reporting findings rather than
  editing, with every finding re-verified against a primary source before a fix.
- **Green gates are not evidence of a working feature.** All ten gates passed
  while 21 of the explorer's 26 lesson links 404'd. Any feature whose
  correctness depends on a value matching something else (a lesson id, a route,
  an anchor) needs a gate that resolves it against the real artefact.
- **Explorer lesson hrefs are resolved at build time** from the content
  collection, not constructed in the browser from a bare id. A lesson URL needs
  its track segment, which only the corpus knows.
- **Release security belongs in CI.** Third-party actions and build tools are
  pinned, Gitleaks scans full history, dependency audit blocks high-severity
  findings, and the rendered-site test independently verifies CSP hashes.

- Use chart fields and abyssal cutaways to encode real curriculum, model, and
  evidence relationships; cartographic motifs are never wallpaper.
- Preserve zero-network-font rendering and static byte-identical HTML.
- Core explorer content is server-rendered. Three.js remains an optional, lazy
  enhancement behind WebGL detection.
- English and pt-BR surfaces are equivalent, including technical fact values.

## Known Pitfalls

- **I deferred a correct review finding because I could not verify it, and the
  primary source was one fetch away.** A code review said the query projection
  was 12288, not 6144. The plan recorded it "unresolved" on the grounds that the
  model could not be inspected — but `config.json` and the reference
  implementation are both public and fetchable, and they settled it in two
  requests. The working fact sheet had even flagged those shapes as *derived*,
  with "spot-check safetensors index before quoting shapes". **When a finding is
  about a published artefact, go and read the artefact.**
- **Correcting one number is never one edit.** Changing 6144 → 12288 rippled
  through six lessons in two locales: prose, display math, quiz options, quiz
  explanations, teach-back model answers, a safetensors listing, and an
  activation-memory chain (29,700 → 35,800 → totals → KiB → GiB → "eighteen"
  spelled out in words). Nine review rounds were needed to find them all; a
  `grep` for the digits missed the spelled-out forms.

- **Astro scopes component CSS with `:where()`, which adds ZERO specificity.**
  `.prose :global(ol)` at (0,1,1) silently beat a figure's own `.fig-flow`
  (0,1,0) and rendered every flow diagram as a vertical prose list. Figure list
  roots double their class. Related: `display: revert` rolls back to the
  user-agent origin (block), NOT to a lower-specificity author rule — the first
  fix for this did nothing.
- **A green build says nothing about whether a figure is visible.**
  `.figure__panel { display: none }` applied unconditionally while the rules
  that restore it only exist when a figure has steps. Every single-panel figure
  had correct markup, correct geometry and correct path data, and rendered
  nothing. Only opening the page found it.
- **Set a budget from a measurement, never a guess.** The CSS budget was first
  written at 40 KB against a real 58.9 KB, failing all 210 routes on its first
  run.
- **A review finding is a hypothesis.** The plan asserted the `/explore/` poster
  was broken in light mode; the stage is `var(--abyss)`, dark in both themes, so
  "fixing" its hex to `var(--accent)` (light-mode `#007687` on `#061a2b`) would
  have introduced the bug it claimed to remove.

- **A bare `$` before a digit becomes inline math.** `remark-math` swallowed
  `$0.45 … $3.20` into garbled KaTeX and no gate noticed; only rendered HTML did.
  Write `USD 0.45`.
- **Green gates prove format, not truth.** Every content gate passed over a
  dimensionally invalid equation, a 32× gain called "tenfold", and three
  conflicting memory budgets. Prose correctness needs an independent reader with
  fresh context, not another gate.
- **Publisher DOIs return 403 to scripts** while resolving fine in a browser.
  Check with a browser user agent before "fixing" a citation as dead.
- **`>=` is not a pin.** `nanoid: '>=3.3.18'` resolved to a major bump that
  postcss does not expect; use `^3.3.18`.

- A dev server that survives a branch switch can retain stale Astro scoped CSS
  while serving fresh markup. Validate branch-wide visual changes with a fresh
  production build and preview.
- **A route that exists as a directory is not a page.** `existsSync('dist/lessons/')`
  is true because the folder holds track subfolders, while `/lessons/` serves
  nothing. The first draft of the link gate passed for exactly this reason.
- **The benchmark's tail is mostly this machine.** Nine routes reported over the
  50ms budget; an interleaved A/B against nine passing routes gave p95 64.6 vs
  63.3 ms, and an immutable hashed asset showed the same tail. Confirm an
  over-budget route before believing it, and check the control asset first.
- **Do not run an automated agent session and hand edits in this repo at the
  same time.** A concurrent session repeatedly reset the tree to HEAD and
  stashed in-flight work; recovery was `git show 'stash@{0}:<path>' > <path>`
  file by file.
- Three.js sprites must not derive screen-space scale from a hidden, zero-height
  canvas. Wait for a real canvas measurement and respond to container resize.
- A component selector without a corresponding marker silently breaks the
  explorer's choose→inspect contract. Keep marker coverage asserted against the
  full library, including mechanism aliases such as KV cache→attention.
- A merged fix is not a deployed fix. Compare Wrangler's live version before
  and after staging deploys, then exercise the CTA in a cache-busted browser.
- A documented gate is not a CI gate until the workflow calls it. Graph,
  citation and contrast checks were documented but omitted until 0.1.
- **Some behaviour belongs to the edge, not the build, and no local gate can
  reach it.** Two shipped in 0.2.0 and only a live request found them: the
  locale `404.html` was shadowed by its own directory form under
  `auto-trailing-slash`, and the zone injects an analytics beacon that exists
  in no build artefact. Both are written up under Cloudflare in `AGENTS.md`.
  When a change's outcome is decided by the asset router or the zone, the
  staging canary *is* the test — treat a green build as saying nothing.
- **Cache-busting is part of the canary.** The first post-deploy header check
  read a cached edge response and reported a fix as missing that was actually
  live. Every canary request carries a unique query string.
