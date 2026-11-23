#!/usr/bin/env node
/**
 * learning-state-check — the completion record must follow the lesson's rule:
 * present only while the quiz is right and the teach-back meets 80 characters
 * and 15 words, and never withdrawn by a reload.
 *
 * The unit tests model one script ordering. Here the built page runs in real
 * engines, storage is seeded before any script runs, and the record is checked
 * against the input state alone. Run after `pnpm build`: `pnpm verify:learning`.
 */
import { chromium, webkit } from 'playwright'
import { serveDist } from './serve-dist.mjs'

const ROUTE = '/lessons/0-orientation-and-foundations/0.1-what-is-a-language-model/'
const KEYS = {
  teachBack: 'ldd:teach-back:en:0.1-what-is-a-language-model',
  quiz: 'ldd:quiz:en:0.1-what-is-a-language-model',
  complete: 'ldd:complete:en:0.1-what-is-a-language-model',
}
const VALID_ANSWER = 'A language model turns the text it has already read into one score for every token it knows, a sampler picks one token from those scores, the token joins the text, and the same step repeats.'
const INVALID_ANSWER = 'Too short to count.'
const ENGINES = { chromium, webkit }

const words = (text) => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/u).length
}
const meetsFloor = (text) => text.trim().length >= 80 && words(text) >= 15

/** One user action: the storage write the component makes before its event. */
const ACTIONS = {
  'quiz answered right': { quiz: 'true', event: ['ldd:quiz', true] },
  'quiz answered wrong': { quiz: 'false', event: ['ldd:quiz', false] },
  'teach-back meets the floor': { answer: VALID_ANSWER, event: ['ldd:teach-back', true] },
  'teach-back cleared': { answer: null, event: ['ldd:teach-back', false] },
}

const ANSWERS = { valid: VALID_ANSWER, invalid: INVALID_ANSWER, absent: null }
const QUIZZES = { true: 'true', false: 'false', absent: null }

function cases() {
  const out = []
  for (const [answerState, answer] of Object.entries(ANSWERS)) {
    for (const [quizState, quiz] of Object.entries(QUIZZES)) {
      for (const [actionName, action] of Object.entries({ 'no action': null, ...ACTIONS })) {
        out.push({
          name: `teach-back ${answerState}, quiz ${quizState}, ${actionName}`,
          seed: { answer, quiz },
          action: action === null ? null : { name: actionName, ...action },
        })
      }
    }
  }
  return out
}

/** What the promise says the record must be, from the inputs alone. */
function expected(input, action) {
  let teachBack = meetsFloor(input.answer ?? '')
  let quiz = input.quiz === 'true'
  if (action?.answer !== undefined) teachBack = action.answer !== null && meetsFloor(action.answer)
  if (action?.quiz !== undefined) quiz = action.quiz === 'true'
  return teachBack && quiz
}

async function runCase(browser, base, { name, seed, action }) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  // A stale record is seeded on purpose: the page derives the record, it never
  // trusts one, so an illegal "true" must not survive the load.
  await page.addInitScript((data) => {
    localStorage.setItem(data.keys.complete, 'true')
    if (data.seed.answer === null) localStorage.removeItem(data.keys.teachBack)
    else localStorage.setItem(data.keys.teachBack, data.seed.answer)
    if (data.seed.quiz === null) localStorage.removeItem(data.keys.quiz)
    else localStorage.setItem(data.keys.quiz, data.seed.quiz)
  }, { keys: KEYS, seed })
  await page.goto(base + ROUTE)
  if (action) {
    await page.evaluate(([keys, data, type, valid]) => {
      if (data.answer !== undefined) {
        if (data.answer === null) localStorage.removeItem(keys.teachBack)
        else localStorage.setItem(keys.teachBack, data.answer)
        const area = document.querySelector('[data-teach-back] textarea')
        if (area) area.value = data.answer ?? ''
      }
      if (data.quiz !== undefined) localStorage.setItem(keys.quiz, data.quiz)
      document.dispatchEvent(new CustomEvent(type, { detail: { lessonKey: 'en:0.1-what-is-a-language-model', valid } }))
    }, [KEYS, action, ...action.event])
  }
  const observed = await page.evaluate((keys) => {
    const root = document.querySelector('[data-lesson-progress]')
    const status = root?.querySelector('.completion')
    return {
      record: localStorage.getItem(keys.complete),
      quiz: localStorage.getItem(keys.quiz),
      answer: document.querySelector('[data-teach-back] textarea')?.value ?? '',
      text: status?.querySelector('[data-completion-text]')?.textContent?.trim() ?? '',
      completeText: status?.dataset.completeText ?? '',
      incompleteText: status?.dataset.incomplete ?? '',
    }
  }, KEYS)
  await context.close()

  const want = expected(seed, action)
  const wantText = want ? observed.completeText : observed.incompleteText
  const failures = []
  if ((observed.record === 'true') !== want) {
    failures.push(`record is ${observed.record ?? 'absent'}, the rule says ${want ? 'complete' : 'incomplete'}`)
  }
  // Only the record decides the contract: `data-complete` has two writers and
  // their order is not the promise.
  if (observed.text !== wantText) {
    failures.push(`completion text reads "${observed.text}", expected "${wantText}"`)
  }
  if (observed.record === 'true' && (observed.quiz !== 'true' || !meetsFloor(observed.answer))) {
    failures.push('a complete record was left while the stored quiz and teach-back do not both pass')
  }
  for (const message of pageErrors) failures.push(`page error: ${message}`)
  return { name, failures }
}

async function learningStateFailures(browserName, base) {
  const browser = await ENGINES[browserName].launch()
  try {
    const results = []
    for (const testCase of cases()) results.push(await runCase(browser, base, testCase))
    return results.filter((result) => result.failures.length > 0)
  } finally {
    await browser.close()
  }
}

const server = await serveDist()
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const engines = (process.env.LEARNING_STATE_BROWSERS ?? 'chromium,webkit')
    .split(',').map((engine) => engine.trim()).filter(Boolean)
  const unknown = engines.filter((engine) => !(engine in ENGINES))
  if (unknown.length) throw new Error('unknown engine(s): ' + unknown.join(', '))

  let failed = 0
  for (const engine of engines) {
    const failures = await learningStateFailures(engine, base)
    for (const failure of failures) {
      failed += 1
      console.error(`${engine} · ${failure.name}: ${failure.failures.join('; ')}`)
    }
  }
  if (failed > 0) {
    console.error(`learning-state FAIL — ${failed} case(s) broke the completion rule`)
    process.exitCode = 1
  } else {
    console.log(`learning-state PASS — ${cases().length} case(s) in ${engines.join(', ')}: the record is present only while the quiz is right and the teach-back meets its floor, and a reload never withdraws it`)
  }
} catch (error) {
  console.error('learning-state FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
} finally {
  server.close()
}
