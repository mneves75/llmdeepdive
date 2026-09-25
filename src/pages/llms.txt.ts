import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { sortLessons, type LessonEntry, type TrackEntry } from '~/lib/content'
import { LOCALES, localeUrl, positionOf, type Locale } from '~/lib/i18n'
import { REPO } from '~/lib/site'
import { BRAND } from '~/lib/seo'

/**
 * `/llms.txt` in the llmstxt.org shape: one H1, a blockquote summary, prose,
 * then H2 sections that hold only link lists (Lighthouse's agentic-browsing
 * audit fails a file that strays from it).
 *
 * Google Search does not read this file, and `_headers` marks it `noindex` so
 * it never competes with the pages it lists. It exists for agents and tools
 * that do fetch it, and costs one generated file.
 */

const sectionTitle: Record<Locale, (position: string, title: string) => string> = {
  en: (position, title) => `Track ${position}: ${title}`,
  'pt-br': (position, title) => `Trilha ${position}: ${title}`,
}

export const GET: APIRoute = async () => {
  const allLessons: LessonEntry[] = await getCollection('lessons')
  const allTracks: TrackEntry[] = await getCollection('tracks')
  // content:parity guarantees both locales carry the same tracks and lessons.
  const tracks = allTracks.filter((track) => track.data.locale === 'en').length
  const lessons = allLessons.filter((lesson) => lesson.data.locale === 'en').length

  const lines = [
    `# ${BRAND}`,
    '',
    '> A free, open-source course on how large language models work, from first principles to efficient inference and the hardware that runs them. Every lesson exists in English and in Brazilian Portuguese.',
    '',
    `There are ${lessons} lessons per language in ${tracks} ordered tracks. Each lesson pairs a concept with an analogy, a teach-back and a quiz, and cites its primary sources; one real model, Qwen3.8-27B, is the worked example throughout. A lesson lives at \`/lessons/<track>/<id>/\` in English and at \`/pt-br/lessons/<track>/<id>/\` in Portuguese. Source and content: ${REPO} (MIT licence).`,
    '',
    '## Start here',
    '',
    `- [Learning tracks](${localeUrl('en', '/tracks/')}): the whole curriculum in order`,
    `- [Anatomy of an LLM](${localeUrl('en', '/explore/')}): an interactive 3D transformer whose components link to the lessons that teach them`,
    `- [Trilhas de aprendizagem](${localeUrl('pt-br', '/tracks/')}): the curriculum in Brazilian Portuguese`,
  ]

  for (const locale of LOCALES) {
    const tracksHere = allTracks.filter((track) => track.data.locale === locale).sort((a, b) => a.data.order - b.data.order)
    const lessonsHere = sortLessons(allLessons.filter((lesson) => lesson.data.locale === locale), tracksHere)
    for (const track of tracksHere) {
      lines.push('', `## ${sectionTitle[locale](positionOf(track.data.id), track.data.title)}`, '')
      for (const lesson of lessonsHere.filter((candidate) => candidate.data.track === track.data.id)) {
        const url = localeUrl(locale, `/lessons/${track.data.id}/${lesson.data.id}/`)
        lines.push(`- [${positionOf(lesson.data.id)} ${lesson.data.title}](${url}): ${lesson.data.summary}`)
      }
    }
  }

  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
