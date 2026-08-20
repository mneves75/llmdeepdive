# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
  cache, so 16 GiB of cache stands against roughly 72 MiB of constant recurrent
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
  "nearly three orders of magnitude"; 4.15 describing a 1.5 MiB per-layer state
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
