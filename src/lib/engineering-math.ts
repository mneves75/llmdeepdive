/**
 * Pure arithmetic behind Part 3 (AI Engineering in Production, tracks 26–33)
 * and its two interactive calculator labs (`rag-eval` and `ai-system-budget`).
 *
 * Every derived number quoted across tracks 26–33 comes from this module, and
 * `tests/engineering-content.test.mjs` pins those values in both locales so
 * prose, figures, and labs can never drift apart.
 */

export interface Bm25Input {
  /** Term frequency inside this document. */
  tf: number
  /** Number of documents in the corpus containing the term. */
  df: number
  /** Token length of this document. */
  docLen: number
  /** Mean token length across the corpus. */
  avgDocLen: number
  /** Total number of documents in the corpus. */
  corpusSize: number
  /** Term-frequency saturation parameter (standard default 1.5). */
  k1?: number
  /** Length normalization factor in [0, 1] (standard default 0.75). */
  b?: number
}

export interface Bm25Result {
  idf: number
  lengthNorm: number
  score: number
}

/** Lesson 27.5: Okapi BM25 single-term contribution using the Lucene/Robertson-Sparck Jones smoothed IDF. */
export function bm25TermScore(input: Bm25Input): Bm25Result | null {
  const k1 = input.k1 ?? 1.5
  const b = input.b ?? 0.75
  const vals = [input.tf, input.df, input.docLen, input.avgDocLen, input.corpusSize, k1, b]
  if (!vals.every((v) => Number.isFinite(v)) || input.corpusSize <= 0 || input.avgDocLen <= 0 || input.df < 0 || input.df > input.corpusSize || input.tf < 0 || input.docLen <= 0 || k1 < 0 || b < 0 || b > 1) {
    return null
  }
  const idf = Math.log(1 + (input.corpusSize - input.df + 0.5) / (input.df + 0.5))
  const lengthNorm = 1 - b + b * (input.docLen / input.avgDocLen)
  const score = input.tf === 0 ? 0 : idf * ((input.tf * (k1 + 1)) / (input.tf + k1 * lengthNorm))
  return { idf, lengthNorm, score }
}

/**
 * Lesson 27.5: Reciprocal Rank Fusion (Cormack, Clarke & Büttcher, SIGIR 2009).
 * Each rank is 1-based; omit or pass null when a retriever did not return the document.
 */
export function rrfScore(ranks: readonly (number | null)[], k = 60): number {
  if (!Number.isFinite(k) || k <= 0) return 0
  let sum = 0
  for (const rank of ranks) {
    if (rank !== null && Number.isFinite(rank) && rank >= 1) {
      sum += 1 / (k + rank)
    }
  }
  return sum
}

export interface HnswMemoryInput {
  vectors: number
  dims: number
  /** Bytes per vector component: 4 (fp32), 2 (fp16/bf16), 1 (int8), 0.125 (1-bit binary). */
  bytesPerDim: number
  /** Max bi-directional links per node on upper layers (layer 0 uses 2 * m). */
  m: number
}

export interface HnswMemoryResult {
  vectorGiB: number
  graphGiB: number
  totalGiB: number
  bytesPerVector: number
}

/**
 * Lesson 27.4: Approximate RAM footprint of an in-memory HNSW index.
 * Layer 0 stores up to 2*M 4-byte node IDs; upper layers add ~M/(M-1) * M * 4 bytes,
 * commonly budgeted as `2 * M * 4` (layer 0) + `M * 4` (upper layers + header) = `12 * M` bytes/node.
 */
export function hnswMemory(input: HnswMemoryInput): HnswMemoryResult | null {
  const vals = [input.vectors, input.dims, input.bytesPerDim, input.m]
  if (!vals.every((v) => Number.isFinite(v) && v > 0)) return null
  const vectorBytes = input.dims * input.bytesPerDim
  const graphBytes = 12 * input.m
  const bytesPerVector = vectorBytes + graphBytes
  const GiB = 1024 ** 3
  return {
    vectorGiB: (input.vectors * vectorBytes) / GiB,
    graphGiB: (input.vectors * graphBytes) / GiB,
    totalGiB: (input.vectors * bytesPerVector) / GiB,
    bytesPerVector,
  }
}

export interface RetrievalEvalInput {
  /** Binary relevance for each returned rank (index 0 = rank 1). */
  hits: readonly boolean[]
  /** Total number of genuinely relevant documents in the corpus for this query. */
  totalRelevant: number
  /** Cutoff k (1 <= k <= hits.length). */
  k: number
}

export interface RetrievalEvalResult {
  k: number
  hitsAtK: number
  recallAtK: number
  precisionAtK: number
  /** Mean Reciprocal Rank contribution (single-query Reciprocal Rank) over the full returned list. */
  rr: number
  dcgAtK: number
  idcgAtK: number
  ndcgAtK: number
}

/**
 * Lesson 29.2 & `rag-eval` lab: Recall@k, Precision@k, Reciprocal Rank (RR),
 * and NDCG@k for a ranked list of retrieved chunks against binary relevance labels.
 */
export function retrievalMetrics(input: RetrievalEvalInput): RetrievalEvalResult | null {
  if (!Number.isInteger(input.totalRelevant) || input.totalRelevant < 1) return null
  if (!Number.isInteger(input.k) || input.k < 1 || input.hits.length === 0) return null
  const k = Math.min(input.k, input.hits.length)
  let hitsAtK = 0
  let dcgAtK = 0
  for (let index = 0; index < k; index += 1) {
    if (input.hits[index]) {
      hitsAtK += 1
      dcgAtK += 1 / Math.log2(index + 2)
    }
  }
  const firstHitIndex = input.hits.findIndex(Boolean)
  const rr = firstHitIndex >= 0 ? 1 / (firstHitIndex + 1) : 0
  const idealHits = Math.min(input.totalRelevant, k)
  let idcgAtK = 0
  for (let index = 0; index < idealHits; index += 1) {
    idcgAtK += 1 / Math.log2(index + 2)
  }
  return {
    k,
    hitsAtK,
    recallAtK: hitsAtK / input.totalRelevant,
    precisionAtK: hitsAtK / k,
    rr,
    dcgAtK,
    idcgAtK,
    ndcgAtK: idcgAtK > 0 ? dcgAtK / idcgAtK : 0,
  }
}

export interface ConfusionCounts {
  tp: number
  fp: number
  fn: number
  tn: number
}

export interface JudgeCalibrationResult {
  total: number
  observedAgreement: number
  expectedAgreement: number
  /** Cohen's kappa; null when expectedAgreement === 1 (constant labels, 0/0 undefined). */
  kappa: number | null
  precision: number
  recall: number
  f1: number
}

/**
 * Lesson 29.3: Cohen's kappa (Cohen 1960) and binary classification metrics
 * comparing an LLM judge against human ground-truth labels.
 */
export function judgeCalibration(counts: ConfusionCounts): JudgeCalibrationResult | null {
  const vals = [counts.tp, counts.fp, counts.fn, counts.tn]
  if (!vals.every((v) => Number.isInteger(v) && v >= 0)) return null
  const total = counts.tp + counts.fp + counts.fn + counts.tn
  if (total === 0) return null
  const observedAgreement = (counts.tp + counts.tn) / total
  const judgePos = (counts.tp + counts.fp) / total
  const humanPos = (counts.tp + counts.fn) / total
  const judgeNeg = (counts.tn + counts.fn) / total
  const humanNeg = (counts.tn + counts.fp) / total
  const expectedAgreement = judgePos * humanPos + judgeNeg * humanNeg
  const denom = 1 - expectedAgreement
  const kappa = Math.abs(denom) < 1e-12 ? null : (observedAgreement - expectedAgreement) / denom
  const precision = counts.tp + counts.fp > 0 ? counts.tp / (counts.tp + counts.fp) : 0
  const recall = counts.tp + counts.fn > 0 ? counts.tp / (counts.tp + counts.fn) : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  return { total, observedAgreement, expectedAgreement, kappa, precision, recall, f1 }
}

export interface AiSystemBudgetInput {
  /** Retrieval + reranking latency in ms. */
  retrievalMs: number
  /** Input/output guardrail check latency in ms. */
  guardrailMs: number
  /** Model time-to-first-token (prefill) in ms. */
  ttftMs: number
  /** Generated output tokens per request. */
  outputTokens: number
  /** Decode speed in tokens per second. */
  decodeTps: number
  /** Fraction of traffic served by exact/semantic cache (0 to 1). */
  cacheHitRate: number
  /** Cache lookup latency in ms on a hit. */
  cacheLookupMs: number
  /** Fraction of cache hits that return a wrong/stale answer (0 to 1). */
  falseHitRate: number
  /** Monthly request volume (in thousands, e.g. 1000 = 1,000,000 req/month). */
  monthlyRequestsK: number
  /** Uncached model + retrieval cost per 1,000 requests in USD. */
  costPer1kUncachedUsd: number
  /** Monthly provisioned throughput reservation cost in USD (0 if comparing cache only). */
  provisionedMonthlyUsd: number
}

export interface AiSystemBudgetResult {
  decodeMs: number
  uncachedLatencyMs: number
  effectiveLatencyMs: number
  falseHitsPer10k: number
  monthlyUncachedUsd: number
  monthlyCachedUsd: number
  monthlySavingsUsd: number
  provisionedVerdict: 'payg' | 'provisioned' | 'close'
}

/**
 * Lesson 31.1 & `ai-system-budget` lab: end-to-end AI system latency budget,
 * semantic-cache expected latency vs false-hit defect rate, and pay-as-you-go
 * versus provisioned-throughput monthly economics.
 */
export function aiSystemBudget(input: AiSystemBudgetInput): AiSystemBudgetResult | null {
  const nonNeg = [
    input.retrievalMs,
    input.guardrailMs,
    input.ttftMs,
    input.outputTokens,
    input.cacheLookupMs,
    input.monthlyRequestsK,
    input.costPer1kUncachedUsd,
    input.provisionedMonthlyUsd,
  ]
  if (!nonNeg.every((v) => Number.isFinite(v) && v >= 0)) return null
  if (!Number.isFinite(input.decodeTps) || input.decodeTps <= 0) return null
  if (!Number.isFinite(input.cacheHitRate) || input.cacheHitRate < 0 || input.cacheHitRate > 1) return null
  if (!Number.isFinite(input.falseHitRate) || input.falseHitRate < 0 || input.falseHitRate > 1) return null

  // TTFT already ends when the first output token is emitted, so post-TTFT
  // decode covers the remaining max(0, outputTokens - 1) tokens.
  const decodeMs = (Math.max(0, input.outputTokens - 1) / input.decodeTps) * 1000
  const uncachedLatencyMs = input.retrievalMs + input.guardrailMs + input.ttftMs + decodeMs
  const effectiveLatencyMs = input.cacheHitRate * input.cacheLookupMs + (1 - input.cacheHitRate) * uncachedLatencyMs
  const falseHitsPer10k = input.cacheHitRate * input.falseHitRate * 10000
  const monthlyUncachedUsd = input.monthlyRequestsK * input.costPer1kUncachedUsd
  const monthlyCachedUsd = monthlyUncachedUsd * (1 - input.cacheHitRate)
  const monthlySavingsUsd = monthlyUncachedUsd - monthlyCachedUsd

  let provisionedVerdict: 'payg' | 'provisioned' | 'close' = 'payg'
  if (input.provisionedMonthlyUsd > 0) {
    const cheapest = Math.min(monthlyCachedUsd, input.provisionedMonthlyUsd)
    if (Math.abs(monthlyCachedUsd - input.provisionedMonthlyUsd) / Math.max(cheapest, 1e-9) < 0.1) {
      provisionedVerdict = 'close'
    } else {
      provisionedVerdict = input.provisionedMonthlyUsd < monthlyCachedUsd ? 'provisioned' : 'payg'
    }
  }
  return {
    decodeMs,
    uncachedLatencyMs,
    effectiveLatencyMs,
    falseHitsPer10k,
    monthlyUncachedUsd,
    monthlyCachedUsd,
    monthlySavingsUsd,
    provisionedVerdict,
  }
}

export interface VoiceLatencyInput {
  vadEndpointMs: number
  sttFinalMs: number
  llmTtftMs: number
  ttsFirstAudioMs: number
  networkRttMs: number
}

/** Lesson 33.4: Total voice-to-voice turn latency across pipeline stages. */
export function voiceTurnLatencyMs(input: VoiceLatencyInput): number {
  return input.vadEndpointMs + input.sttFinalMs + input.llmTtftMs + input.ttsFirstAudioMs + input.networkRttMs
}
