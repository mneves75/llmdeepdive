# NOTICE

Third-party assets and their provenance. Every entry must name a source and a
licence; an asset without both does not ship.

## Code dependencies

See `package.json`. All runtime and build dependencies are OSI-licensed; run
`pnpm licenses list` for the current tree.

## Fonts

**None are bundled or fetched.** The site ships no `@font-face` rule and no font
file; `src/styles/tokens.css` names only fonts already present on the operating
system, with a stack that degrades to `sans-serif` and `monospace`. No font is
downloaded on any page load, and the CSP's `font-src 'self'` would block a CDN
even if one were added.

Nothing here therefore requires a font licence. Earlier revisions of this file
credited Newsreader, Inter, JetBrains Mono and Caveat; those were never shipped.

## Imagery

All diagrams and 3D geometry in this repository are generated procedurally in
code (`src/lib/three/scenes/`) or authored as inline SVG. No third-party
illustration, photograph or 3D model is bundled.

## Ideas and prior art

The explorer interaction model was informed by studying
`github.com/thebuggeddev/anatomy`. That project carries **no licence**, so no
code, asset or text from it is used here — only independently reimplemented
ideas, which are not copyrightable. Techniques adopted are documented in
`docs/adr/` and in the plan.

Academic claims cite their primary sources inline in each lesson.
