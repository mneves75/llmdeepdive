# [llmdeepdive.com](https://llmdeepdive.com/)

A free, open-source, bilingual course on how large language models actually
work — from *what is a parameter?* through efficient inference.

**English and Brazilian Portuguese. No accounts, no paywall, no tracking.**

---

## Why this exists

Most LLM explainers stop at the analogy. This one keeps going: every empirical
claim carries a paper and a year, every lab computes real numbers rather than
mocking them up, and the places where the field's public numbers *don't*
reconcile are stated as such instead of being smoothed over.

The pedagogy is Feynman's, applied literally. Each lesson runs:

1. **Concept** — the actual mechanism
2. **Analogy** — the same idea in plain language
3. **Lab** — hands-on, computing real values
4. **Teach-back** — you explain it, then compare against a model answer
5. **Quiz** — with an explanation of *why* the answer is right

A lesson counts as complete only when your teach-back is substantive **and**
the quiz is right. Clicking "reveal" is not learning.

## Figures

Diagrams are data, not pictures. A lesson writes `<Figure id="…" />` and one
registry entry serves both languages, so a missing Portuguese label is a type
error rather than something a reviewer has to notice. Nothing is rasterized:
every figure is HTML and inline SVG, so it responds to light and dark, scales
with your browser's text size, is selectable and searchable, and costs no
JavaScript at all — the step-through figures switch with plain radio inputs, so
they work with the keyboard and would work with scripting disabled.

Every number in a figure comes from the same fact sheet the prose does. A figure
that disagreed with its own lesson would be worse than no figure.

## The Anatomy Explorer

The course's front door is a transformer signal observatory you can rotate and
inspect. Its graphite frame, smoked-glass decks, etched cyan signal paths,
ceramic token tiles and single amber compute core make the architecture read as
a scientific instrument rather than a stack of coloured boxes. Twelve numbered
ports keep every library component selectable. Each opens through five lenses:
maths, architectural differences, a token's journey, **how it fails**, and
where it sits in the stack.

It doubles as the course map: clicking a component takes you to the lessons
that teach it. Those destinations are resolved against the real bilingual
lesson corpus during the build, so a stale or incomplete lesson id cannot ship.

The live explorer is available at
[`llmdeepdive.com/explore/`](https://llmdeepdive.com/explore/).

## Stack

| | |
|---|---|
| Astro 7 (`output: 'static'`) | no adapter — `dist/` is served directly |
| Cloudflare Workers Static Assets | static assets only; no Worker script or bindings |
| Tailwind 4 + hand-written tokens | `light-dark()` theming; "Auto" needs zero JavaScript |
| Three.js 0.185 (`WebGLRenderer`) | one long-lived stage, procedural geometry, lazy-loaded |
| Pagefind | per-language index, fetched on first keystroke |

Geometry, labels and signal paths are generated in code, not shipped as a model:
the whole 3D explorer costs tens of kilobytes rather than the tens of megabytes
a GLB-based one would.

## Current scale

210 lessons live (105 English, 105 Portuguese) across tracks 0–9, with full
parity enforced by the build. Tracks 0–7 carry the model from first principles
to efficient inference; track 8 covers the serving stacks that run it (PyTorch,
Transformers, vLLM, SGLang, TensorRT-LLM, llama.cpp, Ollama, MLX, Modular MAX)
and track 9 the silicon underneath (NVIDIA, AMD, Apple, Qualcomm, Cerebras).
Every mechanism is worked through one real model, Qwen3.8-27B.

## Systems reference

The 2.8-trillion-parameter Kimi K3 case is grounded in
[Colibrì](https://github.com/JustVugg/colibri), an external pure-C inference
engine that streams routed experts from the model's native MXFP4 checkpoint.
Colibrì is a technical reference, not code or a model bundled with this site;
its memory and throughput requirements depend on the current revision and
hardware.

## Develop

```bash
pnpm install
pnpm dev
```

Full local gate:

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm content:parity && pnpm content:stubs && pnpm content:graph
pnpm content:citations && pnpm content:assets && pnpm a11y:contrast
pnpm budget && pnpm audit --audit-level=high
```

CI runs the same checks plus a full-history Gitleaks scan.

Staging deploys with `pnpm deploy:staging`. A successful command is not enough:
confirm the new version with Wrangler, then click “View lesson” in the live
explorer and verify that the destination lesson renders.

## Performance

The gate is **server p95 < 50 ms** on every route, measured against the deployed
edge. `scripts/bench.mjs` reports server time and wire time separately, because
conflating them is how a benchmark starts lying:

```bash
export BENCH_STAGING_URL=https://<your-staging-worker>.workers.dev
pnpm bench --target staging --iter 20
pnpm bench --target staging --self-test   # must fail; proves the gate works
```

`--self-test` forces an impossible budget and requires every route to fail. A
gate that has never been seen red is not a gate.

## Contributing

Translations are the most valuable contribution — a missing one fails the build
by design. See [CONTRIBUTING.md](./CONTRIBUTING.md), and read
[AGENTS.md](./AGENTS.md) before non-trivial changes.

## Licence

[MIT](./LICENSE). Asset provenance in [NOTICE.md](./NOTICE.md).
