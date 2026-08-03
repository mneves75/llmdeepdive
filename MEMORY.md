# Project Memory

## Current Direction

- `main` uses the **Abyssal Core Atlas** visual system documented in
  `DESIGN.md` and `.impeccable/design.json`.
- Product facts and non-visual constraints are kept in `PRODUCT.md`.
- Separate explorer-link, 404, backend-removal, and gate work remains preserved
  on `design/reimagine-all-pages`; it was intentionally not landed with the
  redesign-only merge.

## Durable Decisions

- Cartographic fields and abyssal cutaways must encode curriculum, model, or
  evidence relationships; they are not decorative wallpaper.
- Long-form teaching copy uses `1.3rem` type, `1.65` line height, and a `40rem`
  measure so the lesson is the calmest surface in the system.
- Core explorer content is server-rendered. Three.js remains an optional, lazy
  enhancement behind WebGL detection.
- English and Brazilian Portuguese surfaces are equivalent, including labels,
  navigation, and technical facts.
- Preserve static, byte-identical course HTML. Learner-written teach-back prose
  stays on-device; the API boundary accepts only constrained progress data.

## Known Pitfalls

- A dev server that survives a branch switch can retain stale Astro scoped CSS.
  Use a fresh production build and preview for visual proof.
- Three.js sprites must not derive screen-space scale from a hidden,
  zero-height canvas. Wait for a real measurement and respond to resize.
- Do not run another writer beside hand edits in this repository: a concurrent
  session previously stashed and reset in-flight files.
