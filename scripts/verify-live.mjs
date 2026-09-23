#!/usr/bin/env node
/**
 * verify:live — proves a deployed target serves exactly what `dist/` holds.
 *
 * `wrangler deploy` exits 0 with empty output in non-TTY and a green local
 * gate says nothing about which asset version the edge serves, so every
 * release was verified by hand. This is that procedure:
 *
 *   - every file in dist/ is byte-identical on the target (both localized
 *     404 pages included, requested as missing URLs, with a 404 status)
 *   - the served Content-Security-Policy equals the generated `_headers` line
 *   - HTML is served Brotli-compressed
 *   - production only: www 301-redirects to the apex, keeping path and query
 *   - in Chromium, WebKit and Firefox, /explore/ → "View lesson" reaches the
 *     track-qualified lesson in both locales, the footer shows package.json's
 *     version, and nothing raises a page error, a CSP violation (an
 *     edge-injected script would) or an "[explorer]" error. Whether the click
 *     lands while the 3D stage is still loading depends on the network;
 *     `render:check` forces that race locally.
 *
 * `--target production|staging` (staging reads BENCH_STAGING_URL, like the
 * bench) or `--base <url>`. `--self-test` gives every check a wrong
 * expectation or an injected violation and requires each one to be caught.
 * Needs `pnpm build` first; takes no screenshots, because Playwright's
 * screenshot injects a <style> that this site's CSP rightly refuses in WebKit.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { chromium, firefox, webkit } from 'playwright'
import { DIST_ROOT, walkFiles } from './content-utils.mjs'
import { TARGETS, resolveBase } from './targets.mjs'

const ENGINES = { chromium, webkit, firefox }
const SERVER_CONFIG = new Set(['_headers', '_redirects'])
const MISSING = '__verify-live-missing__/'
const FETCH_TIMEOUT_MS = 20_000

function parseArgs(argv) {
  const args = { target: 'staging', base: null, selfTest: false }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--target') args.target = argv[++i]
    else if (argv[i] === '--base') args.base = argv[++i]
    else if (argv[i] === '--self-test') args.selfTest = true
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  return args
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const message = (error) => (error instanceof Error ? error.message : String(error))

async function fetchRetrying(url, init = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    } catch (error) {
      if (attempt === 3) throw error
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
}

function expectationFor(base, file) {
  if (file === '404.html') return { url: `${base}/${MISSING}`, status: 404 }
  if (file === 'pt-br/404.html') return { url: `${base}/pt-br/${MISSING}`, status: 404 }
  if (file === 'index.html') return { url: `${base}/`, status: 200 }
  if (file.endsWith('/index.html')) return { url: `${base}/${file.slice(0, -'index.html'.length)}`, status: 200 }
  return { url: `${base}/${file}`, status: 200 }
}

async function byteFailures(base, selfTest) {
  const files = walkFiles(DIST_ROOT)
    .map((file) => relative(DIST_ROOT, file).split(sep).join('/'))
    .filter((file) => !SERVER_CONFIG.has(file))
  if (files.length === 0) throw new Error('dist/ is empty; run pnpm build first')
  const failures = []
  let next = 0
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++]
      const { url, status } = expectationFor(base, file)
      let expectedHash = sha256(readFileSync(`${DIST_ROOT}/${file}`))
      let expectedStatus = status
      if (selfTest && file === 'index.html') expectedHash = sha256(expectedHash)
      if (selfTest && file === '404.html') expectedStatus = 200
      try {
        const response = await fetchRetrying(url, { redirect: 'manual' })
        const body = Buffer.from(await response.arrayBuffer())
        if (response.status !== expectedStatus) failures.push(`${file}: HTTP ${response.status}, expected ${expectedStatus}`)
        else if (sha256(body) !== expectedHash) failures.push(`${file}: served bytes differ from dist/`)
      } catch (error) {
        failures.push(`${file}: ${message(error)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker))
  return { count: files.length, failures }
}

async function headerFailures(base, production, selfTest) {
  const failures = []
  let csp = readFileSync(`${DIST_ROOT}/_headers`, 'utf8').match(/Content-Security-Policy: (.+)/)?.[1]?.trim()
  if (!csp) return ['dist/_headers has no Content-Security-Policy line']
  if (selfTest) csp += '; self-test'
  const encoding = selfTest ? 'self-test' : 'br'
  const response = await fetchRetrying(`${base}/pt-br/`, { headers: { 'accept-encoding': 'br' } })
  if (response.headers.get('content-security-policy') !== csp) failures.push('served CSP differs from dist/_headers')
  if (response.headers.get('content-encoding') !== encoding) {
    failures.push(`HTML served with content-encoding ${response.headers.get('content-encoding') ?? 'none'}, expected ${encoding}`)
  }
  if (production) {
    const origin = new URL(base)
    const expected = `${origin.origin}/explore/?q=1${selfTest ? '#self-test' : ''}`
    const redirect = await fetchRetrying(`${origin.protocol}//www.${origin.host}/explore/?q=1`, { redirect: 'manual' })
    if (redirect.status !== 301 || redirect.headers.get('location') !== expected) {
      failures.push(`www: HTTP ${redirect.status} → ${redirect.headers.get('location')}, expected 301 → ${expected}`)
    }
  }
  return failures
}

async function canaryFailures(engineName, base, version, selfTest) {
  const failures = []
  const browser = await ENGINES[engineName].launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    page.on('pageerror', (error) => failures.push(`${engineName}: page error: ${error.message}`))
    page.on('console', (entry) => {
      if (entry.type() !== 'error') return
      if (entry.text().startsWith('CSP violation') || entry.text().startsWith('[explorer]')) failures.push(`${engineName}: ${entry.text()}`)
    })
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        console.error(`CSP violation: ${event.effectiveDirective} blocked ${event.blockedURI || 'inline'}`)
      })
    })
    for (const locale of ['', '/pt-br']) {
      await page.goto(`${base}${locale}/explore/`, { waitUntil: 'load' })
      if (selfTest && locale === '') {
        await page.evaluate(() => {
          document.head.append(Object.assign(document.createElement('style'), { textContent: 'body {}' }))
          console.error('[explorer] self-test')
          setTimeout(() => { throw new Error('self-test') })
        })
        await page.waitForTimeout(100)
      }
      const footer = (await page.locator('.site-footer__version').textContent())?.trim()
      if (footer !== `v${version}`) failures.push(`${engineName} ${locale || '/'}: footer shows ${footer}, expected v${version}`)
      const cta = page.locator('[data-detail-cta]').first()
      const href = await cta.getAttribute('href')
      // The explorer re-derives this link from its data, so the self-test
      // corrupts the expected prefix rather than the attribute.
      const prefix = selfTest && locale === '' ? '/self-test' : locale
      if (!href || !new RegExp(`^${prefix}/lessons/[^/]+/[^/]+/$`).test(href)) {
        failures.push(`${engineName} ${locale}/explore/: lesson link ${href} is not track-qualified`)
        continue
      }
      // A well-formed link to a missing lesson lands on the localized 404 page,
      // which has a heading too: require a 200 and the lesson's own article.
      const response = page.waitForResponse((r) => r.request().isNavigationRequest() && new URL(r.url()).pathname === href, { timeout: 30_000 })
      await Promise.all([page.waitForURL((url) => url.pathname === href, { timeout: 30_000 }), cta.click()])
      const expectedStatus = selfTest ? 299 : 200
      const status = (await response).status()
      if (status !== expectedStatus) failures.push(`${engineName} ${href}: lesson answered HTTP ${status}, expected ${expectedStatus}`)
      if (selfTest) await page.evaluate(() => document.querySelector('h1')?.remove())
      const lessonSelector = selfTest ? '[data-self-test-lesson]' : 'article[data-lesson-key]'
      const destination = await page.evaluate((selector) => ({
        lesson: document.querySelector(selector) !== null,
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
      }), lessonSelector)
      if (!destination.lesson) failures.push(`${engineName} ${href}: destination is not a lesson page`)
      if (!destination.heading) failures.push(`${engineName} ${href}: lesson rendered no heading`)
    }
    // Past the explorer's one-second failure-report delay.
    await page.waitForTimeout(1500)
  } finally {
    await browser.close()
  }
  return failures
}

// A check that throws reports that, instead of discarding every other result.
async function run(label, check) {
  try {
    return await check()
  } catch (error) {
    return [`${label}: ${message(error)}`]
  }
}

try {
  const args = parseArgs(process.argv.slice(2))
  const base = resolveBase(args.target, args.base)
  const label = args.base ? 'custom base' : args.target
  const version = args.selfTest ? '0.0.0-self-test' : JSON.parse(readFileSync('package.json', 'utf8')).version
  const bytes = await byteFailures(base, args.selfTest)
  const production = base === TARGETS.production
  const failures = [
    ...bytes.failures,
    ...await run('headers', () => headerFailures(base, production, args.selfTest)),
  ]
  for (const engine of Object.keys(ENGINES)) failures.push(...await run(`${engine} canary`, () => canaryFailures(engine, base, version, args.selfTest)))

  if (args.selfTest) {
    // Each defect names the substrings one reported failure must contain.
    const defects = [
      ['a corrupted file hash', ['index.html: served bytes differ']],
      ['a wrong 404 status', ['404.html: HTTP 404, expected 200']],
      ['a wrong CSP', ['served CSP differs']],
      ['a wrong content encoding', ['expected self-test']],
      ...(production ? [['a wrong www redirect', ['www: HTTP']]] : []),
      ...Object.keys(ENGINES).flatMap((engine) => [
        [`a wrong footer version in ${engine}`, [`${engine} /: footer shows`]],
        [`an injected CSP violation in ${engine}`, [`${engine}: CSP violation`]],
        [`an injected explorer error in ${engine}`, [`${engine}: [explorer] self-test`]],
        [`an injected page error in ${engine}`, [`${engine}: page error: self-test`]],
        [`an untracked lesson link in ${engine}`, [`${engine} /explore/: lesson link`, 'is not track-qualified']],
        [`a missing lesson heading in ${engine}`, [`${engine} /pt-br/lessons/`, 'rendered no heading']],
        [`a wrong lesson status in ${engine}`, [`${engine} /pt-br/lessons/`, 'expected 299']],
        [`a non-lesson destination in ${engine}`, [`${engine} /pt-br/lessons/`, 'is not a lesson page']],
      ]),
    ]
    const missed = defects.filter(([, needles]) => !failures.some((failure) => needles.every((needle) => failure.includes(needle))))
    if (missed.length) {
      console.error(`verify:live SELF-TEST FAIL — ${label}: undetected ${missed.map(([what]) => what).join(', ')}`)
      process.exitCode = 1
    } else {
      console.log(`verify:live SELF-TEST PASS — ${label}: all ${defects.length} injected defects caught`)
    }
  } else if (failures.length) {
    // A stale deploy mismatches hundreds of files; never let them bury a header
    // or canary failure.
    const other = failures.slice(bytes.failures.length)
    console.error(`verify:live FAIL — ${label}: ${failures.length} issue(s)`)
    for (const failure of [...other, ...bytes.failures.slice(0, 20)]) console.error('- ' + failure)
    if (bytes.failures.length > 20) console.error(`- … and ${bytes.failures.length - 20} more file mismatch(es)`)
    process.exitCode = 1
  } else {
    console.log(`verify:live PASS — ${label} serves all ${bytes.count} dist/ files byte-identical, the generated CSP and Brotli${production ? ', redirects www' : ''}, and the explorer → lesson flow at v${version} in ${Object.keys(ENGINES).join(', ')}`)
  }
} catch (error) {
  console.error('verify:live FAIL — ' + message(error))
  process.exitCode = 1
}
