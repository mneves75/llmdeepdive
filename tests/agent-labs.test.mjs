/**
 * The arithmetic of the agent-engineering labs (lessons 19.3, 21.4, 23.2,
 * 25.2). Each lab server-renders its defaults from these functions and the
 * lesson's worked example quotes those defaults, so a wrong function here is a
 * lesson that contradicts itself.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkTrace, contextBudget, costPerSuccess, retryBudget, TRACE_POLICY } from '../src/lib/lab-math.ts'

test('context budget: the 50-turn worked example is over by 728 tokens', () => {
  const result = contextBudget({ window: 32768, reserveOutput: 4096, instructions: 1200, tools: 2400, chunks: 6, chunkTokens: 800, history: 21000 })
  assert.equal(result.inputLimit, 28672)
  assert.equal(result.used, 29400)
  assert.equal(result.over, 728)
  assert.equal(result.historyLimit, 20272)
  assert.equal(result.verdict, 'over')
})

test('context budget: when the fixed parts alone overflow, no history fits at all', () => {
  const result = contextBudget({ window: 8192, reserveOutput: 4096, instructions: 1200, tools: 2400, chunks: 6, chunkTokens: 800, history: 0 })
  assert.equal(result.historyLimit, 0)
  assert.equal(result.verdict, 'fixedOver')
})

test('context budget: a request that fits reports its headroom', () => {
  const result = contextBudget({ window: 131072, reserveOutput: 4096, instructions: 1200, tools: 2400, chunks: 6, chunkTokens: 800, history: 21000 })
  assert.equal(result.verdict, 'fits')
  assert.equal(result.over, 0)
  assert.equal(result.headroom, 131072 - 4096 - 29400)
})

test('retry budget: three attempts at p = 0.4 succeed 78.4% of the time and escalate 21.6%', () => {
  const result = retryBudget({ success: 0.4, attempts: 3, costPerAttempt: 0.12 })
  assert.ok(Math.abs(result.pSuccess - 0.784) < 1e-12)
  assert.ok(Math.abs(result.pEscalate - 0.216) < 1e-12)
  assert.ok(Math.abs(result.expectedAttempts - 1.96) < 1e-12)
  assert.ok(Math.abs(result.expectedCost - 0.2352) < 1e-12)
  assert.ok(Math.abs(result.worstCost - 0.36) < 1e-12)
})

test('retry budget: a certain failure always uses every attempt and always escalates', () => {
  const result = retryBudget({ success: 0, attempts: 3, costPerAttempt: 1 })
  assert.equal(result.expectedAttempts, 3)
  assert.equal(result.pEscalate, 1)
})

test('trace check: a different but safe order passes', () => {
  const trace = ['read_request', 'lookup_po', 'read_supplier_message', 'draft_invoice', 'request_approval', 'approval_granted', 'send_invoice']
  const swapped = ['read_request', 'read_supplier_message', 'lookup_po', 'draft_invoice', 'request_approval', 'approval_granted', 'send_invoice']
  assert.deepEqual(checkTrace(trace, TRACE_POLICY).violations, [])
  assert.deepEqual(checkTrace(swapped, TRACE_POLICY).violations, [])
})

test('trace check: sending before approval fails even when every step is present', () => {
  const trace = ['read_request', 'lookup_po', 'read_supplier_message', 'draft_invoice', 'request_approval', 'send_invoice', 'approval_granted']
  const { violations } = checkTrace(trace, TRACE_POLICY)
  assert.deepEqual(violations.map((v) => v.kind), ['order'])
  assert.equal(violations[0].before, 'approval_granted')
  assert.equal(violations[0].after, 'send_invoice')
})

test('trace check: an unknown action and a repeated effect are each reported', () => {
  const { violations } = checkTrace(['read_request', 'lookup_po', 'delete_po', 'draft_invoice', 'request_approval', 'approval_granted', 'send_invoice', 'send_invoice'], TRACE_POLICY)
  assert.deepEqual(violations.map((v) => v.kind).sort(), ['repeated', 'unknown'])
})

test('trace check: a run that stops before sending is incomplete, not unsafe', () => {
  const { violations } = checkTrace(['read_request', 'lookup_po', 'draft_invoice', 'request_approval', 'approval_granted'], TRACE_POLICY)
  assert.deepEqual(violations, [{ kind: 'missing', action: 'send_invoice' }])
})

test('cost per success: 24 of 30 trials at USD 1.10 a run cost USD 1.375 per success', () => {
  const result = costPerSuccess({ runs: 30, successes: 24, modelCost: 0.08, sandboxCost: 0.02, reviewMinutes: 1.5, reviewHourly: 40 })
  assert.ok(Math.abs(result.costPerRun - 1.1) < 1e-12)
  assert.ok(Math.abs(result.total - 33) < 1e-9)
  assert.ok(Math.abs(result.perSuccess - 1.375) < 1e-12)
  // Wilson 95% interval for 24/30.
  assert.ok(Math.abs(result.low - 0.6268) < 5e-4, String(result.low))
  assert.ok(Math.abs(result.high - 0.9050) < 5e-4, String(result.high))
})

test('cost per success: zero successes has no cost per success, not infinity', () => {
  const result = costPerSuccess({ runs: 10, successes: 0, modelCost: 0.1, sandboxCost: 0, reviewMinutes: 0, reviewHourly: 0 })
  assert.equal(result.perSuccess, null)
  assert.equal(result.low, 0)
})

test('trace check: redrafting after approval voids that approval', () => {
  // The approval bound the earlier draft (lesson 20.2); sending the new one is unapproved.
  const trace = ['read_request', 'lookup_po', 'draft_invoice', 'request_approval', 'approval_granted', 'draft_invoice', 'send_invoice']
  const { violations } = checkTrace(trace, TRACE_POLICY)
  assert.deepEqual(violations.map((v) => [v.kind, v.before, v.after]), [['order', 'approval_granted', 'send_invoice']])
  // Asking again after the redraft makes it safe.
  assert.deepEqual(checkTrace([...trace.slice(0, 6), 'request_approval', 'approval_granted', 'send_invoice'], TRACE_POLICY).violations, [])
})

test('trace check: an order violation caused by a void names the voiding step and the voided one', () => {
  const trace = ['read_request', 'lookup_po', 'draft_invoice', 'request_approval', 'approval_granted', 'draft_invoice', 'send_invoice']
  const [violation] = checkTrace(trace, TRACE_POLICY).violations
  assert.equal(violation.kind, 'order')
  assert.equal(violation.at, 6)
  assert.equal(violation.voidedAt, 5)
  assert.equal(violation.beforeAt, 4)
  // A plain order violation (the approval never happened before) carries no void.
  const early = checkTrace(['read_request', 'lookup_po', 'draft_invoice', 'request_approval', 'send_invoice', 'approval_granted'], TRACE_POLICY).violations
  assert.equal(early[0].voidedAt, undefined)
})
