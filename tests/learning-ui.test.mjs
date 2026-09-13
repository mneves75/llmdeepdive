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

test('teach-back does not report completion when local persistence fails', () => {
  const savedAnswer = 'These sixteen words make the response long enough to satisfy both learning requirements before persistence is attempted.'
  const statusText = { textContent: '' }
  const status = {
    lastChild: statusText,
    querySelector: (selector) => selector === '[data-status-text]' ? statusText : null,
  }
  const listeners = new Map()
  const textarea = {
    value: '',
    addEventListener: (type, listener) => listeners.set(type, listener),
  }
  const root = {
    dataset: { lessonKey: 'en:lesson' },
    querySelector: (selector) => selector === 'textarea'
      ? textarea
      : selector === '[role="status"]'
        ? status
        : selector === '[data-status-text]'
          ? statusText
          : null,
    closest: () => null,
  }
  const events = []
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
      setItem: () => { throw new Error('quota exceeded') },
    },
  })

  assert.match(statusText.textContent, /could not save/iu)
  assert.equal(root.dataset.complete, 'false')
  assert.equal(root.dataset.saveError, 'true')
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
    emptyText: 'No results.',
    hintText: 'Type to search',
    locale: 'en',
    location: { href: 'https://example.test/', origin: 'https://example.test' },
    window: { clearTimeout: () => {}, setTimeout: () => 1 },
  })

  document.activeElement = input
  let prevented = false
  listeners.get('keydown')({ key: 'ArrowUp', preventDefault: () => { prevented = true } })

  assert.equal(prevented, true)
  assert.equal(document.activeElement, links.at(-1))
})
