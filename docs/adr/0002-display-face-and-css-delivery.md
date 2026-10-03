# ADR 0002 — A self-hosted display face, linked CSS and JS, class scoping

- **Status:** Accepted
- **Date:** 2026-10-03
- **Supersedes:** the "zero-network-font" rule in DESIGN.md and MEMORY.md (0.1–0.8)

## Context

The 0.9 redesign replaced the Abyssal Core Atlas with a printed star atlas
whose motion vocabulary leans on the display face's **width axis**: the hero
headline unfolds from condensed to its set width, buttons and the next-lesson
title widen on hover, and track names are set wide and tracked. No system
face offers a width axis, and the system stack had a documented cost of its
own: layout depended on the visitor's installed fonts, and a wide-font sweep
once found 109 routes overflowing 320px under Linux's fallback.

Two budgets constrained the redesign:

- **CSP line.** Cloudflare drops a `_headers` line over 2,000 characters, and
  Astro inlined every small component `<style>` and `<script>` as a distinct
  block, each adding a hash (~110 and ~55 characters). The 0.8 build carried 7
  script and 8 style hashes in a 1,585-character line: room for roughly two
  more styles.
- **Render-blocking CSS per route,** gated at 72 KB by `bundle-budget.mjs`.
  The first redesign build measured 87.5 KB on a lesson route.

## Decision

1. **Display face: Mona Sans, variable (weight 200–900, width 75–125%),
   self-hosted** from `@fontsource-variable/mona-sans`, latin + latin-ext +
   vietnamese subsets split by `unicode-range` (an English or Portuguese page
   fetches the Latin file alone: 98,124 bytes, immutable). The Latin file is
   preloaded with `crossorigin`. Body text and data keep **system stacks**: long
   reading stays zero-network, and only headings and interface labels wait on
   the face (`font-display: swap`). Same origin, so `font-src 'self'` already
   covers it and nothing reaches a third party.
2. **Social cards use the static Mona Sans cuts** (`@fontsource/mona-sans`
   woff — satori does not read woff2), with Roboto's math subset kept for √ and
   ≈. Roboto Condensed is removed.
3. **No inline component CSS or JS:** `build.inlineStylesheets: 'never'` and
   `vite.build.assetsInlineLimit: 0`. Every component stylesheet and processed
   script is a hashed file. Result: 2 inline script hashes (the theme pre-paint
   and Pagefind's loader, both `is:inline` on purpose), 0 style hashes, and a
   **453-character** CSP line.
4. **`scopedStyleStrategy: 'class'`.** Same specificity as the attribute
   strategy (a class and an attribute both count 0,1,0), ten fewer characters
   on every scoped selector and element.
5. **Markdown-rendered prose and the calculator labs** are styled by plain
   stylesheets imported from `Lesson.astro` (`src/styles/prose.css`,
   `src/styles/lab.css`) rather than three scoped lab copies and `:global()`
   rules on every lesson route.

Together, 3–5 took the worst lesson route from 87.5 KB to 67.2 KB of
render-blocking CSS, under the unchanged 72 KB budget.

## Consequences

- The fallback face still renders during the swap and if the font fails, so
  `render:check`'s wide-font sweep (Verdana / DejaVu Sans forced) stays.
- A future inline `<style>` or `<script>` is a reviewed change:
  `tests/rendered-html.test.mjs` pins 2 scripts and 0 styles.
- Elements created by script still carry no scope class: style them with
  `:global()` under a scoped parent, as before.
- Tests and scripts must match class **tokens**, never an exact `class="…"`
  value: Astro appends `astro-…` to every scoped element's class list.
