#!/usr/bin/env node
import { displayPath, finish, readLessons, stringArrayField } from './content-utils.mjs'

try {
  const lessons = readLessons()
  const failures = []
  const nodes = new Set(lessons.map((lesson) => lesson.id).filter(Boolean))
  const edges = new Map([...nodes].map((id) => [id, new Set()]))

  for (const lesson of lessons) {
    if (!lesson.id) {
      failures.push(displayPath(lesson.file) + ': missing id')
      continue
    }
    const prerequisites = stringArrayField(lesson.frontmatter, 'prerequisites', lesson.file) ?? []
    const unlocks = stringArrayField(lesson.frontmatter, 'unlocks', lesson.file) ?? []
    for (const prerequisite of prerequisites) {
      if (!nodes.has(prerequisite)) failures.push(displayPath(lesson.file) + ': prerequisite "' + prerequisite + '" does not resolve')
      else edges.get(prerequisite)?.add(lesson.id)
    }
    for (const unlocked of unlocks) {
      if (!nodes.has(unlocked)) failures.push(displayPath(lesson.file) + ': unlock "' + unlocked + '" does not resolve')
      else edges.get(lesson.id)?.add(unlocked)
    }
  }

  const state = new Map()
  const stack = []
  let cycle
  const visit = (node) => {
    if (cycle) return
    state.set(node, 'visiting')
    stack.push(node)
    for (const next of edges.get(node) ?? []) {
      if (state.get(next) === 'visiting') {
        const start = stack.indexOf(next)
        cycle = [...stack.slice(start), next]
        return
      }
      if (!state.has(next)) visit(next)
    }
    stack.pop()
    state.set(node, 'visited')
  }
  for (const node of nodes) if (!state.has(node)) visit(node)
  if (cycle) failures.push('cycle detected: ' + cycle.join(' -> '))

  const edgeCount = [...edges.values()].reduce((sum, targets) => sum + targets.size, 0)
  finish('content:graph', failures, nodes.size + ' lesson ids; ' + edgeCount + ' directed edges; no unresolved references or cycles')
} catch (error) {
  console.error('content:graph FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
