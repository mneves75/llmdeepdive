# llmdeepdive, explained from the inside

Think of the site as two machines bolted together: a publishing system and a
learning instrument.

Astro is the publishing press. It reads bilingual lesson and track files from
`src/content/`, checks that English and pt-BR stay in lockstep, then prints 182
static pages. Those pages are deliberately identical for every visitor: no
account data or learner prose is baked into HTML. `src/pages/` chooses a route,
`src/layouts/` supplies the shared frame, and `src/components/` supplies the
interactive pieces.

The learning instrument runs inside the browser. Search downloads Pagefind only
when opened. Theme and lesson progress use local storage. A teach-back is like a
private notebook locked in the learner’s desk: the text never leaves the device.
The quiz stores only whether the answer set was correct. That split—static course
outside, private practice inside—is the most important ownership boundary.

## The visual map

`src/styles/tokens.css` is the legend for the whole atlas: chart paper, abyssal
navy, Survey Cyan, Sonar Yellow, Coral Red, and Kelp Green. `global.css` establishes
reading and focus behavior. `DESIGN.md` explains when each token earns its place.

The home page is a cross-section of the full curriculum. Track pages turn the
same idea into a continuous descent. Lesson pages narrow back to a readable
`70ch` column and add a depth rail, so a learner always knows where they are.
The Anatomy Explorer is the literal core sample: a server-rendered component
selector and evidence drawer wrapped around an optional Three.js Signal
Observatory.

## Why the explorer has two layers

WebGL is impressive but unreliable as a prerequisite. Some browsers expose no
GPU context; some fail a dynamic chunk; motion preferences vary. So the explorer
ships a real SVG poster, component facts, five analysis lenses, and keyboard-safe
controls in HTML first. Only when its canvas approaches the viewport and WebGL
passes detection does `src/lib/explorer-client.ts` import the Three.js stage.

One subtle bug came from measuring marker size while that canvas was still
hidden. A hidden canvas is zero pixels tall; pretending it was one pixel made a
32-pixel marker enormous enough to cover the whole specimen. The fix is pleasingly
strict: zero means “not measured,” so markers stay hidden until `ResizeObserver`
reports a real size. `tests/marker-scale.test.mjs` locks that rule down.

The mature specimen is still procedural rather than a heavy downloaded model.
ImageGen supplied the second-generation art direction, preserved beside the
baseline under `.impeccable/concepts/`; the runtime translates that reference
into native geometry. A graphite frame holds smoked-glass decks, ceramic token
tiles and etched cyan signal paths around one amber FFN core. Side routes make
residual additions legible, particles trace input to output, and a bilingual
instrument key names each major layer. Every one of the 12 library components
owns a numbered port; components such as the KV cache or quantization isolate
the physical mechanism they modify instead of pretending to be separate slabs.
`tests/transformer-scene.test.mjs` locks that coverage and material hierarchy
down.

Browser QA also caught an accessibility trap in the annotation live region: a
list element was being replaced with raw text, producing invalid list markup.
The text equivalent now uses a neutral live-region container, and the rendered
HTML regression test prevents the old structure from returning.

## Pitfalls worth remembering

- Do not personalize the generated HTML. All learner state belongs in the
  browser; there is no server-side learner state.
- Do not import Three.js eagerly. The static reading experience is the product;
  3D is enhancement.
- Do not let the two languages drift. The build intentionally fails instead of
  silently falling back to English.
- After switching branches, an old Astro dev server can serve stale scoped CSS.
  A fresh production build and preview is the trustworthy visual check.
- A correct `main` branch does not update Cloudflare by itself. Staging once
  kept serving an older explorer whose CTA still linked to `/lessons/`; verify
  the deployed version and click through to the lesson after every publish.
- CI is part of the artifact: actions and build tools are pinned, secrets are
  scanned across full history, and the generated CSP is checked against every
  inline script and style. A check mentioned only in prose protects nothing.
- Cartographic decoration must explain a relationship. If a contour, marker, or
  layer carries no information, remove it.

## External systems reference

The 2.8-trillion-parameter Kimi K3 example points to
[Colibrì](https://github.com/JustVugg/colibri), a separate pure-C inference
engine that streams routed experts from the model's native MXFP4 checkpoint.
The site does not bundle that engine or model. Treat its resource and throughput
figures as revision- and hardware-specific measurements, not timeless product
claims.
