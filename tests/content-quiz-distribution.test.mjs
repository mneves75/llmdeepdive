import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function runFixture(positions, optionsFor = () => ['A', 'B', 'C', 'D']) {
  const root = mkdtempSync(join(tmpdir(), 'llmdeepdive-quiz-positions-'))
  for (const locale of ['en', 'pt-br']) {
    const lessons = join(root, 'lessons', locale, '1-track')
    const tracks = join(root, 'tracks', locale)
    mkdirSync(lessons, { recursive: true })
    mkdirSync(tracks, { recursive: true })
    writeFileSync(join(tracks, '1-track.json'), '{}\n')
    for (let lesson = 0; lesson < positions.length / 2; lesson += 1) {
      const first = positions[lesson * 2]
      const second = positions[lesson * 2 + 1]
      writeFileSync(
        join(lessons, `1.${lesson + 1}-test.mdx`),
        `---
id: "1.${lesson + 1}-test"
track: "1-track"
locale: "${locale}"
quiz:
  - question: "First?"
    options: ${JSON.stringify(optionsFor(lesson * 2, first))}
    correctIndex: ${first}
    explanation: "Because."
  - question: "Second?"
    options: ${JSON.stringify(optionsFor(lesson * 2 + 1, second))}
    correctIndex: ${second}
    explanation: "Because."
---
Body.
`,
      )
    }
  }
  const result = spawnSync(process.execPath, [resolve('scripts/content-parity.mjs')], {
    cwd: process.cwd(),
    env: { ...process.env, LLMDEEPDIVE_CONTENT_ROOT: root },
    encoding: 'utf8',
  })
  rmSync(root, { recursive: true, force: true })
  return result
}

test('content parity rejects a deterministic position for each quiz ordinal', () => {
  const result = runFixture([1, 2, 1, 2, 1, 2, 1, 2])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /quiz 1 has predictable answer positions: 1,1,1,1/u)
})

test('content parity accepts balanced answer positions shared by both locales', () => {
  const result = runFixture([0, 1, 1, 2, 2, 3, 3, 0])
  assert.equal(result.status, 0, result.stderr)
})

// The correct option was uniquely the longest in ~89% of items (lesson review,
// 2026-10-18): a learner could pass by picking the longest answer. Balanced
// positions above do not catch that cue.
const longestCorrect = (item, correct) => ['Short', 'Brief', 'Small', 'Tiny'].map((word, index) => (index === correct ? 'The much longer correct answer' : word))
const evenLengths = () => ['Option one', 'Option two', 'Option ttt', 'Option fff']

test('content parity rejects a corpus where the correct option is usually the longest', () => {
  const result = runFixture([0, 1, 1, 2, 2, 3, 3, 0], longestCorrect)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /correct option is uniquely the longest in 8 of 8 quiz items/u)
})

test('content parity accepts options of comparable length', () => {
  const result = runFixture([0, 1, 1, 2, 2, 3, 3, 0], evenLengths)
  assert.equal(result.status, 0, result.stderr)
})

test('content parity rejects one track that leans on the length cue even when the corpus does not', () => {
  // Five of eight items cue the answer: 62.5% for the only track, over its 50% cap.
  const result = runFixture([0, 1, 1, 2, 2, 3, 3, 0], (item, correct) => (item < 5 ? longestCorrect(item, correct) : evenLengths()))
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /track "1-track": the correct option is uniquely the longest in 5 of 8/u)
})

// Tightening long correct options can overshoot: a corpus whose correct option
// is usually the shortest teaches the opposite shortcut.
const shortestCorrect = (item, correct) => ['A longer distractor', 'Another long distractor', 'Yet another distractor', 'One more distractor'].map((text, index) => (index === correct ? 'Short' : text))

test('content parity rejects a corpus where the correct option is usually the shortest', () => {
  const result = runFixture([0, 1, 1, 2, 2, 3, 3, 0], shortestCorrect)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /correct option is uniquely the shortest in 8 of 8 quiz items/u)
})
