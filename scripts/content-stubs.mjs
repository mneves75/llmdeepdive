#!/usr/bin/env node
import { displayPath, finish, readLessons, wordCount } from './content-utils.mjs'

const STUB_PATTERN = /\b(TODO|TBD|FIXME|Lorem)\b/gu
const MINIMUM_WORDS = 400

try {
  const lessons = readLessons()
  const failures = []
  for (const lesson of lessons) {
    const markers = [...lesson.source.matchAll(STUB_PATTERN)].map((match) => match[0]).filter(Boolean)
    if (markers.length) {
      failures.push(displayPath(lesson.file) + ': stub marker(s): ' + [...new Set(markers)].join(', '))
    }
    const count = wordCount(lesson.body)
    if (count < MINIMUM_WORDS) {
      failures.push(displayPath(lesson.file) + ': body has ' + count + ' words; minimum is ' + MINIMUM_WORDS)
    }
  }
  finish('content:stubs', failures, lessons.length + ' lessons contain no stub markers and each has at least ' + MINIMUM_WORDS + ' words')
} catch (error) {
  console.error('content:stubs FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
