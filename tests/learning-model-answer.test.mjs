import assert from 'node:assert/strict'
import test from 'node:test'

import { renderModelAnswer } from '../src/components/learning-model-answer.ts'

test('model-answer prose stays text while paired inline math becomes MathML', () => {
  const parts = renderModelAnswer('Applying $Wx$ keeps <img src=x onerror=alert(1)> as prose.')

  assert.deepEqual(parts.map((part) => part.kind), ['text', 'math', 'text'])
  assert.equal(parts[0]?.kind === 'text' ? parts[0].value : '', 'Applying ')
  assert.match(parts[1]?.kind === 'math' ? parts[1].html : '', /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/u)
  assert.doesNotMatch(parts[1]?.kind === 'math' ? parts[1].html : '', /katex-html|style=/u)
  assert.equal(parts[2]?.kind === 'text' ? parts[2].value : '', ' keeps <img src=x onerror=alert(1)> as prose.')
})

test('unmatched dollar notation remains ordinary text', () => {
  assert.deepEqual(
    renderModelAnswer('A malformed $delimiter stays visible.'),
    [{ kind: 'text', value: 'A malformed $delimiter stays visible.' }],
  )
})

test('literal markup inside math cannot become trusted HTML', () => {
  const parts = renderModelAnswer('$<img src=x onerror=alert(1)>$')
  const html = parts[0]?.kind === 'math' ? parts[0].html : ''

  assert.doesNotMatch(html, /<img\b/iu)
  assert.match(html, /&lt;/u)
})

test('display-style double dollars do not produce empty formulas', () => {
  const parts = renderModelAnswer('Costs $$y$$')

  assert.deepEqual(parts.map((part) => part.kind), ['text', 'math', 'text'])
  assert.equal(parts[0]?.kind === 'text' ? parts[0].value : '', 'Costs $')
  assert.equal(parts[2]?.kind === 'text' ? parts[2].value : '', '$')
})

test('a malformed formula fails the build instead of rendering an error span', () => {
  assert.throws(() => renderModelAnswer('Broken $\\frac{1}{$ formula.'), /KaTeX parse error/u)
})
