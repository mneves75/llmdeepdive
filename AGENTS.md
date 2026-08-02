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
pnpm budget              # per-route JS budget
pnpm bench -- --target staging --iter 20
pnpm deploy:staging
```

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
visitor. Progress lives in `localStorage`; only anonymous booleans may reach D1.
This is what makes the whole site edge-cacheable and the performance target
reachable. A change that makes HTML vary per visitor is a regression, not an
optimisation.

**2. Teach-back prose never leaves the browser.** No schema field may hold the
learner's own writing. If you find yourself adding a free-text column, stop.

**3. A missing translation fails the build.** Astro i18n `fallback` is
deliberately unset — `fallbackType: 'rewrite'` would silently serve English at a
pt-BR URL. `content-parity.mjs` is the gate.

**4. Three.js is never on the critical path.** Dynamic `import()` behind an
`IntersectionObserver`, after a WebGL feature check, with a real `.catch()`.
Poster renders first; WebGL replaces it. One long-lived `Stage`, never one
renderer per lab.

**5. No `any`.** `unknown` plus a type guard. `ast-grep scan` blocks commits.

## Engineering stance

- **No backward compatibility.** Delete the obsolete path; never leave a compat
  layer, alias, shim, fallback, or migration path beside it. Nothing here is a
  published contract — lesson ids, component props and the `/api/*` shapes are
  ours to change, and the client is shipped from this same repo.
- **Simplest implementation that fully meets the current requirement.** No
  speculative abstraction, configuration knob, or indirection for a requirement
  nobody has yet. A second call site is what justifies a helper, not the first.
- **Grow in layers.** Smallest version that works end to end, then each new
  capability on top of something already working. Never trade a working site for
  unfinished complexity — the gates (`typecheck`, `content:*`, `budget`, `bench`)
  stay green between steps, not only at the end.
- **Modular, with concerns separated.** Content in MDX, schema in
  `content.config.ts`, rendering in components, edge logic in `/api/*`. A change
  that smears one into another is a regression.
- **Reach for the deps already here before writing your own or adding a package.**
  Astro, Zod 4, unified/remark/rehype, Shiki, Three.js and the Workers runtime
  cover far more than they look like they do — read their docs and types before
  concluding a capability is missing. Prefer an established, well-maintained
  library over a custom implementation whenever it cuts total complexity or
  raises reliability; don't reimplement common functionality without a reason.
- **Decide for the long term.** No stopgap that only works for now and is meant
  to be replaced later.

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

One Worker, static assets, `run_worker_first: ["/api/*"]` — the **array** form.
With `true`, every CSS and font request would invoke the Worker. As scoped, an
HTML request never starts an isolate, which is the entire performance argument.

- Named environments do **not** inherit `vars` or bindings. Every `env.*`
  re-declares them or staging goes up broken and silent.
- `wrangler deploy` exits 0 with empty output in non-TTY. **Never trust its
  stdout.** Verify with `wrangler versions list` plus a live smoke request.
- Run wrangler and vite under Node, never Bun — wrangler hangs silently after
  its first API call under Bun.
- Smart Placement stays off: static assets already serve from the nearest
  location, and a smart-placed Worker would serve `ASSETS` fallbacks from a
  distant datacenter.

## API surface

`/api/*` only — everything else is static and never starts an isolate.

| Route | Method | Notes |
|---|---|---|
| `/api/health` | GET | the only unauthenticated route |
| `/api/progress` | GET / PUT / DELETE | per-token; DELETE erases every table |
| `/api/quiz/attempt` | POST | which option was chosen, never why |
| `/api/signal` | POST | a four-value enum, deliberately not a text box |

All per-token routes require `x-ldd-token` (a client-generated UUIDv4) and
return 401 without one. Bodies are capped at 4 KB; every field is validated.

**The privacy promise is enforced by schema shape, not policy.** No table has a
column that could hold learner-written prose, so teach-back text cannot reach
the server even by accident — a `teachBackText` field in a request body is
accepted and discarded because nothing can store it. If you ever find yourself
adding a TEXT column for learner writing, that is a breach of the stated
promise, not a feature.

Reads use `withSession('first-unconstrained')`. Enabling D1 read replication
without a session leaves every query on the primary.

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

Track 11 rests on numbers that were checked and must not be quietly "corrected":

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
