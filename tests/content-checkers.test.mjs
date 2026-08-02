import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const CHECKERS = [
  'content-parity.mjs',
  'content-stubs.mjs',
  'content-graph.mjs',
  'content-citations.mjs',
  'assets-exist.mjs',
]

function runChecker(name, contentRoot) {
  return spawnSync(process.execPath, [resolve('scripts', name)], {
    cwd: process.cwd(),
    env: { ...process.env, LLMDEEPDIVE_CONTENT_ROOT: contentRoot },
    encoding: 'utf8',
  })
}

test('content checkers fail closed when the lesson corpus is missing', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'llmdeepdive-empty-content-'))
  try {
    for (const checker of CHECKERS) {
      const result = runChecker(checker, fixture)
      assert.notEqual(result.status, 0, `${checker} passed with no lessons`)
      assert.match(result.stderr, /lessons.*does not exist/u, `${checker} did not explain the missing corpus`)
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('content parity fails when a translated track is missing', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'llmdeepdive-track-parity-'))
  try {
    for (const locale of ['en', 'pt-br']) {
      const lessonDirectory = join(fixture, 'lessons', locale, '1-track')
      mkdirSync(lessonDirectory, { recursive: true })
      writeFileSync(
        join(lessonDirectory, '1.1-test.mdx'),
        `---\nid: "1.1-test"\nlocale: "${locale}"\n---\n`,
      )
    }
    const trackDirectory = join(fixture, 'tracks', 'en')
    mkdirSync(trackDirectory, { recursive: true })
    writeFileSync(join(trackDirectory, '1-track.json'), '{}\n')

    const result = runChecker('content-parity.mjs', fixture)
    assert.notEqual(result.status, 0, 'content parity passed with no pt-BR track')
    assert.match(result.stderr, /Tracks missing in pt-br: 1-track/u)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
