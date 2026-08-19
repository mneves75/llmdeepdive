/**
 * The figure system's only arithmetic. Every assertion here is a defect that
 * would otherwise reach a reader as a confidently mislabelled chart.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  positionOn,
  clampedPositionOn,
  ticksFor,
  seriesPath,
  binOf,
  maskAndRenormalise,
} from '../src/lib/figures/geometry.ts'

const linear = (min, max) => ({ label: { en: 'x', 'pt-br': 'x' }, scale: 'linear', min, max })
const log = (min, max) => ({ label: { en: 'x', 'pt-br': 'x' }, scale: 'log', min, max })

test('a linear axis places its endpoints and midpoint exactly', () => {
  const axis = linear(0, 100)
  assert.equal(positionOn(axis, 0), 0)
  assert.equal(positionOn(axis, 100), 1)
  assert.equal(positionOn(axis, 50), 0.5)
})

test('a linear axis handles a non-zero origin', () => {
  const axis = linear(20, 40)
  assert.equal(positionOn(axis, 20), 0)
  assert.equal(positionOn(axis, 30), 0.5)
  assert.equal(positionOn(axis, 40), 1)
})

test('a log axis places each decade at an equal fraction', () => {
  const axis = log(1, 1000)
  assert.equal(positionOn(axis, 1), 0)
  assert.ok(Math.abs(positionOn(axis, 10) - 1 / 3) < 1e-12)
  assert.ok(Math.abs(positionOn(axis, 100) - 2 / 3) < 1e-12)
  assert.equal(positionOn(axis, 1000), 1)
})

test('a log axis refuses a value it cannot represent instead of clamping it', () => {
  // Silently clamping zero to the left edge draws a line to a point the axis
  // does not contain — the chart then asserts something the data never said.
  assert.throws(() => positionOn(log(1, 1000), 0), RangeError)
  assert.throws(() => positionOn(log(1, 1000), -5), RangeError)
  assert.throws(() => positionOn(log(0, 1000), 10), RangeError)
})

test('a zero-width domain collapses to 0 rather than dividing by zero', () => {
  assert.equal(positionOn(linear(5, 5), 5), 0)
  assert.equal(Number.isNaN(positionOn(linear(5, 5), 5)), false)
})

test('clamping keeps an out-of-domain point on the canvas', () => {
  const axis = linear(0, 10)
  assert.equal(clampedPositionOn(axis, -5), 0)
  assert.equal(clampedPositionOn(axis, 50), 1)
})

test('log ticks are one per power of ten inside the domain', () => {
  assert.deepEqual(ticksFor(log(1, 10000)), [1, 10, 100, 1000, 10000])
  // 5 and 4000 sit mid-decade: the ticks are the decades they enclose.
  assert.deepEqual(ticksFor(log(5, 4000)), [10, 100, 1000])
})

test('linear ticks come from the 1/2/5 sequence, never a raw division', () => {
  assert.deepEqual(ticksFor(linear(0, 100), 5), [0, 20, 40, 60, 80, 100])
  assert.deepEqual(ticksFor(linear(0, 10), 5), [0, 2, 4, 6, 8, 10])
  assert.deepEqual(ticksFor(linear(0, 1), 5), [0, 0.2, 0.4, 0.6000000000000001, 0.8, 1])
})

test('linear ticks do not drift on a fractional step', () => {
  // Accumulating `value += step` in floats walks off the axis over enough
  // steps; the implementation multiplies an integer index instead.
  const ticks = ticksFor(linear(0, 1000), 5)
  assert.equal(ticks.at(-1), 1000)
  assert.equal(ticks[0], 0)
  for (const tick of ticks) assert.ok(tick >= 0 && tick <= 1000)
})

test('a degenerate linear domain yields a single tick, not an infinite loop', () => {
  assert.deepEqual(ticksFor(linear(7, 7)), [7])
})

test('a series path flips the y axis for SVG coordinates', () => {
  // y grows downward in SVG and upward on the axis. Getting this wrong renders
  // every chart in the course upside down and still looks plausible.
  const path = seriesPath(linear(0, 10), linear(0, 10), [
    [0, 0],
    [10, 10],
  ])
  assert.equal(path, 'M0.00 100.00 L100.00 0.00')
})

test('an empty series produces no path rather than a malformed one', () => {
  assert.equal(seriesPath(linear(0, 10), linear(0, 10), []), '')
})

test('binning is closed at both ends and never returns an out-of-range index', () => {
  assert.equal(binOf(0, 0, 100, 4), 0)
  assert.equal(binOf(100, 0, 100, 4), 3, 'the maximum must land in the last bin, not bins+1')
  assert.equal(binOf(50, 0, 100, 4), 2)
  assert.equal(binOf(-10, 0, 100, 4), 0)
  assert.equal(binOf(1000, 0, 100, 4), 3)
})

test('binning a flat range does not divide by zero', () => {
  assert.equal(binOf(5, 5, 5, 4), 0)
})

test('masking blanks the future and nothing else', () => {
  const out = maskAndRenormalise([
    [0.25, 0.3, 0.2, 0.25],
    [0.3, 0.35, 0.2, 0.15],
    [0.15, 0.35, 0.3, 0.2],
    [0.1, 0.3, 0.2, 0.4],
  ])
  for (let r = 0; r < out.length; r += 1) {
    for (let c = 0; c < out[r].length; c += 1) {
      if (c > r) assert.equal(out[r][c], null, `cell ${r},${c} is in the future and must be masked`)
      else assert.notEqual(out[r][c], null, `cell ${r},${c} is in the past and must survive`)
    }
  }
})

test('every masked row renormalises to exactly 1 as displayed', () => {
  // A row of attention weights that visibly sums to 0.99 teaches that softmax
  // does not normalise. Rounding residue must be absorbed, not shown.
  const out = maskAndRenormalise([
    [0.25, 0.3, 0.2, 0.25],
    [0.3, 0.35, 0.2, 0.15],
    [0.15, 0.35, 0.3, 0.2],
    [0.1, 0.3, 0.2, 0.4],
  ])
  for (const [index, row] of out.entries()) {
    const sum = row.filter((v) => v !== null).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(sum - 1) < 1e-9, `row ${index} sums to ${sum}, not 1`)
  }
})

test('masking actually changes the surviving weights', () => {
  // The whole teaching point. An already lower-triangular input makes the
  // before/after steps identical while the caption claims otherwise.
  const unmasked = [
    [0.25, 0.3, 0.2, 0.25],
    [0.3, 0.35, 0.2, 0.15],
  ]
  const out = maskAndRenormalise(unmasked)
  assert.equal(out[0][0], 1, 'position 1 keeps only itself, so it must renormalise to 1')
  assert.notEqual(out[1][0], unmasked[1][0], 'surviving weights must be rescaled, not copied')
})

test('the last row has no future to lose and keeps its values', () => {
  // Rewritten: the first version asserted `out[0][0] === (out[0][0] === null ? null : 1)`,
  // a tautology that passes for every possible implementation.
  const out = maskAndRenormalise([
    [0.4, 0.6],
    [0.3, 0.7],
  ])
  assert.deepEqual(out[1], [0.3, 0.7], 'a complete row is already normalised over its own past')
  assert.deepEqual(out[0], [1, null], 'the first row renormalises to 1 and loses its future')
})

test('a fully zero row does not divide by zero', () => {
  const out = maskAndRenormalise([[0, 0]])
  assert.deepEqual(out[0], [0, null])
})
