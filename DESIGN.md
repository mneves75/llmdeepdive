---
name: llmdeepdive
description: A printed star atlas of how language models work, in a desk edition and a field edition.
colors:
  plate: "light-dark(#ffffff, #070c1d)"
  plate-raised: "light-dark(#f2f5fb, #0e1630)"
  night: "light-dark(#0a1230, #030713)"
  night-raised: "light-dark(#141f45, #0d1530)"
  ink: "light-dark(#0b1533, #e9eefb)"
  ink-muted: "light-dark(#45506d, #b1bbd6)"
  ink-faint: "light-dark(#5a6582, #8f9aba)"
  ink-on-night: "#eef2fc"
  ink-muted-on-night: "#b6c0dc"
  graticule: "light-dark(rgb(43 68 199 / 0.13), rgb(150 172 255 / 0.13))"
  rule: "light-dark(rgb(11 21 51 / 0.14), rgb(214 224 255 / 0.14))"
  rule-strong: "light-dark(rgb(11 21 51 / 0.32), rgb(214 224 255 / 0.32))"
  rule-field: "light-dark(#6c7690, #6f7ca3)"
  chart-blue: "light-dark(#2b44c7, #9db0ff)"
  chart-blue-soft: "light-dark(#e3e8fb, #1a2552)"
  chart-blue-ink: "light-dark(#ffffff, #050a1a)"
  reticle: "light-dark(#c8102e, #ff6b81)"
  tier-foundations: "light-dark(#0a6d97, #72c8f2)"
  tier-core: "light-dark(#8a6200, #f1cd6b)"
  tier-advanced: "light-dark(#b2480b, #ff9b57)"
  tier-frontier: "light-dark(#8b1fa0, #e59cf3)"
  success: "light-dark(#0f7a57, #58d3a6)"
  danger: "light-dark(#b42318, #ff8a7a)"
  caution: "light-dark(#7d5d00, #f1cd6b)"
typography:
  display:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, min(4.8vw, 8.6vh), 5rem)"
    fontWeight: 860
    lineHeight: 0.94
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 92"
  numeral:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(4rem, 3rem + 5vw, 7.5rem)"
    fontWeight: 860
    lineHeight: 0.8
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.2rem + 3vw, 3.75rem)"
    fontWeight: 760
    lineHeight: 0.96
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 118"
  lesson-title:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 1.4rem + 2.6vw, 3.5rem)"
    fontWeight: 760
    lineHeight: 1.02
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 96"
  title:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 760
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  plate-name:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontWeight: 640
    letterSpacing: "0.14em"
    fontVariation: "'wdth' 125"
  body:
    fontFamily: "Avenir Next, Segoe UI, system-ui, -apple-system, Roboto, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.58
  reading:
    fontFamily: "Avenir Next, Segoe UI, system-ui, -apple-system, Roboto, Arial, sans-serif"
    fontSize: "clamp(1.0625rem, 0.95rem + 0.45vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Mona Sans Variable, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 640
    lineHeight: 1.2
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Cascadia Mono, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    fontFeature: "\"tnum\" 1"
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  3xs: "4px"
  2xs: "8px"
  xs: "12px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  2xl: "64px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.05rem"
    height: "2.875rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.05rem"
    height: "2.875rem"
  button-inverse:
    backgroundColor: "{colors.ink-on-night}"
    textColor: "{colors.night}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.05rem"
    height: "2.875rem"
  field:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "2.875rem"
  theme-toggle-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate}"
    rounded: "{rounded.sm}"
    height: "2.625rem"
    width: "2.5rem"
  callout:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px 24px 16px"
  lab-panel:
    backgroundColor: "{colors.plate-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "32px"
  night-plate:
    backgroundColor: "{colors.night}"
    textColor: "{colors.ink-on-night}"
    rounded: "{rounded.lg}"
    padding: "48px"
  star-mark:
    backgroundColor: "transparent"
    size: "0.8rem"
    rounded: "50%"
  reticle:
    backgroundColor: "transparent"
    size: "1.9rem"
    rounded: "50%"
---

# Design System: llmdeepdive

## Overview

**Creative North Star: "The Two-Edition Star Atlas"**

The curriculum is a sky you learn to read. Every lesson is a star, every track
a constellation, the course order is the line joining them, and the place you
stopped carries a crimson reticle. The site is printed as an atlas in two
editions with the same meanings: the desk edition is black stars on a white
plate, the field edition is white stars on a night plate. A third surface, the
night plate, is dark in both editions and holds the explorer stage, the
lesson's analogy, the home closing plate and the footer.

Charts are real data, never decoration. One deterministic layout
(`src/lib/sky.ts`, a 1000 × 560 chart) feeds the home sky, each track's
constellation, the "you are here" plate in a lesson header, and the 3D sky.
Star size is the lesson's in-degree in the prerequisite graph; star pigment is
its tier; constellations stand left to right in track order. A graticule
appears only where it locates something. Every page is complete as HTML and
SVG before any WebGL loads, and every string is HTML.

Motion is one vocabulary: arrivals decelerate, the display face's width axis
opens and widens, constellation lines draw themselves, and every ambient loop
reads one 180-second clock so nothing on a page drifts out of phase. All of it
stops under reduced motion.

**Key Characteristics:**

- A white desk plate and a deep night plate, with one meaning per pigment in both editions.
- Tier pigments that follow stellar spectral class, from hot blue to brown-dwarf magenta.
- Course state drawn as marks: open ring, filled star, crimson reticle.
- Mona Sans on its width axis for display, system stacks for reading and data.
- Hairline rules, shallow radii, no rest shadows.
- One shared ambient clock for the sky, the comet and the instrument.

## Colors

Two editions of one atlas: chart-blue ink on a white plate by day, the same
roles in light pigments on a night plate in the field edition. Every token is a
`light-dark()` pair, so a surface that sets `color-scheme: dark` (the night
plate) resolves to field pigments while the page stays in the desk edition.

### Primary

- **Celestial Ink** (`ink`): headings, body text, the primary button plate, the
  active theme option, the porcelain of the 3D instrument.
- **Chart Blue** (`chart-blue`): links on hover, text selection, the wordmark
  ring, callout boundaries for notes, the explorer's engraving lines and token
  path. Its soft and ink partners (`chart-blue-soft`, `chart-blue-ink`) are its
  ground and its text-on-fill.

### Secondary

- **Reticle Crimson** (`reticle`): "you are here" and the focus ring
  (`--focus` is the reticle). The reticle mark on a lesson's star, the current
  syllabus row's ring and number, the current explorer port, the masthead's
  current-section rule, the caret, the 404's missing page.

### Tertiary

The four tier pigments, hot to cool as the course deepens:

- **Spectral Blue** (`tier-foundations`): foundations.
- **Spectral Gold** (`tier-core`): core.
- **Spectral Orange** (`tier-advanced`): advanced.
- **Brown-Dwarf Magenta** (`tier-frontier`): frontier. Past class M, and clear
  of the crimson reticle so the two never read as one signal.

Verdicts: **Verdict Green** (`success`) for completion and correct answers,
**Verdict Red** (`danger`) for wrong answers and errors, **Verdict Gold**
(`caution`) for caveat callouts.

### Neutral

- **Desk Plate** (`plate`): the page ground; white in the desk edition, night
  blue in the field edition.
- **Raised Plate** (`plate-raised`): hover rows, lab panels, figure frames,
  table heads, inline code.
- **Night Plate** (`night`, `night-raised`): dark in both editions; the
  explorer stage, the analogy, the closing plate, the footer, the search
  backdrop and hovered search results.
- **Muted and Faint Ink** (`ink-muted`, `ink-faint`): summaries, meta lines,
  lesson numbers, reading minutes.
- **Night Inks** (`ink-on-night`, `ink-muted-on-night`): text on a night plate.
- **Graticule** (`graticule`): dotted coordinate hairlines in charts.
- **Rules** (`rule`, `rule-strong`): dividers, neatlines, row borders,
  secondary button borders.
- **Field Rule** (`rule-field`): the boundary of anything a learner types into
  or toggles. It holds 3:1 against the plate (WCAG 1.4.11);
  `pnpm a11y:contrast` checks it.

### Named Rules

**The Pigment Names a Tier Rule.** A tier pigment marks a tier and nothing
else: star rings, constellation lines, track numerals, a lesson's crumb and
reading gauge. It is set once from `data-tier` as `--tier`.

**The Reticle Is Here Rule.** Crimson means "where you are" or "where focus
is". It is never a tier, a verdict or decoration.

**The Same Meaning in Both Editions Rule.** The field edition is a second
printing, not an inversion. Every role keeps its meaning; only the pigment
lightness changes.

## Typography

**Display Font:** Mona Sans Variable (weight 200–900, width 75–125%),
self-hosted, with Avenir Next, Segoe UI and system-ui fallbacks.
**Body Font:** Avenir Next with Segoe UI, system-ui, Roboto and Arial
fallbacks; zero network.
**Data Font:** ui-monospace with SFMono-Regular, Cascadia Mono and Consolas.

**Character:** A wide, heavy grotesque whose width axis is part of the motion
vocabulary, set against a calm humanist system face for long reading. Data
reads as data: tabular numerals wherever a number is set.

The weight scale is 400 / 520 / 640 / 760 / 860; the width scale is 82%,
100%, 118% and 125%. Headings use weight 760, line height 0.96, tracking
-0.03em, balanced wrapping, and may break a word that is too long for the
fallback face.

### Hierarchy

- **Display** (860, `clamp(2.75rem, min(4.8vw, 8.6vh), 5rem)`, 0.94, width
  92%): the home thesis, at most 13ch wide. The tracks index uses the same
  voice up to `5.5rem`.
- **Numeral** (860, `clamp(4rem, 3rem + 5vw, 7.5rem)`, 0.8, width 125%): a
  track's number in its pigment; the lesson position uses
  `clamp(2.5rem, 2rem + 2vw, 3.75rem)`; the 404 code `clamp(4rem, 12vw, 7rem)`
  in crimson.
- **Headline** (760, `clamp(2rem, 1.2rem + 3vw, 3.75rem)`, width 118%): home
  section headings. Lesson part headings are the same voice at
  `clamp(1.5rem, 1.2rem + 1.6vw, 2.75rem)`.
- **Lesson title** (760, `clamp(2.1rem, 1.4rem + 2.6vw, 3.5rem)`, 1.02, width
  96%): a lesson's h1.
- **Title** (760, `1.5rem`, 1.1): loop steps, explorer port names; next-lesson
  titles use 640 at `1.1875rem`.
- **Plate name** (640, width 125%, `0.14em`, uppercase): a track's name, like a
  constellation name on an atlas plate. Below `30rem` it drops to width 100%
  and `0.05em`. Sky-chart names use their own setting: width 118%, `0.06em`,
  `clamp(0.56rem, 1.1cqi, 0.78rem)`.
- **Body** (400, `1rem`, 1.58): interface copy.
- **Reading** (400, `clamp(1.0625rem, 0.95rem + 0.45vw, 1.2rem)`, 1.7): lesson
  prose in a column of at most `46rem`. Lesson h2 at `1.45em`, h3 at `1.15em`.
- **Label** (640, `0.9375rem`): buttons, navigation, summaries, in the display
  face.
- **Data** (400, `0.8125rem`, tabular): lesson numbers, reading minutes, code,
  counts, field values. Inline code is `0.875em`.

### Named Rules

**The Width Axis Rule.** Width carries motion: the home headline unfolds from
75% to 92%, buttons widen to 106% on hover, a next-lesson title to 108%.
Nothing else animates letter shapes.

**The Data Precedes Only With Data Rule.** Nothing sits above a heading unless
it carries data the heading lacks: a lesson's position numeral or a track's
number. No kickers, no eyebrows, and no monospace labels above headings.

## Layout

The shell is fluid to `92rem` with a side gutter of `clamp(1rem, 3vw, 2rem)`.
Sections are separated by a hairline rule and `6rem` of padding (`4rem` below
`42rem`). The masthead is `4rem` tall, sticky, on an 88% plate with a 14px
backdrop blur; anchors land below it through `scroll-padding-top`.

- **Home:** the hero is a two-column grid (`0.78fr` copy, `1.22fr` sky) that
  stacks below `70rem`. The five-step loop runs across in five columns, three
  below `70rem`, and down the page below `50rem`. The catalog is ruled rows:
  a `13rem` constellation figure, the text, and an `11rem` facts column; below
  `50rem` the figure narrows to `5.5rem`.
- **Lesson:** at `80rem` and wider, three columns: a `17rem` syllabus, a
  reading column up to `46rem`, and a `13rem` sticky step list. From `58rem`
  the syllabus becomes a drawer. Below `58rem` the step list becomes the one
  sticky horizontal strip, masked at its trailing edge, with the syllabus
  button. Below `50rem` the masthead scrolls away.
- **Explorer:** a component index above, the stage (`2fr`) beside the
  evidence drawer (`minmax(18rem, 0.72fr)`), and five reading lenses below.
  Below `1180px` they stack; below `42rem` the index becomes one swipeable,
  snap-aligned row.
- **Mobile:** at `28rem` the wordmark shrinks before the page may scroll
  sideways; `320px` with a wide fallback face is the budget.

## Elevation & Depth

The system is flat. Depth comes from the plates: white desk plate, raised
plate for hover and panels, and the night plate set into the page. Rules and
neatlines separate; nothing has a shadow at rest. Two shadows exist, for
surfaces that truly float. The masthead and the narrow lesson strip use a
backdrop blur instead of a shadow.

### Shadow Vocabulary

- **Overlay** (`0 24px 64px`, ink at 22% in the desk edition, black at 55% in
  the field edition): the search dialog and the syllabus drawer.
- **Callout** (`0 12px 30px`, ink at 14% or black at 40%): the explorer's
  selection card pinned to a port.

### Named Rules

**The Plate Not Shadow Rule.** A surface rises by changing plate, never by
casting a shadow. Shadows are only for a dialog, a drawer or a pinned callout.

## Shapes

Shallow radii: `2px` for the focus ring, keycaps and the closing plate,
`4px` for buttons, fields, the theme toggle and rows, `8px` for callouts, labs,
figures, quiz questions and lesson navigation, `12px` only for the analogy's
night plate. Circles are reserved for marks: star marks, the reticle, port
discs, quiz keys, loop nodes. Lines are hairlines (`1px`) and marks are drawn
at `1.5px`. The closing plate carries an inset neatline (`1px` outline, offset
`-0.75rem`) like a printed chart's frame.

**The Drawn Mark Rule.** Course state is a mark: an open ring is a lesson not
yet done, a filled ring is complete on this device, the crimson reticle is
where you are. The current syllabus row has no fill; it gets a crimson ring
around its mark and a crimson number.

## Components

### Buttons

Rectangular plates with a shallow radius; the arrow is type and leans toward
where the action goes.

- **Shape:** `4px` radius, at least `2.875rem` high, label weight 640.
- **Primary:** a celestial-ink plate with plate-coloured text.
- **Secondary:** transparent, with a strong rule border and ink text.
- **Inverse:** on a night plate, a night-ink label on an `ink-on-night` plate.
- **Hover:** the border turns ink, the label widens to 106%, the arrow moves
  `0.25rem` toward its target; primary blends 14% chart blue into the ink.
  **Active:** down `1px`. **Focus:** `2px` crimson outline, offset `3px`.

### Star mark and reticle

- **Star mark:** a `0.8rem` ring drawn at `1.5px` in the tier pigment (ink
  when no tier). Complete fills it with the same pigment. A verdict-green star
  mark counts completions in the masthead.
- **Reticle:** a `1.9rem` crimson ring at `1.5px` with four cross-hair ticks
  outside it. On a lesson's here-plate it locks on: from 2.2× scale and -45°
  to rest, in 0.7s.

### Cards / Containers

- **Rows, not cards:** catalogs, lesson lists, search results and 404 routes
  are ruled rows on the plate; the whole row is the target and hover raises it
  to the raised plate.
- **Callouts:** a whole `1px` boundary mixing 42% of the register's pigment
  into the rule, a 6% wash, `8px` radius, and a filled dot before the label.
  Note is chart blue, insight green, warning red, caveat gold. Never a side
  stripe.
- **Night plate:** the analogy is read on the field edition inside the page,
  `12px` radius, with night inks.
- **Lab panel:** raised plate, strong rule, `8px` radius, `2rem` padding;
  results in display weight 760 at `1.5rem`, the lead result in chart blue.

### Inputs / Fields

Fields sit on the plate with a `1px` field rule and `4px` radius, at least
`2.875rem` high. Lab values are set in the data face with tabular numerals;
the teach-back textarea uses the body face. Hover turns the border ink.
Focus turns it chart blue and adds the `2px` crimson outline. Invalid turns
the border verdict red with a red message below.

### Navigation

- **Masthead:** wordmark, section links, then the progress count, language
  link, search trigger and theme toggle. The current section gets a `2px`
  crimson rule that grows from its centre. Page to page the masthead holds
  still while the old page drops out and the new one fades in.
- **Theme toggle:** three icon radios in a field-rule frame; the chosen one is
  an ink plate with plate-coloured icon.
- **Search trigger:** field-rule frame with a `/` keycap in the data face.
- **Lesson steps:** the lesson's parts as small rings on a line; the current
  part fills in its tier pigment and grows 1.25×, and the line fills as the
  page is read where scroll-driven animation exists.
- **Syllabus:** one popover element; a drawer from the left below `80rem`, a
  sticky column at `80rem` and wider. Its star marks hang on a `1px` tier line.

### Icons

One authored set in `src/components/Icon.astro`: 24px outlines, stroke
`1.75`, round caps, `currentColor`, always decorative. A Unicode glyph never
stands in for an icon or a marker. An arrow inside a text label is type, not
an icon.

### Checks

The quiz numbers each question in a ring in the tier pigment. A right answer
fills that ring verdict green and colours the boundary; a wrong one turns it
red. Verdicts are words, not only colour. The teach-back counts characters and
words in the data face; its status ring fills green when the explanation
qualifies. Completing both fills the lesson's completion ring green with a
check and a single ring pulse.

### Sky chart (signature)

The whole curriculum as one chart, in SVG, complete without script. A dotted
graticule every 80 units inside a neatline ticked every 20; each
constellation is a tier-pigment line (`1.6` units, 80% opacity) through its
stars; dashed bridges join one track's last star to the next track's first.
Star radius runs 2.2 to 6 units by in-degree, capped at 6; stars with
in-degree 3 or more are bright and breathe on a 7.5s cycle (the clock ÷ 24).
Track names are HTML links pinned over the chart, never SVG text. They sit
on two staggered lines above the figures and two below, measured from the
row's outermost figure (the stagger is 68 units), so neighbouring names never
land level. Each name hangs from the edge of its figure on a `1px` leader in
`rule-strong`, its length set in container units (1cqi = 10 chart units) so
the same rule serves the flat chart and the 3D sky. Under a `38rem` container
only the numbers show. The plate keeps a 70-unit side margin, so the first and
last names stay 100 chart units inside it (`NAME_HALF_WIDTH` in
`src/lib/sky.ts`) and the number-only labels on a 320px phone never touch. The chart always prints its key below it: an open
ring for a lesson, a filled ring for completed on this device, a larger ring
for a lesson many others build on, a solid line for course order, and a
dashed line for the bridge to the next track.

On arrival the constellations draw themselves in track order (1.2s each,
0.14s apart) and their stars ignite. A crimson comet, 0.6% of the route,
travels the whole course route once per 180s. A switch below the chart's
corner pauses all of it with no script; it is hidden under reduced motion.

Where WebGL exists, the 3D sky loads only after the chart is visible, the
page has loaded and the browser is idle. It reads the SVG, so it cannot draw
a different sky. Its first frame matches the poster; then the chart lifts
onto a sphere by inverse gnomonic projection over 2.6s, as a left-to-right
wave, so straight lines become great circles. It does not turn: it sways
±5.5° about a pole tilted 23.4° and ±0.6° in pitch over the 180s clock, plus
up to ±1.3° of pointer parallax. It draws at 30 fps when idle and never
captures wheel or touch.

### Constellation chart

One track's constellation in three sizes: the track page (draws itself on
arrival), the catalog miniature (draws as it scrolls into view), and the
lesson's here-plate with the reticle on the current star. Stars are HTML links
with `2.75rem` targets; a star flies between pages as a named view transition.

### Signal Observatory (signature)

The explorer's 3D specimen: one decoder block built as an armillary
instrument on a single axis, input at the bottom and output at the top,
always. Eight decks stand on a plinth under a crown: embedding, RMSNorm,
self-attention, residual add, RMSNorm, feed-forward, residual add, LM head.

- Plates are vitreous enamel (the plate colour mixed 13% toward chart blue)
  engraved like a chart; rods and hoops are satin nickel (`ink-muted`, fully
  metallic); ports and tokens are glazed porcelain (`ink`).
- Attention is a small celestial dome; the query token is a star and its
  attention to earlier tokens is drawn as great-circle arcs weighted by the
  attention weight. The feed-forward network is the one warm element, a
  core-gold enamel sphere in a cage of vanes. Norms are calibration hoops;
  residual adds are junction hoops. Both bypasses run up one side meridian.
- Twelve numbered porcelain ports map one-to-one to the twelve library
  entries, in the same order and numbering as the HTML index.
- A token rises through every deck in 12s, a whole fraction of the 180s
  clock; copies ride the bypasses and arrive at each add with it.
- The stage is the night plate in both editions. An HTML layer key pins each
  entry beside its deck; selection draws a crimson leader to an HTML callout
  card. Isolate dims everything else to 12% opacity.
- Before WebGL, an SVG poster of the same instrument fills the stage, and
  every port, fact and lesson link exists as HTML.

### Mark and social cards

The wordmark is a chart-blue ring with four ticks and a crimson four-point
star; the favicon draws the same mark on a night tile (`7px` corner) with an
`ink-on-night` ring and the field-edition crimson star. Social
cards (`src/lib/og-render.ts`, 1200 × 630) are the field edition: a night
plate, Mona Sans static cuts, a data line in the tier pigment (track, lesson,
tier), the headline, and a ruled footer with the four tiers as rings, the
page's own filled.

### Motion

One deceleration for arrivals (`cubic-bezier(0.16, 1, 0.3, 1)`), a shorter
exit, durations of 140, 260, 520 and 900ms, and the 180s ambient clock.
Pages change by cross-document view transition, CSS only. The opt-in is an
inline `<style>` placed first in `<head>`, and only when motion is welcome.
On navigation the old page drops out at once (no animation, opacity 0), and
so does any named element with no partner on the new page. The new page
fades in over 260ms while named elements (the masthead, a track's chart, a
lesson's star, the syllabus) travel to their new place over 520ms, so two
pages' text never overlaps. Sections fade
up into view only where scroll-driven animation exists. Under reduced motion
every duration is zero, the comet and breathing stop, and the 3D sky settles
straight onto its dome.

## Do's and Don'ts

### Do:

- **Do** derive every chart from the real curriculum: tracks, lessons, order, prerequisites and tier.
- **Do** draw course state as a mark: open ring, filled star, crimson reticle.
- **Do** keep tier pigments for tiers and crimson for "here" and focus.
- **Do** set track names as plate names (width 125%, `0.14em`, uppercase), and lesson titles at regular width.
- **Do** run every ambient loop on the 180s clock or a whole fraction of it.
- **Do** ship complete HTML and SVG before WebGL, and keep every string in HTML.
- **Do** give every field and toggle a boundary in `rule-field`.

### Don't:

- **Don't** put a kicker or eyebrow above a heading unless it carries data the heading lacks.
- **Don't** use a Unicode glyph as an icon or a marker.
- **Don't** use a cream or off-white page ground; the desk plate is white.
- **Don't** use italic accent words in headlines.
- **Don't** use pill-shaped buttons; buttons are `4px` plates.
- **Don't** use monospace eyebrow labels.
- **Don't** put text inside SVG; SVG draws geometry and HTML holds every string.
- **Don't** use a graticule or grid as wallpaper; it appears only where it locates something.
- **Don't** show state with a fill hue alone.
- **Don't** run motion under reduced motion.
