/**
 * Regression cover for the Anatomy Explorer's screen-space marker scale.
 *
 * The bug this exists to prevent: the explorer booted while its canvas still
 * carried the `hidden` attribute, so the height fed to the scale conversion was
 * 0. The old formula clamped that to 1 px, which turned each 32 px annotation
 * dot into a ~25 world-unit billboard — a single flat colour covering the
 * entire canvas, for every visitor, until something fired a window resize.
 *
 * The conversion must therefore refuse an unmeasured viewport instead of
 * approximating one.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { markerPixelScale } from '../src/lib/three/markers.ts'

const FOV = 42

test('an unmeasured viewport yields no scale rather than a guess', () => {
  for (const height of [0, -1, Number.NaN]) {
    assert.equal(
      markerPixelScale(FOV, height),
      0,
      `height ${height} must not produce a scale — that is what filled the canvas`,
    )
  }
})

test('a measured viewport yields the exact projection-plane conversion', () => {
  const height = 800
  const expected = 2 * (32 / height) * Math.tan((FOV * Math.PI) / 180 / 2)
  assert.ok(Math.abs(markerPixelScale(FOV, height) - expected) < 1e-12)
})

test('a dot stays far smaller than the viewport at every plausible height', () => {
  // Scale is in clip-space units where the full viewport height is 2, so a dot
  // covering the canvas means scale >= 2. Real heights can never get close.
  for (const height of [200, 400, 817, 1440, 2160]) {
    const scale = markerPixelScale(FOV, height)
    assert.ok(scale > 0 && scale < 0.4, `height ${height} gave scale ${scale}`)
  }
})

test('scale is inversely proportional to viewport height', () => {
  // Constant pixel size is the whole contract: halve the canvas, double the
  // world scale, and the dot stays 32 px on screen.
  const tall = markerPixelScale(FOV, 1000)
  const short = markerPixelScale(FOV, 500)
  assert.ok(Math.abs(short - tall * 2) < 1e-12)
})
