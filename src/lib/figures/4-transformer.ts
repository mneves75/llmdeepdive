/**
 * Figures for track 4 — The Transformer.
 *
 * Every number comes from `~/lib/model-facts`. The projection widths in
 * particular are NON-SQUARE on purpose: 24 heads × 256 = 6144, which is not the
 * 5120 hidden size. That mismatch is the entire point of lesson 4.2 and must
 * never be "corrected".
 */
import { QWEN } from '~/lib/model-facts'
import { maskAndRenormalise } from './geometry'
import type { Figure } from './types'

/**
 * Each lesson's OWN worked example, one token per word, positions 1–4.
 *
 * The two locales use DIFFERENT prompts, and that is correct: the English
 * lesson works through "The cache stores keys" while the pt-BR lesson works
 * through "O cache armazena keys" (with *keys* left in English, as AGENTS.md
 * requires for industry-standard terms). A figure that shows the English
 * sentence on the Portuguese page contradicts the paragraph beside it.
 *
 * This is why token labels are localised even though they look like notation.
 */
const TOKENS = [
  { en: 'The', 'pt-br': 'O' },
  { en: 'cache', 'pt-br': 'cache' },
  { en: 'stores', 'pt-br': 'armazena' },
  { en: 'keys', 'pt-br': 'keys' },
] as const

/**
 * Illustrative attention weights with NO mask applied — every position attends
 * to every other, including its own future. Each row sums to 1.
 *
 * The future entries must be genuinely non-zero. An earlier version of this
 * figure used an already lower-triangular matrix, which made masking a
 * numerical no-op: the "before" and "after" steps showed identical weights
 * while the caption claimed the future was driven to negative infinity. The
 * figure contradicted its own explanation.
 */
const UNMASKED: readonly (readonly number[])[] = [
  [0.25, 0.3, 0.2, 0.25],
  [0.3, 0.35, 0.2, 0.15],
  [0.15, 0.35, 0.3, 0.2],
  [0.1, 0.3, 0.2, 0.4],
]

export const TRACK_4_FIGURES = {
  'attention-projection-shapes': {
    lesson: '4.2-self-attention',
    title: { en: 'None of the four matrices is square', 'pt-br': 'Nenhuma das quatro matrizes é quadrada' },
    caption: {
      en: `Grouped-query attention gives ${QWEN.queryHeads.value} query heads but only ${QWEN.kvHeads.value} KV heads, all at head dimension ${QWEN.headDim.value}. These layers are gated (config: attn_output_gate), so one matrix emits queries and their gate together — ${QWEN.hiddenSize.value} to ${QWEN.qProjectionOut.value}. The split is per head, not down the middle: the tensor is viewed as ${QWEN.queryHeads.value} heads of ${QWEN.headDim.value} × 2, and each head's last axis is cut into ${QWEN.headDim.value} query and ${QWEN.headDim.value} gate. Attention runs on the query half; sigmoid(gate) then scales the attention output, and o_proj takes that ${QWEN.queryStateWidth.value}-wide result — not the queries — back to ${QWEN.hiddenSize.value}.`,
      'pt-br': `A atenção com consultas agrupadas dá ${QWEN.queryHeads.value} cabeças de query mas apenas ${QWEN.kvHeads.value} cabeças KV, todas com dimensão de cabeça ${QWEN.headDim.value}. Estas camadas têm porta (config: attn_output_gate), então uma única matriz emite as queries e sua porta juntas — ${QWEN.hiddenSize.value} para ${QWEN.qProjectionOut.value}. A divisão é por head, não ao meio: o tensor é visto como ${QWEN.queryHeads.value} heads de ${QWEN.headDim.value} × 2, e o último eixo de cada head é cortado em ${QWEN.headDim.value} de query e ${QWEN.headDim.value} de porta. A atenção roda sobre a metade de query; sigmoid(porta) então escala a saída da atenção, e o_proj leva esse resultado de ${QWEN.queryStateWidth.value} — não as queries — de volta a ${QWEN.hiddenSize.value}.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'q_proj (queries + gate)', 'pt-br': 'q_proj (queries + porta)' },
          detail: { en: `${QWEN.hiddenSize.value} → ${QWEN.qProjectionOut.value}`, 'pt-br': `${QWEN.hiddenSize.value} → ${QWEN.qProjectionOut.value}` },
          pigment: 'coral',
        },
        {
          label: { en: 'split per head', 'pt-br': 'divide por head' },
          detail: { en: `${QWEN.queryHeads.value} × (${QWEN.headDim.value} query + ${QWEN.headDim.value} gate)`, 'pt-br': `${QWEN.queryHeads.value} × (${QWEN.headDim.value} query + ${QWEN.headDim.value} porta)` },
          pigment: 'sonar',
        },
        {
          label: { en: 'k_proj · v_proj', 'pt-br': 'k_proj · v_proj' },
          detail: { en: `${QWEN.hiddenSize.value} → ${QWEN.kvProjectionOut.value} each`, 'pt-br': `${QWEN.hiddenSize.value} → ${QWEN.kvProjectionOut.value} cada` },
          pigment: 'accent',
        },
        {
          label: { en: 'sigmoid(gate) · o_proj', 'pt-br': 'sigmoid(porta) · o_proj' },
          detail: { en: `${QWEN.queryStateWidth.value} → ${QWEN.hiddenSize.value}`, 'pt-br': `${QWEN.queryStateWidth.value} → ${QWEN.hiddenSize.value}` },
          pigment: 'kelp',
        },
      ],
    },
  },

  'causal-mask': {
    lesson: '4.4-causal-masking',
    title: { en: 'What the mask removes', 'pt-br': 'O que a máscara remove' },
    caption: {
      en:
        'Scores are illustrative, not measured. Every cell above the diagonal is set to negative infinity before the softmax, so it contributes exactly zero afterwards — each row still sums to one, over the past only.',
      'pt-br':
        'Os valores são ilustrativos, não medidos. Toda célula acima da diagonal vira menos infinito antes do softmax, então contribui exatamente zero depois — cada linha ainda soma um, apenas sobre o passado.',
    },
    steps: [
      {
        label: { en: 'All scores', 'pt-br': 'Todos os scores' },
        caption: {
          en: 'With no mask, every position attends to every other one — including positions that come after it. Each row sums to 1 across all four.',
          'pt-br': 'Sem máscara, cada posição atende a todas as outras — inclusive às que vêm depois dela. Cada linha soma 1 entre as quatro.',
        },
        body: {
          kind: 'grid',
          bins: 4,
          columns: [...TOKENS],
          rows: [...TOKENS],
          cells: UNMASKED.map((row) => [...row]),
        },
      },
      {
        label: { en: 'Causally masked', 'pt-br': 'Com máscara causal' },
        caption: {
          en: 'The hatched cells went to negative infinity before the softmax, so they contribute exactly zero — and the surviving weights renormalise over the past alone. Position 1 now attends only to itself; position 4 is unchanged because it had no future to lose.',
          'pt-br': 'As células hachuradas viraram menos infinito antes do softmax, então contribuem exatamente zero — e os pesos restantes se renormalizam apenas sobre o passado. A posição 1 agora atende só a si mesma; a posição 4 não muda, porque não tinha futuro a perder.',
        },
        body: {
          kind: 'grid',
          bins: 4,
          columns: [...TOKENS],
          rows: [...TOKENS],
          cells: maskAndRenormalise(UNMASKED),
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
