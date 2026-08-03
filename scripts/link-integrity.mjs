#!/usr/bin/env node
/**
 * Every internal link in the built site must resolve to something real.
 *
 * This gate exists because the site shipped with the explorer's "View lesson"
 * CTA pointing at `/lessons/`, a route that has never existed, and with 21 of
 * its 26 component lesson ids naming lessons that were never written (tracks 8,
 * 10 and 11). All ten other gates were green throughout: `content:graph` checks
 * prerequisite ids inside the corpus, `content:assets` checks binary assets, and
 * nothing checked that an `href` a learner can click actually lands somewhere.
 *
 * Two traps this deliberately avoids:
 *
 *  1. **A directory is not a page.** `existsSync('dist/lessons/')` is true — the
 *     folder holds the track subfolders — while `/lessons/` serves nothing. The
 *     first version of this check passed for exactly that reason. Targets must
 *     resolve to a *file*.
 *  2. **A 404 page is not a destination.** `not_found_handling: "404-page"`
 *     makes every bad URL return a styled page with status 404, so "it renders"
 *     proves nothing. We resolve against the built file tree, not over HTTP.
 *
 * Fragments (`#id`) are checked against the ids present in the target document,
 * because a stale anchor is the same broken promise as a stale path.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'

/** Paths that are served but produced outside Astro's page pipeline. */
const NON_PAGE_PREFIXES = ['/pagefind/', '/_astro/']

function htmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) htmlFiles(full, acc)
    else if (entry.endsWith('.html')) acc.push(full)
  }
  return acc
}

const isFile = (p) => existsSync(p) && statSync(p).isFile()

/** Resolve a site-absolute path to the file that would be served for it. */
function resolveTarget(path) {
  const decoded = decodeURIComponent(path)
  for (const candidate of [
    join(DIST, decoded),
    join(DIST, decoded, 'index.html'),
    join(DIST, `${decoded}.html`),
  ]) {
    if (isFile(candidate)) return candidate
  }
  return null
}

function idsIn(html) {
  const ids = new Set()
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1])
  for (const m of html.matchAll(/\sname="([^"]+)"/g)) ids.add(m[1])
  return ids
}

try {
  if (!existsSync(DIST)) throw new Error(`No ${DIST}/ — run the build first.`)
  const pages = htmlFiles(DIST)
  if (pages.length === 0) throw new Error(`No pages under ${DIST}/ — run the build first.`)

  const failures = []
  let checked = 0

  for (const page of pages) {
    const html = readFileSync(page, 'utf8')
    const from = `/${relative(DIST, page).split(sep).join('/')}`
    const selfIds = idsIn(html)

    const refs = new Set()
    for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) refs.add(m[1])

    for (const ref of refs) {
      if (ref === '' || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue // external / mailto / data

      if (ref.startsWith('#')) {
        checked += 1
        const id = decodeURIComponent(ref.slice(1))
        if (id !== '' && !selfIds.has(id)) failures.push(`${from} → ${ref} (no such id on this page)`)
        continue
      }

      if (!ref.startsWith('/')) {
        failures.push(`${from} → ${ref} (relative link; every internal link here is site-absolute)`)
        continue
      }

      const [path, fragment] = ref.split('#')
      checked += 1

      if (NON_PAGE_PREFIXES.some((p) => path.startsWith(p))) {
        if (!isFile(join(DIST, decodeURIComponent(path)))) failures.push(`${from} → ${ref} (missing asset)`)
        continue
      }

      const target = resolveTarget(path)
      if (!target) {
        failures.push(`${from} → ${ref} (no built file serves this path)`)
        continue
      }
      if (fragment) {
        const targetIds = idsIn(readFileSync(target, 'utf8'))
        if (!targetIds.has(decodeURIComponent(fragment))) {
          failures.push(`${from} → ${ref} (target exists, but has no id "${fragment}")`)
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(`link-integrity FAIL — ${failures.length} broken internal reference(s):\n`)
    for (const f of failures.sort()) console.error(`  ${f}`)
    console.error(`\nScanned ${checked} internal references across ${pages.length} pages.`)
    process.exit(1)
  }

  console.log(`link-integrity OK — ${checked} internal references across ${pages.length} pages all resolve.`)
} catch (error) {
  console.error(`link-integrity FAIL — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
