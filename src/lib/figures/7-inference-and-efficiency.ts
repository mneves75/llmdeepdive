/**
 * Figures for track 7 — Inference & Efficiency.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * Every number here comes from `~/lib/model-facts`. Nothing is derived locally.
 */
import {
  LLAMA_CPP_QUANT_BENCH,
  LLAMA_CPP_QUANT_BENCH_MODEL,
  QWEN,
  QWEN_COMMON_MISTAKE,
} from '~/lib/model-facts'
import type { Figure } from './types'

/** The benchmark rows as plot points, so neither series can drift from the other. */
const benchPoints = (
  metric: 'prefillTokensPerSecond' | 'decodeTokensPerSecond',
): readonly (readonly [number, number])[] =>
  LLAMA_CPP_QUANT_BENCH.map((row) => [row.bitsPerWeight, row[metric]] as const)

export const TRACK_7_FIGURES = {
  /**
   * 7.2 owns the KV-cache derivation for the whole course. The figure walks the
   * same three steps the prose does — including the wrong turn, which is the
   * lesson's actual teaching device and must be shown as wrong rather than
   * quietly corrected.
   */
  'kv-cache-derivation': {
    lesson: '7.2-the-kv-cache',
    title: {
      en: 'Why only 16 of 64 layers cache',
      'pt-br': 'Por que apenas 16 das 64 camadas fazem cache',
    },
    caption: {
      en:
        'The cache grows per token, but only in the full-attention layers. Assuming every layer caches is the classic wrong turn, and it overstates the budget fourfold.',
      'pt-br':
        'O cache cresce por token, mas apenas nas camadas de atenção completa. Supor que toda camada faz cache é o erro clássico, e superestima o orçamento em quatro vezes.',
    },
    steps: [
      {
        label: { en: 'Per layer', 'pt-br': 'Por camada' },
        caption: {
          en: `${QWEN.kvHeads.value} KV heads × ${QWEN.headDim.value} dimensions × 2 (keys and values) × ${QWEN.bytesPerElement.value} bytes = 4 KiB, for every token, in every layer that attends.`,
          'pt-br': `${QWEN.kvHeads.value} cabeças KV × ${QWEN.headDim.value} dimensões × 2 (chaves e valores) × ${QWEN.bytesPerElement.value} bytes = 4 KiB, para cada token, em cada camada que atende.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'KV heads', 'pt-br': 'Cabeças KV' }, detail: { en: String(QWEN.kvHeads.value), 'pt-br': String(QWEN.kvHeads.value) }, pigment: 'accent' },
            { label: { en: 'Head dimension', 'pt-br': 'Dimensão da cabeça' }, detail: { en: String(QWEN.headDim.value), 'pt-br': String(QWEN.headDim.value) }, pigment: 'accent' },
            { label: { en: 'Keys and values', 'pt-br': 'Chaves e valores' }, detail: { en: '× 2', 'pt-br': '× 2' }, pigment: 'sonar' },
            { label: { en: 'bfloat16', 'pt-br': 'bfloat16' }, detail: { en: `× ${QWEN.bytesPerElement.value} B`, 'pt-br': `× ${QWEN.bytesPerElement.value} B` }, pigment: 'sonar' },
            { label: { en: '4 KiB per token', 'pt-br': '4 KiB por token' }, detail: { en: 'per layer', 'pt-br': 'por camada' }, pigment: 'kelp' },
          ],
        },
      },
      {
        label: { en: 'The wrong turn', 'pt-br': 'O erro clássico' },
        caption: {
          en: `Multiply by all ${QWEN.layers.value} layers and you get ${QWEN_COMMON_MISTAKE.kvKibPerTokenIfEveryLayerCached.value} KiB per token, or ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB at full context. This is wrong. It assumes every layer is an attention layer.`,
          'pt-br': `Multiplique pelas ${QWEN.layers.value} camadas e você obtém ${QWEN_COMMON_MISTAKE.kvKibPerTokenIfEveryLayerCached.value} KiB por token, ou ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB no contexto completo. Isso está errado: supõe que toda camada é de atenção.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Assumed: all layers cache', 'pt-br': 'Suposto: todas as camadas fazem cache' },
              detail: { en: `${QWEN.layers.value} layers → ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB`, 'pt-br': `${QWEN.layers.value} camadas → ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB` },
              pigment: 'coral',
              weight: QWEN.layers.value,
            },
          ],
        },
      },
      {
        label: { en: 'The real layout', 'pt-br': 'O layout real' },
        caption: {
          en: `Only ${QWEN.attentionLayers.value} layers are full attention; the other ${QWEN.deltaNetLayers.value} are Gated DeltaNet and cache nothing per token. That gives ${QWEN.kvKibPerToken.value} KiB per token and ${QWEN.kvGibFullContext.value} GiB at full context — beside a DeltaNet state of about ${QWEN.deltaNetStateMib.value} MiB that never grows.`,
          'pt-br': `Apenas ${QWEN.attentionLayers.value} camadas são de atenção completa; as outras ${QWEN.deltaNetLayers.value} são Gated DeltaNet e não fazem cache por token. Isso dá ${QWEN.kvKibPerToken.value} KiB por token e ${QWEN.kvGibFullContext.value} GiB no contexto completo — ao lado de um estado DeltaNet de cerca de ${QWEN.deltaNetStateMib.value} MiB que nunca cresce.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Gated DeltaNet layers', 'pt-br': 'Camadas Gated DeltaNet' },
              detail: { en: `${QWEN.deltaNetLayers.value} layers · ~${QWEN.deltaNetStateMib.value} MiB total, constant`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas · ~${QWEN.deltaNetStateMib.value} MiB no total, constante` },
              pigment: 'kelp',
              weight: QWEN.deltaNetLayers.value,
            },
            {
              label: { en: 'Full-attention layers', 'pt-br': 'Camadas de atenção completa' },
              detail: { en: `${QWEN.attentionLayers.value} layers · ${QWEN.kvKibPerToken.value} KiB per token · ${QWEN.kvGibFullContext.value} GiB at full context`, 'pt-br': `${QWEN.attentionLayers.value} camadas · ${QWEN.kvKibPerToken.value} KiB por token · ${QWEN.kvGibFullContext.value} GiB no contexto completo` },
              pigment: 'sonar',
              weight: QWEN.attentionLayers.value,
            },
          ],
        },
      },
    ],
  },

  /**
   * 7.13 teaches artifact literacy, and this is the artifact: a repository name.
   * A `flow` rather than prose because the point is that the name has FIELDS —
   * five of them, in a fixed order, three standardised and two invented by
   * whoever uploaded it.
   */
  'quant-repo-name-anatomy': {
    lesson: '7.13-choosing-and-judging-a-community-quant',
    title: {
      en: 'Clues a quant repository name may carry',
      'pt-br': 'Pistas que o nome de um repositório de quant pode carregar',
    },
    caption: {
      en: 'Not a standard and not a fixed format — a repository id is free text, and real names omit any of these. Where they do appear, only the base model and the container format mean the same thing to everyone: the recipe label is whatever the publisher chose to call it, and bits per weight is the one clue that is a measurement.',
      'pt-br':
        'Não é um padrão nem um formato fixo — um id de repositório é texto livre, e nomes reais omitem qualquer uma destas. Onde aparecem, apenas o modelo base e o formato de contêiner significam o mesmo para todo mundo: o rótulo da receita é o que o publicador decidiu chamá-lo, e bits por peso é a única pista que é uma medição.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Publisher', 'pt-br': 'Publicador' },
          detail: {
            en: 'mlx-community, or one person. An org name is not a quality signal.',
            'pt-br': 'mlx-community, ou uma pessoa. Nome de organização não é sinal de qualidade.',
          },
          pigment: 'muted',
        },
        {
          label: { en: 'Base model', 'pt-br': 'Modelo base' },
          detail: {
            en: 'Qwen3.8-27B — the weights this was derived from. Standard.',
            'pt-br': 'Qwen3.8-27B — os pesos de onde isto derivou. Padronizado.',
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Container format', 'pt-br': 'Formato de contêiner' },
          detail: {
            en: 'MLX or GGUF — which runtimes can load it at all. Standard.',
            'pt-br': 'MLX ou GGUF — quais runtimes conseguem carregá-lo. Padronizado.',
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Recipe label', 'pt-br': 'Rótulo da receita' },
          detail: {
            en: 'iQ, oQ4e, 4bit. Only GGUF’s Q and IQ names mean anything outside their author’s head.',
            'pt-br':
              'iQ, oQ4e, 4bit. Só os nomes Q e IQ do GGUF significam algo fora da cabeça do autor.',
          },
          pigment: 'coral',
        },
        {
          label: { en: 'Bits per weight', 'pt-br': 'Bits por peso' },
          detail: {
            en: '3.8bpw — an average over every tensor, metadata included. A number, not a name.',
            'pt-br': '3.8bpw — média sobre cada tensor, metadados inclusos. Um número, não um nome.',
          },
          pigment: 'kelp',
        },
      ],
    },
  },

  /**
   * The lesson's evidence. Two series on ONE log axis rather than two plots or a
   * ratio: 29.17 and 923.49 tokens per second cannot share a linear axis, and
   * normalising them to a baseline would hide the raw numbers a reader needs in
   * order to check the source. The divergence IS the figure — one line falls,
   * the other does not move.
   */
  'bpw-vs-throughput': {
    lesson: '7.13-choosing-and-judging-a-community-quant',
    title: {
      en: `What fewer bits actually buy (${LLAMA_CPP_QUANT_BENCH_MODEL})`,
      'pt-br': `O que menos bits realmente compram (${LLAMA_CPP_QUANT_BENCH_MODEL})`,
    },
    caption: {
      en: `Measured on ${LLAMA_CPP_QUANT_BENCH_MODEL}, not on Qwen3.8-27B. Decode nearly triples as bits per weight fall from 16 to 2, because decode is memory-bound. Prefill is compute-bound and stays flat — it is the one thing quantization does not fix. Note also that Q4_K_M measures 4.8944 bits per weight, not 4: the label rounds, the number does not.`,
      'pt-br': `Medido em ${LLAMA_CPP_QUANT_BENCH_MODEL}, não no Qwen3.8-27B. O decode quase triplica conforme os bits por peso caem de 16 para 2, porque o decode é limitado por memória. O prefill é limitado por computação e permanece plano — é a única coisa que a quantization não resolve. Note também que Q4_K_M mede 4,8944 bits por peso, não 4: o rótulo arredonda, o número não.`,
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Bits per weight', 'pt-br': 'Bits por peso' },
        scale: 'linear',
        min: 0,
        max: 16,
        unit: 'bpw',
      },
      /**
       * Domain 10..2000, not 20..1000, and the margin is the whole point. The
       * tight domain put prefill within 3% of the frame's top edge — drawn,
       * technically correct, and invisible against the border — while the 1,000
       * tick landed at exactly 100% and was clipped away. A log axis needs a
       * decade of air above and below the data or the reader sees one series.
       */
      yAxis: {
        label: { en: 'Throughput', 'pt-br': 'Vazão' },
        scale: 'log',
        min: 10,
        max: 2000,
        unit: 'tok/s',
      },
      series: [
        {
          label: { en: 'Decode (generation)', 'pt-br': 'Decode (geração)' },
          pigment: 'accent',
          points: benchPoints('decodeTokensPerSecond'),
          marks: [
            {
              at: [LLAMA_CPP_QUANT_BENCH[1].bitsPerWeight, LLAMA_CPP_QUANT_BENCH[1].decodeTokensPerSecond],
              label: { en: 'Q4_K_M · 4.8944 bpw', 'pt-br': 'Q4_K_M · 4,8944 bpw' },
            },
          ],
        },
        {
          label: { en: 'Prefill (prompt processing)', 'pt-br': 'Prefill (processamento do prompt)' },
          pigment: 'muted',
          points: benchPoints('prefillTokensPerSecond'),
          marks: [
            {
              at: [LLAMA_CPP_QUANT_BENCH[3].bitsPerWeight, LLAMA_CPP_QUANT_BENCH[3].prefillTokensPerSecond],
              label: { en: 'F16 baseline', 'pt-br': 'Linha de base F16' },
            },
          ],
        },
      ],
    },
  },
} as const satisfies Record<string, Figure>
