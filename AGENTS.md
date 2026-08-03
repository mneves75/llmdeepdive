# AGENTS.md — llmdeepdive.com

How to work in this repo. Read before non-trivial changes. `CLAUDE.md` points here.

## What this is

A free, open-source, bilingual (EN + pt-BR) interactive course on large language
models — from what a parameter is, to streaming a 2.8-trillion-parameter MoE off
disk on an 8 GB machine. Static site on Cloudflare Workers, MIT licensed.

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
pnpm links               # every internal link in dist/ resolves (runs in build)
pnpm a11y:contrast       # palette stays above accessible contrast ratios
pnpm budget              # per-route JS budget
pnpm bench -- --target staging --iter 20
pnpm deploy:staging
```

## Delegating to Codex

Use **`codex-auto`** (defined in `~/.zshrc`), never bare `codex exec`. It probes
each `CODEX_HOME` and dispatches to the account that still has quota — personal
first, the Berlin work account only when personal is exhausted.

```bash
codex-auto home            # print the CODEX_HOME that has quota
codex-auto exec <args...>  # non-interactive run in that home
CODEX_HOME="$(codex-auto home)" codex-lane start <lane> <spec> -- --dangerously-bypass-approvals-and-sandbox
```

`codex-bypass` and `codex-bypass-exec` route through `codex-auto` as well, so
every zshrc wrapper is quota-aware. Only `codex-personal` / `codex-berlin` pin a
specific account, for when you deliberately want one.

**An exhausted account exits 0 having written nothing**, recording the error only
inside the session JSONL — so a caller reads success and gets no work. That cost
a full dispatch round of this project's content lanes. If a lane returns fast
with no diff, grep the lane `.jsonl` for `usage limit` before diagnosing
anything else.

Content lanes must **not** run `pnpm build` — several run concurrently and would
collide on `dist/`. Give each lane a disjoint set of track directories, and run
the build once yourself afterwards.

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
it to — see "No backend" below. Adding one to store progress or teach-back
prose would undo a deliberate removal, not add a feature.

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
layer identity. Update `tests/transformer-scene.test.mjs` when that mapping or
geometry changes, then verify `/explore/` in a real desktop and mobile browser.

**5. No `any`.** `unknown` plus a type guard. `ast-grep scan` blocks commits.

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
argument. If you find yourself adding `main` back to `wrangler.jsonc`, you are
re-introducing something that was deliberately removed (see "No backend").

- `compatibility_date` is the date the config was actually tested, not an old
  pinned example. Keep it current when you touch the deploy.
- Named environments do **not** inherit `assets` or anything else. Every `env.*`
  re-declares the whole block or staging goes up broken and silent.
- `wrangler deploy` exits 0 with empty output in non-TTY. **Never trust its
  stdout.** Verify with `wrangler versions list` plus a live smoke request.
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

## No backend

There is no API, no database and no server-side state. This is a decision, not
an omission.

A D1-backed `/api/*` surface was built, deployed, and then found to have no
callers at all: `src/lib/progress.ts` held every call site and was imported by
nothing, because the lesson pages track completion directly in `localStorage`.
It was removed in 0.4.0 rather than wired up.

The consequence worth keeping: **the privacy promise is now structural.** Teach-
back prose and quiz results cannot reach a server because there is no server.
Adding one back to "sync progress" would trade that property for a feature that
was already shipped once and never used.

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

pt-BR is a real translation, not machine output. Industry-standard English terms
(*embedding*, *attention*, *fine-tuning*) stay English inside Portuguese prose.

## Facts that must not drift

**These are a forward specification, not a description of shipped content.** The
corpus is tracks 0–7; tracks 8–11 are unwritten. The figures below were checked
against primary sources and are recorded nowhere else, so they must survive
until the lessons that use them exist. Several plausible-sounding "corrections"
would break them.

When Track 11 is written, it rests on:

- Kimi K3 routes **16 of 896** experts, not 384.
- The 8 GB engine is **colibrì** — pure C, `pread` + `O_DIRECT`, deliberately
  bypassing the page cache. **Not** llama.cpp's mmap. At 8 GB these are
  opposites: mmap lets the kernel evict always-needed dense weights to admit a
  one-shot expert.
- K3 ships **MXFP4 natively**; there is no GGUF step. GGUF quants floor around
  650 GB.
- `bytes/token = total expert bytes × (k ÷ E)`. Predicts 11.6 GB for GLM-5.2
  against a published ~11 GB it was never fitted to; ~27 GB for K3.
- 27 GB ÷ 33 s ≈ 0.8 GB/s — consistent with a consumer SSD, cold cache.

Two caveats travel with those numbers and must stay attached: the dense/routed
split was derived by subtraction and reconciles to only ±20%, so the sparsity
lab takes it as an **input** rather than asserting it; and the throughput model
is first-order, trustworthy within ~2×.

## Docs

`MEMORY.md` (curated state) + `memory/YYYY-MM-DD.md` (daily journal) +
`FOR_YOU_KNOW.md` (plain-language explainer). Read them when opening the repo.
