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
 * maths sits exactly where unstyled maths would. On /explore/ it leaves the
 * page while the 3D stage is still loading, which must not be reported as a
 * failure, and breaks the stage chunk, which must be.
 *
 * The site uses system fonts only, so layout depends on what a visitor has
 * installed: CI's Linux fonts overflowed a pt-BR heading that condensed Avenir
 * on macOS never did. Chromium therefore makes a second pass with every font
 * token forced to a wide sans (Verdana, or DejaVu Sans, its Linux equivalent),
 * so the same fallback fragility fails on any machine.
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

// Leaving /explore/ while its three.js chunks are in flight is not a stage
// failure, but WebKit and Firefox reject the import when navigation cancels
// the chunks, and 0.6.6 logged "[explorer] 3D stage failed to start" for it.
// The destination is held back two seconds, so the old page stays alive long
// after the cancellation, as it does on a slow network; the visitor then comes
// back and the stage must boot. The other half keeps the fix
// honest: a chunk that really fails must be reported and restore the poster.
// An engine without WebGL shows the no-WebGL notice instead of loading the
// stage, and is reported as not covered rather than passed.
const STAGE_CHUNK = /\/_astro\/stage\.[^/]+\.js$/
const explorerEngines = []
const explorerRestoreUncovered = []
const stageHidden = (page) => page.evaluate(() => document.querySelector('[data-stage-canvas]')?.hidden)
const stageBoots = (page) => page
  .waitForFunction(() => document.querySelector('[data-stage-canvas]')?.hidden === false, null, { timeout: 15_000 })
  .then(() => true, () => false)

async function openExplorer(browser, base, handleChunk) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const logged = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().startsWith('[explorer]')) logged.push(message.text())
  })
  await page.route(STAGE_CHUNK, handleChunk)
  const requested = page.waitForRequest(STAGE_CHUNK, { timeout: 15_000 }).then(() => 'loading', () => 'neither')
  await page.goto(base + '/explore/', { waitUntil: 'load' })
  const noWebgl = page.waitForSelector('[data-nowebgl]:not([hidden])', { timeout: 15_000 }).then(() => 'no-webgl', () => 'neither')
  return { page, logged, outcome: await Promise.race([requested, noWebgl]) }
}

async function explorerFailures(browser, name, base) {
  const failures = []
  // The chunk is held until the click and then aborted, which is what WebKit
  // and Firefox do themselves; Chromium would keep a held request pending
  // forever, which no real network does.
  let release = () => {}
  const released = new Promise((resolve) => { release = resolve })
  const left = await openExplorer(browser, base, async (route) => {
    await released
    await route.abort('aborted').catch(() => {})
  })
  try {
    if (left.outcome === 'no-webgl') return { covered: false, failures }
    if (left.outcome !== 'loading') return { covered: true, failures: [`${name} /explore/: the stage neither loaded nor showed the no-WebGL notice`] }
    const { page } = left
    if (selfTest) await page.evaluate(() => { const canvas = document.querySelector('[data-stage-canvas]'); if (canvas) canvas.hidden = false })
    if ((await stageHidden(page)) !== true) failures.push(`${name} /explore/: the stage was not still loading at the click, so leaving mid-boot went untested`)
    await page.route('**/lessons/**', async (route) => {
      if (route.request().resourceType() === 'document') await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue().catch(() => {})
    })
    if (selfTest) await page.evaluate(() => console.error('[explorer] injected on leave'))
    const cta = page.locator('[data-detail-cta]').first()
    const href = await cta.getAttribute('href')
    const arrived = page.waitForURL((url) => url.pathname === href, { timeout: 15_000 })
    await cta.click()
    release()
    await arrived
    await page.waitForTimeout(1000)
    await page.unroute(STAGE_CHUNK)
    await page.goBack({ waitUntil: 'load' })
    // Scroll restoration returns below the stage, which loads only in view.
    // Scrolling is withheld in the self-test, so the stage never boots.
    if (!selfTest) await page.locator('[data-stage-canvas]').evaluate((canvas) => canvas.parentElement?.scrollIntoView({ block: 'center' }))
    const booted = await stageBoots(page)
    await page.waitForTimeout(1500)
    if (left.logged.length) failures.push(`${name} /explore/: leaving mid-boot reported a stage failure: ${left.logged[0]}`)
    if (!booted) failures.push(`${name} /explore/: coming back after leaving mid-boot did not boot the stage`)
  } finally {
    release()
    await left.page.close()
  }

  // A back/forward-cache restore of a page left mid-boot. Playwright's engines
  // reload on back instead, so the restore is replayed in place: the page is
  // marked as navigating, the chunk is cancelled, and a persisted `pageshow`
  // must reload into a document that boots, because Chromium and WebKit never
  // retry a module import that failed once in the same document.
  let cancel = () => {}
  const cancelled = new Promise((resolve) => { cancel = resolve })
  const restored = await openExplorer(browser, base, async (route) => {
    await cancelled
    await route.abort('aborted').catch(() => {})
  })
  try {
    const { page } = restored
    await page.evaluate(() => {
      const leave = Object.assign(new Event('navigate'), { destination: { sameDocument: false }, downloadRequest: null })
      window.navigation?.dispatchEvent(leave)
    })
    if (selfTest) await page.evaluate(() => console.error('[explorer] injected on restore'))
    const failed = page.waitForEvent('requestfailed', { predicate: (request) => STAGE_CHUNK.test(request.url()) })
    cancel()
    await failed
    await page.unroute(STAGE_CHUNK)
    await page.waitForTimeout(300)
    let refetched = false
    page.on('request', (request) => { if (STAGE_CHUNK.test(request.url())) refetched = true })
    const reloaded = page.waitForEvent('load', { timeout: 10_000 }).then(() => true, () => false)
    if (!selfTest) {
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))).catch(() => {})
    }
    const didReload = await reloaded
    const booted = didReload && (await stageBoots(page))
    if (name === 'webkit' && didReload && !refetched) {
      // WebKit keeps a failed module across a reload, even a plain one after a
      // genuine server error, so no page can recover it there. Not a pass, and
      // only WebKit: Chromium and Firefox refetch, so there it stays a failure.
      explorerRestoreUncovered.push(name)
    } else {
      if (restored.logged.length) failures.push(`${name} /explore/: a restore after leaving mid-boot reported a stage failure: ${restored.logged[0]}`)
      if (!booted) failures.push(`${name} /explore/: a back/forward-cache restore after leaving mid-boot did not boot the stage`)
    }
  } finally {
    cancel()
    await restored.page.close()
  }

  const broken = await openExplorer(browser, base, (route) => (selfTest ? route.continue() : route.abort()))
  try {
    const { page } = broken
    const noticed = await page.waitForSelector('[data-nowebgl]:not([hidden])', { timeout: 10_000 }).then(() => true, () => false)
    const posterBack = await page.evaluate(() => document.querySelector('[data-poster]')?.hidden === false)
    if (!noticed || !posterBack || (await stageHidden(page)) !== true || broken.logged.length === 0) {
      failures.push(`${name} /explore/: a failed stage import was not reported with the poster restored`)
    }
  } finally {
    await broken.page.close()
  }
  return { covered: true, failures }
}

const WIDE_FONTS = ":root { --font-display: Verdana, 'DejaVu Sans', sans-serif !important; --font-body: Verdana, 'DejaVu Sans', sans-serif !important; --font-ui: Verdana, 'DejaVu Sans', sans-serif !important; }"

async function checkEngine(name, base, allRoutes, wideFonts = false) {
  const browser = await ENGINES[name].launch()
  const label = wideFonts ? `${name}+wide-fonts` : name
  const failures = []
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 740 } })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const route of allRoutes) {
      errors.length = 0
      await page.goto(base + route, { waitUntil: 'load' })
      if (wideFonts) await page.addStyleTag({ content: WIDE_FONTS })
      if (selfTest && route === allRoutes[0]) {
        await page.evaluate(() => {
          const wide = document.createElement('span')
          wide.style.cssText = 'display: inline-block; inline-size: 2000px; block-size: 1px'
          document.querySelector('main')?.prepend(wide)
        })
      }
      await settle(page)
      for (const failure of [...await layoutFailures(page), ...errors.map((message) => `uncaught error: ${message}`)]) {
        failures.push(`${label} ${route}: ${failure}`)
      }
    }
    if (wideFonts) return failures
    await page.setViewportSize({ width: 1280, height: 900 })
    for (const route of BASELINE_ROUTES) {
      await page.goto(base + route, { waitUntil: 'load' })
      if (selfTest) await page.addStyleTag({ content: '.lesson-shell .katex:not(.math-scroll) { display: inline-block !important; baseline-source: auto !important; overflow-x: auto !important; }' })
      await settle(page)
      for (const failure of await baselineFailures(page)) failures.push(`${name} ${route} @1280: ${failure}`)
    }
    const explorer = await explorerFailures(browser, name, base)
    failures.push(...explorer.failures)
    if (explorer.covered) explorerEngines.push(name)
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
  if (engines.includes('chromium')) failures.push(...await checkEngine('chromium', base, checked, true))
  // An explorer check that ran nowhere would pass vacuously.
  if (explorerEngines.length === 0) failures.push('explorer: no engine had WebGL, so the stage lifecycle went unchecked')
  const explorerNote = `explorer lifecycle in ${explorerEngines.join(', ') || 'no engine'}` +
    (explorerRestoreUncovered.length ? ` (restore replay not coverable in ${explorerRestoreUncovered.join(', ')}: a reload keeps the failed module)` : '')

  if (selfTest) {
    const expected = engines.flatMap((engine) => [
      `${engine} ${checked[0]}: page overflows`,
      ...(engine === 'chromium' ? [`chromium+wide-fonts ${checked[0]}: page overflows`] : []),
      ...BASELINE_ROUTES.map((route) => `${engine} ${route} @1280: inline maths moves`),
      ...(explorerEngines.includes(engine)
        ? [
            `${engine} /explore/: the stage was not still loading at the click`,
            `${engine} /explore/: leaving mid-boot reported`,
            `${engine} /explore/: coming back after leaving mid-boot did not boot`,
            `${engine} /explore/: a restore after leaving mid-boot reported`,
            `${engine} /explore/: a back/forward-cache restore after leaving mid-boot did not boot`,
            `${engine} /explore/: a failed stage import was not reported`,
          ]
        : []),
    ])
    const missed = expected.filter((prefix) => !failures.some((failure) => failure.startsWith(prefix)))
    if (missed.length) {
      console.error('render:check SELF-TEST FAIL — injected defects went undetected:')
      for (const miss of missed) console.error('- ' + miss)
      process.exitCode = 1
    } else {
      console.log(`render:check SELF-TEST PASS — every injected defect was caught in ${engines.join(', ')} (${explorerNote})`)
    }
  } else if (failures.length) {
    console.error(`render:check FAIL — ${failures.length} issue(s)`)
    for (const failure of failures) console.error('- ' + failure)
    process.exitCode = 1
  } else {
    console.log(`render:check PASS — ${allRoutes.length} routes at 320px and ${BASELINE_ROUTES.length} inline-maths baselines in ${engines.join(', ')}${engines.includes('chromium') ? ', plus a wide-font pass' : ''}; ${explorerNote}`)
  }
} catch (error) {
  console.error('render:check FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
} finally {
  server.close()
}
