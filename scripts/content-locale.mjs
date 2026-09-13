import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkMath from 'remark-math'
import { visit } from 'unist-util-visit'

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkMath)
const DOTTED_NUMBER = /(?<![\p{L}\p{N}_])(\d+(?:\.\d+)+)(?![\p{L}\p{N}_])/gu
const THOUSANDS = /^\d{1,3}(?:\.\d{3})+$/u
const REFERENCE_OR_VERSION = /(?:seção|capítulo|track|versão|version|release|apache|cuda|python|node|astro|pnpm|vllm|sglang)\s*$/iu
const COURSE_REFERENCE = /liç(?:ão|ões)[^\n;:]*$/iu
const PARAMETER_NOTATION = /(?:temperature|top_p|top_k|gpu_memory_utilization|epsilon|alpha|beta)\s*$/iu
const FRONTMATTER_PROSE = /^\s*(?:title|summary|analogy|prompt|modelAnswer|question|options|explanation):\s*(.*)$/u

/**
 * Math must remain byte-identical between locales except for prose inside
 * balanced \text{...} commands. The brace-aware scan avoids treating a nested
 * command as the end of the translated span.
 */
export function normalizeMathText(value) {
  let output = ''
  let cursor = 0

  while (cursor < value.length) {
    const start = value.indexOf('\\text{', cursor)
    if (start === -1) return output + value.slice(cursor)

    let depth = 1
    let position = start + '\\text{'.length
    while (position < value.length && depth > 0) {
      const character = value[position]
      if (character === '\\') {
        position += 2
        continue
      }
      if (character === '{') depth += 1
      else if (character === '}') depth -= 1
      position += 1
    }

    // Let a malformed expression fail through the normal comparison/build path.
    if (depth !== 0) return output + value.slice(cursor)
    output += value.slice(cursor, start) + '\\text{<translated>}'
    cursor = position
  }

  return output
}

function parseLesson(body) {
  return parser.parse(body)
}

function mathEntries(body) {
  const entries = []
  visit(parseLesson(body), (node) => {
    if (node.type !== 'math' && node.type !== 'inlineMath') return
    entries.push({
      kind: node.type,
      raw: node.value,
      normalized: normalizeMathText(node.value),
    })
  })
  return entries
}

function proseSegments(lesson) {
  const segments = []
  visit(parseLesson(lesson.body), 'text', (node) => {
    segments.push(node.value)
  })
  for (const line of lesson.frontmatter.split(/\r?\n/u)) {
    const match = line.match(FRONTMATTER_PROSE)
    if (match?.[1]) segments.push(match[1].replace(/`[^`]*`/gu, ''))
  }
  return segments
}

function dottedNumberFailures(lesson, math) {
  const failures = []
  const mathLiterals = new Set(
    math.flatMap((entry) => [...entry.raw.matchAll(DOTTED_NUMBER)].map((match) => match[1])),
  )

  for (const segment of proseSegments(lesson)) {
    for (const match of segment.matchAll(DOTTED_NUMBER)) {
      const literal = match[1]
      const prefix = segment.slice(0, match.index)
      if (REFERENCE_OR_VERSION.test(prefix)) continue
      if (COURSE_REFERENCE.test(prefix)) continue
      if (PARAMETER_NOTATION.test(prefix)) continue
      if (THOUSANDS.test(literal) && !mathLiterals.has(literal)) continue
      if (!mathLiterals.has(literal)) continue
      failures.push(
        `pt-br prose uses decimal point "${literal}" instead of a comma in "${segment.trim()}"`,
      )
    }
  }

  return [...new Set(failures)]
}

/**
 * Returns only high-confidence bilingual failures. Ambiguous dotted numbers are
 * left to the reader rather than turning this gate into a noisy heuristic.
 */
export function bilingualContentFailures(english, portuguese) {
  const failures = []
  let enMath
  let ptMath
  try {
    enMath = mathEntries(english.body)
    ptMath = mathEntries(portuguese.body)
  } catch (error) {
    return [
      `cannot parse bilingual MDX for lesson "${english.id}": ${error instanceof Error ? error.message : String(error)}`,
    ]
  }

  if (enMath.length !== ptMath.length) {
    failures.push(
      `lesson "${english.id}" has ${enMath.length} math span(s) in en but ${ptMath.length} in pt-br`,
    )
  }

  const comparable = Math.min(enMath.length, ptMath.length)
  for (let index = 0; index < comparable; index += 1) {
    const en = enMath[index]
    const pt = ptMath[index]
    if (en.kind === pt.kind && en.normalized === pt.normalized) continue
    failures.push(
      `lesson "${english.id}" math span ${index + 1} differs outside translated \\text{...}: ` +
        `en=${JSON.stringify(en.raw)} pt-br=${JSON.stringify(pt.raw)}`,
    )
  }

  failures.push(...dottedNumberFailures(portuguese, ptMath).map(
    (failure) => `lesson "${english.id}": ${failure}`,
  ))
  return failures
}
