import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completeKey, lastVisitKey, parseLastVisit, serializeLastVisit, countComplete, fillTemplate } from '../src/lib/progress.ts'

const visit = { id: '4.2-self-attention', path: '/lessons/4-transformer/4.2-self-attention/', title: 'Self-attention', position: '4.2' }

test('storage keys are the ones the lesson page has always written', () => {
  assert.equal(completeKey('en', '4.2-self-attention'), 'ldd:complete:en:4.2-self-attention')
  assert.equal(completeKey('pt-br', '1.1-x'), 'ldd:complete:pt-br:1.1-x')
  assert.equal(lastVisitKey('pt-br'), 'ldd:last:pt-br')
})

test('a last visit round-trips', () => {
  assert.deepEqual(parseLastVisit(serializeLastVisit(visit), 'en'), visit)
  const pt = { ...visit, path: '/pt-br/lessons/4-transformer/4.2-self-attention/' }
  assert.deepEqual(parseLastVisit(serializeLastVisit(pt), 'pt-br'), pt)
})

test('a stored record is untrusted input: anything but a lesson path of this locale is refused', () => {
  const variants = [
    null,
    '',
    'not json',
    '[]',
    '{"id":1}',
    JSON.stringify({ ...visit, path: 'javascript:alert(1)' }),
    JSON.stringify({ ...visit, path: '//evil.example/lessons/a/b/' }),
    JSON.stringify({ ...visit, path: 'https://evil.example/lessons/a/b/' }),
    JSON.stringify({ ...visit, path: '/lessons/../../x/' }),
    JSON.stringify({ ...visit, path: '/pt-br/lessons/4-transformer/4.2-self-attention/' }), // wrong locale for 'en'
    JSON.stringify({ ...visit, title: '' }),
    JSON.stringify({ ...visit, title: 'x'.repeat(400) }),
    JSON.stringify({ ...visit, position: '<b>' }),
  ]
  for (const raw of variants) assert.equal(parseLastVisit(raw, 'en'), null, `accepted ${raw}`)
})

test('completion is counted only for the given lessons', () => {
  const store = new Map([
    ['ldd:complete:en:a', 'true'],
    ['ldd:complete:en:b', 'false'],
    ['ldd:complete:pt-br:c', 'true'],
    ['ldd:complete:en:gone', 'true'],
  ])
  const storage = { getItem: (key) => store.get(key) ?? null }
  assert.equal(countComplete(storage, 'en', ['a', 'b', 'c']), 1)
  assert.equal(countComplete(storage, 'pt-br', ['a', 'b', 'c']), 1)
  const broken = { getItem: () => { throw new Error('SecurityError') } }
  assert.equal(countComplete(broken, 'en', ['a']), 0)
})

test('templates fill named slots only', () => {
  assert.equal(fillTemplate('{n} of {m} complete', { n: 3, m: 116 }), '3 of 116 complete')
  assert.equal(fillTemplate('{n}/{m} — {n}', { n: 1, m: 2 }), '1/2 — 1')
  assert.equal(fillTemplate('{x}', { n: 1 }), '{x}')
})

test('the course-wide count reads every completion record of one locale', async () => {
  const { countStoredComplete } = await import('../src/lib/progress.ts')
  const entries = [['ldd:complete:en:a', 'true'], ['ldd:complete:en:b', 'true'], ['ldd:complete:en:c', 'false'], ['ldd:complete:pt-br:a', 'true'], ['ldd-theme', 'dark'], ['ldd:quiz:en:a', 'true']]
  const storage = { length: entries.length, key: (index) => entries[index]?.[0] ?? null, getItem: (key) => entries.find(([name]) => name === key)?.[1] ?? null }
  assert.equal(countStoredComplete(storage, 'en'), 2)
  assert.equal(countStoredComplete(storage, 'pt-br'), 1)
  const broken = { get length() { throw new Error('SecurityError') }, key: () => null, getItem: () => null }
  assert.equal(countStoredComplete(broken, 'en'), 0)
})
