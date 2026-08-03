# llmdeepdive.com

A free, open-source, bilingual course on how large language models actually
work — from *what is a parameter?* to streaming a 2.8-trillion-parameter
mixture-of-experts off disk on a machine with 8 GB of RAM.

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

## The Anatomy Explorer

The course's front door is a transformer signal observatory you can rotate and
inspect. Its machined cutaway, animated input→output path and 12 numbered ports
make every library component selectable. Each opens through five lenses: maths,
architectural differences, a token's journey, **how it fails**, and where it
sits in the stack.

It doubles as the course map: clicking a component takes you to the lessons
that teach it.

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

158 lessons live (79 English, 79 Portuguese) across tracks 0–7, with full
parity enforced by the build. Tracks 8–11, the capstones and the interactive
labs are still being written — see the changelog for exactly what is and is not
done.

## Develop

```bash
pnpm install
pnpm dev
```

Full gate, the same one CI runs:

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm content:parity && pnpm content:stubs && pnpm content:graph
pnpm content:citations && pnpm content:assets && pnpm budget
```

## Performance

The gate is **server p95 < 50 ms** on every route, measured against the deployed
edge. `scripts/bench.mjs` reports server time and wire time separately, because
conflating them is how a benchmark starts lying:

```bash
pnpm bench -- --target staging --iter 20
pnpm bench -- --target staging --self-test   # must fail; proves the gate works
```

`--self-test` forces an impossible budget and requires every route to fail. A
gate that has never been seen red is not a gate.

## Contributing

Translations are the most valuable contribution — a missing one fails the build
by design. See [CONTRIBUTING.md](./CONTRIBUTING.md), and read
[AGENTS.md](./AGENTS.md) before non-trivial changes.

## Licence

[MIT](./LICENSE). Asset provenance in [NOTICE.md](./NOTICE.md).
