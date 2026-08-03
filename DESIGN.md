---
name: llmdeepdive
description: A bathymetric core atlas for understanding language models layer by layer.
colors:
  abyss: "#061a2b"
  abyss-raised: "#0d3045"
  chart-field: "#f4f7f2"
  chart-raised: "#ffffff"
  sounding-ink: "#102b3a"
  muted-ink: "#3f5a66"
  mist-line: "#cbd8d7"
  survey-cyan: "#007687"
  sonar-yellow: "#806800"
  coral-red: "#c43327"
  kelp-green: "#287855"
  instrument-violet: "#8d6bcc"
  mechanism-coral: "#c4553f"
  mechanism-amber: "#c98a2b"
  residual-green: "#769d74"
  output-teal: "#2f8a8a"
  signal-cyan: "#5de7ee"
typography:
  display:
    fontFamily: "Avenir Next Condensed, Arial Narrow, Roboto Condensed, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.5rem)"
    fontWeight: 750
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Avenir Next, Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.58
  lessonBody:
    fontFamily: "Avenir Next, Segoe UI, Arial, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "SFMono-Regular, Cascadia Mono, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "0.1em"
rounded:
  xs: "2px"
  sm: "5px"
  md: "9px"
  lg: "13px"
spacing:
  3xs: "4px"
  2xs: "8px"
  xs: "12px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.survey-cyan}"
    textColor: "{colors.chart-raised}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "46px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.sounding-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "46px"
  survey-panel:
    backgroundColor: "{colors.chart-raised}"
    textColor: "{colors.sounding-ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: llmdeepdive

## Overview

**Creative North Star: “The Abyssal Core Atlas”**

llmdeepdive is a working scientific survey of a language model. Clear chart
fields establish orientation; abyssal sections reveal mechanism, evidence, and
implementation. Bathymetric contours, core samples, signal paths, and survey
markers form a single information system rather than a decorative theme.

Its reusable signature is the **core section**: a layered cutaway that can show
the curriculum, one transformer block, a lesson sequence, or learner progress.
Every layer and marker encodes a real relationship. Content remains complete
before Canvas or WebGL enhancement.

**Key Characteristics:**

- Scientific cartography with bold, contemporary information design.
- Clear chart fields contrasted with functional abyssal regions.
- Continuous descents and cutaways instead of generic card grids.
- Survey notation for position, evidence, state, and measurements.
- Dense information made navigable through depth and sequence.

## Colors

The palette pairs a cool hydrographic field with abyssal navy. Four survey
pigments carry stable meaning in both light and dark modes.

### Primary

- **Abyssal Navy** (`#061a2b`): structural ink, deep sections, explorer stages,
  and the footer field.
- **Survey Cyan** (`#007687`): primary actions, active paths, links, and current
  position.

### Secondary

- **Sonar Yellow** (`#806800`): evidence, attention, and advanced strata.
- **Coral Red** (`#c43327`): caveats, errors, frontier material, and danger.

### Tertiary

- **Kelp Green** (`#287855`): verified completion, correct answers, and stable
  learned states.

### Instrument

- **Instrument Violet:** embedding and input-vector assemblies.
- **Mechanism Coral:** attention routing assemblies.
- **Mechanism Amber:** feed-forward and expert-routing assemblies.
- **Residual Green:** bypasses and additive residual paths.
- **Output Teal:** tokenisation, cache, output projection and sampling ports.
- **Signal Cyan:** the active token path, direction arrow and observatory frame.

### Neutral

- **Chart Field** (`#f4f7f2`): the light reading and survey ground.
- **Chart Raised** (`#ffffff`): controls and bounded detail panels.
- **Sounding Ink** (`#102b3a`): primary text and display type.
- **Muted Ink** (`#3f5a66`): summaries and supporting copy.
- **Mist Line** (`#cbd8d7`): dividers, contour rules, and inactive boundaries.

**The Encoded Color Rule.** Pigment identifies a layer, state, or path; it is
never scattered merely to create energy.

**The Two Waters Rule.** Light and dark modes are different survey conditions,
not a literal inversion. Semantic pigments keep the same meanings.

## Typography

**Display Font:** Avenir Next Condensed with narrow system fallbacks.  
**Body Font:** Avenir Next with Segoe UI and Arial fallbacks.  
**Label/Mono Font:** SFMono Regular with Cascadia Mono and Consolas fallbacks.

**Character:** Display type reads like a decisive survey title block. Body type
stays calm across long lessons; data labels are compact, tabular, and visibly
subordinate. The zero-network-font stack protects first render and privacy.

### Hierarchy

- **Display** (750, up to `5.5rem`, `0.98`): one uppercase thesis per surface.
- **Headline** (750, `2–3.75rem`, `0.98`): lesson and section wayfinding.
- **Title** (650–750, `1.2–2rem`): tracks, components, and exercises.
- **Body** (400, `1rem`, `1.58`): interface copy and supporting text.
- **Lesson body** (400, `1.3rem`, `1.65`): long-form teaching copy within a
  `40rem` reading column, with explicit paragraph and list rhythm.
- **Label** (650, `0.6875rem`, `0.1em`): short uppercase survey notation only.

**The Instrument Test.** Monospace belongs only where content could plausibly
come from an instrument, coordinate, measurement, code block, or identifier.

## Layout

The shell is fluid up to `92rem`. Lesson prose stays within `40rem`, paired with
a `13rem` sticky depth rail on wide screens. Tracks form a single numbered
descent, not equal cards. The explorer uses a horizontal component selector,
a dominant abyssal stage and an evidence drawer; below `1180px` those strata
stack in selector → stage → evidence order without losing content. On mobile,
the selector keeps an explicit swipe affordance and snap-aligned items.

At `58rem` the lesson rail becomes a horizontal sticky strip. At `48rem` and
`42rem`, multi-column introductions and track structures become deliberate
vertical surveys. At `28rem`, header controls compact while keeping search,
theme, and primary navigation visible. Spacing ranges from `4px` to `144px`;
tight spacing groups one instrument, while depth changes receive generous air.

## Elevation & Depth

The system is flat by default. Depth comes from tonal fields, section cuts,
contour density, borders, and sequence. Shadows are reserved for true overlays:
the search dialog and a 3D annotation callout.

### Shadow Vocabulary

- **Overlay** (`0 24px 64px rgb(6 26 43 / 0.2)`): modal search only.
- **Callout** (`0 12px 30px rgb(6 26 43 / 0.12)`): floating annotations only.

**The Measured Depth Rule.** Every visual layer corresponds to curriculum order,
model structure, interaction state, or evidence priority.

## Shapes

Reading surfaces use square edges or small `2–13px` radii. Circular sounding
markers identify position and completion. Core cutaways may use precise clipped
edges and organic contour arcs. Pills are not the default; they are reserved for
compact state controls where the silhouette carries meaning.

## Components

### Buttons

- **Shape:** shallow `5px` radius, at least `46px` high for primary actions.
- **Primary:** Survey Cyan with chart-white text and a directional glyph.
- **Secondary:** transparent chart field with a strong rule.
- **Hover / Focus:** a 2px upward shift on hover; a 3px Sonar Yellow focus ring.

### Cards / Containers

- **Survey panels:** chart-raised background, one-pixel rule, `13px` maximum
  radius, and no rest shadow.
- **Track strata:** continuous ruled rows with an oversized sequence number.
- **Abyssal panels:** navy field with high-contrast mist copy and encoded accents.

### Inputs / Fields

Text fields use a one-pixel strong rule, chart-raised background, `5px` radius,
and the body font. Focus changes the rule to Survey Cyan and adds a restrained
Sonar Yellow outline. Validation state uses Kelp Green or Coral Red.

### Navigation

The header is a sticky three-column survey bar. Below `50rem`, actions stay on
the first row and primary links occupy a second ruled row. Lessons use a sticky
depth rail that converts into a horizontally scrollable section strip.

### Core Section

The signature composition uses an oblique boundary between chart and abyssal
fields, circular contours, a vertical signal line, and nodes tied to real steps.
Use it when a surface must explain sequence or internal structure, never as
wallpaper.

### Signal Observatory

The explorer's procedural 3D specimen is a scientific instrument, not a glossy
product render. Machined rounded decks expose distinct mechanisms, numbered
ports map every library component to the model, side routes explain residual
flow, and a persistent arrow plus bilingual instrument key make the bottom-to-top
token journey readable without opening the evidence drawer. Selection and
isolation may clarify the instrument but must never be required to understand
its direction or layer identity.

## Do's and Don'ts

### Do:

- **Do** let one structural cutaway or path dominate each major surface.
- **Do** derive diagrams from real tracks, lessons, citations, quiz state, or
  transformer relationships.
- **Do** preserve semantic HTML, visible focus, reduced motion, and complete
  content before WebGL enhancement.
- **Do** treat mobile as a deliberate vertical survey.
- **Do** keep every explorer selector mapped to a numbered observatory port and
  an honest physical mechanism.

### Don't:

- **Don't** use contours, grids, coordinates, or sounding marks as wallpaper.
- **Don't** use generic AI neon, purple-blue glow, circuit boards, or robot-brain
  imagery.
- **Don't** return to cream paper, serif-led book styling, handwritten notes, or
  soft rounded cards as the scaffold.
- **Don't** rasterize navigation, controls, interface text, or core diagrams.
