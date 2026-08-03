# llmdeepdive, explained from the inside

Think of the site as a publishing press with a learning instrument attached.

Astro is the press. It reads bilingual lessons and tracks from `src/content/`,
checks that English and Brazilian Portuguese stay in lockstep, then prints the
static course pages. `src/pages/` chooses a route, `src/layouts/` supplies the
shared frame, and `src/components/` supplies the interactive pieces.

The learning instrument runs in the browser. Search downloads Pagefind only
when opened. Theme, teach-back text, quizzes, and immediate progress state use
local storage. Anonymous completion booleans may synchronize through the D1
API, but learner prose never leaves the device. Static course content and
private learner work therefore have deliberately different owners.

## The visual map

`src/styles/tokens.css` is the legend for the Abyssal Core Atlas: chart field,
abyssal navy, Survey Cyan, Sonar Yellow, Coral Red, and Kelp Green.
`global.css` establishes reading and focus behavior; `DESIGN.md` explains when
each token earns its place.

The homepage is a cross-section of the curriculum. Track pages continue the
same descent. Lesson pages narrow to a `40rem` reading column and add a depth
rail so the learner always knows where they are. The Anatomy Explorer is the
literal core sample: a server-rendered component library and fact panel around
an optional Three.js specimen.

## Why the explorer has two layers

WebGL is useful but unreliable as a prerequisite. Some browsers expose no GPU
context; a dynamic chunk can fail; motion preferences vary. The explorer ships
real SVG, component facts, reading lenses, and keyboard-safe controls in HTML
first. Only when its canvas approaches the viewport and WebGL passes detection
does `src/lib/explorer-client.ts` import the Three.js stage.

A hidden canvas is zero pixels tall. Treating that as one pixel once made a
32-pixel marker large enough to cover the specimen. The fix is strict: zero
means “not measured,” so markers stay hidden until `ResizeObserver` reports a
real size. `tests/marker-scale.test.mjs` locks that rule down.

## Pitfalls worth remembering

- Never personalize generated HTML; learner prose belongs only on the device.
- Never import Three.js eagerly; the static reading experience is the product.
- Never let the two languages drift; the build fails instead of falling back.
- Validate branch-wide visual changes with a fresh production build and
  preview, because an old Astro server can retain stale scoped CSS.
- Cartographic decoration must explain a real relationship or be removed.
