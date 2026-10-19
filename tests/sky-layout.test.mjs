/**
 * The curriculum sky's geometry, against the real corpus.
 *
 * Every chart on the site (home, tracks index, track pages, lesson plates and
 * the 3D sky) reads this one layout, so its failures are everyone's: a star
 * off the plate, a figure so tall it swallows a track page, or two names
 * printed over each other.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BAND_HEIGHT, buildSky, PART_LABEL_INSET, SKY_WIDTH } from '../src/lib/sky.ts'

function corpus(locale) {
  const tracksDir = join('src/content/tracks', locale)
  const tracks = readdirSync(tracksDir).filter((name) => name.endsWith('.json')).map((name) => {
    const data = JSON.parse(readFileSync(join(tracksDir, name), 'utf8'))
    return { id: data.id, order: data.order, tier: data.tier, title: data.title, part: data.part }
  })
  const lessons = []
  for (const track of tracks) {
    const dir = join('src/content/lessons', locale, track.id)
    let files = []
    try { files = readdirSync(dir).filter((name) => name.endsWith('.mdx')) } catch { files = [] }
    for (const file of files) {
      const source = readFileSync(join(dir, file), 'utf8')
      const front = source.split(/^---$/mu)[1] ?? ''
      const id = front.match(/^id:\s*["']?([^"'\n]+)/mu)?.[1]?.trim()
      const order = Number(front.match(/^order:\s*(\d+)/mu)?.[1])
      const prereqBlock = front.match(/^prerequisites:\s*\[([^\]]*)\]/mu)?.[1] ?? ''
      const prerequisites = prereqBlock.split(',').map((item) => item.replace(/["'\s]/gu, '')).filter(Boolean)
      if (id) lessons.push({ id, track: track.id, order, prerequisites })
    }
  }
  return { tracks, lessons }
}

// The largest part name (see the band test below), in sky units.
const PART_BOX = { w: 115, h: 66 }

const { tracks, lessons } = corpus('en')
const sky = buildSky(tracks, lessons)

// The catalog the agent-engineering plan commits to (docs/specs/agent-engineering/
// inventory.json): every planned track and lesson laid out before one is
// written, so the 26-track sky is proven before content depends on it.
function plannedCatalog() {
  const inventory = JSON.parse(readFileSync('docs/specs/agent-engineering/inventory.json', 'utf8'))
  const ids = new Set(tracks.map((track) => track.id))
  const known = new Set(lessons.map((lesson) => lesson.id))
  return {
    tracks: [...tracks, ...inventory.tracks.filter((track) => !ids.has(track.id)).map((track) => ({ id: track.id, order: track.order, tier: track.tier, title: track.titleEn, part: track.part }))],
    lessons: [...lessons, ...inventory.lessons.filter((lesson) => !known.has(lesson.id)).map((lesson) => ({ id: lesson.id, track: lesson.track, order: lesson.order, prerequisites: lesson.prerequisites }))],
  }
}
const planned = plannedCatalog()

const layouts = [
  ['published', { tracks, lessons, sky }],
  ['planned', { ...planned, sky: buildSky(planned.tracks, planned.lessons) }],
]

for (const [catalog, { tracks, lessons, sky }] of layouts) {
  test(`${catalog}: every lesson is exactly one star, in a constellation of its own track`, () => {
    assert.equal(sky.stars.length, lessons.length)
    assert.equal(new Set(sky.stars.map((star) => star.id)).size, lessons.length)
    assert.equal(sky.constellations.length, tracks.length)
    for (const constellation of sky.constellations) {
      for (const star of constellation.stars) assert.equal(star.track, constellation.id)
    }
  })

  test(`${catalog}: every star and every name sits on the plate`, () => {
    for (const star of sky.stars) {
      assert.ok(star.x - star.r >= 0 && star.x + star.r <= SKY_WIDTH, `${star.id} x=${star.x}`)
      assert.ok(star.y - star.r >= 0 && star.y + star.r <= sky.height, `${star.id} y=${star.y}`)
    }
    for (const constellation of sky.constellations) {
      assert.ok(constellation.label.y >= 12 && constellation.label.y <= sky.height - 12, `${constellation.id} name y=${constellation.label.y}`)
    }
  })

  test(`${catalog}: every name fits across the plate at its widest`, () => {
    // Names are widest relative to the plate just above the 38rem container
    // query that hides them (SkyChart.astro): ~174 sky units at a 602px chart,
    // ~192 at 545px, because the minimum font clamp holds while the plate
    // shrinks. Fourteen tracks once pushed the first and last names up to 9px
    // past the plate.
    for (const constellation of sky.constellations) {
      const { x } = constellation.label
      assert.ok(x - 100 >= 0 && x + 100 <= SKY_WIDTH, `${constellation.id} name x=${x} leaves the plate`)
    }
  })

  test(`${catalog}: number-only names on a phone do not collide`, () => {
    // Below the 38rem container query a name shrinks to its track number, but
    // at a fixed 0.75rem, so on a 288px chart (a 320px phone) each one measured
    // 24x26px with one digit and 32x26px with two: ~84 or ~112 by 90 sky units.
    // Clamping the last figure inward once put the 11 and 13 tap targets on top
    // of each other there.
    const boxes = sky.constellations.map((item) => {
      const w = String(item.order).length > 1 ? 112 : 84
      return { id: item.id, x: item.label.x - w / 2, y: item.label.y - 45, w, h: 90 }
    })
    for (const [index, a] of boxes.entries()) {
      for (const b of boxes.slice(index + 1)) {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        assert.ok(!overlap, `number names of ${a.id} and ${b.id} overlap on a phone`)
      }
    }
  })

  test(`${catalog}: figures stay landscape, so no chart swallows its page`, () => {
    for (const constellation of sky.constellations) {
      if (constellation.stars.length < 4) continue
      const { width, height } = constellation.box
      assert.ok(width >= height, `${constellation.id}: ${width} wide, ${height} tall`)
    }
  })

  test(`${catalog}: constellations read left to right in course order within each part`, () => {
    const partOf = new Map(tracks.map((track) => [track.id, track.part]))
    for (const part of new Set(partOf.values())) {
      const centers = sky.constellations.filter((item) => partOf.get(item.id) === part).map((item) => item.box.x + item.box.width / 2)
      assert.deepEqual(centers, [...centers].sort((a, b) => a - b), part)
    }
  })

  test(`${catalog}: names on the same side of the ecliptic do not collide`, () => {
    // Measured in Chromium at 1280 and 1440 wide (the hero's two-line names):
    // up to ~200 sky units wide and ~38 tall around each anchor. An earlier
    // 120×30 budget passed while neighbouring names overlapped on screen.
    const boxes = sky.constellations.map((item) => ({ id: item.id, x: item.label.x - 100, y: item.label.y - 20, w: 200, h: 40 }))
    for (const [index, a] of boxes.entries()) {
      for (const b of boxes.slice(index + 1)) {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        assert.ok(!overlap, `names of ${a.id} and ${b.id} overlap`)
      }
    }
  })

  test(`${catalog}: each part's name sits on the plate at its band's top-left, clear of every track name`, () => {
    // The part name is a block in the band's top-left corner (SkyChart.astro,
    // .sky__parts). Its width is capped at 11.5cqi, 115 sky units at any size;
    // its height is pt-BR "Como os modelos de linguagem funcionam" on four
    // lines just above the 45.5rem container query that hides it, where the
    // minimum font is largest relative to the plate (~61 units measured in
    // Chromium at a 736px chart).
    const parts = [...new Set([...tracks].sort((a, b) => a.order - b.order).map((track) => track.part))]
    assert.deepEqual(sky.bands.map((band) => band.part), parts)
    const names = sky.constellations.map((item) => ({ id: item.id, x: item.label.x - 100, y: item.label.y - 20, w: 200, h: 40 }))
    for (const band of sky.bands) {
      const box = { x: PART_LABEL_INSET, y: band.top + PART_LABEL_INSET, ...PART_BOX }
      assert.ok(box.x + box.w <= SKY_WIDTH && box.y + box.h <= band.top + BAND_HEIGHT && box.y + box.h <= sky.height, `${band.part} name leaves its band`)
      for (const name of names) {
        const overlap = box.x < name.x + name.w && name.x < box.x + box.w && box.y < name.y + name.h && name.y < box.y + box.h
        assert.ok(!overlap, `the ${band.part} part name overlaps the name of ${name.id}`)
      }
    }
  })

  test(`${catalog}: no star sits on the plate border`, () => {
    // `r` alone lets a star touch the neatline; the chart needs air at its edges.
    const MARGIN = 14
    for (const star of sky.stars) {
      assert.ok(star.x - star.r >= MARGIN && star.x + star.r <= SKY_WIDTH - MARGIN, `${star.id} x=${star.x} is on the border`)
    }
  })

  test(`${catalog}: small tracks draw small figures instead of being stretched across their column`, () => {
    for (const constellation of sky.constellations) {
      const count = constellation.stars.length
      if (count > 6) continue
      assert.ok(constellation.box.width <= 26 * count, `${constellation.id}: ${count} lessons spread over ${constellation.box.width} units`)
    }
  })

  test(`${catalog}: parts sit in bands, in course order, one below the other`, () => {
    const parts = [...new Set([...tracks].sort((a, b) => a.order - b.order).map((track) => track.part))]
    const partOf = new Map(tracks.map((track) => [track.id, track.part]))
    for (const [index, part] of parts.entries()) {
      const next = parts[index + 1]
      if (!next) continue
      const lowest = Math.max(...sky.constellations.filter((item) => partOf.get(item.id) === part).map((item) => Math.max(item.box.y + item.box.height, item.label.y)))
      const highest = Math.min(...sky.constellations.filter((item) => partOf.get(item.id) === next).map((item) => Math.min(item.box.y, item.label.y)))
      assert.ok(lowest + 90 < highest, `${part} reaches y=${lowest}, ${next} starts at y=${highest}`)
    }
  })
}

test('the layout is deterministic and identical across locales', () => {
  const again = buildSky(tracks, lessons)
  assert.deepEqual(again, sky)
  const pt = corpus('pt-br')
  const ptSky = buildSky(pt.tracks, pt.lessons)
  assert.deepEqual(ptSky.stars.map(({ id, x, y, r }) => ({ id, x, y, r })), sky.stars.map(({ id, x, y, r }) => ({ id, x, y, r })))
})

test('a name entrance never moves or exposes its link', () => {
  // Names once slid into place. While sliding, a bottom-row name sat 2.6px
  // past the plate on a 320px phone, and at 720px a still-transparent pt-BR
  // name lay over its neighbour and took the tap (track 6 for track 4). The
  // entrance now only fades, and a name that is not yet shown takes no taps.
  const css = readFileSync('src/components/SkyChart.astro', 'utf8')
  const names = [...css.matchAll(/\.sky__names li(\[[^\]]*\])? \{ animation: ([\w-]+)/gu)].map((match) => match[2])
  assert.ok(names.length > 0, 'names declare an entrance')
  for (const name of new Set(names)) {
    const frames = css.match(new RegExp(`@keyframes ${name} \\{(.*)\\}\\s*$`, 'mu'))?.[1] ?? ''
    assert.ok(frames, `@keyframes ${name} exists`)
    assert.doesNotMatch(frames, /translate|transform/u, `${name} moves the link while it enters`)
    assert.match(frames, /from \{[^}]*visibility: hidden/u, `${name} leaves a transparent link tappable before it shows`)
  }
})

test('a track with no lessons yet draws nothing instead of breaking the chart', () => {
  const empty = buildSky([...tracks, { id: '99-empty', order: 99, tier: 'core', title: 'Empty', part: 'later' }], lessons)
  assert.equal(empty.constellations.some((item) => item.id === '99-empty'), false)
  assert.deepEqual(empty.stars, sky.stars)
  assert.equal(empty.height, sky.height)
})

test('part names are not drawn on a chart too narrow for their corner', () => {
  // The corner block's height budget holds only above 45.5rem; below it, and
  // on a phone where track names are 84-112 by 90 sky units, a part name
  // would land on them. The tracks index heads each part with the same title.
  const css = readFileSync('src/components/SkyChart.astro', 'utf8')
  const narrow = css.match(/@container \(max-width: 45\.5rem\) \{([\s\S]*?)\n  \}/u)?.[1] ?? ''
  assert.match(narrow, /\.sky__parts \{[^}]*display: none/u)
  assert.match(css, /\.sky__parts a \{[^}]*max-width: 11\.5cqi/u, 'the corner block is capped at PART_BOX.w')
})
