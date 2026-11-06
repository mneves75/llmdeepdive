/**
 * Figures for track 4 — The Transformer.
 *
 * Every number comes from `~/lib/model-facts`. The projection widths in
 * particular are NON-SQUARE on purpose: 24 heads × 256 = 6144, which is not the
 * 5120 hidden size. That mismatch is the entire point of lesson 4.2 and must
 * never be "corrected".
 */
import { MOE, QWEN } from '~/lib/model-facts'
import { mixtureWeights, type GateFunction } from '~/lib/moe-math'
import { maskAndRenormalise, millions } from './geometry'
import type { Figure, FigurePigment } from './types'

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

/**
 * Lesson 4.18's plot: how much weight the top expert keeps as its logit pulls
 * away from the second expert's. The second logit is fixed at 3.2 and the other
 * six stay at their lesson values, so only the margin changes. Softmax compares
 * the pair and approaches 1; sigmoid has already saturated at both logits, so a
 * confident router still hands its top two nearly equal shares.
 */
const ROUTER_REST = [3.2, 2.7, 2.1, 1.4, 0.2, -1.1, -2.4] as const
const MARGINS = Array.from({ length: 17 }, (_, index) => index * 0.5)

const topShare = (gate: GateFunction, margin: number): number => {
  const mixture = mixtureWeights([3.2 + margin, ...ROUTER_REST], 2, { gate, renormalize: true })
  const first = mixture.weights[0] ?? 0
  const second = mixture.weights[1] ?? 0
  return Number((first / (first + second)).toFixed(4))
}

const gateSeries = (gate: GateFunction, label: string, pigment: FigurePigment) => ({
  label: { en: label, 'pt-br': label },
  pigment,
  points: MARGINS.map((margin) => [margin, topShare(gate, margin)] as const),
})

export const TRACK_4_FIGURES = {
  'attention-projection-shapes': {
    lesson: '4.2-self-attention',
    title: { en: 'None of the four matrices is square', 'pt-br': 'Nenhuma das quatro matrizes é quadrada' },
    caption: {
      en: `Grouped-query attention gives ${QWEN.queryHeads.value} query heads but only ${QWEN.kvHeads.value} KV heads, all at head dimension ${QWEN.headDim.value}. These layers are gated (config: attn_output_gate), so one matrix emits the queries and their gate together: ${QWEN.hiddenSize.value} to ${QWEN.qProjectionOut.value}. The split is per head, not down the middle. The tensor is viewed as ${QWEN.queryHeads.value} heads of ${QWEN.headDim.value} × 2, and each head's last axis is cut into ${QWEN.headDim.value} query values and ${QWEN.headDim.value} gate values. Attention runs on the query half. Then sigmoid(gate), a 0-to-1 dial for each number, scales the attention output, and o_proj takes that ${QWEN.queryStateWidth.value}-wide result (not the queries) back to ${QWEN.hiddenSize.value}.`,
      'pt-br': `A atenção com consultas agrupadas dá ${QWEN.queryHeads.value} cabeças de query mas apenas ${QWEN.kvHeads.value} cabeças KV, todas com dimensão de cabeça ${QWEN.headDim.value}. Estas camadas têm porta (config: attn_output_gate), então uma única matriz emite as queries e sua porta juntas: ${QWEN.hiddenSize.value} para ${QWEN.qProjectionOut.value}. A divisão é por head, não ao meio. O tensor é visto como ${QWEN.queryHeads.value} heads de ${QWEN.headDim.value} × 2, e o último eixo de cada head é cortado em ${QWEN.headDim.value} valores de query e ${QWEN.headDim.value} de porta. A atenção roda sobre a metade de query. Depois, sigmoid(porta), um botão de 0 a 1 para cada número, escala a saída da atenção, e o_proj leva esse resultado de largura ${QWEN.queryStateWidth.value} (não as queries) de volta a ${QWEN.hiddenSize.value}.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'q_proj (queries + gate)', 'pt-br': 'q_proj (queries + porta)' },
          detail: { en: `${QWEN.hiddenSize.value} → ${QWEN.qProjectionOut.value}`, 'pt-br': `${QWEN.hiddenSize.value} → ${QWEN.qProjectionOut.value}` },
          pigment: 'danger',
        },
        {
          label: { en: 'split per head', 'pt-br': 'divide por head' },
          detail: { en: `${QWEN.queryHeads.value} × (${QWEN.headDim.value} query + ${QWEN.headDim.value} gate)`, 'pt-br': `${QWEN.queryHeads.value} × (${QWEN.headDim.value} query + ${QWEN.headDim.value} porta)` },
          pigment: 'caution',
        },
        {
          label: { en: 'k_proj · v_proj', 'pt-br': 'k_proj · v_proj' },
          detail: { en: `${QWEN.hiddenSize.value} → ${QWEN.kvProjectionOut.value} each`, 'pt-br': `${QWEN.hiddenSize.value} → ${QWEN.kvProjectionOut.value} cada` },
          pigment: 'accent',
        },
        {
          label: { en: 'sigmoid(gate) · o_proj', 'pt-br': 'sigmoid(porta) · o_proj' },
          detail: { en: `${QWEN.queryStateWidth.value} → ${QWEN.hiddenSize.value}`, 'pt-br': `${QWEN.queryStateWidth.value} → ${QWEN.hiddenSize.value}` },
          pigment: 'success',
        },
      ],
    },
  },

  'causal-mask': {
    lesson: '4.4-causal-masking',
    title: { en: 'What the mask removes', 'pt-br': 'O que a máscara remove' },
    caption: {
      en:
        'The weights shown are illustrative, not measured. Every cell above the diagonal is set to negative infinity before the softmax, so it contributes exactly zero afterwards — each row still sums to one, over the past only.',
      'pt-br':
        'Os valores são ilustrativos, não medidos. Toda célula acima da diagonal vira menos infinito antes do softmax, então contribui exatamente zero depois — cada linha ainda soma um, apenas sobre o passado.',
    },
    steps: [
      {
        label: { en: 'All scores', 'pt-br': 'Todos os scores' },
        caption: {
          en: 'With no mask, every position attends to every other one — including positions that come after it. Each row sums to 1 across all four.',
          'pt-br': 'Sem máscara, cada posição olha para todas as outras, inclusive as que vêm depois dela. Cada linha soma 1 entre as quatro.',
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
          'pt-br': 'As células hachuradas viraram menos infinito antes do softmax, então contribuem exatamente zero — e os pesos restantes se renormalizam apenas sobre o passado. A posição 1 agora dá attention só a si mesma; a posição 4 não muda, porque não tinha futuro a perder.',
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

  'moe-stored-versus-active': {
    lesson: '4.18-mixture-of-experts',
    title: { en: 'Eight times the storage, the same bill', 'pt-br': 'Oito vezes o armazenamento, a mesma conta' },
    caption: {
      en: `Qwen3.8-27B does not ship this way; the split is the lesson's counterfactual on its published shape. A token runs eight experts of ${MOE.expertWidth.value.toLocaleString('en-US')}, and eight times that width is exactly the ${QWEN.ffnIntermediate.value.toLocaleString('en-US')} of the dense FFN. The token's feed-forward work is unchanged at ${MOE.activeFfnPerLayer.value.toLocaleString('en-US')} parameters. The layer stores ${MOE.storedFfnPerLayer.value.toLocaleString('en-US')}, eight times as many.`,
      'pt-br': `O Qwen3.8-27B não é assim; a divisão é o contra-factual da aula sobre a forma publicada. Um token executa oito especialistas de ${MOE.expertWidth.value.toLocaleString('pt-BR')}, e oito vezes essa largura é exatamente os ${QWEN.ffnIntermediate.value.toLocaleString('pt-BR')} do FFN denso. O trabalho do token não muda: ${MOE.activeFfnPerLayer.value.toLocaleString('pt-BR')} parâmetros. A camada armazena ${MOE.storedFfnPerLayer.value.toLocaleString('pt-BR')}, oito vezes mais.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Dense FFN, one layer', 'pt-br': 'FFN denso, uma camada' },
          detail: {
            en: `3 × ${QWEN.hiddenSize.value.toLocaleString('en-US')} × ${QWEN.ffnIntermediate.value.toLocaleString('en-US')} = ${millions(MOE.denseFfnPerLayer.value, 'en')}M, all used`,
            'pt-br': `3 × ${QWEN.hiddenSize.value.toLocaleString('pt-BR')} × ${QWEN.ffnIntermediate.value.toLocaleString('pt-BR')} = ${millions(MOE.denseFfnPerLayer.value, 'pt-br')} M, todo usado`,
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Cut into 64 experts', 'pt-br': 'Cortado em 64 experts' },
          detail: {
            en: `3 × ${QWEN.hiddenSize.value.toLocaleString('en-US')} × ${MOE.expertWidth.value.toLocaleString('en-US')} = ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'en')}M each`,
            'pt-br': `3 × ${QWEN.hiddenSize.value.toLocaleString('pt-BR')} × ${MOE.expertWidth.value.toLocaleString('pt-BR')} = ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'pt-br')} M cada`,
          },
          pigment: 'caution',
        },
        {
          label: { en: 'Stored in the layer', 'pt-br': 'Armazenado na camada' },
          detail: {
            en: `64 × ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'en')}M = ${millions(MOE.storedFfnPerLayer.value, 'en')}M`,
            'pt-br': `64 × ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'pt-br')} M = ${millions(MOE.storedFfnPerLayer.value, 'pt-br')} M`,
          },
          pigment: 'danger',
        },
        {
          label: { en: 'Run by one token', 'pt-br': 'Executado por um token' },
          detail: {
            en: `8 × ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'en')}M = ${millions(MOE.activeFfnPerLayer.value, 'en')}M`,
            'pt-br': `8 × ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'pt-br')} M = ${millions(MOE.activeFfnPerLayer.value, 'pt-br')} M`,
          },
          pigment: 'success',
        },
      ],
    },
  },

  'moe-router-weights': {
    lesson: '4.18-mixture-of-experts',
    title: { en: 'A confident router under three gates', 'pt-br': 'Um router confiante sob três gates' },
    caption: {
      en: 'One token, the second expert fixed at logit 3.2, the horizontal axis pulling the top expert away from it. Softmax compares the two and hands the top expert almost all the weight. Sigmoid has already saturated at both logits, so even a confident router gives its top two nearly equal shares. sqrt(softplus) sits between them. Every point comes from the same router arithmetic the lesson uses.',
      'pt-br': 'Um token, o segundo especialista fixo no logit 3,2, e o eixo horizontal afastando o primeiro dele. O softmax compara os dois e entrega quase todo o peso ao primeiro. O sigmoid já saturou nos dois logits, então mesmo um router confiante dá aos dois primeiros pesos quase iguais. O sqrt(softplus) fica entre eles. Cada ponto é calculado pela aritmética de src/lib/moe-math.ts.',
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Margin between the top two logits', 'pt-br': 'Margem entre os dois logits maiores' },
        scale: 'linear',
        min: 0,
        max: 8,
      },
      yAxis: {
        label: { en: 'Top expert’s share of the pair', 'pt-br': 'Fatia do primeiro especialista no par' },
        scale: 'linear',
        min: 0.4,
        max: 1.05,
      },
      series: [
        gateSeries('softmax', 'softmax', 'accent'),
        gateSeries('sqrtsoftplus', 'sqrt(softplus)', 'muted'),
        gateSeries('sigmoid', 'sigmoid', 'caution'),
      ],
    },
  },
} as const satisfies Record<string, Figure>
