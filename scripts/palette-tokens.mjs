/**
 * The colour tokens as published in src/styles/tokens.css, and the two
 * measurements made on them: WCAG contrast and OKLCH lightness and chroma.
 * Shared by the contrast gate and by the tests that keep copies of a token
 * (the 3D fallback palette, the social cards, the favicon) equal to it.
 */
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

/** A hex token as `{ light, dark }`; a token with one value has it in both. */
export function token(name) {
  const pair = source.match(new RegExp(`--${escape(name)}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)`, 'iu'))
  if (pair) return { light: pair[1], dark: pair[2] }
  const solid = source.match(new RegExp(`--${escape(name)}:\\s*(#[0-9a-f]{6})`, 'iu'))
  if (solid) return { light: solid[1], dark: solid[1] }
  throw new Error(`Missing hexadecimal color token --${name}`)
}

/** A hairline token (`rgb(r g b / a)` pair) as `{ light, dark }` of `{ hex, alpha }`. */
export function alphaToken(name) {
  const tint = String.raw`rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)`
  const pair = source.match(new RegExp(`--${escape(name)}:\\s*light-dark\\(${tint},\\s*${tint}\\)`, 'iu'))
  if (!pair) throw new Error(`Missing rgb(… / α) color token --${name}`)
  const side = (at) => ({
    hex: `#${[0, 1, 2].map((i) => Number(pair[at + i]).toString(16).padStart(2, '0')).join('')}`,
    alpha: Number(pair[at + 3]),
  })
  return { light: side(1), dark: side(5) }
}

const channels = (hex) => [1, 3, 5]
  .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
  .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)

function luminance(hex) {
  const [r, g, b] = channels(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio of two opaque colours. */
export function ratio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

/** OKLCH lightness (0..1) and chroma of an sRGB hex (Ottosson's OKLab matrices). */
export function oklch(hex) {
  const [r, g, b] = channels(hex)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    chroma: Math.hypot(
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ),
  }
}
