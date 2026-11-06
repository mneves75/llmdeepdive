/**
 * Lesson 5.14's lab, asserted against the built page.
 *
 * The site's rule is that a lab server-renders its defaults, so a reader without
 * JavaScript gets a worked example rather than an empty box. That rule has no
 * browser gate: `render:check` loads every route and fails on a page error, which
 * proves the script runs, not that the numbers it would compute are already in
 * the HTML. This file closes that gap for the MoE lab, in both locales.
 *
 * The values come from `moeBalance`, the same function the component calls, so a
 * change in the loop that the lesson does not describe fails here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { moeBalance } from '../src/lib/moe-math.ts'

const RUN = moeBalance({ experts: 8, tokens: 64, skew: 0.5, rate: 0.02, steps: 40 })

const two = (locale) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const page = (locale) =>
  readFileSync(
    locale === 'en'
      ? 'dist/lessons/5-pretraining-at-scale/5.14-keeping-experts-busy/index.html'
      : 'dist/pt-br/lessons/5-pretraining-at-scale/5.14-keeping-experts-busy/index.html',
    'utf8',
  )

for (const locale of ['en', 'pt-br']) {
  test(`${locale}: the MoE lab ships its defaults in the HTML`, () => {
    const html = page(locale)
    assert.match(html, /data-lab="moe-balance"/u)
    const format = two(locale)
    assert.ok(html.includes(format.format(RUN.maxVioBefore)), `${locale}: MaxVio before missing`)
    assert.ok(html.includes(format.format(RUN.maxVioAfter)), `${locale}: MaxVio after missing`)
    assert.ok(html.includes(format.format(RUN.best.maxVio)), `${locale}: best MaxVio missing`)
  })

  test(`${locale}: the lab's first and last expert rows carry the computed loads`, () => {
    const html = page(locale)
    for (const expert of [0, 7]) {
      const before = RUN.before[expert]
      const after = RUN.after[expert]
      assert.ok(html.includes(`data-out="before-${expert}">${before}<`), `${locale}: before-${expert}`)
      assert.ok(html.includes(`data-out="after-${expert}">${after}<`), `${locale}: after-${expert}`)
      assert.ok(html.includes(`data-out="bar-before-${expert}"`), `${locale}: bar-before-${expert}`)
    }
  })

  test(`${locale}: the lab's text controls are text inputs, never number inputs`, () => {
    const html = page(locale)
    const form = html.slice(html.indexOf('data-lab="moe-balance"'))
    const controls = form.slice(0, form.indexOf('</form>'))
    assert.ok(controls.includes('name="skew"'))
    assert.ok(controls.includes('inputmode="decimal"'))
    assert.ok(!/type="number"/u.test(controls), `${locale}: a number input slipped in`)
  })
}
