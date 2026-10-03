/**
 * Token colours must resolve correctly under reduced motion.
 *
 * The bug this guards: global.css answers `prefers-reduced-motion: reduce`
 * with `* { transition-duration: 0.01ms !important }`, and `transition-property`
 * defaults to `all`. A probe element whose `color` is changed from one token to
 * the next therefore starts a (very short) transition each time, and
 * `getComputedStyle` in the same task returns the colour it is transitioning
 * FROM. Every token after the first read as the first one (`--plate`), so the
 * home sky drew white lines on a white plate: a live, visibly empty canvas.
 *
 * The fake DOM below models exactly that: an element's computed colour is the
 * first colour it was given, unless transitions are switched off on it with
 * `!important` (the only inline value that beats the global rule).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readPalette, readTokens } from '../src/lib/three/palette.ts'

const TOKENS = {
  '--plate': 'rgb(255, 255, 255)',
  '--ink': 'rgb(11, 21, 51)',
  '--ink-muted': 'rgb(69, 80, 109)',
  '--ink-faint': 'rgb(90, 101, 130)',
  '--grid': 'rgba(43, 68, 199, 0.13)',
  '--rule-strong': 'rgba(11, 21, 51, 0.32)',
  '--accent': 'rgb(43, 68, 199)',
  '--reticle': 'rgb(200, 16, 46)',
  '--tier-foundations': 'rgb(10, 109, 151)',
  '--tier-core': 'rgb(138, 98, 0)',
  '--tier-advanced': 'rgb(178, 72, 11)',
  '--tier-frontier': 'rgb(191, 29, 74)',
}

/** A document where a colour change on a live element is caught mid-transition. */
function withTransitioningDocument(run) {
  const saved = { document: globalThis.document, getComputedStyle: globalThis.getComputedStyle }
  const element = () => {
    const declared = new Map()
    const important = new Set()
    const node = {
      shown: null,
      style: {
        setProperty(name, value, priority) {
          declared.set(name, value)
          if (priority === 'important') important.add(name)
          else important.delete(name)
          if (name === 'color') node.restyle(value)
        },
        getPropertyValue: (name) => declared.get(name) ?? '',
      },
      restyle(value) {
        const resolved = TOKENS[/var\((--[\w-]+)\)/u.exec(value)?.[1] ?? ''] ?? 'rgb(0, 0, 0)'
        const transitionsOff = declared.get('transition') === 'none' && important.has('transition')
        // First style, or no transition: the new value. Otherwise: the old one.
        if (node.shown === null || transitionsOff) node.shown = resolved
      },
      setAttribute() {},
      append() {},
      remove() {},
    }
    // `el.style.color = …` and friends go through the same path.
    return new Proxy(node, {
      get(target, key) {
        if (key !== 'style') return target[key]
        return new Proxy(target.style, {
          set(style, name, value) {
            const css = String(name).replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`)
            style.setProperty(css, value)
            return true
          },
        })
      },
    })
  }
  globalThis.document = { createElement: element }
  globalThis.getComputedStyle = (el) => ({ color: el.shown ?? 'rgb(0, 0, 0)', getPropertyValue: () => '' })
  try {
    run({ append() {} })
  } finally {
    globalThis.document = saved.document
    globalThis.getComputedStyle = saved.getComputedStyle
  }
}

test('every token resolves to its own colour while transitions are forced on', () => {
  withTransitioningDocument((surface) => {
    const tokens = readTokens(surface, ['--plate', '--grid', '--rule-strong', '--reticle', '--tier-core'])
    assert.equal(tokens.get('--plate')?.color, 0xffffff)
    assert.deepEqual(tokens.get('--grid'), { color: 0x2b44c7, alpha: 0.13 })
    assert.deepEqual(tokens.get('--rule-strong'), { color: 0x0b1533, alpha: 0.32 })
    assert.equal(tokens.get('--reticle')?.color, 0xc8102e)
    assert.equal(tokens.get('--tier-core')?.color, 0x8a6200)
  })
})

test('the scene palette resolves every token too', () => {
  withTransitioningDocument((surface) => {
    const palette = readPalette(surface)
    assert.equal(palette.plate, 0xffffff)
    assert.equal(palette.ink, 0x0b1533)
    assert.equal(palette.accent, 0x2b44c7)
    assert.equal(palette.reticle, 0xc8102e)
    assert.equal(palette.tierCore, 0x8a6200)
  })
})
