import { alphaToken, oklch, ratio, token } from './palette-tokens.mjs'

// Two editions of one atlas: every text pigment is measured on every surface
// it is set on, in both. A light-dark() pair is split into its two values.
const editions = ['light', 'dark']
const surfaces = ['plate', 'plate-raised']
const textInks = ['ink', 'ink-muted', 'ink-faint', 'accent', 'reticle', 'tier-foundations', 'tier-core', 'tier-advanced', 'tier-frontier', 'success', 'danger', 'caution']
const pairs = []
for (const edition of editions) {
  for (const surface of surfaces) {
    for (const ink of textInks) pairs.push([`${edition} ${ink} on ${surface}`, token(ink)[edition], token(surface)[edition]])
  }
  // Controls and states that set text on a filled ground.
  pairs.push([`${edition} primary button (plate on ink)`, token('plate')[edition], token('ink')[edition]])
  pairs.push([`${edition} selected answer key (accent-ink on accent)`, token('accent-ink')[edition], token('accent')[edition]])
  pairs.push([`${edition} current lesson (ink on accent-soft)`, token('ink')[edition], token('accent-soft')[edition]])
  pairs.push([`${edition} current position (reticle on accent-soft)`, token('reticle')[edition], token('accent-soft')[edition]])
  // The night plate (analogy, footer, explorer stage) in each edition.
  pairs.push([`${edition} night text`, token('ink-on-night').light, token('night')[edition]])
  pairs.push([`${edition} night supporting text`, token('ink-muted-on-night').light, token('night')[edition]])
  pairs.push([`${edition} raised night text`, token('ink-on-night').light, token('night-raised')[edition]])
  pairs.push([`${edition} raised night supporting text`, token('ink-muted-on-night').light, token('night-raised')[edition]])
}

// Non-text contrast (WCAG 1.4.11): a control's boundary, the focus ring and a
// star's outline (it carries completion state) need 3:1 on every surface.
const nonText = []
for (const edition of editions) {
  for (const surface of ['plate', 'plate-raised', 'plate-sunken']) {
    nonText.push([`${edition} field border on ${surface}`, token('rule-field')[edition], token(surface)[edition]])
    nonText.push([`${edition} focus ring on ${surface}`, token('reticle')[edition], token(surface)[edition]])
    for (const tier of ['tier-foundations', 'tier-core', 'tier-advanced', 'tier-frontier']) {
      nonText.push([`${edition} ${tier} star on ${surface}`, token(tier)[edition], token(surface)[edition]])
    }
  }
  nonText.push([`${edition} focus ring on night`, token('reticle').dark, token('night')[edition]])
}

const failures = []

// The night has no hue (DESIGN.md). Every dark ground and every ink set on one
// is neutral, so the only colour on a night plate is a pigment that means
// something. The night plate is dark in both editions, so both are measured.
const NEUTRAL_CHROMA = 0.01
const neutral = [
  ...['plate', 'plate-raised', 'plate-sunken', 'night', 'night-raised', 'ink', 'ink-muted', 'ink-faint', 'rule-field', 'accent-ink']
    .map((name) => [`dark ${name}`, token(name).dark]),
  ...['night', 'night-raised', 'ink-on-night', 'ink-muted-on-night'].map((name) => [`light ${name}`, token(name).light]),
  ...['rule', 'rule-strong'].map((name) => [`dark ${name}`, alphaToken(name).dark.hex]),
]
for (const [name, hex] of neutral) {
  const { chroma } = oklch(hex)
  if (chroma > NEUTRAL_CHROMA) failures.push(`${name}: OKLCH chroma ${chroma.toFixed(3)} (${hex}; a night ground or ink stays at or below ${NEUTRAL_CHROMA})`)
}

// A dark surface rises by gaining lightness: each step of the ladder is a
// visible one. The ends stop short of black and white, which bloom and smear.
const STEP = 0.03
const lightness = (name, edition) => oklch(token(name)[edition]).lightness
const ladder = [
  ['dark plate-sunken', lightness('plate-sunken', 'dark'), 'dark plate', lightness('plate', 'dark')],
  ['dark night', lightness('night', 'dark'), 'dark plate', lightness('plate', 'dark')],
  ['dark plate', lightness('plate', 'dark'), 'dark plate-raised', lightness('plate-raised', 'dark')],
  ['dark night', lightness('night', 'dark'), 'dark night-raised', lightness('night-raised', 'dark')],
  ['light night', lightness('night', 'light'), 'light night-raised', lightness('night-raised', 'light')],
]
for (const [lowName, low, highName, high] of ladder) {
  if (high - low < STEP) failures.push(`${highName} (L ${high.toFixed(3)}) must sit at least ${STEP} above ${lowName} (L ${low.toFixed(3)})`)
}
const darkest = Math.min(lightness('plate-sunken', 'dark'), lightness('night', 'dark'))
if (darkest < 0.12) failures.push(`darkest night ground L ${darkest.toFixed(3)}: below 0.12 it reads as pure black`)
const brightest = Math.max(lightness('ink', 'dark'), lightness('ink-on-night', 'light'))
if (brightest > 0.96) failures.push(`brightest night ink L ${brightest.toFixed(3)}: above 0.96 it reads as pure white`)
let worst = { name: '', value: Number.POSITIVE_INFINITY }
for (const [name, foreground, background] of pairs) {
  const value = ratio(foreground, background)
  if (value < worst.value) worst = { name, value }
  if (value < 4.5) failures.push(`${name}: ${value.toFixed(2)}:1 (${foreground} on ${background}; text needs 4.5:1)`)
}
for (const [name, foreground, background] of nonText) {
  const value = ratio(foreground, background)
  if (value < 3) failures.push(`${name}: ${value.toFixed(2)}:1 (${foreground} on ${background}; non-text needs 3:1)`)
}

if (failures.length > 0) {
  console.error(`a11y:contrast FAIL — ${failures.length} failure(s)`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`a11y:contrast PASS — ${pairs.length} text pair(s), worst ${worst.name} ${worst.value.toFixed(2)}:1; ${nonText.length} non-text pair(s) ≥ 3:1; ${neutral.length} night colour(s) neutral; ${ladder.length} lightness step(s) ≥ ${STEP}`)
}
