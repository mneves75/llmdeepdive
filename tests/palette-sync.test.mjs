/**
 * Every copy of a field-edition colour equals the token it copies.
 *
 * tokens.css is the palette. Four places cannot read it and hold a literal
 * instead: the 3D fallback palette (no document in tests, and the fallback for
 * a token that fails to resolve), the port markers' default style, the social
 * cards (drawn at build time by satori) and the favicon (a static SVG). A
 * palette change that misses one leaves a navy card beside a neutral site.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { alphaToken, token } from '../scripts/palette-tokens.mjs'
import { FIELD_PALETTE } from '../src/lib/three/palette.ts'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const hex = (value) => `#${value.toString(16).padStart(6, '0')}`

test('the 3D fallback palette is the field edition of tokens.css', () => {
  const tokens = {
    plate: 'plate',
    ink: 'ink',
    inkMuted: 'ink-muted',
    inkFaint: 'ink-faint',
    accent: 'accent',
    reticle: 'reticle',
    tierFoundations: 'tier-foundations',
    tierCore: 'tier-core',
    tierAdvanced: 'tier-advanced',
    tierFrontier: 'tier-frontier',
  }
  for (const [key, name] of Object.entries(tokens)) assert.equal(hex(FIELD_PALETTE[key]), token(name).dark, `FIELD_PALETTE.${key} != --${name}`)
  assert.equal(hex(FIELD_PALETTE.grid), alphaToken('grid').dark.hex, 'FIELD_PALETTE.grid != --grid')
})

test('no scene keeps a second copy of the field palette', () => {
  const scene = read('src/lib/three/scenes/transformer.ts')
  assert.doesNotMatch(scene, /plate:\s*0x[0-9a-f]{6}/iu, 'transformer.ts must use FIELD_PALETTE, not its own literals')
})

test('port markers default to field ink with plate numerals', () => {
  const markers = read('src/lib/three/markers.ts')
  const style = /const DEFAULT_STYLE: MarkerStyle = \{([^}]+)\}/u.exec(markers)?.[1] ?? ''
  assert.equal(/porcelain: '(#[0-9a-f]{6})'/iu.exec(style)?.[1], token('ink').dark)
  assert.equal(/ink: '(#[0-9a-f]{6})'/iu.exec(style)?.[1], token('plate').dark)
  assert.equal(/reticle: '(#[0-9a-f]{6})'/iu.exec(style)?.[1], token('reticle').dark)
})

test('social cards are drawn in the night plate and its inks', () => {
  const card = read('src/lib/og-render.ts')
  const color = /const COLOR = \{([^}]+)\}/u.exec(card)?.[1] ?? ''
  const tiers = /const TIER_COLOR: Record<Tier, string> = \{([^}]+)\}/u.exec(card)?.[1] ?? ''
  const value = (block, key) => new RegExp(`${key}: '(#[0-9a-f]{6})'`, 'iu').exec(block)?.[1]
  assert.equal(value(color, 'night'), token('night').light)
  assert.equal(value(color, 'ink'), token('ink-on-night').light)
  assert.equal(value(color, 'muted'), token('ink-muted-on-night').light)
  assert.equal(value(color, 'idle'), token('rule-field').dark)
  assert.equal(value(color, 'reticle'), token('reticle').dark)
  for (const tier of ['foundations', 'core', 'advanced', 'frontier']) assert.equal(value(tiers, tier), token(`tier-${tier}`).dark)
})

test('the favicon is the mark on a night tile', () => {
  const icon = read('public/favicon.svg')
  assert.match(icon, new RegExp(`<rect[^>]*fill="${token('night').light}"`, 'u'))
  assert.match(icon, new RegExp(`<circle[^>]*stroke="${token('ink-on-night').light}"`, 'u'))
  assert.match(icon, new RegExp(`fill="${token('reticle').dark}"`, 'u'))
})
