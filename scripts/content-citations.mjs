#!/usr/bin/env node
import { displayPath, finish, hasField, objectArrayField, readLessons, stringField } from './content-utils.mjs'

const REQUIRED_FIELDS = ['title', 'authors', 'year', 'url']

try {
  const lessons = readLessons()
  const failures = []
  for (const lesson of lessons) {
    const hasCitations = hasField(lesson.frontmatter, 'citations')
    const hasReason = hasField(lesson.frontmatter, 'citationsNotRequired')
    if (hasCitations === hasReason) {
      failures.push(displayPath(lesson.file) + ': provide exactly one of citations or citationsNotRequired')
      continue
    }
    if (hasReason) {
      const reason = stringField(lesson.frontmatter, 'citationsNotRequired', lesson.file)
      if (!reason?.trim()) failures.push(displayPath(lesson.file) + ': citationsNotRequired must state a non-empty reason')
      continue
    }
    const citations = objectArrayField(lesson.frontmatter, 'citations', lesson.file) ?? []
    if (citations.length === 0) {
      failures.push(displayPath(lesson.file) + ': citations must contain at least one entry')
      continue
    }
    citations.forEach((citation, index) => {
      const missing = REQUIRED_FIELDS.filter((field) => {
        const value = citation[field]
        return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
      })
      if (missing.length) failures.push(displayPath(lesson.file) + ': citation ' + (index + 1) + ' missing ' + missing.join(', '))
    })
  }
  finish('content:citations', failures, lessons.length + ' lessons have one valid citation policy')
} catch (error) {
  console.error('content:citations FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
