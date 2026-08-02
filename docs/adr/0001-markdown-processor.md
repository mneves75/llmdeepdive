# ADR 0001 — Markdown processor: unified (remark/rehype), not Sätteri

- **Status:** Accepted
- **Date:** 2026-08-02
- **Blocks:** all content phases

## Context

Astro 7 changed the default Markdown processor from the unified (remark/rehype)
pipeline to **Sätteri**, its own native implementation. `@astrojs/markdown-remark`
is no longer installed by default.

This course needs, across ~236 lesson files: KaTeX math (inline and display),
autolinked heading anchors, and callout/admonition syntax. Choosing wrong is
expensive — porting after the content is written is per-plugin, per-file work.

## Decision

Pin the unified pipeline explicitly:

```js
import { unified } from '@astrojs/markdown-remark'
markdown: { processor: unified(), remarkPlugins: [...], rehypePlugins: [...] }
```

## Evidence

Both paths were spiked against one real lesson fragment containing inline math,
display math, a callout, a fenced Python block and a heading needing an anchor.

**Sätteri failed to build at all** under this project's package manager:

```
Cannot find package 'satteri' imported from
  node_modules/@astrojs/mdx/dist/satteri/index.js
```

`@astrojs/mdx@7.0.5` imports `satteri` but declares it only as an **optional
peer dependency**. Under pnpm's strict isolation the import is unresolvable, so
the default pipeline requires an extra explicit install before it works at all.
Its plugin ecosystem for math, heading anchors and directives was also
unverified — no equivalents were found for `remark-math`, `rehype-katex`,
`rehype-slug`, `rehype-autolink-headings` or `remark-directive`.

**unified built cleanly and produced all eight required behaviours**, verified
against the emitted HTML rather than assumed:

| Capability | Verified by |
|---|---|
| Inline math | `katex` markup present |
| Display math | `katex-display` present |
| Callout element | `callout--note` present |
| Callout accessibility | `aria-label="Note"` present |
| Heading id | `id="heading-that-needs-an-anchor"` |
| Heading autolink | `heading-anchor` present |
| Syntax highlighting | Shiki `astro-code` present |
| Language handling | Python source highlighted |

## Consequences

- Adds `@astrojs/markdown-remark`, `remark-math`, `remark-directive`,
  `rehype-katex`, `rehype-slug`, `rehype-autolink-headings`, `katex`,
  `unist-util-visit`. All build-time except the KaTeX stylesheet.
- KaTeX CSS ships to any page containing math. Loaded per-page, not globally.
- Callouts are a local remark plugin (`src/lib/markdown/callouts.mjs`) rather
  than a dependency: four kinds (`note`, `insight`, `warning`, `caveat`), each
  rendering a labelled `<aside role="note">` with a locale-aware label derived
  from the file path.
- We are off Astro's default path, so future Astro majors may need this
  revisited. The pin is one line and the ADR records why.

## Alternatives rejected

- **Install `satteri` and use the default.** Rejected: unverified plugin
  ecosystem for the three features the content depends on, and discovering a gap
  after writing 236 files is the exact failure this ADR exists to prevent.
- **Drop KaTeX, use images for math.** Rejected: inaccessible, unsearchable, and
  a course about attention mechanisms cannot treat equations as decoration.
