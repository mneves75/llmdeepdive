# NOTICE

Third-party assets and their provenance. Every entry must name a source and a
licence; an asset without both does not ship.

## Code dependencies

See `package.json`. All runtime and build dependencies are OSI-licensed; run
`pnpm licenses list` for the current tree.

## Fonts

**Mona Sans** (GitHub's Mona Sans Project, SIL Open Font License 1.1, Reserved
Font Name "Mona") is the one font shipped to a browser, since 0.9 (see
`docs/adr/0002`). It is self-hosted from `@fontsource-variable/mona-sans`
5.3.0, unmodified: the variable weight-and-width face in Latin, Latin Extended
and Vietnamese subsets, each fetched only when a page uses a character in its
range, from this origin (`font-src 'self'`; nothing is fetched from a third
party). It sets headings and interface labels; body text and data keep the
visitor's system fonts (`src/styles/tokens.css`).

The social cards under `/og/` are drawn at build time by
`src/lib/og-render.ts`, which turns card text into vector outlines with the
static **Mona Sans** cuts (500, 700, 800; `@fontsource/mona-sans`, OFL 1.1) and
the maths subset of **Roboto** (700, `@fontsource/roboto`, OFL 1.1) for √ and ≈.
The OFL permits embedding glyphs in images; those font files stay in
`node_modules`, and only the rendered PNGs are deployed. Roboto Condensed,
used for the cards until 0.8, is no longer a dependency. Earlier revisions of
this file credited Newsreader, Inter, JetBrains Mono and Caveat; those were
never shipped.

## Imagery

All diagrams and 3D geometry in this repository are generated procedurally in
code (`src/lib/three/scenes/`) or authored as inline SVG. The social cards and
the 512px logo are rendered at build time from page data and `public/favicon.svg`. No third-party
illustration, photograph or 3D model is bundled.

## Ideas and prior art

The explorer interaction model was informed by studying
`github.com/thebuggeddev/anatomy`. That project carries **no licence**, so no
code, asset or text from it is used here — only independently reimplemented
ideas, which are not copyrightable. Techniques adopted are documented in
`docs/adr/` and in the plan.

Academic claims cite their primary sources inline in each lesson.
