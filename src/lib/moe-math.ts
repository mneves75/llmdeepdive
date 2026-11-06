/**
 * Mixture-of-experts arithmetic, in one place.
 *
 * The five MoE lessons, their figures and the balancing lab all read this
 * module. That is a maintenance decision, not tidiness: this course has already
 * shipped prose that disagreed with its own numbers (three different memory
 * budgets for one model), and a number repeated in prose cannot be checked by
 * anything. Here every quoted figure has one implementation and one test.
 *
 * The router semantics follow Megatron-LM at commit `d6316eb45`, which the
 * lessons cite, so a reader can compare the code to the framework:
 *
 *   - softmax applies over ALL experts; the selected weights are gathered from
 *     that distribution. `preSoftmax` keeps the full-softmax masses instead of
 *     renormalising over the survivors, which is what Megatron's
 *     `--moe-router-pre-softmax` path does.
 *   - sigmoid and sqrt(softplus) score each expert independently; with k > 1
 *     the selected scores are divided by their sum unless `renormalize` is off.
 *   - the routed scaling factor multiplies the final weights only.
 *   - a selection bias belongs to SELECTION, not to the weights: Megatron adds
 *     it before top-k and gathers the unbiased scores afterwards. That is why
 *     {@link mixtureWeights} has no bias argument. Use {@link allocate} when the
 *     question is which expert a token reaches.
 *
 * Ties break by the lower expert id. PyTorch does not specify its tie order,
 * which is a teaching point in lesson 4.18 rather than a detail this module
 * tries to reproduce.
 */

export type GateFunction = 'softmax' | 'sigmoid' | 'sqrtsoftplus'

export interface MixtureOptions {
  readonly gate: GateFunction
  /** Softmax over every expert before selection; suppresses renormalisation. */
  readonly preSoftmax?: boolean
  /** Divide the selected weights by their sum. Ignored for k = 1. */
  readonly renormalize?: boolean
  /** Routed scaling factor: a constant on the selected weights. */
  readonly scale?: number
}

export interface Mixture {
  /** Expert ids, best first. */
  readonly indices: readonly number[]
  /** Weights aligned with `indices`, after renormalisation and scaling. */
  readonly weights: readonly number[]
  /** The full score vector before selection: probabilities for softmax. */
  readonly scores: readonly number[]
}

const softmax = (values: readonly number[]): number[] => {
  const max = Math.max(...values)
  const exps = values.map((value) => Math.exp(value - max))
  const total = exps.reduce((sum, value) => sum + value, 0)
  return exps.map((value) => value / total)
}

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value))

/** log(1 + e^x) without overflowing for large x. */
const softplus = (value: number): number =>
  value > 0 ? value + Math.log1p(Math.exp(-value)) : Math.log1p(Math.exp(value))

/**
 * Rank experts by score, best first, breaking ties by the lower expert id.
 */
const rank = (scores: readonly number[], k: number): number[] =>
  scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score))
    .slice(0, k)
    .map((entry) => entry.index)

/**
 * Turn one token's router logits into the experts it uses and how much each
 * counts.
 *
 * @throws RangeError when the logits are empty, k is outside 1..experts, or a
 * logit is not finite. A silent NaN here would propagate into a lesson's
 * worked example.
 */
export const mixtureWeights = (
  logits: readonly number[],
  k: number,
  options: MixtureOptions,
): Mixture => {
  if (logits.length === 0) throw new RangeError('mixtureWeights needs at least one expert')
  if (!logits.every((value) => Number.isFinite(value))) {
    throw new RangeError('mixtureWeights received a non-finite logit')
  }
  if (!Number.isInteger(k) || k < 1 || k > logits.length) {
    throw new RangeError(`mixtureWeights needs 1 <= k <= ${logits.length}, got ${k}`)
  }

  const { gate, preSoftmax = false, renormalize = false, scale = 1 } = options
  const scores =
    gate === 'softmax'
      ? softmax(logits)
      : gate === 'sigmoid'
        ? logits.map(sigmoid)
        : logits.map((value) => Math.sqrt(softplus(value)))

  const indices = rank(scores, k)
  const selected = indices.map((index) => scores[index] ?? Number.NaN)

  // Megatron renormalises only when k > 1, and never on the pre-softmax path,
  // where the full-softmax masses are the point.
  const normalise = renormalize && !(gate === 'softmax' && preSoftmax) && k > 1
  const sum = selected.reduce((total, value) => total + value, 0)
  const weights = selected.map((value) => (normalise ? value / sum : value) * scale)

  return { indices, weights, scores }
}

/**
 * MaxVio: how far the busiest expert's load sits above the mean, as a fraction
 * of the mean. 0 is perfectly even; 1 means the busiest expert takes twice the
 * average.
 *
 * Experts with zero load stay in the mean, which is the definition the
 * balancing literature uses and the reason a dead expert raises the metric.
 * Returns null when the metric is undefined (no experts, or no tokens at all).
 */
export const maxVio = (counts: readonly number[]): number | null => {
  if (counts.length === 0) return null
  const total = counts.reduce((sum, value) => sum + value, 0)
  if (total === 0) return null
  const mean = total / counts.length
  return Math.max(...counts) / mean - 1
}

export interface AuxLossInput {
  /** Token-expert assignments per expert; the total is `tokens * topK`. */
  readonly counts: readonly number[]
  /** Mean router probability per expert over the same tokens. */
  readonly probs: readonly number[]
  /** Tokens in the batch, NOT assignments. */
  readonly tokens: number
  readonly topK: number
  /** The auxiliary-loss coefficient; pass 1 to read the unweighted shape. */
  readonly coefficient: number
}

/**
 * The Switch-style auxiliary loss: `coefficient * E * sum(f_e * P_e)`, with
 * `f_e = counts_e / (tokens * topK)` and `P_e` the expert's mean probability.
 *
 * Two properties matter for teaching, and both are asserted in the test:
 * a perfectly even load gives the same value as a flat router does, whatever
 * the load is. With `P_e = 1/E` for every expert the sum collapses to
 * `1/E * sum(f_e) = 1/E`, so the loss reads `coefficient` while half the tokens
 * sit on two experts. Megatron logs the value with the coefficient divided out,
 * which is why "the aux loss reads 1" describes a run that may be badly uneven.
 * Read balance from token counts, never from this number.
 */
export const auxLoss = (input: AuxLossInput): number => {
  const { counts, probs, tokens, topK, coefficient } = input
  if (counts.length !== probs.length) {
    throw new RangeError('auxLoss needs one probability per expert')
  }
  if (!Number.isInteger(tokens) || tokens <= 0 || !Number.isInteger(topK) || topK < 1) {
    throw new RangeError('auxLoss needs a positive token count and topK')
  }
  const assignments = counts.reduce((sum, value) => sum + value, 0)
  if (assignments !== tokens * topK) {
    throw new RangeError(
      `auxLoss counts sum to ${assignments}, expected tokens * topK = ${tokens * topK}`,
    )
  }
  const experts = counts.length
  let share = 0
  for (let index = 0; index < experts; index += 1) {
    const f = (counts[index] ?? 0) / (tokens * topK)
    share += f * (probs[index] ?? 0)
  }
  return coefficient * experts * share
}

export interface SignUpdateInput {
  readonly counts: readonly number[]
  readonly bias: readonly number[]
  /** How far each bias moves per training step. */
  readonly rate: number
}

/**
 * One step of Megatron's loss-free balancing: every expert's bias moves by the
 * same fixed amount, up when it is underloaded and down when it is overloaded.
 *
 * The comparison is the integer one Megatron uses (`total - counts * E`), not a
 * float comparison against the mean, so an exactly even load moves nothing.
 */
export const signUpdate = (input: SignUpdateInput): number[] => {
  const { counts, bias, rate } = input
  if (counts.length !== bias.length) {
    throw new RangeError('signUpdate needs one bias per expert')
  }
  const experts = counts.length
  const total = counts.reduce((sum, value) => sum + value, 0)
  return bias.map((value, index) => {
    const delta = total - (counts[index] ?? 0) * experts
    return value + Math.sign(delta) * rate
  })
}

export interface AllocateInput {
  /** One row per token, one column per expert: the token's affinity for each. */
  readonly affinity: readonly (readonly number[])[]
  /** Per-expert selection bias; the same length as an affinity row. */
  readonly bias: readonly number[]
}

export interface Allocation {
  readonly assignments: readonly number[]
  readonly counts: readonly number[]
}

/**
 * Top-1 allocation with a selection bias: each token reaches the expert with the
 * highest `affinity + bias`. This is the lab's model of the balancing loop, and
 * it is deliberately top-1: with the router frozen, the only thing that changes
 * between steps is the bias, so a reader sees the balancer and nothing else.
 *
 * @throws RangeError on ragged rows or a bias of the wrong length.
 */
export const allocate = (input: AllocateInput): Allocation => {
  const { affinity, bias } = input
  const experts = bias.length
  if (experts === 0) throw new RangeError('allocate needs at least one expert')
  if (affinity.length === 0) throw new RangeError('allocate needs at least one token')
  for (const row of affinity) {
    if (row.length !== experts) {
      throw new RangeError(`allocate rows must have ${experts} entries, got ${row.length}`)
    }
  }

  const counts = new Array<number>(experts).fill(0)
  const assignments = affinity.map((row) => {
    let best = 0
    let bestScore = Number.NEGATIVE_INFINITY
    for (let index = 0; index < experts; index += 1) {
      const score = (row[index] ?? Number.NEGATIVE_INFINITY) + (bias[index] ?? 0)
      if (score > bestScore) {
        bestScore = score
        best = index
      }
    }
    counts[best] = (counts[best] ?? 0) + 1
    return best
  })

  return { assignments, counts }
}

export interface MoeBudgetInput {
  readonly hidden: number
  readonly denseFfn: number
  readonly layers: number
  readonly experts: number
  readonly topK: number
}

export interface MoeBudget {
  /** Width of one expert, chosen so topK of them match the dense FFN. */
  readonly expertWidth: number
  readonly denseFfnPerLayer: number
  readonly activeFfnPerLayer: number
  readonly storedFfnPerLayer: number
  readonly storedFfnTotal: number
  /** Stored over active feed-forward parameters: `experts / topK`. */
  readonly scale: number
  readonly routerParamsPerLayer: number
}

/**
 * Parameter budget for replacing a gated FFN with a set of experts at the same
 * active width.
 *
 * The factor 3 is the gate, up and down matrices of a gated FFN (SwiGLU and
 * friends). `expertWidth` is derived, not chosen: `denseFfn * topK / experts`,
 * which is what makes the active feed-forward identical to the dense layer's and
 * lets a reader check the identity by hand (8 x 2,176 = 17,408).
 *
 * @throws RangeError when the shape cannot divide exactly, when a count is not a
 * positive integer, or when topK exceeds the expert count.
 */
export const moeParameterBudget = (input: MoeBudgetInput): MoeBudget => {
  const { hidden, denseFfn, layers, experts, topK } = input
  const positive = [hidden, denseFfn, layers, experts, topK]
  if (!positive.every((value) => Number.isInteger(value) && value > 0)) {
    throw new RangeError('moeParameterBudget needs positive integer shapes')
  }
  if (topK > experts) throw new RangeError('moeParameterBudget needs topK <= experts')
  const numerator = denseFfn * topK
  if (numerator % experts !== 0) {
    throw new RangeError('the expert width must divide the dense FFN exactly')
  }
  const expertWidth = numerator / experts
  const denseFfnPerLayer = 3 * hidden * denseFfn
  const perExpert = 3 * hidden * expertWidth

  return {
    expertWidth,
    denseFfnPerLayer,
    activeFfnPerLayer: topK * perExpert,
    storedFfnPerLayer: experts * perExpert,
    storedFfnTotal: experts * perExpert * layers,
    scale: experts / topK,
    routerParamsPerLayer: experts * hidden,
  }
}

export interface DispatchInput {
  readonly tokens: number
  readonly layers: number
  readonly topK: number
  readonly hidden: number
  readonly bytesPerElement: number
}

/**
 * Bytes one token's copies put on the wire, counting dispatch only: each token
 * sends `topK` copies of a `hidden`-wide vector, and the combine sends a result
 * back. Doubling this number is the round trip; the lessons quote the one-way
 * figure and say so.
 */
export const dispatchBytes = (input: DispatchInput): number => {
  const { tokens, layers, topK, hidden, bytesPerElement } = input
  const all = [tokens, layers, topK, hidden, bytesPerElement]
  if (!all.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new RangeError('dispatchBytes needs non-negative dimensions')
  }
  return tokens * layers * topK * hidden * bytesPerElement
}

export interface MoeBalanceInput {
  readonly experts: number
  readonly tokens: number
  /** How strongly the batch prefers the low-numbered experts, 0 to 2. */
  readonly skew: number
  /** How far each bias moves per step. */
  readonly rate: number
  readonly steps: number
}

export interface MoeBalanceStep {
  readonly step: number
  readonly maxVio: number
  readonly counts: readonly number[]
}

export interface MoeBalanceResult {
  readonly before: readonly number[]
  readonly after: readonly number[]
  readonly bias: readonly number[]
  readonly maxVioBefore: number
  readonly maxVioAfter: number
  readonly trace: readonly MoeBalanceStep[]
  /** The lowest MaxVio the loop reached, and when. */
  readonly best: { readonly step: number; readonly maxVio: number }
}

/**
 * The lab's batch: every token gets a deterministic affinity for every expert.
 *
 * `skew` tilts the batch toward low-numbered experts; the per-token term comes
 * from a fixed hash, not from a random number generator, so the same inputs give
 * the same batch on the server, in the browser and in the test. A random batch
 * would make the lab unreproducible and the lesson's quoted numbers unverifiable.
 */
const moeAffinity = (input: MoeBalanceInput): number[][] => {
  const { experts, tokens, skew } = input
  const span = experts > 1 ? experts - 1 : 1
  const rows: number[][] = []
  for (let token = 0; token < tokens; token += 1) {
    const row: number[] = []
    for (let expert = 0; expert < experts; expert += 1) {
      const tilt = -skew * 3 * (expert / span)
      const seed = Math.sin((token * 13 + expert * 7) * 12.9898) * 43758.5453
      const noise = 1.2 * (seed - Math.floor(seed)) - 0.6
      row.push(tilt + noise)
    }
    rows.push(row)
  }
  return rows
}

/**
 * The loss-free balancing loop on a frozen router, which is what lesson 5.14's
 * lab shows: the batch never changes, so the only thing moving between steps is
 * the selection bias.
 *
 * The loop follows Megatron's order. It routes with the current bias, updates
 * each bias by the fixed step in the direction of that load, then routes again
 * with the new bias. `before` is the load with no bias at all and `after` is the
 * load the final bias produces, so a reader compares two real routings rather
 * than two estimates.
 *
 * A fixed step does not converge to an exact split. It walks past the target and
 * comes back, which is why `best` exists: a run that ends above its own minimum
 * is showing the overshoot, not a bug.
 */
export const moeBalance = (input: MoeBalanceInput): MoeBalanceResult => {
  const { experts, tokens, skew, rate, steps } = input
  if (!Number.isInteger(experts) || experts < 2 || experts > 64) {
    throw new RangeError('moeBalance needs 2 to 64 experts')
  }
  if (!Number.isInteger(tokens) || tokens < 8 || tokens > 4096) {
    throw new RangeError('moeBalance needs 8 to 4,096 tokens')
  }
  if (!Number.isFinite(skew) || skew < 0 || skew > 2) {
    throw new RangeError('moeBalance needs a skew between 0 and 2')
  }
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    throw new RangeError('moeBalance needs an update rate above 0 and at most 1')
  }
  if (!Number.isInteger(steps) || steps < 0 || steps > 200) {
    throw new RangeError('moeBalance needs 0 to 200 steps')
  }

  const affinity = moeAffinity(input)
  let bias = new Array<number>(experts).fill(0)
  const before = allocate({ affinity, bias }).counts
  const trace: MoeBalanceStep[] = [
    { step: 0, maxVio: maxVio(before) ?? 0, counts: before },
  ]

  let best = { step: 0, maxVio: trace[0]?.maxVio ?? 0 }
  let after: readonly number[] = before

  for (let step = 1; step <= steps; step += 1) {
    const driving = allocate({ affinity, bias }).counts
    bias = signUpdate({ counts: driving, bias, rate })
    after = allocate({ affinity, bias }).counts
    const value = maxVio(after) ?? 0
    trace.push({ step, maxVio: value, counts: after })
    if (value < best.maxVio) best = { step, maxVio: value }
  }

  return {
    before,
    after,
    bias,
    maxVioBefore: trace[0]?.maxVio ?? 0,
    maxVioAfter: trace[trace.length - 1]?.maxVio ?? 0,
    trace,
    best,
  }
}
