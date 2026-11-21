/**
 * Pure sampling arithmetic for lesson 7.4 (`sampling` lab).
 *
 * Implements temperature scaling, top-k, min-p, and top-p (nucleus) truncation
 * plus renormalization, Shannon entropy (bits), and effective choice count
 * (perplexity = 2^H). Both SSR defaults and client-side live updates call this
 * single module so the page and interactive lab can never disagree.
 */

export interface TokenCandidate {
  readonly token: string
  readonly logit: number
}

export interface SamplingPreset {
  readonly id: 'factual' | 'code' | 'creative'
  readonly prompt: { readonly en: string; readonly 'pt-br': string }
  readonly label: { readonly en: string; readonly 'pt-br': string }
  readonly candidates: readonly TokenCandidate[]
}

export const SAMPLING_PRESETS: readonly SamplingPreset[] = [
  {
    id: 'factual',
    label: { en: 'Factual recall (sharp)', 'pt-br': 'Fato objetivo (concentrado)' },
    prompt: { en: 'The capital of France is …', 'pt-br': 'A capital da França é …' },
    candidates: [
      { token: 'Paris', logit: 4.2 },
      { token: 'Lyon', logit: 1.1 },
      { token: 'Marseille', logit: 0.6 },
      { token: 'known', logit: 0.2 },
      { token: 'located', logit: -0.3 },
      { token: 'a', logit: -0.8 },
    ],
  },
  {
    id: 'code',
    label: { en: 'Code completion (bimodal)', 'pt-br': 'Código Python (bimodal)' },
    prompt: { en: 'def fib(n): return …', 'pt-br': 'def fib(n): return …' },
    candidates: [
      { token: 'n', logit: 2.9 },
      { token: '1', logit: 2.4 },
      { token: 'fib', logit: 2.0 },
      { token: '0', logit: 1.4 },
      { token: '[', logit: 0.5 },
      { token: 'None', logit: -0.4 },
    ],
  },
  {
    id: 'creative',
    label: { en: 'Open continuation (flat)', 'pt-br': 'Continuação aberta (achatada)' },
    prompt: { en: 'The skyline glowed like …', 'pt-br': 'O horizonte brilhava como …' },
    candidates: [
      { token: 'embers', logit: 2.1 },
      { token: 'glass', logit: 1.9 },
      { token: 'silver', logit: 1.7 },
      { token: 'copper', logit: 1.5 },
      { token: 'smoke', logit: 1.2 },
      { token: 'chalk', logit: 0.8 },
    ],
  },
] as const

export interface SamplingInput {
  candidates: readonly TokenCandidate[]
  temperature: number
  topK: number
  topP: number
  minP: number
}

export interface SampledToken {
  token: string
  logit: number
  rawProb: number
  finalProb: number
  kept: boolean
}

export interface SamplingResult {
  tokens: SampledToken[]
  survivorCount: number
  leaderProb: number
  entropyBits: number
  effectiveChoices: number
}

/**
 * Apply temperature scaling -> softmax -> top-k -> min-p -> top-p -> renormalize.
 * Returns null when any parameter is outside its valid domain so the lab can
 * blank outputs cleanly instead of displaying stale or NaN values.
 */
export function sampleDistribution(input: SamplingInput): SamplingResult | null {
  if (input.candidates.length === 0) return null
  if (!Number.isFinite(input.temperature) || input.temperature <= 0 || input.temperature > 5) return null
  if (!Number.isInteger(input.topK) || input.topK < 1) return null
  if (!Number.isFinite(input.topP) || input.topP <= 0 || input.topP > 1) return null
  if (!Number.isFinite(input.minP) || input.minP < 0 || input.minP > 1) return null
  if (!input.candidates.every((c) => Number.isFinite(c.logit))) return null

  const scaled = input.candidates.map((c, index) => ({
    token: c.token,
    logit: c.logit,
    index,
    z: c.logit / input.temperature,
  }))
  const maxZ = Math.max(...scaled.map((s) => s.z))
  const exps = scaled.map((s) => Math.exp(s.z - maxZ))
  const sumExp = exps.reduce((acc, v) => acc + v, 0)
  if (!(sumExp > 0) || !Number.isFinite(sumExp)) return null

  const ranked = scaled
    .map((s, i) => ({
      token: s.token,
      logit: s.logit,
      index: s.index,
      rawProb: (exps[i] ?? 0) / sumExp,
    }))
    .sort((a, b) => (b.rawProb - a.rawProb) || (a.index - b.index))

  const leaderRaw = ranked[0]?.rawProb ?? 0
  const minThreshold = input.minP * leaderRaw

  let cumulative = 0
  let nucleusClosed = false
  const keptFlags = ranked.map((item, rank) => {
    if (rank === 0) {
      cumulative += item.rawProb
      if (cumulative >= input.topP) nucleusClosed = true
      return true
    }
    if (rank >= input.topK) return false
    if (item.rawProb < minThreshold) return false
    if (nucleusClosed) return false
    cumulative += item.rawProb
    if (cumulative >= input.topP) nucleusClosed = true
    return true
  })

  const survivorMass = ranked.reduce((acc, item, i) => acc + (keptFlags[i] ? item.rawProb : 0), 0)
  if (!(survivorMass > 0)) return null

  const tokens: SampledToken[] = ranked.map((item, i) => {
    const kept = Boolean(keptFlags[i])
    return {
      token: item.token,
      logit: item.logit,
      rawProb: item.rawProb,
      finalProb: kept ? item.rawProb / survivorMass : 0,
      kept,
    }
  })

  let entropyBits = 0
  let survivorCount = 0
  for (const t of tokens) {
    if (t.kept && t.finalProb > 0) {
      survivorCount += 1
      entropyBits -= t.finalProb * Math.log2(t.finalProb)
    }
  }

  return {
    tokens,
    survivorCount,
    leaderProb: tokens[0]?.finalProb ?? 0,
    entropyBits,
    effectiveChoices: Math.pow(2, entropyBits),
  }
}
