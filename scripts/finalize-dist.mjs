#!/usr/bin/env node
/**
 * Post-build fixups to `dist/` that Astro and Pagefind cannot express themselves.
 *
 * Runs before `gen-headers.mjs`, so anything emitted here is still covered by
 * the generated CSP.
 */
import { readdirSync, readFileSync, statSync, copyFileSync, rmSync, existsSync } from 'node:fs'
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

const pages = emitLocale404s()
const pruned = pruneUnusedPagefindBundles()
console.log(
  `finalize-dist · ${pages.length} locale 404 page(s), ` +
    `${pruned.length} unused pagefind bundle(s) pruned`,
)
