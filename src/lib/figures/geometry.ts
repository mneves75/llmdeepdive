/**
 * Scales and tick generation for `plot` figures.
 *
 * Hand-written rather than d3-scale + d3-shape. That is a deliberate trade: the
 * whole surface below is about sixty lines of pure arithmetic with a test file
 * beside it, against six transitive packages added to a repo whose entire
 * production dependency set is one entry (`three`) and whose CI runs gitleaks
 * plus `pnpm audit --audit-level=high` on every push.
 *
 * Everything here is a pure function of numbers so `node --test` can exercise it
 * directly. No DOM, no Astro, no three.js.
 */
import type { FigureAxis } from './types'

/**
 * Position of `value` along an axis, as a fraction in [0, 1].
 *
 * Returns a fraction rather than a pixel so the same number drives the SVG
 * geometry and the HTML tick that labels it — a plot whose ticks are computed
 * separately from its curve is a plot whose ticks eventually lie.
 */
export function positionOn(axis: FigureAxis, value: number): number {
  if (axis.scale === 'log') {
    // A log axis cannot represent zero or negatives, and silently clamping
    // would draw a confident line through a value the axis cannot hold.
    if (axis.min <= 0 || axis.max <= 0 || value <= 0) {
      throw new RangeError(
        `log axis "${axis.label.en}" cannot place ${value} (domain ${axis.min}..${axis.max}); ` +
          'log scales are undefined at and below zero',
      )
    }
    const span = Math.log10(axis.max) - Math.log10(axis.min)
    if (span === 0) return 0
    return (Math.log10(value) - Math.log10(axis.min)) / span
  }
  const span = axis.max - axis.min
  if (span === 0) return 0
  return (value - axis.min) / span
}

/** Clamped to the drawable area, for a point that sits outside the domain. */
export function clampedPositionOn(axis: FigureAxis, value: number): number {
  return Math.min(1, Math.max(0, positionOn(axis, value)))
}

/**
 * Tick values for an axis.
 *
 * Log axes get one tick per power of ten — the convention every roofline and
 * scaling-law chart in this course follows, and the reason a reader can see an
 * order of magnitude at a glance. Linear axes get a "nice" step from the 1/2/5
 * sequence, which is what keeps 0, 25, 50, 75, 100 from becoming 0, 33.33, …
 */
export function ticksFor(axis: FigureAxis, target = 5): number[] {
  if (axis.scale === 'log') {
    if (axis.min <= 0 || axis.max <= 0) {
      throw new RangeError(`log axis "${axis.label.en}" needs a positive domain`)
    }
    const first = Math.ceil(Math.log10(axis.min))
    const last = Math.floor(Math.log10(axis.max))
    const out: number[] = []
    for (let power = first; power <= last; power += 1) out.push(10 ** power)
    return out
  }

  const span = axis.max - axis.min
  if (span <= 0) return [axis.min]
  const rough = span / Math.max(1, target)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalised = rough / magnitude
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude

  const out: number[] = []
  // Guard the loop on a computed count rather than accumulating: repeated
  // addition of a float step drifts, and a drifting tick lands off-axis.
  const start = Math.ceil(axis.min / step)
  const end = Math.floor(axis.max / step)
  for (let i = start; i <= end; i += 1) out.push(i * step)
  return out
}

/**
 * SVG path for a series, in the figure's own 0..100 x 0..100 viewBox.
 *
 * The viewBox is unitless and square-normalised so the same path renders at any
 * rendered size with `preserveAspectRatio="none"` off — the caller controls the
 * aspect ratio, the path never encodes one.
 */
export function seriesPath(
  xAxis: FigureAxis,
  yAxis: FigureAxis,
  points: readonly (readonly [number, number])[],
): string {
  if (points.length === 0) return ''
  return points
    .map(([x, y], index) => {
      const px = (clampedPositionOn(xAxis, x) * 100).toFixed(2)
      // SVG y grows downward; the axis grows upward.
      const py = (100 - clampedPositionOn(yAxis, y) * 100).toFixed(2)
      return `${index === 0 ? 'M' : 'L'}${px} ${py}`
    })
    .join(' ')
}

/**
 * Apply a causal mask to an attention-weight matrix and renormalise each row
 * over the positions that survive.
 *
 * Masking is only meaningful if the numbers actually change. A matrix that is
 * already lower-triangular makes the "before" and "after" steps numerically
 * identical while the caption claims future logits went to negative infinity —
 * the figure then contradicts itself, which is worse than having no figure.
 *
 * Values are rounded to two decimals for display and the residue is absorbed
 * into each row's largest surviving cell, so every row still sums to exactly
 * 1.00 as rendered. A row of weights that visibly sums to 0.99 teaches that
 * softmax does not normalise.
 */
export function maskAndRenormalise(
  rows: readonly (readonly number[])[],
  decimals = 2,
): (number | null)[][] {
  const scale = 10 ** decimals
  return rows.map((row, r) => {
    const kept = row.slice(0, r + 1)
    const total = kept.reduce((sum, value) => sum + value, 0)
    if (total <= 0) return row.map((_, c) => (c > r ? null : 0))

    const rounded = kept.map((value) => Math.round((value / total) * scale) / scale)
    // Absorb rounding residue into the largest cell — the one where a hundredth
    // is least visible, and the only choice that cannot make a small weight
    // negative.
    const residue = Math.round((1 - rounded.reduce((s, v) => s + v, 0)) * scale) / scale
    let largest = 0
    for (let i = 1; i < rounded.length; i += 1) if (rounded[i]! > rounded[largest]!) largest = i
    rounded[largest] = Math.round((rounded[largest]! + residue) * scale) / scale

    return row.map((_, c) => (c > r ? null : rounded[c]!))
  })
}

/**
 * Bin a cell value into one of `bins` discrete levels, 0-indexed.
 *
 * Discrete, never a continuous ramp: `color-mix()` at an arbitrary percentage is
 * invisible to `scripts/a11y-contrast.mjs`, so a continuously ramped cell can
 * reach any contrast at all without a single gate noticing. A fixed number of
 * levels is a fixed number of colour pairs that can actually be checked.
 */
export function binOf(value: number, min: number, max: number, bins: number): number {
  if (bins < 1) throw new RangeError('bins must be at least 1')
  if (max <= min) return 0
  const fraction = (value - min) / (max - min)
  const index = Math.floor(fraction * bins)
  return Math.min(bins - 1, Math.max(0, index))
}
