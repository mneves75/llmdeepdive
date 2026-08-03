# Project Memory

## Current Direction

- The Abyssal Core Atlas redesign is **merged into `main`**, together with the
  explorer-link, 404 and gate work. `design/reimagine-all-pages` is where it was
  developed and is fully contained in `main`.
- Visual system: **Abyssal Core Atlas**, documented in `DESIGN.md` and
  `.impeccable/design.json`.
- Explorer expression: **Signal Observatory** — a mature procedural cutaway
  with bilingual layer labels, explicit input→output flow and selectable ports
  for all 12 library components. Version 0.1 replaces rainbow slabs with a
  graphite/smoked-glass instrument, cyan signal paths, ceramic token tiles and
  one amber compute core; its ImageGen direction is stored in
  `.impeccable/concepts/`.
- Product facts and non-visual constraints are captured separately in
  `PRODUCT.md`.
- The only canonical public site is `https://llmdeepdive.com/`.

## Project Environment

- Web-only Astro 7 static site: no iOS/Android app, Metro, API, database or
  Worker bindings. Cloudflare serves `dist/` as static assets.
- Use pnpm 11.17 with Node >=22.13; CI runs Node 22.13. Build with `pnpm build`
  and validate production output with `pnpm preview` or Chromium via Argent.

## Durable Decisions

- **The site is static-only.** It deploys as assets with no Worker script or
  bindings. Progress and learner prose remain in the browser; adding a server
  would break that privacy boundary.
- **The Kimi K3 systems reference is external.**
  [Colibrì](https://github.com/JustVugg/colibri) implements the 2.8T MoE path in
  C and streams native MXFP4 experts from storage. It is not bundled with the
  site, and upstream memory/performance figures must not be repeated without a
  revision-specific source.
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
- **Do not run a Codex lane and hand edits in this repo at the same time.** A
  concurrent session repeatedly reset the tree to HEAD and stashed in-flight
  work; recovery was `git show 'stash@{0}:<path>' > <path>` file by file.
- Three.js sprites must not derive screen-space scale from a hidden, zero-height
  canvas. Wait for a real canvas measurement and respond to container resize.
- A component selector without a corresponding marker silently breaks the
  explorer's choose→inspect contract. Keep marker coverage asserted against the
  full library, including mechanism aliases such as KV cache→attention.
- A merged fix is not a deployed fix. Compare Wrangler's live version before
  and after staging deploys, then exercise the CTA in a cache-busted browser.
- A documented gate is not a CI gate until the workflow calls it. Graph,
  citation and contrast checks were documented but omitted until 0.1.
