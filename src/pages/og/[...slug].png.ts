import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro'
import { getCollection } from 'astro:content'
import { LOCALES, localePath } from '~/lib/i18n'
import { lessonPath, trackOf, trackPath, type LessonEntry, type TrackEntry } from '~/lib/content'
import { renderCard } from '~/lib/og-render'
import { exploreCard, homeCard, lessonCard, ogSlug, trackCard, tracksCard, type Card } from '~/lib/seo'

/**
 * One 1200×630 card per page, at `/og/<page path>.png`. Every page's
 * `og:image` points here by the same `ogSlug` rule, and `tests/seo.test.mjs`
 * fails when a page names a card this endpoint did not draw.
 */
export const getStaticPaths = (async () => {
  const allLessons: LessonEntry[] = await getCollection('lessons')
  const allTracks: TrackEntry[] = await getCollection('tracks')
  const paths: Array<{ params: { slug: string }; props: { card: Card } }> = []
  const add = (fullPath: string, card: Card): void => {
    paths.push({ params: { slug: ogSlug(fullPath) }, props: { card } })
  }

  for (const locale of LOCALES) {
    const tracks = allTracks.filter((track) => track.data.locale === locale)
    const lessons = allLessons.filter((lesson) => lesson.data.locale === locale)
    const size = { tracks: tracks.length, lessons: lessons.length }

    add(localePath(locale, '/'), homeCard(locale, size))
    add(localePath(locale, '/tracks/'), tracksCard(locale, size))
    add(localePath(locale, '/explore/'), exploreCard(locale))
    for (const track of tracks) {
      const count = lessons.filter((lesson) => lesson.data.track === track.data.id).length
      add(trackPath(locale, track.data.id), trackCard(locale, { track: track.data, lessons: count }))
    }
    for (const lesson of lessons) {
      add(lessonPath(locale, lesson), lessonCard(locale, { lesson: lesson.data, track: trackOf(lesson, tracks).data }))
    }
  }
  return paths
}) satisfies GetStaticPaths

type Props = InferGetStaticPropsType<typeof getStaticPaths>

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(new Uint8Array(await renderCard(props.card)), { headers: { 'Content-Type': 'image/png' } })
