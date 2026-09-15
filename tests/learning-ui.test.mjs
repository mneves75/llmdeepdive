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

test('a correct quiz that cannot be saved does not complete the lesson', () => {
  const listeners = new Map()
  const status = { textContent: '' }
  const fieldsets = [0, 2].map((answer) => ({
    querySelector: () => ({ value: String(answer) }),
  }))
  const root = {
    dataset: { lessonKey: 'en:lesson', correct: '[0,2]' },
    querySelector: (selector) => selector === 'button'
      ? { addEventListener: (type, listener) => listeners.set(type, listener) }
      : selector === '[role="status"]'
        ? status
        : null,
    querySelectorAll: () => fieldsets,
    closest: () => null,
  }
  const events = []
  class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init.detail
    }
  }

  execute(componentScript('src/components/LessonQuiz.astro'), {
    CustomEvent,
    document: { querySelectorAll: () => [root], dispatchEvent: (event) => events.push(event) },
    localStorage: { setItem: () => { throw new Error('blocked') } },
  })
  listeners.get('click')()

  assert.equal(root.dataset.complete, 'false')
  assert.match(status.textContent, /could not save/iu)
  assert.deepEqual(events.at(-1)?.detail, { lessonKey: 'en:lesson', valid: false })
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
