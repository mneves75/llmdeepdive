#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { DIST_ROOT, displayPath, fileSize, finish, objectField, readLessons, walkFiles } from './content-utils.mjs'

const ROUTE_BUDGET_BYTES = 150 * 1024
/**
 * Per-route render-blocking CSS ceiling.
 *
 * Until this landed, CSS was completely ungated: the script counted .js/.mjs and
 * inline <script> only, while one stylesheet ships to all 210 lesson pages. A
 * figure library is exactly the change that grows a stylesheet without touching
 * a byte of JavaScript.
 *
 * MEASURED, not guessed. A lesson route is 58.9 KB uncompressed today —
 * 25.3 KB Base plus 33.6 KB Lesson-and-figures — of which the figure system is
 * roughly 14.7 KB. All of it is linked and served immutable for a year, so it
 * is one cached fetch rather than per-page weight; the gate is here to catch
 * unbounded growth, not to argue the current number is wrong.
 *
 * 72 KB leaves about 22% headroom. Deliberately not pinned to today's size: a
 * budget set at the current number fails on the next legitimate rule and gets
 * raised reflexively until it means nothing.
 */
const ROUTE_CSS_BUDGET_BYTES = 72 * 1024
const HTML_EXTENSIONS = new Set(['.html'])
const JS_EXTENSIONS = new Set(['.js', '.mjs'])

function localAsset(path, fromFile) {
  const clean = (path.split(/[?#]/u)[0] ?? '').replace(/^\/+/u, '')
  return path.startsWith('/') ? resolve(DIST_ROOT, clean) : resolve(dirname(fromFile), clean)
}

function directStylesheets(html, file) {
  const sheets = new Set()
  const patterns = [
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/giu,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["'][^>]*>/giu,
  ]
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const href = match[1]
      if (!href || /^(?:https?:)?\/\//u.test(href) || href.startsWith('data:')) continue
      sheets.add(localAsset(href, file))
    }
  }
  return [...sheets]
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

// Astro inlines small scripts straight into the HTML. Those bytes are JS the
// route ships and the visitor parses, but they have no file to walk, so a
// src-only measurement silently under-reports every page — and a small enough
// lab could escape its declared budget entirely.
function inlineScripts(html) {
  const bodies = []
  for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/giu)) {
    if (match[1]) bodies.push(match[1])
  }
  return bodies
}

// Maps a lesson source file to the exact route directory its HTML is built into,
// as a path relative to dist/. Compare it for equality, never as a substring: the
// en route "lessons/<track>/<id>" is itself a substring of the pt-br route
// "pt-br/lessons/<track>/<id>", so a loose match charges every lab twice.
function lessonRoutePath(lesson) {
  const match = /lessons[\\/](en|pt-br)[\\/]([^\\/]+)[\\/](.+)\.mdx?$/u.exec(lesson.file)
  if (!match) return ''
  const [, locale, track, id] = match
  return (locale === 'en' ? ['lessons', track, id] : ['pt-br', 'lessons', track, id]).join('/')
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
  let worstCssRoute = { route: '/', bytes: 0 }

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
    const inlineBytes = inlineScripts(html).reduce((sum, body) => sum + Buffer.byteLength(body, 'utf8'), 0)
    const bytes = [...initial].reduce((sum, script) => sum + fileSize(script), 0) + inlineBytes
    const routeDirectory = relative(DIST_ROOT, dirname(file)).split(sep).join('/')
    const route = routeDirectory ? '/' + routeDirectory + '/' : '/'
    if (bytes > worstRoute.bytes) worstRoute = { route, bytes }
    if (bytes > ROUTE_BUDGET_BYTES) {
      failures.push(displayPath(file) + ': initial JS is ' + (bytes / 1024).toFixed(1) + ' KB; budget is 150.0 KB')
    }

    // CSS is render-blocking on every one of these routes, so it belongs in a
    // budget just as much as the JavaScript does.
    let cssBytes = 0
    for (const sheet of directStylesheets(html, file)) {
      if (!existsSync(sheet)) {
        failures.push(displayPath(file) + ': stylesheet ' + displayPath(sheet) + ' does not exist')
        continue
      }
      cssBytes += fileSize(sheet)
    }
    if (cssBytes > worstCssRoute.bytes) worstCssRoute = { route, bytes: cssBytes }
    if (cssBytes > ROUTE_CSS_BUDGET_BYTES) {
      failures.push(
        displayPath(file) + ': render-blocking CSS is ' + (cssBytes / 1024).toFixed(1) +
        ' KB; budget is ' + (ROUTE_CSS_BUDGET_BYTES / 1024).toFixed(1) + ' KB',
      )
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
    // A lab may ship as a bundled chunk or, when small, inlined into its page.
    const routePath = lessonRoutePath(lesson)
    const inlineBytes = htmlFiles
      .filter((file) => relative(DIST_ROOT, dirname(file)).split(sep).join('/') === routePath)
      .flatMap((file) => inlineScripts(readFileSync(file, 'utf8')))
      .filter((body) => body.includes(id))
      .reduce((sum, body) => sum + Buffer.byteLength(body, 'utf8'), 0)
    if (!entryChunks.length && !inlineBytes) {
      failures.push(displayPath(lesson.file) + ': declared lab "' + id + '" has no identifiable JS in dist/')
      continue
    }
    const graph = new Set()
    for (const entry of entryChunks) for (const dependency of dependencyGraph(entry)) graph.add(dependency)
    const bytes = [...graph].reduce((sum, file) => sum + fileSize(file), 0) + inlineBytes
    if (bytes > budgetKb * 1024) {
      failures.push(displayPath(lesson.file) + ': lab "' + id + '" is ' + (bytes / 1024).toFixed(1) + ' KB; declared budget is ' + budgetKb.toFixed(1) + ' KB')
    }
  }

  finish(
    'bundle:budget',
    failures,
    htmlFiles.length + ' routes under 150 KB initial JS (worst ' + worstRoute.route + ' ' + (worstRoute.bytes / 1024).toFixed(1) +
      ' KB) and under ' + (ROUTE_CSS_BUDGET_BYTES / 1024).toFixed(0) + ' KB CSS (worst ' + worstCssRoute.route + ' ' +
      (worstCssRoute.bytes / 1024).toFixed(1) + ' KB); ' + labs.length + ' declared lab(s) checked',
  )
} catch (error) {
  console.error('bundle:budget FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
