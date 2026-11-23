#!/usr/bin/env node
/**
 * learning-state-check — the completion record must follow the lesson's rule:
 * present only while the quiz is right and the teach-back meets 80 characters
 * and 15 words, and never withdrawn by a reload.
 *
 * Two producers feed the record (the quiz component and the teach-back), and
 * the lesson page derives it from both on every load. The unit tests fake those
 * producers and one script ordering, so this check drives the built page in
 * real engines: producers are exercised through their own controls, storage is
 * seeded before any script runs, and the record is compared with the input
 * state alone. Run after `pnpm build`: `pnpm verify:learning`.
 */
import { chromium, webkit } from 'playwright'
import { serveDist } from './serve-dist.mjs'

const ROUTE = '/lessons/0-orientation-and-foundations/0.1-what-is-a-language-model/'
const KEYS = {
  teachBack: 'ldd:teach-back:en:0.1-what-is-a-language-model',
  quiz: 'ldd:quiz:en:0.1-what-is-a-language-model',
  complete: 'ldd:complete:en:0.1-what-is-a-language-model',
}
const ENGINES = { chromium, webkit }

const words = (text) => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/u).length
}
const meetsFloor = (text) => text.trim().length >= 80 && words(text) >= 15

/**
 * Answers that sit on and around both floors, so a regression to one floor
 * alone, or `>=` to `>`, cannot pass. Each string is asserted against its
 * intended counts below.
 */
const wordsOf = (sizes) => sizes.map((size, index) => String.fromCharCode(97 + index).repeat(size)).join(' ')
const ANSWERS = {
  'both floors': [wordsOf([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 10]), true],
  'one character short': [wordsOf([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9]), false],
  'one word short': [wordsOf([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 15]), false],
  'long but few words': [wordsOf([22, 22, 22, 21]), false],
  'many short words': [wordsOf([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]), false],
  'comfortably over': ['A language model turns the text it has already read into one score for every token it knows, a sampler picks one token from those scores, the token joins the text, and the same step repeats.', true],
  absent: [null, false],
  'wrong answer': ['Too short to count.', false],
}

for (const [name, [answer, expected]] of Object.entries(ANSWERS)) {
  if (answer === null) continue
  const actual = answer.trim().length >= 80 && words(answer) >= 15
  if (actual !== expected) throw new Error(`answer fixture "${name}" does not sit where it claims`)
}

const TEACH_BACK_CASES = Object.entries(ANSWERS)
  .filter(([, [answer]]) => answer !== null)
  .map(([name, [answer, expected]]) => ({ name, answer, expected }))

const ACTIONS = {
  'quiz answered right': { quiz: 'true', event: ['ldd:quiz', true] },
  'quiz answered wrong': { quiz: 'false', event: ['ldd:quiz', false] },
  'teach-back meets the floor': { answer: ANSWERS['both floors'][0], event: ['ldd:teach-back', true] },
  'teach-back cleared': { answer: null, event: ['ldd:teach-back', false] },
}
const QUIZZES = { true: 'true', false: 'false', absent: null }

function cases() {
  const out = []
  for (const [answerState, [answer]] of Object.entries(ANSWERS)) {
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

function expected(input, action) {
  let teachBack = meetsFloor(input.answer ?? '')
  let quiz = input.quiz === 'true'
  if (action?.answer !== undefined) teachBack = action.answer !== null && meetsFloor(action.answer)
  if (action?.quiz !== undefined) quiz = action.quiz === 'true'
  return teachBack && quiz
}

/** The two completion lines the page declares, read once as the text oracle. */
async function completionLines(page) {
  const lines = await page.evaluate(() => {
    const status = document.querySelector('[data-lesson-progress] .completion')
    return { complete: status?.dataset.completeText ?? '', incomplete: status?.dataset.incomplete ?? '' }
  })
  if (!lines.complete || !lines.incomplete || lines.complete === lines.incomplete) {
    throw new Error('the lesson page does not declare two distinct completion lines')
  }
  return lines
}

async function runCase(browser, base, { name, seed, action }, lines) {
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
    const status = document.querySelector('[data-lesson-progress] .completion')
    return {
      record: localStorage.getItem(keys.complete),
      quiz: localStorage.getItem(keys.quiz),
      answer: document.querySelector('[data-teach-back] textarea')?.value ?? '',
      text: status?.querySelector('[data-completion-text]')?.textContent?.trim() ?? '',
    }
  }, KEYS)
  await context.close()

  const want = expected(seed, action)
  const failures = []
  if ((observed.record === 'true') !== want) {
    failures.push(`record is ${observed.record ?? 'absent'}, the rule says ${want ? 'complete' : 'incomplete'}`)
  }
  const wantText = want ? lines.complete : lines.incomplete
  if (observed.text !== wantText) failures.push(`completion text reads "${observed.text}"`)
  if (observed.record === 'true' && (observed.quiz !== 'true' || !meetsFloor(observed.answer))) {
    failures.push('a complete record was left while the stored quiz and teach-back do not both pass')
  }
  for (const message of pageErrors) failures.push(`page error: ${message}`)
  return { name, failures }
}

/** The producers themselves, driven through their own controls. */
async function producerFailures(browser, base) {
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    const failures = []
    // A learner whose teach-back already passes: a real quiz click must then
    // move the completion record itself, not only the quiz record.
    await page.addInitScript((keys) => {
      localStorage.setItem(keys.teachBack, 'A language model turns the text it has already read into one score for every token it knows, a sampler picks one token from those scores, the token joins the text, and the same step repeats.')
      localStorage.removeItem(keys.quiz)
    }, KEYS)
    await page.goto(base + ROUTE)

    const checkQuiz = (pick) => page.evaluate(({ choose }) => {
      const root = document.querySelector('[data-lesson-quiz]')
      const key = root.getAttribute('data-check-key')
      const correct = JSON.parse(root.getAttribute('data-correct'))
      const fieldsets = [...root.querySelectorAll('fieldset')]
      fieldsets.forEach((fieldset, index) => {
        const want = choose === 'wrong' && index === 0 ? (correct[0] + 1) % fieldset.querySelectorAll('input').length : correct[index]
        for (const input of fieldset.querySelectorAll('input')) input.checked = Number(input.value) === want
      })
      root.querySelector('[data-quiz-check]').click()
      return {
        stored: localStorage.getItem(`ldd:quiz:${key}`),
        results: fieldsets.map((fieldset) => fieldset.getAttribute('data-result')),
        complete: localStorage.getItem(`ldd:complete:${key}`),
      }
    }, { choose: pick })

    const right = await checkQuiz('right')
    if (right.stored !== 'true') failures.push(`the quiz stored "${right.stored}" for the documented answers`)
    if (right.results.some((result) => result !== 'right')) {
      failures.push(`the quiz marked documented answers ${JSON.stringify(right.results)}`)
    }
    if (right.complete !== 'true') {
      failures.push(`a correct quiz and a passing teach-back left the record ${right.complete ?? 'absent'}`)
    }
    const wrong = await checkQuiz('wrong')
    if (wrong.stored !== 'false') failures.push(`the quiz stored "${wrong.stored}" with one wrong answer`)
    if (!wrong.results.includes('wrong')) failures.push('the quiz did not mark the wrong answer wrong')
    if (wrong.complete === 'true') failures.push('a wrong answer left the record complete')

    // After the quiz cases, which leave one answer wrong on purpose.
    for (const testCase of TEACH_BACK_CASES) {
      const state = await page.evaluate((value) => {
        const area = document.querySelector('[data-teach-back] textarea')
        area.value = value
        area.dispatchEvent(new Event('input', { bubbles: true }))
        return document.querySelector('[data-teach-back]')?.getAttribute('data-complete')
      }, testCase.answer)
      if (state !== String(testCase.expected)) {
        failures.push(`teach-back "${testCase.name}" reports data-complete ${state}`)
      }
    }

    await context.close()
    return failures
  }
}

async function learningStateFailures(browserName, base) {
  const browser = await ENGINES[browserName].launch()
  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(base + ROUTE)
    const lines = await completionLines(page)
    await context.close()
    const results = []
    for (const testCase of cases()) results.push(await runCase(browser, base, testCase, lines))
    return [
      ...results.filter((result) => result.failures.length > 0),
      ...(await producerFailures(browser, base)).map((failure) => ({ name: 'producer', failures: [failure] })),
    ]
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
  if (engines.length === 0) throw new Error('no engine selected; unset LEARNING_STATE_BROWSERS for the default')

  let failed = 0
  for (const engine of engines) {
    for (const failure of await learningStateFailures(engine, base)) {
      failed += 1
      console.error(`${engine} · ${failure.name}: ${failure.failures.join('; ')}`)
    }
  }
  if (failed > 0) {
    console.error(`learning-state FAIL — ${failed} case(s) broke the completion rule`)
    process.exitCode = 1
  } else {
    console.log(`learning-state PASS — ${cases().length} record case(s) and both producers in ${engines.join(', ')}: the record is present only while the quiz is right and the teach-back meets its floor, and a reload never withdraws it`)
  }
} catch (error) {
  console.error('learning-state FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
} finally {
  server.close()
}
