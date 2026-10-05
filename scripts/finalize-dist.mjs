#!/usr/bin/env node
/**
 * Post-build fixups to `dist/` that Astro and Pagefind cannot express themselves.
 *
 * Runs before `gen-headers.mjs`, so anything emitted here is still covered by
 * the generated CSP.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, statSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'

function filesUnder(dir, extensions, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) filesUnder(full, extensions, acc)
    else if (extensions.some((ext) => entry.endsWith(ext))) acc.push(full)
  }
  return acc
}

/**
 * Cloudflare's `not_found_handling: "404-page"` resolves a bad URL by walking
 * *up* the path looking for the nearest literal `404.html`. Astro special-cases
 * only the root `404.astro` into that filename; under `build.format: 'directory'`
 * every other locale's 404 lands at `<locale>/404/index.html`, which the walk
 * never finds — so `/pt-br/nope/` silently serves the English 404 page, breaking
 * the "a missing translation never falls back to English" invariant at the one
 * URL nobody thinks to test.
 *
 * Astro has no per-page format override, so the file is placed here. Derived
 * from the tree rather than hard-coded to `pt-br`, so a third locale cannot be
 * quietly skipped.
 */
function emitLocale404s() {
  const emitted = []
  for (const entry of readdirSync(DIST)) {
    if (!statSync(join(DIST, entry)).isDirectory()) continue
    const source = join(DIST, entry, '404', 'index.html')
    if (!existsSync(source)) continue
    const target = join(DIST, entry, '404.html')
    copyFileSync(source, target)
    // The directory form would otherwise claim `/<locale>/404/` and shadow the
    // literal filename the not-found walk looks for.
    rmSync(join(DIST, entry, '404'), { recursive: true })
    emitted.push(target)
  }
  if (emitted.length === 0) {
    throw new Error(
      'no locale 404 page found — every non-default locale needs src/pages/<locale>/404.astro',
    )
  }
  return emitted
}

/**
 * Pagefind emits prebuilt UI bundles alongside the search API. This site builds
 * its own `<dialog>` search against `pagefind.js` directly, so those bundles are
 * hundreds of KB of unreferenced JavaScript on the origin — complete with
 * `innerHTML` sinks — uploaded on every deploy.
 *
 * Each candidate is removed only after proving nothing in the build references
 * it, so adopting a Pagefind UI later deletes nothing it needs.
 */
function pruneUnusedPagefindBundles() {
  const referenced = new Set()
  for (const file of filesUnder(DIST, ['.html', '.js', '.css'])) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/pagefind\/([a-zA-Z0-9._-]+)/g)) {
      referenced.add(name)
    }
  }

  const removed = []
  for (const name of readdirSync(join(DIST, 'pagefind'))) {
    if (!/^pagefind-(ui|modular-ui|component-ui|highlight)\.(js|css)$/.test(name)) continue
    if (referenced.has(name)) continue
    rmSync(join(DIST, 'pagefind', name))
    removed.push(name)
  }
  return removed
}

/**
 * Pagefind writes `languages` in hash-map order, which changes between builds
 * of the same commit, so `verify:live` could not compare a rebuilt `dist/`
 * with what was deployed. Its runtime looks languages up by key; the order
 * matters only to its fallback for an unindexed page language, which sorts by
 * page count and then keeps this order, so sorting also makes that fallback fixed.
 */
function sortPagefindLanguages() {
  const file = join(DIST, 'pagefind', 'pagefind-entry.json')
  const entry = JSON.parse(readFileSync(file, 'utf8'))
  entry.languages = Object.fromEntries(Object.entries(entry.languages).sort(([a], [b]) => (a < b ? -1 : 1)))
  writeFileSync(file, JSON.stringify(entry))
}

/**
 * X, WhatsApp, LinkedIn and Slack keep their own copy of a link-preview image,
 * keyed by its URL, and do not ask the origin again for a week or more. A card
 * redrawn at the same URL therefore stays the old picture in every preview.
 * Each `og:image` gets `?v=` plus the first eight hex digits of its PNG's
 * SHA-256, so the URL moves exactly when the pixels do and a rebuild of the
 * same commit still writes the same HTML.
 *
 * Done here because the hash is of the built file: a version computed while
 * rendering the page would have to guess at the PNG from its inputs.
 */
function versionCardUrls() {
  const versions = new Map()
  let stamped = 0
  for (const file of filesUnder(DIST, ['.html'])) {
    const html = readFileSync(file, 'utf8')
    const out = html.replace(/(<meta property="og:image" content=")([^"?]+)(")/gu, (_, open, url, close) => {
      const card = join(DIST, new URL(url).pathname)
      if (!versions.has(card)) {
        if (!existsSync(card)) throw new Error(`${file}: og:image ${url} was not built`)
        versions.set(card, createHash('sha256').update(readFileSync(card)).digest('hex').slice(0, 8))
      }
      stamped += 1
      return `${open}${url}?v=${versions.get(card)}${close}`
    })
    if (out !== html) writeFileSync(file, out)
  }
  if (stamped === 0) throw new Error('no og:image found to version — did the meta tag change shape in Base.astro?')
  return stamped
}

const pages = emitLocale404s()
const cards = versionCardUrls()
const pruned = pruneUnusedPagefindBundles()
sortPagefindLanguages()
console.log(
  `finalize-dist · ${pages.length} locale 404 page(s), ${cards} card URL(s) versioned, ` +
    `${pruned.length} unused pagefind bundle(s) pruned`,
)
