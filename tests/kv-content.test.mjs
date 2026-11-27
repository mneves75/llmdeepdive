/**
 * Lessons 7.2 and 7.6, held to the function behind lesson 7.6's lab.
 *
 * `kvCounterfactual` is lesson 7.2's KV-cache derivation with its design axes
 * exposed. Called with Qwen3.8-27B's config it must reproduce `model-facts.ts`;
 * called with attention in every layer it must reproduce the wrong turn 7.2
 * stages on purpose; and both lessons must print the numbers it returns, in
 * both locales, inside the `##` section that makes each claim (a match
 * elsewhere in the file cannot cover for a corrupted copy, the lesson
 * `moe-content.test.mjs` learned first). The table of peer models in 7.6's MLA
 * section is held to `KV_PEER_CONFIGS` cell by cell, so two swapped rows, an
 * English decimal point in pt-BR or a revision link to the wrong commit fail.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kvCounterfactual } from '../src/lib/lab-math.ts'
import { KV_PEER_CONFIGS, KV_TABLE_GALLERY, QWEN, QWEN_COMMON_MISTAKE, QWEN_CONFIG } from '../src/lib/model-facts.ts'

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
    mla: { en: 'MLA: caching a compressed summary', 'pt-br': 'MLA: guardar um resumo comprimido' },
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

const COURSE_ROW = {
  model: 'Qwen3.8-27B',
  attention: 'GQA + Gated DeltaNet',
  geometry: { kind: 'kv', kvHeads: QWEN.kvHeads.value, headDim: QWEN.headDim.value },
  layers: QWEN.layers.value,
  cachedLayers: QWEN.attentionLayers.value,
  kibPerToken: QWEN.kvKibPerToken.value,
  ...QWEN_CONFIG,
}
const configUrl = ({ repo, revision }) => `https://huggingface.co/${repo}/blob/${revision}/config.json`
const TABLE_WORDS = {
  en: { kv: 'K and V', latent: 'latent', rope: 'RoPE key', of: 'of' },
  'pt-br': { kv: 'K e V', latent: 'latente', rope: 'key de RoPE', of: 'de' },
}

/** The cells a row must print, in the locale's words and number format. */
function expectedCells(row, locale) {
  const words = TABLE_WORDS[locale]
  const number = new Intl.NumberFormat(locale === 'pt-br' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 3 })
  const g = row.geometry
  const stored = g.kind === 'kv'
    ? `${words.kv}, ${g.kvHeads} heads × ${g.headDim}`
    : `${words.latent} ${g.latentDim} + ${words.rope} ${g.ropeDim}`
  const revision = `[\`${row.revision.slice(0, 7)}\`](${configUrl(row)})`
  return [row.model, row.attention, stored, `${row.cachedLayers} ${words.of} ${row.layers}`, `${number.format(row.kibPerToken)} KiB`, revision]
}

/** Body rows of the section's one GFM table, in order, keyed by the model cell. */
function tableRows(text) {
  const lines = text.split('\n').filter((line) => line.startsWith('|'))
  return new Map(lines.slice(2).map((line) => {
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim())
    return [cells[0], cells]
  }))
}

test('every peer row is the arithmetic of its own config fields', () => {
  for (const row of KV_PEER_CONFIGS) {
    const g = row.geometry
    const kib = g.kind === 'kv'
      ? kvCounterfactual({ ...SHIPPED, kvHeads: g.kvHeads, headDim: g.headDim, cachedLayers: row.cachedLayers, totalLayers: row.layers, bytes: 2 }).kibPerToken
      : ((g.latentDim + g.ropeDim) * 2 * row.cachedLayers) / 1024
    assert.equal(kib, row.kibPerToken, row.model)
  }
  assert.equal(COURSE_ROW.kibPerToken, shipped.kibPerToken)
})

test('lesson 7.6 tabulates every peer config and the course model, cell by cell, in both locales', () => {
  const rows = [...KV_PEER_CONFIGS.slice(0, 4), COURSE_ROW, ...KV_PEER_CONFIGS.slice(4)]
  for (const locale of LOCALES) {
    const table = tableRows(section(locale, '7.6-mqa-gqa-and-mla', 'mla'))
    assert.deepEqual([...table.keys()], rows.map((row) => row.model), `${locale}: table rows`)
    for (const row of rows) assert.deepEqual(table.get(row.model), expectedCells(row, locale), `${locale}: ${row.model}`)
  }
})

test('lesson 7.6 cites every row config at the revision the table was read from, and the gallery it was checked against', () => {
  const gallery = KV_TABLE_GALLERY
  const urls = [
    ...[...KV_PEER_CONFIGS, COURSE_ROW].map(configUrl),
    `https://github.com/${gallery.repo}/blob/${gallery.revision}/${gallery.file}`,
  ]
  for (const locale of LOCALES) {
    const file = new URL(`../src/content/lessons/${locale}/7-inference-and-efficiency/7.6-mqa-gqa-and-mla.mdx`, import.meta.url)
    const frontmatter = readFileSync(file, 'utf8').split(/^---$/mu)[1]
    for (const url of urls) assert.ok(frontmatter.includes(`url: "${url}"`), `${locale}: cite ${url}`)
    assert.ok(frontmatter.includes(`revision ${gallery.revision.slice(0, 7)} (${gallery.licence})`), `${locale}: gallery licence and pin`)
  }
})
