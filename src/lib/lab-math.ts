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
