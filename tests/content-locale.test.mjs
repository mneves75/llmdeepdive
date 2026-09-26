import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { bilingualContentFailures } from "../scripts/content-locale.mjs"

function writeBilingualFixture(root, bodies) {
  for (const locale of ['en', 'pt-br']) {
    const lessonDirectory = join(root, 'lessons', locale, '1-track')
    const trackDirectory = join(root, 'tracks', locale)
    mkdirSync(lessonDirectory, { recursive: true })
    mkdirSync(trackDirectory, { recursive: true })
    writeFileSync(
      join(lessonDirectory, '1.1-test.mdx'),
      `---\nid: "1.1-test"\ntrack: "1-track"\nlocale: "${locale}"\n---\n${bodies[locale]}\n`,
    )
    writeFileSync(join(trackDirectory, '1-track.json'), '{}\n')
  }
}

function runParity(contentRoot) {
  return spawnSync(process.execPath, [resolve('scripts/content-parity.mjs')], {
    cwd: process.cwd(),
    env: { ...process.env, LLMDEEPDIVE_CONTENT_ROOT: contentRoot },
    encoding: 'utf8',
  })
}

test('content parity rejects math drift and decimal points in pt-BR prose', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'llmdeepdive-locale-fail-'))
  try {
    writeBilingualFixture(fixture, {
      en: '$x = 1.154$ and $y = 2.0$\n\nThe value is 1.154.',
      'pt-br': '$x = 1.154$ e $y = 2.1$\n\nO valor é 1.154.',
    })

    const result = runParity(fixture)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /math span 2 differs outside translated/u)
    assert.match(result.stderr, /decimal point "1\.154"/u)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('content parity permits translated math text and localized numeric prose', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'llmdeepdive-locale-pass-'))
  try {
    writeBilingualFixture(fixture, {
      en: '$\\text{cached tokens} + x$\n\nQwen3.8 in lesson 7.2 has 262,144 positions; value 1.5; config `temperature=0.7`.',
      'pt-br': '$\\text{tokens em cache} + x$\n\nO Qwen3.8 na lição 7.2 tem 262.144 posições; valor 1,5; config `temperature=0.7`.',
    })

    const result = runParity(fixture)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /content:parity PASS/u)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})


test("bilingual gate treats inline configuration values in frontmatter as notation", () => {
  const english = {
    id: "fixture",
    body: "$x = 0.7$",
    frontmatter: "summary: \"Use `temperature=0.7`.\"",
  }
  const portuguese = {
    id: "fixture",
    body: "$x = 0.7$",
    frontmatter: "summary: \"Use `temperature=0.7`.\"",
  }

  assert.deepEqual(bilingualContentFailures(english, portuguese), [])
})

test('pt-BR prose calls a course track "trilha", as the interface does', () => {
  const english = { id: 'fixture', body: 'Track 4 shows it.\n\n| Lesson | Track 8 lesson |\n|---|---|\n| a | b |', frontmatter: 'summary: "Covered in track 7."' }
  const lesson = (body, summary) => ({ id: 'fixture', body, frontmatter: `track: "4-transformer"\nsummary: "${summary}"` })

  const failures = bilingualContentFailures(english, lesson('A track 4 mostra isso.\n\n| Lição | Lição da Track 8 |\n|---|---|\n| a | b |', 'Assunto de toda a track 7.'))
  assert.equal(failures.length, 3, failures.join('\n'))
  assert.ok(failures.every((failure) => /says "track"/u.test(failure)), failures.join('\n'))

  // The frontmatter key, inline code and the word inside other words are not prose.
  assert.deepEqual(
    bilingualContentFailures(english, lesson('A trilha 4 mostra isso; `--track` é uma flag e tracking é outra palavra.\n\n| Lição | Lição da Trilha 8 |\n|---|---|\n| a | b |', 'Assunto de toda a trilha 7.')),
    [],
  )
})
