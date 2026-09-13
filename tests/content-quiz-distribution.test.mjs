import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function runFixture(positions) {
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
    options: ["A", "B", "C", "D"]
    correctIndex: ${first}
    explanation: "Because."
  - question: "Second?"
    options: ["A", "B", "C", "D"]
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
