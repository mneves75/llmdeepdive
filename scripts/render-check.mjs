#!/usr/bin/env node
/**
 * render:check — what the built site looks like in real browser engines.
 *
 * Every other gate reads source or HTML. Two shipped defects were invisible to
 * all of them and only a rendered page showed them: 0.6.3 lifted every inline
 * formula off its text line (an inline-block scroll container takes its
 * baseline from its bottom edge), and removing that rule made twelve routes
 * scroll sideways at 320px. This serves `dist/` locally and, in Chromium,
 * WebKit and Firefox, checks every route at a 320px viewport for horizontal
 * overflow, duplicate ids, uncaught page errors and scroll wrappers whose
 * region semantics disagree with whether they overflow, then checks that inline
 * maths sits exactly where unstyled maths would.
 *
 * `--self-test` injects each defect on purpose and requires the gate to fail:
 * a check never seen red is not a check. `RENDER_BROWSERS=chromium` narrows
 * the engines for a quick local run.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, relative, sep } from 'node:path'
import { chromium, firefox, webkit } from 'playwright'
import { DIST_ROOT, walkFiles } from './content-utils.mjs'

const ENGINES = { chromium, webkit, firefox }
const BASELINE_ROUTES = [
  '/lessons/0-orientation-and-foundations/0.5-matrix-multiplication-transformation/',
  '/pt-br/lessons/7-inference-and-efficiency/7.7-flashattention-and-io-awareness/',
]
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm',
  '.pf_meta': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pf_fragment': 'application/octet-stream',
}
const selfTest = process.argv.includes('--self-test')

function serveDist() {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname)
    let file = normalize(join(DIST_ROOT, path))
    if (!file.startsWith(DIST_ROOT + sep) && file !== DIST_ROOT) {
      response.writeHead(403).end()
      return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    const found = existsSync(file) && statSync(file).isFile()
    if (!found) file = join(DIST_ROOT, '404.html')
    response.writeHead(found ? 200 : 404, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

function routes() {
  return walkFiles(DIST_ROOT, new Set(['.html']))
    .filter((file) => file.endsWith(`${sep}index.html`))
    .map((file) => '/' + relative(DIST_ROOT, file).split(sep).slice(0, -1).map((part) => part + '/').join(''))
    .sort()
}

const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

async function layoutFailures(page) {
  return page.evaluate(() => {
    const failures = []
    const root = document.documentElement
    if (root.scrollWidth > root.clientWidth) failures.push(`page overflows horizontally by ${root.scrollWidth - root.clientWidth}px`)
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id)
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
    if (duplicates.length) failures.push(`duplicate ids: ${duplicates.slice(0, 5).join(', ')}`)
    const wrong = [...document.querySelectorAll('.math-scroll, .table-scroll')]
      .filter((region) => (region.scrollWidth > region.clientWidth + 1) !== (region.getAttribute('role') === 'region'))
    if (wrong.length) failures.push(`${wrong.length} scroll wrapper(s) with region semantics that disagree with their overflow`)
    return failures
  })
}

// Compares every inline formula's position with the position it has once the
// lesson's inline-maths rule is neutralised. Any baseline shift moves the
// formula and every line after it, so a single pixel is a real regression.
async function baselineFailures(page) {
  return page.evaluate(() => {
    const formulas = [...document.querySelectorAll('.prose .katex:not(.math-scroll)')]
    if (formulas.length === 0) return ['no inline formulas found to measure']
    const bottoms = () => formulas.map((formula) => formula.querySelector('math')?.getBoundingClientRect().bottom ?? Number.NaN)
    const styled = bottoms()
    const neutral = document.createElement('style')
    neutral.textContent = '.prose .katex:not(.math-scroll) { display: inline !important; overflow: visible !important; max-inline-size: none !important; }'
    document.head.append(neutral)
    const unstyled = bottoms()
    neutral.remove()
    const shift = Math.max(...styled.map((value, index) => Math.abs(value - (unstyled[index] ?? Number.NaN))))
    return Number.isFinite(shift) && shift <= 0.5 ? [] : [`inline maths moves ${shift.toFixed(1)}px off the unstyled baseline`]
  })
}

async function checkEngine(name, base, allRoutes) {
  const browser = await ENGINES[name].launch()
  const failures = []
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 740 } })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const route of allRoutes) {
      errors.length = 0
      await page.goto(base + route, { waitUntil: 'load' })
      if (selfTest && route === allRoutes[0]) {
        await page.evaluate(() => {
          const wide = document.createElement('span')
          wide.style.cssText = 'display: inline-block; inline-size: 2000px; block-size: 1px'
          document.querySelector('main')?.prepend(wide)
        })
      }
      await settle(page)
      for (const failure of [...await layoutFailures(page), ...errors.map((message) => `uncaught error: ${message}`)]) {
        failures.push(`${name} ${route}: ${failure}`)
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 })
    for (const route of BASELINE_ROUTES) {
      await page.goto(base + route, { waitUntil: 'load' })
      if (selfTest) await page.addStyleTag({ content: '.lesson-shell .katex:not(.math-scroll) { display: inline-block !important; baseline-source: auto !important; overflow-x: auto !important; }' })
      await settle(page)
      for (const failure of await baselineFailures(page)) failures.push(`${name} ${route} @1280: ${failure}`)
    }
  } finally {
    await browser.close()
  }
  return failures
}

const server = await serveDist()
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const engines = (process.env.RENDER_BROWSERS ?? 'chromium,webkit,firefox').split(',').map((engine) => engine.trim()).filter(Boolean)
  const unknown = engines.filter((engine) => !(engine in ENGINES))
  if (unknown.length) throw new Error('unknown engine(s): ' + unknown.join(', '))
  const allRoutes = routes()
  if (allRoutes.length === 0) throw new Error('dist/ has no routes; run pnpm build first')
  for (const route of BASELINE_ROUTES) if (!allRoutes.includes(route)) throw new Error('baseline route missing from dist/: ' + route)
  const checked = selfTest ? allRoutes.slice(0, 1) : allRoutes

  const failures = []
  for (const engine of engines) failures.push(...await checkEngine(engine, base, checked))

  if (selfTest) {
    const expected = engines.flatMap((engine) => [
      `${engine} ${checked[0]}: page overflows`,
      ...BASELINE_ROUTES.map((route) => `${engine} ${route} @1280: inline maths moves`),
    ])
    const missed = expected.filter((prefix) => !failures.some((failure) => failure.startsWith(prefix)))
    if (missed.length) {
      console.error('render:check SELF-TEST FAIL — injected defects went undetected:')
      for (const miss of missed) console.error('- ' + miss)
      process.exitCode = 1
    } else {
      console.log(`render:check SELF-TEST PASS — every injected defect was caught in ${engines.join(', ')}`)
    }
  } else if (failures.length) {
    console.error(`render:check FAIL — ${failures.length} issue(s)`)
    for (const failure of failures) console.error('- ' + failure)
    process.exitCode = 1
  } else {
    console.log(`render:check PASS — ${allRoutes.length} routes at 320px and ${BASELINE_ROUTES.length} inline-maths baselines in ${engines.join(', ')}`)
  }
} catch (error) {
  console.error('render:check FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
} finally {
  server.close()
}
