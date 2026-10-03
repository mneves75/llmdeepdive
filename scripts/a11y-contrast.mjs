import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

function token(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const pair = source.match(new RegExp(`--${escaped}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)`, 'iu'))
  if (pair) return { light: pair[1], dark: pair[2] }
  const solid = source.match(new RegExp(`--${escaped}:\\s*(#[0-9a-f]{6})`, 'iu'))
  if (solid) return { light: solid[1], dark: solid[1] }
  throw new Error(`Missing hexadecimal color token --${name}`)
}

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function ratio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

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
  console.error(`a11y:contrast FAIL — ${failures.length} pair(s) below WCAG AA`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`a11y:contrast PASS — ${pairs.length} text pair(s), worst ${worst.name} ${worst.value.toFixed(2)}:1; ${nonText.length} non-text pair(s) ≥ 3:1`)
}
