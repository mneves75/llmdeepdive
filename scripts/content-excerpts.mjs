#!/usr/bin/env node
/**
 * Every code block that names a file in the examples project must match it.
 *
 * A fenced block whose first line is `# file: examples/agent-engineering/<path>`
 * (or `// file: …`) claims to quote that file; every line after the header
 * must appear in the file verbatim and contiguously. The examples suites run
 * the file, so the gate is what ties a lesson's code to code a test runs.
 */
import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { displayPath, finish, readLessons } from './content-utils.mjs'

const REPO_ROOT = resolve(process.env.LLMDEEPDIVE_REPO_ROOT ?? '.')
const PROJECT = resolve(REPO_ROOT, 'examples/agent-engineering')
const FENCE = /^```[^\n]*\n([\s\S]*?)^```/gmu
const HEADER = /^(?:#|\/\/) file: (\S+)\s*$/u

try {
  const failures = []
  let checked = 0
  for (const lesson of readLessons()) {
    for (const match of lesson.body.matchAll(FENCE)) {
      const lines = (match[1] ?? '').replace(/\n$/u, '').split('\n')
      const header = lines[0]?.match(HEADER)
      if (!header) continue
      checked += 1
      const path = header[1] ?? ''
      const file = resolve(REPO_ROOT, path)
      const inside = relative(PROJECT, file)
      if (inside.startsWith('..') || inside.split(sep).includes('..') || resolve(PROJECT, inside) !== file) {
        failures.push(displayPath(lesson.file) + ': excerpt path ' + path + ' is outside examples/agent-engineering')
        continue
      }
      if (!existsSync(file)) {
        failures.push(displayPath(lesson.file) + ': excerpt file ' + path + ' does not exist')
        continue
      }
      const excerpt = lines.slice(1)
      if (excerpt.length === 0 || !readFileSync(file, 'utf8').includes(excerpt.join('\n'))) {
        failures.push(displayPath(lesson.file) + ': excerpt of ' + path + ' does not match the file (lines must be verbatim and contiguous)')
      }
    }
  }
  finish('content:excerpts', failures, checked + ' code excerpts match the examples project')
} catch (error) {
  console.error('content:excerpts FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
