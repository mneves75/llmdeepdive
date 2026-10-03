/**
 * The curriculum sky: every lesson a star, every track a constellation.
 *
 * One deterministic layout feeds every chart on the site — the home chart, a
 * track's constellation, the "you are here" plate in a lesson header, and the
 * 3D sky that replaces the home chart when WebGL is available (it reads the
 * server-rendered SVG, so it cannot disagree with it).
 *
 * Nothing here is random at build time. Positions come from a hash of the
 * lesson id, so both locales draw the identical sky and a rebuild is
 * byte-identical. Adding a lesson moves only its own constellation.
 *
 * What the drawing encodes (and nothing else):
 * - a constellation's stars are its lessons, joined in course order;
 * - a star's size is its in-degree in the prerequisite graph — the lessons
 *   other lessons stand on are the bright ones;
 * - a star's pigment is its tier (spectral class, hot to cool with depth);
 * - constellations sit left to right in track order, alternating above and
 *   below the course's ecliptic; within one, lessons run as a serpentine.
 */

export const SKY_WIDTH = 1000
export const SKY_HEIGHT = 560

export interface SkyTrackInput {
  id: string
  order: number
  tier: string
  title: string
}

export interface SkyLessonInput {
  id: string
  track: string
  order: number
  prerequisites: readonly string[]
}

export interface SkyStar {
  id: string
  track: string
  tier: string
  x: number
  y: number
  /** Drawn radius in sky units. */
  r: number
  /** How many lessons list this one as a prerequisite. */
  inDegree: number
}

export interface SkyConstellation {
  id: string
  order: number
  tier: string
  title: string
  /** Stars in course order. */
  stars: SkyStar[]
  /** Consecutive pairs, in course order. */
  lines: Array<[SkyStar, SkyStar]>
  box: { x: number; y: number; width: number; height: number }
  /** Where the name plate hangs (above or below the figure, away from neighbours). */
  label: { x: number; y: number; anchor: 'above' | 'below' }
}

export interface Sky {
  width: number
  height: number
  constellations: SkyConstellation[]
  stars: SkyStar[]
}

/** FNV-1a, 32-bit. Stable across engines; good enough to scatter a walk. */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

/** A value in [0, 1) derived from a key and a salt. */
function unit(key: string, salt: string): number {
  return hash(`${salt}:${key}`) / 0x1_0000_0000
}

const round = (value: number): number => Math.round(value * 10) / 10

const MIN_RADIUS = 2.2
const MAX_RADIUS = 6
const MAX_DEGREE_FOR_SCALE = 6
/** Air between any star and the plate's neatline, in sky units. */
const PLATE_MARGIN = 16

export function buildSky(tracks: readonly SkyTrackInput[], lessons: readonly SkyLessonInput[]): Sky {
  const ordered = [...tracks].sort((left, right) => left.order - right.order)
  const count = Math.max(ordered.length, 1)
  const inDegree = new Map<string, number>()
  for (const lesson of lessons) {
    for (const prerequisite of lesson.prerequisites) inDegree.set(prerequisite, (inDegree.get(prerequisite) ?? 0) + 1)
  }

  const marginX = 34
  const cell = (SKY_WIDTH - marginX * 2) / count
  const constellations = ordered.map((track, index): SkyConstellation => {
    const trackLessons = lessons
      .filter((lesson) => lesson.track === track.id)
      .sort((left, right) => left.order - right.order)

    // Two staggered rows along the course's ecliptic: even tracks above, odd
    // below, so each figure can be wider than one column without touching a
    // neighbour, and names sit on the outer side of their row.
    const centerX = marginX + cell * (index + 0.5)
    const high = index % 2 === 0
    const centerY = SKY_HEIGHT * (high ? 0.33 : 0.67) + Math.sin(index * 1.7) * 14
    const width = cell * 1.65
    const height = SKY_HEIGHT * 0.26

    // A serpentine with seeded jitter: lessons run left to right, step down,
    // run back. Every figure stays landscape and compact, reads in course
    // order, and still looks drawn by hand rather than gridded.
    const columns = Math.max(2, Math.ceil(Math.sqrt(trackLessons.length * 1.8)))
    const raw = trackLessons.map((lesson, step) => {
      const row = Math.floor(step / columns)
      const along = step % columns
      const column = row % 2 === 0 ? along : columns - 1 - along
      return {
        lesson,
        x: column + (unit(lesson.id, 'jitter-x') - 0.5) * 0.75,
        y: row * 1.15 + (unit(lesson.id, 'jitter-y') - 0.5) * 0.75,
      }
    })

    const xs = raw.map((point) => point.x)
    const ys = raw.map((point) => point.y)
    const minX = Math.min(...xs, 0)
    const maxX = Math.max(...xs, 0)
    const minY = Math.min(...ys, 0)
    const maxY = Math.max(...ys, 0)
    const spanX = Math.max(maxX - minX, 1)
    const spanY = Math.max(maxY - minY, 1)
    // Small tracks stay small: a four-lesson track is a small figure, not one
    // stretched across its whole column.
    const scale = Math.min(width / spanX, height / spanY, 12 + trackLessons.length * 3)
    // Keep the figure off the plate's neatline: shift it inward if its column
    // sits at the edge of the chart.
    const halfWidth = (spanX * scale) / 2 + MAX_RADIUS
    const clampedX = Math.min(Math.max(centerX, PLATE_MARGIN + halfWidth), SKY_WIDTH - PLATE_MARGIN - halfWidth)
    const offsetX = clampedX - ((minX + maxX) / 2) * scale
    const offsetY = centerY - ((minY + maxY) / 2) * scale

    const stars = raw.map(({ lesson, x, y }): SkyStar => {
      const degree = inDegree.get(lesson.id) ?? 0
      const r = MIN_RADIUS + (Math.min(degree, MAX_DEGREE_FOR_SCALE) / MAX_DEGREE_FOR_SCALE) * (MAX_RADIUS - MIN_RADIUS)
      return {
        id: lesson.id,
        track: track.id,
        tier: track.tier,
        x: round(offsetX + x * scale),
        y: round(offsetY + y * scale),
        r: round(r),
        inDegree: degree,
      }
    })

    const left = Math.min(...stars.map((star) => star.x))
    const right = Math.max(...stars.map((star) => star.x))
    const top = Math.min(...stars.map((star) => star.y))
    const bottom = Math.max(...stars.map((star) => star.y))
    const box = { x: round(left), y: round(top), width: round(right - left), height: round(bottom - top) }
    const label = high
      ? { x: round((left + right) / 2), y: round(top - 26), anchor: 'above' as const }
      : { x: round((left + right) / 2), y: round(bottom + 28), anchor: 'below' as const }

    return {
      id: track.id,
      order: track.order,
      tier: track.tier,
      title: track.title,
      stars,
      lines: stars.slice(1).map((star, step): [SkyStar, SkyStar] => [stars[step] as SkyStar, star]),
      box,
      label,
    }
  })

  return { width: SKY_WIDTH, height: SKY_HEIGHT, constellations, stars: constellations.flatMap((item) => item.stars) }
}

/** A viewBox that frames one constellation with room for its markers. */
export function constellationViewBox(constellation: SkyConstellation, padding = 18): string {
  const { box } = constellation
  const width = Math.max(box.width, 60) + padding * 2
  const height = Math.max(box.height, 40) + padding * 2
  const x = box.x + box.width / 2 - width / 2
  const y = box.y + box.height / 2 - height / 2
  return `${round(x)} ${round(y)} ${round(width)} ${round(height)}`
}

/** SVG path data for a constellation's lines, in course order. */
export function constellationPath(constellation: SkyConstellation): string {
  return constellation.stars.map((star, index) => `${index === 0 ? 'M' : 'L'}${star.x} ${star.y}`).join(' ')
}

/** Total path length, for stroke draw-on animation (`pathLength` normalises it, this sizes the dash). */
export function pathLength(constellation: SkyConstellation): number {
  let total = 0
  for (const [from, to] of constellation.lines) total += Math.hypot(to.x - from.x, to.y - from.y)
  return round(total)
}
