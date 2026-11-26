/**
 * Figures for track 5 — Pretraining at scale.
 *
 * Two rules carried over from track 4: every number comes from
 * `~/lib/model-facts`, and anything the reader is asked to reason about is
 * computed by the module that the lab and the tests use, never typed in here.
 * The balancing plot below calls `moeBalance` directly, so the curve and the
 * lab cannot disagree about what the sign rule does.
 */
import { formatNumber } from '~/lib/i18n'
import { MOE, QWEN } from '~/lib/model-facts'
import { moeBalance } from '~/lib/moe-math'
import { millions } from './geometry'
import type { Figure, FigureStep, Localised } from './types'

/** Format a number with each locale's grouping and decimal punctuation. */
const both = (value: number): Localised => ({ en: formatNumber('en', value), 'pt-br': formatNumber('pt-br', value) })

const MAPPED_IDS = QWEN.tokenizerMappedIds.value
const UNUSED_ROWS = QWEN.vocabSize.value - MAPPED_IDS
const WEIGHTS_GB = QWEN.weightsGbBf16.value
const OPTIMIZER_GB = WEIGHTS_GB * 6 // fp32 master (4 B) + two fp32 AdamW moments (8 B) = 12 B/param = 6x bf16 weights
const PERSISTENT_GB = WEIGHTS_GB * 8 // 16 B/param = 432 GB under the lesson 5.7 illustrative recipe

/** 5.1: one token slot in the toy sentence across pretraining objectives. */
const slot = (en: string, pt: string, detail: Localised, pigment: FigureStep['pigment']): FigureStep => ({
  label: { en, 'pt-br': pt },
  detail,
  pigment,
})

/** 5.4: scaling-law fit on 100M -> 1B runs (3.20 -> 2.80), with and without floor 1.70. */
const scalingAxes = {
  xAxis: {
    label: { en: 'Non-embedding parameters (billions)', 'pt-br': 'Parâmetros não-embedding (bilhões)' },
    scale: 'log',
    min: 0.1,
    max: 10000,
  },
  yAxis: {
    label: { en: 'Held-out loss (nats)', 'pt-br': 'Loss held-out (nats)' },
    scale: 'linear',
    min: 1.5,
    max: 3.5,
  },
} as const

const SCALING_DECADES = [0.1, 1, 10, 100, 1000, 10000] as const
const FLOOR_POINTS = SCALING_DECADES.map((n) => [n, 1.7] as const)
const FLOOR_FIT_POINTS = SCALING_DECADES.map((n, index) => [
  n,
  Number((1.7 + 1.5 * (1.1 / 1.5) ** index).toFixed(4)),
] as const)
const NAIVE_FIT_POINTS = SCALING_DECADES.map((n, index) => [
  n,
  Number((3.2 * (2.8 / 3.2) ** index).toFixed(4)),
] as const)

/** 5.6: toy lifetime cost C_life = C_train + R * C_infer (R in millions of requests). */
const lifetimeAxes = {
  xAxis: {
    label: { en: 'Lifetime demand (millions of requests)', 'pt-br': 'Demanda na vida útil (milhões de requisições)' },
    scale: 'linear',
    min: 0,
    max: 1000,
  },
  yAxis: {
    label: { en: 'Total lifetime cost (units)', 'pt-br': 'Custo total na vida útil (unidades)' },
    scale: 'linear',
    min: 0,
    max: 1200,
  },
} as const

const BASELINE_LIFETIME = {
  label: { en: 'Larger model: 100 train + 1/M serve', 'pt-br': 'Modelo maior: 100 treino + 1/M serving' },
  pigment: 'muted',
  points: [[0, 100], [10, 110], [200, 300], [500, 600], [1000, 1100]],
} as const

/** 5.11: cosine decay from 3.0e-4 to 0.3e-4 (plotted in units of 10^-4). */
const lrAxes = {
  xAxis: {
    label: { en: 'Tokens processed (trillions)', 'pt-br': 'Tokens processados (trilhões)' },
    scale: 'linear',
    min: 0,
    max: 2,
  },
  yAxis: {
    label: { en: 'Learning rate (×10⁻⁴)', 'pt-br': 'Taxa de aprendizado (×10⁻⁴)' },
    scale: 'linear',
    min: 0,
    max: 3.5,
  },
} as const

const cosineLr = (p: number): number => Number((0.3 + 0.5 * (3.0 - 0.3) * (1 + Math.cos(Math.PI * p))).toFixed(4))
const TOKEN_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const
const PLANNED_COSINE_POINTS = [
  [0, 0] as const,
  [0.008, 3.0] as const,
  ...TOKEN_STEPS.map((t) => [t, cosineLr(t / 2)] as const),
]
const STRANDED_COSINE_POINTS = [
  [0, 0] as const,
  [0.016, 3.0] as const,
  ...TOKEN_STEPS.map((t) => [t, cosineLr(t / 4)] as const),
]

/** The lab's default batch: 64 tokens, 8 experts, no bias to begin with. */
const BALANCE_BATCH = { experts: 8, tokens: 64, skew: 0.5, steps: 40 } as const

const maxVioSeries = (rate: number) =>
  moeBalance({ ...BALANCE_BATCH, rate }).trace.map((point) => [point.step, Number(point.maxVio.toFixed(4))] as const)

export const TRACK_5_FIGURES = {
  /**
   * 5.1 compares four pretraining objectives over the same toy sentence.
   * Stepping through them replaces the repetitive token-by-token prose examples.
   */
  't5-pretraining-objectives': {
    lesson: '5.1-pretraining-objectives',
    title: { en: 'One sentence, four prediction games', 'pt-br': 'Uma frase, quatro jogos de predição' },
    caption: {
      en: 'Each objective hides different parts of the same sentence and scores different targets. Qwen3.8-27B trains under causal language modelling, extended with multi-token prediction and multimodal vision patches.',
      'pt-br': 'Cada objetivo esconde partes diferentes da mesma frase e pontua alvos diferentes. O Qwen3.8-27B treina sob modelagem causal de linguagem, estendida com multi-token prediction e patches multimodais de visão.',
    },
    steps: [
      {
        label: { en: 'Causal LM', 'pt-br': 'LM causal' },
        caption: {
          en: 'Left-to-right prediction under a causal mask: after each prefix, the model predicts the very next token over all 248,320 vocabulary classes. Every position after the first yields a training signal.',
          'pt-br': 'Predição da esquerda para a direita sob máscara causal: após cada prefixo, o modelo prevê o próximo token sobre as 248.320 classes do vocabulário. Toda posição após a primeira gera sinal de treino.',
        },
        body: {
          kind: 'flow',
          steps: [
            slot('the', 'o', { en: 'visible prefix', 'pt-br': 'prefixo visível' }, 'accent'),
            slot('cat', 'gato', { en: 'visible prefix', 'pt-br': 'prefixo visível' }, 'accent'),
            slot('sat', 'sentou', { en: 'visible prefix', 'pt-br': 'prefixo visível' }, 'accent'),
            slot('on', 'no', { en: 'visible prefix', 'pt-br': 'prefixo visível' }, 'accent'),
            slot('the', '—', { en: 'visible prefix', 'pt-br': 'prefixo visível' }, 'accent'),
            slot('mat', 'tapete', { en: 'next-token target', 'pt-br': 'alvo de próximo token' }, 'success'),
          ],
        },
      },
      {
        label: { en: 'MLM (BERT)', 'pt-br': 'MLM (BERT)' },
        caption: {
          en: 'Selected tokens are replaced with [MASK]. A bidirectional encoder sees both sides of the gap, but only the masked positions contribute to the loss.',
          'pt-br': 'Tokens selecionados são trocados por [MASK]. Um encoder bidirecional vê os dois lados da lacuna, mas apenas as posições mascaradas contribuem para a loss.',
        },
        body: {
          kind: 'flow',
          steps: [
            slot('the', 'o', { en: 'left context', 'pt-br': 'contexto à esquerda' }, 'accent'),
            slot('[MASK]', '[MASK]', { en: 'target: cat', 'pt-br': 'alvo: gato' }, 'caution'),
            slot('sat', 'sentou', { en: 'right context', 'pt-br': 'contexto à direita' }, 'accent'),
            slot('on', 'no', { en: 'right context', 'pt-br': 'contexto à direita' }, 'accent'),
            slot('the mat', 'tapete', { en: 'right context', 'pt-br': 'contexto à direita' }, 'accent'),
          ],
        },
      },
      {
        label: { en: 'Span corruption (T5)', 'pt-br': 'Corrupção de trechos (T5)' },
        caption: {
          en: 'A contiguous stretch is removed and replaced by one sentinel marker ⟨X⟩. An encoder–decoder model reads the gapped input and generates the missing passage.',
          'pt-br': 'Um trecho contíguo é removido e trocado por um marcador sentinela ⟨X⟩. Um modelo encoder–decoder lê a entrada com lacuna e gera a passagem que falta.',
        },
        body: {
          kind: 'flow',
          steps: [
            slot('the', 'o', { en: 'encoder input', 'pt-br': 'entrada do encoder' }, 'accent'),
            slot('⟨X⟩', '⟨X⟩', { en: 'sentinel gap', 'pt-br': 'lacuna sentinela' }, 'danger'),
            slot('on the mat', 'no tapete', { en: 'encoder input', 'pt-br': 'entrada do encoder' }, 'accent'),
            slot('Decoder target', 'Alvo do decoder', { en: '⟨X⟩ cat sat', 'pt-br': '⟨X⟩ gato sentou' }, 'success'),
          ],
        },
      },
      {
        label: { en: 'FIM', 'pt-br': 'FIM' },
        caption: {
          en: 'The document is rearranged into prefix, suffix, then middle with boundary tokens. A left-to-right decoder keeps ordinary next-token loss while learning to fill in missing code or prose.',
          'pt-br': 'O documento é rearranjado em prefixo, sufixo e então miolo com tokens de fronteira. Um decoder da esquerda para a direita mantém a loss comum de próximo token enquanto aprende a preencher código ou texto no meio.',
        },
        body: {
          kind: 'flow',
          steps: [
            slot('Prefix', 'Prefixo', { en: 'the cat', 'pt-br': 'o gato' }, 'accent'),
            slot('Suffix', 'Sufixo', { en: 'the mat', 'pt-br': 'tapete' }, 'accent'),
            slot('Boundary', 'Fronteira', { en: 'middle marker', 'pt-br': 'marcador do miolo' }, 'muted'),
            slot('Middle target', 'Alvo do miolo', { en: 'sat on', 'pt-br': 'sentou no' }, 'success'),
          ],
        },
      },
    ],
  },

  /**
   * 5.2 teaches a four-stage governed pipeline and the specific ordering trap
   * where deduplicating per source or after the train/val split leaks copies.
   */
  't5-data-pipeline': {
    lesson: '5.2-data-pipeline',
    title: { en: 'From raw sources to an auditable mixture', 'pt-br': 'De fontes brutas a uma mistura auditável' },
    caption: {
      en: 'Order matters as much as each filter. Cross-source deduplication must run before the train/validation split so mirrored articles cannot land on both sides.',
      'pt-br': 'A ordem importa tanto quanto cada filtro. A deduplicação entre fontes precisa rodar antes da divisão treino/validação para que artigos espelhados não caiam dos dois lados.',
    },
    steps: [
      {
        label: { en: 'Governed order', 'pt-br': 'Ordem governada' },
        caption: {
          en: 'Every stage versions its outputs and counts what it removed. Deduplicating across the merged pool before splitting keeps clusters together and protects the held-out evaluation.',
          'pt-br': 'Cada estágio versiona suas saídas e conta o que removeu. Deduplicar sobre o pool combinado antes da divisão mantém clusters juntos e protege a avaliação held-out.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1. Sourcing', 'pt-br': '1. Origem' }, detail: { en: 'provenance, date, licence, ID', 'pt-br': 'proveniência, data, licença, ID' }, pigment: 'muted' },
            { label: { en: '2. Filtering', 'pt-br': '2. Filtragem' }, detail: { en: 'mechanical, language, quality, safety', 'pt-br': 'mecânica, idioma, qualidade, segurança' }, pigment: 'accent' },
            { label: { en: '3. Cross-source dedup', 'pt-br': '3. Dedup entre fontes' }, detail: { en: 'exact + near duplicates across shards', 'pt-br': 'exatas + quase-duplicatas entre shards' }, pigment: 'accent' },
            { label: { en: '4. Split & decontaminate', 'pt-br': '4. Dividir e descontaminar' }, detail: { en: 'cluster split, remove test overlaps', 'pt-br': 'divisão por cluster, remover testes' }, pigment: 'caution' },
            { label: { en: '5. Mixture manifest', 'pt-br': '5. Manifesto da mistura' }, detail: { en: 'effective epochs per source', 'pt-br': 'épocas efetivas por fonte' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'The leaky split', 'pt-br': 'A divisão com vazamento' },
        caption: {
          en: 'Deduplicating only inside each shard leaves mirrored copies across sources. A random document split then puts copies into both training and validation, making held-out loss look artificially good.',
          'pt-br': 'Deduplicar apenas dentro de cada shard deixa cópias espelhadas entre fontes. Uma divisão aleatória por documento coloca cópias no treino e na validação, fazendo a loss held-out parecer artificialmente boa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Overlapping sources', 'pt-br': 'Fontes sobrepostas' }, detail: { en: 'same article in wiki, mirrors, forums', 'pt-br': 'mesmo artigo em wiki, espelhos, fóruns' }, pigment: 'muted' },
            { label: { en: 'Per-source dedup only', 'pt-br': 'Dedup só por fonte' }, detail: { en: 'each copy looks unique in its shard', 'pt-br': 'cada cópia parece única no seu shard' }, pigment: 'caution' },
            { label: { en: 'Random document split', 'pt-br': 'Divisão aleatória' }, detail: { en: 'copies land in both train and val', 'pt-br': 'cópias caem no treino e na validação' }, pigment: 'danger' },
            { label: { en: 'Invalid validation loss', 'pt-br': 'Loss de validação inválida' }, detail: { en: 'measures memorization, not generalization', 'pt-br': 'mede memorização, não generalização' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 5.3 contrasts Qwen3.8-27B's observed 248,320-row allocation (512 × 485)
   * against a round 250,000-row table that stops dividing evenly past TP 16.
   */
  't5-vocab-alignment': {
    lesson: '5.3-training-tokenizer',
    title: { en: '248,320 rows versus a round 250,000', 'pt-br': '248.320 linhas contra um número redondo de 250.000' },
    caption: {
      en: 'Divisibility by powers of two is an observable arithmetic property of the published config. Qwen does not publish whether tensor-parallel alignment was the reason it picked 248,320.',
      'pt-br': 'A divisibilidade por potências de dois é uma propriedade aritmética observável do config publicado. A Qwen não publica se o alinhamento para tensor parallelism foi o motivo de escolher 248.320.',
    },
    steps: [
      {
        label: { en: 'Published 248,320 rows', 'pt-br': '248.320 linhas publicadas' },
        caption: {
          en: `The pinned tokenizer maps ${both(MAPPED_IDS).en} IDs (0–248,076) and leaves ${UNUSED_ROWS} tail rows unused (~5 MB across both matrices). Because 248,320 = 512 × 485, every power-of-two tensor-parallel degree up to 512 gets an exact integer slice.`,
          'pt-br': `O tokenizer fixado mapeia ${both(MAPPED_IDS)['pt-br']} IDs (0–248.076) e deixa ${UNUSED_ROWS} linhas finais sem uso (~5 MB nas duas matrizes). Como 248.320 = 512 × 485, todo grau de tensor parallel em potência de dois até 512 recebe uma fatia inteira exata.`,
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Mapped tokenizer IDs', 'pt-br': 'IDs mapeados no tokenizer' },
              detail: { en: `${both(MAPPED_IDS).en} rows (0–248,076)`, 'pt-br': `${both(MAPPED_IDS)['pt-br']} linhas (0–248.076)` },
              pigment: 'accent',
            },
            {
              label: { en: 'Unused tail rows', 'pt-br': 'Linhas finais sem uso' },
              detail: { en: `${UNUSED_ROWS} rows (~5 MB, never emitted)`, 'pt-br': `${UNUSED_ROWS} linhas (~5 MB, nunca emitidas)` },
              pigment: 'muted',
            },
            {
              label: { en: 'Allocated matrix', 'pt-br': 'Matriz alocada' },
              detail: { en: `${both(QWEN.vocabSize.value).en} = 512 × 485`, 'pt-br': `${both(QWEN.vocabSize.value)['pt-br']} = 512 × 485` },
              pigment: 'success',
            },
            {
              label: { en: 'Split across GPUs', 'pt-br': 'Divisão entre GPUs' },
              detail: { en: 'TP 8: 31,040 · TP 32: 7,760 · TP 64: 3,880', 'pt-br': 'TP 8: 31.040 · TP 32: 7.760 · TP 64: 3.880' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Round 250,000 rows', 'pt-br': 'Número redondo: 250.000' },
        caption: {
          en: '250,000 factors as 16 × 15,625, so it has only four factors of two. It splits evenly through degree 16, then breaks at degree 32 with an impossible fractional row count.',
          'pt-br': '250.000 fatora como 16 × 15.625, então tem só quatro fatores de dois. Divide limpo até o grau 16 e quebra no grau 32 com uma contagem fracionária impossível de linhas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Round row count', 'pt-br': 'Contagem redonda' }, detail: { en: '250,000 = 16 × 15,625', 'pt-br': '250.000 = 16 × 15.625' }, pigment: 'caution' },
            { label: { en: 'TP 8 or TP 16', 'pt-br': 'TP 8 ou TP 16' }, detail: { en: '31,250 or 15,625 rows per rank', 'pt-br': '31.250 ou 15.625 linhas por rank' }, pigment: 'accent' },
            { label: { en: 'TP 32 breaks', 'pt-br': 'TP 32 quebra' }, detail: { en: '7,812.5 rows per rank (impossible)', 'pt-br': '7.812,5 linhas por rank (impossível)' }, pigment: 'danger' },
            { label: { en: 'Launch outcome', 'pt-br': 'Resultado no lançamento' }, detail: { en: 'hidden framework padding or launch error', 'pt-br': 'padding oculto do framework ou erro' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 5.4 works through two measured runs (3.20 at 100M, 2.80 at 1B) with floor
   * 1.70, then shows the naive raw-loss extrapolation diving below the floor.
   */
  't5-scaling-floor-trap': {
    lesson: '5.4-kaplan-scaling-laws',
    title: { en: 'Fitting with the floor versus skipping it', 'pt-br': 'Ajustar com o piso contra pular o piso' },
    caption: {
      en: 'Both curves pass exactly through the two measured pilot runs (3.20 at 100M and 2.80 at 1B). Only the fit that includes the irreducible entropy floor stays physically possible when extrapolated.',
      'pt-br': 'As duas curvas passam exatamente pelas duas runs piloto medidas (3,20 em 100M e 2,80 em 1B). Só o ajuste que inclui o piso irredutível de entropia continua fisicamente possível quando extrapolado.',
    },
    steps: [
      {
        label: { en: 'With floor L∞ = 1.70', 'pt-br': 'Com piso L∞ = 1,70' },
        caption: {
          en: 'Subtracting 1.70 leaves reducible losses 1.50 and 1.10 (ratio 0.7333 per decade, α = 0.135). The curve predicts 2.51 at 10B and levels off above the floor as scale grows.',
          'pt-br': 'Subtrair 1,70 deixa losses redutíveis de 1,50 e 1,10 (razão 0,7333 por década, α = 0,135). A curva prevê 2,51 em 10B e se estabiliza acima do piso conforme a escala cresce.',
        },
        body: {
          kind: 'plot',
          ...scalingAxes,
          series: [
            {
              label: { en: 'Irreducible floor (1.70)', 'pt-br': 'Piso irredutível (1,70)' },
              pigment: 'muted',
              points: FLOOR_POINTS,
            },
            {
              label: { en: 'Floor-aware fit (α = 0.135)', 'pt-br': 'Ajuste com piso (α = 0,135)' },
              pigment: 'accent',
              points: FLOOR_FIT_POINTS,
              marks: [
                { at: [1, 2.8], label: { en: '1B: 2.80', 'pt-br': '1B: 2,80' } },
                { at: [10, 2.5067], label: { en: '10B: 2.51', 'pt-br': '10B: 2,51' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Skipping the floor', 'pt-br': 'Pulando o piso' },
        caption: {
          en: 'Fitting the raw losses directly gives ratio 0.875 per decade (α = 0.058). It reproduces both measured points, then predicts 1.64 at 10T parameters — below the data’s own 1.70 entropy floor.',
          'pt-br': 'Ajustar as losses brutas diretamente dá razão 0,875 por década (α = 0,058). Reproduz os dois pontos medidos e depois prevê 1,64 em 10T de parâmetros — abaixo do piso de entropia de 1,70 dos próprios dados.',
        },
        body: {
          kind: 'plot',
          ...scalingAxes,
          series: [
            {
              label: { en: 'Irreducible floor (1.70)', 'pt-br': 'Piso irredutível (1,70)' },
              pigment: 'muted',
              points: FLOOR_POINTS,
            },
            {
              label: { en: 'Floor-aware fit (α = 0.135)', 'pt-br': 'Ajuste com piso (α = 0,135)' },
              pigment: 'accent',
              points: FLOOR_FIT_POINTS,
            },
            {
              label: { en: 'Raw-loss fit (α = 0.058)', 'pt-br': 'Ajuste sem piso (α = 0,058)' },
              pigment: 'danger',
              points: NAIVE_FIT_POINTS,
              marks: [
                { at: [10000, 1.6413], label: { en: '1.64 < 1.70 floor', 'pt-br': '1,64 < piso 1,70' } },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 5.5 walks through an iso-compute slice (fixed N × D) and then contrasts
   * a hypothetical 20 tok/param 27B run with a 150 tok/param over-trained run.
   */
  't5-chinchilla-vs-overtrain': {
    lesson: '5.5-chinchilla-compute-optimality',
    title: { en: 'Trading parameters against tokens, then training against serving', 'pt-br': 'Trocando parâmetros por tokens, depois treino por serving' },
    caption: {
      en: 'Every 27B figure below is a hypothetical planning calculation for a dense model, not a published fact about Qwen3.8-27B’s undisclosed training run.',
      'pt-br': 'Todo número de 27B abaixo é um cálculo hipotético de planejamento para um modelo denso, não um fato publicado sobre a run de treino não divulgada do Qwen3.8-27B.',
    },
    steps: [
      {
        label: { en: 'One iso-compute budget', 'pt-br': 'Um orçamento iso-compute' },
        caption: {
          en: 'Holding C ∝ N × D fixed means doubling parameters halves the tokens you can afford. Too small lacks capacity; too large starves for data; the lowest validation loss sits in the balanced middle.',
          'pt-br': 'Manter C ∝ N × D fixo significa que dobrar parâmetros corta pela metade os tokens possíveis. Pequeno demais falta capacidade; grande demais passa fome de dados; a menor loss fica no meio equilibrado.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1B × 100B tokens', 'pt-br': '1B × 100B tokens' }, detail: { en: 'abundant data, limited capacity', 'pt-br': 'dados abundantes, pouca capacidade' }, pigment: 'caution' },
            { label: { en: '2B × 50B tokens', 'pt-br': '2B × 50B tokens' }, detail: { en: 'same product: balanced optimum', 'pt-br': 'mesmo produto: ótimo equilibrado' }, pigment: 'success' },
            { label: { en: '4B × 25B tokens', 'pt-br': '4B × 25B tokens' }, detail: { en: 'high capacity, undertrained', 'pt-br': 'alta capacidade, subtreinado' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: '20 vs 150 tok/param (27B)', 'pt-br': '20 vs 150 tok/parâm (27B)' },
        caption: {
          en: 'Training past the Chinchilla optimum spends 7.5× more training FLOPs once so every served token later reads 54 GB of weights instead of several hundred.',
          'pt-br': 'Treinar além do ótimo de Chinchilla gasta 7,5× mais FLOPs de treino uma vez para que cada token servido depois leia 54 GB de pesos em vez de várias centenas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chinchilla point (20×)', 'pt-br': 'Ponto Chinchilla (20×)' }, detail: { en: '540B tokens · 8.75e22 FLOPs', 'pt-br': '540B tokens · 8,75e22 FLOPs' }, pigment: 'accent' },
            { label: { en: 'Over-trained (150×)', 'pt-br': 'Over-training (150×)' }, detail: { en: '4.05T tokens · 6.56e23 FLOPs (7.5×)', 'pt-br': '4,05T tokens · 6,56e23 FLOPs (7,5×)' }, pigment: 'caution' },
            {
              label: { en: 'Serving payoff', 'pt-br': 'Retorno no serving' },
              detail: { en: `reads ${WEIGHTS_GB} GB of weights per token forever`, 'pt-br': `lê ${WEIGHTS_GB} GB de pesos por token para sempre` },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 5.6 models lifetime cost C_life = C_train + R * C_infer with the lesson's
   * exact toy units: 100 + 1/M versus 200 + 0.5/M, crossing at 200M requests.
   */
  't5-lifetime-cost-crossover': {
    lesson: '5.6-inference-aware-scaling',
    title: { en: 'When serving demand overtakes training cost', 'pt-br': 'Quando a demanda de serving supera o custo do treino' },
    caption: {
      en: 'Illustrative lifetime cost using the lesson’s made-up units. A model that costs twice as much to train but half as much per request starts behind and wins once lifetime demand passes 200 million requests.',
      'pt-br': 'Custo ilustrativo ao longo da vida usando as unidades inventadas da aula. Um modelo que custa o dobro para treinar mas metade por requisição começa atrás e vence quando a demanda passa de 200 milhões de requisições.',
    },
    steps: [
      {
        label: { en: 'Baseline model', 'pt-br': 'Modelo de referência' },
        caption: {
          en: 'Training costs 100 units once and serving adds 1 unit per million requests. At 10 million requests total cost is 110 (training dominates); at 1 billion requests serving reaches 1,000, ten times training.',
          'pt-br': 'O treino custa 100 unidades uma vez e servir acrescenta 1 unidade por milhão de requisições. Em 10 milhões o total é 110 (o treino domina); em 1 bilhão servir chega a 1.000, dez vezes o treino.',
        },
        body: {
          kind: 'plot',
          ...lifetimeAxes,
          series: [
            {
              ...BASELINE_LIFETIME,
              pigment: 'accent',
              marks: [
                { at: [10, 110], label: { en: '10M: 110', 'pt-br': '10M: 110' } },
                { at: [1000, 1100], label: { en: '1B: 1,100', 'pt-br': '1B: 1.100' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: '2× train, 0.5× serve', 'pt-br': '2× treino, 0,5× serving' },
        caption: {
          en: 'Paying 200 units up front to halve serving to 0.5 units per million requests looks wasteful at 10M (205 vs 110), breaks even at 200M (300 each), and saves 400 units by 1B requests (700 vs 1,100).',
          'pt-br': 'Pagar 200 unidades na largada para cortar o serving à metade (0,5 por milhão) parece caro em 10M (205 vs 110), empata em 200M (300 cada) e economiza 400 unidades em 1B de requisições (700 vs 1.100).',
        },
        body: {
          kind: 'plot',
          ...lifetimeAxes,
          series: [
            BASELINE_LIFETIME,
            {
              label: { en: 'Cheaper-to-serve model: 200 train + 0.5/M serve', 'pt-br': 'Modelo mais barato no serving: 200 treino + 0,5/M serving' },
              pigment: 'success',
              points: [[0, 200], [10, 205], [200, 300], [500, 450], [1000, 700]],
              marks: [
                { at: [200, 300], label: { en: 'Crossover: 200M', 'pt-br': 'Cruzamento: 200M' } },
                { at: [1000, 700], label: { en: '1B: 700', 'pt-br': '1B: 700' } },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 5.7 walks through how ZeRO stages 1, 2, and 3 (FSDP) shrink the lesson's
   * illustrative 432 GB persistent-state budget across 64 GPUs.
   */
  't5-zero-sharding-stages': {
    lesson: '5.7-data-parallelism-zero-fsdp',
    title: { en: 'How ZeRO shrinks 432 GB across 64 GPUs', 'pt-br': 'Como o ZeRO encolhe 432 GB em 64 GPUs' },
    caption: {
      en: 'Per-GPU persistent training state under this lesson’s illustrative mixed-precision AdamW recipe (16 bytes/param × 27B = 432 GB, before activations). That recipe is a planning scenario, not Qwen’s unpublished training configuration.',
      'pt-br': 'Estado persistente de treino por GPU sob a receita ilustrativa de AdamW em mixed precision desta aula (16 bytes/parâm × 27B = 432 GB, antes das ativações). Essa receita é um cenário de planejamento, não a configuração não publicada do Qwen.',
    },
    steps: [
      {
        label: { en: 'Replicated DP', 'pt-br': 'DP replicado' },
        caption: {
          en: 'Every GPU holds the full 432 GB: 54 GB of bf16 weights, 54 GB of bf16 gradients, and 324 GB of fp32 master weights plus AdamW moments. Over five times an 80 GB card.',
          'pt-br': 'Cada GPU guarda os 432 GB completos: 54 GB de pesos bf16, 54 GB de gradientes bf16 e 324 GB de master weights fp32 mais momentos do AdamW. Mais de cinco vezes uma placa de 80 GB.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'bf16 parameters', 'pt-br': 'Parâmetros em bf16' }, detail: { en: `${WEIGHTS_GB} GB (full copy)`, 'pt-br': `${WEIGHTS_GB} GB (cópia inteira)` }, pigment: 'accent', weight: WEIGHTS_GB },
            { label: { en: 'bf16 gradients', 'pt-br': 'Gradientes em bf16' }, detail: { en: `${WEIGHTS_GB} GB (full copy)`, 'pt-br': `${WEIGHTS_GB} GB (cópia inteira)` }, pigment: 'caution', weight: WEIGHTS_GB },
            { label: { en: 'fp32 master + AdamW moments', 'pt-br': 'Master fp32 + momentos AdamW' }, detail: { en: `${OPTIMIZER_GB} GB (full copy)`, 'pt-br': `${OPTIMIZER_GB} GB (cópia inteira)` }, pigment: 'danger', weight: OPTIMIZER_GB },
          ],
        },
      },
      {
        label: { en: 'ZeRO-1 (113 GB)', 'pt-br': 'ZeRO-1 (113 GB)' },
        caption: {
          en: 'Shards only the 324 GB optimizer state across 64 GPUs (5.06 GB each). Weights and gradients stay replicated, so each GPU still needs ~113 GB — still too large for an 80 GB card.',
          'pt-br': 'Faz sharding só dos 324 GB do optimizer entre 64 GPUs (5,06 GB cada). Pesos e gradientes continuam replicados, então cada GPU ainda precisa de ~113 GB — ainda grande demais para uma placa de 80 GB.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'bf16 parameters', 'pt-br': 'Parâmetros em bf16' }, detail: { en: `${WEIGHTS_GB} GB (full copy)`, 'pt-br': `${WEIGHTS_GB} GB (cópia inteira)` }, pigment: 'accent', weight: WEIGHTS_GB },
            { label: { en: 'bf16 gradients', 'pt-br': 'Gradientes em bf16' }, detail: { en: `${WEIGHTS_GB} GB (full copy)`, 'pt-br': `${WEIGHTS_GB} GB (cópia inteira)` }, pigment: 'caution', weight: WEIGHTS_GB },
            { label: { en: 'fp32 optimizer shard (1/64)', 'pt-br': 'Shard do optimizer fp32 (1/64)' }, detail: { en: '5.06 GB on this rank', 'pt-br': '5,06 GB neste rank' }, pigment: 'danger', weight: OPTIMIZER_GB / 64 },
            { label: { en: 'Moved to other 63 GPUs', 'pt-br': 'Movido às outras 63 GPUs' }, detail: { en: '318.94 GB freed per GPU', 'pt-br': '318,94 GB liberados por GPU' }, pigment: 'muted', weight: (OPTIMIZER_GB * 63) / 64 },
          ],
        },
      },
      {
        label: { en: 'ZeRO-2 (59.9 GB)', 'pt-br': 'ZeRO-2 (59,9 GB)' },
        caption: {
          en: 'Shards gradients too (0.84 GB each), dropping per-rank persistent state to ~59.9 GB. It barely fits an 80 GB card, leaving only ~20 GB for activations and buffers.',
          'pt-br': 'Faz sharding dos gradientes também (0,84 GB cada), baixando o estado persistente por rank para ~59,9 GB. Cabe por pouco numa placa de 80 GB, deixando só ~20 GB para ativações e buffers.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'bf16 parameters', 'pt-br': 'Parâmetros em bf16' }, detail: { en: `${WEIGHTS_GB} GB (full copy)`, 'pt-br': `${WEIGHTS_GB} GB (cópia inteira)` }, pigment: 'accent', weight: WEIGHTS_GB },
            { label: { en: 'bf16 gradient shard (1/64)', 'pt-br': 'Shard de gradientes bf16 (1/64)' }, detail: { en: '0.84 GB on this rank', 'pt-br': '0,84 GB neste rank' }, pigment: 'caution', weight: WEIGHTS_GB / 64 },
            { label: { en: 'fp32 optimizer shard (1/64)', 'pt-br': 'Shard do optimizer fp32 (1/64)' }, detail: { en: '5.06 GB on this rank', 'pt-br': '5,06 GB neste rank' }, pigment: 'danger', weight: OPTIMIZER_GB / 64 },
            { label: { en: 'Moved to other 63 GPUs', 'pt-br': 'Movido às outras 63 GPUs' }, detail: { en: '372.10 GB freed per GPU', 'pt-br': '372,10 GB liberados por GPU' }, pigment: 'muted', weight: ((WEIGHTS_GB + OPTIMIZER_GB) * 63) / 64 },
          ],
        },
      },
      {
        label: { en: 'ZeRO-3 / FSDP (6.75 GB)', 'pt-br': 'ZeRO-3 / FSDP (6,75 GB)' },
        caption: {
          en: 'Shards parameters as well (0.84 GB each), cutting persistent state to 6.75 GB per GPU. Full module weights are all-gathered just before use and dropped immediately after.',
          'pt-br': 'Faz sharding dos parâmetros também (0,84 GB cada), cortando o estado persistente para 6,75 GB por GPU. Os pesos completos de cada módulo são reunidos via all-gather na hora do uso e descartados logo depois.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'bf16 parameter shard (1/64)', 'pt-br': 'Shard de parâmetros bf16 (1/64)' }, detail: { en: '0.84 GB persistent', 'pt-br': '0,84 GB persistentes' }, pigment: 'accent', weight: WEIGHTS_GB / 64 },
            { label: { en: 'bf16 gradient shard (1/64)', 'pt-br': 'Shard de gradientes bf16 (1/64)' }, detail: { en: '0.84 GB persistent', 'pt-br': '0,84 GB persistentes' }, pigment: 'caution', weight: WEIGHTS_GB / 64 },
            { label: { en: 'fp32 optimizer shard (1/64)', 'pt-br': 'Shard do optimizer fp32 (1/64)' }, detail: { en: '5.06 GB persistent', 'pt-br': '5,06 GB persistentes' }, pigment: 'danger', weight: OPTIMIZER_GB / 64 },
            { label: { en: 'Moved to other 63 GPUs', 'pt-br': 'Movido às outras 63 GPUs' }, detail: { en: '425.25 GB freed per GPU', 'pt-br': '425,25 GB liberados por GPU' }, pigment: 'muted', weight: (PERSISTENT_GB * 63) / 64 },
          ],
        },
      },
    ],
  },

  /**
   * 5.8 audits Qwen3.8-27B's tensor-parallel divisors dimension by dimension,
   * revealing that the 4 KV heads bind clean splitting before vocab or FFN.
   */
  't5-tp-divisor-audit': {
    lesson: '5.8-model-parallelism',
    title: { en: 'Which dimension caps clean tensor parallelism?', 'pt-br': 'Qual dimensão limita o tensor parallelism limpo?' },
    caption: {
      en: 'Every partitioned dimension must divide evenly by the tensor-parallel degree. In Qwen3.8-27B, grouped-query attention’s 4 KV heads stop dividing cleanly long before the FFN or vocabulary do.',
      'pt-br': 'Toda dimensão particionada precisa dividir igualmente pelo grau de tensor parallel. No Qwen3.8-27B, as 4 KV heads da grouped-query attention deixam de dividir limpo muito antes da FFN ou do vocabulário.',
    },
    steps: [
      {
        label: { en: 'Dimension audit', 'pt-br': 'Auditoria das dimensões' },
        caption: {
          en: 'Vocabulary and FFN split generously, and both query-head paths split through 16 or 24. The 4 KV heads are the smallest divisor and bind clean splitting at degree 4.',
          'pt-br': 'Vocabulário e FFN dividem com folga, e os dois caminhos de query heads dividem até 16 ou 24. As 4 KV heads são o menor divisor e amarram a divisão limpa no grau 4.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: `FFN width (${both(QWEN.ffnIntermediate.value).en})`, 'pt-br': `Largura da FFN (${both(QWEN.ffnIntermediate.value)['pt-br']})` },
              detail: { en: '1,024 × 17 — splits up to TP 1,024', 'pt-br': '1.024 × 17 — divide até TP 1.024' },
              pigment: 'success',
            },
            {
              label: { en: `Vocabulary (${both(QWEN.vocabSize.value).en})`, 'pt-br': `Vocabulário (${both(QWEN.vocabSize.value)['pt-br']})` },
              detail: { en: '512 × 485 — splits up to TP 512', 'pt-br': '512 × 485 — divide até TP 512' },
              pigment: 'success',
            },
            {
              label: { en: `Query heads (${QWEN.queryHeads.value})`, 'pt-br': `Query heads (${QWEN.queryHeads.value})` },
              detail: { en: 'divides by 1, 2, 3, 4, 6, 8, 12, 24', 'pt-br': 'divide por 1, 2, 3, 4, 6, 8, 12, 24' },
              pigment: 'accent',
            },
            {
              label: { en: 'DeltaNet QK heads (16)', 'pt-br': 'Heads QK do DeltaNet (16)' },
              detail: { en: 'clean power-of-two splits up to TP 16', 'pt-br': 'divisões limpas em potência de 2 até TP 16' },
              pigment: 'accent',
            },
            {
              label: { en: `KV heads (${QWEN.kvHeads.value})`, 'pt-br': `KV heads (${QWEN.kvHeads.value})` },
              detail: { en: 'stops at TP 4 — binding constraint', 'pt-br': 'para em TP 4 — restrição que amarra' },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: 'TP 4 versus TP 8', 'pt-br': 'TP 4 contra TP 8' },
        caption: {
          en: 'At degree 4 every projection splits evenly. At degree 8 frameworks still shard Q, FFN and output, but quietly replicate each KV head onto two ranks, raising K/V memory to 1/4 per GPU instead of 1/8.',
          'pt-br': 'No grau 4 toda projeção divide igualmente. No grau 8 os frameworks ainda shardam Q, FFN e saída, mas replicam em silêncio cada KV head em dois ranks, elevando a memória de K/V para 1/4 por GPU em vez de 1/8.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'TP 4 (exact)', 'pt-br': 'TP 4 (exato)' }, detail: { en: '6 Q heads + 1 KV head per GPU', 'pt-br': '6 Q heads + 1 KV head por GPU' }, pigment: 'success' },
            { label: { en: 'TP 8: Q, FFN, output', 'pt-br': 'TP 8: Q, FFN, saída' }, detail: { en: 'still shard cleanly across 8 GPUs', 'pt-br': 'ainda dividem limpo entre 8 GPUs' }, pigment: 'accent' },
            { label: { en: 'TP 8: K and V heads', 'pt-br': 'TP 8: heads K e V' }, detail: { en: '4 heads replicated across pairs of ranks', 'pt-br': '4 heads replicadas entre pares de ranks' }, pigment: 'caution' },
            { label: { en: 'Measured trade', 'pt-br': 'Troca a medir' }, detail: { en: '1/4 K/V memory per GPU, extra traffic', 'pt-br': '1/4 de memória K/V por GPU, tráfego extra' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 5.9 compares how fp32, bf16, fp16 and fp8 divide their bit budgets between
   * sign, exponent (dynamic range) and fraction (local precision).
   */
  't5-float-bit-budgets': {
    lesson: '5.9-mixed-precision',
    title: { en: 'Where each floating-point format spends its bits', 'pt-br': 'Onde cada formato de ponto flutuante gasta seus bits' },
    caption: {
      en: 'Exponent bits buy dynamic range (avoiding overflow and underflow); fraction bits buy local precision (avoiding tiny updates rounding away).',
      'pt-br': 'Bits de expoente compram alcance dinâmico (evitando overflow e underflow); bits de fração compram precisão local (evitando que updates pequenos sumam no arredondamento).',
    },
    steps: [
      {
        label: { en: 'fp32 (32 bits)', 'pt-br': 'fp32 (32 bits)' },
        caption: {
          en: 'Wide range (8 exponent bits) and fine precision (23 explicit fraction bits, 24-bit significand). Keeps 1e-5 updates intact against 1.0, which is why conservative recipes use it for master weights and reductions.',
          'pt-br': 'Alcance amplo (8 bits de expoente) e precisão fina (23 bits explícitos de fração, significando de 24 bits). Preserva updates de 1e-5 contra 1,0, por isso receitas conservadoras o usam em master weights e reduções.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Sign', 'pt-br': 'Sinal' }, detail: { en: '1 bit', 'pt-br': '1 bit' }, pigment: 'muted', weight: 1 },
            { label: { en: 'Exponent (dynamic range)', 'pt-br': 'Expoente (alcance dinâmico)' }, detail: { en: '8 bits — broad range', 'pt-br': '8 bits — alcance amplo' }, pigment: 'accent', weight: 8 },
            { label: { en: 'Fraction (local precision)', 'pt-br': 'Fração (precisão local)' }, detail: { en: '23 bits — tiny steps survive', 'pt-br': '23 bits — passos minúsculos sobrevivem' }, pigment: 'success', weight: 23 },
          ],
        },
      },
      {
        label: { en: 'bf16 (16 bits)', 'pt-br': 'bf16 (16 bits)' },
        caption: {
          en: 'Keeps fp32’s 8-bit exponent so it rarely overflows, but trims the fraction to 7 bits. Near 1.0 the step is 1/128 (~0.0078), so a 1e-5 update rounds back to 1.0 (swamping).',
          'pt-br': 'Mantém os 8 bits de expoente do fp32, então quase nunca transborda, mas encurta a fração para 7 bits. Perto de 1,0 o passo é 1/128 (~0,0078), então um update de 1e-5 arredonda de volta para 1,0 (swamping).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Sign', 'pt-br': 'Sinal' }, detail: { en: '1 bit', 'pt-br': '1 bit' }, pigment: 'muted', weight: 1 },
            { label: { en: 'Exponent (matches fp32)', 'pt-br': 'Expoente (igual ao fp32)' }, detail: { en: '8 bits — rarely overflows', 'pt-br': '8 bits — quase nunca transborda' }, pigment: 'accent', weight: 8 },
            { label: { en: 'Fraction (coarse)', 'pt-br': 'Fração (grosseira)' }, detail: { en: '7 bits — step ~0.0078 near 1.0', 'pt-br': '7 bits — passo ~0,0078 perto de 1,0' }, pigment: 'caution', weight: 7 },
          ],
        },
      },
      {
        label: { en: 'fp16 (16 bits)', 'pt-br': 'fp16 (16 bits)' },
        caption: {
          en: 'More fraction bits than bf16 (10 bits), but only 5 exponent bits (max 65,504). Small gradients underflow to zero unless dynamic loss scaling shifts them into range.',
          'pt-br': 'Mais bits de fração que o bf16 (10 bits), mas só 5 bits de expoente (máximo 65.504). Gradientes pequenos viram zero por underflow sem dynamic loss scaling para colocá-los no alcance.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Sign', 'pt-br': 'Sinal' }, detail: { en: '1 bit', 'pt-br': '1 bit' }, pigment: 'muted', weight: 1 },
            { label: { en: 'Exponent (narrow range)', 'pt-br': 'Expoente (alcance estreito)' }, detail: { en: '5 bits — needs loss scaling', 'pt-br': '5 bits — exige loss scaling' }, pigment: 'danger', weight: 5 },
            { label: { en: 'Fraction (finer than bf16)', 'pt-br': 'Fração (mais fina que bf16)' }, detail: { en: '10 bits — sharper local steps', 'pt-br': '10 bits — passos locais mais finos' }, pigment: 'success', weight: 10 },
          ],
        },
      },
      {
        label: { en: 'fp8 E4M3 (8 bits)', 'pt-br': 'fp8 E4M3 (8 bits)' },
        caption: {
          en: 'Halves storage again (E5M2 trades one fraction bit for one exponent bit). Raw casting saturates or underflows immediately, so working recipes attach per-tensor or per-block scales and accumulate in fp32.',
          'pt-br': 'Corta o armazenamento à metade de novo (o E5M2 troca um bit de fração por um de expoente). Cast bruto satura ou zera na hora, então receitas que funcionam usam escalas por tensor ou por bloco e acumulam em fp32.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Sign', 'pt-br': 'Sinal' }, detail: { en: '1 bit', 'pt-br': '1 bit' }, pigment: 'muted', weight: 1 },
            { label: { en: 'Exponent (4 in E4M3, 5 in E5M2)', 'pt-br': 'Expoente (4 no E4M3, 5 no E5M2)' }, detail: { en: '4 bits — needs explicit scales', 'pt-br': '4 bits — exige escalas explícitas' }, pigment: 'caution', weight: 4 },
            { label: { en: 'Fraction (3 in E4M3, 2 in E5M2)', 'pt-br': 'Fração (3 no E4M3, 2 no E5M2)' }, detail: { en: '3 bits — accumulate in fp32', 'pt-br': '3 bits — acumular em fp32' }, pigment: 'danger', weight: 3 },
          ],
        },
      },
    ],
  },

  /**
   * 5.10 shows why saved activations reach ~96 GiB on the hypothetical uniform
   * full-attention teaching model (8,192 tokens, batch 1) and how segment
   * checkpointing cuts peak activation memory to ~6.5–7.3 GiB.
   */
  't5-activation-checkpoint-memory': {
    lesson: '5.10-gradient-checkpointing',
    title: { en: 'Why activations hit 96 GiB, and how checkpointing cuts them', 'pt-br': 'Por que ativações chegam a 96 GiB, e como o checkpointing as corta' },
    caption: {
      en: 'Shape-based teaching estimate for a hypothetical uniform 64-layer full-attention model (batch 1, 8,192 tokens, bf16). The real Qwen3.8-27B hybrid replaces 48 layers with Gated DeltaNet and must be measured directly.',
      'pt-br': 'Estimativa didática baseada em formatos para um modelo hipotético uniforme de 64 camadas de full attention (batch 1, 8.192 tokens, bf16). O híbrido real Qwen3.8-27B troca 48 camadas por Gated DeltaNet e precisa ser medido diretamente.',
    },
    steps: [
      {
        label: { en: 'No checkpointing (96 GiB)', 'pt-br': 'Sem checkpointing (96 GiB)' },
        caption: {
          en: 'Counting only the residual stream estimates ~5 GiB. Autograd also saves attention intermediates (~30 GiB) and three 17,408-wide FFN tensors per layer (~61 GiB), overflowing an 80 GB card.',
          'pt-br': 'Contar só o residual stream estima ~5 GiB. O autograd também guarda intermediários de attention (~30 GiB) e três tensores de FFN de 17.408 de largura por camada (~61 GiB), estourando uma placa de 80 GB.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Residual stream alone', 'pt-br': 'Residual stream sozinho' }, detail: { en: '~5 GiB (the naive estimate)', 'pt-br': '~5 GiB (a estimativa ingênua)' }, pigment: 'muted', weight: 5 },
            { label: { en: 'Attention & norm tensors', 'pt-br': 'Tensores de attention e norma' }, detail: { en: '~30 GiB across 64 layers', 'pt-br': '~30 GiB nas 64 camadas' }, pigment: 'accent', weight: 30 },
            { label: { en: 'FFN intermediates (17,408 wide)', 'pt-br': 'Intermediários da FFN (largura 17.408)' }, detail: { en: '~61 GiB — dominates the budget', 'pt-br': '~61 GiB — domina o orçamento' }, pigment: 'danger', weight: 61 },
          ],
        },
      },
      {
        label: { en: '16 super-blocks (7.3 GiB)', 'pt-br': '16 super-blocos (7,3 GiB)' },
        caption: {
          en: 'Save only the 16 segment boundaries (1.25 GiB) during forward, then recompute one 4-layer super-block at a time during backward (~6.0 GiB peak), cutting peak activations to ~7.3 GiB.',
          'pt-br': 'Guarde só as 16 fronteiras de segmento (1,25 GiB) no forward e recompute um super-bloco de 4 camadas por vez no backward (~6,0 GiB de pico), baixando o pico de ativações para ~7,3 GiB.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: '16 saved boundaries', 'pt-br': '16 fronteiras salvas' }, detail: { en: '1.25 GiB (80 MiB × 16)', 'pt-br': '1,25 GiB (80 MiB × 16)' }, pigment: 'accent', weight: 1.25 },
            { label: { en: '1 rematerialized super-block', 'pt-br': '1 super-bloco rematerializado' }, detail: { en: '6.0 GiB (4 layers during backward)', 'pt-br': '6,0 GiB (4 camadas no backward)' }, pigment: 'caution', weight: 6.0 },
            { label: { en: 'Forgotten & recomputed later', 'pt-br': 'Esquecido e recomputado depois' }, detail: { en: '~88.75 GiB removed from peak', 'pt-br': '~88,75 GiB removidos do pico' }, pigment: 'muted', weight: 88.75 },
          ],
        },
      },
      {
        label: { en: '64 single layers (6.5 GiB)', 'pt-br': '64 camadas individuais (6,5 GiB)' },
        caption: {
          en: 'Finer segments store more boundaries (5.0 GiB) but rematerialize only one layer at a time (~1.5 GiB). Both dials land near 6–7 GiB with different overhead and overlap.',
          'pt-br': 'Segmentos mais finos guardam mais fronteiras (5,0 GiB), mas rematerializam só uma camada por vez (~1,5 GiB). Os dois ajustes caem perto de 6–7 GiB, com overhead e sobreposição diferentes.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: '64 saved boundaries', 'pt-br': '64 fronteiras salvas' }, detail: { en: '5.0 GiB (80 MiB × 64)', 'pt-br': '5,0 GiB (80 MiB × 64)' }, pigment: 'accent', weight: 5.0 },
            { label: { en: '1 rematerialized layer', 'pt-br': '1 camada rematerializada' }, detail: { en: '1.5 GiB peak during backward', 'pt-br': '1,5 GiB de pico no backward' }, pigment: 'caution', weight: 1.5 },
            { label: { en: 'Forgotten & recomputed later', 'pt-br': 'Esquecido e recomputado depois' }, detail: { en: '~89.5 GiB removed from peak', 'pt-br': '~89,5 GiB removidos do pico' }, pigment: 'muted', weight: 89.5 },
          ],
        },
      },
    ],
  },

  /**
   * 5.11 plots the lesson's exact cosine schedule (3e-4 -> 3e-5 over 2T tokens)
   * and shows what breaks when a step-based schedule meets a doubled batch.
   */
  't5-cosine-step-vs-token': {
    lesson: '5.11-learning-rate-schedules',
    title: { en: 'Same 2T tokens, two schedule units', 'pt-br': 'Os mesmos 2T de tokens, duas unidades de schedule' },
    caption: {
      en: 'Linear warmup to 3e-4 followed by cosine decay toward 3e-5 over a 2-trillion-token budget. Measuring the horizon in steps ties decay progress to batch size instead of data seen.',
      'pt-br': 'Warmup linear até 3e-4 seguido de decaimento cosseno até 3e-5 sobre um orçamento de 2 trilhões de tokens. Medir o horizonte em steps amarra o progresso do decaimento ao tamanho do batch em vez dos dados vistos.',
    },
    steps: [
      {
        label: { en: 'Token-based (planned)', 'pt-br': 'Em tokens (planejado)' },
        caption: {
          en: 'Gentle near peak (2.605e-4 at 0.5T) and floor, steepest through the midpoint (1.65e-4 at 1.0T), reaching the 3e-5 floor right as the 2T budget ends — regardless of batch size.',
          'pt-br': 'Suave perto do pico (2,605e-4 em 0,5T) e do piso, mais íngreme no meio (1,65e-4 em 1,0T), chegando ao piso de 3e-5 exatamente quando o orçamento de 2T termina — qualquer que seja o tamanho do batch.',
        },
        body: {
          kind: 'plot',
          ...lrAxes,
          series: [
            {
              label: { en: 'Token-indexed cosine (3e-4 → 3e-5)', 'pt-br': 'Cosseno por tokens (3e-4 → 3e-5)' },
              pigment: 'accent',
              points: PLANNED_COSINE_POINTS,
              marks: [
                { at: [0.5, cosineLr(0.25)], label: { en: '2.605e-4', 'pt-br': '2,605e-4' } },
                { at: [1.0, cosineLr(0.5)], label: { en: '1.65e-4', 'pt-br': '1,65e-4' } },
                { at: [2.0, 0.3], label: { en: '3e-5 floor', 'pt-br': 'piso 3e-5' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Step-based after 2× batch', 'pt-br': 'Em steps após dobrar o batch' },
        caption: {
          en: 'Doubling the global batch from 4M to 8M tokens consumes all 2T tokens in 250,000 of the 500,000 configured steps. The run stops at p = 0.5, stranded at 1.65e-4 with the second half of decay never run.',
          'pt-br': 'Dobrar o batch global de 4M para 8M de tokens consome todos os 2T de tokens em 250.000 dos 500.000 steps configurados. A run termina em p = 0,5, presa em 1,65e-4 sem nunca rodar a segunda metade do decaimento.',
        },
        body: {
          kind: 'plot',
          ...lrAxes,
          series: [
            {
              label: { en: 'Planned token-indexed curve', 'pt-br': 'Curva planejada por tokens' },
              pigment: 'muted',
              points: PLANNED_COSINE_POINTS,
            },
            {
              label: { en: 'Step-indexed after 2× batch (ends at p = 0.5)', 'pt-br': 'Por steps após 2× batch (para em p = 0,5)' },
              pigment: 'danger',
              points: STRANDED_COSINE_POINTS,
              marks: [
                { at: [2.0, cosineLr(0.5)], label: { en: 'Stranded: 1.65e-4', 'pt-br': 'Preso: 1,65e-4' } },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 5.12 turns the forensic investigation and recovery sequence into a stepped
   * decision flow: read per-rank signal, then branch on whether replay reproduces.
   */
  't5-instability-triage': {
    lesson: '5.12-training-instabilities',
    title: { en: 'Forensic triage when a training alarm fires', 'pt-br': 'Triagem forense quando um alarme de treino dispara' },
    caption: {
      en: 'Preserve the state first, then replay the triggering batch from the last known-good checkpoint. Whether the failure reproduces separates data and numeric bugs from infrastructure faults.',
      'pt-br': 'Preserve o estado primeiro e depois reproduza o batch causador a partir do último checkpoint bom. Se a falha se reproduz ou não separa bugs de dados e numérica de falhas de infraestrutura.',
    },
    steps: [
      {
        label: { en: '1. Read & preserve', 'pt-br': '1. Ler e preservar' },
        caption: {
          en: 'A mild global mean (2.59 across 64 ranks) can hide one failing rank (40.0). Inspect per-rank metrics and preserve checkpoint, RNG, scheduler, and data-cursor state before touching anything.',
          'pt-br': 'Uma média global leve (2,59 em 64 ranks) pode esconder um rank falhando (40,0). Inspecione métricas por rank e preserve checkpoint, RNG, scheduler e cursor de dados antes de mexer em qualquer coisa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Global mean bumps', 'pt-br': 'Média global sobe' }, detail: { en: '2.05 → 2.59 looks mild', 'pt-br': '2,05 → 2,59 parece leve' }, pigment: 'muted' },
            { label: { en: 'Check per-rank view', 'pt-br': 'Abrir visão por rank' }, detail: { en: '63 ranks at 2.0 · rank 41 at 40.0', 'pt-br': '63 ranks em 2,0 · rank 41 em 40,0' }, pigment: 'danger' },
            { label: { en: 'Read norms & logs', 'pt-br': 'Ler normas e logs' }, detail: { en: 'grad norm, activations, restarts', 'pt-br': 'norma de gradiente, ativações, restarts' }, pigment: 'accent' },
            { label: { en: 'Freeze evidence', 'pt-br': 'Congelar evidências' }, detail: { en: 'checkpoint, RNG, cursor, batch ID', 'pt-br': 'checkpoint, RNG, cursor, ID do batch' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2A. Replay reproduces', 'pt-br': '2A. Falha se reproduz' },
        caption: {
          en: 'Replaying the same batch fails again: the cause lives in data, masks, or numerical range. Rerun on one device in wider precision to separate fp16 overflow from corrupted inputs.',
          'pt-br': 'Reproduzir o mesmo batch falha de novo: a causa está nos dados, nas máscaras ou no alcance numérico. Rode num único dispositivo em precisão mais larga para separar overflow de fp16 de entradas corrompidas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Replay same batch', 'pt-br': 'Reproduzir mesmo batch' }, detail: { en: 'from last known-good checkpoint', 'pt-br': 'do último checkpoint bom' }, pigment: 'accent' },
            { label: { en: 'Test wider dtype', 'pt-br': 'Testar dtype mais largo' }, detail: { en: '1 device: isolates precision overflow', 'pt-br': '1 dispositivo: isola overflow de precisão' }, pigment: 'caution' },
            { label: { en: 'Validate inputs', 'pt-br': 'Validar entradas' }, detail: { en: 'token IDs, masks, boundaries, targets', 'pt-br': 'IDs de token, máscaras, fronteiras, alvos' }, pigment: 'accent' },
            { label: { en: 'Targeted recovery', 'pt-br': 'Recuperação dirigida' }, detail: { en: 'lower loss scale or quarantine sample', 'pt-br': 'baixar loss scale ou pôr amostra em quarentena' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2B. Does not reproduce', 'pt-br': '2B. Não se reproduz' },
        caption: {
          en: 'Replaying the batch succeeds: suspect hardware, collectives, memory corruption, or nondeterminism. Compare healthy and failing ranks, replace bad nodes, and roll back weights and data cursor together.',
          'pt-br': 'Reproduzir o batch funciona: suspeite de hardware, coletivos, corrupção de memória ou não determinismo. Compare ranks saudáveis e com falha, troque nós ruins e reverta pesos e cursor de dados juntos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Replay passes', 'pt-br': 'Reprodução passa' }, detail: { en: 'same checkpoint and batch succeed', 'pt-br': 'mesmo checkpoint e batch funcionam' }, pigment: 'muted' },
            { label: { en: 'Audit infrastructure', 'pt-br': 'Auditar infraestrutura' }, detail: { en: 'collectives, memory errors, retries', 'pt-br': 'coletivos, erros de memória, retentativas' }, pigment: 'caution' },
            { label: { en: 'Diff two ranks', 'pt-br': 'Comparar dois ranks' }, detail: { en: 'healthy rank vs failing rank telemetry', 'pt-br': 'telemetria de rank saudável vs com falha' }, pigment: 'accent' },
            { label: { en: 'Replace & resume', 'pt-br': 'Trocar e retomar' }, detail: { en: 'roll back weights + data cursor together', 'pt-br': 'reverter pesos + cursor de dados juntos' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 5.13 traces the end-to-end pretraining cost chain from FLOPs to full
   * program scope, labelling every operational figure as an assumption.
   */
  't5-cost-accounting-chain': {
    lesson: '5.13-pretraining-costs',
    title: { en: 'From model FLOPs to the real program invoice', 'pt-br': 'Dos FLOPs do modelo à fatura real do programa' },
    caption: {
      en: 'Worked accounting chain for a 27B model under explicitly assumed inputs (4T tokens, 1e15 bf16 FLOP/s, 40% MFU, USD 2.50/device-hour, 1.5×–3× program multiplier). None of these operational inputs are published for Qwen3.8-27B.',
      'pt-br': 'Cadeia contábil resolvida para um modelo de 27B sob entradas explicitamente supostas (4T de tokens, 1e15 FLOP/s em bf16, 40% de MFU, USD 2,50/device-hour, multiplicador de programa 1,5×–3×). Nenhuma dessas entradas operacionais é publicada para o Qwen3.8-27B.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: '1. Core + head FLOPs', 'pt-br': '1. FLOPs núcleo + head' },
          detail: { en: '5.88e23 + 3.05e22 = 6.19e23 (assumed 4T)', 'pt-br': '5,88e23 + 3,05e22 = 6,19e23 (4T supostos)' },
          pigment: 'accent',
        },
        {
          label: { en: '2. Device-hours', 'pt-br': '2. Horas de dispositivo' },
          detail: { en: '~430,000 hrs (1e15 FLOP/s, 40% MFU)', 'pt-br': '~430.000 h (1e15 FLOP/s, 40% MFU)' },
          pigment: 'accent',
        },
        {
          label: { en: '3. Wall-clock time', 'pt-br': '3. Tempo de relógio' },
          detail: { en: '~17.5 days on 1,024 accelerators', 'pt-br': '~17,5 dias em 1.024 aceleradores' },
          pigment: 'muted',
        },
        {
          label: { en: '4. Final run only', 'pt-br': '4. Só a run final' },
          detail: { en: '~USD 1.075M (at USD 2.50/hr)', 'pt-br': '~USD 1,075M (a USD 2,50/h)' },
          pigment: 'caution',
        },
        {
          label: { en: '5. Full program', 'pt-br': '5. Programa inteiro' },
          detail: { en: 'USD 1.6M–3.2M + data, storage, staff, energy', 'pt-br': 'USD 1,6M–3,2M + dados, disco, equipe, energia' },
          pigment: 'danger',
        },
      ],
    },
  },

  'moe-maxvio': {
    lesson: '5.14-keeping-experts-busy',
    title: { en: 'A fixed step overshoots', 'pt-br': 'Um passo fixo passa do alvo' },
    caption: {
      en: 'The same 64-token batch, balanced by the sign rule at two step sizes. The larger step falls faster and then oscillates around the target, ending above its own minimum; the smaller step takes longer and settles lower. Both curves come from the same function the lab calls, so the numbers on this figure and in the lab cannot drift apart.',
      'pt-br': 'O mesmo lote de 64 tokens, balanceado pela regra de sinal em dois tamanhos de passo. O passo maior cai mais rápido e depois oscila em torno do alvo, terminando acima do próprio mínimo; o menor demora mais e assenta mais baixo. As duas curvas vêm da mesma função que o laboratório chama, então os números da figura e do laboratório não podem divergir.',
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Update steps', 'pt-br': 'Passos de atualização' },
        scale: 'linear',
        min: 0,
        max: 40,
      },
      yAxis: {
        label: { en: 'MaxVio', 'pt-br': 'MaxVio' },
        scale: 'linear',
        min: 0,
        max: 4.5,
      },
      series: [
        {
          label: { en: 'small step (0.02)', 'pt-br': 'passo pequeno (0,02)' },
          pigment: 'accent',
          points: maxVioSeries(0.02),
        },
        {
          label: { en: 'large step (0.05)', 'pt-br': 'passo grande (0,05)' },
          pigment: 'caution',
          points: maxVioSeries(0.05),
        },
      ],
    },
  },

  'moe-upcycle-slices': {
    lesson: '5.15-upcycling-and-moe-stability',
    title: { en: 'Upcycling cuts the dense FFN into equal slices', 'pt-br': 'O upcycling corta a FFN densa em fatias iguais' },
    caption: {
      en: `The arithmetic is lesson 4.18's: ${MOE.expertWidth.value.toLocaleString('en-US')} times eight is the dense width, so one dense block splits into eight slices of ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'en')}M parameters. Each slice is copied into eight experts, and the 64 experts together store ${millions(MOE.storedFfnPerLayer.value, 'en')}M. At initialization the eight slices together hold the dense block, provided the router draws one from each group; what changes afterwards is which tokens each copy sees.`,
      'pt-br': `A aritmética é a da aula 4.18: ${MOE.expertWidth.value.toLocaleString('pt-BR')} vezes oito é a largura densa, então um bloco denso se divide em oito fatias de ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'pt-br')} M de parâmetros. Cada fatia é copiada para oito experts, e os 64 experts juntos guardam ${millions(MOE.storedFfnPerLayer.value, 'pt-br')} M. Na inicialização as oito fatias juntas guardam o bloco denso, desde que o router tire um expert de cada grupo; o que muda depois é quais tokens cada cópia vê.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Dense FFN, one layer', 'pt-br': 'FFN densa, uma camada' },
          detail: {
            en: `${QWEN.ffnIntermediate.value.toLocaleString('en-US')} wide, ${millions(MOE.denseFfnPerLayer.value, 'en')}M parameters`,
            'pt-br': `${QWEN.ffnIntermediate.value.toLocaleString('pt-BR')} de largura, ${millions(MOE.denseFfnPerLayer.value, 'pt-br')} M de parâmetros`,
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Cut into eight slices', 'pt-br': 'Cortada em oito fatias' },
          detail: {
            en: `${MOE.expertWidth.value.toLocaleString('en-US')} wide each, ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'en')}M each`,
            'pt-br': `${MOE.expertWidth.value.toLocaleString('pt-BR')} de largura cada, ${millions(MOE.activeFfnPerLayer.value / MOE.topK.value, 'pt-br')} M cada`,
          },
          pigment: 'caution',
        },
        {
          label: { en: 'Copy each slice into eight experts', 'pt-br': 'Cada fatia copiada em oito experts' },
          detail: {
            en: `64 experts, ${millions(MOE.storedFfnPerLayer.value, 'en')}M stored`,
            'pt-br': `64 experts, ${millions(MOE.storedFfnPerLayer.value, 'pt-br')} M armazenados`,
          },
          pigment: 'danger',
        },
        {
          label: { en: 'Train on, copies drift apart', 'pt-br': 'Treine, as cópias divergem' },
          detail: {
            en: 'the router starts choosing between identical twins',
            'pt-br': 'o router começa a escolher entre gêmeos idênticos',
          },
          pigment: 'success',
        },
      ],
    },
  },

  'moe-all-to-all-bytes': {
    lesson: '5.16-expert-parallelism',
    title: { en: 'From one copy to ten gigabytes', 'pt-br': 'De uma cópia a dez gigabytes' },
    caption: {
      en: `Dispatch only, one way. One copy carries the ${QWEN.hiddenSize.value.toLocaleString('en-US')}-value hidden state at ${QWEN.bytesPerElement.value} bytes, and top-8 sends eight of them per layer. Sixty-four layers take one token to 5 MiB; a 2,048-token micro-batch takes it to 10 GiB per forward. The combine sends results back, so double these figures for the round trip. Inside a node these bytes cross NVLink; between nodes they cross the cluster fabric, which is why the same traffic costs different time on a different layout.`,
      'pt-br': `Só o despacho, em uma direção. Uma cópia carrega o estado oculto de ${QWEN.hiddenSize.value.toLocaleString('pt-BR')} valores a ${QWEN.bytesPerElement.value} bytes, e o top-8 manda oito delas por camada. Sessenta e quatro camadas levam um token a 5 MiB; um micro-lote de 2.048 tokens leva a 10 GiB por forward. O combine devolve resultados, então dobre estes números para a ida e volta. Dentro de um nó estes bytes cruzam NVLink; entre nós cruzam a rede do cluster, e é por isso que o mesmo tráfego custa tempo diferente em outro arranjo.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'One copy of the token', 'pt-br': 'Uma cópia do token' },
          detail: {
            en: `${QWEN.hiddenSize.value.toLocaleString('en-US')} values × ${QWEN.bytesPerElement.value} B = 10 KiB`,
            'pt-br': `${QWEN.hiddenSize.value.toLocaleString('pt-BR')} valores × ${QWEN.bytesPerElement.value} B = 10 KiB`,
          },
          pigment: 'muted',
        },
        {
          label: { en: 'Top-8, one layer', 'pt-br': 'Top-8, uma camada' },
          detail: {
            en: `8 copies = ${(MOE.dispatchBytesPerTokenPerLayer.value / 1024).toFixed(0)} KiB`,
            'pt-br': `8 cópias = ${(MOE.dispatchBytesPerTokenPerLayer.value / 1024).toFixed(0)} KiB`,
          },
          pigment: 'accent',
        },
        {
          label: { en: '64 layers, one token', 'pt-br': '64 camadas, um token' },
          detail: {
            en: `${(MOE.dispatchBytesPerToken.value / 1024 ** 2).toFixed(0)} MiB`,
            'pt-br': `${(MOE.dispatchBytesPerToken.value / 1024 ** 2).toFixed(0)} MiB`,
          },
          pigment: 'caution',
        },
        {
          label: { en: '2,048-token micro-batch', 'pt-br': 'Micro-lote de 2.048 tokens' },
          detail: {
            en: `${(MOE.dispatchBytesMicroBatch2048.value / 1024 ** 3).toFixed(0)} GiB, one way`,
            'pt-br': `${(MOE.dispatchBytesMicroBatch2048.value / 1024 ** 3).toFixed(0)} GiB, uma direção`,
          },
          pigment: 'danger',
        },
      ],
    },
  },
} as const satisfies Record<string, Figure>
