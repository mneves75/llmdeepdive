#!/usr/bin/env node
/**
 * Resolves every `<Figure id="…" />` in the corpus against the real registry.
 *
 * This exists because of a specific failure already recorded in MEMORY.md: all
 * ten content gates passed while 21 of the explorer's 26 lesson links returned
 * 404, because nothing resolved an id against the artefact it had to match.
 * Any value whose correctness is "it matches something else" needs a gate that
 * actually performs the match.
 *
 * What it CANNOT do is judge whether a figure is *true*. A figure can reference
 * a real lesson, carry both locales, and still put the right number on the wrong
 * wire. That needs a reader, not a script, and the reader pass is a separate
 * step — see AGENTS.md.
 */
import { readFileSync } from 'node:fs'
import { displayPath, finish, readLessons } from './content-utils.mjs'

const FIGURE_TAG = /<Figure\s+id="([^"]+)"\s*\/>/gu
const REGISTRY_ID = /^\s*'?([a-z0-9][a-z0-9-]*)'?\s*:\s*\{$/u

/** Lab ids, so a figure id can never collide with one. See the note below. */
const LAB_IDS = ['kv-budget', 'cost-per-token']

/**
 * Terms AGENTS.md keeps in English inside Portuguese prose. A pt-BR label equal
 * to its English twin is normally an untranslated copy-paste, but not when the
 * label IS one of these.
 */
const SHARED_TERMS = [
  'embedding', 'attention', 'fine-tuning', 'softmax', 'token', 'query', 'key',
  'value', 'prefill', 'decode', 'cache', 'transformer', 'batch', 'prompt',
]

/**
 * Read the registry by parsing its source rather than importing it: this script
 * runs under plain node in CI, and the registry is TypeScript with `~/` path
 * aliases that only Vite resolves.
 */
function registryIds() {
  const files = [
    'src/lib/figures/1-text-to-tensors.ts',
    'src/lib/figures/4-transformer.ts',
    'src/lib/figures/7-inference-and-efficiency.ts',
    'src/lib/figures/9-hardware-and-infrastructure.ts',
  ]
  const entries = new Map()
  for (const file of files) {
    let source
    try {
      source = readFileSync(file, 'utf8')
    } catch {
      throw new Error(`figure registry file ${file} is missing`)
    }
    let current = null
    for (const line of source.split('\n')) {
      const idMatch = line.match(REGISTRY_ID)
      if (idMatch && /^ {2}\S/u.test(line)) {
        current = idMatch[1]
        entries.set(current, { file, lesson: null, hasEn: false, hasPt: false })
        continue
      }
      if (!current) continue
      const lesson = line.match(/^\s*lesson:\s*'([^']+)'/u)
      if (lesson) entries.get(current).lesson = lesson[1]
      if (/\ben:\s*[`'"]/u.test(line)) entries.get(current).hasEn = true
      if (/'pt-br':\s*[`'"]/u.test(line)) entries.get(current).hasPt = true
    }
  }
  if (entries.size === 0) throw new Error('the figure registry parsed to zero entries')
  return entries
}

try {
  const failures = []
  const lessons = readLessons()
  if (lessons.length === 0) throw new Error('no lessons found — the corpus is missing')

  const registry = registryIds()
  const lessonIds = new Set(lessons.map((lesson) => lesson.id))

  // 1. Every registry entry points at a lesson that exists.
  for (const [id, entry] of registry) {
    if (!entry.lesson) {
      failures.push(`figure "${id}" (${entry.file}) declares no lesson`)
    } else if (!lessonIds.has(entry.lesson)) {
      failures.push(`figure "${id}" targets lesson "${entry.lesson}", which is not in the corpus`)
    }
    if (!entry.hasEn || !entry.hasPt) {
      failures.push(`figure "${id}" is missing an ${entry.hasEn ? 'pt-br' : 'en'} label`)
    }
    // bundle-budget.mjs charges a lab's budget by substring-matching its id
    // across dist/. A figure id containing a lab id would be billed to that lab.
    for (const lab of LAB_IDS) {
      if (id.includes(lab)) {
        failures.push(`figure id "${id}" contains lab id "${lab}"; bundle-budget.mjs would charge it to that lab`)
      }
    }
  }

  // 2. Every <Figure id> used in the corpus resolves, and both locales of a
  //    lesson reference exactly the same set of figures.
  const usedByLesson = new Map()
  for (const lesson of lessons) {
    const used = new Set()
    for (const match of lesson.body.matchAll(FIGURE_TAG)) {
      const id = match[1]
      used.add(id)
      if (!registry.has(id)) {
        failures.push(`${displayPath(lesson.file)}: <Figure id="${id}" /> is not in the registry`)
        continue
      }
      const target = registry.get(id).lesson
      if (target && target !== lesson.id) {
        failures.push(
          `${displayPath(lesson.file)}: uses figure "${id}", which is registered to lesson "${target}"`,
        )
      }
    }
    const key = `${lesson.locale}:${lesson.id}`
    usedByLesson.set(key, used)
  }

  for (const lesson of lessons) {
    if (lesson.locale !== 'en') continue
    const en = usedByLesson.get(`en:${lesson.id}`) ?? new Set()
    const pt = usedByLesson.get(`pt-br:${lesson.id}`) ?? new Set()
    const missingPt = [...en].filter((id) => !pt.has(id))
    const missingEn = [...pt].filter((id) => !en.has(id))
    if (missingPt.length) failures.push(`lesson "${lesson.id}": pt-br is missing figure(s) ${missingPt.join(', ')}`)
    if (missingEn.length) failures.push(`lesson "${lesson.id}": en is missing figure(s) ${missingEn.join(', ')}`)
  }

  // 3. A pt-BR label identical to its English twin is an untranslated
  //    copy-paste — the failure a parallel authoring lane actually produces, and
  //    one that "both locales reference the same ids" cannot see.
  //
  //    Only PROSE is checked. A great deal of legitimate figure text is
  //    notation that must stay byte-identical across locales: corpus tokens
  //    (`l o w e s t _`), arithmetic (`5 + 2 + 3 = 10`), shapes (`5120 → 6144`)
  //    and units. The test for prose is two or more words of four letters or
  //    more, which every real sentence passes and no notation does.
  //
  //    Code identifiers are stripped first. `k_proj · v_proj` is a tensor name,
  //    not English, and must stay byte-identical in both locales — but "proj"
  //    twice would otherwise count as two words and flag it.
  //    Each dotted or underscored segment must START WITH A LETTER. Allowing a
  //    numeric segment made the pattern eat versioned model names: `Qwen3.8`
  //    matched, so `isProse('Qwen3.8 works')` dropped to one long word and
  //    returned false — an untranslated short label containing the course's own
  //    model name would have passed the gate silently.
  const isProse = (text) => {
    const withoutIdentifiers = text.replace(
      /[A-Za-z][A-Za-z0-9]*(?:[_.][A-Za-z][A-Za-z0-9]*)+/gu,
      ' ',
    )
    return (withoutIdentifiers.match(/[A-Za-zÀ-ÿ]{4,}/gu) ?? []).length >= 2
  }

  for (const file of new Set([...registry.values()].map((entry) => entry.file))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(
      /\{\s*en:\s*'((?:[^'\\]|\\.){12,}?)',\s*'pt-br':\s*'((?:[^'\\]|\\.)+?)'\s*\}/gu,
    )) {
      const [, en, pt] = match
      if (en !== pt) continue
      if (!isProse(en)) continue
      if (SHARED_TERMS.includes(en.toLowerCase())) continue
      failures.push(`${file}: pt-br label is identical to en and is not a term that stays English — "${en}"`)
    }
  }

  finish('content:figures', failures, `${registry.size} figure(s) resolve against ${lessonIds.size} lesson id(s)`)
} catch (error) {
  console.error(`content:figures failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
