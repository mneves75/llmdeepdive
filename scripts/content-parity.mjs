#!/usr/bin/env node
import { relative, sep } from 'node:path'
import { displayPath, finish, readLessons, TRACKS_ROOT, walkFiles } from './content-utils.mjs'

const TRACK_EXTENSIONS = new Set(['.json', '.yaml', '.yml'])

try {
  const lessons = readLessons()
  const failures = []
  const byLocale = new Map([['en', new Map()], ['pt-br', new Map()]])

  for (const lesson of lessons) {
    if (!byLocale.has(lesson.locale)) {
      failures.push(displayPath(lesson.file) + ': unsupported locale directory "' + lesson.locale + '"')
      continue
    }
    if (!lesson.id) {
      failures.push(displayPath(lesson.file) + ': missing non-empty frontmatter id')
      continue
    }
    const declaredLocale = lesson.frontmatter.match(/^locale:\s*"([^"]+)"$/mu)?.[1]
    if (declaredLocale !== lesson.locale) {
      failures.push(displayPath(lesson.file) + ': frontmatter locale "' + (declaredLocale ?? 'missing') + '" does not match directory "' + lesson.locale + '"')
    }
    const localeEntries = byLocale.get(lesson.locale)
    if (localeEntries?.has(lesson.id)) {
      failures.push(displayPath(lesson.file) + ': duplicate lesson id "' + lesson.id + '" in ' + lesson.locale)
    } else {
      localeEntries?.set(lesson.id, lesson.file)
    }
  }

  const english = byLocale.get('en') ?? new Map()
  const portuguese = byLocale.get('pt-br') ?? new Map()
  const missingInPortuguese = [...english.keys()].filter((id) => !portuguese.has(id)).sort()
  const missingInEnglish = [...portuguese.keys()].filter((id) => !english.has(id)).sort()
  if (missingInPortuguese.length) failures.push('Missing in pt-br: ' + missingInPortuguese.join(', '))
  if (missingInEnglish.length) failures.push('Missing in en: ' + missingInEnglish.join(', '))

  const trackFiles = walkFiles(TRACKS_ROOT, TRACK_EXTENSIONS)
  if (trackFiles.length === 0) throw new Error(displayPath(TRACKS_ROOT) + ' contains no track files')
  const tracksByLocale = new Map([['en', new Map()], ['pt-br', new Map()]])
  for (const file of trackFiles) {
    const parts = relative(TRACKS_ROOT, file).split(sep)
    const trackLocale = parts.shift() ?? ''
    const key = parts.join('/').replace(/\.(?:json|ya?ml)$/u, '')
    const localeEntries = tracksByLocale.get(trackLocale)
    if (!localeEntries) {
      failures.push(displayPath(file) + ': unsupported track locale directory "' + trackLocale + '"')
    } else if (localeEntries.has(key)) {
      failures.push(displayPath(file) + ': duplicate track key "' + key + '" in ' + trackLocale)
    } else {
      localeEntries.set(key, file)
    }
  }
  const englishTracks = tracksByLocale.get('en') ?? new Map()
  const portugueseTracks = tracksByLocale.get('pt-br') ?? new Map()
  const tracksMissingInPortuguese = [...englishTracks.keys()].filter((key) => !portugueseTracks.has(key)).sort()
  const tracksMissingInEnglish = [...portugueseTracks.keys()].filter((key) => !englishTracks.has(key)).sort()
  if (tracksMissingInPortuguese.length) failures.push('Tracks missing in pt-br: ' + tracksMissingInPortuguese.join(', '))
  if (tracksMissingInEnglish.length) failures.push('Tracks missing in en: ' + tracksMissingInEnglish.join(', '))

  finish(
    'content:parity',
    failures,
    'en: ' + english.size + ' lessons/' + englishTracks.size + ' tracks; pt-br: '
      + portuguese.size + ' lessons/' + portugueseTracks.size + ' tracks',
  )
} catch (error) {
  console.error('content:parity FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
