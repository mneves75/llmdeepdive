#!/usr/bin/env node
import { relative, sep } from 'node:path'
import { bilingualContentFailures } from './content-locale.mjs'
import { displayPath, finish, objectArrayField, readLessons, stringField, TRACKS_ROOT, walkFiles } from './content-utils.mjs'

const TRACK_EXTENSIONS = new Set(['.json', '.yaml', '.yml'])

try {
  const lessons = readLessons()
  const failures = []
  const byLocale = new Map([['en', new Map()], ['pt-br', new Map()]])
  const quizPositions = new Map([['en', new Map()], ['pt-br', new Map()]])

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
      localeEntries?.set(lesson.id, lesson)
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

  for (const [lessonLocale, localeLessons] of byLocale) {
    const localeTracks = tracksByLocale.get(lessonLocale) ?? new Map()
    for (const lesson of localeLessons.values()) {
      const track = stringField(lesson.frontmatter, 'track', lesson.file)
      if (!track) failures.push(displayPath(lesson.file) + ': missing non-empty frontmatter track')
      else if (!localeTracks.has(track)) {
        failures.push(displayPath(lesson.file) + ': track "' + track + '" does not resolve in ' + lessonLocale)
      }
      const quizzes = objectArrayField(lesson.frontmatter, 'quiz', lesson.file) ?? []
      const localeQuizPositions = quizPositions.get(lessonLocale)
      const trackPositions = (track && localeQuizPositions?.get(track)) ?? new Map()
      if (track && localeQuizPositions) localeQuizPositions.set(track, trackPositions)
      for (const [quizIndex, quiz] of quizzes.entries()) {
        const options = quiz.options
        const correctIndex = quiz.correctIndex
        if (!Array.isArray(options) || options.length < 2) {
          failures.push(displayPath(lesson.file) + ': quiz ' + (quizIndex + 1) + ' needs at least two options')
          continue
        }
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
          failures.push(displayPath(lesson.file) + ': quiz ' + (quizIndex + 1) + ' has invalid correctIndex')
          continue
        }
        const ordinalPositions = trackPositions.get(quizIndex) ?? []
        trackPositions.set(quizIndex, ordinalPositions)
        ordinalPositions.push(correctIndex)
      }
    }
  }
  for (const id of english.keys()) {
    const enLesson = english.get(id)
    const ptLesson = portuguese.get(id)
    if (!enLesson || !ptLesson) continue
    const enTrack = stringField(enLesson.frontmatter, 'track', enLesson.file)
    const ptTrack = stringField(ptLesson.frontmatter, 'track', ptLesson.file)
    if (enTrack !== ptTrack) {
      failures.push('Lesson "' + id + '" is in track "' + enTrack + '" for en but "' + ptTrack + '" for pt-br')
    }
    const enQuizzes = objectArrayField(enLesson.frontmatter, 'quiz', enLesson.file) ?? []
    const ptQuizzes = objectArrayField(ptLesson.frontmatter, 'quiz', ptLesson.file) ?? []
    if (enQuizzes.length !== ptQuizzes.length) {
      failures.push('Lesson "' + id + '" has ' + enQuizzes.length + ' quiz item(s) in en but ' + ptQuizzes.length + ' in pt-br')
    }
    const comparableQuizzes = Math.min(enQuizzes.length, ptQuizzes.length)
    for (let index = 0; index < comparableQuizzes; index += 1) {
      if (enQuizzes[index]?.correctIndex !== ptQuizzes[index]?.correctIndex) {
        failures.push('Lesson "' + id + '" quiz ' + (index + 1) + ' has different correctIndex values across locales')
      }
    }
    for (const failure of bilingualContentFailures(enLesson, ptLesson)) {
      failures.push(displayPath(ptLesson.file) + ': ' + failure)
    }
  }

  for (const [locale, tracks] of quizPositions) {
    for (const [track, positionsByOrdinal] of tracks) {
      for (const [quizIndex, positions] of positionsByOrdinal) {
        if (positions.length < 4) continue
        const counts = new Map()
        for (const position of positions) counts.set(position, (counts.get(position) ?? 0) + 1)
        const largestBucket = Math.max(...counts.values())
        if (counts.size < 3 || largestBucket > Math.ceil(positions.length / 2)) {
          failures.push(locale + ' track "' + track + '" quiz ' + (quizIndex + 1) + ' has predictable answer positions: ' + positions.join(','))
        }
      }
    }
  }

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
