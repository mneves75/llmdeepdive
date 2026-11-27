/**
 * Lessons 7.2 and 7.6, held to the function behind lesson 7.6's lab.
 *
 * `kvCounterfactual` is lesson 7.2's KV-cache derivation with its design axes
 * exposed. Called with Qwen3.8-27B's config it must reproduce `model-facts.ts`;
 * called with attention in every layer it must reproduce the wrong turn 7.2
 * stages on purpose; and both lessons must print the numbers it returns, in
 * both locales, inside the `##` section that makes each claim (a match
 * elsewhere in the file cannot cover for a corrupted copy, the lesson
 * `moe-content.test.mjs` learned first).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kvCounterfactual } from '../src/lib/lab-math.ts'
import { QWEN, QWEN_COMMON_MISTAKE } from '../src/lib/model-facts.ts'

const LOCALES = ['en', 'pt-br']
const SHIPPED = {
  kvHeads: QWEN.kvHeads.value,
  headDim: QWEN.headDim.value,
  cachedLayers: QWEN.attentionLayers.value,
  totalLayers: QWEN.layers.value,
  bytes: QWEN.bytesPerElement.value,
  context: QWEN.contextNative.value,
  stateMibPerRecurrentLayer: QWEN.deltaNetStateMib.value / QWEN.deltaNetLayers.value,
}
const shipped = kvCounterfactual(SHIPPED)
const everyLayer = kvCounterfactual({ ...SHIPPED, cachedLayers: SHIPPED.totalLayers })
const mha = kvCounterfactual({ ...SHIPPED, kvHeads: QWEN.queryHeads.value })
const mqa = kvCounterfactual({ ...SHIPPED, kvHeads: 1 })

const SECTIONS = {
  '7.2-the-kv-cache': {
    sizing: { en: 'Sizing the cache for Qwen3.8-27B', 'pt-br': 'Dimensionando o cache do Qwen3.8-27B' },
    deltaNet: { en: 'The DeltaNet layers: a state that never grows', 'pt-br': 'As camadas de DeltaNet: um estado que nunca cresce' },
  },
  '7.6-mqa-gqa-and-mla': {
    cost: { en: 'What a KV head costs', 'pt-br': 'Quanto custa um KV head' },
    mqa: { en: 'MQA: one shared key/value head', 'pt-br': 'MQA: um único key/value head compartilhado' },
  },
}

function section(locale, lesson, key) {
  const file = new URL(`../src/content/lessons/${locale}/7-inference-and-efficiency/${lesson}.mdx`, import.meta.url)
  const body = readFileSync(file, 'utf8').split(/^---$/mu).slice(2).join('---')
  const heading = SECTIONS[lesson][key][locale]
  const start = body.indexOf(`\n## ${heading}\n`)
  assert.ok(start >= 0, `${locale} ${lesson}: no "## ${heading}" section`)
  const next = body.indexOf('\n## ', start + 1)
  return body.slice(start, next < 0 ? undefined : next)
}

/** A number and its unit, as prose ("64 KiB") or maths ("64\ \text{KiB}"), never inside a longer number. */
function assertPrints(text, value, unit, locale, where) {
  const shown = new Intl.NumberFormat(locale === 'pt-br' ? 'pt-BR' : 'en-US').format(value).replace(/[.,]/gu, '[.,{}]*')
  const pattern = new RegExp(`(?<![\\d.,])${shown}(?:\\\\ \\\\text\\{| )${unit}`, 'u')
  assert.match(text, pattern, `${where} (${locale}) should print ${value} ${unit}`)
}

test('the shipped call reproduces lesson 7.2 as model-facts records it', () => {
  assert.equal(shipped.kibPerLayer * 1024, QWEN.kvBytesPerTokenPerLayer.value)
  assert.equal(shipped.kibPerToken, QWEN.kvKibPerToken.value)
  assert.equal(shipped.gibPerSequence, QWEN.kvGibFullContext.value)
  assert.equal(shipped.stateMib, QWEN.deltaNetStateMib.value)
})

test('attention in every layer reproduces the wrong turn 7.2 stages on purpose', () => {
  assert.equal(everyLayer.kibPerToken, QWEN_COMMON_MISTAKE.kvKibPerTokenIfEveryLayerCached.value)
  assert.equal(everyLayer.gibPerSequence, QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value)
  assert.equal(everyLayer.stateMib, 0)
})

test('lesson 7.2 prints the shipped numbers and the wrong turn in both locales', () => {
  for (const locale of LOCALES) {
    const sizing = section(locale, '7.2-the-kv-cache', 'sizing')
    assertPrints(sizing, shipped.kibPerLayer, 'KiB', locale, '7.2 sizing')
    assertPrints(sizing, shipped.kibPerToken, 'KiB', locale, '7.2 sizing')
    assertPrints(sizing, shipped.gibPerSequence, 'GiB', locale, '7.2 sizing')
    assertPrints(sizing, everyLayer.kibPerToken, 'KiB', locale, '7.2 sizing')
    assertPrints(sizing, everyLayer.gibPerSequence, 'GiB', locale, '7.2 sizing')
    const deltaNet = section(locale, '7.2-the-kv-cache', 'deltaNet')
    assertPrints(deltaNet, SHIPPED.stateMibPerRecurrentLayer, 'MiB', locale, '7.2 DeltaNet')
    assertPrints(deltaNet, shipped.stateMib, 'MiB', locale, '7.2 DeltaNet')
  }
})

test('lesson 7.6 prints same-geometry MHA, the shipped GQA and MQA from the same function', () => {
  assert.deepEqual([mha.gibPerSequence, shipped.gibPerSequence, mqa.gibPerSequence], [96, 16, 4])
  for (const locale of LOCALES) {
    const cost = section(locale, '7.6-mqa-gqa-and-mla', 'cost')
    assertPrints(cost, mha.kibPerLayer, 'KiB', locale, '7.6 cost')
    assertPrints(cost, shipped.kibPerLayer, 'KiB', locale, '7.6 cost')
    assertPrints(cost, mha.kibPerToken, 'KiB', locale, '7.6 cost')
    assertPrints(cost, shipped.kibPerToken, 'KiB', locale, '7.6 cost')
    assertPrints(cost, mha.gibPerSequence, 'GiB', locale, '7.6 cost')
    assertPrints(cost, shipped.gibPerSequence, 'GiB', locale, '7.6 cost')
    const mqaSection = section(locale, '7.6-mqa-gqa-and-mla', 'mqa')
    assertPrints(mqaSection, mqa.kibPerLayer, 'KiB', locale, '7.6 MQA')
    assertPrints(mqaSection, mqa.kibPerToken, 'KiB', locale, '7.6 MQA')
    assertPrints(mqaSection, mqa.gibPerSequence, 'GiB', locale, '7.6 MQA')
  }
})
