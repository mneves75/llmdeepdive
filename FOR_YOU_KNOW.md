# llmdeepdive, explained from the inside

Think of the site as two machines bolted together: a publishing system and a
learning instrument.

Astro is the publishing press. It reads bilingual lesson and track files from
`src/content/`, checks that English and pt-BR stay in lockstep, then prints 180
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
library and fact panel wrapped around an optional Three.js specimen.

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

## Pitfalls worth remembering

- Do not personalize the generated HTML. Local state belongs in the browser and
  constrained sync data belongs behind the API boundary.
- Do not import Three.js eagerly. The static reading experience is the product;
  3D is enhancement.
- Do not let the two languages drift. The build intentionally fails instead of
  silently falling back to English.
- After switching branches, an old Astro dev server can serve stale scoped CSS.
  A fresh production build and preview is the trustworthy visual check.
- Cartographic decoration must explain a relationship. If a contour, marker, or
  layer carries no information, remove it.
