/**
 * Figures for track 4 — The Transformer.
 *
 * Every number comes from `~/lib/model-facts`. The projection widths in
 * particular are NON-SQUARE on purpose: 24 heads × 256 = 6144, which is not the
 * 5120 hidden size. That mismatch is the entire point of lesson 4.2 and must
 * never be "corrected".
 */
import { formatNumber } from '~/lib/i18n'
import { MOE, QWEN } from '~/lib/model-facts'
import { mixtureWeights, type GateFunction } from '~/lib/moe-math'
import { maskAndRenormalise, millions } from './geometry'
import type { Figure, FigurePigment, Localised } from './types'

/** Format a numeric fact with locale-appropriate separators. */
const both = (value: number): Localised => ({ en: formatNumber('en', value), 'pt-br': formatNumber('pt-br', value) })

/** Format billions with two decimals and locale decimal separator. */
const billions = (value: number, locale: 'en' | 'pt-br'): string => {
  const text = (value / 1e9).toFixed(2)
  return locale === 'pt-br' ? text.replace('.', ',') : text
}

/** 4.3: softmax probabilities for the three-key worked example. */
const softmaxProbs = (logits: readonly number[]): number[] => {
  const peak = Math.max(...logits)
  const exps = logits.map((value) => Math.exp(value - peak))
  const total = exps.reduce((sum, value) => sum + value, 0)
  return exps.map((value) => Number((value / total).toFixed(4)))
}

const SQRT_HEAD_DIM = Math.sqrt(QWEN.headDim.value)
const BASE_SCORES = [0.5, 0.25, 0] as const
const UNSCALED_SCORES = BASE_SCORES.map((score) => score * SQRT_HEAD_DIM)
const BASE_PROBS = softmaxProbs(BASE_SCORES)
const UNSCALED_PROBS = softmaxProbs(UNSCALED_SCORES)

const scalingAxes = {
  xAxis: {
    label: { en: 'Key rank (1 = best match, 3 = weakest)', 'pt-br': 'Posição da key (1 = melhor encaixe, 3 = mais fraco)' },
    scale: 'linear',
    min: 1,
    max: 3,
  },
  yAxis: {
    label: { en: 'Attention weight after softmax', 'pt-br': 'Peso de attention depois do softmax' },
    scale: 'linear',
    min: 0,
    max: 1,
  },
} as const

const baseScalingSeries = {
  label: { en: 'Small scale [0.5, 0.25, 0]', 'pt-br': 'Escala pequena [0,5; 0,25; 0]' },
  points: BASE_PROBS.map((prob, index) => [index + 1, prob] as const),
} as const

/** 4.6: sinusoidal position values for d_model = 4 over positions 0..10. */
const SIN_POSITIONS = Array.from({ length: 11 }, (_, pos) => pos)
const sinSeries = (freq: number) => SIN_POSITIONS.map((pos) => [pos, Number(Math.sin(pos * freq).toFixed(4))] as const)

/** 4.8: ALiBi biased logits for equal content score 2.0 across distances 0..8. */
const ALIBI_DISTANCES = [0, 1, 2, 4, 6, 8] as const
const alibiSeries = (slope: number) =>
  ALIBI_DISTANCES.map((dist) => [dist, Number((2 - slope * dist).toFixed(4))] as const)

/** 4.9 / 4.13: exact untied embedding + lm_head count and single FFN matrix size. */
const FFN_MATRIX_PARAMS = QWEN.hiddenSize.value * QWEN.ffnIntermediate.value
const EMBED_AND_HEAD_PARAMS = 2 * QWEN.vocabSize.value * QWEN.hiddenSize.value
const MIXERS_AND_VISION_PARAMS = QWEN.paramsTotal.value - MOE.denseFfnTotal.value - EMBED_AND_HEAD_PARAMS
const GQA_GROUP_SIZE = QWEN.queryHeads.value / QWEN.kvHeads.value
const ROPE_ROTATED_DIMS = QWEN.headDim.value * 0.25
const ROPE_UNROTATED_DIMS = QWEN.headDim.value - ROPE_ROTATED_DIMS
const ROPE_PAIRS = ROPE_ROTATED_DIMS / 2
const DELTANET_MOTIF = QWEN.deltaNetLayers.value / QWEN.attentionLayers.value
const KV_CACHE_MIB = QWEN.kvGibFullContext.value * 1024

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

  't4-rnn-vs-attention': {
    lesson: '4.1-attention-is-all-you-need-in-context',
    title: { en: 'Sequential chain versus direct edges (4 tokens)', 'pt-br': 'Cadeia sequencial contra arestas diretas (4 tokens)' },
    caption: {
      en: 'An RNN steps through a four-token sequence one handoff at a time; attention forms all 4 × 4 = 16 pairwise scores in one parallel matrix multiplication, trading sequential depth for quadratic pairwise work.',
      'pt-br': 'Uma RNN percorre uma sequência de quatro tokens um repasse por vez; attention forma todas as 4 × 4 = 16 pontuações por pares numa multiplicação de matrizes paralela, trocando profundidade sequencial por trabalho quadrático por pares.',
    },
    steps: [
      {
        label: { en: 'RNN: 3 sequential handoffs', 'pt-br': 'RNN: 3 repasses sequenciais' },
        caption: {
          en: 'Before token 4 is processed, the hidden state must pass through three strictly ordered updates. Information from token 1 reaches token 4 only by surviving all three handoffs.',
          'pt-br': 'Antes que o token 4 seja processado, o estado oculto precisa passar por três atualizações estritamente em ordem. A informação do token 1 só chega ao token 4 sobrevivendo a todos os três repasses.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Token 1', 'pt-br': 'Token 1' }, detail: { en: 'builds state 1', 'pt-br': 'monta o estado 1' }, pigment: 'muted' },
            { label: { en: 'Token 2', 'pt-br': 'Token 2' }, detail: { en: 'waits for state 1', 'pt-br': 'espera o estado 1' }, pigment: 'caution' },
            { label: { en: 'Token 3', 'pt-br': 'Token 3' }, detail: { en: 'waits for state 2', 'pt-br': 'espera o estado 2' }, pigment: 'caution' },
            { label: { en: 'Token 4', 'pt-br': 'Token 4' }, detail: { en: '3 handoffs from token 1', 'pt-br': '3 repasses desde o token 1' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Attention: 1 parallel step', 'pt-br': 'Attention: 1 passo paralelo' },
        caption: {
          en: 'All four positions score every allowed partner together in one matrix multiplication (4 × 4 = 16 pairs). Token 1 connects to token 4 in a single direct edge, at the cost of n² pairwise work.',
          'pt-br': 'Todas as quatro posições pontuam cada parceiro permitido juntas numa única multiplicação de matrizes (4 × 4 = 16 pares). O token 1 liga-se ao token 4 numa única aresta direta, ao custo de trabalho quadrático n².',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'All 4 tokens', 'pt-br': 'Todos os 4 tokens' }, detail: { en: 'read together in parallel', 'pt-br': 'lidos juntos em paralelo' }, pigment: 'accent' },
            { label: { en: 'Pairwise score matrix', 'pt-br': 'Matriz de scores por pares' }, detail: { en: '4 × 4 = 16 scores in 1 step', 'pt-br': '4 × 4 = 16 scores em 1 passo' }, pigment: 'accent' },
            { label: { en: 'Direct edge (1 → 4)', 'pt-br': 'Aresta direta (1 → 4)' }, detail: { en: '1 hop, no sequential wait', 'pt-br': '1 salto, sem espera sequencial' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't4-sqrt-dk-scaling': {
    lesson: '4.3-scaled-dot-product-attention',
    title: { en: 'How head width saturates softmax, and √256 restores it', 'pt-br': 'Como a largura do head satura o softmax, e √256 o restaura' },
    caption: {
      en: `The same mild three-key preference before and after scaling in Qwen3.8-27B (head dimension ${QWEN.headDim.value}, divisor √${QWEN.headDim.value} = ${SQRT_HEAD_DIM}). Without the divisor, width alone inflates scores by ${SQRT_HEAD_DIM} and collapses softmax onto key 1.`,
      'pt-br': `A mesma preferência suave entre três keys antes e depois da escala no Qwen3.8-27B (dimensão de head ${QWEN.headDim.value}, divisor √${QWEN.headDim.value} = ${SQRT_HEAD_DIM}). Sem o divisor, a largura sozinha infla os scores em ${SQRT_HEAD_DIM} e colapsa o softmax na key 1.`,
    },
    steps: [
      {
        label: { en: 'Small scale [0.5, 0.25, 0]', 'pt-br': 'Escala pequena [0,5; 0,25; 0]' },
        caption: {
          en: `Softmax spreads meaningful weight across all three keys (${BASE_PROBS[0]}, ${BASE_PROBS[1]}, ${BASE_PROBS[2]}), so gradients stay active during training.`,
          'pt-br': `O softmax distribui peso significativo pelas três keys (${String(BASE_PROBS[0]).replace('.', ',')}; ${String(BASE_PROBS[1]).replace('.', ',')}; ${String(BASE_PROBS[2]).replace('.', ',')}), mantendo os gradientes ativos no treino.`,
        },
        body: { kind: 'plot', ...scalingAxes, series: [{ ...baseScalingSeries, pigment: 'accent' }] },
      },
      {
        label: { en: `Unscaled d_k = ${QWEN.headDim.value} (×${SQRT_HEAD_DIM})`, 'pt-br': `Sem escala d_k = ${QWEN.headDim.value} (×${SQRT_HEAD_DIM})` },
        caption: {
          en: `Inflating the same pattern by ${SQRT_HEAD_DIM} gives [8, 4, 0]. Softmax puts ${(UNSCALED_PROBS[0]! * 100).toFixed(1)}% of the weight on key 1 and starves the other two keys, saturating gradients.`,
          'pt-br': `Inflar o mesmo padrão em ${SQRT_HEAD_DIM} dá [8, 4, 0]. O softmax coloca ${(UNSCALED_PROBS[0]! * 100).toFixed(1).replace('.', ',')}% do peso na key 1 e zera quase todo o resto, saturando os gradientes.`,
        },
        body: {
          kind: 'plot',
          ...scalingAxes,
          series: [
            { ...baseScalingSeries, pigment: 'muted' },
            {
              label: { en: 'Unscaled [8, 4, 0]', 'pt-br': 'Sem escala [8, 4, 0]' },
              pigment: 'danger',
              points: UNSCALED_PROBS.map((prob, index) => [index + 1, prob] as const),
            },
          ],
        },
      },
      {
        label: { en: `Divided by √${QWEN.headDim.value} = ${SQRT_HEAD_DIM}`, 'pt-br': `Dividido por √${QWEN.headDim.value} = ${SQRT_HEAD_DIM}` },
        caption: {
          en: `Dividing [8, 4, 0] by ${SQRT_HEAD_DIM} returns the scores to [0.5, 0.25, 0] and restores the exact trainable distribution.`,
          'pt-br': `Dividir [8, 4, 0] por ${SQRT_HEAD_DIM} devolve os scores a [0,5; 0,25; 0] e restaura exatamente a distribuição treinável.`,
        },
        body: {
          kind: 'plot',
          ...scalingAxes,
          series: [
            {
              label: { en: 'Unscaled [8, 4, 0]', 'pt-br': 'Sem escala [8, 4, 0]' },
              pigment: 'muted',
              points: UNSCALED_PROBS.map((prob, index) => [index + 1, prob] as const),
            },
            {
              label: { en: `Scaled by 1/${SQRT_HEAD_DIM}`, 'pt-br': `Escalado por 1/${SQRT_HEAD_DIM}` },
              pigment: 'success',
              points: BASE_PROBS.map((prob, index) => [index + 1, prob] as const),
            },
          ],
        },
      },
    ],
  },

  't4-gqa-head-groups': {
    lesson: '4.5-multi-head-attention',
    title: { en: '24 query heads reading 4 shared KV heads', 'pt-br': '24 query heads lendo 4 KV heads compartilhados' },
    caption: {
      en: `Qwen3.8-27B's grouped-query attention splits ${QWEN.queryHeads.value} query heads into ${QWEN.kvHeads.value} groups of ${GQA_GROUP_SIZE}, then concatenates all ${QWEN.queryHeads.value} outputs and mixes them back to width ${QWEN.hiddenSize.value}.`,
      'pt-br': `A grouped-query attention do Qwen3.8-27B divide ${QWEN.queryHeads.value} query heads em ${QWEN.kvHeads.value} grupos de ${GQA_GROUP_SIZE}, depois concatena todas as ${QWEN.queryHeads.value} saídas e as mistura de volta à largura ${QWEN.hiddenSize.value}.`,
    },
    steps: [
      {
        label: { en: '1. Split & group (GQA)', 'pt-br': '1. Dividir e agrupar (GQA)' },
        caption: {
          en: `Queries expand to ${QWEN.queryHeads.value} × ${QWEN.headDim.value} = ${both(QWEN.queryStateWidth.value).en}; keys and values project to ${QWEN.kvHeads.value} × ${QWEN.headDim.value} = ${both(QWEN.kvProjectionOut.value).en}. Every group of ${GQA_GROUP_SIZE} query heads shares one cached KV head.`,
          'pt-br': `As queries expandem para ${QWEN.queryHeads.value} × ${QWEN.headDim.value} = ${both(QWEN.queryStateWidth.value)['pt-br']}; keys e values projetam para ${QWEN.kvHeads.value} × ${QWEN.headDim.value} = ${both(QWEN.kvProjectionOut.value)['pt-br']}. Cada grupo de ${GQA_GROUP_SIZE} query heads compartilha um KV head em cache.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Residual stream', 'pt-br': 'Residual stream (fluxo residual)' }, detail: { en: `${both(QWEN.hiddenSize.value).en} numbers per token`, 'pt-br': `${both(QWEN.hiddenSize.value)['pt-br']} números por token` }, pigment: 'muted' },
            { label: { en: `${QWEN.queryHeads.value} query heads`, 'pt-br': `${QWEN.queryHeads.value} query heads` }, detail: { en: `${both(QWEN.queryStateWidth.value).en} wide (${QWEN.headDim.value} each)`, 'pt-br': `largura ${both(QWEN.queryStateWidth.value)['pt-br']} (${QWEN.headDim.value} cada)` }, pigment: 'accent' },
            { label: { en: `${QWEN.kvHeads.value} shared KV heads`, 'pt-br': `${QWEN.kvHeads.value} KV heads compartilhados` }, detail: { en: `${both(QWEN.kvProjectionOut.value).en} wide (${GQA_GROUP_SIZE} Q heads per KV)`, 'pt-br': `largura ${both(QWEN.kvProjectionOut.value)['pt-br']} (${GQA_GROUP_SIZE} Q heads por KV)` }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: '2. Attend & mix back', 'pt-br': '2. Calcular attention e misturar' },
        caption: {
          en: `Each of the ${QWEN.queryHeads.value} heads runs scaled, causally masked softmax in its own ${QWEN.headDim.value}-dim subspace. Concatenation restores ${both(QWEN.queryStateWidth.value).en}, and W_O mixes across heads back to ${both(QWEN.hiddenSize.value).en}.`,
          'pt-br': `Cada um dos ${QWEN.queryHeads.value} heads roda softmax escalado com máscara causal no seu subespaço de ${QWEN.headDim.value} dimensões. A concatenação restaura ${both(QWEN.queryStateWidth.value)['pt-br']}, e W_O mistura entre heads de volta a ${both(QWEN.hiddenSize.value)['pt-br']}.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: `${QWEN.queryHeads.value} masked softmaxes`, 'pt-br': `${QWEN.queryHeads.value} softmaxes mascarados` }, detail: { en: `1 independent weight map per head`, 'pt-br': `1 mapa de pesos independente por head` }, pigment: 'accent' },
            { label: { en: 'Concatenate heads', 'pt-br': 'Concatenar os heads' }, detail: { en: `${QWEN.queryHeads.value} × ${QWEN.headDim.value} = ${both(QWEN.queryStateWidth.value).en}`, 'pt-br': `${QWEN.queryHeads.value} × ${QWEN.headDim.value} = ${both(QWEN.queryStateWidth.value)['pt-br']}` }, pigment: 'caution' },
            { label: { en: 'Output projection W_O', 'pt-br': 'Projeção de saída W_O' }, detail: { en: `${both(QWEN.queryStateWidth.value).en} → ${both(QWEN.hiddenSize.value).en} (cross-head mix)`, 'pt-br': `${both(QWEN.queryStateWidth.value)['pt-br']} → ${both(QWEN.hiddenSize.value)['pt-br']} (mistura entre heads)` }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't4-sinusoidal-clocks': {
    lesson: '4.6-positional-encoding-sinusoidal-learned',
    title: { en: 'Fast and slow sinusoidal clocks (d_model = 4)', 'pt-br': 'Relógios senoidais rápido e lento (d_model = 4)' },
    caption: {
      en: 'Sine entries for the 4-dimensional worked example across positions 0 to 10. Every entry stays bounded in [−1, 1]: the fast dimension (i = 0) swings rapidly to tell neighbors apart, while the slow dimension (i = 1) drifts gently to track long-range position.',
      'pt-br': 'Entradas de seno do exemplo de 4 dimensões entre as posições 0 e 10. Toda entrada permanece limitada em [−1, 1]: a dimensão rápida (i = 0) oscila depressa para distinguir vizinhos, enquanto a dimensão lenta (i = 1) varia devagar para acompanhar posições distantes.',
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Token position (pos)', 'pt-br': 'Posição do token (pos)' },
        scale: 'linear',
        min: 0,
        max: 10,
      },
      yAxis: {
        label: { en: 'Sinusoidal value', 'pt-br': 'Valor senoidal' },
        scale: 'linear',
        min: -1.1,
        max: 1.1,
      },
      series: [
        {
          label: { en: 'Fast clock i = 0: sin(pos)', 'pt-br': 'Relógio rápido i = 0: sin(pos)' },
          pigment: 'accent',
          points: sinSeries(1),
        },
        {
          label: { en: 'Slow clock i = 1: sin(pos / 100)', 'pt-br': 'Relógio lento i = 1: sin(pos / 100)' },
          pigment: 'caution',
          points: sinSeries(0.01),
        },
      ],
    },
  },

  't4-rope-qwen-partition': {
    lesson: '4.7-rope',
    title: { en: 'How Qwen3.8-27B partitions a 256-dim head for MRoPE', 'pt-br': 'Como o Qwen3.8-27B divide um head de 256 dimensões para o MRoPE' },
    caption: {
      en: `Only a quarter of each head (${ROPE_ROTATED_DIMS} of ${QWEN.headDim.value} dimensions, or ${ROPE_PAIRS} two-dimensional planes) receives direct rotary phase; those ${ROPE_PAIRS} planes are then dealt out across time, height and width.`,
      'pt-br': `Apenas um quarto de cada head (${ROPE_ROTATED_DIMS} das ${QWEN.headDim.value} dimensões, ou ${ROPE_PAIRS} planos bidimensionais) recebe fase rotativa direta; esses ${ROPE_PAIRS} planos são então repartidos entre tempo, altura e largura.`,
    },
    steps: [
      {
        label: { en: '1. Partial rotation (256 dims)', 'pt-br': '1. Rotação parcial (256 dims)' },
        caption: {
          en: `With partial_rotary_factor = 0.25, ${ROPE_ROTATED_DIMS} dimensions (${ROPE_PAIRS} pairs) rotate by position; the other ${ROPE_UNROTATED_DIMS} dimensions receive no direct RoPE rotation.`,
          'pt-br': `Com partial_rotary_factor = 0,25, ${ROPE_ROTATED_DIMS} dimensões (${ROPE_PAIRS} pares) giram conforme a posição; as outras ${ROPE_UNROTATED_DIMS} dimensões não recebem rotação direta pelo RoPE.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Unrotated by RoPE', 'pt-br': 'Sem rotação direta pelo RoPE' },
              detail: { en: `${ROPE_UNROTATED_DIMS} dimensions left for unrotated matching`, 'pt-br': `${ROPE_UNROTATED_DIMS} dimensões livres para casamento sem rotação` },
              pigment: 'muted',
              weight: ROPE_UNROTATED_DIMS,
            },
            {
              label: { en: 'Rotated by RoPE (base θ = 10,000,000)', 'pt-br': 'Rotacionadas pelo RoPE (base θ = 10.000.000)' },
              detail: { en: `${ROPE_ROTATED_DIMS} dimensions = ${ROPE_PAIRS} rotation planes`, 'pt-br': `${ROPE_ROTATED_DIMS} dimensões = ${ROPE_PAIRS} planos de rotação` },
              pigment: 'accent',
              weight: ROPE_ROTATED_DIMS,
            },
          ],
        },
      },
      {
        label: { en: '2. MRoPE sections (32 pairs)', 'pt-br': '2. Seções do MRoPE (32 pares)' },
        caption: {
          en: 'The 32 rotary planes are interleaved into three multimodal sections (11 + 11 + 10 = 32). For plain text, all three axes advance with the same token index.',
          'pt-br': 'Os 32 planos rotativos são intercalados em três seções multimodais (11 + 11 + 10 = 32). Em texto comum, os três eixos avançam juntos com o mesmo índice de token.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Temporal axis (frame)', 'pt-br': 'Eixo temporal (frame)' }, detail: { en: '11 frequency pairs', 'pt-br': '11 pares de frequência' }, pigment: 'accent', weight: 11 },
            { label: { en: 'Height axis (row)', 'pt-br': 'Eixo de altura (linha)' }, detail: { en: '11 frequency pairs', 'pt-br': '11 pares de frequência' }, pigment: 'caution', weight: 11 },
            { label: { en: 'Width axis (column)', 'pt-br': 'Eixo de largura (coluna)' }, detail: { en: '10 frequency pairs', 'pt-br': '10 pares de frequência' }, pigment: 'success', weight: 10 },
          ],
        },
      },
    ],
  },

  't4-alibi-slope-penalty': {
    lesson: '4.8-alibi-relative-bias',
    title: { en: 'ALiBi distance toll: steep local head versus shallow long-range head', 'pt-br': 'Pedágio de distância do ALiBi: head local contra head de longo alcance' },
    caption: {
      en: 'Biased logit 2.0 − m(i − j) when every key has the same content score of 2.0. The steep head (m = 0.5) penalizes distance sharply, while the shallow head (m = 0.0625) keeps distant keys accessible.',
      'pt-br': 'Logit enviesado 2,0 − m(i − j) quando todas as keys têm o mesmo score de conteúdo 2,0. O head de inclinação acentuada (m = 0,5) penaliza fortemente a distância, enquanto o suave (m = 0,0625) mantém keys distantes acessíveis.',
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Distance into the past (i − j tokens)', 'pt-br': 'Distância para o passado (i − j tokens)' },
        scale: 'linear',
        min: 0,
        max: 8,
      },
      yAxis: {
        label: { en: 'Biased attention logit', 'pt-br': 'Logit de attention enviesado' },
        scale: 'linear',
        min: -2.5,
        max: 2.5,
      },
      series: [
        {
          label: { en: 'Content score alone (2.0)', 'pt-br': 'Apenas score de conteúdo (2,0)' },
          pigment: 'muted',
          points: [[0, 2], [8, 2]],
        },
        {
          label: { en: 'Shallow head (m = 0.0625)', 'pt-br': 'Head suave (m = 0,0625)' },
          pigment: 'accent',
          points: alibiSeries(0.0625),
        },
        {
          label: { en: 'Steep head (m = 0.5)', 'pt-br': 'Head acentuado (m = 0,5)' },
          pigment: 'danger',
          points: alibiSeries(0.5),
        },
      ],
    },
  },

  't4-qwen-ffn-budget': {
    lesson: '4.9-feed-forward-block',
    title: { en: 'Three matrices per layer, 17 billion across the model', 'pt-br': 'Três matrizes por camada, 17 bilhões no modelo inteiro' },
    caption: {
      en: `Qwen3.8-27B's SiLU-gated FFN uses three ${both(QWEN.hiddenSize.value).en} × ${both(QWEN.ffnIntermediate.value).en} matrices per layer (${millions(MOE.denseFfnPerLayer.value, 'en')}M), making the 64 FFNs the largest share of the ~27B parameters.`,
      'pt-br': `A FFN com gate SiLU do Qwen3.8-27B usa três matrizes ${both(QWEN.hiddenSize.value)['pt-br']} × ${both(QWEN.ffnIntermediate.value)['pt-br']} por camada (${millions(MOE.denseFfnPerLayer.value, 'pt-br')} M), tornando as 64 FFNs a maior fatia dos ~27B parâmetros.`,
    },
    steps: [
      {
        label: { en: '1. One layer’s gated FFN', 'pt-br': '1. FFN gated de uma camada' },
        caption: {
          en: `Counting only two matrices misses the gate. Gate, up and down each hold ${millions(FFN_MATRIX_PARAMS, 'en')}M parameters, totaling ${millions(MOE.denseFfnPerLayer.value, 'en')}M per layer.`,
          'pt-br': `Contar só duas matrizes esquece o gate. Gate, up e down guardam ${millions(FFN_MATRIX_PARAMS, 'pt-br')} M de parâmetros cada, totalizando ${millions(MOE.denseFfnPerLayer.value, 'pt-br')} M por camada.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'W_gate (5,120 → 17,408)', 'pt-br': 'W_gate (5.120 → 17.408)' }, detail: { en: `${millions(FFN_MATRIX_PARAMS, 'en')}M parameters · enters SiLU`, 'pt-br': `${millions(FFN_MATRIX_PARAMS, 'pt-br')} M parâmetros · entra na SiLU` }, pigment: 'caution', weight: FFN_MATRIX_PARAMS },
            { label: { en: 'W_up (5,120 → 17,408)', 'pt-br': 'W_up (5.120 → 17.408)' }, detail: { en: `${millions(FFN_MATRIX_PARAMS, 'en')}M parameters · proposes features`, 'pt-br': `${millions(FFN_MATRIX_PARAMS, 'pt-br')} M parâmetros · propõe features` }, pigment: 'accent', weight: FFN_MATRIX_PARAMS },
            { label: { en: 'W_down (17,408 → 5,120)', 'pt-br': 'W_down (17.408 → 5.120)' }, detail: { en: `${millions(FFN_MATRIX_PARAMS, 'en')}M parameters · writes back to stream`, 'pt-br': `${millions(FFN_MATRIX_PARAMS, 'pt-br')} M parâmetros · escreve no stream` }, pigment: 'success', weight: FFN_MATRIX_PARAMS },
          ],
        },
      },
      {
        label: { en: '2. Whole 27B model', 'pt-br': '2. Modelo de 27B inteiro' },
        caption: {
          en: `Across all ${QWEN.layers.value} layers, the dense FFNs hold ${billions(MOE.denseFfnTotal.value, 'en')}B parameters — over three fifths of the ~27B model.`,
          'pt-br': `Ao longo das ${QWEN.layers.value} camadas, as FFNs densas guardam ${billions(MOE.denseFfnTotal.value, 'pt-br')}B parâmetros — mais de três quintos do modelo de ~27B.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: `${QWEN.layers.value} gated FFNs`, 'pt-br': `${QWEN.layers.value} FFNs gated` }, detail: { en: `${billions(MOE.denseFfnTotal.value, 'en')}B parameters`, 'pt-br': `${billions(MOE.denseFfnTotal.value, 'pt-br')}B parâmetros` }, pigment: 'accent', weight: MOE.denseFfnTotal.value },
            { label: { en: 'Everything else (mixers, embeddings, lm_head, vision)', 'pt-br': 'Todo o resto (mixers, embeddings, lm_head, visão)' }, detail: { en: `~${billions(MOE.nonExpertParams.value, 'en')}B parameters`, 'pt-br': `~${billions(MOE.nonExpertParams.value, 'pt-br')}B parâmetros` }, pigment: 'muted', weight: MOE.nonExpertParams.value },
          ],
        },
      },
    ],
  },

  't4-prenorm-vs-postnorm': {
    lesson: '4.10-residuals-pre-norm-post-norm',
    title: { en: 'Where normalization sits changes the highway', 'pt-br': 'Onde a normalização fica muda a via principal' },
    caption: {
      en: 'Post-norm places normalization directly on the residual highway; pre-norm calibrates only the copy entering each sublayer, leaving the main path a bare chain of additions.',
      'pt-br': 'Post-norm coloca a normalização direto na via residual principal; pre-norm calibra apenas a cópia que entra em cada subcamada, deixando o caminho principal como uma cadeia nua de somas.',
    },
    steps: [
      {
        label: { en: 'Post-norm (2017)', 'pt-br': 'Post-norm (Transformer de 2017)' },
        caption: {
          en: 'x′ = Norm(x + F(x)). Normalization sits on the main path, so in a 64-layer stack backward gradients must cross 128 sublayer norms.',
          'pt-br': 'x′ = Norm(x + F(x)). A normalização fica no caminho principal, então numa pilha de 64 camadas os gradientes na volta atravessam 128 normalizações de subcamada.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Stream x', 'pt-br': 'Stream x' }, detail: { en: 'enters unnormalized', 'pt-br': 'entra sem normalizar' }, pigment: 'muted' },
            { label: { en: 'Sublayer F(x)', 'pt-br': 'Subcamada F(x)' }, detail: { en: 'computes update', 'pt-br': 'calcula atualização' }, pigment: 'accent' },
            { label: { en: 'Add x + F(x)', 'pt-br': 'Soma x + F(x)' }, detail: { en: 'combines stream and update', 'pt-br': 'combina stream e atualização' }, pigment: 'accent' },
            { label: { en: 'Norm on main path', 'pt-br': 'Norm no caminho principal' }, detail: { en: 'renormalizes the highway itself', 'pt-br': 'renormaliza a própria via principal' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Pre-norm (Qwen3.8-27B)', 'pt-br': 'Pre-norm (usado no Qwen3.8-27B)' },
        caption: {
          en: 'x′ = x + F(RMSNorm(x)). RMSNorm (ε = 10⁻⁶) calibrates a side copy for the sublayer, while x stays untouched on the identity highway.',
          'pt-br': 'x′ = x + F(RMSNorm(x)). O RMSNorm (ε = 10⁻⁶) calibra uma cópia lateral para a subcamada, enquanto x segue intocado na via identidade.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Stream x (untouched)', 'pt-br': 'Stream x (intocado)' }, detail: { en: 'identity highway stays bare', 'pt-br': 'via identidade segue limpa' }, pigment: 'success' },
            { label: { en: 'Side copy → RMSNorm', 'pt-br': 'Cópia lateral → RMSNorm' }, detail: { en: 'calibrated reader copy (ε = 10⁻⁶)', 'pt-br': 'cópia calibrada para leitura (ε = 10⁻⁶)' }, pigment: 'caution' },
            { label: { en: 'Sublayer F(Norm(x))', 'pt-br': 'Subcamada F(Norm(x))' }, detail: { en: 'mixer or gated FFN', 'pt-br': 'mixer ou FFN gated' }, pigment: 'accent' },
            { label: { en: 'Add onto x', 'pt-br': 'Somar em x' }, detail: { en: 'update joins bare stream', 'pt-br': 'atualização entra no stream limpo' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't4-qwen-two-blocks': {
    lesson: '4.11-full-transformer-block',
    title: { en: 'One 5,120-wide contract, two swappable mixers', 'pt-br': 'Um contrato de largura 5.120, dois mixers intercambiáveis' },
    caption: {
      en: `Every layer of Qwen3.8-27B shares the same pre-norm RMSNorm, residual additions, and gated FFN (${both(QWEN.hiddenSize.value).en} → ${both(QWEN.ffnIntermediate.value).en} → ${both(QWEN.hiddenSize.value).en}). Only the token-mixing stage swaps between Attention (${QWEN.attentionLayers.value} layers) and Gated DeltaNet (${QWEN.deltaNetLayers.value} layers).`,
      'pt-br': `Toda camada do Qwen3.8-27B compartilha o mesmo RMSNorm em pre-norm, as mesmas somas residuais e a mesma FFN gated (${both(QWEN.hiddenSize.value)['pt-br']} → ${both(QWEN.ffnIntermediate.value)['pt-br']} → ${both(QWEN.hiddenSize.value)['pt-br']}). Só o estágio de mistura entre tokens troca entre Attention (${QWEN.attentionLayers.value} camadas) e Gated DeltaNet (${QWEN.deltaNetLayers.value} camadas).`,
    },
    steps: [
      {
        label: { en: `Attention block (${QWEN.attentionLayers.value} layers)`, 'pt-br': `Bloco Attention (${QWEN.attentionLayers.value} camadas)` },
        caption: {
          en: `Appears every fourth layer: ${QWEN.queryHeads.value} query heads (q_proj ${both(QWEN.hiddenSize.value).en} → ${both(QWEN.qProjectionOut.value).en}), ${QWEN.kvHeads.value} KV heads (${both(QWEN.kvProjectionOut.value).en}), RoPE on ${ROPE_ROTATED_DIMS} dims, o_proj ${both(QWEN.queryStateWidth.value).en} → ${both(QWEN.hiddenSize.value).en}.`,
          'pt-br': `Aparece a cada quarta camada: ${QWEN.queryHeads.value} query heads (q_proj ${both(QWEN.hiddenSize.value)['pt-br']} → ${both(QWEN.qProjectionOut.value)['pt-br']}), ${QWEN.kvHeads.value} KV heads (${both(QWEN.kvProjectionOut.value)['pt-br']}), RoPE em ${ROPE_ROTATED_DIMS} dims, o_proj ${both(QWEN.queryStateWidth.value)['pt-br']} → ${both(QWEN.hiddenSize.value)['pt-br']}.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Stream x', 'pt-br': 'Stream x' }, detail: { en: `B × T × ${QWEN.hiddenSize.value}`, 'pt-br': `B × T × ${QWEN.hiddenSize.value}` }, pigment: 'muted' },
            { label: { en: 'RMSNorm', 'pt-br': 'RMSNorm' }, detail: { en: 'pre-norm (ε = 10⁻⁶)', 'pt-br': 'pre-norm (ε = 10⁻⁶)' }, pigment: 'muted' },
            { label: { en: 'Gated Attention', 'pt-br': 'Gated Attention (com porta)' }, detail: { en: `${QWEN.queryHeads.value}Q / ${QWEN.kvHeads.value}KV · grows KV cache`, 'pt-br': `${QWEN.queryHeads.value}Q / ${QWEN.kvHeads.value}KV · cresce KV cache` }, pigment: 'danger' },
            { label: { en: '+ Residual', 'pt-br': '+ Residual' }, detail: { en: `returns to width ${QWEN.hiddenSize.value}`, 'pt-br': `volta à largura ${QWEN.hiddenSize.value}` }, pigment: 'muted' },
            { label: { en: 'RMSNorm → Gated FFN', 'pt-br': 'RMSNorm → FFN gated' }, detail: { en: `${QWEN.hiddenSize.value} → ${QWEN.ffnIntermediate.value} → ${QWEN.hiddenSize.value}`, 'pt-br': `${QWEN.hiddenSize.value} → ${QWEN.ffnIntermediate.value} → ${QWEN.hiddenSize.value}` }, pigment: 'accent' },
            { label: { en: '+ Residual', 'pt-br': '+ Residual' }, detail: { en: `B × T × ${QWEN.hiddenSize.value}`, 'pt-br': `B × T × ${QWEN.hiddenSize.value}` }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: `DeltaNet block (${QWEN.deltaNetLayers.value} layers)`, 'pt-br': `Bloco DeltaNet (${QWEN.deltaNetLayers.value} camadas)` },
        caption: {
          en: 'Fills three of every four layers: swaps only the mixer to a fixed-size recurrent matrix state, keeping the exact same norms, residual additions, and gated FFN.',
          'pt-br': 'Ocupa três de cada quatro camadas: troca apenas o mixer por um estado matricial recorrente de tamanho fixo, mantendo exatamente as mesmas norms, somas residuais e FFN gated.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Stream x', 'pt-br': 'Stream x' }, detail: { en: `B × T × ${QWEN.hiddenSize.value}`, 'pt-br': `B × T × ${QWEN.hiddenSize.value}` }, pigment: 'muted' },
            { label: { en: 'RMSNorm', 'pt-br': 'RMSNorm' }, detail: { en: 'identical pre-norm', 'pt-br': 'pre-norm idêntico' }, pigment: 'muted' },
            { label: { en: 'Gated DeltaNet', 'pt-br': 'Gated DeltaNet (estado fixo)' }, detail: { en: 'fixed matrix state · no T×T scores', 'pt-br': 'estado matricial fixo · sem matriz T×T' }, pigment: 'caution' },
            { label: { en: '+ Residual', 'pt-br': '+ Residual' }, detail: { en: `returns to width ${QWEN.hiddenSize.value}`, 'pt-br': `volta à largura ${QWEN.hiddenSize.value}` }, pigment: 'muted' },
            { label: { en: 'RMSNorm → Gated FFN', 'pt-br': 'RMSNorm → FFN gated' }, detail: { en: 'identical 267M-param FFN', 'pt-br': 'FFN idêntica de 267M parâmetros' }, pigment: 'accent' },
            { label: { en: '+ Residual', 'pt-br': '+ Residual' }, detail: { en: `B × T × ${QWEN.hiddenSize.value}`, 'pt-br': `B × T × ${QWEN.hiddenSize.value}` }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't4-families-and-qwen': {
    lesson: '4.12-transformer-families',
    title: { en: 'Classic families, and Qwen3.8-27B on four independent axes', 'pt-br': 'Famílias clássicas e o Qwen3.8-27B em quatro eixos independentes' },
    caption: {
      en: 'Visibility (step 1) separates encoder-only, decoder-only and encoder–decoder models. Modern releases add sparsity, mixer and modality axes (step 2), where Qwen3.8-27B is dense rather than MoE.',
      'pt-br': 'A visibilidade (etapa 1) separa modelos encoder-only, decoder-only e encoder–decoder. Lançamentos modernos somam os eixos de esparsidade, mixer e modalidade (etapa 2), nos quais o Qwen3.8-27B é denso e não MoE.',
    },
    steps: [
      {
        label: { en: '1. Classic visibility families', 'pt-br': '1. Famílias clássicas de visibilidade' },
        caption: {
          en: 'Each classic family pairs a visibility mask with a matching training objective.',
          'pt-br': 'Cada família clássica combina uma máscara de visibilidade com um objetivo de treino correspondente.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Encoder-only (BERT)', 'pt-br': 'Só encoder (BERT)' }, detail: { en: 'bidirectional mask · reconstruct masked tokens', 'pt-br': 'máscara bidirecional · reconstruir tokens mascarados' }, pigment: 'muted' },
            { label: { en: 'Decoder-only (GPT)', 'pt-br': 'Só decoder (GPT)' }, detail: { en: 'lower-triangular mask · next-token prediction', 'pt-br': 'máscara triangular inferior · próximo token' }, pigment: 'accent' },
            { label: { en: 'Encoder–decoder (T5)', 'pt-br': 'Encoder e decoder (T5)' }, detail: { en: 'bidirectional source + causal target + cross-attention', 'pt-br': 'fonte bidirecional + alvo causal + cross-attention' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: '2. Classifying Qwen3.8-27B', 'pt-br': '2. Classificando o Qwen3.8-27B' },
        caption: {
          en: 'Four independent questions yield one exact label: a dense, multimodal, decoder-only hybrid.',
          'pt-br': 'Quatro perguntas independentes geram um rótulo exato: um híbrido decoder-only, denso e multimodal.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Visibility: Decoder-only', 'pt-br': 'Visibilidade: Decoder-only' }, detail: { en: 'one causal stack, next-token prediction', 'pt-br': 'uma pilha causal, predição do próximo token' }, pigment: 'accent' },
            { label: { en: 'Sparsity: Dense (not MoE)', 'pt-br': 'Esparsidade: Denso (não MoE)' }, detail: { en: 'no router; every token runs every FFN', 'pt-br': 'sem router; todo token passa por toda FFN' }, pigment: 'danger' },
            { label: { en: 'Mixer: Hybrid (3:1)', 'pt-br': 'Mixer: Híbrido (3:1)' }, detail: { en: `${QWEN.deltaNetLayers.value} DeltaNet + ${QWEN.attentionLayers.value} Attention layers`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas DeltaNet + ${QWEN.attentionLayers.value} Attention` }, pigment: 'caution' },
            { label: { en: 'Modality: Multimodal in', 'pt-br': 'Modalidade: Multimodal na entrada' }, detail: { en: 'vision encoder projects into the 5,120 stream', 'pt-br': 'vision encoder projeta no stream de 5.120' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't4-parameter-ladder': {
    lesson: '4.13-build-gpt-from-scratch',
    title: { en: 'Where Qwen3.8-27B’s ~27 billion parameters sit', 'pt-br': 'Onde ficam os ~27 bilhões de parâmetros do Qwen3.8-27B' },
    caption: {
      en: `Climbing from the sub-million-parameter MiniGPT toy to Qwen3.8-27B uses the exact same rows × columns arithmetic. The ${QWEN.layers.value} gated FFNs take ${billions(MOE.denseFfnTotal.value, 'en')}B, and untied embeddings plus lm_head add ${billions(EMBED_AND_HEAD_PARAMS, 'en')}B.`,
      'pt-br': `Subir do MiniGPT de brinquedo (menos de um milhão de parâmetros) até o Qwen3.8-27B usa a mesma conta de linhas × colunas. As ${QWEN.layers.value} FFNs gated ocupam ${billions(MOE.denseFfnTotal.value, 'pt-br')}B, e embeddings mais lm_head não amarrados somam ${billions(EMBED_AND_HEAD_PARAMS, 'pt-br')}B.`,
    },
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        {
          label: { en: `${QWEN.layers.value} gated FFNs`, 'pt-br': `${QWEN.layers.value} FFNs gated` },
          detail: { en: `${billions(MOE.denseFfnTotal.value, 'en')}B · ${millions(MOE.denseFfnPerLayer.value, 'en')}M per layer`, 'pt-br': `${billions(MOE.denseFfnTotal.value, 'pt-br')}B · ${millions(MOE.denseFfnPerLayer.value, 'pt-br')} M por camada` },
          pigment: 'accent',
          weight: MOE.denseFfnTotal.value,
        },
        {
          label: { en: 'Mixers & vision tower', 'pt-br': 'Mixers e torre de visão' },
          detail: { en: `~${billions(MIXERS_AND_VISION_PARAMS, 'en')}B · ${QWEN.attentionLayers.value} attention + ${QWEN.deltaNetLayers.value} DeltaNet + vision`, 'pt-br': `~${billions(MIXERS_AND_VISION_PARAMS, 'pt-br')}B · ${QWEN.attentionLayers.value} attention + ${QWEN.deltaNetLayers.value} DeltaNet + visão` },
          pigment: 'caution',
          weight: MIXERS_AND_VISION_PARAMS,
        },
        {
          label: { en: 'Untied embed_tokens + lm_head', 'pt-br': 'embed_tokens + lm_head não amarrados' },
          detail: { en: `${billions(EMBED_AND_HEAD_PARAMS, 'en')}B · 2 × (${both(QWEN.vocabSize.value).en} × ${both(QWEN.hiddenSize.value).en})`, 'pt-br': `${billions(EMBED_AND_HEAD_PARAMS, 'pt-br')}B · 2 × (${both(QWEN.vocabSize.value)['pt-br']} × ${both(QWEN.hiddenSize.value)['pt-br']})` },
          pigment: 'success',
          weight: EMBED_AND_HEAD_PARAMS,
        },
      ],
    },
  },

  't4-checkpoint-map': {
    lesson: '4.14-reading-real-weights',
    title: { en: 'Anatomy of Qwen3.8-27B’s safetensors checkpoint', 'pt-br': 'Anatomia do checkpoint safetensors do Qwen3.8-27B' },
    caption: {
      en: 'Every major tensor group in the checkpoint maps directly to an architectural component: nested text stack under model.language_model., vision tower under model.visual., and untied lm_head.weight at the top level.',
      'pt-br': 'Cada grande grupo de tensores no checkpoint corresponde diretamente a um componente da arquitetura: pilha de texto aninhada em model.language_model., torre de visão em model.visual. e lm_head.weight não amarrado no topo.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'embed_tokens.weight', 'pt-br': 'embed_tokens.weight' },
          detail: { en: `[${QWEN.vocabSize.value}, ${QWEN.hiddenSize.value}] · ~1.271B`, 'pt-br': `[${QWEN.vocabSize.value}, ${QWEN.hiddenSize.value}] · ~1,271B` },
          pigment: 'accent',
        },
        {
          label: { en: `${QWEN.deltaNetLayers.value} linear_attn layers`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas linear_attn` },
          detail: { en: 'layers 0–2, 4–6, … · DeltaNet + mlp triple', 'pt-br': 'camadas 0–2, 4–6, … · DeltaNet + trio mlp' },
          pigment: 'caution',
        },
        {
          label: { en: `${QWEN.attentionLayers.value} self_attn layers`, 'pt-br': `${QWEN.attentionLayers.value} camadas self_attn` },
          detail: { en: `layers 3, 7, …, 63 · q:${QWEN.qProjectionOut.value}, k/v:${QWEN.kvProjectionOut.value}, o:${QWEN.queryStateWidth.value} + mlp`, 'pt-br': `camadas 3, 7, …, 63 · q:${QWEN.qProjectionOut.value}, k/v:${QWEN.kvProjectionOut.value}, o:${QWEN.queryStateWidth.value} + mlp` },
          pigment: 'danger',
        },
        {
          label: { en: 'model.visual.blocks.*', 'pt-br': 'model.visual.blocks.*' },
          detail: { en: '27-layer vision tower + PatchMerger', 'pt-br': 'torre de visão de 27 camadas + PatchMerger' },
          pigment: 'muted',
        },
        {
          label: { en: 'lm_head.weight (top level)', 'pt-br': 'lm_head.weight (no topo)' },
          detail: { en: `[${QWEN.vocabSize.value}, ${QWEN.hiddenSize.value}] · untied (~1.271B)`, 'pt-br': `[${QWEN.vocabSize.value}, ${QWEN.hiddenSize.value}] · separado (~1,271B)` },
          pigment: 'success',
        },
      ],
    },
  },

  't4-deltanet-update': {
    lesson: '4.15-gated-deltanet',
    title: { en: 'From piling up to error-correcting memory', 'pt-br': 'De empilhamento a memória corretora de erro' },
    caption: {
      en: 'Updating the same key k from Paris (value 3) to Brasília (value 7). Additive memory piles both values together; the delta rule reads before writing so it replaces cleanly; Gated DeltaNet adds a learned global fade α_t.',
      'pt-br': 'Atualizando a mesma key k de Paris (valor 3) para Brasília (valor 7). A memória aditiva empilha os dois valores; a delta rule lê antes de escrever para substituir sem sujeira; o Gated DeltaNet soma um desbotamento global aprendido α_t.',
    },
    steps: [
      {
        label: { en: '1. Additive (interferes)', 'pt-br': '1. Aditiva (interfere)' },
        caption: {
          en: 'Pure addition can never remove a stale entry: writing 3 and then 7 under key k makes reading k return 3 + 7 = 10, which is neither answer.',
          'pt-br': 'A soma pura nunca remove uma entrada velha: escrever 3 e depois 7 sob a key k faz a leitura de k devolver 3 + 7 = 10, que não é nenhuma das respostas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Write Paris = 3', 'pt-br': 'Escrever Paris = 3' }, detail: { en: 'S stores 3 at key k', 'pt-br': 'S guarda 3 na key k' }, pigment: 'muted' },
            { label: { en: 'Add Brasília = 7', 'pt-br': 'Somar Brasília = 7' }, detail: { en: 'S_t = S_{t-1} + v kᵀ', 'pt-br': 'S_t = S_{t-1} + v kᵀ' }, pigment: 'caution' },
            { label: { en: 'Read key k → 10', 'pt-br': 'Ler key k → 10' }, detail: { en: '3 + 7 piled up; stale fact remains', 'pt-br': '3 + 7 empilhados; fato velho fica' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: '2. Delta rule (β = 1)', 'pt-br': '2. Regra delta (β = 1)' },
        caption: {
          en: 'Read what k currently returns (3), compute the error (7 − 3 = 4), and write only the correction. Reading k now returns 3 + 4 = 7 cleanly.',
          'pt-br': 'Leia o que k devolve hoje (3), calcule o erro (7 − 3 = 4) e escreva só a correção. Ler k agora devolve 3 + 4 = 7 sem ruído.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Read current value', 'pt-br': 'Ler valor atual' }, detail: { en: 'S_{t-1} k returns 3', 'pt-br': 'S_{t-1} k devolve 3' }, pigment: 'muted' },
            { label: { en: 'Compute error', 'pt-br': 'Calcular erro' }, detail: { en: '7 − 3 = +4 (targeted correction)', 'pt-br': '7 − 3 = +4 (correção direcionada)' }, pigment: 'accent' },
            { label: { en: 'Write correction', 'pt-br': 'Escrever correção' }, detail: { en: 'erases old 3, writes 7', 'pt-br': 'apaga o 3 antigo, escreve 7' }, pigment: 'accent' },
            { label: { en: 'Read key k → 7', 'pt-br': 'Ler key k → 7' }, detail: { en: 'cleanly replaced', 'pt-br': 'substituído com limpeza' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '3. Gated DeltaNet', 'pt-br': '3. Gated DeltaNet (com gate)' },
        caption: {
          en: 'A token-dependent gate α_t gently fades unvisited slots across the whole matrix before the delta rule edits key k with strength β_t.',
          'pt-br': 'Um gate α_t dependente do token desbota suavemente espaços não revisitados na matriz inteira antes de a delta rule editar a key k com força β_t.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Global fade (× α_t)', 'pt-br': 'Desbotamento global (× α_t)' }, detail: { en: 'learned decay clears old unused keys', 'pt-br': 'decaimento aprendido limpa keys sem uso' }, pigment: 'caution' },
            { label: { en: 'Erase key (I − β_t k kᵀ)', 'pt-br': 'Apagar key (I − β_t k kᵀ)' }, detail: { en: 'scales down old value at k_t', 'pt-br': 'reduz o valor antigo em k_t' }, pigment: 'accent' },
            { label: { en: 'Write (+ β_t v kᵀ)', 'pt-br': 'Escrever (+ β_t v kᵀ)' }, detail: { en: 'stores updated value at k_t', 'pt-br': 'grava o valor atualizado em k_t' }, pigment: 'accent' },
            { label: { en: 'Read (o_t = S_t q_t)', 'pt-br': 'Ler (o_t = S_t q_t)' }, detail: { en: 'fixed-size board, constant decode cost', 'pt-br': 'quadro fixo, custo constante em decode' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't4-hybrid-motif-and-memory': {
    lesson: '4.16-hybrid-layouts',
    derivedFrom: '7-inference-and-efficiency/7.2-the-kv-cache',
    title: { en: 'Three DeltaNet, one Attention — and where decode memory goes', 'pt-br': 'Três DeltaNet, uma Attention — e para onde vai a memória em decode' },
    caption: {
      en: `Qwen3.8-27B repeats a ${DELTANET_MOTIF}:1 motif ${QWEN.attentionLayers.value} times (${QWEN.deltaNetLayers.value} DeltaNet, ${QWEN.attentionLayers.value} Attention). At ${both(QWEN.contextNative.value).en} tokens, the minority attention layers hold over 100× more per-sequence decode state than all ${QWEN.deltaNetLayers.value} DeltaNet layers combined.`,
      'pt-br': `O Qwen3.8-27B repete um motivo ${DELTANET_MOTIF}:1 ${QWEN.attentionLayers.value} vezes (${QWEN.deltaNetLayers.value} DeltaNet, ${QWEN.attentionLayers.value} Attention). Em ${both(QWEN.contextNative.value)['pt-br']} tokens, a minoria de camadas de attention guarda mais de 100× mais estado de decode por sequência do que todas as ${QWEN.deltaNetLayers.value} camadas DeltaNet juntas.`,
    },
    steps: [
      {
        label: { en: '1. The 4-layer motif (×16)', 'pt-br': '1. O motivo de 4 camadas (×16)' },
        caption: {
          en: 'Three constant-state DeltaNet floors process local flow cheaply; every fourth floor is full attention, able to fetch any distant token onto the shared 5,120 residual stream.',
          'pt-br': 'Três andares DeltaNet de estado constante processam o fluxo local a baixo custo; todo quarto andar é full attention, capaz de buscar qualquer token distante para o residual stream compartilhado de 5.120.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Layer 0 · DeltaNet', 'pt-br': 'Camada 0 · DeltaNet' }, detail: { en: 'fixed state · 3 MiB (fp32 ref)', 'pt-br': 'estado fixo · 3 MiB (ref fp32)' }, pigment: 'caution' },
            { label: { en: 'Layer 1 · DeltaNet', 'pt-br': 'Camada 1 · DeltaNet' }, detail: { en: 'fixed state · 3 MiB (fp32 ref)', 'pt-br': 'estado fixo · 3 MiB (ref fp32)' }, pigment: 'caution' },
            { label: { en: 'Layer 2 · DeltaNet', 'pt-br': 'Camada 2 · DeltaNet' }, detail: { en: 'fixed state · 3 MiB (ref fp32)', 'pt-br': 'estado fixo · 3 MiB (ref fp32)' }, pigment: 'caution' },
            { label: { en: 'Layer 3 · Full Attention', 'pt-br': 'Camada 3 · Full Attention' }, detail: { en: 'direct recall · growing KV cache', 'pt-br': 'acesso direto · KV cache crescente' }, pigment: 'danger' },
            { label: { en: `Repeat ×${QWEN.attentionLayers.value}`, 'pt-br': `Repetir ×${QWEN.attentionLayers.value}` }, detail: { en: `${QWEN.deltaNetLayers.value} DeltaNet + ${QWEN.attentionLayers.value} Attention = ${QWEN.layers.value}`, 'pt-br': `${QWEN.deltaNetLayers.value} DeltaNet + ${QWEN.attentionLayers.value} Attention = ${QWEN.layers.value}` }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: `2. Decode memory at ${both(QWEN.contextNative.value).en} tokens`, 'pt-br': `2. Memória em decode a ${both(QWEN.contextNative.value)['pt-br']} tokens` },
        caption: {
          en: `Contrary to intuition, the ${QWEN.attentionLayers.value} attention layers account for ${QWEN.kvGibFullContext.value} GiB (${both(KV_CACHE_MIB).en} MiB), while all ${QWEN.deltaNetLayers.value} DeltaNet layers together stay flat at ${QWEN.deltaNetStateMib.value} MiB (reference fp32 state).`,
          'pt-br': `Ao contrário da intuição, as ${QWEN.attentionLayers.value} camadas de attention respondem por ${QWEN.kvGibFullContext.value} GiB (${both(KV_CACHE_MIB)['pt-br']} MiB), enquanto todas as ${QWEN.deltaNetLayers.value} camadas DeltaNet juntas ficam paradas em ${QWEN.deltaNetStateMib.value} MiB (estado fp32 de referência).`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: `${QWEN.attentionLayers.value} Attention layers (KV cache)`, 'pt-br': `${QWEN.attentionLayers.value} camadas Attention (KV cache)` },
              detail: { en: `${QWEN.kvGibFullContext.value} GiB (${both(KV_CACHE_MIB).en} MiB) · grows linearly with context`, 'pt-br': `${QWEN.kvGibFullContext.value} GiB (${both(KV_CACHE_MIB)['pt-br']} MiB) · cresce linearmente com o contexto` },
              pigment: 'danger',
              weight: KV_CACHE_MIB,
            },
            {
              label: { en: `${QWEN.deltaNetLayers.value} DeltaNet layers (recurrent state)`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas DeltaNet (estado recorrente)` },
              detail: { en: `${QWEN.deltaNetStateMib.value} MiB (reference fp32) · constant at any length`, 'pt-br': `${QWEN.deltaNetStateMib.value} MiB (fp32 de referência) · constante em qualquer tamanho` },
              pigment: 'success',
              weight: QWEN.deltaNetStateMib.value,
            },
          ],
        },
      },
    ],
  },

  't4-vision-tower-pipeline': {
    lesson: '4.17-multimodal-vision-encoder',
    title: { en: 'From raw pixels to decoder vectors (224 × 224 example)', 'pt-br': 'De pixels crus a vetores do decoder (exemplo 224 × 224)' },
    caption: {
      en: `Qwen3.8-27B turns an unpadded 224 × 224 image into 49 continuous ${both(QWEN.hiddenSize.value).en}-dimensional vectors — never vocabulary ids — and positions them with three-axis MRoPE (11 temporal, 11 height, 10 width).`,
      'pt-br': `O Qwen3.8-27B transforma uma imagem 224 × 224 sem padding em 49 vetores contínuos de ${both(QWEN.hiddenSize.value)['pt-br']} dimensões — nunca ids de vocabulário — e os posiciona com MRoPE de três eixos (11 temporal, 11 altura, 10 largura).`,
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Raw pixels', 'pt-br': 'Pixels crus' }, detail: { en: '224 × 224 image (no vocabulary)', 'pt-br': 'imagem 224 × 224 (sem vocabulário)' }, pigment: 'muted' },
        { label: { en: '3D patch embed', 'pt-br': 'Embedding 3D de patches' }, detail: { en: 'Conv3d 2×16×16 → 14×14 = 196 patches × 1,152', 'pt-br': 'Conv3d 2×16×16 → 14×14 = 196 patches × 1.152' }, pigment: 'accent' },
        { label: { en: '27-layer encoder', 'pt-br': 'Encoder de 27 camadas' }, detail: { en: '16 heads, FFN 4,304 · bidirectional context', 'pt-br': '16 heads, FFN 4.304 · contexto bidirecional' }, pigment: 'accent' },
        { label: { en: 'PatchMerger (2×2)', 'pt-br': 'PatchMerger (2×2)' }, detail: { en: `4 × 1,152 = 4,608 → ${both(QWEN.hiddenSize.value).en} (7×7 = 49 vectors)`, 'pt-br': `4 × 1.152 = 4.608 → ${both(QWEN.hiddenSize.value)['pt-br']} (7×7 = 49 vetores)` }, pigment: 'caution' },
        { label: { en: 'Decoder stream', 'pt-br': 'Stream do decoder' }, detail: { en: `width ${both(QWEN.hiddenSize.value).en} · MRoPE (11, 11, 10)`, 'pt-br': `largura ${both(QWEN.hiddenSize.value)['pt-br']} · MRoPE (11, 11, 10)` }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
