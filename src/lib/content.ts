import type { CollectionEntry } from 'astro:content'
import type { Locale } from '~/lib/i18n'

export type Tier = 'foundations' | 'core' | 'advanced' | 'frontier'

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
  const path = `/lessons/${lesson.data.track}/${lesson.data.id}/`
  return locale === 'en' ? path : `/pt-br${path}`
}

export function trackPath(locale: Locale, trackId: string): string {
  const path = `/tracks/${trackId}/`
  return locale === 'en' ? path : `/pt-br${path}`
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
