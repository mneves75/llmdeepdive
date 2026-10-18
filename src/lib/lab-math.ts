import type { NumberLocale } from './lab-form'

/**
 * The arithmetic behind the two calculator labs. Each lab server-renders its
 * defaults and recomputes in the browser; both paths call these functions, so
 * the worked example a reader without JavaScript sees cannot drift from the
 * numbers the live lab produces.
 */

export function labFormatters(locale: NumberLocale): { whole: Intl.NumberFormat; oneDecimal: Intl.NumberFormat } {
  const tag = locale === 'pt-br' ? 'pt-BR' : 'en-US'
  return {
    whole: new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }),
    oneDecimal: new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  }
}

export type KvVerdict = 'fits' | 'tight' | 'noSequence' | 'no'

export interface KvBudgetInput {
  params: number
  kibPerToken: number
  stateMib: number
  usable: number
  bytes: number
  context: number
  reserve: number
}

/** Lesson 9.3: how many full sequences fit beside the weights on one card. */
export function kvBudget(input: KvBudgetInput): { weightsGiB: number; poolGiB: number; perSeqMiB: number; seats: number; verdict: KvVerdict } {
  const weightsGiB = (input.params * input.bytes) / 1024 ** 3
  const poolGiB = input.usable - weightsGiB - input.reserve
  const perSeqMiB = (input.context * input.kibPerToken) / 1024 + input.stateMib
  const seats = Math.max(0, Math.floor((poolGiB * 1024) / perSeqMiB))
  // Zero seats has two different causes: the weights and reserve already
  // exhaust the card, or a positive pool is smaller than one sequence.
  const verdict = seats >= 8 ? 'fits' : seats > 0 ? 'tight' : poolGiB > 0 ? 'noSequence' : 'no'
  return { weightsGiB, poolGiB, perSeqMiB, seats, verdict }
}

export const HOURS_PER_MONTH = 730

export type CostVerdict = 'managed' | 'self' | 'close' | 'tie'

export interface CostInput {
  inM: number
  outM: number
  priceIn: number
  priceOut: number
  gpuHour: number
  tps: number
}

/**
 * Lesson 9.10: the same monthly workload on a per-token endpoint and on rented
 * GPUs. Returns null when the inputs overflow a double.
 */
export function costComparison(input: CostInput): { managed: number; rented: number; gpus: number; utilisation: number; verdict: CostVerdict } | null {
  const managed = input.inM * input.priceIn + input.outM * input.priceOut
  // One GPU bills for the whole month whether or not it is busy, and it cannot
  // exceed its own throughput: past 100% the workload needs more machines, so
  // the rental cost has to scale or the comparison prices a fleet that cannot
  // do the work.
  const monthSeconds = HOURS_PER_MONTH * 3600
  const secondsNeeded = (input.outM * 1e6) / input.tps
  const gpus = Math.max(1, Math.ceil(secondsNeeded / monthSeconds))
  const rented = input.gpuHour * HOURS_PER_MONTH * gpus
  const utilisation = (secondsNeeded / (gpus * monthSeconds)) * 100
  if (![managed, secondsNeeded, gpus, rented, utilisation].every(Number.isFinite)) return null
  const cheapest = Math.min(managed, rented)
  // Only an empty configuration is "nothing to compare". Two equal nonzero
  // costs are an exact break-even, the most interesting answer the lab gives.
  const verdict = managed === 0 && rented === 0
    ? 'tie'
    : Math.abs(managed - rented) / Math.max(cheapest, 1e-9) < 0.1
      ? 'close'
      : managed < rented ? 'managed' : 'self'
  return { managed, rented, gpus, utilisation, verdict }
}

/** Up to one decimal place, with no trailing ".0" on whole numbers. */
export function upToOneDecimal(locale: NumberLocale): Intl.NumberFormat {
  return new Intl.NumberFormat(locale === 'pt-br' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 })
}

/**
 * Python's `round`: halves go to the even neighbour. The Qwen video processor
 * snaps each frame side with it, so 720 / 32 = 22.5 becomes 22, where
 * `Math.round` would say 23 and the lab would disagree with the processor.
 */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value)
  const fraction = value - floor
  if (fraction > 0.5) return floor + 1
  if (fraction < 0.5) return floor
  return floor % 2 === 0 ? floor : floor + 1
}

export type VideoVerdict = 'fits' | 'tight' | 'over'

export interface VideoTokenInput {
  seconds: number
  fps: number
  /** Frame size as fed to the encoder, after the processor's own resize. */
  width: number
  height: number
  patch: number
  merge: number
  temporal: number
  context: number
}

export interface VideoTokenResult {
  frames: number
  groups: number
  tokensW: number
  tokensH: number
  patchesPerGroup: number
  perGroup: number
  perFrame: number
  total: number
  share: number
  verdict: VideoVerdict
}

/**
 * Lesson 10.1: how many visual tokens a clip becomes. Frames are sampled at
 * `fps`; a frame count that is not a multiple of the temporal patch is padded
 * by repeating the last frame; each side snaps to a multiple of
 * `patch × merge`; and every `merge × merge` block of patches in one temporal
 * group becomes one token. Returns null when there is nothing to count.
 */
export function videoTokens(input: VideoTokenInput): VideoTokenResult | null {
  if (!Object.values(input).every((value) => Number.isFinite(value) && value > 0)) return null
  // The epsilon absorbs float error: 0.3 s × 10 fps is 2.9999999999999996.
  const frames = Math.floor(input.seconds * input.fps + 1e-9)
  if (frames < 1) return null
  const factor = input.patch * input.merge
  const tokensW = Math.max(1, roundHalfEven(input.width / factor))
  const tokensH = Math.max(1, roundHalfEven(input.height / factor))
  const groups = Math.ceil(frames / input.temporal)
  const perGroup = tokensW * tokensH
  const total = groups * perGroup
  const share = (total / input.context) * 100
  const verdict = total > input.context ? 'over' : total > input.context / 2 ? 'tight' : 'fits'
  return {
    frames,
    groups,
    tokensW,
    tokensH,
    patchesPerGroup: tokensW * tokensH * input.merge * input.merge,
    perGroup,
    perFrame: perGroup / input.temporal,
    total,
    share,
    verdict,
  }
}

export type ContextVerdict = 'fits' | 'over' | 'fixedOver'

export interface ContextBudgetInput {
  window: number
  reserveOutput: number
  instructions: number
  tools: number
  chunks: number
  chunkTokens: number
  history: number
}

/**
 * Lesson 19.3: what a request spends of a context window. The output reserve
 * comes off the top; instructions, tool schemas and retrieved chunks are fixed
 * for this request, so the conversation history gets whatever is left.
 */
export function contextBudget(input: ContextBudgetInput): { inputLimit: number; used: number; over: number; headroom: number; historyLimit: number; verdict: ContextVerdict } {
  const inputLimit = Math.max(0, input.window - input.reserveOutput)
  const fixed = input.instructions + input.tools + input.chunks * input.chunkTokens
  const used = fixed + input.history
  const historyLimit = Math.max(0, inputLimit - fixed)
  const over = Math.max(0, used - inputLimit)
  const verdict = fixed > inputLimit ? 'fixedOver' : over > 0 ? 'over' : 'fits'
  return { inputLimit, used, over, headroom: Math.max(0, inputLimit - used), historyLimit, verdict }
}

export interface RetryBudgetInput {
  /** Probability one attempt succeeds, 0–1. */
  success: number
  attempts: number
  costPerAttempt: number
}

/**
 * Lesson 21.4: a bounded loop of repair attempts that stops at the first
 * success. Assumes attempts are independent, which real repairs rarely are:
 * an attempt that failed for a reason the next one shares makes the true
 * escalation rate higher than this.
 */
export function retryBudget(input: RetryBudgetInput): { pSuccess: number; pEscalate: number; expectedAttempts: number; expectedCost: number; worstCost: number } {
  const fail = 1 - input.success
  const pEscalate = fail ** input.attempts
  // Attempt k runs only if the k - 1 before it failed.
  let expectedAttempts = 0
  for (let k = 1; k <= input.attempts; k += 1) expectedAttempts += fail ** (k - 1)
  return {
    pSuccess: 1 - pEscalate,
    pEscalate,
    expectedAttempts,
    expectedCost: expectedAttempts * input.costPerAttempt,
    worstCost: input.attempts * input.costPerAttempt,
  }
}

/** Lesson 23.2: the purchasing assistant's safety rules as a partial order, not one golden path. */
export const TRACE_POLICY = {
  allowed: ['read_request', 'lookup_po', 'read_supplier_message', 'draft_invoice', 'request_approval', 'approval_granted', 'send_invoice'],
  required: ['read_request', 'lookup_po', 'draft_invoice', 'request_approval', 'approval_granted', 'send_invoice'],
  /** [before, after]: `after` may only happen once `before` has. */
  before: [
    ['read_request', 'lookup_po'],
    ['lookup_po', 'draft_invoice'],
    ['draft_invoice', 'request_approval'],
    ['request_approval', 'approval_granted'],
    ['approval_granted', 'send_invoice'],
  ],
  /** Actions with an external effect: twice is a duplicate invoice. */
  once: ['send_invoice'],
  /** [action, voided]: after `action`, an earlier `voided` no longer counts. A new draft is not the one that was approved. */
  invalidates: [['draft_invoice', 'approval_granted'], ['draft_invoice', 'request_approval']],
} as const

export type TracePolicy = {
  allowed: readonly string[]
  required: readonly string[]
  before: readonly (readonly [string, string])[]
  once: readonly string[]
  invalidates: readonly (readonly [string, string])[]
}

export type TraceViolation =
  | { kind: 'unknown'; action: string; at: number }
  | { kind: 'missing'; action: string }
  | { kind: 'order'; before: string; after: string; at: number }
  | { kind: 'repeated'; action: string; at: number }

/**
 * Checks a trace against required steps, required-before relations,
 * once-only effects and invalidations (a redraft voids an earlier approval). Any order that keeps every relation passes, so two safe
 * paths both succeed while an unsafe one fails even if its final output looks
 * right.
 */
export function checkTrace(trace: readonly string[], policy: TracePolicy): { violations: TraceViolation[] } {
  const violations: TraceViolation[] = []
  // `seen` is what still counts; `happened` is everything that ever ran.
  const seen = new Set<string>()
  const happened = new Set<string>()
  for (const [at, action] of trace.entries()) {
    if (!policy.allowed.includes(action)) violations.push({ kind: 'unknown', action, at })
    if (policy.once.includes(action) && happened.has(action)) violations.push({ kind: 'repeated', action, at })
    for (const [before, after] of policy.before) {
      if (action === after && !seen.has(before)) violations.push({ kind: 'order', before, after, at })
    }
    for (const [cause, voided] of policy.invalidates) if (action === cause) seen.delete(voided)
    seen.add(action)
    happened.add(action)
  }
  for (const action of policy.required) if (!happened.has(action)) violations.push({ kind: 'missing', action })
  return { violations }
}

export interface CostPerSuccessInput {
  runs: number
  successes: number
  modelCost: number
  sandboxCost: number
  reviewMinutes: number
  reviewHourly: number
}

/**
 * Lesson 25.2: what one successful task costs, counting failed runs and the
 * person who reviews each one, with a Wilson 95% interval on the success rate
 * because a few dozen trials leave a wide margin.
 */
export function costPerSuccess(input: CostPerSuccessInput): { costPerRun: number; total: number; perSuccess: number | null; rate: number; low: number; high: number } {
  const costPerRun = input.modelCost + input.sandboxCost + (input.reviewMinutes / 60) * input.reviewHourly
  const total = costPerRun * input.runs
  const rate = input.runs > 0 ? input.successes / input.runs : 0
  const z = 1.959964
  const n = input.runs
  let low = 0
  let high = 0
  if (n > 0) {
    const denominator = 1 + (z * z) / n
    const center = (rate + (z * z) / (2 * n)) / denominator
    const half = (z * Math.sqrt((rate * (1 - rate)) / n + (z * z) / (4 * n * n))) / denominator
    low = Math.max(0, center - half)
    high = Math.min(1, center + half)
  }
  return { costPerRun, total, perSuccess: input.successes > 0 ? total / input.successes : null, rate, low, high }
}
