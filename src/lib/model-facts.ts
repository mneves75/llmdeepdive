/**
 * Qwen3.8-27B — the single numeric source of truth for the whole course.
 *
 * Every figure and every lab reads its numbers from here. Nothing derives a new
 * Qwen number anywhere else: four parallel writers once produced three different
 * memory budgets for the same 80 GB card, which is why referencing beats
 * re-deriving and why this module exists at all.
 *
 * ## What may never be stated
 *
 * The model has **no technical report**. Its architecture is inherited from
 * Qwen3.5/3.6 (`model_type: qwen3_5`). Training-token counts, dataset
 * composition, knowledge cutoff and training compute are NOT published, so no
 * lesson, heading, figure label or caption may assert them. If a value is not in
 * this file, it does not ship.
 *
 * ## Provenance
 *
 * `config` values are verified against the model's own config.json (fetched
 * 2026-08-18); `card` values come from the model card only; `tokenizer` values
 * come from the published tokenizer files in the same repository. Sources:
 *   - https://huggingface.co/Qwen/Qwen3.8-27B
 *   - https://huggingface.co/Qwen/Qwen3.8-27B/resolve/main/config.json
 *
 * Derivation ownership is a product rule, not a style preference: lesson 7.2
 * owns the KV-cache arithmetic and lesson 9.3 owns the memory budget. Every
 * other lesson references them.
 */

/** Where a number came from, so a reviewer can check it without leaving the file. */
import { dispatchBytes, moeParameterBudget } from './moe-math.ts'

export type FactSource = 'config' | 'card' | 'tokenizer' | 'derived' | 'measured'
export interface ModelFact {
  readonly value: number
  /** Unit as it should be spoken, e.g. 'layers', 'KiB per token'. Not localised. */
  readonly unit: string
  readonly source: FactSource
  /** How this value is obtained. For 'derived', the arithmetic in full. */
  readonly note: string
}

const fact = (value: number, unit: string, source: FactSource, note: string): ModelFact =>
  ({ value, unit, source, note })

export const QWEN = {
  layers: fact(64, 'layers', 'config', 'num_hidden_layers'),
  attentionLayers: fact(
    16,
    'full-attention layers',
    'config',
    'full_attention_interval: 4 over 64 layers — one attention layer every four',
  ),
  deltaNetLayers: fact(
    48,
    'Gated DeltaNet layers',
    'derived',
    '64 total layers minus the 16 full-attention layers',
  ),
  hiddenSize: fact(5120, 'dimensions', 'config', 'hidden_size'),
  ffnIntermediate: fact(17408, 'dimensions', 'config', 'intermediate_size'),
  vocabSize: fact(248320, 'rows', 'config', 'vocab_size, padded'),
  tokenizerMappedIds: fact(248077, 'ids', 'tokenizer', 'token ids the published tokenizer maps; the other vocabSize rows have no id'),
  queryHeads: fact(24, 'query heads', 'config', 'num_attention_heads'),
  kvHeads: fact(4, 'KV heads', 'config', 'num_key_value_heads — GQA'),
  headDim: fact(256, 'dimensions', 'config', 'head_dim'),
  contextNative: fact(262144, 'tokens', 'config', 'max_position_embeddings'),
  bytesPerElement: fact(2, 'bytes', 'config', 'bfloat16 safetensors'),

  /**
   * Projection widths. NON-SQUARE, which is the point of lesson 4.2 — and the
   * query side is non-square TWICE OVER, because these layers are gated.
   *
   * config.json sets `attn_output_gate: true`. `Qwen3_5Attention` subclasses
   * `Qwen3NextAttention` unchanged, and that class defines
   *
   *   q_proj = nn.Linear(hidden_size, num_attention_heads * head_dim * 2)
   *   query_states, gate = torch.chunk(
   *       q_proj(x).view(*input_shape, -1, head_dim * 2), 2, dim=-1)
   *   ...
   *   attn_output = attn_output * torch.sigmoid(gate)
   *   attn_output = self.o_proj(attn_output)
   *
   * Three things that are easy to get wrong, and all three were wrong here once:
   *
   * 1. The split is **per head, interleaved** — not one 6144-row query block
   *    followed by one 6144-row gate block. The view is (…, 24 heads, 512), so
   *    each head owns 512 contiguous outputs, 256 query then 256 gate, and the
   *    chunk cuts the LAST axis. A flat half-split would hand the first twelve
   *    heads' query+gate pairs to Q and the rest to the gate. That matters to
   *    anyone converting a checkpoint, which is lesson 4.14's whole subject.
   * 2. The gate activation is **sigmoid**, applied in the attention forward.
   *    `output_gate_type: "swish"` in the config belongs to the Gated DeltaNet
   *    path, not to this one.
   * 3. The gate is NOT bypassed around o_proj. It multiplies the attention
   *    output immediately *before* o_proj. Note what o_proj actually receives:
   *    the gated attention output — the mixed value-head results — which merely
   *    happens to be 6144 wide too. It is not the query tensor.
   *
   *   qProjectionOut   12288  the q_proj WEIGHT's output width (24*256*2)
   *   queryStateWidth   6144  the query half; o_proj's input has the SAME width but
   *                           is the gated attention output, not the queries
   *   (the other 6144) the sigmoid gate on the attention output
   */
  qProjectionOut: fact(
    12288,
    'dimensions',
    'config',
    '24 query heads x 256 head dim x 2 — queries and their sigmoid gate, interleaved per head',
  ),
  queryStateWidth: fact(
    6144,
    'dimensions',
    'derived',
    '24 query heads x 256 head dim — the query half of q_proj. o_proj’s input shares this width but is a different tensor: the gated attention OUTPUT',
  ),
  kvProjectionOut: fact(1024, 'dimensions', 'derived', '4 KV heads x 256 head dim'),

  /** Owned by lesson 7.2. Every other lesson references, never re-derives. */
  kvBytesPerTokenPerLayer: fact(
    4096,
    'bytes',
    'derived',
    '4 KV heads x 256 head dim x 2 (K+V) x 2 B = 4 KiB — owned by lesson 7.2',
  ),
  kvKibPerToken: fact(
    64,
    'KiB per token',
    'derived',
    '4 KiB per layer x 16 full-attention layers only — owned by lesson 7.2',
  ),
  kvGibFullContext: fact(
    16,
    'GiB per sequence',
    'derived',
    '64 KiB per token x 262,144 tokens — owned by lesson 7.2',
  ),

  /**
   * The recurrent state a DeltaNet layer keeps instead of a growing cache.
   * The Transformers reference path keeps this matrix state in float32; the
   * small short-convolution state is excluded.
   * Runtime implementations may choose a different state dtype.
   */
  deltaNetStateMib: fact(
    144,
    'MiB total, constant in sequence length',
    'derived',
    '48 value heads x 128 x 128 x 4 B x 48 layers; reference float32 state, conv state excluded',
  ),

  paramsTotal: fact(27e9, 'parameters', 'card', 'marketed ~27B, includes the vision tower'),
  weightsGbBf16: fact(54, 'GB', 'derived', '27e9 parameters x 2 B'),
} as const satisfies Record<string, ModelFact>

/**
 * The MoE counterfactual the MoE lessons work through.
 *
 * This is NOT a model that exists. Qwen3.8-27B ships dense FFNs; lesson 4.9 says
 * so and no lesson may contradict it. The question these facts answer is: if the
 * same active feed-forward budget were split into experts, what would the
 * numbers be? That is a legitimate arithmetic question about published values,
 * and it is the only way to teach stored-versus-active parameters on the
 * course's own model instead of on a stranger's.
 *
 * The shape is chosen so a reader can check the identity by hand:
 * 64 experts, top-8, each 2,176 wide, because 8 x 2,176 = 17,408, the dense FFN
 * width. The arithmetic lives in `moeParameterBudget`, and
 * `tests/moe-math.test.mjs` pins every value below.
 *
 * Two rules follow from this being a counterfactual:
 *
 * 1. No claim about quality, speed or memory *measured* on this model exists.
 *    Memory arithmetic is fine; a benchmark number would not be.
 * 2. The 5.4x figure is a budget choice, not a scaling law. Choosing a different
 *    expert width changes it, and the lessons say so.
 */
const MOE_SHAPE = { experts: 64, topK: 8 } as const

const MOE_BUDGET = moeParameterBudget({
  hidden: QWEN.hiddenSize.value,
  denseFfn: QWEN.ffnIntermediate.value,
  layers: QWEN.layers.value,
  ...MOE_SHAPE,
})

const MOE_DENSE_FFN_TOTAL = MOE_BUDGET.denseFfnPerLayer * QWEN.layers.value
const MOE_ROUTER_TOTAL = MOE_BUDGET.routerParamsPerLayer * QWEN.layers.value
const MOE_NON_EXPERT = QWEN.paramsTotal.value - MOE_DENSE_FFN_TOTAL
const MOE_TOTAL = MOE_NON_EXPERT + MOE_BUDGET.storedFfnTotal + MOE_ROUTER_TOTAL

/** Bytes one token sends in one layer: top-k copies of the hidden state, bf16. */
const MOE_DISPATCH = {
  tokens: 1,
  layers: 1,
  topK: MOE_SHAPE.topK,
  hidden: QWEN.hiddenSize.value,
  bytesPerElement: QWEN.bytesPerElement.value,
} as const
const MOE_DISPATCH_PER_LAYER = dispatchBytes(MOE_DISPATCH)

/** The 4-bit case: routed experts at half a byte, everything else in bf16. */
const MOE_EXPERTS_INT4_BYTES = MOE_BUDGET.storedFfnTotal * 0.5
const MOE_REST_BF16_BYTES = (MOE_NON_EXPERT + MOE_ROUTER_TOTAL) * 2
const MOE_ACTIVE_FFN_TOTAL = MOE_BUDGET.activeFfnPerLayer * QWEN.layers.value
const MOE_REST_PARAMS = MOE_NON_EXPERT + MOE_ROUTER_TOTAL

export const MOE = {
  experts: fact(MOE_SHAPE.experts, 'experts per layer', 'derived', 'the lesson\'s chosen shape'),
  topK: fact(MOE_SHAPE.topK, 'experts per token', 'derived', 'one token keeps 8 of the 64'),
  expertWidth: fact(
    MOE_BUDGET.expertWidth,
    'dimensions per expert',
    'derived',
    'dense FFN 17,408 x top-8 / 64 experts = 2,176, so 8 x 2,176 = 17,408 exactly',
  ),
  denseFfnPerLayer: fact(
    MOE_BUDGET.denseFfnPerLayer,
    'parameters per layer',
    'derived',
    '3 x 5,120 x 17,408 — gate, up and down matrices of the gated FFN',
  ),
  activeFfnPerLayer: fact(
    MOE_BUDGET.activeFfnPerLayer,
    'parameters per layer',
    'derived',
    '8 experts x 3 x 5,120 x 2,176 — identical to the dense layer, by construction',
  ),
  storedFfnPerLayer: fact(
    MOE_BUDGET.storedFfnPerLayer,
    'parameters per layer',
    'derived',
    '64 experts x 3 x 5,120 x 2,176; 8x the dense layer = experts / topK',
  ),
  storedFfnTotal: fact(
    MOE_BUDGET.storedFfnTotal,
    'parameters',
    'derived',
    '2,139,095,040 per layer x 64 layers',
  ),
  routerParamsPerLayer: fact(
    MOE_BUDGET.routerParamsPerLayer,
    'parameters per layer',
    'derived',
    '64 logits x 5,120 hidden, one router row per expert (bias omitted)',
  ),
  routerParamsTotal: fact(MOE_ROUTER_TOTAL, 'parameters', 'derived', '327,680 x 64 layers'),
  denseFfnTotal: fact(
    MOE_DENSE_FFN_TOTAL,
    'parameters',
    'derived',
    '64 layers x 267,386,880 — the feed-forward share of the dense model',
  ),
  nonExpertParams: fact(
    MOE_NON_EXPERT,
    'parameters',
    'derived',
    '27e9 total minus 64 x 267,386,880 dense feed-forward parameters',
  ),
  totalStored: fact(
    MOE_TOTAL,
    'parameters',
    'derived',
    'non-expert 9,887,239,680 + experts 136,902,082,560 + routers 20,971,520',
  ),
  storedOverDense: fact(
    MOE_TOTAL / QWEN.paramsTotal.value,
    'times the dense model',
    'derived',
    '146,810,293,760 / 27e9 = 5.4374x',
  ),
  weightsGbBf16: fact(
    MOE_TOTAL * 2e-9,
    'GB',
    'derived',
    '146,810,293,760 parameters x 2 B, against the dense model\'s 54 GB',
  ),
  dispatchBytesPerTokenPerLayer: fact(
    MOE_DISPATCH_PER_LAYER,
    'bytes per token',
    'derived',
    'top-8 copies x 5,120 values x 2 B = 81,920 B = 80 KiB, dispatch only',
  ),
  dispatchBytesPerToken: fact(
    dispatchBytes({ ...MOE_DISPATCH, layers: QWEN.layers.value }),
    'bytes per token',
    'derived',
    '80 KiB x 64 layers = 5 MiB, one way, before the combine returns',
  ),
  dispatchBytesMicroBatch2048: fact(
    dispatchBytes({ ...MOE_DISPATCH, tokens: 2048, layers: QWEN.layers.value }),
    'bytes per forward',
    'derived',
    '5,242,880 B per token x 2,048 tokens = 10 GiB, dispatch only',
  ),
  expertsInt4Gb: fact(
    MOE_EXPERTS_INT4_BYTES * 1e-9,
    'GB',
    'derived',
    'routed experts at 4 bits: 136,902,082,560 x 0.5 B',
  ),
  servingGbExpertsInt4: fact(
    (MOE_EXPERTS_INT4_BYTES + MOE_REST_BF16_BYTES) * 1e-9,
    'GB',
    'derived',
    'experts at 4 bits + attention, embeddings and routers in bf16 (9,908,211,200 x 2 B)',
  ),
  readsPerTokenBf16: fact(
    QWEN.paramsTotal.value * 2e-9,
    'GB per decoded token',
    'derived',
    'a decoded token reads every active weight once: 27e9 x 2 B, the same as the dense model',
  ),
  readsPerTokenExpertsInt4: fact(
    MOE_ACTIVE_FFN_TOTAL * 0.5e-9 + MOE_REST_PARAMS * 2e-9,
    'GB per decoded token',
    'derived',
    'active experts at 4 bits (17,112,760,320 x 0.5 B) + the rest at bf16 (9,908,211,200 x 2 B)',
  ),
  servingGbAllInt4: fact(
    (MOE_BUDGET.storedFfnTotal + MOE_REST_PARAMS) * 0.5e-9,
    'GB',
    'derived',
    'every weight at 4 bits: (136,902,082,560 + 9,908,211,200) x 0.5 B',
  ),
  readsPerTokenAllInt4: fact(
    (MOE_ACTIVE_FFN_TOTAL + MOE_REST_PARAMS) * 0.5e-9,
    'GB per decoded token',
    'derived',
    'every active weight at 4 bits: (17,112,760,320 + 9,908,211,200) x 0.5 B',
  ),
} as const satisfies Record<string, ModelFact>

/**
 * One published quantization benchmark, kept here for the same reason every
 * other number is: so a figure never invents one and a reviewer never has to
 * leave this file to check it.
 *
 * ## These are NOT Qwen3.8-27B numbers
 *
 * They are measured on **Llama-3.1-8B**, and no lesson, caption or label may
 * present them as describing the course model. They are here because bits per
 * weight is the one quantity readers meet on the Hub and nowhere in the course,
 * and because the effect it has on decode is only convincing when measured.
 *
 * **The whole published table ships here, not a chosen slice.** An earlier
 * version carried four rows, and those four happened to be monotonic in both
 * columns — which made the figure argue "fewer bits, faster decode" as a smooth
 * law. The full table says something more useful and less tidy, so it is the
 * full table that ships.
 *
 * Three facts it teaches, all visible in the columns:
 *
 * 1. **The name is not the bit width.** `Q4_K_M` stores 4.8944 bits per weight,
 *    not 4; `Q8_0` stores 8.5008, not 8. Block scales, super-block metadata and
 *    deliberately protected tensors are counted in, which is why a community
 *    artifact labelled `3.8bpw` is being *more* precise than one labelled
 *    `4bit`, not less.
 * 2. **Quantizing at all is what buys decode in this benchmark.** Against F16's
 *    29.17 t/s, the quantized Llama-3.1-8B rows span 1.75x (Q8_0, 50.93 t/s) to
 *    3.09x (Q2_K_S, 90.01 t/s) — lesson 7.3's memory-bound decode, measured
 *    rather than asserted as a universal quantization ratio.
 * 3. **Below 8 bits, size stops predicting speed.** The ordering is not
 *    monotonic, and not only across format families: `Q3_K_S` (3.6429 bpw)
 *    decodes at 69.84 while the LARGER `Q4_K_S` (4.6672) reaches 76.71, and
 *    `Q2_K_S` at 2.9697 bpw is the fastest row in the table at 90.01. Kernel
 *    efficiency dominates byte count in that range. Any lesson drawing a
 *    smooth "smaller is faster" law from this data is reading a slice of it.
 *
 * Prefill tells the opposite story and is worth stating exactly: it does not
 * improve with quantization and slightly degrades, from F16's 923.49 down to
 * 708.71 for IQ3_XS, because dequantization is extra arithmetic in a
 * compute-bound regime.
 *
 * Bits per weight is **artifact- and model-dependent**: it shifts with tensor
 * inventory, protected tensors, and metadata. The 4.8944 below is measured for
 * the published Llama-3.1-8B artifact; no exact Qwen bpw is inferred from its
 * rounded marketed parameter count.
 *
 * Provenance: llama.cpp `tools/quantize/README.md`, fetched 2026-08-19.
 * https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md
 */
export interface QuantBenchRow {
  /** The quantization type as llama.cpp names it. Notation, never localised. */
  readonly method: string
  readonly bitsPerWeight: number
  readonly sizeGib: number
  /** Prompt processing, 512 tokens. Compute-bound; barely moves with bit width. */
  readonly prefillTokensPerSecond: number
  /** Text generation, 128 tokens. Memory-bound; this is what quantization buys. */
  readonly decodeTokensPerSecond: number
}

export const LLAMA_CPP_QUANT_BENCH = [
  { method: 'IQ1_S', bitsPerWeight: 2.0042, sizeGib: 1.87, prefillTokensPerSecond: 858.88, decodeTokensPerSecond: 79.73 },
  { method: 'IQ1_M', bitsPerWeight: 2.146, sizeGib: 2.01, prefillTokensPerSecond: 847.99, decodeTokensPerSecond: 72.92 },
  { method: 'IQ2_M', bitsPerWeight: 2.9294, sizeGib: 2.74, prefillTokensPerSecond: 787.68, decodeTokensPerSecond: 74.44 },
  { method: 'Q2_K_S', bitsPerWeight: 2.9697, sizeGib: 2.78, prefillTokensPerSecond: 798.91, decodeTokensPerSecond: 90.01 },
  { method: 'IQ3_XS', bitsPerWeight: 3.4977, sizeGib: 3.27, prefillTokensPerSecond: 708.71, decodeTokensPerSecond: 71.67 },
  { method: 'Q3_K_S', bitsPerWeight: 3.6429, sizeGib: 3.41, prefillTokensPerSecond: 752.17, decodeTokensPerSecond: 69.84 },
  { method: 'IQ3_S', bitsPerWeight: 3.6606, sizeGib: 3.42, prefillTokensPerSecond: 798.78, decodeTokensPerSecond: 69.31 },
  { method: 'Q3_K_M', bitsPerWeight: 3.996, sizeGib: 3.74, prefillTokensPerSecond: 783.44, decodeTokensPerSecond: 71.68 },
  { method: 'Q3_K_L', bitsPerWeight: 4.2979, sizeGib: 4.02, prefillTokensPerSecond: 761.17, decodeTokensPerSecond: 69.38 },
  { method: 'IQ4_XS', bitsPerWeight: 4.4597, sizeGib: 4.17, prefillTokensPerSecond: 771.8, decodeTokensPerSecond: 77.51 },
  { method: 'Q4_K_S', bitsPerWeight: 4.6672, sizeGib: 4.36, prefillTokensPerSecond: 818.55, decodeTokensPerSecond: 76.71 },
  { method: 'IQ4_NL', bitsPerWeight: 4.6818, sizeGib: 4.38, prefillTokensPerSecond: 806.03, decodeTokensPerSecond: 76.63 },
  { method: 'Q4_K_M', bitsPerWeight: 4.8944, sizeGib: 4.58, prefillTokensPerSecond: 821.81, decodeTokensPerSecond: 71.93 },
  { method: 'Q5_K_S', bitsPerWeight: 5.5704, sizeGib: 5.21, prefillTokensPerSecond: 752.52, decodeTokensPerSecond: 69.53 },
  { method: 'Q8_0', bitsPerWeight: 8.5008, sizeGib: 7.95, prefillTokensPerSecond: 865.09, decodeTokensPerSecond: 50.93 },
  { method: 'F16', bitsPerWeight: 16.0005, sizeGib: 14.96, prefillTokensPerSecond: 923.49, decodeTokensPerSecond: 29.17 },
] as const satisfies readonly QuantBenchRow[]

/** The model the rows above were measured on. Stated wherever they are shown. */
export const LLAMA_CPP_QUANT_BENCH_MODEL = 'Llama-3.1-8B'

/**
 * KV cache per token for six peer models, the rows of lesson 7.6's table
 * "across attention families". None of them is the course model; the table's
 * Qwen3.8-27B row is built from `QWEN`.
 *
 * Each row is read from the model's `config.json` at the pinned revision
 * (Hugging Face, read 2026-11-26) and counts 2 bytes per cached number, whatever
 * precision the checkpoint ships, so rows compare designs, not number formats.
 * A K/V layer caches a key and a value per KV head: 2 × kvHeads × headDim
 * numbers. An MLA layer caches what DeepSeek-V2 (arXiv 2405.04434, Table 1)
 * says it must: the latent plus the decoupled RoPE key, kv_lora_rank +
 * qk_rope_head_dim numbers. Only layers that keep every past token count:
 *   - GPT-2 XL and Phi-4 state no head_dim; it is n_embd ÷ n_head (1600 ÷ 25)
 *     and hidden_size ÷ num_attention_heads (5120 ÷ 40).
 *   - `layers` is num_hidden_layers (GPT-2: n_layer). DeepSeek-V3 and GLM-4.5
 *     also declare `num_nextn_predict_layers: 1`, a multi-token-prediction
 *     layer the table does not count.
 *   - Qwen3.5-397B-A17B caches in its 15 `full_attention` layers of 60; the
 *     others are `linear_attention`, Gated DeltaNet in the reference
 *     implementation (transformers e4dd56a, `Qwen3_5MoeGatedDeltaNet`).
 *   - Nemotron 3 Nano's `hybrid_override_pattern` has 6 `*` (attention), 23 `M`
 *     (Mamba-2) and 23 `E` (expert feed-forward) among its 52 layers, per
 *     `configuration_nemotron_h.py` at the same revision.
 *
 * Cross-check: rasbt/llm-architecture-gallery at 660cc18 (Apache-2.0) lists the
 * same KV per token for Phi-4, GLM-4.5, DeepSeek-V3 (68.6) and Nemotron 3 Nano.
 */
export type KvPeerGeometry =
  | { readonly kind: 'kv'; readonly kvHeads: number; readonly headDim: number }
  | { readonly kind: 'latent'; readonly latentDim: number; readonly ropeDim: number }

export interface KvPeerConfig {
  readonly model: string
  readonly repo: string
  readonly revision: string
  /** The attention family as the table prints it. Notation, never localised. */
  readonly attention: string
  readonly geometry: KvPeerGeometry
  readonly layers: number
  readonly cachedLayers: number
  readonly kibPerToken: number
}

export const KV_PEER_CONFIGS = [
  {
    model: 'GPT-2 XL',
    repo: 'openai-community/gpt2-xl',
    revision: '15ea56dee5df4983c59b2538573817e1667135e2',
    attention: 'MHA',
    geometry: { kind: 'kv', kvHeads: 25, headDim: 64 },
    layers: 48,
    cachedLayers: 48,
    kibPerToken: 300,
  },
  {
    model: 'Phi-4',
    repo: 'microsoft/phi-4',
    revision: '2db69c1c3e91a05d2c64a3185acfbaf36f744e25',
    attention: 'GQA',
    geometry: { kind: 'kv', kvHeads: 10, headDim: 128 },
    layers: 40,
    cachedLayers: 40,
    kibPerToken: 200,
  },
  {
    model: 'GLM-4.5',
    repo: 'zai-org/GLM-4.5',
    revision: 'cbb2c7cfb52fa128a9660cb1a7a78e017899e115',
    attention: 'GQA',
    geometry: { kind: 'kv', kvHeads: 8, headDim: 128 },
    layers: 92,
    cachedLayers: 92,
    kibPerToken: 368,
  },
  {
    model: 'DeepSeek-V3',
    repo: 'deepseek-ai/DeepSeek-V3',
    revision: 'e815299b0bcbac849fa540c768ef21845365c9eb',
    attention: 'MLA',
    geometry: { kind: 'latent', latentDim: 512, ropeDim: 64 },
    layers: 61,
    cachedLayers: 61,
    kibPerToken: 68.625,
  },
  {
    model: 'Qwen3.5-397B-A17B',
    repo: 'Qwen/Qwen3.5-397B-A17B',
    revision: '8472618112abcbd45acbcdc58436aff4233c23f7',
    attention: 'GQA + Gated DeltaNet',
    geometry: { kind: 'kv', kvHeads: 2, headDim: 256 },
    layers: 60,
    cachedLayers: 15,
    kibPerToken: 30,
  },
  {
    model: 'Nemotron 3 Nano 30B-A3B',
    repo: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16',
    revision: 'bf77c3174f68ad409e1c2aa60daeb46e32d1c606',
    attention: 'GQA + Mamba-2',
    geometry: { kind: 'kv', kvHeads: 2, headDim: 128 },
    layers: 52,
    cachedLayers: 6,
    kibPerToken: 6,
  },
] as const satisfies readonly KvPeerConfig[]

/**
 * The instructive wrong turn in lesson 7.2: assuming every layer caches KV.
 * It is kept here, explicitly named as wrong, because a figure that teaches the
 * mistake must quote the same numbers the prose does — and because a numeric
 * cross-check cannot otherwise tell a deliberate wrong turn from a real error.
 */
export const QWEN_COMMON_MISTAKE = {
  kvKibPerTokenIfEveryLayerCached: fact(
    256,
    'KiB per token',
    'derived',
    'WRONG — 4 KiB x all 64 layers. Only the 16 attention layers cache KV.',
  ),
  kvGibFullContextIfEveryLayerCached: fact(
    64,
    'GiB per sequence',
    'derived',
    'WRONG — follows from the 256 KiB error above. The real figure is 16 GiB.',
  ),
} as const satisfies Record<string, ModelFact>

/**
 * Published TensorFold benchmark figures (pinned at ashhart/TensorFold@v1.2.1),
 * centralized here so Home.astro and Track 7/11/12 lessons share one provenance
 * owner and never drift across locales or hardware attributions.
 */
export const TENSORFOLD_BENCHMARKS = {
  pin: 'v1.2.1',
  decode: {
    metric: { en: '162–226 tok/s', 'pt-br': '162–226 tok/s' },
    receipt: {
      en: 'Single-stream greedy decode on Apple M5 Ultra (TensorFold/Qwen3.8-27B-MLX-4bit + z-lab/Qwen3.8-27B-DFlash2, up from 51.6 tok/s without a drafter); 201.4 tok/s aggregate across 8 concurrent streams (--parallel 8) on 64 GB M5 Pro (TensorFold 0.3.5.1, Python + MLX).',
      'pt-br': 'Decode greedy em stream único no Apple M5 Ultra (TensorFold/Qwen3.8-27B-MLX-4bit + z-lab/Qwen3.8-27B-DFlash2, contra 51,6 tok/s sem drafter); 201,4 tok/s agregados em 8 streams concorrentes (--parallel 8) no M5 Pro de 64 GB (TensorFold 0.3.5.1, Python + MLX).',
    },
  },
  reuse: {
    metric: { en: '0.28 s vs 1.29 s', 'pt-br': '0,28 s vs 1,29 s' },
    receipt: {
      en: 'Warm cached-prefix resume vs cold prefill on Apple M5 Ultra (4.4× faster TTFT), and 0.25–0.37 s warm TTFT with 24.4–29.8 tok/s decode across 8k–32k context on 64 GB M5 Pro.',
      'pt-br': 'Retomada com prefixo em cache contra prefill a frio no Apple M5 Ultra (TTFT 4,4× mais rápido), e 0,25–0,37 s de TTFT com 24,4–29,8 tok/s de decode entre 8k e 32k de contexto no M5 Pro de 64 GB.',
    },
  },
  cluster: {
    metric: { en: '200–247 tok/s', 'pt-br': '200–247 tok/s' },
    receipt: {
      en: 'Single-stream code decode (179–186 tok/s chat) on Qwen3.8-Flash-Next-MLX-6bit across two 256 GB M5 Ultra Macs over Thunderbolt 5 + MCDMA (--speed-up), or 53.7 tok/s on kindlingai/glm-5.3-exlr8-k2-k3-k4.',
      'pt-br': 'Decode de código em stream único (179–186 tok/s em chat) no Qwen3.8-Flash-Next-MLX-6bit em dois Macs M5 Ultra de 256 GB via Thunderbolt 5 + MCDMA (--speed-up), ou 53,7 tok/s no kindlingai/glm-5.3-exlr8-k2-k3-k4.',
    },
  },
} as const
