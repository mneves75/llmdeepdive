/**
 * The MoE arithmetic contract.
 *
 * Every number the five MoE lessons quote is produced by `src/lib/moe-math.ts`,
 * and this file pins those numbers. The expected values were computed
 * independently in Python before the module existed, so a bug in the
 * implementation cannot vouch for itself: if the module and these constants
 * disagree, one of them is wrong and the suite says so.
 *
 * The router cases are deliberately the lesson's own worked case: one token,
 * eight experts, logits 4.1 down to -2.4. The three gate functions are compared
 * on those logits because the comparison is the point — softmax concentrates
 * weight on the top expert, sigmoid saturates and hands the top two nearly equal
 * shares, sqrt(softplus) lands between them.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  allocate,
  auxLoss,
  dispatchBytes,
  maxVio,
  mixtureWeights,
  moeBalance,
  moeParameterBudget,
  signUpdate,
} from '../src/lib/moe-math.ts'

const LOGITS = [4.1, 3.2, 2.7, 2.1, 1.4, 0.2, -1.1, -2.4]

const close = (actual, expected, tolerance = 1e-5) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, got ${actual} (tolerance ${tolerance})`,
  )
}

test('softmax over all experts, then top-2, renormalised', () => {
  const mixture = mixtureWeights(LOGITS, 2, { gate: 'softmax', renormalize: true })
  assert.deepEqual([...mixture.indices], [0, 1])
  close(mixture.weights[0] ?? Number.NaN, 0.71095)
  close(mixture.weights[1] ?? Number.NaN, 0.28905)
})

test('softmax without renormalisation keeps the full-softmax mass', () => {
  const mixture = mixtureWeights(LOGITS, 2, { gate: 'softmax', preSoftmax: true })
  close(mixture.weights[0] ?? Number.NaN, 0.531076)
  close(mixture.weights[1] ?? Number.NaN, 0.215919)
})

test('a routed scaling factor multiplies the selected weights only', () => {
  const mixture = mixtureWeights(LOGITS, 2, {
    gate: 'softmax',
    renormalize: true,
    scale: Math.SQRT2,
  })
  close(mixture.weights[0] ?? Number.NaN, 1.005434)
  close(mixture.weights[1] ?? Number.NaN, 0.408779)
})

test('a saturated sigmoid gate nearly ties the top two experts', () => {
  const mixture = mixtureWeights(LOGITS, 2, { gate: 'sigmoid', renormalize: true })
  close(mixture.weights[0] ?? Number.NaN, 0.505879)
  close(mixture.weights[1] ?? Number.NaN, 0.494121)
})

test('sqrt(softplus) lands between softmax and sigmoid', () => {
  const mixture = mixtureWeights(LOGITS, 2, { gate: 'sqrtsoftplus', renormalize: true })
  close(mixture.weights[0] ?? Number.NaN, 0.529893)
  close(mixture.weights[1] ?? Number.NaN, 0.470107)
})

test('ties break by the lower expert id, deterministically', () => {
  const mixture = mixtureWeights([1, 1, 0], 2, { gate: 'sigmoid' })
  assert.deepEqual([...mixture.indices], [0, 1])
})

test('MaxVio counts zero-load experts in the mean', () => {
  close(maxVio([2, 2, 4, 0]) ?? Number.NaN, 1)
  close(maxVio([8, 8, 8, 8, 8, 8, 8, 8]) ?? Number.NaN, 0)
  assert.equal(maxVio([]), null)
  assert.equal(maxVio([0, 0]), null)
})

test('the aux loss reads 1 while the load is badly uneven, if probabilities are flat', () => {
  // 8 experts, 64 tokens, top-1. Half the tokens pile onto two experts.
  const counts = [32, 32, 0, 0, 0, 0, 0, 0]
  const probs = Array.from({ length: 8 }, () => 1 / 8)
  close(maxVio(counts) ?? Number.NaN, 3)
  close(auxLoss({ counts, probs, tokens: 64, topK: 1, coefficient: 1 }), 1)
})

test('the aux loss also reads 1 for an even load, so it cannot be the balance signal', () => {
  const counts = Array.from({ length: 8 }, () => 8)
  const probs = Array.from({ length: 8 }, () => 1 / 8)
  close(auxLoss({ counts, probs, tokens: 64, topK: 1, coefficient: 1 }), 1)
})

test('the sign update raises underloaded experts and lowers overloaded ones', () => {
  // 16 assignments over 4 experts: the mean is 4, so the expert with exactly 4
  // does not move. That is the integer comparison Megatron uses, not a float mean.
  const next = signUpdate({ counts: [7, 4, 3, 2], bias: [0, 0, 0, 0], rate: 0.01 })
  close(next[0] ?? Number.NaN, -0.01)
  close(next[1] ?? Number.NaN, 0)
  close(next[2] ?? Number.NaN, 0.01)
  close(next[3] ?? Number.NaN, 0.01)
})

test('a bias large enough flips a token away from its favourite expert', () => {
  // Two tokens, two experts: both prefer expert 0 without a bias.
  const affinity = [
    [2, 0],
    [2, 0],
  ]
  assert.deepEqual(allocate({ affinity, bias: [0, 0] }).counts, [2, 0])
  const flipped = allocate({ affinity, bias: [0, 3] })
  assert.deepEqual(flipped.counts, [0, 2])
  assert.deepEqual(flipped.assignments, [1, 1])
})

test("the Qwen counterfactual is the course's own arithmetic", () => {
  const budget = moeParameterBudget({
    hidden: 5120,
    denseFfn: 17408,
    layers: 64,
    experts: 64,
    topK: 8,
  })
  assert.equal(budget.expertWidth, 2176)
  assert.equal(budget.denseFfnPerLayer, 267_386_880)
  assert.equal(budget.activeFfnPerLayer, 267_386_880)
  assert.equal(budget.storedFfnPerLayer, 2_139_095_040)
  assert.equal(budget.scale, 8)
  assert.equal(budget.routerParamsPerLayer, 327_680)
  assert.equal(budget.storedFfnTotal, 136_902_082_560)
})

test('the counterfactual total matches the values model-facts publishes', () => {
  const budget = moeParameterBudget({
    hidden: 5120,
    denseFfn: 17408,
    layers: 64,
    experts: 64,
    topK: 8,
  })
  const denseTotal = budget.denseFfnPerLayer * 64
  const nonExpert = 27e9 - denseTotal
  const total = nonExpert + budget.storedFfnTotal + budget.routerParamsPerLayer * 64
  close(total, 146_810_293_760, 1)
  close(total / 27e9, 5.4374, 5e-5)
  close(total * 2e-9, 293.6206, 1e-3)
})

test('the serving reads separate storage from what a decoded token touches', () => {
  const budget = moeParameterBudget({ hidden: 5120, denseFfn: 17408, layers: 64, experts: 64, topK: 8 })
  const nonExpert = 27e9 - budget.denseFfnPerLayer * 64
  const rest = nonExpert + budget.routerParamsPerLayer * 64
  const active = budget.activeFfnPerLayer * 64
  close(active * 0.5e-9 + rest * 2e-9, 28.3728, 1e-4)
  close((active + rest) * 0.5e-9, 13.5105, 1e-4)
  close((budget.storedFfnTotal + rest) * 0.5e-9, 73.4051, 1e-4)
})

test('the expert width must divide the dense FFN exactly', () => {
  assert.throws(
    () => moeParameterBudget({ hidden: 8, denseFfn: 10, layers: 1, experts: 3, topK: 1 }),
    /divide/,
  )
})

test('all-to-all bytes follow k x hidden x bytes, per layer and per batch', () => {
  assert.equal(
    dispatchBytes({ tokens: 1, layers: 1, topK: 8, hidden: 5120, bytesPerElement: 2 }),
    81_920,
  )
  assert.equal(
    dispatchBytes({ tokens: 1, layers: 64, topK: 8, hidden: 5120, bytesPerElement: 2 }),
    5_242_880,
  )
  assert.equal(
    dispatchBytes({ tokens: 2048, layers: 64, topK: 8, hidden: 5120, bytesPerElement: 2 }),
    10_737_418_240,
  )
})

const BALANCE_DEFAULTS = { experts: 8, tokens: 64, skew: 0.5, rate: 0.02, steps: 40 }

test('the balancing loop is deterministic and conserves tokens', () => {
  const first = moeBalance(BALANCE_DEFAULTS)
  const second = moeBalance(BALANCE_DEFAULTS)
  assert.deepEqual(first, second)
  assert.equal(first.after.reduce((sum, value) => sum + value, 0), 64)
  for (const point of first.trace) {
    assert.equal(point.counts.reduce((sum, value) => sum + value, 0), 64)
  }
})

test('random preferences are uneven on their own, and a tilt makes it worse', () => {
  // No tilt, so no expert is favoured: the hash term alone still leaves the
  // batch at MaxVio 0.375. That is the honest starting point — a router is not
  // balanced just because nothing pushes it.
  const flat = moeBalance({ ...BALANCE_DEFAULTS, skew: 0 })
  close(flat.maxVioBefore, 0.375, 1e-9)
  const tilted = moeBalance(BALANCE_DEFAULTS)
  assert.ok(tilted.maxVioBefore > flat.maxVioBefore)
  for (const skew of [0, 0.2, 0.5]) {
    const run = moeBalance({ ...BALANCE_DEFAULTS, skew })
    assert.ok(run.maxVioAfter < run.maxVioBefore, `skew ${skew} did not improve`)
  }
})

test('the fixed step pulls MaxVio down by an order of magnitude, then overshoots', () => {
  const run = moeBalance(BALANCE_DEFAULTS)
  close(run.maxVioBefore, 4.125, 1e-9)
  // 4.125 -> 0.125 at step 39, then 0.5 at step 40: the step walked past the
  // target and came back, which is the honest behaviour the lesson teaches.
  assert.ok(run.best.maxVio < 0.2, `best ${run.best.maxVio}`)
  assert.ok(run.maxVioAfter > run.best.maxVio, 'the final step should show the overshoot')
})

test('a larger step converges faster and settles worse', () => {
  const slow = moeBalance({ ...BALANCE_DEFAULTS, rate: 0.02 })
  const fast = moeBalance({ ...BALANCE_DEFAULTS, rate: 0.05 })
  const atTen = (run) => run.trace.find((point) => point.step === 10)?.maxVio ?? Number.NaN
  assert.ok(atTen(fast) < atTen(slow), 'a bigger step should be ahead at step 10')
  assert.ok(fast.best.maxVio > slow.best.maxVio, 'and should settle above the smaller step')
})

test('the lab rejects a shape it cannot simulate', () => {
  assert.throws(() => moeBalance({ ...BALANCE_DEFAULTS, experts: 1 }), /2 to 64 experts/)
  assert.throws(() => moeBalance({ ...BALANCE_DEFAULTS, tokens: 4 }), /8 to 4,096 tokens/)
  assert.throws(() => moeBalance({ ...BALANCE_DEFAULTS, skew: 3 }), /skew/)
})
