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
 * 2026-08-18); `card` values come from the model card only. Sources:
 *   - https://huggingface.co/Qwen/Qwen3.8-27B
 *   - https://huggingface.co/Qwen/Qwen3.8-27B/resolve/main/config.json
 *
 * Derivation ownership is a product rule, not a style preference: lesson 7.2
 * owns the KV-cache arithmetic and lesson 9.3 owns the memory budget. Every
 * other lesson references them.
 */

/** Where a number came from, so a reviewer can check it without leaving the file. */
export type FactSource = 'config' | 'card' | 'derived'

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
   * Approximate: the short-conv state is excluded. The 16 GiB-versus-72 MiB
   * contrast is the course's central architectural argument.
   */
  deltaNetStateMib: fact(
    72,
    'MiB total, constant in sequence length',
    'derived',
    '~1.5 MiB per layer x 48 layers; conv state excluded',
  ),

  paramsTotal: fact(27e9, 'parameters', 'card', 'marketed ~27B, includes the vision tower'),
  weightsGbBf16: fact(54, 'GB', 'derived', '27e9 parameters x 2 B'),
} as const satisfies Record<string, ModelFact>

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
