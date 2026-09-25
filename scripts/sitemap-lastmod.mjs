/**
 * `<lastmod>` for every sitemap URL that has a content date.
 *
 * Google uses lastmod only when it is "consistently and verifiably accurate",
 * so it comes from the one date the corpus states — each lesson's frontmatter
 * `updated`, the same value the page shows in its `<time datetime>` — and
 * never from the build clock, which would also break byte-identical rebuilds.
 * A track page takes its newest lesson; a home page and the track index take
 * the newest lesson in their locale. The explorer has no content date and gets
 * none rather than an invented one.
 */
import { displayPath, readLessons, stringField } from './content-utils.mjs'

export function lastmodByPath() {
  const dates = new Map()
  const keepNewest = (path, iso) => {
    const current = dates.get(path)
    if (current === undefined || current < iso) dates.set(path, iso)
  }

  for (const lesson of readLessons()) {
    const updated = stringField(lesson.frontmatter, 'updated', lesson.file)
    const track = stringField(lesson.frontmatter, 'track', lesson.file)
    if (!updated || !track) throw new Error(`${displayPath(lesson.file)}: sitemap lastmod needs updated and track`)
    // `z.coerce.date()` reads "2026-08-20" as UTC midnight; so does `new Date`.
    const iso = new Date(updated).toISOString()
    const prefix = lesson.locale === 'en' ? '' : `/${lesson.locale}`
    dates.set(`${prefix}/lessons/${track}/${lesson.id}/`, iso)
    keepNewest(`${prefix}/tracks/${track}/`, iso)
    keepNewest(`${prefix}/tracks/`, iso)
    keepNewest(`${prefix}/`, iso)
  }
  return dates
}
