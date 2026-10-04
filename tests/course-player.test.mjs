/**
 * The course player's contract, asserted against the built site.
 *
 * Each rule here is one that a green build has hidden before or would hide:
 * a duplicated view-transition name silently cancels the whole transition, new
 * chrome leaks into every search excerpt unless it is excluded, a "continue"
 * card that ships visible would make the HTML lie for every new visitor, and a
 * syllabus that forgets the current lesson strands the reader.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'

function pages() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry === 'index.html') {
        const rel = relative(DIST, dir).split(sep).join('/')
        out.push({ route: rel ? `/${rel}/` : '/', html: readFileSync(full, 'utf8') })
      }
    }
  }
  walk(DIST)
  return out
}

const all = pages()
const lessonPages = all.filter((page) => /^\/(?:pt-br\/)?lessons\/[^/]+\/[^/]+\/$/u.test(page.route))
const trackPages = all.filter((page) => /^\/(?:pt-br\/)?tracks\/[^/]+\/$/u.test(page.route))
const homePages = all.filter((page) => page.route === '/' || page.route === '/pt-br/')

/** Opening tags that carry an attribute, with their attribute string. */
function tagsWith(html, attribute) {
  // The attribute itself, not a longer hook that starts with its name
  // (`data-continue` vs `data-continue-link`).
  return [...html.matchAll(new RegExp(`<([a-z][a-z0-9-]*)\\b([^>]*\\s${attribute}(?![\\w-])[^>]*)>`, 'giu'))].map((match) => match[2] ?? '')
}

function attr(attributes, name) {
  return attributes.match(new RegExp(`\\b${name}="([^"]*)"`, 'u'))?.[1]
}

test('the course player pages exist', () => {
  assert.ok(lessonPages.length >= 200, `expected the lesson corpus, found ${lessonPages.length}`)
  assert.ok(trackPages.length >= 20)
  assert.equal(homePages.length, 2)
})

test('view-transition names are unique on every page', () => {
  for (const { route, html } of all) {
    const names = [...html.matchAll(/view-transition-name:\s*([a-z0-9-]+)/giu)].map((match) => match[1])
    const seen = new Set()
    for (const name of names) {
      if (name === 'none') continue
      assert.ok(!seen.has(name), `${route}: view-transition-name "${name}" appears twice, which cancels the transition`)
      seen.add(name)
    }
  }
})

test("a lesson's star carries the same transition name as its star on the track chart", () => {
  const sample = lessonPages.find((page) => page.route === '/lessons/4-transformer/4.2-self-attention/')
  assert.ok(sample, 'expected lesson 4.2 in English')
  const lessonName = sample.html.match(/data-here-star[^>]*view-transition-name:\s*([a-z0-9-]+)/u)?.[1]
    ?? sample.html.match(/view-transition-name:\s*([a-z0-9-]+)[^>]*data-here-star/u)?.[1]
  assert.ok(lessonName, 'the lesson header marks its star with a transition name')
  const track = trackPages.find((page) => page.route === '/tracks/4-transformer/')
  assert.ok(track)
  assert.match(track.html, new RegExp(`view-transition-name:\\s*${lessonName}\\b`, 'u'), 'the track chart names the same star')
})

test('every lesson shows its whole track as a syllabus and marks itself current', () => {
  for (const { route, html } of lessonPages) {
    const syllabus = html.match(/<nav\b[^>]*data-syllabus[^>]*>([\s\S]*?)<\/nav>/u)
    assert.ok(syllabus, `${route}: no syllabus`)
    const current = [...syllabus[1].matchAll(/<a\b[^>]*aria-current="page"[^>]*href="([^"]+)"|<a\b[^>]*href="([^"]+)"[^>]*aria-current="page"/gu)]
    assert.equal(current.length, 1, `${route}: the syllabus must mark exactly one current lesson`)
    const href = current[0][1] ?? current[0][2]
    assert.equal(href, route, `${route}: the syllabus marks ${href} as current`)
  }
})

test('the syllabus lists every lesson of the track, in order', () => {
  const page = lessonPages.find((candidate) => candidate.route === '/pt-br/lessons/4-transformer/4.2-self-attention/')
  assert.ok(page)
  const syllabus = page.html.match(/<nav\b[^>]*data-syllabus[^>]*>([\s\S]*?)<\/nav>/u)?.[1] ?? ''
  const positions = [...syllabus.matchAll(/href="\/pt-br\/lessons\/4-transformer\/(4\.(\d+))-/gu)].map((match) => Number(match[2]))
  const track = trackPages.find((candidate) => candidate.route === '/pt-br/tracks/4-transformer/')
  const trackCount = new Set([...(track?.html ?? '').matchAll(/href="\/pt-br\/lessons\/4-transformer\/(4\.\d+-[^"/]+)\/"/gu)].map((match) => match[1])).size
  assert.equal(positions.length, trackCount, 'one syllabus row per lesson in the track')
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'syllabus is in course order')
})

test('progress chrome ships hidden: the HTML is the same for every visitor', () => {
  for (const { route, html } of [...homePages, ...trackPages.slice(0, 4)]) {
    const cards = tagsWith(html, 'data-continue')
    assert.ok(cards.length > 0, `${route}: expected a continue slot`)
    for (const attributes of cards) assert.match(attributes, /\bhidden\b/u, `${route}: the continue slot must ship hidden`)
  }
  for (const { route, html } of all.slice(0, 40)) {
    for (const attributes of tagsWith(html, 'data-course-progress')) {
      assert.match(attributes, /\bhidden\b/u, `${route}: the header progress count must ship hidden`)
    }
  }
})

test('every lesson states a reading time', () => {
  for (const { route, html } of lessonPages) {
    const minutes = html.match(/data-reading-minutes="(\d+)"/u)?.[1]
    assert.ok(minutes, `${route}: no reading time`)
    assert.ok(Number(minutes) >= 1 && Number(minutes) < 120, `${route}: implausible reading time ${minutes}`)
  }
})

test('course-player chrome is excluded from the search index', () => {
  const config = readFileSync('astro.config.mjs', 'utf8')
  const sample = lessonPages.find((page) => page.route === '/lessons/4-transformer/4.2-self-attention/')
  assert.ok(sample)
  for (const hook of ['data-syllabus', 'data-lesson-steps', 'data-reading-minutes', 'data-here-chart']) {
    const opening = sample.html.match(new RegExp(`<[a-z]+\\b[^>]*${hook}[^>]*>`, 'u'))?.[0]
    assert.ok(opening, `lesson page has ${hook}`)
    const excludedInline = /data-pagefind-ignore/u.test(opening)
    const excludedByConfig = config.includes(`'[${hook}]'`)
    assert.ok(excludedInline || excludedByConfig, `${hook} must be pagefind-ignored or in excludeSelectors`)
  }
})

test('the home chart draws every lesson of its locale as a star', () => {
  for (const { route, html } of homePages) {
    const locale = route === '/' ? 'en' : 'pt-br'
    const stars = new Set([...html.matchAll(/data-star="([^"]+)"/gu)].map((match) => match[1]))
    const lessons = lessonPages.filter((page) => (locale === 'en' ? !page.route.startsWith('/pt-br/') : page.route.startsWith('/pt-br/')))
    assert.equal(stars.size, lessons.length, `${route}: one star per lesson`)
    const constellations = new Set([...html.matchAll(/data-constellation="([^"]+)"/gu)].map((match) => match[1]))
    const tracks = trackPages.filter((page) => (locale === 'en' ? !page.route.startsWith('/pt-br/') : page.route.startsWith('/pt-br/')))
    assert.equal(constellations.size, tracks.length, `${route}: one constellation per track`)
  }
})

test('the display face is preloaded and served from this origin', () => {
  const home = homePages[0]
  const preload = home.html.match(/<link\b[^>]*rel="preload"[^>]*as="font"[^>]*>/u)?.[0]
  assert.ok(preload, 'home preloads the display face')
  const href = preload.match(/href="([^"]+)"/u)?.[1] ?? ''
  assert.ok(href.startsWith('/_astro/') && href.endsWith('.woff2'), `self-hosted woff2, got ${href}`)
  assert.ok(existsSync(join(DIST, href)), `${href} exists in dist`)
  assert.match(preload, /crossorigin/u, 'font preloads need crossorigin or the browser fetches twice')
})

test('no stylesheet references a token the system no longer defines', () => {
  const astro = join(DIST, '_astro')
  const css = readdirSync(astro).filter((name) => name.endsWith('.css')).map((name) => readFileSync(join(astro, name), 'utf8')).join('\n')
  const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/giu)].map((match) => match[1]))
  const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/giu)].map((match) => match[1]))
  // Set inline by components through style="--x: …" attributes, or by script.
  const html = all.map((page) => page.html).join('\n')
  const missing = [...used].filter((name) => !defined.has(name) && !html.includes(`${name}:`) && !/^--(?:tw|default)-/u.test(name))
  assert.deepEqual(missing, [], `undefined custom properties: ${missing.join(', ')}`)
  for (const retired of ['--abyss', '--paper', '--sonar', '--kelp', '--coral', '--cyan-bright']) {
    assert.ok(!defined.has(retired) && !used.has(retired), `retired token ${retired} still in CSS`)
  }
})

test('a star fills only for its own lesson, never because an ancestor is complete', () => {
  // The lesson <article> carries data-complete="true" once the lesson is done;
  // a descendant selector would then fill every star inside it (prerequisites,
  // the plate, the syllabus) whether or not those lessons were completed.
  const astro = join(DIST, '_astro')
  const css = readdirSync(astro).filter((name) => name.endsWith('.css')).map((name) => readFileSync(join(astro, name), 'utf8')).join('\n')
  const loose = [...css.matchAll(/\[data-complete=["']?true["']?\]\s+\.star-mark/gu)]
  assert.deepEqual(loose.map((match) => match[0]), [], 'star marks must key on their own row ([data-complete] > .star-mark), not on any ancestor')
})

test('every page opts in to cross-document view transitions inline, before any stylesheet', () => {
  // Chromium decides the incoming page's opt-in when it reveals the page. With
  // the rule only in the linked stylesheet, that decision raced the stylesheet
  // and most navigations aborted ("ViewTransition opt-in disabled"): 0–2 of 8
  // in a measured run, 8/8 once the rule was inline.
  for (const { route, html } of all) {
    const optIn = html.search(/<style[^>]*>[^<]*@view-transition\s*\{\s*navigation:\s*auto/u)
    assert.ok(optIn !== -1, `${route}: no inline @view-transition opt-in`)
    const firstSheet = html.indexOf('<link rel="stylesheet"')
    assert.ok(firstSheet === -1 || optIn < firstSheet, `${route}: the opt-in must precede the stylesheets`)
    assert.match(html.slice(optIn, optIn + 200), /prefers-reduced-motion:\s*no-preference/u, `${route}: the opt-in must stay off under reduced motion`)
  }
})

test('scroll-driven animations keep their timeline out of the animation shorthand', () => {
  // The CSS minifier folded `animation: x linear both; animation-timeline:
  // view()` into `animation: linear both x view()`. Chromium rejects a
  // timeline inside the shorthand (it is a reset-only sub-property), so every
  // scroll-driven animation was silently dropped while all gates stayed green.
  const astro = join(DIST, '_astro')
  const css = readdirSync(astro).filter((name) => name.endsWith('.css')).map((name) => readFileSync(join(astro, name), 'utf8')).join('\n')
  const folded = [...css.matchAll(/animation:[^;}]*(?:view\(|scroll\(|\s--[a-z][\w-]*\s*(?:[;}]|$))/gu)].map((match) => match[0])
  assert.deepEqual(folded, [], 'a timeline must be set with animation-timeline, never inside the animation shorthand')
  assert.ok(/animation-timeline:\s*view\(\)/u.test(css), 'the build should still declare view() timelines')
})
