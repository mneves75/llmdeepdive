/**
 * The lessons' numbers, checked against the module that computes them.
 *
 * `tests/moe-math.test.mjs` proves the arithmetic. This file proves the prose
 * uses it. The two failures this catches are the ones that actually happen:
 * someone edits a number in a lesson and not in the module, or someone changes
 * the module and leaves five lessons quoting the old results.
 *
 * Both locales are read, because `content:parity` compares frontmatter, quiz
 * shape and math spans — it does not compare a pt-BR prose number with its
 * English twin. A translated "293,7 GB" would ship green there, so the
 * locale-specific strings are asserted here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dispatchBytes, mixtureWeights, moeParameterBudget } from '../src/lib/moe-math.ts'

const LOCALES = ['en', 'pt-br']

const lesson = (locale, path) => readFileSync(`src/content/lessons/${locale}/${path}`, 'utf8')

const has = (text, needle, where) => {
  assert.ok(text.includes(needle), `${where} no longer quotes "${needle}"`)
}

/** Thousands separators and the decimal separator, per locale. */
const num = (value, decimals, locale) => {
  const text = value.toFixed(decimals)
  return locale === 'pt-br' ? text.replace('.', ',') : text
}

const group = (value, locale) => value.toLocaleString(locale === 'pt-br' ? 'pt-BR' : 'en-US')

const BUDGET = moeParameterBudget({ hidden: 5120, denseFfn: 17408, layers: 64, experts: 64, topK: 8 })
const DENSE_TOTAL = BUDGET.denseFfnPerLayer * 64
const NON_EXPERT = 27e9 - DENSE_TOTAL
const REST = NON_EXPERT + BUDGET.routerParamsPerLayer * 64
const ACTIVE_TOTAL = BUDGET.activeFfnPerLayer * 64
const TOTAL = NON_EXPERT + BUDGET.storedFfnTotal + BUDGET.routerParamsPerLayer * 64
const DISPATCH_PER_LAYER = dispatchBytes({ tokens: 1, layers: 1, topK: 8, hidden: 5120, bytesPerElement: 2 })
const DISPATCH_PER_TOKEN = dispatchBytes({ tokens: 1, layers: 64, topK: 8, hidden: 5120, bytesPerElement: 2 })
const DISPATCH_PER_BATCH = dispatchBytes({ tokens: 2048, layers: 64, topK: 8, hidden: 5120, bytesPerElement: 2 })

const LOGITS = [4.1, 3.2, 2.7, 2.1, 1.4, 0.2, -1.1, -2.4]

for (const locale of LOCALES) {
  test(`${locale}: 4.18 quotes the three gates at the precision the module computes`, () => {
    const text = lesson(locale, '4-transformer/4.18-mixture-of-experts.mdx')
    for (const [gate, renormalize] of [['softmax', true], ['sigmoid', true], ['sqrtsoftplus', true]]) {
      const mixture = mixtureWeights(LOGITS, 2, { gate, renormalize })
      for (const weight of mixture.weights) {
        has(text, num(weight, 3, locale), `4.18 (${gate})`)
      }
    }
  })

  test(`${locale}: 4.18 quotes the parameter counts the module computes`, () => {
    const text = lesson(locale, '4-transformer/4.18-mixture-of-experts.mdx')
    has(text, group(BUDGET.expertWidth, locale), '4.18 (expert width)')
    has(text, group(BUDGET.activeFfnPerLayer / 8, locale), '4.18 (one expert)')
    has(text, group(BUDGET.routerParamsPerLayer, locale), '4.18 (router per layer)')
    has(text, group(BUDGET.storedFfnPerLayer, locale), '4.18 (stored per layer)')
    has(text, group(BUDGET.activeFfnPerLayer, locale), '4.18 (active per layer)')
    has(text, num(TOTAL / 1e9, 1, locale), '4.18 (stored total, billions)')
    has(text, num(TOTAL / 27e9, 2, locale), '4.18 (stored over dense)')
    has(text, num(TOTAL * 2e-9, 1, locale), '4.18 (bf16 GB)')
    has(text, num(DENSE_TOTAL / 1e9, 2, locale), '4.18 (dense feed-forward total)')
  })

  test(`${locale}: 7.14 quotes the serving memory the module computes`, () => {
    const text = lesson(locale, '7-inference-and-efficiency/7.14-serving-an-moe.mdx')
    has(text, num(TOTAL * 2e-9, 1, locale), '7.14 (bf16 storage)')
    has(text, num((BUDGET.storedFfnTotal * 0.5 + REST * 2) * 1e-9, 1, locale), '7.14 (experts at 4 bits)')
    has(text, num(ACTIVE_TOTAL * 0.5e-9 + REST * 2e-9, 1, locale), '7.14 (reads, experts at 4 bits)')
    has(text, num((ACTIVE_TOTAL + REST) * 0.5e-9, 1, locale), '7.14 (reads, all 4 bits)')
    has(text, num((BUDGET.storedFfnTotal + REST) * 0.5e-9, 1, locale), '7.14 (storage, all 4 bits)')
    has(text, num(ACTIVE_TOTAL * 2e-9, 1, locale), '7.14 (bf16 expert reads)')
    has(text, num(REST * 2e-9, 1, locale), '7.14 (non-expert reads)')
    const int4Storage = (BUDGET.storedFfnTotal * 0.5 + REST * 2) * 1e-9
    has(text, num((TOTAL * 2e-9) / int4Storage, 1, locale), '7.14 (storage ratio)')
    const int4Reads = ACTIVE_TOTAL * 0.5e-9 + REST * 2e-9
    has(text, num((27e9 * 2e-9) / int4Reads, 1, locale), '7.14 (reads ratio)')
  })

  test(`${locale}: 5.16 quotes the bytes per layer, per token and per micro-batch`, () => {
    const text = lesson(locale, '5-pretraining-at-scale/5.16-expert-parallelism.mdx')
    has(text, `${(DISPATCH_PER_LAYER / 1024).toFixed(0)} KiB`, '5.16 (per layer)')
    has(text, `${(DISPATCH_PER_TOKEN / 1024 ** 2).toFixed(0)} MiB`, '5.16 (per token)')
    has(text, `${(DISPATCH_PER_BATCH / 1024 ** 3).toFixed(0)} GiB`, '5.16 (micro-batch)')
  })
}
