import { getCollection } from 'astro:content'
import type { Locale } from '~/lib/i18n'
import type { LessonEntry, TrackEntry } from '~/lib/content'
import { buildSky, type Sky } from '~/lib/sky'

const cache = new Map<Locale, Promise<Sky>>()

/** The curriculum sky for one locale, built once per build. */
export function getSky(locale: Locale): Promise<Sky> {
  const cached = cache.get(locale)
  if (cached) return cached
  const pending = (async () => {
    const allTracks: TrackEntry[] = await getCollection('tracks')
    const allLessons: LessonEntry[] = await getCollection('lessons')
    const tracks = allTracks.filter((track) => track.data.locale === locale)
    const lessons = allLessons.filter((lesson) => lesson.data.locale === locale)
    return buildSky(
      tracks.map((track) => ({ id: track.data.id, order: track.data.order, tier: track.data.tier, title: track.data.title })),
      lessons.map((lesson) => ({ id: lesson.data.id, track: lesson.data.track, order: lesson.data.order, prerequisites: lesson.data.prerequisites })),
    )
  })()
  cache.set(locale, pending)
  return pending
}

/** A CSS ident for a lesson's star, shared by every chart that draws it. */
export function starTransitionName(lessonId: string): string {
  return `star-${(lessonId.split('-')[0] ?? lessonId).replace('.', '-')}`
}

/** A CSS ident for a track's chart, shared by the track page and its lessons. */
export function chartTransitionName(trackId: string): string {
  return `chart-${trackId.split('-')[0] ?? trackId}`
}
