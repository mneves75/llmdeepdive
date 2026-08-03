# Project Memory

## Current Direction

- Active redesign branch: `design/reimagine-all-pages`.
- Visual system: **Abyssal Core Atlas**, documented in `DESIGN.md` and
  `.impeccable/design.json`.
- Product facts and non-visual constraints are captured separately in
  `PRODUCT.md`.

## Durable Decisions

- **There is no backend.** The D1 progress API was built, deployed, and found to
  have zero client callers; it was deleted in 0.4.0 rather than wired up. The
  site deploys as static assets with no Worker script and no bindings. Adding a
  server back would undo a deliberate removal — see `AGENTS.md` → "No backend".
- **Green gates are not evidence of a working feature.** All ten gates passed
  while 21 of the explorer's 26 lesson links 404'd. Any feature whose
  correctness depends on a value matching something else (a lesson id, a route,
  an anchor) needs a gate that resolves it against the real artefact.
- **Explorer lesson hrefs are resolved at build time** from the content
  collection, not constructed in the browser from a bare id. A lesson URL needs
  its track segment, which only the corpus knows.

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
