/**
 * Search and share metadata, asserted against the real build in `dist/`.
 *
 * Every route here is generated from the corpus, so one template mistake is
 * 238 mistakes. These assertions read the emitted HTML, sitemap, llms.txt and
 * PNG headers — not the templates — because the artefact is what crawlers and
 * link previews see. Run after `pnpm build`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'
const SITE = 'https://llmdeepdive.com'
const BRAND = 'llmdeepdive'
const TITLE_BUDGET = 60

const decode = (value) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')

function htmlPages() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry === 'index.html') {
        const rel = relative(DIST, full).split(sep).slice(0, -1).join('/')
        out.push({ route: rel ? `/${rel}/` : '/', html: readFileSync(full, 'utf8') })
      }
    }
  }
  walk(DIST)
  return out
}

const PAGES = existsSync(DIST) ? htmlPages() : []
const NOT_FOUND = ['404.html', 'pt-br/404.html'].map((file) => ({ file, html: readFileSync(join(DIST, file), 'utf8') }))

const localeOf = (route) => (route.startsWith('/pt-br/') ? 'pt-br' : 'en')
const isLesson = (route) => /^\/(?:pt-br\/)?lessons\//u.test(route)
const isHome = (route) => route === '/' || route === '/pt-br/'
const ogSlug = (route) => route.replace(/^\/|\/$/gu, '') || 'index'

function meta(html, attr, key) {
  const values = [...html.matchAll(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`, 'gu'))].map((m) => decode(m[1]))
  return values
}
const one = (html, attr, key, route) => {
  const values = meta(html, attr, key)
  assert.equal(values.length, 1, `${route}: expected exactly one <meta ${attr}="${key}">, found ${values.length}`)
  return values[0]
}
const titleOf = (html) => decode(html.match(/<title>([^<]*)<\/title>/u)?.[1] ?? '')
const h1Of = (html) => decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/u)?.[1].replace(/<[^>]+>/gu, '').trim() ?? '')
const timeOf = (html) => html.match(/<time datetime="([^"]+)"/u)?.[1]

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu)].map((m) => m[1])
}
const nodes = (graph, type) => graph['@graph'].filter((node) => [node['@type']].flat().includes(type))

/** The file a URL on this site is served from, or null. */
function distFileFor(url) {
  const { origin, pathname } = new URL(url)
  if (origin !== SITE) return null
  const file = pathname.endsWith('/') ? join(DIST, pathname, 'index.html') : join(DIST, pathname)
  return existsSync(file) && statSync(file).isFile() ? file : null
}

function pngSize(file) {
  const bytes = readFileSync(file)
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${file} is not a PNG`)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

const trackTitles = new Map()
for (const locale of ['en', 'pt-br']) {
  const dir = join('src', 'content', 'tracks', locale)
  for (const file of readdirSync(dir)) {
    const track = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    trackTitles.set(`${locale}:${track.id}`, track.title)
  }
}
const trackOf = (route) => {
  const [, trackId] = route.match(/lessons\/([^/]+)\//u) ?? []
  return trackTitles.get(`${localeOf(route)}:${trackId}`)
}

test('the build has the whole route set', () => {
  assert.ok(PAGES.length >= 238, `expected at least 238 pages, found ${PAGES.length}`)
  assert.ok(PAGES.filter((p) => isLesson(p.route)).length >= 212)
})

test('every indexable page carries complete search and share metadata', () => {
  for (const { route, html } of PAGES) {
    const canonical = `${SITE}${route}`
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical}">`, 'u'), `${route}: canonical is not its own URL`)
    assert.equal([...html.matchAll(/<title>/gu)].length, 1, `${route}: needs exactly one <title>`)
    assert.ok(one(html, 'name', 'description', route).length > 50, `${route}: description too short`)

    const robots = one(html, 'name', 'robots', route)
    assert.match(robots, /max-image-preview:large/u, `${route}: robots must allow large image previews`)
    assert.doesNotMatch(robots, /noindex|nofollow/u, `${route}: indexable page carries ${robots}`)

    assert.equal(one(html, 'property', 'og:site_name', route), BRAND)
    assert.equal(one(html, 'property', 'og:url', route), canonical)
    assert.equal(one(html, 'property', 'og:title', route), titleOf(html))
    assert.equal(one(html, 'property', 'og:locale', route), localeOf(route) === 'pt-br' ? 'pt_BR' : 'en_US')
    assert.equal(one(html, 'property', 'og:locale:alternate', route), localeOf(route) === 'pt-br' ? 'en_US' : 'pt_BR')
    assert.equal(one(html, 'name', 'twitter:card', route), 'summary_large_image')

    const image = one(html, 'property', 'og:image', route)
    assert.equal(image, `${SITE}/og/${ogSlug(route)}.png`, `${route}: og:image does not follow the /og/<route>.png rule`)
    assert.equal(one(html, 'property', 'og:image:type', route), 'image/png')
    assert.equal(one(html, 'property', 'og:image:width', route), '1200')
    assert.equal(one(html, 'property', 'og:image:height', route), '630')
    assert.ok(one(html, 'property', 'og:image:alt', route).length > 10, `${route}: og:image:alt is empty`)
    const file = distFileFor(image)
    assert.ok(file, `${route}: ${image} was not built`)
    assert.deepEqual(pngSize(file), { width: 1200, height: 630 }, `${route}: card is not 1200×630`)
  }
})

test('404 pages are noindex and claim no canonical, alternates, card or structured data', () => {
  for (const { file, html } of NOT_FOUND) {
    assert.match(one(html, 'name', 'robots', file), /noindex/u, `${file}: must be noindex`)
    assert.doesNotMatch(html, /rel="canonical"/u, `${file}: a 404 must not declare a canonical`)
    assert.doesNotMatch(html, /<link rel="alternate" hreflang=/u, `${file}: a 404 must not declare hreflang alternates`)
    assert.equal(meta(html, 'property', 'og:image').length, 0, `${file}: a 404 needs no social card`)
    assert.equal(jsonLd(html).length, 0, `${file}: a 404 needs no structured data`)
  }
})

test('titles are unique within a locale and lessons gain track context only when it fits', () => {
  const seen = new Map()
  for (const { route, html } of PAGES) {
    const title = titleOf(html)
    const key = `${localeOf(route)}:${title}`
    assert.equal(seen.has(key), false, `"${title}" is the title of both ${seen.get(key)} and ${route}`)
    seen.set(key, route)
    assert.ok(title.endsWith(` — ${BRAND}`), `${route}: title must end with the brand`)

    if (!isLesson(route)) continue
    const lesson = h1Of(html)
    const withTrack = `${lesson} · ${trackOf(route)} — ${BRAND}`
    const expected = withTrack.length <= TITLE_BUDGET ? withTrack : `${lesson} — ${BRAND}`
    assert.equal(title, expected, `${route}: title`)
  }
})

test('the home and index titles name the subject, not just the brand', () => {
  const byRoute = new Map(PAGES.map((p) => [p.route, titleOf(p.html)]))
  assert.match(byRoute.get('/'), /LLMs/u)
  assert.match(byRoute.get('/pt-br/'), /LLMs/u)
  assert.match(byRoute.get('/tracks/'), /LLM/u)
  assert.match(byRoute.get('/pt-br/tracks/'), /LLMs/u)
  assert.match(byRoute.get('/explore/'), /LLM/u)
  assert.match(byRoute.get('/pt-br/explore/'), /LLM/u)
  const ptHome = PAGES.find((p) => p.route === '/pt-br/').html
  assert.match(one(ptHome, 'name', 'description', '/pt-br/'), /trilhas/u)
  assert.doesNotMatch(one(ptHome, 'name', 'description', '/pt-br/'), /\btracks\b/u)
})

test('lessons are articles with their modification date and track', () => {
  for (const { route, html } of PAGES.filter((p) => isLesson(p.route))) {
    assert.equal(one(html, 'property', 'og:type', route), 'article')
    assert.equal(one(html, 'property', 'article:modified_time', route), timeOf(html), `${route}: modified_time ≠ visible date`)
    assert.equal(one(html, 'property', 'article:section', route), trackOf(route))
  }
  for (const { route, html } of PAGES.filter((p) => !isLesson(p.route))) {
    assert.equal(one(html, 'property', 'og:type', route), 'website')
  }
})

test('structured data describes each page with Google-supported types only', () => {
  const pageUrls = new Set(PAGES.map((p) => `${SITE}${p.route}`))
  for (const { route, html } of PAGES) {
    const blocks = jsonLd(html)
    assert.equal(blocks.length, 1, `${route}: expected one JSON-LD block, found ${blocks.length}`)
    // Serialised with `<` escaped, so no value can close the script element.
    assert.doesNotMatch(blocks[0], /</u, `${route}: JSON-LD contains a raw "<"`)
    const graph = JSON.parse(blocks[0])
    assert.equal(graph['@context'], 'https://schema.org')
    assert.ok(Array.isArray(graph['@graph']), `${route}: JSON-LD must be one @graph`)
    for (const banned of ['Course', 'FAQPage', 'Quiz', 'QAPage', 'HowTo']) {
      assert.equal(nodes(graph, banned).length, 0, `${route}: ${banned} markup is ineligible or deprecated here`)
    }

    const ids = new Map(graph['@graph'].filter((n) => n['@id']).map((n) => [n['@id'], n]))
    const organization = nodes(graph, 'Organization')
    assert.equal(organization.length, 1, `${route}: needs one Organization node`)
    assert.equal(organization[0].name, BRAND)
    assert.equal(organization[0].url, `${SITE}/`)

    if (isHome(route)) {
      const [site] = nodes(graph, 'WebSite')
      assert.ok(site, `${route}: the home page needs WebSite markup for site names`)
      assert.equal(site.name, BRAND)
      assert.equal(site.url, `${SITE}/`)
      assert.ok(site.alternateName.includes('llmdeepdive.com'))
      const logo = distFileFor(organization[0].logo.url)
      assert.ok(logo, `${route}: organization logo ${organization[0].logo.url} was not built`)
      const size = pngSize(logo)
      assert.ok(size.width >= 112 && size.width === size.height, `${route}: logo must be square and ≥112px`)
      assert.equal(nodes(graph, 'BreadcrumbList').length, 0)
      continue
    }

    const [crumbs] = nodes(graph, 'BreadcrumbList')
    assert.ok(crumbs, `${route}: needs a BreadcrumbList`)
    const items = crumbs.itemListElement
    assert.ok(items.length >= 2, `${route}: a breadcrumb trail needs at least two steps`)
    items.forEach((item, index) => {
      assert.equal(item['@type'], 'ListItem')
      assert.equal(item.position, index + 1)
      assert.ok(item.name?.trim(), `${route}: breadcrumb ${index + 1} has no name`)
      assert.ok(pageUrls.has(item.item), `${route}: breadcrumb ${item.item} is not a built page`)
    })
    assert.equal(items[0].item, `${SITE}${localeOf(route) === 'pt-br' ? '/pt-br/' : '/'}`)
    assert.equal(items.at(-1).item, `${SITE}${route}`)

    if (!isLesson(route)) continue
    const [article] = nodes(graph, 'Article')
    assert.ok(article, `${route}: a lesson needs Article markup`)
    assert.equal(article.headline, h1Of(html))
    assert.equal(article.description, one(html, 'name', 'description', route))
    assert.equal(article.url, `${SITE}${route}`)
    assert.equal(article.mainEntityOfPage, `${SITE}${route}`)
    assert.equal(article.dateModified, timeOf(html))
    assert.equal(article.inLanguage, localeOf(route) === 'pt-br' ? 'pt-BR' : 'en')
    assert.deepEqual(article.image, [one(html, 'property', 'og:image', route)])
    assert.equal(article.articleSection, trackOf(route))
    assert.equal(article.isAccessibleForFree, true)
    for (const role of ['author', 'publisher']) {
      assert.equal(ids.get(article[role]?.['@id'])?.name, BRAND, `${route}: ${role} must reference the Organization node`)
    }
    const sources = html.match(/<section class="sources"[\s\S]*?<\/section>/u)?.[0]
    // Astro stamps a scope attribute on each item, so match the tag, not `<li>`.
    const cited = sources ? [...sources.matchAll(/<li[\s>]/gu)].length : 0
    assert.equal((article.citation ?? []).length, cited, `${route}: citation count ≠ visible sources`)
    for (const citation of article.citation ?? []) assert.match(citation.url, /^https?:\/\//u)
  }
})

test('JSON-LD blocks are data, not scripts: they cost no CSP hash', () => {
  const headers = readFileSync(join(DIST, '_headers'), 'utf8')
  const scriptSrc = headers.match(/script-src ([^;]+);/u)?.[1] ?? ''
  const home = PAGES.find((p) => p.route === '/').html
  const [block] = jsonLd(home)
  assert.ok(block, 'home page has no JSON-LD to check')
  const hash = `'sha256-${createHash('sha256').update(block, 'utf8').digest('base64')}'`
  assert.equal(scriptSrc.includes(hash), false, 'gen-headers hashed a JSON-LD data block into script-src')
})

test('the sitemap lists exactly the indexable pages, with lastmod from the corpus', () => {
  const xml = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8')
  const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/gu)].map((m) => ({ loc: m[1], lastmod: m[2] }))
  assert.doesNotMatch(xml, /<changefreq>|<priority>/u, 'Google ignores changefreq and priority')
  const byRoute = new Map(PAGES.map((p) => [`${SITE}${p.route}`, p]))
  assert.deepEqual(new Set(entries.map((e) => e.loc)), new Set(byRoute.keys()), 'sitemap and built pages differ')

  const lessonDates = PAGES.filter((p) => isLesson(p.route)).map((p) => ({ route: p.route, date: timeOf(p.html) }))
  const newest = (list) => list.map((l) => l.date).sort().at(-1)
  for (const { loc, lastmod } of entries) {
    const route = new URL(loc).pathname
    if (isLesson(route)) assert.equal(lastmod, timeOf(byRoute.get(loc).html), `${route}: lastmod`)
    else if (/\/tracks\/[^/]+\/$/u.test(route)) {
      const trackPrefix = route.replace('/tracks/', '/lessons/')
      assert.equal(lastmod, newest(lessonDates.filter((l) => l.route.startsWith(trackPrefix))), `${route}: lastmod`)
    } else if (/\/explore\/$/u.test(route)) assert.equal(lastmod, undefined, `${route}: the explorer has no content date`)
    else assert.equal(lastmod, newest(lessonDates.filter((l) => localeOf(l.route) === localeOf(route))), `${route}: lastmod`)
  }
})

test('llms.txt follows llmstxt.org and links every lesson in both languages', () => {
  const text = readFileSync(join(DIST, 'llms.txt'), 'utf8')
  const lines = text.split('\n')
  assert.equal(lines[0], `# ${BRAND}`, 'llms.txt must open with one H1 naming the site')
  assert.equal(lines.filter((l) => l.startsWith('# ')).length, 1)
  assert.ok(lines.some((l) => l.startsWith('> ')), 'llms.txt needs a blockquote summary')
  assert.ok(lines.filter((l) => l.startsWith('## ')).length >= 2)
  const links = [...text.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gmu)].map((m) => m[2])
  assert.ok(links.length > 0)
  for (const link of links) assert.ok(distFileFor(link), `llms.txt links to ${link}, which was not built`)
  const lessons = PAGES.filter((p) => isLesson(p.route)).map((p) => `${SITE}${p.route}`)
  for (const url of lessons) assert.equal(links.filter((l) => l === url).length, 1, `llms.txt must list ${url} once`)
  const headers = readFileSync(join(DIST, '_headers'), 'utf8')
  assert.match(headers, /^\/llms\.txt\n {2}X-Robots-Tag: noindex$/mu, 'llms.txt must not compete with pages in search')
})
