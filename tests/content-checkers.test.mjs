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
        `---\nid: "1.1-test"\ntrack: "1-track"\nlocale: "${locale}"\n---\n`,
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

function writeStructuralFixture(root, overrides = {}) {
  for (const locale of ['en', 'pt-br']) {
    const lessonDirectory = join(root, 'lessons', locale, '1-track')
    const trackDirectory = join(root, 'tracks', locale)
    mkdirSync(lessonDirectory, { recursive: true })
    mkdirSync(trackDirectory, { recursive: true })
    const lesson = {
      order: 1,
      tier: 'core',
      prerequisites: '[]',
      lab: '  id: "kv-budget"\n  kind: "calculator"\n  budgetKb: 12',
      citationUrl: 'https://example.com/paper',
      options: '["a", "b", "c"]',
      ...(locale === 'pt-br' ? overrides.lesson : {}),
    }
    writeFileSync(
      join(lessonDirectory, '1.1-test.mdx'),
      `---\nid: "1.1-test"\ntrack: "1-track"\norder: ${lesson.order}\ntier: "${lesson.tier}"\nlocale: "${locale}"\n`
        + `prerequisites: ${lesson.prerequisites}\nlab:\n${lesson.lab}\nquiz:\n  - question: "q"\n    options: ${lesson.options}\n    correctIndex: 0\n`
        + `citations:\n  - title: "t"\n    authors: "${locale === 'en' ? 'A and B' : 'A e B'}"\n    year: 2024\n    url: "${lesson.citationUrl}"\n---\n`,
    )
    const track = { id: '1-track', order: 1, tier: 'core', locale, ...(locale === 'pt-br' ? overrides.track : {}) }
    writeFileSync(join(trackDirectory, '1-track.json'), JSON.stringify(track) + '\n')
  }
}

test('content parity accepts translated authors with identical course structure', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'llmdeepdive-structure-pass-'))
  try {
    writeStructuralFixture(fixture)
    const result = runChecker('content-parity.mjs', fixture)
    assert.equal(result.status, 0, result.stderr)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('content parity rejects structural lesson and track drift across locales', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'llmdeepdive-structure-fail-'))
  try {
    writeStructuralFixture(fixture, {
      lesson: {
        order: 2,
        tier: 'advanced',
        prerequisites: '["0.1-other"]',
        lab: '  id: "kv-budget"\n  kind: "calculator"\n  budgetKb: 20',
        citationUrl: 'https://example.com/other',
        options: '["a", "b"]',
      },
      track: { order: 3, locale: 'en' },
    })
    const result = runChecker('content-parity.mjs', fixture)
    assert.notEqual(result.status, 0, 'content parity passed with structural drift')
    for (const expected of [
      /Lesson "1\.1-test" order is 1 in en but 2 in pt-br/u,
      /Lesson "1\.1-test" tier is "core" in en but "advanced" in pt-br/u,
      /different prerequisites across locales/u,
      /declares a different lab across locales/u,
      /cites different sources/u,
      /quiz 1 has 3 option\(s\) in en but 2 in pt-br/u,
      /Track "1-track" order is 1 in en but 3 in pt-br/u,
      /track locale "en" does not match directory "pt-br"/u,
    ]) assert.match(result.stderr, expected)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
