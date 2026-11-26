/**
 * Figures for track 3 — Sequence Models.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import { formatNumber } from '~/lib/i18n'
import { QWEN } from '~/lib/model-facts'
import type { Figure, Localised } from './types'

const both = (value: number): Localised => ({
  en: formatNumber('en', value),
  'pt-br': formatNumber('pt-br', value),
})

/** 3.1: Qwen3.8-27B KV cache vs. fixed recurrent state across native context. */
const RECURRENT_GIB = Number((QWEN.deltaNetStateMib.value / 1024).toFixed(4))
const LENGTH_SAMPLES = [0, 65536, 131072, 196608, QWEN.contextNative.value] as const
const KV_CACHE_POINTS = LENGTH_SAMPLES.map(
  (tokens) => [tokens, Number(((tokens * QWEN.kvKibPerToken.value) / (1024 * 1024)).toFixed(4))] as const,
)
const RECURRENT_POINTS = [
  [0, RECURRENT_GIB],
  [QWEN.contextNative.value, RECURRENT_GIB],
] as const

/** 3.2: log10 of the scalar gradient bound |w|^k across 50 steps. */
const RNN_STEPS = [0, 10, 20, 30, 40, 50] as const
const log10Pow = (w: number, k: number): number => Number((k * Math.log10(w)).toFixed(4))
const rnnAxes = {
  xAxis: {
    label: { en: 'Steps back through time', 'pt-br': 'Passos para trás no tempo' },
    scale: 'linear',
    min: 0,
    max: 50,
  },
  yAxis: {
    label: { en: 'Power of 10 (log₁₀ of factor)', 'pt-br': 'Potência de 10 (log₁₀ do fator)' },
    scale: 'linear',
    min: -20,
    max: 10,
  },
} as const
const rnnUnitLine = {
  label: { en: 'Exact balance (w = 1.0)', 'pt-br': 'Equilíbrio exato (w = 1,0)' },
  pigment: 'muted',
  points: RNN_STEPS.map((k) => [k, 0] as const),
} as const
const rnnVanishingPoints = RNN_STEPS.map((k) => [k, log10Pow(0.5, k)] as const)
const rnnExplodingPoints = RNN_STEPS.map((k) => [k, log10Pow(1.5, k)] as const)

/** 3.3: Forget-gate retention f^k on step ranges where every curve stays >= 0.0002 (never rounds to 0). */
const GATE_LONG_STEPS = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80] as const
const GATE_SHORT_STEPS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12] as const
const retained = (gate: number, steps: readonly number[]): readonly (readonly [number, number])[] =>
  steps.map((k) => [k, Number((gate ** k).toFixed(4))] as const)
const gateAxesLong = {
  xAxis: {
    label: { en: 'Steps elapsed', 'pt-br': 'Passos decorridos' },
    scale: 'linear',
    min: 0,
    max: 80,
  },
  yAxis: {
    label: { en: 'Retained signal fraction', 'pt-br': 'Fração de sinal retida' },
    scale: 'linear',
    min: 0,
    max: 1,
  },
} as const
const gateAxesShort = {
  xAxis: {
    label: { en: 'Steps elapsed', 'pt-br': 'Passos decorridos' },
    scale: 'linear',
    min: 0,
    max: 12,
  },
  yAxis: {
    label: { en: 'Retained signal fraction', 'pt-br': 'Fração de sinal retida' },
    scale: 'linear',
    min: 0,
    max: 1,
  },
} as const

/** 3.5: Exact energies from the lesson's worked example, normalized two ways. */
const ATTN_ENERGIES: readonly (readonly number[])[] = [
  [2.0, 0.5, -1.0],
  [2.0, 2.5, -1.0],
  [-1.0, 0.5, 2.0],
]
const softmaxExact = (values: readonly number[], decimals = 3): number[] => {
  const exps = values.map((v) => Math.exp(v))
  const total = exps.reduce((sum, v) => sum + v, 0)
  const scale = 10 ** decimals
  const rounded = exps.map((v) => Math.round((v / total) * scale) / scale)
  const residue = Math.round((1 - rounded.reduce((s, v) => s + v, 0)) * scale) / scale
  let largest = 0
  for (let i = 1; i < rounded.length; i += 1) if (rounded[i]! > rounded[largest]!) largest = i
  rounded[largest] = Math.round((rounded[largest]! + residue) * scale) / scale
  return rounded
}
const ATTN_BY_SOURCE = ATTN_ENERGIES.map((row) => softmaxExact(row))
const ATTN_COLS = [0, 1, 2].map((col) => softmaxExact(ATTN_ENERGIES.map((row) => row[col]!)))
const ATTN_BY_TARGET = [0, 1, 2].map((row) => [0, 1, 2].map((col) => ATTN_COLS[col]![row]!))
const SOURCE_COLS = [
  { en: 'Source 1 (h₁)', 'pt-br': 'Fonte 1 (h₁)' },
  { en: 'Source 2 (h₂)', 'pt-br': 'Fonte 2 (h₂)' },
  { en: 'Source 3 (h₃)', 'pt-br': 'Fonte 3 (h₃)' },
] as const
const TARGET_ROWS = [
  { en: 'Target 1 (e = 2.0, 0.5, −1.0)', 'pt-br': 'Alvo 1 (e = 2,0; 0,5; −1,0)' },
  { en: 'Target 2 (e = 2.0, 2.5, −1.0)', 'pt-br': 'Alvo 2 (e = 2,0; 2,5; −1,0)' },
  { en: 'Target 3 (e = −1.0, 0.5, 2.0)', 'pt-br': 'Alvo 3 (e = −1,0; 0,5; 2,0)' },
] as const

export const TRACK_3_FIGURES = {
  /**
   * 3.1 contrasts fixed-size recurrent state (~144 MiB) with per-position KV
   * cache (up to 16 GiB at 262,144 tokens) inside Qwen3.8-27B. Arithmetic is
   * owned by lesson 7.2 and wired from model-facts.ts.
   */
  't3-state-memory-curve': {
    lesson: '3.1-modelling-sequences',
    derivedFrom: '7-inference-and-efficiency/7.2-the-kv-cache',
    title: {
      en: 'Flat state versus growing cache inside Qwen3.8-27B',
      'pt-br': 'Estado plano contra cache crescente no Qwen3.8-27B',
    },
    caption: {
      en: `Memory held for one sequence up to Qwen3.8-27B’s native ${both(QWEN.contextNative.value).en}-token limit. The ${QWEN.attentionLayers.value} full-attention layers add ${QWEN.kvKibPerToken.value} KiB per token and reach ${QWEN.kvGibFullContext.value} GiB; the ${QWEN.deltaNetLayers.value} Gated DeltaNet layers hold about ${QWEN.deltaNetStateMib.value} MiB (≈ 0.14 GiB) in the reference float32 path at every length.`,
      'pt-br': `Memória mantida para uma sequência até o limite nativo de ${both(QWEN.contextNative.value)['pt-br']} tokens do Qwen3.8-27B. As ${QWEN.attentionLayers.value} camadas de attention completa somam ${QWEN.kvKibPerToken.value} KiB por token e chegam a ${QWEN.kvGibFullContext.value} GiB; as ${QWEN.deltaNetLayers.value} camadas Gated DeltaNet mantêm cerca de ${QWEN.deltaNetStateMib.value} MiB (≈ 0,14 GiB) no caminho float32 de referência em qualquer comprimento.`,
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Sequence length', 'pt-br': 'Comprimento da sequência' },
        scale: 'linear',
        min: 0,
        max: QWEN.contextNative.value,
        unit: 'tokens',
      },
      yAxis: {
        label: { en: 'State memory per sequence', 'pt-br': 'Memória de estado por sequência' },
        scale: 'linear',
        min: 0,
        max: 20,
        unit: 'GiB',
      },
      series: [
        {
          label: { en: 'KV cache (16 attention layers)', 'pt-br': 'KV cache (16 camadas de attention)' },
          pigment: 'accent',
          points: KV_CACHE_POINTS,
          marks: [
            {
              at: [QWEN.contextNative.value, QWEN.kvGibFullContext.value],
              label: { en: '16 GiB at 262,144 tokens', 'pt-br': '16 GiB em 262.144 tokens' },
            },
          ],
        },
        {
          label: {
            en: `Fixed recurrent state (~${QWEN.deltaNetStateMib.value} MiB flat, 48 layers)`,
            'pt-br': `Estado recorrente fixo (~${QWEN.deltaNetStateMib.value} MiB fixos, 48 camadas)`,
          },
          pigment: 'success',
          points: RECURRENT_POINTS,
        },
      ],
    },
  },

  /**
   * 3.2 multiplies |w| across 50 steps of the scalar recurrence
   * h_t = tanh(w h_{t-1} + x_t). Plotting log10(|w|^k) shows both 0.5^50
   * (~8.9e-16) and 1.5^50 (~6.4e8) on one readable scale.
   */
  't3-rnn-gradient-decay': {
    lesson: '3.2-rnns-vanishing-gradient',
    title: {
      en: 'Repeated multiplication turns small weights into extremes',
      'pt-br': 'Multiplicação repetida transforma pesos modestos em extremos',
    },
    caption: {
      en: 'Upper bound |w|ᵏ on the scalar recurrence gradient over 50 steps, plotted as powers of 10 (0 means 1, −15 means 10⁻¹⁵, +9 means 10⁹). Saturating tanh only pulls the actual factor lower.',
      'pt-br': 'Limite superior |w|ᵏ sobre o gradiente da recorrência escalar em 50 passos, traçado como potências de 10 (0 significa 1, −15 significa 10⁻¹⁵, +9 significa 10⁹). A saturação da tanh só puxa o fator real ainda mais para baixo.',
    },
    steps: [
      {
        label: { en: 'Vanishing (w = 0.5)', 'pt-br': 'Vanishing (w = 0,5)' },
        caption: {
          en: 'Each step multiplies by at most 0.5. By step 50 the factor is at most 0.5⁵⁰ ≈ 8.9 × 10⁻¹⁶ (power −15.05): distant credit is effectively drowned out.',
          'pt-br': 'Cada passo multiplica por no máximo 0,5. No passo 50 o fator é no máximo 0,5⁵⁰ ≈ 8,9 × 10⁻¹⁶ (potência −15,05): o crédito distante fica praticamente encoberto.',
        },
        body: {
          kind: 'plot',
          ...rnnAxes,
          series: [
            rnnUnitLine,
            {
              label: { en: 'w = 0.5 (vanishing)', 'pt-br': 'w = 0,5 (vanishing)' },
              pigment: 'danger',
              points: rnnVanishingPoints,
              marks: [
                {
                  at: [50, log10Pow(0.5, 50)],
                  label: { en: '≈ 8.9 × 10⁻¹⁶', 'pt-br': '≈ 8,9 × 10⁻¹⁶' },
                },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Exploding (w = 1.5)', 'pt-br': 'Exploding (w = 1,5)' },
        caption: {
          en: 'Raise |w| to 1.5 and the 50-step upper bound on norm growth reaches 1.5⁵⁰ ≈ 6.4 × 10⁸ (power +8.80). The actual gradient can still shrink depending on activations and directions, rather than always spiking; when spikes do occur, gradient clipping caps them after the fact, but cannot lift the muted 0.5⁵⁰ curve back up.',
          'pt-br': 'Suba |w| para 1,5 e o limite superior de crescimento da norma em 50 passos chega a 1,5⁵⁰ ≈ 6,4 × 10⁸ (potência +8,80). O gradiente real ainda pode encolher dependendo das ativações e direções, sem garantia de pico; quando picos ocorrem, o gradient clipping os corta depois do cálculo, mas não ergue de volta a curva apagada de 0,5⁵⁰.',
        },
        body: {
          kind: 'plot',
          ...rnnAxes,
          series: [
            rnnUnitLine,
            {
              label: { en: 'w = 0.5 (vanishing)', 'pt-br': 'w = 0,5 (vanishing)' },
              pigment: 'muted',
              points: rnnVanishingPoints,
            },
            {
              label: { en: 'w = 1.5 (upper bound)', 'pt-br': 'w = 1,5 (limite superior)' },
              pigment: 'danger',
              points: rnnExplodingPoints,
              marks: [
                {
                  at: [50, log10Pow(1.5, 50)],
                  label: { en: 'bound ≈ 6.4 × 10⁸', 'pt-br': 'limite ≈ 6,4 × 10⁸' },
                },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 3.3 shows how small shifts in the LSTM forget gate f^k change reach over
   * time, and why initializing the forget-gate bias at 0 vs. 3 changes
   * whether long-range gradients exist at all.
   */
  't3-forget-gate-halflife': {
    lesson: '3.3-lstm-gru-gates',
    title: {
      en: 'A small shift in the forget gate changes memory reach',
      'pt-br': 'Uma pequena mudança no forget gate altera o alcance da memória',
    },
    caption: {
      en: 'Fraction fᵏ of a cell value surviving along the direct forget-gate path (plotted over step ranges where every curve stays above 0.0001; exponential retention remains strictly positive for all k). Gates set an exponential half-life rather than permanent storage.',
      'pt-br': 'Fração fᵏ de um valor da célula que sobrevive pelo caminho direto do forget gate (traçada em faixas de passos onde toda curva permanece acima de 0,0001; a retenção exponencial continua estritamente positiva para todo k). Gates definem uma meia-vida exponencial, não armazenamento permanente.',
    },
    steps: [
      {
        label: { en: '0.99 versus 0.90', 'pt-br': '0,99 contra 0,90' },
        caption: {
          en: 'At f = 0.99, 0.448 survives 80 steps (and 0.366 survives 100). Lowering the gate to 0.90 drops retention to 0.0002 at step 80 and 2.7 × 10⁻⁵ at step 100 — tiny, though never identically zero.',
          'pt-br': 'Em f = 0,99, 0,448 sobrevive a 80 passos (e 0,366 a 100). Baixar o gate para 0,90 reduz a retenção para 0,0002 no passo 80 e 2,7 × 10⁻⁵ no passo 100 — minúscula, embora nunca identicamente zero.',
        },
        body: {
          kind: 'plot',
          ...gateAxesLong,
          series: [
            {
              label: { en: 'f = 0.99 (0.448 at 80; 0.366 at 100)', 'pt-br': 'f = 0,99 (0,448 em 80; 0,366 em 100)' },
              pigment: 'success',
              points: retained(0.99, GATE_LONG_STEPS),
              marks: [
                {
                  at: [80, Number((0.99 ** 80).toFixed(4))],
                  label: { en: '0.448 at 80', 'pt-br': '0,448 em 80' },
                },
              ],
            },
            {
              label: { en: 'f = 0.90 (0.0002 at 80; 2.7×10⁻⁵ at 100)', 'pt-br': 'f = 0,90 (0,0002 em 80; 2,7×10⁻⁵ em 100)' },
              pigment: 'caution',
              points: retained(0.9, GATE_LONG_STEPS),
              marks: [
                {
                  at: [10, Number((0.9 ** 10).toFixed(4))],
                  label: { en: '0.349 at step 10', 'pt-br': '0,349 no passo 10' },
                },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Bias 0 versus bias 3', 'pt-br': 'Bias 0 contra bias 3' },
        caption: {
          en: 'Zoomed to the first 12 steps: with bias 0, the gate starts at 0.5 and halves every step to 0.001 at step 10 and 0.0002 at step 12 (≈ 8 × 10⁻³¹ by step 100). Bias 3 starts near 0.953 and keeps 0.618 at step 10 (≈ 0.008 at step 100), so training has a gradient to work with.',
          'pt-br': 'Nos primeiros 12 passos: com bias 0, o gate começa em 0,5 e cai pela metade a cada passo até 0,001 no passo 10 e 0,0002 no passo 12 (≈ 8 × 10⁻³¹ no passo 100). O bias 3 parte perto de 0,953 e preserva 0,618 no passo 10 (≈ 0,008 no passo 100), dando ao treino um gradiente utilizável.',
        },
        body: {
          kind: 'plot',
          ...gateAxesShort,
          series: [
            {
              label: { en: 'f = 0.99 (reference)', 'pt-br': 'f = 0,99 (referência)' },
              pigment: 'muted',
              points: retained(0.99, GATE_SHORT_STEPS),
            },
            {
              label: { en: 'Bias 3 → f ≈ 0.953', 'pt-br': 'Bias 3 → f ≈ 0,953' },
              pigment: 'accent',
              points: retained(0.953, GATE_SHORT_STEPS),
              marks: [
                {
                  at: [10, Number((0.953 ** 10).toFixed(4))],
                  label: { en: 'bias 3: 0.618 at 10', 'pt-br': 'bias 3: 0,618 em 10' },
                },
              ],
            },
            {
              label: { en: 'Bias 0 → f = 0.50', 'pt-br': 'Bias 0 → f = 0,50' },
              pigment: 'danger',
              points: retained(0.5, GATE_SHORT_STEPS),
              marks: [
                {
                  at: [1, 0.5],
                  label: { en: 'bias 0: 0.5 at step 1', 'pt-br': 'bias 0: 0,5 no passo 1' },
                },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 3.4 separates the two failures caused by the single fixed-vector interface
   * in classic recurrent seq2seq: forward capacity compression and the combined
   * ~85-step backward path for a 40-token source and 45-token target.
   */
  't3-seq2seq-bottleneck': {
    lesson: '3.4-seq2seq-encoder-decoder-bottleneck',
    title: {
      en: 'One fixed vector creates two separate bottlenecks',
      'pt-br': 'Um único vetor fixo cria dois gargalos separados',
    },
    caption: {
      en: 'Classic recurrent seq2seq on a 40-token source and a 45-token target. Both the source details going forward and the error signal going backward pass through one choke point.',
      'pt-br': 'Seq2seq recorrente clássico numa fonte de 40 tokens e num alvo de 45 tokens. Tanto os detalhes da fonte no sentido direto quanto o sinal de erro no sentido reverso passam por um único funil.',
    },
    steps: [
      {
        label: { en: 'Forward: capacity', 'pt-br': 'Direto: capacidade' },
        caption: {
          en: 'Every name, negation and clause from all 40 source tokens must fit into one fixed vector before the decoder writes its first word.',
          'pt-br': 'Cada nome, negação e oração dos 40 tokens da fonte precisa caber num único vetor fixo antes de o decoder escrever a primeira palavra.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Source tokens 1…40', 'pt-br': 'Tokens da fonte 1…40' },
              detail: { en: 'encoder updates one state per token', 'pt-br': 'encoder atualiza um estado por token' },
              pigment: 'muted',
            },
            {
              label: { en: 'Single final vector', 'pt-br': 'Vetor final único' },
              detail: { en: 'frozen before decoding; details compete', 'pt-br': 'congelado antes do decoding; detalhes competem' },
              pigment: 'danger',
            },
            {
              label: { en: 'Decoder start', 'pt-br': 'Início do decoder' },
              detail: { en: 'reads <start> plus that one vector', 'pt-br': 'lê <start> mais esse único vetor' },
              pigment: 'accent',
            },
            {
              label: { en: 'Target tokens 1…45', 'pt-br': 'Tokens do alvo 1…45' },
              detail: { en: 'generated one by one until <end>', 'pt-br': 'gerados um a um até <end>' },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'Backward: credit path', 'pt-br': 'Reverso: crédito' },
        caption: {
          en: 'An error at target step 45 travels back through 45 decoder steps, across the single summary vector, and through 40 encoder steps — about 85 transitions in one chain.',
          'pt-br': 'Um erro no passo 45 do alvo volta por 45 passos do decoder, atravessa o vetor de resumo único e percorre 40 passos do encoder — cerca de 85 transições numa única cadeia.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Target loss (step 45)', 'pt-br': 'Loss do alvo (passo 45)' },
              detail: { en: 'error signal starts at the end', 'pt-br': 'sinal de erro nasce no fim' },
              pigment: 'caution',
            },
            {
              label: { en: '45 decoder transitions', 'pt-br': '45 transições no decoder' },
              detail: { en: 'multiplied at every step back', 'pt-br': 'multiplicado em cada passo de volta' },
              pigment: 'danger',
            },
            {
              label: { en: 'Single choke point', 'pt-br': 'Único funil de passagem' },
              detail: { en: 'only bridge to the encoder', 'pt-br': 'única ponte até o encoder' },
              pigment: 'danger',
            },
            {
              label: { en: '40 encoder transitions', 'pt-br': '40 transições no encoder' },
              detail: { en: '0.99⁸⁵ ≈ 0.43; 0.95⁸⁵ ≈ 0.013', 'pt-br': '0,99⁸⁵ ≈ 0,43; 0,95⁸⁵ ≈ 0,013' },
              pigment: 'danger',
            },
          ],
        },
      },
    ],
  },

  /**
   * 3.5 works through three-position energies (2.0, 0.5, -1.0) and (2.0, 2.5, -1.0)
   * and warns about applying softmax on the wrong axis. Showing both normalizations
   * of the same 3x3 energy table teaches alignment and the axis bug together.
   */
  't3-attention-alignment-axes': {
    lesson: '3.5-bahdanau-attention',
    title: {
      en: 'Same energies, two softmax axes',
      'pt-br': 'As mesmas energias, dois eixos de softmax',
    },
    caption: {
      en: 'Weights from one 3 × 3 matrix of energies. Target 1 and Target 2 use the lesson’s exact worked energies; Target 3 illustrates a read near the end of the source.',
      'pt-br': 'Pesos de uma mesma matriz 3 × 3 de energias. O Alvo 1 e o Alvo 2 usam as energias exatas do exemplo resolvido da aula; o Alvo 3 ilustra uma leitura perto do fim da fonte.',
    },
    steps: [
      {
        label: { en: 'Across source (correct)', 'pt-br': 'Sobre a fonte (correto)' },
        caption: {
          en: 'Every row sums to 1.000. Raising Source 2’s energy from 0.5 in Target 1 to 2.5 in Target 2 shifts the read from Source 1 (0.786) to Source 2 (0.611).',
          'pt-br': 'Toda linha soma 1,000. Elevar a energia da Fonte 2 de 0,5 no Alvo 1 para 2,5 no Alvo 2 desloca a leitura da Fonte 1 (0,786) para a Fonte 2 (0,611).',
        },
        body: {
          kind: 'grid',
          bins: 4,
          columns: [...SOURCE_COLS],
          rows: [...TARGET_ROWS],
          cells: ATTN_BY_SOURCE,
        },
      },
      {
        label: { en: 'Across target (axis bug)', 'pt-br': 'Sobre o alvo (bug de eixo)' },
        caption: {
          en: 'Normalizing down columns forces each column to sum to 1.000 instead. Source 1 is diluted across Target 1 and Target 2 (0.488 each), and row sums drift to 0.640, 1.319 and 1.041.',
          'pt-br': 'Normalizar pelas colunas obriga cada coluna a somar 1,000. A Fonte 1 se dilui entre o Alvo 1 e o Alvo 2 (0,488 em cada), e as somas das linhas derivam para 0,640, 1,319 e 1,041.',
        },
        body: {
          kind: 'grid',
          bins: 4,
          columns: [...SOURCE_COLS],
          rows: [...TARGET_ROWS],
          cells: ATTN_BY_TARGET,
        },
      },
    ],
  },

  /**
   * 3.6 uses a two-feature key (1, 0) written first with value 3 and then with
   * value 5 to contrast blind addition with the delta rule's read-then-correct.
   */
  't3-additive-vs-delta-write': {
    lesson: '3.6-linear-attention-fast-weights',
    title: {
      en: 'Updating the same key: blind addition versus delta rule',
      'pt-br': 'Atualizar a mesma key: soma cega contra delta rule',
    },
    caption: {
      en: 'The lesson’s toy case: write value 3 under key (1, 0), then write value 5 under the same key. The state size never grows in either rule; only the write rule changes.',
      'pt-br': 'O caso de brinquedo da aula: grave o valor 3 sob a key (1, 0) e depois grave o valor 5 sob a mesma key. O tamanho do estado nunca cresce em nenhuma das regras; só muda a regra de escrita.',
    },
    steps: [
      {
        label: { en: 'Additive linear attention', 'pt-br': 'Linear attention aditiva' },
        caption: {
          en: 'The second write adds 5 on top of 3 and increments the normalizer from 1 to 2. Reading back divides 8 by 2 and returns 4 — a blurred average of old and new.',
          'pt-br': 'A segunda escrita soma 5 em cima de 3 e sobe o normalizador de 1 para 2. A leitura divide 8 por 2 e devolve 4 — uma média borrada do velho com o novo.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Write 3 under (1, 0)', 'pt-br': 'Gravar 3 em (1, 0)' },
              detail: { en: 'row holds 3 · normalizer = 1', 'pt-br': 'linha guarda 3 · normalizador = 1' },
              pigment: 'muted',
            },
            {
              label: { en: 'Add 5 under (1, 0)', 'pt-br': 'Somar 5 em (1, 0)' },
              detail: { en: 'row holds 3 + 5 = 8 · normalizer = 2', 'pt-br': 'linha guarda 3 + 5 = 8 · normalizador = 2' },
              pigment: 'caution',
            },
            {
              label: { en: 'Read with (1, 0)', 'pt-br': 'Ler com (1, 0)' },
              detail: { en: '8 / 2 = 4 (neither 3 nor 5)', 'pt-br': '8 / 2 = 4 (nem 3 nem 5)' },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: 'Delta rule', 'pt-br': 'Delta rule' },
        caption: {
          en: 'Before writing 5, the rule reads what the state already predicts (3), computes the error (5 − 3 = 2), and writes only the scaled correction β × 2 directly into the state.',
          'pt-br': 'Antes de gravar 5, a regra lê o que o estado já prevê (3), calcula o erro (5 − 3 = 2) e escreve apenas a correção escalada β × 2 diretamente no estado.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'State holds 3', 'pt-br': 'Estado guarda 3' },
              detail: { en: 'stored for key (1, 0)', 'pt-br': 'guardado para a key (1, 0)' },
              pigment: 'muted',
            },
            {
              label: { en: 'Read first, find error', 'pt-br': 'Ler primeiro, medir erro' },
              detail: { en: 'predicts 3 · error = 5 − 3 = +2', 'pt-br': 'prevê 3 · erro = 5 − 3 = +2' },
              pigment: 'caution',
            },
            {
              label: { en: 'Write β × error', 'pt-br': 'Escrever β × erro' },
              detail: { en: 'β = 0.5 → 4 · as β → 1, approaches 5', 'pt-br': 'β = 0,5 → 4 · com β → 1, aproxima-se de 5' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
