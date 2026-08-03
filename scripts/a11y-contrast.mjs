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

const paper = token('paper-raised')
const abyss = token('abyss')
const pairs = [
  ['light primary text', token('ink').light, paper.light],
  ['light supporting text', token('ink-muted').light, paper.light],
  ['light instrument labels', token('ink-faint').light, paper.light],
  ['light Survey Cyan text', token('accent').light, paper.light],
  ['light Sonar Yellow text', token('sonar').light, paper.light],
  ['light Coral Red text', token('coral').light, paper.light],
  ['light Kelp Green text', token('kelp').light, paper.light],
  ['light primary button', token('accent-ink').light, token('accent').light],
  ['dark primary text', token('ink').dark, abyss.dark],
  ['dark supporting text', token('ink-muted').dark, abyss.dark],
  ['dark instrument labels', token('ink-faint').dark, abyss.dark],
  ['dark Survey Cyan text', token('accent').dark, abyss.dark],
  ['dark Sonar Yellow text', token('sonar').dark, abyss.dark],
  ['dark Coral Red text', token('coral').dark, abyss.dark],
  ['dark Kelp Green text', token('kelp').dark, abyss.dark],
  ['dark primary button', token('accent-ink').dark, token('accent').dark],
  ['abyss supporting text', token('ink-muted-on-abyss').dark, abyss.dark],
  ['fixed abyss Survey Cyan text', token('accent').dark, abyss.dark],
  ['fixed abyss Sonar Yellow text', token('sonar').dark, abyss.dark],
  ['fixed abyss Coral Red text', token('coral').dark, abyss.dark],
  ['fixed abyss Kelp Green text', token('kelp').dark, abyss.dark],
]

const failures = []
let worst = { name: '', value: Number.POSITIVE_INFINITY }
for (const [name, foreground, background] of pairs) {
  const value = ratio(foreground, background)
  if (value < worst.value) worst = { name, value }
  if (value < 4.5) failures.push(`${name}: ${value.toFixed(2)}:1 (${foreground} on ${background})`)
}

if (failures.length > 0) {
  console.error(`a11y:contrast FAIL — ${failures.length} text pair(s) below WCAG AA 4.5:1`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`a11y:contrast PASS — ${pairs.length} token pair(s); worst ${worst.name} ${worst.value.toFixed(2)}:1`)
}
