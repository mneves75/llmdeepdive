/**
 * The lessons' numbers, checked against the module that computes them.
 *
 * `tests/moe-math.test.mjs` proves the arithmetic. This file proves the prose
 * uses it. The two failures this catches are the ones that actually happen:
 * someone edits a number in a lesson and not in the module, or someone changes
 * the module and leaves four lessons quoting the old results.
 *
 * It reads English only. `content:parity` already fails a pt-BR lesson whose
 * numbers differ from its English twin, so checking one locale covers both.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mixtureWeights, moeParameterBudget } from '../src/lib/moe-math.ts'

const lesson = (path) => readFileSync(`src/content/lessons/en/${path}`, 'utf8')

const has = (text, needle, where) => {
  assert.ok(text.includes(needle), `${where} no longer quotes "${needle}"`)
}

const BUDGET = moeParameterBudget({ hidden: 5120, denseFfn: 17408, layers: 64, experts: 64, topK: 8 })
const DENSE_TOTAL = BUDGET.denseFfnPerLayer * 64
const NON_EXPERT = 27e9 - DENSE_TOTAL
const REST = NON_EXPERT + BUDGET.routerParamsPerLayer * 64
const ACTIVE_TOTAL = BUDGET.activeFfnPerLayer * 64
const TOTAL = NON_EXPERT + BUDGET.storedFfnTotal + BUDGET.routerParamsPerLayer * 64

const LOGITS = [4.1, 3.2, 2.7, 2.1, 1.4, 0.2, -1.1, -2.4]

test('4.18 quotes the three gates at the precision the module computes', () => {
  const text = lesson('4-transformer/4.18-mixture-of-experts.mdx')
  const cases = [
    ['softmax', true],
    ['sigmoid', true],
    ['sqrtsoftplus', true],
  ]
  for (const [gate, renormalize] of cases) {
    const mixture = mixtureWeights(LOGITS, 2, { gate, renormalize })
    for (const weight of mixture.weights) {
      has(text, weight.toFixed(3), `4.18 (${gate})`)
    }
  }
})

test('4.18 quotes the parameter counts the module computes', () => {
  const text = lesson('4-transformer/4.18-mixture-of-experts.mdx')
  has(text, BUDGET.storedFfnPerLayer.toLocaleString('en-US'), '4.18')
  has(text, BUDGET.activeFfnPerLayer.toLocaleString('en-US'), '4.18')
  has(text, (TOTAL / 1e9).toFixed(1), '4.18 (stored total, billions)')
  has(text, (TOTAL / 27e9).toFixed(2), '4.18 (stored over dense)')
  has(text, (TOTAL * 2e-9).toFixed(1), '4.18 (bf16 GB)')
})

test('7.14 quotes the serving memory the module computes', () => {
  const text = lesson('7-inference-and-efficiency/7.14-serving-an-moe.mdx')
  has(text, (TOTAL * 2e-9).toFixed(1), '7.14 (bf16 storage)')
  has(text, ((BUDGET.storedFfnTotal * 0.5 + REST * 2) * 1e-9).toFixed(1), '7.14 (experts at 4 bits)')
  has(text, (ACTIVE_TOTAL * 0.5e-9 + REST * 2e-9).toFixed(1), '7.14 (reads, experts at 4 bits)')
  has(text, ((ACTIVE_TOTAL + REST) * 0.5e-9).toFixed(1), '7.14 (reads, all 4 bits)')
  has(text, ((BUDGET.storedFfnTotal + REST) * 0.5e-9).toFixed(1), '7.14 (storage, all 4 bits)')
})

test('5.16 quotes the bytes per token per layer, per token and per micro-batch', () => {
  const text = lesson('5-pretraining-at-scale/5.16-expert-parallelism.mdx')
  const perLayer = 8 * 5120 * 2
  has(text, `${(perLayer / 1024).toFixed(0)} KiB`, '5.16 (per layer)')
  has(text, '5 MiB', '5.16 (per token)')
  has(text, `${(perLayer * 64 * 2048 / 1024 ** 3).toFixed(0)} GiB`, '5.16 (micro-batch)')
})
