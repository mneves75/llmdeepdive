/**
 * Prose-overlap gate against the MoE handbook.
 *
 * The handbook has no licence, so the course cites its facts and reproduces
 * none of its prose. That rule is easy to state and easy to break by accident:
 * the first draft of the five MoE lessons shared about twenty passages of ten
 * words or more with the source, and no existing gate could see it, because
 * `content:citations` checks that a citation exists, not that the words are the
 * author's own.
 *
 * The source cannot live in this repository. Point `HANDBOOK_DIR` at a local
 * copy of the handbook's chapter files and run this:
 *
 *   HANDBOOK_DIR=/path/to/handbook pnpm content:overlap
 *
 * Without the directory the check reports SKIP and exits 0, so CI and a clone
 * without the source still build. It is an authoring gate, not a release gate —
 * run it before a lesson that draws on that source ships.
 *
 * What it ignores, and why:
 *   - the YAML frontmatter, because citation titles and author lists must be
 *     verbatim to be verifiable;
 *   - sequences shorter than the window, because shared technical phrasing
 *     ("the router's scores") is not copying.
 *
 * The window is 12 words. That is short enough to catch a lifted sentence and
 * long enough that a list of units and numbers does not trip it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const WINDOW = 12
const SOURCE = process.env.HANDBOOK_DIR ?? '.scratch/handbook'
const LESSONS = [
  '4-transformer/4.18-mixture-of-experts.mdx',
  '5-pretraining-at-scale/5.14-keeping-experts-busy.mdx',
  '5-pretraining-at-scale/5.15-upcycling-and-moe-stability.mdx',
  '5-pretraining-at-scale/5.16-expert-parallelism.mdx',
  '7-inference-and-efficiency/7.14-serving-an-moe.mdx',
]

const words = (text) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/<[^>]+>/gu, ' ')
    .replace(/[`*_>#|[\]]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/u)
    .filter(Boolean)

const body = (file) => {
  const raw = readFileSync(file, 'utf8')
  // Frontmatter is citation metadata; a title must match the source exactly.
  return raw.startsWith('---') ? raw.slice(raw.indexOf('\n---', 3) + 4) : raw
}

if (!existsSync(SOURCE)) {
  console.log(`content:overlap SKIP — no handbook copy at ${SOURCE}. Set HANDBOOK_DIR to check prose against the source.`)
  process.exit(0)
}

const sourceWords = readdirSync(SOURCE)
  .filter((name) => name.endsWith('.mdx') || name.endsWith('.md'))
  .flatMap((name) => words(readFileSync(join(SOURCE, name), 'utf8')))

const shingles = new Set()
for (let index = 0; index + WINDOW <= sourceWords.length; index += 1) {
  shingles.add(sourceWords.slice(index, index + WINDOW).join(' '))
}

const failures = []
for (const locale of ['en', 'pt-br']) {
  for (const lesson of LESSONS) {
    const file = join('src/content/lessons', locale, lesson)
    if (!existsSync(file)) continue
    const target = words(body(file))
    for (let index = 0; index + WINDOW <= target.length; index += 1) {
      const phrase = target.slice(index, index + WINDOW).join(' ')
      if (shingles.has(phrase)) {
        failures.push(`${file}:${index}: shares ${WINDOW}+ words with the handbook — "${phrase}"`)
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`content:overlap FAIL — ${failures.length} passage(s) reproduce the handbook:`)
  for (const failure of failures.slice(0, 20)) console.error('  ' + failure)
  process.exit(1)
}
console.log(`content:overlap PASS — no ${WINDOW}-word sequence of the MoE lessons appears in the handbook.`)
