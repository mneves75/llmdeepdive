import type { CollectionEntry } from 'astro:content'
import { localePath, type Locale } from '~/lib/i18n'

/** The four depths, in descent order. The content schema and the card strata read this. */
export const TIERS = ['foundations', 'core', 'advanced', 'frontier'] as const
export type Tier = (typeof TIERS)[number]

export type TrackData = {
  id: string
  order: number
  title: string
  summary: string
  tier: Tier
  locale: Locale
}

export type QuizItem = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export type Citation = {
  title: string
  authors: string
  year: number
  url: string
}

export type LessonData = {
  id: string
  track: string
  order: number
  title: string
  summary: string
  tier: Tier
  locale: Locale
  prerequisites: string[]
  unlocks: string[]
  analogy: string
  teachBack: { prompt: string; modelAnswer: string }
  quiz: QuizItem[]
  lab?: { id: string; kind: 'canvas' | 'webgl' | 'calculator'; budgetKb: number }
  citations?: Citation[]
  citationsNotRequired?: string
  updated: Date
}

export type LessonEntry = Omit<CollectionEntry<'lessons'>, 'data'> & { data: LessonData }
export type TrackEntry = Omit<CollectionEntry<'tracks'>, 'data'> & { data: TrackData }

export function lessonPath(locale: Locale, lesson: LessonEntry): string {
  return localePath(locale, `/lessons/${lesson.data.track}/${lesson.data.id}/`)
}

export function trackPath(locale: Locale, trackId: string): string {
  return localePath(locale, `/tracks/${trackId}/`)
}

/** The track a lesson belongs to, from the same locale's tracks; a dangling id fails the build. */
export function trackOf(lesson: LessonEntry, tracks: readonly TrackEntry[]): TrackEntry {
  const track = tracks.find((candidate) => candidate.data.id === lesson.data.track)
  if (!track) throw new Error(`${lesson.data.locale}/${lesson.data.id}: no track "${lesson.data.track}"`)
  return track
}

export function sortLessons(
  lessons: readonly LessonEntry[],
  tracks: readonly TrackEntry[],
): LessonEntry[] {
  const trackOrder = new Map(tracks.map((track) => [track.data.id, track.data.order]))
  return [...lessons].sort((left, right) => {
    const byTrack = (trackOrder.get(left.data.track) ?? Number.MAX_SAFE_INTEGER)
      - (trackOrder.get(right.data.track) ?? Number.MAX_SAFE_INTEGER)
    return byTrack || left.data.order - right.data.order || left.data.id.localeCompare(right.data.id)
  })
}
