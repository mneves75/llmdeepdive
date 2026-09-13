import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function componentScript(relativePath) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
  const match = source.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/u)
  assert.ok(match, `expected a client script in ${relativePath}`)
  return ts.transpileModule(match[1], {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText
}

function execute(script, globals) {
  const names = Object.keys(globals)
  const values = Object.values(globals)
  Function(...names, `"use strict";\n${script}`)(...values)
}

class FakeInput {
  constructor(value, { min = '', max = '', required = true } = {}) {
    this.value = value
    this.min = min
    this.max = max
    this.required = required
    this.attributes = new Map()
  }

  get valueAsNumber() { return this.value === '' ? Number.NaN : Number(this.value) }

  checkValidity() {
    const value = this.valueAsNumber
    return !(this.required && this.value === '') && Number.isFinite(value)
      && (this.min === '' || value >= Number(this.min))
      && (this.max === '' || value <= Number(this.max))
  }

  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) { this.attributes.delete(name) }
}

class FakeSelect extends FakeInput {}

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
  })
}

test('KV calculator rejects blank and out-of-range values instead of recomputing', () => {
  for (const invalidUsable of ['', '-1', '1025']) {
    const outputs = {
      weights: { textContent: 'server weights' },
      pool: { textContent: 'server pool' },
      perseq: { textContent: 'server per-sequence' },
      seats: { textContent: 'server seats' },
      verdict: { textContent: 'server verdict' },
      validation: { hidden: true },
    }
    const form = createForm({
      controls: {
        usable: new FakeInput(invalidUsable, { min: '1', max: '1024' }),
        bytes: new FakeSelect('2'),
        context: new FakeSelect('32768'),
        reserve: new FakeInput('6', { min: '0', max: '64' }),
      },
      outputs,
      dataset: { params: '27000000000', kibPerToken: '64', stateMib: '144' },
    })

    runCalculator('src/components/labs/KvBudgetLab.astro', form)

    assert.equal(outputs.validation.hidden, false, `expected validation for usable=${JSON.stringify(invalidUsable)}`)
    assert.equal(outputs.weights.textContent, 'server weights')
    assert.equal(form.elements.namedItem('usable').attributes.get('aria-invalid'), 'true')
  }
})

test('KV calculator distinguishes a positive pool too small for one sequence', () => {
  const outputs = Object.fromEntries(['weights', 'pool', 'perseq', 'seats', 'verdict'].map((name) => [name, { textContent: '' }]))
  outputs.validation = { hidden: true }
  const form = createForm({
    controls: {
      usable: new FakeInput('51', { min: '1', max: '1024' }),
      bytes: new FakeSelect('2'),
      context: new FakeSelect('262144'),
      reserve: new FakeInput('0', { min: '0', max: '64' }),
    },
    outputs,
    dataset: { params: '27000000000', kibPerToken: '64', stateMib: '144' },
  })

  runCalculator('src/components/labs/KvBudgetLab.astro', form)

  assert.equal(outputs.seats.textContent, '0')
  assert.ok(Number.parseFloat(outputs.pool.textContent) > 0)
  assert.match(outputs.verdict.textContent, /smaller than one sequence/iu)
})

test('calculator output uses the page locale', () => {
  const kvOutputs = Object.fromEntries(['weights', 'pool', 'perseq', 'seats', 'verdict'].map((name) => [name, { textContent: '' }]))
  kvOutputs.validation = { hidden: true }
  const kvForm = createForm({
    controls: {
      usable: new FakeInput('79.6', { min: '1', max: '1024' }),
      bytes: new FakeSelect('2'),
      context: new FakeSelect('32768'),
      reserve: new FakeInput('6', { min: '0', max: '64' }),
    },
    outputs: kvOutputs,
    isPt: true,
    dataset: { params: '27000000000', kibPerToken: '64', stateMib: '144' },
  })
  runCalculator('src/components/labs/KvBudgetLab.astro', kvForm)
  assert.match(kvOutputs.weights.textContent, /^50,3 GiB$/u)
  assert.match(kvOutputs.perseq.textContent, /^2\.192 MiB$/u)

  const costOutputs = Object.fromEntries(['managed', 'rented', 'gpus', 'util', 'verdict'].map((name) => [name, { textContent: '' }]))
  costOutputs.validation = { hidden: true }
  const costForm = createForm({
    controls: {
      inM: new FakeInput('200', { min: '0' }),
      outM: new FakeInput('40', { min: '0' }),
      priceIn: new FakeInput('0.45', { min: '0' }),
      priceOut: new FakeInput('3.2', { min: '0' }),
      gpuHour: new FakeInput('2.5', { min: '0' }),
      tps: new FakeInput('800', { min: '1' }),
    },
    outputs: costOutputs,
    isPt: true,
  })
  runCalculator('src/components/labs/CostPerTokenLab.astro', costForm)
  assert.match(costOutputs.util.textContent, /^1,9%$/u)
})

test('cost calculator rejects blank and values below their HTML minimum', () => {
  for (const [name, value] of [['inM', ''], ['priceOut', '-0.01'], ['tps', '0']]) {
    const outputs = Object.fromEntries(['managed', 'rented', 'gpus', 'util', 'verdict'].map((key) => [key, { textContent: `server ${key}` }]))
    outputs.validation = { hidden: true }
    const controls = {
      inM: new FakeInput('200', { min: '0' }),
      outM: new FakeInput('40', { min: '0' }),
      priceIn: new FakeInput('0.45', { min: '0' }),
      priceOut: new FakeInput('3.2', { min: '0' }),
      gpuHour: new FakeInput('2.5', { min: '0' }),
      tps: new FakeInput('800', { min: '1' }),
    }
    controls[name].value = value
    const form = createForm({ controls, outputs })

    runCalculator('src/components/labs/CostPerTokenLab.astro', form)

    assert.equal(outputs.validation.hidden, false, `expected validation for ${name}=${JSON.stringify(value)}`)
    assert.equal(outputs.managed.textContent, 'server managed')
    assert.equal(controls[name].attributes.get('aria-invalid'), 'true')
  }
})
