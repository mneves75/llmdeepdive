import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function componentScript(relativePath) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
  const match = source.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/u)
  assert.ok(match, `expected a client script in ${relativePath}`)
  return ts.transpileModule(match[1], {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText
}

function execute(script, globals) {
  const names = Object.keys(globals)
  const values = Object.values(globals)
  Function(...names, `"use strict";\n${script}`)(...values)
}

function teachBackHarness({ savedAnswer = '', setItem, removeItem }) {
  const statusText = { textContent: 'Waiting for your explanation.' }
  const listeners = new Map()
  const textarea = {
    value: '',
    focused: false,
    focus() { this.focused = true },
    addEventListener: (type, listener) => listeners.set(type, listener),
  }
  const clear = {
    hidden: true,
    addEventListener: (type, listener) => listeners.set(`clear:${type}`, listener),
  }
  const root = {
    dataset: { lessonKey: 'en:lesson' },
    querySelector: (selector) => ({
      textarea,
      '[data-status-text]': statusText,
      '[data-teach-back-clear]': clear,
    })[selector] ?? null,
    closest: () => null,
  }
  const events = []
  const writes = []
  const document = {
    querySelectorAll: () => [root],
    dispatchEvent: (event) => events.push(event),
  }
  class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init.detail
    }
  }

  execute(componentScript('src/components/TeachBack.astro'), {
    CustomEvent,
    document,
    localStorage: {
      getItem: () => savedAnswer,
      setItem: (key, value) => {
        writes.push([key, value])
        setItem?.()
      },
      removeItem: (key) => {
        removeItem?.()
        writes.push([key, null])
      },
    },
  })
  return { clear, events, listeners, root, statusText, textarea, writes }
}

const LONG_ANSWER = 'These sixteen words make the response long enough to satisfy both learning requirements before persistence is attempted.'

test('teach-back does not report completion when local persistence fails', () => {
  const harness = teachBackHarness({ savedAnswer: LONG_ANSWER, setItem: () => { throw new Error('quota exceeded') } })
  harness.textarea.value = LONG_ANSWER + ' More.'
  harness.listeners.get('input')()

  assert.match(harness.statusText.textContent, /could not save/iu)
  assert.equal(harness.root.dataset.complete, 'false')
  assert.equal(harness.root.dataset.saveError, 'true')
  assert.deepEqual(harness.events.at(-1)?.detail, { lessonKey: 'en:lesson', valid: false })
})

test('teach-back loads a saved answer without writing or claiming a new save', () => {
  const stored = teachBackHarness({ savedAnswer: LONG_ANSWER })
  assert.deepEqual(stored.writes, [])
  assert.equal(stored.root.dataset.complete, 'true')
  assert.deepEqual(stored.events.at(-1)?.detail, { lessonKey: 'en:lesson', valid: true })

  const empty = teachBackHarness({ setItem: () => { throw new Error('blocked') } })
  assert.deepEqual(empty.writes, [])
  assert.equal(empty.statusText.textContent, 'Waiting for your explanation.')
  assert.equal(empty.root.dataset.saveError, 'false')
})

test('clearing the teach-back removes the stored answer and resets completion', () => {
  const harness = teachBackHarness({ savedAnswer: LONG_ANSWER })
  assert.equal(harness.clear.hidden, false)
  assert.equal(harness.root.dataset.complete, 'true')

  harness.listeners.get('clear:click')()

  assert.deepEqual(harness.writes, [['ldd:teach-back:en:lesson', null]])
  assert.equal(harness.textarea.value, '')
  assert.equal(harness.textarea.focused, true)
  assert.equal(harness.root.dataset.complete, 'false')
  assert.equal(harness.statusText.textContent, 'Waiting for your explanation.')
  assert.deepEqual(harness.events.at(-1)?.detail, { lessonKey: 'en:lesson', valid: false })
})

test('a teach-back answer that cannot be cleared stays visible and says so', () => {
  const harness = teachBackHarness({ savedAnswer: LONG_ANSWER, removeItem: () => { throw new Error('blocked') } })
  harness.listeners.get('clear:click')()
  assert.equal(harness.textarea.value, LONG_ANSWER)
  assert.equal(harness.root.dataset.saveError, 'true')
  assert.match(harness.statusText.textContent, /could not clear/iu)
})

function quizHarness({ answers, correct, stored = null, setItem }) {
  const listeners = new Map()
  const status = { textContent: '' }
  const fieldsets = answers.map((answer) => {
    const explanation = { hidden: false }
    const verdict = { textContent: '' }
    const inputs = [{ addEventListener: () => {} }]
    return {
      dataset: {},
      explanation,
      verdict,
      querySelector: (selector) => ({
        'input:checked': answer === null ? null : { value: String(answer) },
        '[data-explanation]': explanation,
        '[data-verdict]': verdict,
      })[selector] ?? null,
      querySelectorAll: () => inputs,
    }
  })
  const root = {
    dataset: {
      lessonKey: 'en:lesson',
      correct: JSON.stringify(correct),
      right: 'Correct',
      wrong: 'Not yet',
      summary: '{n} of {m} correct.',
      passed: 'Correct.',
      unsaved: 'Correct, but this device could not save it.',
    },
    querySelector: (selector) => selector === '[data-quiz-check]'
      ? { addEventListener: (type, listener) => listeners.set(type, listener) }
      : selector === '[role="status"]'
        ? status
        : null,
    querySelectorAll: () => fieldsets,
    closest: () => null,
  }
  const events = []
  const writes = []
  class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init.detail
    }
  }

  execute(componentScript('src/components/LessonQuiz.astro'), {
    CustomEvent,
    document: { querySelectorAll: () => [root], dispatchEvent: (event) => events.push(event) },
    localStorage: {
      getItem: () => stored,
      setItem: (key, value) => {
        setItem?.()
        writes.push([key, value])
      },
    },
  })
  return { check: () => listeners.get('click')(), events, fieldsets, root, status, writes }
}

test('a correct quiz that cannot be saved does not complete the lesson', () => {
  const quiz = quizHarness({ answers: [0, 2], correct: [0, 2], setItem: () => { throw new Error('blocked') } })
  quiz.check()

  assert.equal(quiz.root.dataset.complete, 'false')
  assert.match(quiz.status.textContent, /could not save/iu)
  assert.deepEqual(quiz.events.at(-1)?.detail, { lessonKey: 'en:lesson', valid: false })
})

test('quiz explanations stay hidden until their own question is answered right', () => {
  const quiz = quizHarness({ answers: [0, 1], correct: [0, 2] })
  assert.deepEqual(quiz.fieldsets.map((f) => f.explanation.hidden), [true, true])

  quiz.check()

  assert.deepEqual(quiz.fieldsets.map((f) => f.dataset.result), ['right', 'wrong'])
  assert.deepEqual(quiz.fieldsets.map((f) => f.verdict.textContent), ['Correct', 'Not yet'])
  assert.deepEqual(quiz.fieldsets.map((f) => f.explanation.hidden), [false, true])
  assert.deepEqual(quiz.fieldsets.map((f) => f.explanation.open === true), [true, false])
  assert.equal(quiz.status.textContent, '1 of 2 correct.')
  assert.equal(quiz.root.dataset.complete, 'false')
  assert.deepEqual(quiz.writes, [['ldd:quiz:en:lesson', 'false']])
})

test('a quiz passed before keeps its explanations open', () => {
  const quiz = quizHarness({ answers: [null, null], correct: [0, 2], stored: 'true' })
  assert.deepEqual(quiz.fieldsets.map((f) => f.explanation.hidden), [false, false])
})

test('the lesson records completion for track pages and withdraws it', () => {
  const listeners = new Map()
  const writes = []
  const statusText = { textContent: 'Complete the teach-back and answer the quiz correctly to finish this lesson.' }
  const completion = {
    dataset: { incomplete: 'Complete the teach-back and answer the quiz correctly to finish this lesson.', completeText: 'Lesson completed on this device.' },
    querySelector: (selector) => selector === '[data-completion-text]' ? statusText : null,
  }
  const root = {
    dataset: { lessonKey: 'en:lesson' },
    querySelector: (selector) => selector === '.completion'
      ? completion
      : selector === '[data-teach-back]'
        ? { dataset: { complete: 'true' } }
        : null,
  }
  const document = {
    documentElement: { lang: 'en' },
    querySelectorAll: (selector) => selector === '[data-lesson-progress]' ? [root] : [],
    addEventListener: (type, listener) => listeners.set(type, listener),
  }
  class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init.detail
    }
  }
  execute(componentScript('src/layouts/Lesson.astro'), {
    CustomEvent,
    ResizeObserver: class {},
    document,
    localStorage: {
      getItem: () => 'true',
      setItem: (key, value) => writes.push([key, value]),
      removeItem: (key) => writes.push([key, null]),
    },
  })

  assert.equal(root.dataset.complete, 'true')
  assert.deepEqual(writes.at(-1), ['ldd:complete:en:lesson', 'true'])
  assert.match(statusText.textContent, /completed on this device/iu)

  listeners.get('ldd:quiz')(Object.assign(new CustomEvent('ldd:quiz', { detail: { lessonKey: 'en:lesson', valid: false } })))
  assert.equal(root.dataset.complete, 'false')
  assert.deepEqual(writes.at(-1), ['ldd:complete:en:lesson', null])
})

test('ArrowUp from the search input focuses the last result', () => {
  class FakeHTMLElement {}
  const listeners = new Map()
  const document = {
    activeElement: null,
    querySelector: () => null,
    addEventListener: () => {},
  }
  class Focusable extends FakeHTMLElement {
    focus() { document.activeElement = this }
  }
  const input = new Focusable()
  input.addEventListener = () => {}
  const links = Array.from({ length: 8 }, () => new Focusable())
  const list = { innerHTML: '', querySelectorAll: () => links }
  const status = { textContent: '' }
  const dialog = {
    dataset: { empty: 'No results.', hint: 'Type to search', countOne: '1 result', countOther: '{n} results' },
    open: true,
    addEventListener: (type, listener) => listeners.set(type, listener),
    close: () => {},
  }
  const opener = new Focusable()
  opener.addEventListener = () => {}
  document.querySelector = (selector) => ({
    '[data-search-dialog]': dialog,
    '[data-search-input]': input,
    '[data-search-results]': list,
    '[data-search-status]': status,
    '[data-search-open]': opener,
  })[selector] ?? null

  execute(componentScript('src/components/Search.astro'), {
    HTMLElement: FakeHTMLElement,
    document,
    location: { href: 'https://example.test/', origin: 'https://example.test' },
    window: { clearTimeout: () => {}, setTimeout: () => 1 },
  })

  document.activeElement = input
  let prevented = false
  listeners.get('keydown')({ key: 'ArrowUp', preventDefault: () => { prevented = true } })

  assert.equal(prevented, true)
  assert.equal(document.activeElement, links.at(-1))
})

test('scroll wrappers are named focusable regions only while they overflow', () => {
  class FakeHTMLElement {
    constructor(scrollWidth, clientWidth) {
      this.scrollWidth = scrollWidth
      this.clientWidth = clientWidth
      this.dataset = {}
      this.attributes = new Map([['role', 'region'], ['tabindex', '0'], ['aria-label', 'Formula, scrollable']])
    }
    getAttribute(name) { return this.attributes.get(name) ?? null }
    setAttribute(name, value) { this.attributes.set(name, value) }
    removeAttribute(name) { this.attributes.delete(name) }
  }
  const wide = new FakeHTMLElement(900, 320)
  const narrow = new FakeHTMLElement(200, 320)
  let notify
  class ResizeObserver {
    constructor(callback) { notify = callback }
    observe() {}
  }
  const document = {
    querySelectorAll: (selector) => selector === '.math-scroll, .table-scroll' ? [wide, narrow] : [],
    addEventListener: () => {},
  }

  execute(componentScript('src/layouts/Lesson.astro'), { HTMLElement: FakeHTMLElement, ResizeObserver, document })
  notify([{ target: wide }, { target: narrow }])

  assert.equal(wide.getAttribute('role'), 'region')
  assert.equal(wide.getAttribute('tabindex'), '0')
  assert.equal(narrow.getAttribute('role'), null)
  assert.equal(narrow.getAttribute('tabindex'), null)
  assert.equal(narrow.getAttribute('aria-label'), null)

  narrow.clientWidth = 120
  notify([{ target: narrow }])
  assert.equal(narrow.getAttribute('role'), 'region')
  assert.equal(narrow.getAttribute('aria-label'), 'Formula, scrollable')
})

function themeHarness({ stored, setItem }) {
  const listeners = new Map()
  const inputs = ['light', 'auto', 'dark'].map((value) => ({
    value,
    checked: value === 'auto',
    addEventListener: (type, listener) => listeners.set(`${value}:${type}`, listener),
  }))
  const status = { textContent: '', dataset: { message: 'Could not save the theme.' } }
  const attributes = new Map()
  const group = {
    dataset: {},
    querySelectorAll: () => inputs,
    querySelector: () => status,
    removeAttribute: (name) => attributes.delete(name),
    set title(value) { attributes.set('title', value) },
  }
  const root = { dataset: {} }
  const store = new Map(stored === undefined ? [] : [['ldd-theme', stored]])
  const removed = []
  const windowListeners = new Map()
  execute(componentScript('src/components/ThemeToggle.astro'), {
    document: { documentElement: root, querySelectorAll: () => [group] },
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { setItem?.(); store.set(key, value) },
      removeItem: (key) => { removed.push(key); store.delete(key) },
    },
    window: {
      addEventListener: (type, listener) => windowListeners.set(type, listener),
      matchMedia: () => ({ matches: true }),
    },
  })
  return { attributes, group, inputs, listeners, removed, root, status, store, windowListeners }
}

test('a corrupt stored theme falls back to auto and is cleared', () => {
  const theme = themeHarness({ stored: 'purple' })
  assert.deepEqual(theme.removed, ['ldd-theme'])
  assert.equal(theme.root.dataset.theme, undefined)
  assert.deepEqual(theme.inputs.map((input) => input.checked), [false, true, false])
})

test('a theme that cannot be saved still applies and says so', () => {
  const theme = themeHarness({ setItem: () => { throw new Error('blocked') } })
  const dark = theme.inputs[2]
  dark.checked = true
  theme.listeners.get('dark:change')()
  assert.equal(theme.root.dataset.theme, 'dark')
  assert.equal(theme.group.dataset.saveError, 'true')
  assert.equal(theme.status.textContent, 'Could not save the theme.')
  assert.equal(theme.attributes.get('title'), 'Could not save the theme.')
})

test('a theme chosen in another tab is reflected here', () => {
  const theme = themeHarness({ stored: 'light' })
  assert.equal(theme.root.dataset.theme, 'light')
  theme.windowListeners.get('storage')({ key: 'ldd-theme', newValue: 'dark' })
  assert.equal(theme.root.dataset.theme, 'dark')
  assert.deepEqual(theme.inputs.map((input) => input.checked), [false, false, true])
  theme.windowListeners.get('storage')({ key: null, newValue: null })
  assert.equal(theme.root.dataset.theme, undefined)
})

test('track pages mark only lessons this browser completed', () => {
  const row = (key) => {
    const marker = { hidden: true }
    return { dataset: { lessonKey: key }, marker, querySelector: () => marker }
  }
  const rows = [row('en:a'), row('en:b'), row('en:c')]
  const progress = { hidden: true, textContent: '', dataset: { template: '{n} of {m} completed on this device' } }
  const section = {
    querySelectorAll: () => rows,
    querySelector: (selector) => selector === '[data-progress]' ? progress : null,
  }
  const map = { querySelectorAll: () => [section] }
  const done = new Set(['ldd:complete:en:a', 'ldd:complete:en:c'])

  execute(componentScript('src/components/TrackListing.astro'), {
    document: { querySelectorAll: () => [map] },
    localStorage: { getItem: (key) => done.has(key) ? 'true' : null },
  })

  assert.deepEqual(rows.map((r) => r.dataset.complete), ['true', undefined, 'true'])
  assert.deepEqual(rows.map((r) => r.marker.hidden), [false, true, false])
  assert.equal(progress.hidden, false)
  assert.equal(progress.textContent, '2 of 3 completed on this device')
})

test('track pages stay unmarked when storage is unreadable', () => {
  const marker = { hidden: true }
  const rows = [{ dataset: { lessonKey: 'en:a' }, querySelector: () => marker }]
  const progress = { hidden: true, textContent: '', dataset: { template: '{n} of {m}' } }
  const section = { querySelectorAll: () => rows, querySelector: () => progress }
  execute(componentScript('src/components/TrackListing.astro'), {
    document: { querySelectorAll: () => [{ querySelectorAll: () => [section] }] },
    localStorage: { getItem: () => { throw new Error('blocked') } },
  })
  assert.equal(marker.hidden, true)
  assert.equal(progress.hidden, true)
})
