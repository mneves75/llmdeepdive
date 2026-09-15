import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { formatInputValue, parseDecimal } from '../src/lib/lab-number.ts'

function componentScript(relativePath) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
  const match = source.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/u)
  assert.ok(match, `expected a client script in ${relativePath}`)
  // The lab scripts import the shared parser; the harness injects it instead.
  const body = match[1].replace(/^\s*import .*$/gmu, '')
  return ts.transpileModule(body, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText
}

function execute(script, globals) {
  const names = Object.keys(globals)
  const values = Object.values(globals)
  Function(...names, `"use strict";\n${script}`)(...values)
}

class FakeInput {
  constructor(value, dataset = {}) {
    this.value = value
    this.dataset = dataset
    this.attributes = new Map()
  }

  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) { this.attributes.delete(name) }
}

class FakeSelect extends FakeInput {}

const KV_MESSAGES = { invalid: 'kv invalid' }
const COST_MESSAGES = { invalid: 'cost invalid', overflow: 'cost overflow' }

function createForm({ controls, outputs, isPt = false, dataset = {} }) {
  const listeners = new Map()
  return {
    dataset,
    elements: { namedItem: (name) => controls[name] ?? null },
    querySelector: (selector) => outputs[selector.match(/data-out="([^"]+)"/u)?.[1]] ?? null,
    closest: () => isPt ? {} : null,
    addEventListener: (type, listener) => listeners.set(type, listener),
    listeners,
  }
}

function runCalculator(path, form) {
  execute(componentScript(path), {
    HTMLInputElement: FakeInput,
    HTMLSelectElement: FakeSelect,
    document: { querySelectorAll: () => [form] },
    parseDecimal,
  })
}

const outputsFor = (names, messages) => ({
  ...Object.fromEntries(names.map((name) => [name, { textContent: `server ${name}` }])),
  validation: { textContent: '', dataset: messages },
})

const KV_OUTPUTS = ['weights', 'pool', 'perseq', 'seats', 'verdict']
const COST_OUTPUTS = ['managed', 'rented', 'gpus', 'util', 'verdict']
const KV_FACTS = { params: '27000000000', kibPerToken: '64', stateMib: '144' }

const kvControls = (usable, reserve = '6', context = '32768') => ({
  usable: new FakeInput(usable, { min: '1', max: '1024' }),
  bytes: new FakeSelect('2'),
  context: new FakeSelect(context),
  reserve: new FakeInput(reserve, { min: '0', max: '64' }),
})

const costControls = () => ({
  inM: new FakeInput('200', { min: '0' }),
  outM: new FakeInput('40', { min: '0' }),
  priceIn: new FakeInput('0.45', { min: '0' }),
  priceOut: new FakeInput('3.2', { min: '0' }),
  gpuHour: new FakeInput('2.5', { min: '0' }),
  tps: new FakeInput('800', { min: '1' }),
})

test('lab decimals accept both separators and read thousands grouping by locale', () => {
  assert.equal(parseDecimal('1,5', 'pt-br'), 1.5)
  assert.equal(parseDecimal('1.5', 'pt-br'), 1.5)
  assert.equal(parseDecimal('79,6', 'en'), 79.6)
  assert.equal(parseDecimal('1.024', 'pt-br'), 1024)
  assert.equal(parseDecimal('1,024', 'en'), 1024)
  assert.equal(parseDecimal('1.024,5', 'pt-br'), 1024.5)
  assert.equal(parseDecimal(' 0,45 ', 'pt-br'), 0.45)
  assert.equal(parseDecimal('0.125', 'pt-br'), 0.125)
  assert.equal(parseDecimal('0,125', 'en'), 0.125)
  assert.equal(parseDecimal('0.125,5', 'pt-br'), null)
  for (const rejected of ['', '-1', '1e3', '1.2.3', ',', '12,34,56', '1,5.3', 'abc']) {
    assert.equal(parseDecimal(rejected, 'en'), null, `accepted ${JSON.stringify(rejected)}`)
  }
  assert.equal(formatInputValue(79.6, 'pt-br'), '79,6')
  assert.equal(formatInputValue(1024, 'pt-br'), '1024')
  assert.equal(formatInputValue(0.45, 'en'), '0.45')
})

test('KV calculator clears stale results for blank, malformed and out-of-range values', () => {
  for (const invalidUsable of ['', '-1', '1025', '12,34,56']) {
    const outputs = outputsFor(KV_OUTPUTS, KV_MESSAGES)
    const form = createForm({ controls: kvControls(invalidUsable), outputs, dataset: KV_FACTS })

    runCalculator('src/components/labs/KvBudgetLab.astro', form)

    assert.equal(outputs.validation.textContent, 'kv invalid', `expected validation for usable=${JSON.stringify(invalidUsable)}`)
    assert.equal(outputs.weights.textContent, '—')
    assert.equal(outputs.seats.textContent, '—')
    assert.equal(outputs.verdict.textContent, '')
    assert.equal(form.elements.namedItem('usable').attributes.get('aria-invalid'), 'true')
  }
})

test('KV calculator recovers once the input is valid again', () => {
  const outputs = outputsFor(KV_OUTPUTS, KV_MESSAGES)
  const controls = kvControls('')
  const form = createForm({ controls, outputs, dataset: KV_FACTS })
  runCalculator('src/components/labs/KvBudgetLab.astro', form)
  assert.equal(outputs.validation.textContent, 'kv invalid')

  controls.usable.value = '79.6'
  form.listeners.get('input')()
  assert.equal(outputs.validation.textContent, '')
  assert.match(outputs.weights.textContent, /^50\.3 GiB$/u)
  assert.equal(controls.usable.attributes.has('aria-invalid'), false)
})

test('KV calculator distinguishes a positive pool too small for one sequence', () => {
  const outputs = outputsFor(KV_OUTPUTS, KV_MESSAGES)
  const form = createForm({ controls: kvControls('51', '0', '262144'), outputs, dataset: KV_FACTS })

  runCalculator('src/components/labs/KvBudgetLab.astro', form)

  assert.equal(outputs.seats.textContent, '0')
  assert.ok(Number.parseFloat(outputs.pool.textContent) > 0)
  assert.match(outputs.verdict.textContent, /smaller than one sequence/iu)
})

test('calculators read and write the page locale, including decimal commas', () => {
  const kvOutputs = outputsFor(KV_OUTPUTS, KV_MESSAGES)
  const kvForm = createForm({ controls: kvControls('79,6'), outputs: kvOutputs, isPt: true, dataset: KV_FACTS })
  runCalculator('src/components/labs/KvBudgetLab.astro', kvForm)
  assert.equal(kvOutputs.validation.textContent, '')
  assert.match(kvOutputs.weights.textContent, /^50,3 GiB$/u)
  assert.match(kvOutputs.perseq.textContent, /^2\.192 MiB$/u)

  const costOutputs = outputsFor(COST_OUTPUTS, COST_MESSAGES)
  const controls = costControls()
  controls.priceIn.value = '0,45'
  controls.priceOut.value = '3,2'
  const costForm = createForm({ controls, outputs: costOutputs, isPt: true })
  runCalculator('src/components/labs/CostPerTokenLab.astro', costForm)
  assert.equal(costOutputs.validation.textContent, '')
  assert.match(costOutputs.util.textContent, /^1,9%$/u)
  assert.match(costOutputs.managed.textContent, /^USD 218$/u)
})

test('cost calculator clears stale results for blank and below-minimum values', () => {
  for (const [name, value] of [['inM', ''], ['priceOut', '-0.01'], ['tps', '0']]) {
    const outputs = outputsFor(COST_OUTPUTS, COST_MESSAGES)
    const controls = costControls()
    controls[name].value = value
    const form = createForm({ controls, outputs })

    runCalculator('src/components/labs/CostPerTokenLab.astro', form)

    assert.equal(outputs.validation.textContent, 'cost invalid', `expected validation for ${name}=${JSON.stringify(value)}`)
    assert.equal(outputs.managed.textContent, '—')
    assert.equal(outputs.verdict.textContent, '')
    assert.equal(controls[name].attributes.get('aria-invalid'), 'true')
  }
})

test('cost calculator reports overflow instead of blaming valid inputs', () => {
  const outputs = outputsFor(COST_OUTPUTS, COST_MESSAGES)
  const controls = costControls()
  // Each input is finite on its own; only their product overflows.
  controls.inM.value = '1' + '0'.repeat(308)
  controls.priceIn.value = '10'
  const form = createForm({ controls, outputs })

  runCalculator('src/components/labs/CostPerTokenLab.astro', form)

  assert.equal(outputs.validation.textContent, 'cost overflow')
  assert.equal(outputs.managed.textContent, '—')
})
