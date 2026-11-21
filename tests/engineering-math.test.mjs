/**
 * Unit tests for `src/lib/engineering-math.ts`.
 *
 * Scoped strictly to functions with `cccc` cognitive complexity > 5
 * (measured with `cccc --no-cache --min 0 src/lib/engineering-math.ts`):
 * - aiSystemBudget (cognitive 14)
 * - retrievalMetrics (cognitive 13)
 * - judgeCalibration (cognitive 8)
 * - rrfScore (cognitive 6)
 *
 * Functions with cognitive complexity <= 5 and no regular expressions
 * (`bm25TermScore` = 5, `hnswMemory` = 1, `voiceTurnLatencyMs` = 0) are
 * deliberately excluded per repository complexity-testing policy.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aiSystemBudget, judgeCalibration, retrievalMetrics, rrfScore } from '../src/lib/engineering-math.ts'

test('rrfScore ranks consensus above single-retriever extremes and ignores invalid ranks', () => {
  const docA = rrfScore([1, 40])
  const docB = rrfScore([3, 2])
  const docC = rrfScore([2, null])
  assert.ok(Math.abs(docB - 0.032002) < 1e-5)
  assert.ok(Math.abs(docA - 0.026393) < 1e-5)
  assert.ok(Math.abs(docC - 0.016129) < 1e-5)
  assert.ok(docB > docA && docA > docC)
  // Bad inputs: non-positive k, zero/negative/NaN ranks
  assert.equal(rrfScore([1, 2], 0), 0)
  assert.equal(rrfScore([1, 2], -60), 0)
  assert.equal(rrfScore([0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]), 0)
})

test('retrievalMetrics reproduces lesson 29.2 worked example and rejects invalid inputs', () => {
  const worked = retrievalMetrics({
    hits: [false, true, false, true, true, false, false, true],
    totalRelevant: 5,
    k: 5,
  })
  assert.ok(worked)
  assert.equal(worked.hitsAtK, 3)
  assert.equal(worked.recallAtK, 0.6)
  assert.equal(worked.precisionAtK, 0.6)
  assert.equal(worked.mrr, 0.5)
  assert.ok(Math.abs(worked.ndcgAtK - 0.49126) < 1e-4)

  // Moving a hit to rank 1 keeps Recall@5 at 0.6 while doubling MRR to 1.0
  const rankOne = retrievalMetrics({
    hits: [true, false, false, true, true, false, false, true],
    totalRelevant: 5,
    k: 5,
  })
  assert.ok(rankOne)
  assert.equal(rankOne.recallAtK, 0.6)
  assert.equal(rankOne.mrr, 1)
  assert.ok(rankOne.ndcgAtK > worked.ndcgAtK)

  // Zero hits returns 0 across all metrics
  const none = retrievalMetrics({ hits: [false, false, false], totalRelevant: 2, k: 3 })
  assert.ok(none)
  assert.equal(none.mrr, 0)
  assert.equal(none.ndcgAtK, 0)

  // Invalid inputs
  assert.equal(retrievalMetrics({ hits: [], totalRelevant: 1, k: 1 }), null)
  assert.equal(retrievalMetrics({ hits: [true], totalRelevant: 0, k: 1 }), null)
  assert.equal(retrievalMetrics({ hits: [true], totalRelevant: 1, k: 0 }), null)
  assert.equal(retrievalMetrics({ hits: [true], totalRelevant: 1.5, k: 1 }), null)
})

test('judgeCalibration distinguishes balanced agreement from the imbalanced rubber-stamp trap', () => {
  const balanced = judgeCalibration({ tp: 42, fp: 8, fn: 6, tn: 44 })
  assert.ok(balanced)
  assert.equal(balanced.total, 100)
  assert.equal(balanced.observedAgreement, 0.86)
  assert.equal(balanced.expectedAgreement, 0.5)
  assert.ok(Math.abs(balanced.kappa - 0.72) < 1e-6)
  assert.ok(Math.abs(balanced.f1 - 0.857143) < 1e-5)

  const rubberStamp = judgeCalibration({ tp: 90, fp: 5, fn: 4, tn: 1 })
  assert.ok(rubberStamp)
  assert.equal(rubberStamp.observedAgreement, 0.91)
  assert.ok(Math.abs(rubberStamp.expectedAgreement - 0.896) < 1e-6)
  assert.ok(Math.abs(rubberStamp.kappa - 0.134615) < 1e-5)
  assert.ok(rubberStamp.observedAgreement > balanced.observedAgreement)
  assert.ok(rubberStamp.kappa < 0.2, 'imbalanced judge must collapse under Cohen kappa')

  // Edge & bad inputs
  const perfectSingleClass = judgeCalibration({ tp: 10, fp: 0, fn: 0, tn: 0 })
  assert.ok(perfectSingleClass)
  assert.equal(perfectSingleClass.kappa, 1)
  assert.equal(judgeCalibration({ tp: 0, fp: 0, fn: 0, tn: 0 }), null)
  assert.equal(judgeCalibration({ tp: -1, fp: 0, fn: 0, tn: 10 }), null)
  assert.equal(judgeCalibration({ tp: 1.2, fp: 0, fn: 0, tn: 10 }), null)
})

test('aiSystemBudget reproduces lesson 31.1 worked example and validates boundary conditions', () => {
  const base = {
    retrievalMs: 85,
    guardrailMs: 45,
    ttftMs: 240,
    outputTokens: 250,
    decodeTps: 60,
    cacheHitRate: 0.35,
    cacheLookupMs: 18,
    falseHitRate: 0.02,
    monthlyRequestsK: 1000,
    costPer1kUncachedUsd: 4.5,
    provisionedMonthlyUsd: 2600,
  }
  const worked = aiSystemBudget(base)
  assert.ok(worked)
  assert.equal(Math.round(worked.decodeMs), 4167)
  assert.equal(Math.round(worked.uncachedLatencyMs), 4537)
  assert.equal(Math.round(worked.effectiveLatencyMs), 2955)
  assert.ok(Math.abs(worked.falseHitsPer10k - 70) < 1e-6)
  assert.equal(worked.monthlyUncachedUsd, 4500)
  assert.equal(worked.monthlyCachedUsd, 2925)
  assert.equal(worked.monthlySavingsUsd, 1575)
  assert.equal(worked.provisionedVerdict, 'provisioned')

  // Verdict transitions: close (<10% delta) and payg
  const close = aiSystemBudget({ ...base, provisionedMonthlyUsd: 2800 })
  assert.equal(close?.provisionedVerdict, 'close')
  const payg = aiSystemBudget({ ...base, provisionedMonthlyUsd: 4000 })
  assert.equal(payg?.provisionedVerdict, 'payg')
  const noProvisioned = aiSystemBudget({ ...base, provisionedMonthlyUsd: 0 })
  assert.equal(noProvisioned?.provisionedVerdict, 'payg')

  // Bad inputs
  assert.equal(aiSystemBudget({ ...base, decodeTps: 0 }), null)
  assert.equal(aiSystemBudget({ ...base, cacheHitRate: 1.1 }), null)
  assert.equal(aiSystemBudget({ ...base, falseHitRate: -0.01 }), null)
  assert.equal(aiSystemBudget({ ...base, retrievalMs: Number.NaN }), null)
})
