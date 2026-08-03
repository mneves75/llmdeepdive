/**
 * Assertions against the real build output in `dist/`.
 *
 * These exist because the reference project we studied shipped a test file that
 * tested a *different* application — inherited from its starter template and
 * guaranteed to fail. Every assertion here is about this site, and every one
 * would catch a real regression.
 *
 * Run after `pnpm build`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'

function pages() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry === 'index.html') {
        const rel = relative(DIST, full).split(sep).slice(0, -1).join('/')
        out.push({ route: rel ? `/${rel}/` : '/', html: readFileSync(full, 'utf8'), file: full })
      }
    }
  }
  walk(DIST)
  return out
}

test('build produced pages', () => {
  assert.ok(existsSync(DIST), 'dist/ missing — run pnpm build first')
  assert.ok(pages().length > 0, 'no index.html found in dist/')
})

test('every page declares a page marker', () => {
  for (const p of pages()) {
    assert.match(
      p.html,
      /data-page-marker="[^"]+"/,
      `${p.route} has no data-page-marker; the perf bench cannot verify it rendered`,
    )
  }
})

test('page markers are unique across routes', () => {
  // A marker shared between pages cannot prove a page rendered — a global
  // footer string once let skeleton-only pages pass a benchmark.
  const seen = new Map()
  for (const p of pages()) {
    const marker = p.html.match(/data-page-marker="([^"]+)"/)?.[1]
    if (!marker) continue
    assert.equal(
      seen.has(marker),
      false,
      `marker "${marker}" is used by both ${seen.get(marker)} and ${p.route}`,
    )
    seen.set(marker, p.route)
  }
})

test('theme script is inline, synchronous, and precedes the first stylesheet', () => {
  // This ordering is the entire defence against a flash of the wrong theme.
  for (const p of pages()) {
    const scriptIdx = p.html.indexOf('ldd-theme')
    assert.notEqual(scriptIdx, -1, `${p.route} is missing the theme script`)

    const styleIdx = p.html.indexOf('<link rel="stylesheet"')
    if (styleIdx !== -1) {
      assert.ok(
        scriptIdx < styleIdx,
        `${p.route}: theme script must come before the first stylesheet`,
      )
    }

    const tag = p.html.slice(0, scriptIdx).lastIndexOf('<script')
    const openTag = p.html.slice(tag, p.html.indexOf('>', tag))
    assert.doesNotMatch(
      openTag,
      /\b(defer|async)\b/,
      `${p.route}: theme script must not be deferred or async`,
    )
  }
})

test('every page declares a language and canonical', () => {
  for (const p of pages()) {
    assert.match(p.html, /<html lang="(en|pt-BR)"/, `${p.route} has no/bad lang attribute`)
    assert.match(p.html, /rel="canonical"/, `${p.route} has no canonical link`)
  }
})

test('pt-BR pages declare pt-BR, English pages declare en', () => {
  for (const p of pages()) {
    const lang = p.html.match(/<html lang="([^"]+)"/)?.[1]
    const expected = p.route.startsWith('/pt-br/') ? 'pt-BR' : 'en'
    assert.equal(lang, expected, `${p.route} declares lang="${lang}", expected "${expected}"`)
  }
})

test('no page ships an unresolved template placeholder', () => {
  for (const p of pages()) {
    // Whole-node matches only: a loose 'undefined</' also flags legitimate prose
    // such as the quiz option "Always undefined".
    //
    // 'NaN' is deliberately NOT checked. This course teaches loss spikes and
    // divergence, so ">NaN<" is real subject matter in track 5 — the check
    // cannot distinguish a failed render from a lesson about failed training,
    // and a test that cries wolf gets disabled rather than heeded.
    for (const bad of ['{{', '>undefined<', '[object Object]']) {
      assert.equal(
        p.html.includes(bad),
        false,
        `${p.route} contains "${bad}" — a value failed to render`,
      )
    }
  }
})

test('three.js is not in any eagerly-loaded page bundle', () => {
  // The whole performance argument depends on the 3D chunk being fetched only
  // when a canvas approaches the viewport.
  for (const p of pages()) {
    const eager = [...p.html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
    for (const src of eager) {
      const file = join(DIST, src.replace(/^\//, ''))
      if (!existsSync(file)) continue
      const js = readFileSync(file, 'utf8')
      assert.equal(
        js.includes('WebGLRenderer'),
        false,
        `${p.route}: ${src} is loaded eagerly and contains WebGLRenderer`,
      )
    }
  }
})

test('explorer annotation live regions accept dynamic text without invalid list markup', () => {
  for (const route of ['/explore/', '/pt-br/explore/']) {
    const page = pages().find((candidate) => candidate.route === route)
    assert.ok(page, `${route} was not built`)
    assert.match(
      page.html,
      /<div[^>]+id="specimen-annotations"/,
      `${route}: dynamic annotation text needs a neutral live-region container`,
    )
    assert.doesNotMatch(
      page.html,
      /<ul[^>]+id="specimen-annotations"/,
      `${route}: setting textContent on a list creates an invalid direct text child`,
    )
  }
})
