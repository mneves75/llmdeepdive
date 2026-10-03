import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { parseDecimal } from '../src/lib/lab-form.ts'
import { roundHalfEven, upToOneDecimal, videoTokens } from '../src/lib/lab-math.ts'

// Lesson 10.1's lab. The harness below is copied from calculator-ui.test.mjs
// rather than imported, because importing that file would register its tests
// a second time.

const LAB = 'src/components/labs/VideoTokenLab.astro'

async function componentScript(relativePath) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
  const match = source.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/u)
  assert.ok(match, `expected a client script in ${relativePath}`)
  const imports = {}
  const componentUrl = new URL(`../${relativePath}`, import.meta.url)
  for (const [, names, from] of match[1].matchAll(/^\s*import \{([^}]+)\} from '([^']+)'$/gmu)) {
    const module = await import(new URL(`${from}.ts`, componentUrl).href)
    for (const name of names.split(',').map((part) => part.trim())) imports[name] = module[name]
  }
  const body = match[1].replace(/^\s*import .*$/gmu, '')
  const script = ts.transpileModule(body, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return { script, imports }
}

function execute(script, globals) {
  Function(...Object.keys(globals), `"use strict";\n${script}`)(...Object.values(globals))
}

class FakeInput {
  tagName = 'INPUT'

  constructor(value, dataset = {}) {
    this.value = value
    this.dataset = dataset
    this.attributes = new Map()
  }

  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) { this.attributes.delete(name) }
}

class FakeSelect extends FakeInput {
  tagName = 'SELECT'
}

const OUTPUTS = ['frames', 'groups', 'pergroup', 'perframe', 'total', 'share', 'verdict']
const VERDICTS = { fits: 'fits verdict', tight: 'tight verdict', over: 'over verdict' }

function outputsFor() {
  return {
    ...Object.fromEntries(OUTPUTS.map((name) => [name, { textContent: `server ${name}` }])),
    verdict: { textContent: 'server verdict', dataset: VERDICTS },
    validation: { textContent: '', dataset: { invalid: 'video invalid' } },
  }
}

const controlsFor = (overrides = {}) => {
  const values = { seconds: '60', fps: '2', width: '512', height: '384', ...overrides }
  return {
    seconds: new FakeInput(values.seconds, { min: '0.5', max: '36000' }),
    fps: new FakeInput(values.fps, { min: '0.1', max: '60' }),
    width: new FakeInput(values.width, { min: '16', max: '8192' }),
    height: new FakeInput(values.height, { min: '16', max: '8192' }),
    patch: new FakeSelect(overrides.patch ?? '16'),
    merge: new FakeSelect(overrides.merge ?? '2'),
    temporal: new FakeSelect(overrides.temporal ?? '2'),
    context: new FakeSelect(overrides.context ?? '262144'),
  }
}

function createForm({ controls, outputs, isPt = false }) {
  const listeners = new Map()
  return {
    dataset: {},
    elements: { namedItem: (name) => controls[name] ?? null },
    querySelector: (selector) => outputs[selector.match(/data-out="([^"]+)"/u)?.[1]] ?? null,
    closest: () => (isPt ? {} : null),
    addEventListener: (type, listener) => listeners.set(type, listener),
    listeners,
  }
}

async function run(form) {
  const { script, imports } = await componentScript(LAB)
  execute(script, { document: { querySelectorAll: () => [form] }, ...imports })
}

const WORKED = { seconds: 60, fps: 2, width: 512, height: 384, patch: 16, merge: 2, temporal: 2, context: 262144 }

test('video token math reproduces lesson 10.1 worked example', () => {
  const worked = videoTokens(WORKED)
  assert.ok(worked)
  assert.equal(worked.frames, 120)
  assert.equal(worked.groups, 60)
  assert.equal(worked.tokensW, 16)
  assert.equal(worked.tokensH, 12)
  assert.equal(worked.patchesPerGroup, 768)
  assert.equal(worked.perGroup, 192)
  assert.equal(worked.perFrame, 96)
  assert.equal(worked.total, 11520)
  assert.equal(worked.share.toFixed(1), '4.4')
  assert.equal(worked.verdict, 'fits')
})

test('video token math covers the thirty-minute case and every verdict', () => {
  // 30 min at 2 fps, same frame size: 1,800 groups of 192 overflow 262,144.
  const long = videoTokens({ ...WORKED, seconds: 1800 })
  assert.equal(long.frames, 3600)
  assert.equal(long.total, 345600)
  assert.equal(long.verdict, 'over')
  // Same clip at 1 fps: 900 groups, 172,800 tokens, past half the window.
  const oneFps = videoTokens({ ...WORKED, seconds: 1800, fps: 1 })
  assert.equal(oneFps.total, 172800)
  assert.equal(oneFps.verdict, 'tight')
  assert.equal(videoTokens({ ...WORKED, context: 32768 }).verdict, 'fits')
})

test('an odd frame count pads to a whole temporal group', () => {
  // 2.5 s at 2 fps = 5 frames; the processor repeats the last frame to make 6.
  const odd = videoTokens({ ...WORKED, seconds: 2.5 })
  assert.equal(odd.frames, 5)
  assert.equal(odd.groups, 3)
  assert.equal(odd.total, 3 * 192)
  // Temporal patch 1 means one group per frame.
  assert.equal(videoTokens({ ...WORKED, seconds: 2.5, temporal: 1 }).groups, 5)
})

test('frame sides snap to a multiple of patch x merge, ties to even like Python round', () => {
  assert.equal(roundHalfEven(22.5), 22)
  assert.equal(roundHalfEven(23.5), 24)
  assert.equal(roundHalfEven(22.4), 22)
  assert.equal(roundHalfEven(22.6), 23)
  // 1280 x 720: 720 / 32 = 22.5 rounds to 22 rows, not 23.
  const hd = videoTokens({ ...WORKED, width: 1280, height: 720 })
  assert.equal(hd.tokensW, 40)
  assert.equal(hd.tokensH, 22)
  assert.equal(hd.perGroup, 880)
  // A side smaller than one merged patch still yields one.
  assert.equal(videoTokens({ ...WORKED, width: 16, height: 16 }).perGroup, 1)
  // An odd per-group count gives a fractional per-frame figure, shown to one decimal.
  const odd = videoTokens({ ...WORKED, width: 480, height: 352 })
  assert.equal(odd.perGroup, 165)
  assert.equal(odd.perFrame, 82.5)
  assert.equal(upToOneDecimal('pt-br').format(82.5), '82,5')
  assert.equal(upToOneDecimal('en').format(96), '96')
})

test('video token math rejects inputs it cannot honestly count', () => {
  assert.equal(videoTokens({ ...WORKED, seconds: 0.2, fps: 1 }), null, 'zero frames')
  assert.equal(videoTokens({ ...WORKED, seconds: Number.POSITIVE_INFINITY }), null)
  assert.equal(videoTokens({ ...WORKED, width: Number.NaN }), null)
  assert.equal(videoTokens({ ...WORKED, context: 0 }), null)
})

test('lab inputs read pt-BR decimals and grouping', () => {
  assert.equal(parseDecimal('1,5', 'pt-br'), 1.5)
  assert.equal(parseDecimal('1.024', 'pt-br'), 1024)
})

test('video lab renders the worked example from its own script', async () => {
  const outputs = outputsFor()
  await run(createForm({ controls: controlsFor(), outputs }))
  assert.equal(outputs.validation.textContent, '')
  assert.equal(outputs.frames.textContent, '120')
  assert.equal(outputs.groups.textContent, '60')
  assert.equal(outputs.pergroup.textContent, '192')
  assert.equal(outputs.perframe.textContent, '96')
  assert.equal(outputs.total.textContent, '11,520')
  assert.equal(outputs.share.textContent, '4.4%')
  assert.equal(outputs.verdict.textContent, 'fits verdict')
})

test('video lab reads the pt-BR page convention, including a decimal comma', async () => {
  const outputs = outputsFor()
  // 1,5 s at 4 fps = 6 frames = 3 groups of 192.
  await run(createForm({ controls: controlsFor({ seconds: '1,5', fps: '4' }), outputs, isPt: true }))
  assert.equal(outputs.validation.textContent, '')
  assert.equal(outputs.frames.textContent, '6')
  assert.equal(outputs.total.textContent, '576')
  assert.equal(outputs.share.textContent, '0,2%')

  const long = outputsFor()
  await run(createForm({ controls: controlsFor({ seconds: '1.800' }), outputs: long, isPt: true }))
  assert.equal(long.total.textContent, '345.600')
  assert.equal(long.verdict.textContent, 'over verdict')
})

test('video lab blanks every result for blank, malformed, out-of-range and zero-frame input', async () => {
  const cases = [['seconds', ''], ['seconds', '-1'], ['fps', '0'], ['width', '12,34,56'], ['height', '99999'], ['seconds', '0,6']]
  for (const [name, value] of cases) {
    const outputs = outputsFor()
    const controls = controlsFor({ [name]: value, ...(name === 'seconds' && value === '0,6' ? { fps: '1' } : {}) })
    await run(createForm({ controls, outputs, isPt: true }))
    assert.equal(outputs.validation.textContent, 'video invalid', `expected validation for ${name}=${JSON.stringify(value)}`)
    for (const out of ['frames', 'groups', 'pergroup', 'perframe', 'total', 'share']) assert.equal(outputs[out].textContent, '—', `${out} kept a stale value`)
    assert.equal(outputs.verdict.textContent, '')
  }
  const outputs = outputsFor()
  const controls = controlsFor({ width: 'abc' })
  await run(createForm({ controls, outputs }))
  assert.equal(controls.width.attributes.get('aria-invalid'), 'true')
})

test('video lab recovers once the input is valid again', async () => {
  const outputs = outputsFor()
  const controls = controlsFor({ seconds: '' })
  const form = createForm({ controls, outputs })
  await run(form)
  assert.equal(outputs.validation.textContent, 'video invalid')

  controls.seconds.value = '60'
  form.listeners.get('input')()
  assert.equal(outputs.validation.textContent, '')
  assert.equal(outputs.total.textContent, '11,520')
  assert.equal(controls.seconds.attributes.has('aria-invalid'), false)
})
