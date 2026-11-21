/**
 * Unit & built-output tests for `src/lib/sampling-math.ts` (`sampleDistribution`,
 * cccc cognitive complexity 19 > 5) and the `sampling` lab rendered in lesson 7.4.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SAMPLING_PRESETS, sampleDistribution } from '../src/lib/sampling-math.ts'

const DIST = process.env.LLMDEEPDIVE_DIST_ROOT ?? 'dist'

test('sampleDistribution reproduces lesson 7.4 temperature scaling (T=1.0 vs T=0.7)', () => {
  const twoCandidates = [
    { token: 'A', logit: 2.0 },
    { token: 'B', logit: 1.0 },
  ]
  const hot = sampleDistribution({ candidates: twoCandidates, temperature: 1.0, topK: 2, topP: 1.0, minP: 0 })
  const cool = sampleDistribution({ candidates: twoCandidates, temperature: 0.7, topK: 2, topP: 1.0, minP: 0 })
  assert.ok(hot && cool)
  assert.ok(Math.abs(hot.leaderProb - 0.7310585) < 1e-4)
  assert.ok(Math.abs(cool.leaderProb - 0.80668) < 1e-4)
  assert.ok(cool.entropyBits < hot.entropyBits)
})

test('sampleDistribution applies top-k, min-p, and top-p truncation, renormalizes to 1, and rejects invalid inputs', () => {
  const creative = SAMPLING_PRESETS.find((p) => p.id === 'creative')
  assert.ok(creative)
  const k2 = sampleDistribution({ candidates: creative.candidates, temperature: 1.0, topK: 2, topP: 1.0, minP: 0 })
  assert.ok(k2)
  assert.equal(k2.survivorCount, 2)
  const sumK2 = k2.tokens.reduce((acc, t) => acc + t.finalProb, 0)
  assert.ok(Math.abs(sumK2 - 1) < 1e-9)
  assert.equal(k2.tokens[2]?.kept, false)
  assert.equal(k2.tokens[2]?.finalProb, 0)

  // min-p relative to leader prunes low tail while keeping leader
  const factual = SAMPLING_PRESETS[0]
  assert.ok(factual)
  const minP = sampleDistribution({ candidates: factual.candidates, temperature: 0.7, topK: 6, topP: 1.0, minP: 0.2 })
  assert.ok(minP)
  assert.equal(minP.survivorCount, 1)
  assert.equal(minP.leaderProb, 1)
  assert.equal(minP.entropyBits, 0)
  assert.equal(minP.effectiveChoices, 1)

  // Invalid inputs return null
  assert.equal(sampleDistribution({ candidates: [], temperature: 0.7, topK: 2, topP: 0.9, minP: 0 }), null)
  assert.equal(sampleDistribution({ candidates: factual.candidates, temperature: 0, topK: 2, topP: 0.9, minP: 0 }), null)
  assert.equal(sampleDistribution({ candidates: factual.candidates, temperature: 6, topK: 2, topP: 0.9, minP: 0 }), null)
  assert.equal(sampleDistribution({ candidates: factual.candidates, temperature: 0.7, topK: 0, topP: 0.9, minP: 0 }), null)
  assert.equal(sampleDistribution({ candidates: factual.candidates, temperature: 0.7, topK: 2, topP: 0, minP: 0 }), null)
  assert.equal(sampleDistribution({ candidates: factual.candidates, temperature: 0.7, topK: 2, topP: 0.9, minP: -0.1 }), null)
})

for (const locale of ['en', 'pt-br']) {
  test(`${locale}: built lesson 7.4 renders sampling lab defaults inside [data-out] elements`, () => {
    const prefix = locale === 'en' ? '' : 'pt-br'
    const html = readFileSync(join(DIST, prefix, 'lessons', '7-inference-and-efficiency', '7.4-sampling', 'index.html'), 'utf8')
    const form = html.match(/<form[^>]*data-lab="token-sampling"[\s\S]*?<\/form>/u)
    assert.ok(form, `${locale} missing form[data-lab="token-sampling"]`)
    const out = (key) => {
      const m = form[0].match(new RegExp(`<b[^>]*data-out="${key}"[^>]*>([^<]+)<\\/b>`, 'u'))
      assert.ok(m, `${locale} missing [data-out="${key}"]`)
      return m[1].trim()
    }
    assert.equal(out('leader'), locale === 'pt-br' ? '56,6%' : '56.6%')
    assert.equal(out('survivors'), '3 / 6')
    assert.equal(out('entropy'), locale === 'pt-br' ? '1,40' : '1.40')
    assert.equal(out('choices'), locale === 'pt-br' ? '2,63' : '2.63')
  })
}
