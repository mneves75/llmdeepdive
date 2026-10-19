/**
 * Acceptance checks for the agent-engineering release (tracks 14–25), written
 * from docs/specs/agent-engineering/spec.md before reading the implementation.
 *
 * The inventory is the frozen contract: every one of its 60 lessons must exist
 * in both locales with the frontmatter it dictates, the quiz census must stay
 * under the length-cue caps, each lab must server-render the spec's worked
 * numbers, every quoted snippet must be code a test imports, and the course's
 * first part (tracks 0–13) must keep its ids and progress keys.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { objectArrayField, objectField, scalarField, splitFrontmatter, stringArrayField, stringField, walkFiles } from '../scripts/content-utils.mjs'
import { completeKey, lastVisitKey } from '../src/lib/progress.ts'

const LOCALES = ['en', 'pt-br']
const SPEC_DIR = 'docs/specs/agent-engineering'
const EXAMPLES = 'examples/agent-engineering'
// Both roots can be pointed at a copy, so the file can be shown failing on a planted defect.
const CONTENT = process.env.LLMDEEPDIVE_CONTENT_ROOT ?? 'src/content'
const DIST = process.env.LLMDEEPDIVE_DIST_ROOT ?? 'dist'
const inventory = JSON.parse(readFileSync(join(SPEC_DIR, 'inventory.json'), 'utf8'))
const NEW_TRACKS = new Set(inventory.tracks.map((track) => track.id))
const NEW_LESSONS = new Map(inventory.lessons.map((lesson) => [lesson.id, lesson]))
const FENCE = /^```[^\n]*\n([\s\S]*?)^```/gmu
const HEADER = /^(?:#|\/\/) file: (\S+)\s*$/u

function lesson(locale, trackId, id) {
  const file = join(CONTENT, 'lessons', locale, trackId, `${id}.mdx`)
  assert.ok(existsSync(file), `${file} missing`)
  const { frontmatter, body } = splitFrontmatter(file)
  return { file, frontmatter, body }
}

function corpus(locale) {
  const tracks = readdirSync(join(CONTENT, 'tracks', locale)).filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(join(CONTENT, 'tracks', locale, name), 'utf8')))
  const lessons = walkFiles(resolve(CONTENT, 'lessons', locale), new Set(['.mdx'])).map((file) => {
    const { frontmatter, body } = splitFrontmatter(file)
    return { file, frontmatter, body, id: stringField(frontmatter, 'id', file), track: stringField(frontmatter, 'track', file) }
  })
  return { tracks, lessons }
}

const corpora = new Map(LOCALES.map((locale) => [locale, corpus(locale)]))

// --- Acceptance 1: 26 tracks and 185 lessons per locale, in two parts -------

for (const locale of LOCALES) {
  test(`${locale}: 26 tracks and 185 lessons, tracks 14–25 in the agents part`, () => {
    const { tracks, lessons } = corpora.get(locale)
    assert.equal(tracks.length, 26)
    assert.equal(lessons.length, 185)
    assert.equal(new Set(lessons.map((item) => item.id)).size, 185, 'duplicate lesson id')
    for (const track of tracks) {
      assert.equal(track.part, NEW_TRACKS.has(track.id) ? 'agents' : 'models', `${track.id} part`)
      assert.equal(track.locale, locale)
    }
    for (const planned of inventory.tracks) {
      const track = tracks.find((item) => item.id === planned.id)
      assert.ok(track, `${planned.id} missing in ${locale}`)
      assert.equal(track.order, planned.order)
      assert.equal(track.tier, planned.tier)
      assert.equal(track.title, locale === 'en' ? planned.titleEn : planned.titlePt)
    }
  })
}

// --- Inventory ↔ corpus, every new lesson in both locales -------------------

const LABS = {
  '19.3-token-budgets-and-compression': 'context-budget',
  '21.4-budget-the-repair-loop': 'retry-budget',
  '23.2-evaluate-valid-paths': 'trace-check',
  '25.2-a-reproducible-benchmark': 'cost-per-success',
}

for (const locale of LOCALES) {
  test(`${locale}: every inventory lesson carries the frontmatter the spec freezes`, () => {
    const titles = new Set()
    const everyId = new Set(corpora.get(locale).lessons.map((item) => item.id))
    for (const planned of inventory.lessons) {
      const { file, frontmatter } = lesson(locale, planned.track, planned.id)
      const at = (message) => `${file}: ${message}`
      assert.equal(stringField(frontmatter, 'id', file), planned.id, at('id'))
      assert.equal(stringField(frontmatter, 'track', file), planned.track, at('track'))
      assert.equal(scalarField(frontmatter, 'order', file), planned.order, at('order'))
      assert.equal(stringField(frontmatter, 'tier', file), planned.tier, at('tier'))
      assert.equal(stringField(frontmatter, 'locale', file), locale, at('locale'))
      assert.deepEqual([...stringArrayField(frontmatter, 'prerequisites', file)].sort(), [...planned.prerequisites].sort(), at('prerequisites'))
      assert.deepEqual([...stringArrayField(frontmatter, 'unlocks', file)].sort(), [...planned.unlocks].sort(), at('unlocks'))
      for (const id of [...planned.prerequisites, ...planned.unlocks]) assert.ok(everyId.has(id), at(`${id} is not a lesson`))

      const title = stringField(frontmatter, 'title', file)
      assert.ok(title && title.length <= 60, at(`title "${title}" over 60 characters`))
      assert.ok(!titles.has(title), at(`title "${title}" repeats`))
      titles.add(title)
      if (locale === 'en') assert.equal(title, planned.titleEn, at('title'))
      // The integrator restamps `updated` on commit, so only the floor is fixed.
      assert.ok((stringField(frontmatter, 'updated', file) ?? '') >= '2026-10-18', at('updated'))

      const quiz = objectArrayField(frontmatter, 'quiz', file)
      assert.equal(quiz.length, 3, at('quiz items'))
      quiz.forEach((item, index) => {
        assert.equal(item.options.length, 4, at(`quiz ${index + 1} options`))
        assert.equal(item.correctIndex, planned.correctIndexPattern[index], at(`quiz ${index + 1} correctIndex`))
        assert.ok(item.explanation, at(`quiz ${index + 1} explanation`))
      })

      const lab = objectField(frontmatter, 'lab', file)
      if (LABS[planned.id]) assert.deepEqual(lab, { id: LABS[planned.id], kind: 'calculator', budgetKb: 12 }, at('lab'))
      else assert.equal(lab, undefined, at('unexpected lab'))
    }
  })
}

test('new lessons unlock exactly the new lessons that require them; part one gained no forward unlocks', () => {
  for (const planned of inventory.lessons) {
    for (const prerequisite of planned.prerequisites) {
      const upstream = NEW_LESSONS.get(prerequisite)
      if (upstream) assert.ok(upstream.unlocks.includes(planned.id), `${prerequisite} must unlock ${planned.id}`)
    }
    for (const unlocked of planned.unlocks) {
      const downstream = NEW_LESSONS.get(unlocked)
      assert.ok(downstream, `${planned.id} unlocks ${unlocked}, which is not a new lesson`)
      assert.ok(downstream.prerequisites.includes(planned.id), `${unlocked} must require ${planned.id}`)
    }
  }
  for (const item of corpora.get('en').lessons) {
    if (NEW_TRACKS.has(item.track)) continue
    for (const unlocked of stringArrayField(item.frontmatter, 'unlocks', item.file) ?? []) {
      assert.ok(!NEW_LESSONS.has(unlocked), `${item.id} (part one) gained a forward unlock to ${unlocked}`)
    }
  }
})

// --- Acceptance 2: the quiz length cue --------------------------------------

function uniquely(direction, options, correctIndex) {
  const lengths = options.map((option) => String(option).length)
  const correct = lengths[correctIndex]
  return lengths.every((length, index) => index === correctIndex || (direction === 'longest' ? length < correct : length > correct))
}

for (const locale of LOCALES) {
  test(`${locale}: the correct option is uniquely longest in ≤20% of items, shortest in ≤35%, either ≤50% per track`, () => {
    const byTrack = new Map()
    const total = { items: 0, longest: 0, shortest: 0 }
    for (const item of corpora.get(locale).lessons) {
      const counts = byTrack.get(item.track) ?? { items: 0, longest: 0, shortest: 0 }
      byTrack.set(item.track, counts)
      for (const quiz of objectArrayField(item.frontmatter, 'quiz', item.file) ?? []) {
        for (const bucket of [counts, total]) {
          bucket.items += 1
          if (uniquely('longest', quiz.options, quiz.correctIndex)) bucket.longest += 1
          if (uniquely('shortest', quiz.options, quiz.correctIndex)) bucket.shortest += 1
        }
      }
    }
    const pct = (part, whole) => `${((100 * part) / whole).toFixed(1)}%`
    assert.ok(total.longest / total.items <= 0.2, `longest ${total.longest}/${total.items} = ${pct(total.longest, total.items)}`)
    assert.ok(total.shortest / total.items <= 0.35, `shortest ${total.shortest}/${total.items} = ${pct(total.shortest, total.items)}`)
    for (const [track, counts] of byTrack) {
      assert.ok(counts.longest / counts.items <= 0.5, `${track} longest ${counts.longest}/${counts.items}`)
      assert.ok(counts.shortest / counts.items <= 0.5, `${track} shortest ${counts.shortest}/${counts.items}`)
    }
    console.log(`  ${locale}: ${total.items} items, longest ${pct(total.longest, total.items)}, shortest ${pct(total.shortest, total.items)}`)
  })

  test(`${locale}: no new lesson has the correct option uniquely longest in more than one of its three items`, () => {
    for (const planned of inventory.lessons) {
      const { file, frontmatter } = lesson(locale, planned.track, planned.id)
      const cued = objectArrayField(frontmatter, 'quiz', file).filter((quiz) => uniquely('longest', quiz.options, quiz.correctIndex)).length
      assert.ok(cued <= 1, `${file}: correct option uniquely longest in ${cued} of 3 items`)
    }
  })
}

test('content:parity fails this corpus when one track\'s correct options are made the longest', () => {
  const root = mkdtempSync(join(process.env.TMPDIR ?? '/tmp', 'llmdeepdive-planted-cue-'))
  try {
    cpSync(CONTENT, root, { recursive: true })
    const trackId = '14-agent-architecture-and-state'
    for (const locale of LOCALES) {
      const dir = join(root, 'lessons', locale, trackId)
      for (const name of readdirSync(dir)) {
        const file = join(dir, name)
        const planted = readFileSync(file, 'utf8').replace(/^( {4}options: )(\[.*\])\n( {4}correctIndex: )(\d)$/gmu, (whole, head, options, mid, index) => {
          const list = JSON.parse(options)
          list[Number(index)] += ' and here is a planted tail that makes the correct option the longest one'
          return head + JSON.stringify(list) + '\n' + mid + index
        })
        assert.notEqual(planted, readFileSync(file, 'utf8'), `${file}: no quiz item was mutated`)
        writeFileSync(file, planted)
      }
    }
    const result = spawnSync(process.execPath, [resolve('scripts/content-parity.mjs')], {
      env: { ...process.env, LLMDEEPDIVE_CONTENT_ROOT: root },
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0, 'the gate accepted a planted length cue')
    assert.match(result.stderr, /track "14-agent-architecture-and-state": the correct option is uniquely the longest in 15 of 15/u)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

// --- Acceptance 4: runnable snippets map to tested code; the rest is labelled

function fences(body) {
  return [...body.matchAll(FENCE)].map((match) => {
    const lines = (match[1] ?? '').replace(/\n$/u, '').split('\n')
    const header = lines[0]?.match(HEADER)
    const opening = match[0].split('\n')[0] ?? ''
    return { index: match.index, file: header?.[1], code: lines.join('\n'), opening }
  })
}

const pythonSources = walkFiles(resolve(EXAMPLES), new Set(['.py'])).filter((file) => !file.includes('.venv'))
const importers = pythonSources.filter((file) => /\/tests(_[a-z]+)?\/test_[a-z0-9_]+\.py$/u.test(file)).map((file) => readFileSync(file, 'utf8'))
const projectText = pythonSources.map((file) => readFileSync(file, 'utf8')).join('\n')

function importedByATest(modulePath) {
  const parts = modulePath.replace(/^src\//u, '').replace(/\.py$/u, '').replace(/\/__init__$/u, '').split('/')
  const dotted = parts.join('.')
  const parent = parts.slice(0, -1).join('.')
  const leaf = parts.at(-1)
  const direct = new RegExp(`^\\s*(?:from ${dotted.replaceAll('.', '\\.')} import|import ${dotted.replaceAll('.', '\\.')}\\b)`, 'mu')
  const viaParent = new RegExp(`^\\s*from ${parent.replaceAll('.', '\\.')} import [^\\n]*\\b${leaf}\\b`, 'mu')
  return importers.some((source) => direct.test(source) || viaParent.test(source))
}

test('every `# file:` excerpt quotes a module a test imports, a fixture the project loads, or a test in a suite', () => {
  const quoted = new Set()
  for (const item of corpora.get('en').lessons) {
    for (const fence of fences(item.body)) if (fence.file) quoted.add(fence.file)
  }
  assert.ok(quoted.size >= 60, `only ${quoted.size} distinct excerpt files`)
  const problems = []
  for (const path of quoted) {
    const inside = path.replace(`${EXAMPLES}/`, '')
    if (!existsSync(join(EXAMPLES, inside))) { problems.push(`${path}: missing`); continue }
    if (/^tests(_[a-z]+)?\/test_[a-z0-9_]+\.py$/u.test(inside)) continue
    if (inside.startsWith('src/agentlab/fixtures/')) {
      const base = inside.split('/').at(-1)
      if (!projectText.includes(base) && !projectText.includes(base.replace(/\.[a-z]+$/u, ''))) problems.push(`${path}: fixture referenced by no module or test`)
      continue
    }
    if (!/^src\/agentlab\/.*\.py$/u.test(inside)) { problems.push(`${path}: not a module, fixture or test`); continue }
    if (!importedByATest(inside)) problems.push(`${path}: no test imports it`)
  }
  assert.deepEqual(problems, [])
})

test('every code block in tracks 14–25 either quotes the project or follows a note that CI does not run it', () => {
  // Spec, "Executable code: one rule": a block without a `# file:` header
  // "says, in the prose right before it, that it is an illustration the
  // course's CI does not run". Data and output blocks (json, text) are not
  // code; a note earlier in the same lesson ("everything below…") counts.
  const unlabelled = []
  for (const locale of LOCALES) {
    for (const item of corpora.get(locale).lessons) {
      if (!NEW_TRACKS.has(item.track)) continue
      for (const fence of fences(item.body)) {
        if (fence.file || !/^```(?:python|py|bash|sh|shell|zsh|console|javascript|js|typescript|ts|sql)\b/u.test(fence.opening)) continue
        if (/\bCI\b/u.test(item.body.slice(0, fence.index))) continue
        unlabelled.push(`${item.file}: ${fence.opening} block at ${fence.index} (${fence.code.split('\n')[0].slice(0, 60)})`)
      }
    }
  }
  assert.deepEqual(unlabelled, [], `${unlabelled.length} unlabelled block(s)`)
})

test('pt-BR lessons carry the same code blocks and figures as their English lesson', () => {
  const en = new Map(corpora.get('en').lessons.map((item) => [item.id, item]))
  const differences = []
  for (const item of corpora.get('pt-br').lessons) {
    if (!NEW_TRACKS.has(item.track)) continue
    const twin = en.get(item.id)
    assert.ok(twin, `${item.id} has no English lesson`)
    const code = (body) => fences(body).map((fence) => fence.code)
    const figures = (body) => [...body.matchAll(/<Figure id="([^"]+)"/gu)].map((match) => match[1]).sort()
    if (JSON.stringify(code(item.body)) !== JSON.stringify(code(twin.body))) differences.push(`${item.id}: code blocks differ`)
    if (JSON.stringify(figures(item.body)) !== JSON.stringify(figures(twin.body))) differences.push(`${item.id}: figures differ`)
  }
  assert.deepEqual(differences, [])
})

test('no new lesson writes a bare $ before a digit outside code', () => {
  const offenders = []
  for (const locale of LOCALES) {
    for (const item of corpora.get(locale).lessons) {
      if (!NEW_TRACKS.has(item.track)) continue
      // Inline maths ($…$) is the only legitimate `$`; a bare one before a digit is a currency the spec forbids.
      const prose = item.body.replace(FENCE, '').replace(/\$[^$\n]+\$/gu, '')
      if (/\$\d/u.test(prose) || /\$\d/u.test(item.frontmatter)) offenders.push(item.file)
    }
  }
  assert.deepEqual(offenders, [])
})

// --- Labs: the server-rendered default is the spec's worked example ---------

const LAB_PAGES = {
  '19.3-token-budgets-and-compression': { en: ['28,672', '29,400', '>728<', '20,272'], 'pt-br': ['28.672', '29.400', '>728<', '20.272'] },
  '21.4-budget-the-repair-loop': { en: ['78.4%', '21.6%', '>1.96<', 'USD 0.2352', 'USD 0.36'], 'pt-br': ['78,4%', '21,6%', '>1,96<', 'USD 0,2352', 'USD 0,36'] },
  '25.2-a-reproducible-benchmark': { en: ['USD 1.10', 'USD 33.00', 'USD 1.375', '>80%'], 'pt-br': ['USD 1,10', 'USD 33,00', 'USD 1,375', '>80%'] },
  '23.2-evaluate-valid-paths': { en: [], 'pt-br': [] },
}

for (const locale of LOCALES) {
  test(`${locale}: each lab page server-renders the worked default from the spec's Labs table`, () => {
    for (const [id, expected] of Object.entries(LAB_PAGES)) {
      const track = NEW_LESSONS.get(id).track
      const page = join(DIST, locale === 'en' ? '' : 'pt-br', 'lessons', track, id, 'index.html')
      assert.ok(existsSync(page), `${page} missing — run pnpm build first`)
      const html = readFileSync(page, 'utf8')
      assert.ok(html.includes(`data-lab-id="${LABS[id]}"`), `${page}: no lab section`)
      const form = html.slice(html.indexOf(`data-lab="${LABS[id]}"`), html.indexOf('</form>', html.indexOf(`data-lab="${LABS[id]}"`)))
      for (const text of expected[locale]) assert.ok(form.includes(text), `${page}: lab does not show ${text}`)
      if (id === '23.2-evaluate-valid-paths') {
        const verdict = form.match(/<p class="lab__verdict" data-out="verdict" data-pass="([^"]+)"[^>]*>([^<]*)</u)
        assert.ok(verdict, `${page}: no verdict`)
        assert.equal(verdict[2], verdict[1], `${page}: the default trace must pass`)
      }
    }
  })

  test(`${locale}: the build holds 185 lesson pages and 26 track pages`, () => {
    const base = locale === 'en' ? DIST : join(DIST, 'pt-br')
    const lessonsPages = walkFiles(resolve(base, 'lessons'), new Set(['.html'])).filter((file) => /lessons\/[^/]+\/[^/]+\/index\.html$/u.test(file))
    const trackPages = walkFiles(resolve(base, 'tracks'), new Set(['.html'])).filter((file) => /tracks\/[^/]+\/index\.html$/u.test(file))
    assert.equal(lessonsPages.length, 185)
    assert.equal(trackPages.length, 26)
  })
}

// --- CI, progress keys, repairs ledger -------------------------------------

test('the CI examples job runs all four example suites with Postgres as a service', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
  const job = ci.slice(ci.indexOf('\n  examples:'))
  for (const suite of ['tests', 'tests_frameworks', 'tests_browser', 'tests_postgres']) {
    assert.match(job, new RegExp(`uv run --frozen python -m unittest discover -s ${suite}\\b`, 'u'), suite)
  }
  assert.match(job, /services:\s*\n\s*postgres:/u)
  assert.match(job, /AGENTLAB_PG_DSN:/u)
  assert.match(job, /working-directory: examples\/agent-engineering/u)
})

test('progress keys keep the shape that stored first-part progress uses', () => {
  assert.equal(completeKey('en', '0.1-what-is-a-language-model'), 'ldd:complete:en:0.1-what-is-a-language-model')
  assert.equal(lastVisitKey('pt-br'), 'ldd:last:pt-br')
})

test('tracks 0–13 keep their lesson ids and orders', () => {
  // Progress keys and URLs are the lesson id; the first part must not move.
  const first = corpora.get('en').lessons.filter((item) => !NEW_TRACKS.has(item.track))
  assert.equal(first.length, 125)
  for (const item of first) {
    assert.ok(new RegExp(`/${item.track}/${item.id}\\.mdx$`, 'u').test(item.file), `${item.file}: id or track does not match its path`)
    assert.ok(existsSync(join(DIST, 'lessons', item.track, item.id, 'index.html')), `${item.id}: no built page`)
  }
})

test('the repairs ledger records every finding the spec assigns to the lanes', () => {
  const ledger = readdirSync(join(SPEC_DIR, 'repairs')).map((name) => readFileSync(join(SPEC_DIR, 'repairs', name), 'utf8')).join('\n')
  const findings = ['F03', 'F05', 'F10', 'F12', 'F16', 'F17', 'F18', 'F22', 'F23', 'F24', 'F26', 'F27', 'F32', 'F33', 'F34', 'F35', 'F36', 'F37', 'F38', 'F39', 'F42', 'F43', 'F44', 'F45']
  const missing = findings.filter((id) => !new RegExp(`\\b${id}\\b`, 'u').test(ledger))
  assert.deepEqual(missing, [])
})
