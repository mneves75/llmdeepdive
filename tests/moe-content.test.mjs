/**
 * The lessons' numbers, checked against the module that computes them.
 *
 * `tests/moe-math.test.mjs` proves the arithmetic. This file proves the prose
 * uses it, and it is deliberately strict in three ways, each added after an
 * independent verifier defeated a weaker version:
 *
 *   1. **Per section, not per document.** A whole-file `includes` passes while a
 *      second copy of the number, elsewhere, is the one that matches. Each
 *      assertion names the `##` section that makes the claim, so a corrupted
 *      copy in another section cannot cover for it.
 *   2. **Numeric boundaries.** `8.6` must not be satisfied by `18.6` or `8.65`.
 *      The matcher requires a non-digit, non-separator on both sides.
 *   3. **All five lessons.** 5.14 and 5.15 were outside the first version, which
 *      is exactly where the lab's default run and the upcycled slice width live.
 *
 * Both locales are read: `content:parity` compares frontmatter, quiz shape and
 * math spans, not a pt-BR prose number against its English twin.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dispatchBytes, mixtureWeights, moeBalance, moeParameterBudget } from '../src/lib/moe-math.ts'

const LOCALES = ['en', 'pt-br']
const BUDGET = moeParameterBudget({ hidden: 5120, denseFfn: 17408, layers: 64, experts: 64, topK: 8 })
const DENSE_TOTAL = BUDGET.denseFfnPerLayer * 64
const REST = 27e9 - DENSE_TOTAL + BUDGET.routerParamsPerLayer * 64
const ACTIVE_TOTAL = BUDGET.activeFfnPerLayer * 64
const TOTAL = 27e9 - DENSE_TOTAL + BUDGET.storedFfnTotal + BUDGET.routerParamsPerLayer * 64
const INT4_EXPERT_READS = ACTIVE_TOTAL * 0.5e-9
const INT4_REST_READS = REST * 2e-9
const BF16_READS = 27e9 * 2e-9
const INT4_STORAGE = (BUDGET.storedFfnTotal * 0.5 + REST * 2) * 1e-9
const LAB = moeBalance({ experts: 8, tokens: 64, skew: 0.5, rate: 0.02, steps: 40 })
const DISPATCH_PER_LAYER = dispatchBytes({ tokens: 1, layers: 1, topK: 8, hidden: 5120, bytesPerElement: 2 })
const DISPATCH_PER_TOKEN = dispatchBytes({ tokens: 1, layers: 64, topK: 8, hidden: 5120, bytesPerElement: 2 })
const DISPATCH_PER_BATCH = dispatchBytes({ tokens: 2048, layers: 64, topK: 8, hidden: 5120, bytesPerElement: 2 })
const ROUTER_RATIO = Math.round(BUDGET.storedFfnPerLayer / BUDGET.routerParamsPerLayer / 100) * 100

const num = (value, decimals, locale) => {
  const text = value.toFixed(decimals)
  return locale === 'pt-br' ? text.replace('.', ',') : text
}
const group = (value, locale) => value.toLocaleString(locale === 'pt-br' ? 'pt-BR' : 'en-US')

const escape = (needle) => needle.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const boundary = (needle) => new RegExp(`(?<![\\d.,])${escape(needle)}(?!\\d)`, 'u')

/** The YAML frontmatter, so the teach-back answer is checked like any section. */
const teachBack = (text) => {
  const start = text.indexOf('teachBack:')
  if (start === -1) return ''
  const end = text.indexOf('\nquiz:', start)
  return text.slice(start, end === -1 ? text.indexOf('\n---', start) : end)
}

/** Split a lesson body into `##` sections by heading text. */
const sections = (text) => {
  const map = new Map()
  const matches = [...text.matchAll(/^## (.+)$/gmu)]
  matches.forEach((match, index) => {
    const start = match.index + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length
    map.set(match[1].trim(), text.slice(start, end))
  })
  return map
}

const lesson = (locale, path) => readFileSync(`src/content/lessons/${locale}/${path}`, 'utf8')

/** heading → values that section must quote, per locale. */
const CLAIMS = {
  '4-transformer/4.18-mixture-of-experts.mdx': {
    '__teachback__': (locale) => [
      group(BUDGET.expertWidth, locale),
      group(BUDGET.activeFfnPerLayer / 8, locale),
      group(BUDGET.storedFfnPerLayer, locale),
      group(BUDGET.activeFfnPerLayer, locale),
    ],
    'The FFN every token pays for': (locale) => [num(267386880 / 1e6, 0, locale)],
    'Store eight times more, pay the same': (locale) => [
      group(BUDGET.expertWidth, locale),
      group(BUDGET.activeFfnPerLayer / 8, locale),
      group(BUDGET.storedFfnPerLayer, locale),
      group(BUDGET.activeFfnPerLayer, locale),
      num(DENSE_TOTAL / 1e9, 2, locale),
      num(TOTAL / 1e9, 1, locale),
      num(TOTAL / 27e9, 2, locale),
      num(TOTAL * 2e-9, 1, locale),
      num(27e9 * 2e-9, 0, locale),
    ],
    'The router: two decisions from one matrix': (locale) => [
      group(BUDGET.routerParamsPerLayer, locale),
      group(ROUTER_RATIO, locale),
      ...['softmax', 'sigmoid', 'sqrtsoftplus'].flatMap((gate) =>
        mixtureWeights([4.1, 3.2, 2.7, 2.1, 1.4, 0.2, -1.1, -2.4], 2, { gate, renormalize: true }).weights.map((weight) =>
          num(weight, 3, locale),
        ),
      ),
    ],
  },
  '5-pretraining-at-scale/5.14-keeping-experts-busy.mdx': {
    'The loss-free bias': (locale) => [
      num(LAB.maxVioBefore, 2, locale),
      num(LAB.best.maxVio, 2, locale),
      num(LAB.maxVioAfter, 2, locale),
    ],
  },
  '5-pretraining-at-scale/5.15-upcycling-and-moe-stability.mdx': {
    'Where the weights start': (locale) => [group(17408, locale), group(BUDGET.expertWidth, locale)],
  },
  '5-pretraining-at-scale/5.16-expert-parallelism.mdx': {
    '__teachback__': (locale) => [
      group(DISPATCH_PER_LAYER / 8, locale),
      group(DISPATCH_PER_LAYER, locale),
      group(DISPATCH_PER_TOKEN, locale),
    ],
    'The bytes, counted': (locale) => [
      group(DISPATCH_PER_LAYER, locale),
      group(DISPATCH_PER_LAYER / 8, locale),
      `${(DISPATCH_PER_TOKEN / 1024 ** 2).toFixed(0)} MiB`,
      `${(DISPATCH_PER_BATCH / 1024 ** 3).toFixed(0)} GiB`,
    ],
  },
  '7-inference-and-efficiency/7.14-serving-an-moe.mdx': {
    '__teachback__': (locale) => [
      num(TOTAL * 2e-9, 1, locale),
      num((BUDGET.storedFfnTotal * 0.5 + REST * 2) * 1e-9, 1, locale),
      num(ACTIVE_TOTAL * 2e-9, 1, locale),
      num(ACTIVE_TOTAL * 0.5e-9, 1, locale),
      num(INT4_EXPERT_READS + INT4_REST_READS, 1, locale),
    ],
    'Low-bit experts': (locale) => [
      num(TOTAL * 2e-9, 1, locale),
      num((BUDGET.storedFfnTotal * 0.5 + REST * 2) * 1e-9, 1, locale),
      num(BF16_READS, 0, locale),
      num(ACTIVE_TOTAL * 2e-9, 1, locale),
      num(INT4_EXPERT_READS, 1, locale),
      num(INT4_REST_READS, 1, locale),
      num(INT4_EXPERT_READS + INT4_REST_READS, 1, locale),
      num((ACTIVE_TOTAL + REST) * 0.5e-9, 1, locale),
      num(INT4_STORAGE, 1, locale),
      num(TOTAL * 2e-9 / INT4_STORAGE, 1, locale),
      num(BF16_READS / (INT4_EXPERT_READS + INT4_REST_READS), 1, locale),
    ],
  },
}

/** The same sections, named in pt-BR. A missing translation fails here. */
const HEADINGS = {
  'The FFN every token pays for': 'A FFN que todo token paga',
  'Store eight times more, pay the same': 'Guardar oito vezes mais, pagando o mesmo',
  'The router: two decisions from one matrix': 'O router: duas decisões de uma matriz',
  'The loss-free bias': 'O viés sem loss',
  'Where the weights start': 'De onde vêm os pesos',
  'The bytes, counted': 'Os bytes, contados',
  'Low-bit experts': 'Experts em poucos bits',
}

for (const locale of LOCALES) {
  for (const [path, claims] of Object.entries(CLAIMS)) {
    test(`${locale}: ${path.split('/').pop()} quotes the computed numbers, per section`, () => {
      const source = lesson(locale, path)
      const found = sections(source)
      found.set('__teachback__', teachBack(source))
      for (const [heading, values] of Object.entries(claims)) {
        const name = heading === '__teachback__' || locale !== 'pt-br' ? heading : HEADINGS[heading]
        assert.ok(name, `no pt-BR heading mapped for "${heading}"`)
        const body = (found.get(name) ?? '').replaceAll('{,}', ',')
        assert.ok(body, `${path}: no "## ${name}" section`)
        for (const value of values(locale)) {
          // Math spans keep the English comma grouping in both locales, so a
          // pt-BR "33.423.360" in prose and its "33,423,360" in $…$ are the
          // same number. Accept either form, never a different value.
          const forms = [...new Set([value, value.replaceAll('.', ','), value.replaceAll(',', '.')])]
          const ok = forms.some((form) => boundary(form).test(body))
          assert.ok(ok, `${path} §${name} no longer quotes "${value}"`)
        }
      }
    })
  }
}
