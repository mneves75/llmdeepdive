import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

export const CONTENT_ROOT = resolve(process.env.LLMDEEPDIVE_CONTENT_ROOT ?? 'src/content')
export const LESSONS_ROOT = resolve(CONTENT_ROOT, 'lessons')
export const TRACKS_ROOT = resolve(CONTENT_ROOT, 'tracks')
export const PUBLIC_ROOT = resolve(process.env.LLMDEEPDIVE_PUBLIC_ROOT ?? 'public')
export const DIST_ROOT = resolve(process.env.LLMDEEPDIVE_DIST_ROOT ?? 'dist')

const LESSON_EXTENSIONS = new Set(['.md', '.mdx'])

function extension(file) {
  const dot = file.lastIndexOf('.')
  return dot === -1 ? '' : file.slice(dot)
}

export function walkFiles(root, acceptedExtensions) {
  if (!existsSync(root)) return []
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (!acceptedExtensions || acceptedExtensions.has(extension(entry.name))) files.push(full)
    }
  }
  visit(root)
  return files.sort()
}

export function displayPath(file) {
  return relative(process.cwd(), file) || file
}

export function splitFrontmatter(file) {
  const source = readFileSync(file, 'utf8')
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u)
  if (!match) throw new Error(displayPath(file) + ': expected YAML frontmatter delimited by ---')
  return { frontmatter: match[1] ?? '', body: match[2] ?? '', source }
}

function parseScalar(raw, file, field) {
  const value = raw.trim()
  if (value === '') return ''
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/u.test(value)) return Number(value)
  if (value.startsWith('"') || value.startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(displayPath(file) + ': cannot parse ' + field + ': ' + detail)
    }
  }
  return value
}

export function hasField(frontmatter, field) {
  return new RegExp('^' + field + ':', 'mu').test(frontmatter)
}

export function scalarField(frontmatter, field, file) {
  const match = frontmatter.match(new RegExp('^' + field + ':\\s*(.*)$', 'mu'))
  if (!match) return undefined
  return parseScalar(match[1] ?? '', file, field)
}

export function stringField(frontmatter, field, file) {
  const value = scalarField(frontmatter, field, file)
  return typeof value === 'string' ? value : undefined
}

export function stringArrayField(frontmatter, field, file) {
  const value = scalarField(frontmatter, field, file)
  if (value === undefined) return undefined
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(displayPath(file) + ': ' + field + ' must be an inline array of strings')
  }
  return value
}

function sectionLines(frontmatter, field) {
  const lines = frontmatter.split(/\r?\n/u)
  const start = lines.findIndex((line) => line === field + ':')
  if (start === -1) return undefined
  const section = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (line !== '' && !line.startsWith(' ')) break
    section.push(line)
  }
  return section
}

export function objectField(frontmatter, field, file) {
  const lines = sectionLines(frontmatter, field)
  if (!lines) return undefined
  const result = {}
  for (const line of lines) {
    const match = line.match(/^  ([A-Za-z][A-Za-z0-9]*):\s*(.*)$/u)
    if (!match) continue
    const key = match[1]
    if (!key) continue
    result[key] = parseScalar(match[2] ?? '', file, field + '.' + key)
  }
  return result
}

export function objectArrayField(frontmatter, field, file) {
  const lines = sectionLines(frontmatter, field)
  if (!lines) return undefined
  const result = []
  let current
  for (const line of lines) {
    const first = line.match(/^  - ([A-Za-z][A-Za-z0-9]*):\s*(.*)$/u)
    if (first) {
      current = {}
      result.push(current)
      const key = first[1]
      if (key) current[key] = parseScalar(first[2] ?? '', file, field + '.' + key)
      continue
    }
    const property = line.match(/^    ([A-Za-z][A-Za-z0-9]*):\s*(.*)$/u)
    if (property && current) {
      const key = property[1]
      if (key) current[key] = parseScalar(property[2] ?? '', file, field + '.' + key)
    }
  }
  return result
}

export function readLessons() {
  if (!existsSync(LESSONS_ROOT)) {
    throw new Error(displayPath(LESSONS_ROOT) + ' does not exist')
  }
  const files = walkFiles(LESSONS_ROOT, LESSON_EXTENSIONS)
  if (files.length === 0) {
    throw new Error(displayPath(LESSONS_ROOT) + ' contains no lesson files')
  }
  return files.map((file) => {
    const parsed = splitFrontmatter(file)
    const relativeParts = relative(LESSONS_ROOT, file).split(sep)
    const locale = relativeParts[0] ?? ''
    const id = stringField(parsed.frontmatter, 'id', file)
    return { file, locale, id, ...parsed }
  })
}

export function wordCount(text) {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’_-]*/gu)?.length ?? 0
}

export function fileSize(file) {
  return statSync(file).size
}

export function finish(name, failures, success) {
  if (failures.length > 0) {
    console.error(name + ' FAIL — ' + failures.length + ' issue(s)')
    for (const failure of failures) console.error('- ' + failure)
    process.exitCode = 1
    return
  }
  console.log(name + ' PASS — ' + success)
}
