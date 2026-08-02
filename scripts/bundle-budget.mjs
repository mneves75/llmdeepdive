#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { DIST_ROOT, displayPath, fileSize, finish, objectField, readLessons, walkFiles } from './content-utils.mjs'

const ROUTE_BUDGET_BYTES = 150 * 1024
const HTML_EXTENSIONS = new Set(['.html'])
const JS_EXTENSIONS = new Set(['.js', '.mjs'])

function localAsset(path, fromFile) {
  const clean = (path.split(/[?#]/u)[0] ?? '').replace(/^\/+/u, '')
  return path.startsWith('/') ? resolve(DIST_ROOT, clean) : resolve(dirname(fromFile), clean)
}

function directScripts(html, file) {
  const scripts = new Set()
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu,
    /<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+)["'][^>]*>/giu,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']modulepreload["'][^>]*>/giu,
  ]
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const source = match[1]
      if (source && !/^(?:https?:|data:)/iu.test(source)) scripts.add(localAsset(source, file))
    }
  }
  return scripts
}

function dependencyGraph(entry) {
  const visited = new Set()
  const visit = (file) => {
    if (visited.has(file) || !existsSync(file)) return
    visited.add(file)
    const source = readFileSync(file, 'utf8')
    const pattern = /(?:\bimport\s*(?:[^"'()]*?\sfrom\s*)?|\bexport\s+[^"']*?\sfrom\s*|\bimport\s*\()\s*["']([^"']+\.(?:m?js))(?:[?#][^"']*)?["']/gu
    for (const match of source.matchAll(pattern)) {
      const child = match[1]
      if (child && !/^(?:https?:|data:)/iu.test(child)) visit(localAsset(child, file))
    }
  }
  visit(entry)
  return visited
}

try {
  if (!existsSync(DIST_ROOT)) throw new Error(displayPath(DIST_ROOT) + ' does not exist; run pnpm build first')
  const htmlFiles = walkFiles(DIST_ROOT, HTML_EXTENSIONS).filter((file) => file.endsWith('index.html'))
  if (!htmlFiles.length) throw new Error(displayPath(DIST_ROOT) + ' contains no built index.html routes')
  const failures = []
  let worstRoute = { route: '/', bytes: 0 }

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8')
    const initial = new Set()
    for (const script of directScripts(html, file)) {
      if (!existsSync(script)) {
        failures.push(displayPath(file) + ': initial script ' + displayPath(script) + ' does not exist')
        continue
      }
      for (const dependency of dependencyGraph(script)) initial.add(dependency)
    }
    const bytes = [...initial].reduce((sum, script) => sum + fileSize(script), 0)
    const routeDirectory = relative(DIST_ROOT, dirname(file)).split(sep).join('/')
    const route = routeDirectory ? '/' + routeDirectory + '/' : '/'
    if (bytes > worstRoute.bytes) worstRoute = { route, bytes }
    if (bytes > ROUTE_BUDGET_BYTES) {
      failures.push(displayPath(file) + ': initial JS is ' + (bytes / 1024).toFixed(1) + ' KB; budget is 150.0 KB')
    }
  }

  const jsFiles = walkFiles(DIST_ROOT, JS_EXTENSIONS)
  const labs = readLessons().flatMap((lesson) => {
    const lab = objectField(lesson.frontmatter, 'lab', lesson.file)
    return lab ? [{ lesson, lab }] : []
  })
  for (const { lesson, lab } of labs) {
    const id = typeof lab.id === 'string' ? lab.id : ''
    const budgetKb = typeof lab.budgetKb === 'number' ? lab.budgetKb : Number.NaN
    if (!id || !Number.isFinite(budgetKb)) {
      failures.push(displayPath(lesson.file) + ': lab requires string id and numeric budgetKb')
      continue
    }
    const entryChunks = jsFiles.filter((file) => readFileSync(file, 'utf8').includes(id))
    if (!entryChunks.length) {
      failures.push(displayPath(lesson.file) + ': declared lab "' + id + '" has no identifiable JS chunk in dist/')
      continue
    }
    const graph = new Set()
    for (const entry of entryChunks) for (const dependency of dependencyGraph(entry)) graph.add(dependency)
    const bytes = [...graph].reduce((sum, file) => sum + fileSize(file), 0)
    if (bytes > budgetKb * 1024) {
      failures.push(displayPath(lesson.file) + ': lab "' + id + '" is ' + (bytes / 1024).toFixed(1) + ' KB; declared budget is ' + budgetKb.toFixed(1) + ' KB')
    }
  }

  finish(
    'bundle:budget',
    failures,
    htmlFiles.length + ' routes under 150 KB initial JS; worst ' + worstRoute.route + ' ' + (worstRoute.bytes / 1024).toFixed(1) + ' KB; ' + labs.length + ' declared lab(s) checked',
  )
} catch (error) {
  console.error('bundle:budget FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
