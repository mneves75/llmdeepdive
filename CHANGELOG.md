# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.1.0
