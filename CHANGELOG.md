# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Wrangler 4.118.0 → 4.119.0 and the matching workerd binaries. Deploy tooling only; nothing reaches the browser and `dist/` is unchanged.
- `pnpm-workspace.yaml` excludes `wrangler@4.119.0` and `miniflare@5.20260801.0-alpha` from the release-age gate so the install resolves. The alpha was already a transitive Wrangler dependency and is not materialised in `node_modules`; the exclusion is deliberate and should be dropped once both versions age past the gate.

## [0.2.0] — 2026-08-05

### Added

- The Signal Observatory is now a machined instrument assembly: four collared posts, a stepped plinth, per-deck corner sockets, a central signal rail with a node at every layer, ceramic logit banks and an amber compute core.
- `src/lib/three/envelope.ts` publishes the stage envelope (`FIT_SIZE`, `STAGE_FLOOR_Y`) that the fixed camera, fog and floor plane are tuned for, with a regression test asserting the built instrument fits it and rests above the floor.
- `scripts/finalize-dist.mjs` emits a literal `404.html` for every non-default locale, so Cloudflare's `not_found_handling` walk can resolve one instead of falling back to English.
- `public/robots.txt` pointing at the sitemap index.

### Changed

- Deck geometry re-proportioned to fit the stage envelope; a previous revision matched a concept render's proportions and sank the plinth through the floor.

### Fixed

- The explorer showed **three** residual bypass routes. A decoder block has exactly two, each starting at the input of the sub-layer it skips; the third existed only to match a concept render and taught an architecture that does not exist. A test now pins the route set.

### Security

- `worker-src` no longer allows `blob:`. Pagefind loads its worker from a path, verified by exercising search under the generated policy; `blob:` was unearned surface for turning a script foothold into arbitrary worker code.
- `Permissions-Policy` now denies `browsing-topics`.
- The search dialog accepts site-relative result URLs only, so a poisoned index cannot produce a `javascript:` or off-site `href`.
- Unreferenced Pagefind UI bundles — hundreds of KB of unused JavaScript containing `innerHTML` sinks — are pruned from `dist/` instead of being uploaded on every deploy.

## [0.1.1] — 2026-08-04

### Added

- Initial release of [llmdeepdive.com](https://llmdeepdive.com/): 79 lessons in each of English and pt-BR across eight tracks, local learning progress, Pagefind search, the accessible Three.js Signal Observatory, generated security headers, the complete build/content/performance gate set and a patched Cloudflare development dependency chain.

[0.2.0]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.2.0
[0.1.1]: https://github.com/mneves75/llmdeepdive/releases/tag/v0.1
