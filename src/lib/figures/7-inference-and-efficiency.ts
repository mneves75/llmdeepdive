/**
 * Figures for track 7 — Inference & Efficiency.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * Every number here comes from `~/lib/model-facts`, or from a `~/lib/lab-math`
 * function called with those facts, so a figure and its lab cannot disagree.
 */
import { formatNumber } from '~/lib/i18n'
import {
  LLAMA_CPP_QUANT_BENCH,
  LLAMA_CPP_QUANT_BENCH_MODEL,
  MOE,
  QWEN,
  QWEN_COMMON_MISTAKE,
} from '~/lib/model-facts'
import { kvCounterfactual } from '~/lib/lab-math'
import { SAMPLING_PRESETS, sampleDistribution } from '~/lib/sampling-math'
import type { Figure, FigureStep, Localised } from './types'

/** A model fact formatted for each locale's prose (248,320 / 248.320). */
const both = (value: number): Localised => ({
  en: formatNumber('en', value),
  'pt-br': formatNumber('pt-br', value),
})

/** Gigabytes with the locale's decimal separator: 293.6 GB / 293,6 GB. */
const gb = (value: number, locale: 'en' | 'pt-br'): string => {
  const text = value.toFixed(1)
  return `${locale === 'pt-br' ? text.replace('.', ',') : text} GB`
}

/** Percentage with one decimal place in each locale (43.0% / 43,0%). */
const pct = (value: number, locale: 'en' | 'pt-br'): string => {
  const text = (value * 100).toFixed(1)
  return `${locale === 'pt-br' ? text.replace('.', ',') : text}%`
}

/** 7.4: survivor bands for the `code` preset under Qwen's two recommended presets. */
const CODE_PRESET = SAMPLING_PRESETS.find((preset) => preset.id === 'code')
if (!CODE_PRESET) throw new Error('missing code preset in SAMPLING_PRESETS')

const samplingBands = (temperature: number, topP: number): readonly FigureStep[] => {
  const result = sampleDistribution({
    candidates: CODE_PRESET.candidates,
    temperature,
    topK: 20,
    topP,
    minP: 0,
  })
  if (!result) throw new Error('invalid sampling preset inputs')
  return result.tokens
    .filter((token) => token.kept)
    .map((token, index): FigureStep => ({
      label: { en: `Token "${token.token}"`, 'pt-br': `Token "${token.token}"` },
      detail: {
        en: `logit ${token.logit.toFixed(1)} · final probability ${pct(token.finalProb, 'en')}`,
        'pt-br': `logit ${token.logit.toFixed(1).replace('.', ',')} · probabilidade final ${pct(token.finalProb, 'pt-br')}`,
      },
      pigment: index === 0 ? 'accent' : 'caution',
      weight: Number((token.finalProb * 100).toFixed(2)),
    }))
}

const THINKING_BANDS = samplingBands(1.0, 0.95)
const INSTRUCT_BANDS = samplingBands(0.7, 0.8)

/** 7.6: full-context KV GiB for 24, 4 and 1 KV heads in Qwen3.8-27B's 16 full-attention layers. */
const fullContextGib = (kvHeads: number): number => kvCounterfactual({
  kvHeads,
  headDim: QWEN.headDim.value,
  cachedLayers: QWEN.attentionLayers.value,
  totalLayers: QWEN.layers.value,
  bytes: QWEN.bytesPerElement.value,
  context: QWEN.contextNative.value,
  stateMibPerRecurrentLayer: QWEN.deltaNetStateMib.value / QWEN.deltaNetLayers.value,
}).gibPerSequence
const MHA_FULL_GIB = fullContextGib(QWEN.queryHeads.value)
const GQA_FULL_GIB = fullContextGib(QWEN.kvHeads.value)
const MQA_FULL_GIB = fullContextGib(1)

/** 7.8: 80 GB bf16 state pool (23.3 GiB = 23,859 MiB, owned by lesson 9.3). */
const POOL_80GB_MIB = 23859
const FULL_CONTEXT_KV_MIB = QWEN.kvGibFullContext.value * 1024
const SESSION_32K_KV_MIB = 2048
const DELTANET_STATE_MIB = QWEN.deltaNetStateMib.value

/** The benchmark rows as plot points, so neither series can drift from the other. */
const benchPoints = (
  metric: 'prefillTokensPerSecond' | 'decodeTokensPerSecond',
): readonly (readonly [number, number])[] =>
  LLAMA_CPP_QUANT_BENCH.map((row) => [row.bitsPerWeight, row[metric]] as const)

/**
 * Look a benchmark row up by the name it is labelled with, never by position.
 * A mark carries a hard-coded label naming one method, so pinning it to an array
 * index means inserting a row silently moves that label onto a different
 * measurement — and the figure would then disagree with its own data table.
 * The table has already grown from 4 rows to 16 once; it will grow again.
 */
const benchRow = (method: string) => {
  const row = LLAMA_CPP_QUANT_BENCH.find((candidate) => candidate.method === method)
  if (!row) throw new Error(`no benchmark row named ${method} in LLAMA_CPP_QUANT_BENCH`)
  return row
}

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
            { label: { en: 'Keys and values', 'pt-br': 'Chaves e valores' }, detail: { en: '× 2', 'pt-br': '× 2' }, pigment: 'caution' },
            { label: { en: 'bfloat16', 'pt-br': 'bfloat16' }, detail: { en: `× ${QWEN.bytesPerElement.value} B`, 'pt-br': `× ${QWEN.bytesPerElement.value} B` }, pigment: 'caution' },
            { label: { en: '4 KiB per token', 'pt-br': '4 KiB por token' }, detail: { en: 'per layer', 'pt-br': 'por camada' }, pigment: 'success' },
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
              pigment: 'danger',
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
              pigment: 'success',
              weight: QWEN.deltaNetLayers.value,
            },
            {
              label: { en: 'Full-attention layers', 'pt-br': 'Camadas de atenção completa' },
              detail: { en: `${QWEN.attentionLayers.value} layers · ${QWEN.kvKibPerToken.value} KiB per token · ${QWEN.kvGibFullContext.value} GiB at full context`, 'pt-br': `${QWEN.attentionLayers.value} camadas · ${QWEN.kvKibPerToken.value} KiB por token · ${QWEN.kvGibFullContext.value} GiB no contexto completo` },
              pigment: 'caution',
              weight: QWEN.attentionLayers.value,
            },
          ],
        },
      },
    ],
  },

  /**
   * 7.13 teaches artifact literacy, and this is the artifact: a repository name.
   * A `flow` rather than prose because these clues do arrive in a rough order —
   * but they are clues, NOT fields. A Hub id is free text, real names omit any
   * of them, and only two of the five mean the same thing to every publisher.
   * Presenting them as a fixed schema would teach a parser that does not exist.
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
            en: 'Qwen3.8-27B — the weights this was derived from. Same to everyone.',
            'pt-br': 'Qwen3.8-27B — os pesos de onde isto derivou. Igual para todos.',
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Container format', 'pt-br': 'Formato de contêiner' },
          detail: {
            en: 'MLX or GGUF — which runtimes can load it at all. Same to everyone.',
            'pt-br': 'MLX ou GGUF — quais runtimes conseguem carregá-lo. Igual para todos.',
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Recipe label', 'pt-br': 'Rótulo da receita' },
          detail: {
            en: 'iQ, oQ4e, 4bit. Only GGUF’s Q and IQ names mean the same thing beyond the publisher who chose them.',
            'pt-br':
              'iQ, oQ4e, 4bit. Só os nomes Q e IQ do GGUF significam o mesmo para além do publicador que os escolheu.',
          },
          pigment: 'danger',
        },
        {
          label: { en: 'Bits per weight', 'pt-br': 'Bits por peso' },
          detail: {
            en: '3.8bpw — an average over every tensor, metadata included. A number, not a name.',
            'pt-br': '3.8bpw — média sobre cada tensor, metadados inclusos. Um número, não um nome.',
          },
          pigment: 'success',
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
      en: `Measured on ${LLAMA_CPP_QUANT_BENCH_MODEL}, not on Qwen3.8-27B. In this benchmark, quantized decode ranges from 1.75 to 3.09 times the 29.17 tokens per second of unquantized F16: Q8_0 reaches 50.93 and Q2_K_S reaches 90.01. But below 8 bits the line stops descending tidily — Q2_K_S at 2.97 bpw is the fastest row here, and Q4_K_S outruns the smaller Q3_K_S — so in that range kernel efficiency decides speed, not size. Prefill is compute-bound and never improves; it slips from 923 to 709 tokens per second, because dequantizing is extra arithmetic.`,
      'pt-br': `Medido em ${LLAMA_CPP_QUANT_BENCH_MODEL}, não no Qwen3.8-27B. Neste benchmark, a vazão do decode quantizado varia de 1,75 a 3,09 vezes os 29,17 tokens por segundo do F16 sem quantization: o Q8_0 alcança 50,93 e o Q2_K_S alcança 90,01. Mas abaixo de 8 bits a linha para de descer de forma organizada — o Q2_K_S, com 2,97 bpw, é a linha mais rápida daqui, e o Q4_K_S supera o menor Q3_K_S —, então nessa faixa quem decide a velocidade é a eficiência do kernel, não o tamanho. O prefill é limitado por computação e nunca melhora; ele cai de 923 para 709 tokens por segundo, porque desquantizar é aritmética extra.`,
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Bits per weight', 'pt-br': 'Bits por peso' },
        scale: 'linear',
        min: 0,
        // 17, not 16: F16 measures 16.0005 bpw, so a domain ending at exactly 16
        // excludes the very point the figure has to plot. Ticks are unchanged
        // (0, 5, 10, 15) because the 1/2/5 step lands on 5 either way.
        max: 17,
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
              at: [benchRow('Q4_K_M').bitsPerWeight, benchRow('Q4_K_M').decodeTokensPerSecond],
              label: { en: 'Q4_K_M', 'pt-br': 'Q4_K_M' },
            },
          ],
        },
        {
          label: { en: 'Prefill (prompt processing)', 'pt-br': 'Prefill (processamento do prompt)' },
          pigment: 'muted',
          points: benchPoints('prefillTokensPerSecond'),
          marks: [
            {
              at: [benchRow('F16').bitsPerWeight, benchRow('F16').prefillTokensPerSecond],
              label: { en: 'F16 baseline', 'pt-br': 'Linha de base F16' },
            },
          ],
        },
      ],
    },
  },

  'moe-serving-memory': {
    lesson: '7.14-serving-an-moe',
    title: { en: 'Storage falls faster than reads', 'pt-br': 'O armazenamento cai mais rápido que as leituras' },
    caption: {
      en: `The model from lesson 4.18, which does not ship: it stores ${MOE.totalStored.value.toLocaleString('en-US')} parameters with about 27 billion active. Each row shows what the whole model holds and what one decoded token reads. Quantizing the routed experts to 4 bits cuts storage ${(MOE.weightsGbBf16.value / MOE.servingGbExpertsInt4.value).toFixed(1)} times, but reads only from ${gb(MOE.readsPerTokenBf16.value, 'en')} to ${gb(MOE.readsPerTokenExpertsInt4.value, 'en')}, because attention and the embeddings are every token's cost and stay in bf16.`,
      'pt-br': `O modelo da aula 4.18, que não é publicado assim: guarda ${MOE.totalStored.value.toLocaleString('pt-BR')} parâmetros com cerca de 27 bilhões ativos. Cada linha mostra o que o modelo inteiro guarda e o que um token decodificado lê. Quantizar os experts roteados para 4 bits corta o armazenamento ${(MOE.weightsGbBf16.value / MOE.servingGbExpertsInt4.value).toFixed(1).replace('.', ',')} vezes, mas as leituras só caem de ${gb(MOE.readsPerTokenBf16.value, 'pt-br')} para ${gb(MOE.readsPerTokenExpertsInt4.value, 'pt-br')}, porque atenção e embeddings são custo de todo token e ficam em bf16.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Dense model, bf16', 'pt-br': 'Modelo denso, bf16' },
          detail: {
            en: `${gb(QWEN.weightsGbBf16.value, 'en')} stored · ${gb(MOE.readsPerTokenBf16.value, 'en')} read per token`,
            'pt-br': `${gb(QWEN.weightsGbBf16.value, 'pt-br')} armazenados · ${gb(MOE.readsPerTokenBf16.value, 'pt-br')} lidos por token`,
          },
          pigment: 'muted',
        },
        {
          label: { en: 'MoE, everything bf16', 'pt-br': 'MoE, tudo em bf16' },
          detail: {
            en: `${gb(MOE.weightsGbBf16.value, 'en')} stored · the same read per token`,
            'pt-br': `${gb(MOE.weightsGbBf16.value, 'pt-br')} armazenados · a mesma leitura por token`,
          },
          pigment: 'danger',
        },
        {
          label: { en: 'Routed experts at 4 bits', 'pt-br': 'Experts roteados em 4 bits' },
          detail: {
            en: `${gb(MOE.servingGbExpertsInt4.value, 'en')} stored · ${gb(MOE.readsPerTokenExpertsInt4.value, 'en')} read per token`,
            'pt-br': `${gb(MOE.servingGbExpertsInt4.value, 'pt-br')} armazenados · ${gb(MOE.readsPerTokenExpertsInt4.value, 'pt-br')} lidos por token`,
          },
          pigment: 'caution',
        },
        {
          label: { en: 'Every active weight at 4 bits', 'pt-br': 'Todo peso ativo em 4 bits' },
          detail: {
            en: `${gb(MOE.servingGbAllInt4.value, 'en')} stored · ${gb(MOE.readsPerTokenAllInt4.value, 'en')} read per token`,
            'pt-br': `${gb(MOE.servingGbAllInt4.value, 'pt-br')} armazenados · ${gb(MOE.readsPerTokenAllInt4.value, 'pt-br')} lidos por token`,
          },
          pigment: 'success',
        },
      ],
    },
  },

  /**
   * 7.1 traces one request end to end and distinguishes the one-time prefill
   * pass from the token-by-token decode loop. Replaces the numbered decode-loop
   * walkthrough and the closing pipeline recap.
   */
  't7-request-lifecycle': {
    lesson: '7.1-what-actually-happens-when-you-hit-send',
    title: {
      en: 'One request, from send to streamed words',
      'pt-br': 'Uma requisição, do envio às palavras em streaming',
    },
    caption: {
      en: `Admission, templating, tokenization and prefill run once per prompt. Decode then repeats one forward pass per generated token while incremental detokenization streams UTF-8 text back.`,
      'pt-br': `Admissão, templating, tokenização e prefill rodam uma vez por prompt. O decode então repete um forward pass por token gerado enquanto a detokenização incremental envia texto UTF-8 em streaming.`,
    },
    steps: [
      {
        label: { en: 'Admission & tokens', 'pt-br': 'Admissão e tokens' },
        caption: {
          en: `The gateway enforces limits before GPU work starts, the chat template wraps roles and thinking tags, the tokenizer maps text into ${both(QWEN.tokenizerMappedIds.value).en} mapped ids (the model’s output table is padded to ${both(QWEN.vocabSize.value).en} rows), and the scheduler checks KV-cache headroom.`,
          'pt-br': `O gateway aplica limites antes de qualquer trabalho na GPU, o chat template envolve papéis e tags de thinking, o tokenizer mapeia texto em ${both(QWEN.tokenizerMappedIds.value)['pt-br']} ids mapeados (a tabela de saída do modelo tem padding para ${both(QWEN.vocabSize.value)['pt-br']} linhas) e o scheduler verifica a folga de KV cache.`,
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Gateway', 'pt-br': 'Gateway' },
              detail: { en: 'auth, quota, schema, rate limit', 'pt-br': 'autenticação, cota, schema, limite de taxa' },
              pigment: 'muted',
            },
            {
              label: { en: 'Chat template', 'pt-br': 'Template de chat' },
              detail: { en: 'system, user, assistant & thinking tags', 'pt-br': 'tags de sistema, usuário, assistente e thinking' },
              pigment: 'accent',
            },
            {
              label: { en: 'Tokenizer', 'pt-br': 'Tokenizer' },
              detail: {
                en: `text → integer ids (${both(QWEN.tokenizerMappedIds.value).en} mapped ids)`,
                'pt-br': `texto → ids inteiros (${both(QWEN.tokenizerMappedIds.value)['pt-br']} ids mapeados)`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Scheduler', 'pt-br': 'Scheduler' },
              detail: { en: 'checks KV budget, joins continuous batch', 'pt-br': 'checa orçamento de KV e entra no batch contínuo' },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'Prefill (one pass)', 'pt-br': 'Prefill (uma passagem)' },
        caption: {
          en: `All prompt tokens run through all ${QWEN.layers.value} layers in parallel. Only the ${QWEN.attentionLayers.value} full-attention layers write per-token K/V; the ${QWEN.deltaNetLayers.value} Gated DeltaNet layers update fixed-size states.`,
          'pt-br': `Todos os tokens do prompt atravessam as ${QWEN.layers.value} camadas em paralelo. Só as ${QWEN.attentionLayers.value} camadas de full attention gravam K/V por token; as ${QWEN.deltaNetLayers.value} camadas de Gated DeltaNet atualizam estados fixos.`,
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'All prompt tokens', 'pt-br': 'Todos os tokens do prompt' },
              detail: { en: 'processed in parallel, causal mask on', 'pt-br': 'processados em paralelo, com máscara causal' },
              pigment: 'accent',
            },
            {
              label: { en: `${QWEN.attentionLayers.value} attention layers`, 'pt-br': `${QWEN.attentionLayers.value} camadas de attention` },
              detail: { en: 'write keys and values for every position', 'pt-br': 'gravam keys e values de cada posição' },
              pigment: 'caution',
            },
            {
              label: { en: `${QWEN.deltaNetLayers.value} DeltaNet layers`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas DeltaNet` },
              detail: { en: 'fold prompt into fixed-size state', 'pt-br': 'condensam o prompt em estado de tamanho fixo' },
              pigment: 'success',
            },
            {
              label: { en: 'First logits', 'pt-br': 'Primeiros logits' },
              detail: {
                en: `${both(QWEN.vocabSize.value).en} padded output rows for token 1 only`,
                'pt-br': `${both(QWEN.vocabSize.value)['pt-br']} linhas de saída (com padding) só para o token 1`,
              },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'Decode loop & stream', 'pt-br': 'Loop de decode e streaming' },
        caption: {
          en: 'Baseline decoding loops once per output token — about 500 target passes for a 500-token reply — while incremental detokenization buffers UTF-8 bytes and streams text to the caller.',
          'pt-br': 'O decode de base repete o loop uma vez por token de saída — cerca de 500 passagens do target para uma resposta de 500 tokens — enquanto a detokenização incremental acumula bytes UTF-8 e faz streaming do texto.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Sampler', 'pt-br': 'Sampler' },
              detail: { en: 'picks 1 token from logits (temp, top-p, top-k)', 'pt-br': 'escolhe 1 token dos logits (temp, top-p, top-k)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Append token', 'pt-br': 'Anexar token' },
              detail: { en: 'extends the sequence by 1 position', 'pt-br': 'estende a sequência em 1 posição' },
              pigment: 'accent',
            },
            {
              label: { en: '1-token forward pass', 'pt-br': 'Passagem de 1 token' },
              detail: { en: 'reuses cached state → fresh logits; repeats', 'pt-br': 'reusa estado em cache → logits novos; repete' },
              pigment: 'danger',
            },
            {
              label: { en: 'Detokenize & stream', 'pt-br': 'Detokenizar e transmitir' },
              detail: { en: 'buffers partial UTF-8 bytes; stops on cancel', 'pt-br': 'guarda bytes UTF-8 parciais; para ao cancelar' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 7.3 contrasts compute-bound prefill against bandwidth-bound batch-1 decode
   * and shows how the hybrid layout keeps 48 of 64 layers' decode traffic flat.
   * Replaces the two-bullet prefill-vs-decode comparison before the formula.
   */
  't7-prefill-vs-decode': {
    lesson: '7.3-prefill-vs-decode-two-different-machines',
    title: {
      en: 'Two machines on the same weights',
      'pt-br': 'Duas máquinas sobre os mesmos pesos',
    },
    caption: {
      en: `Prefill reuses each weight byte across thousands of prompt tokens; batch-1 decode streams roughly ${QWEN.weightsGbBf16.value} GB of bf16 weights to produce one token. At 100,000 cached tokens, only the ${QWEN.attentionLayers.value} attention layers add growing KV reads.`,
      'pt-br': `O prefill reaproveita cada byte de peso em milhares de tokens do prompt; o decode em batch 1 lê cerca de ${QWEN.weightsGbBf16.value} GB de pesos em bf16 para produzir um token. A 100.000 tokens em cache, só as ${QWEN.attentionLayers.value} camadas de attention somam leituras crescentes de KV.`,
    },
    steps: [
      {
        label: { en: 'Prefill (8,192 tokens)', 'pt-br': 'Prefill (8.192 tokens)' },
        caption: {
          en: 'Every weight is fetched once and multiplied by all 8,192 prompt rows in parallel: about 8,192 operations per weight byte, pushing toward the GPU compute ceiling and setting time to first token.',
          'pt-br': 'Cada peso é buscado uma vez e multiplicado por todas as 8.192 linhas do prompt em paralelo: cerca de 8.192 operações por byte de peso, encostando no teto de computação da GPU e definindo o time to first token.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Read weights once', 'pt-br': 'Ler pesos uma vez' },
              detail: { en: `~${QWEN.weightsGbBf16.value} GB bf16 checkpoint`, 'pt-br': `checkpoint bf16 de ~${QWEN.weightsGbBf16.value} GB` },
              pigment: 'muted',
            },
            {
              label: { en: 'Multiply 8,192 rows', 'pt-br': 'Multiplicar 8.192 linhas' },
              detail: { en: 'full prompt matrix in parallel', 'pt-br': 'matriz inteira do prompt em paralelo' },
              pigment: 'accent',
            },
            {
              label: { en: 'High intensity', 'pt-br': 'Alta intensidade' },
              detail: { en: '~8,192 ops per weight byte', 'pt-br': '~8.192 operações por byte de peso' },
              pigment: 'success',
            },
            {
              label: { en: 'Compute-bound', 'pt-br': 'Limitado por compute' },
              detail: { en: 'governs time to first token', 'pt-br': 'governa o time to first token' },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'Decode (batch 1)', 'pt-br': 'Decode (lote 1)' },
        caption: {
          en: 'Each step fetches most of the ~54 GB checkpoint for a single new token: about 1 operation per weight byte, starving arithmetic units so memory bandwidth governs inter-token latency.',
          'pt-br': 'Cada passo busca quase todo o checkpoint de ~54 GB para um único token novo: cerca de 1 operação por byte de peso, deixando a aritmética ociosa para que a largura de banda governe a inter-token latency.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Read weights once', 'pt-br': 'Ler pesos uma vez' },
              detail: { en: `~${QWEN.weightsGbBf16.value} GB planning approximation`, 'pt-br': `aproximação de planejamento de ~${QWEN.weightsGbBf16.value} GB` },
              pigment: 'danger',
            },
            {
              label: { en: 'Multiply 1 row', 'pt-br': 'Multiplicar 1 linha' },
              detail: { en: 'one new token position only', 'pt-br': 'apenas uma nova posição de token' },
              pigment: 'caution',
            },
            {
              label: { en: 'Low intensity', 'pt-br': 'Baixa intensidade' },
              detail: { en: '~1 op per weight byte', 'pt-br': '~1 operação por byte de peso' },
              pigment: 'danger',
            },
            {
              label: { en: 'Bandwidth-bound', 'pt-br': 'Limitado por banda' },
              detail: { en: 'governs inter-token latency', 'pt-br': 'governa a inter-token latency' },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: 'Decode bytes at 100k', 'pt-br': 'Bytes do decode em 100k' },
        caption: {
          en: `Illustrative single-step traffic at 100,000 cached tokens: ~${QWEN.weightsGbBf16.value} GB weights, ~6 GiB growing KV across ${QWEN.attentionLayers.value} attention layers (${QWEN.kvKibPerToken.value} KiB/tok), and ${QWEN.deltaNetStateMib.value} MiB constant DeltaNet state across ${QWEN.deltaNetLayers.value} layers.`,
          'pt-br': `Tráfego ilustrativo de um passo a 100.000 tokens em cache: ~${QWEN.weightsGbBf16.value} GB de pesos, ~6 GiB de KV crescente nas ${QWEN.attentionLayers.value} camadas de attention (${QWEN.kvKibPerToken.value} KiB/tok) e ${QWEN.deltaNetStateMib.value} MiB constantes de estado DeltaNet nas ${QWEN.deltaNetLayers.value} camadas.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Model weights (bf16)', 'pt-br': 'Pesos do modelo (bf16)' },
              detail: { en: `~${QWEN.weightsGbBf16.value} GB planning approx. per step`, 'pt-br': `aproximação de ~${QWEN.weightsGbBf16.value} GB por passo` },
              pigment: 'danger',
              weight: QWEN.weightsGbBf16.value,
            },
            {
              label: { en: `${QWEN.attentionLayers.value} attention layers (KV cache)`, 'pt-br': `${QWEN.attentionLayers.value} camadas de attention (KV cache)` },
              detail: { en: '~6 GiB at 100,000 tokens (grows with context)', 'pt-br': '~6 GiB em 100.000 tokens (cresce com o contexto)' },
              pigment: 'caution',
              weight: 6.1,
            },
            {
              label: { en: `${QWEN.deltaNetLayers.value} DeltaNet layers (state)`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas DeltaNet (estado)` },
              detail: { en: `${QWEN.deltaNetStateMib.value} MiB reference float32 — constant at any length`, 'pt-br': `${QWEN.deltaNetStateMib.value} MiB na referência float32 — constante em qualquer tamanho` },
              pigment: 'success',
              weight: 0.14,
            },
          ],
        },
      },
    ],
  },

  /**
   * 7.4 explains the exact order of sampling stages and compares Qwen's two
   * recommended presets on the same `code` preset logits from `sampling-math.ts`.
   * Replaces the closing step-by-step sentence.
   */
  't7-sampling-pipeline': {
    lesson: '7.4-sampling',
    title: {
      en: 'From logits to one sampled token',
      'pt-br': 'Dos logits até um token amostrado',
    },
    caption: {
      en: 'The model only produces scores; decoding reshapes, filters, renormalizes and draws one token. Steps 2 and 3 apply Qwen3.8-27B’s thinking and instruct temperature/truncation presets to the same six illustrative code-completion logits from the lab below (instruct mode also recommends presence_penalty = 1.5, which penalizes already-seen tokens).',
      'pt-br': 'O modelo apenas produz pontuações; o decoding remodela, filtra, renormaliza e sorteia um token. Os passos 2 e 3 aplicam os presets thinking e instruct de temperature e truncamento do Qwen3.8-27B aos mesmos seis logits ilustrativos de código do laboratório abaixo (o modo instruct também recomenda presence_penalty = 1,5, que penaliza tokens já emitidos).',
    },
    steps: [
      {
        label: { en: 'Pipeline order', 'pt-br': 'Ordem do pipeline' },
        caption: {
          en: `Temperature rescales the ${both(QWEN.vocabSize.value).en} raw logits before softmax; truncation filters remove tail candidates; renormalization restores probabilities summing to 1; the random number generator draws one token.`,
          'pt-br': `A temperature reescala os ${both(QWEN.vocabSize.value)['pt-br']} logits brutos antes do softmax; os filtros de truncamento removem a cauda; a renormalização restaura a soma 1; o gerador de números aleatórios sorteia um token.`,
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Logits', 'pt-br': 'Logits' },
              detail: { en: `${both(QWEN.vocabSize.value).en} raw scores`, 'pt-br': `${both(QWEN.vocabSize.value)['pt-br']} pontuações brutas` },
              pigment: 'muted',
            },
            {
              label: { en: 'Temperature', 'pt-br': 'Temperature' },
              detail: { en: 'divide each score by T', 'pt-br': 'divide cada escore por T' },
              pigment: 'accent',
            },
            {
              label: { en: 'Softmax', 'pt-br': 'Softmax' },
              detail: { en: 'probabilities summing to 1', 'pt-br': 'probabilidades somando 1' },
              pigment: 'accent',
            },
            {
              label: { en: 'Truncation', 'pt-br': 'Truncamento' },
              detail: { en: 'top-k, min-p, top-p cut tail', 'pt-br': 'top-k, min-p, top-p cortam a cauda' },
              pigment: 'caution',
            },
            {
              label: { en: 'Renormalize', 'pt-br': 'Renormalizar' },
              detail: { en: 'survivors sum to 1 again', 'pt-br': 'sobreviventes somam 1 de novo' },
              pigment: 'caution',
            },
            {
              label: { en: 'Draw & append', 'pt-br': 'Sortear e anexar' },
              detail: { en: 'RNG picks 1 token; loop repeats', 'pt-br': 'RNG sorteia 1 token; loop repete' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Thinking (T=1.0, p=0.95, pres=0.0)', 'pt-br': 'Thinking (T=1,0, p=0,95, pres=0,0)' },
        caption: {
          en: 'On the lab’s illustrative code preset ("def fib(n): return …"), thinking settings (presence_penalty = 0.0) keep 5 of 6 candidates ("None" is cut) and leave the leader "n" at 43.0%.',
          'pt-br': 'No preset ilustrativo de código do laboratório ("def fib(n): return …"), os ajustes de thinking (presence_penalty = 0,0) mantêm 5 de 6 candidatos ("None" é cortado) e deixam o líder "n" em 43,0%.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: THINKING_BANDS,
        },
      },
      {
        label: { en: 'Instruct (T=0.7, p=0.80, pres=1.5)', 'pt-br': 'Instruct (T=0,7, p=0,80, pres=1,5)' },
        caption: {
          en: 'Cooling to T = 0.7 and tightening top-p to 0.80 drops "0", "[" and "None", leaving 3 survivors and lifting "n" to 56.6% on this single-step slice; the full model-card instruct preset also sets presence_penalty = 1.5 to discourage repeating tokens across a generation.',
          'pt-br': 'Esfriar para T = 0,7 e apertar o top-p para 0,80 corta "0", "[" e "None", deixando 3 sobreviventes e elevando "n" para 56,6% neste passo isolado; o preset instruct completo do model card também define presence_penalty = 1,5 para desestimular repetição de tokens ao longo da geração.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: INSTRUCT_BANDS,
        },
      },
    ],
  },

  /**
   * 7.5 explains speculative decoding as a three-stage round: draft proposes k
   * tokens cheaply, target verifies all k in one parallel pass, then accepted
   * tokens commit with one replacement token (or a bonus token when all k pass).
   * Replaces the 3-item numbered list in the speculative decoding section.
   */
  't7-speculative-verify': {
    lesson: '7.5-beam-search-speculative-decoding-and-medusa',
    title: {
      en: 'One speculative round, four drafted tokens',
      'pt-br': 'Uma rodada especulativa, quatro tokens rascunhados',
    },
    caption: {
      en: `Illustrative k = 4 round. Total arithmetic rises, yet latency drops because one ~${QWEN.weightsGbBf16.value} GB target weight read verifies all four proposals together; standard speculative rejection sampling preserves the target’s exact output distribution (Medusa’s typical-acceptance variant relaxes that exact match).`,
      'pt-br': `Rodada ilustrativa com k = 4. A aritmética total sobe, mas a latência cai porque uma única leitura de ~${QWEN.weightsGbBf16.value} GB de pesos do target verifica as quatro propostas juntas; a amostragem por rejeição especulativa padrão preserva a distribuição exata do target (a variante de typical acceptance do Medusa relaxa essa equivalência exata).`,
    },
    steps: [
      {
        label: { en: 'Draft proposes k=4', 'pt-br': 'Draft propõe k=4' },
        caption: {
          en: 'A small autoregressive draft model proposes four candidate tokens cheaply one after another; alternatively, multiple Medusa heads predict future positions in parallel from the same hidden state (and Qwen3.8-27B’s native MTP heads can likewise act as built-in drafters).',
          'pt-br': 'Um draft model autorregressivo pequeno propõe quatro tokens candidatos de forma barata, um após o outro; como alternativa, múltiplas heads do Medusa preveem posições futuras em paralelo a partir do mesmo estado oculto (e as heads nativas de MTP do Qwen3.8-27B também podem atuar como drafters embutidos).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Proposal 1', 'pt-br': 'Proposta 1' }, detail: { en: '"the" · cheap draft step', 'pt-br': '"the" · passo barato de draft' }, pigment: 'muted' },
            { label: { en: 'Proposal 2', 'pt-br': 'Proposta 2' }, detail: { en: '"quick" · cheap draft step', 'pt-br': '"quick" · passo barato de draft' }, pigment: 'muted' },
            { label: { en: 'Proposal 3', 'pt-br': 'Proposta 3' }, detail: { en: '"brown" · cheap draft step', 'pt-br': '"brown" · passo barato de draft' }, pigment: 'muted' },
            { label: { en: 'Proposal 4', 'pt-br': 'Proposta 4' }, detail: { en: '"cat" · cheap draft step', 'pt-br': '"cat" · passo barato de draft' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Target checks in 1 pass', 'pt-br': 'Target confere em 1 passagem' },
        caption: {
          en: 'The target model scores all four positions in one parallel pass (the shape of a short prefill), comparing draft and target probabilities at each position.',
          'pt-br': 'O target model pontua todas as quatro posições numa única passagem paralela (o formato de um prefill curto), comparando as probabilidades do draft e do target em cada posição.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: `1 weight read (~${QWEN.weightsGbBf16.value} GB)`, 'pt-br': `1 leitura de pesos (~${QWEN.weightsGbBf16.value} GB)` },
              detail: { en: 'shared across all 4 proposals', 'pt-br': 'dividida entre as 4 propostas' },
              pigment: 'accent',
            },
            { label: { en: '"the" · accept', 'pt-br': '"the" · aceito' }, detail: { en: 'passes probability check', 'pt-br': 'passa na regra de probabilidade' }, pigment: 'success' },
            { label: { en: '"quick" · accept', 'pt-br': '"quick" · aceito' }, detail: { en: 'passes probability check', 'pt-br': 'passa na regra de probabilidade' }, pigment: 'success' },
            { label: { en: '"brown" · reject', 'pt-br': '"brown" · rejeitado' }, detail: { en: 'first mismatch; later suffix dropped', 'pt-br': 'primeira divergência; sufixo descartado' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Commit + corrected token', 'pt-br': 'Efetivar + token corrigido' },
        caption: {
          en: 'Accepted tokens commit in order, the rejected suffix ("cat") is discarded, and on this rejection one replacement token ("fox") is sampled from the adjusted residual distribution (a "bonus" token is instead the extra k+1-th token sampled when all k drafts are accepted) — three tokens emitted from one target pass.',
          'pt-br': 'Os tokens aceitos são efetivados em ordem, o sufixo rejeitado ("cat") é descartado e, nessa rejeição, um token de substituição ("fox") é amostrado da distribuição residual ajustada (um token "bônus" é o token extra k+1 amostrado quando todos os k rascunhos são aceitos) — três tokens emitidos numa passagem do target.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '"the"', 'pt-br': '"the"' }, detail: { en: 'committed', 'pt-br': 'efetivado' }, pigment: 'success' },
            { label: { en: '"quick"', 'pt-br': '"quick"' }, detail: { en: 'committed', 'pt-br': 'efetivado' }, pigment: 'success' },
            { label: { en: '"fox"', 'pt-br': '"fox"' }, detail: { en: 'replacement from residual distribution', 'pt-br': 'substituição da distribuição residual' }, pigment: 'accent' },
            { label: { en: '"cat"', 'pt-br': '"cat"' }, detail: { en: 'discarded; cache freed', 'pt-br': 'descartado; cache liberado' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 7.6 places MQA, Qwen's GQA and same-geometry MHA on the KV-head-count axis,
   * then contrasts MLA as leaving that axis entirely. Replaces the closing
   * four-bullet spectrum list.
   */
  't7-kv-sharing-spectrum': {
    lesson: '7.6-mqa-gqa-and-mla',
    title: {
      en: 'Shrinking KV heads — and leaving that axis with MLA',
      'pt-br': 'Encolhendo cabeças KV — e saindo desse eixo com o MLA',
    },
    caption: {
      en: `On Qwen3.8-27B’s ${QWEN.attentionLayers.value} full-attention layers (head dimension ${QWEN.headDim.value}, bf16, ${both(QWEN.contextNative.value).en} tokens), cache size scales strictly with KV head count — until MLA replaces per-head K/V caching with a compressed latent vector plus a decoupled RoPE key.`,
      'pt-br': `Nas ${QWEN.attentionLayers.value} camadas de full attention do Qwen3.8-27B (head dimension ${QWEN.headDim.value}, bf16, ${both(QWEN.contextNative.value)['pt-br']} tokens), o tamanho do cache escala estritamente com o número de cabeças KV — até o MLA trocar o cache por cabeça por um vetor latente comprimido mais a chave de RoPE desacoplado.`,
    },
    steps: [
      {
        label: { en: 'Head-sharing axis (MQA / GQA / MHA)', 'pt-br': 'Eixo de compartilhamento (MQA / GQA / MHA)' },
        caption: {
          en: `Qwen3.8-27B’s GQA (${QWEN.kvHeads.value} KV heads for ${QWEN.queryHeads.value} query heads) cuts full-context KV cache 6× versus same-geometry MHA (${MHA_FULL_GIB} GiB → ${GQA_FULL_GIB} GiB); MQA (${MQA_FULL_GIB} GiB) pushes sharing to 1 head.`,
          'pt-br': `O GQA do Qwen3.8-27B (${QWEN.kvHeads.value} cabeças KV para ${QWEN.queryHeads.value} de query) reduz em 6× o KV cache em contexto completo frente ao MHA de mesma geometria (${MHA_FULL_GIB} GiB → ${GQA_FULL_GIB} GiB); o MQA (${MQA_FULL_GIB} GiB) leva o compartilhamento a 1 cabeça.`,
        },
        body: {
          kind: 'plot',
          xAxis: {
            label: { en: 'KV heads per caching layer', 'pt-br': 'Cabeças KV por camada com cache' },
            scale: 'linear',
            min: 0,
            max: 26,
          },
          yAxis: {
            label: { en: 'Full-context KV cache (16 layers)', 'pt-br': 'KV cache em contexto total (16 camadas)' },
            scale: 'linear',
            min: 0,
            max: 110,
            unit: 'GiB',
          },
          series: [
            {
              label: { en: 'Qwen geometry (4 GiB per KV head)', 'pt-br': 'Geometria do Qwen (4 GiB por cabeça KV)' },
              pigment: 'accent',
              points: [
                [1, MQA_FULL_GIB],
                [QWEN.kvHeads.value, GQA_FULL_GIB],
                [QWEN.queryHeads.value, MHA_FULL_GIB],
              ],
              marks: [
                { at: [1, MQA_FULL_GIB], label: { en: 'MQA · 4 GiB', 'pt-br': 'MQA · 4 GiB' } },
                { at: [QWEN.kvHeads.value, GQA_FULL_GIB], label: { en: 'Qwen GQA · 16 GiB', 'pt-br': 'GQA do Qwen · 16 GiB' } },
                { at: [QWEN.queryHeads.value, MHA_FULL_GIB], label: { en: 'MHA · 96 GiB', 'pt-br': 'MHA · 96 GiB' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'MLA: off the head-count axis', 'pt-br': 'MLA: fora do eixo de cabeças' },
        caption: {
          en: 'Multi-head latent attention does not pick a group count. It caches both a compressed KV latent vector and a small decoupled RoPE key per token, then projects full keys and values back out on demand.',
          'pt-br': 'A multi-head latent attention não escolhe uma contagem de grupos. Ela guarda no cache tanto um vetor latente comprimido de KV quanto uma pequena chave de RoPE desacoplado por token, e projeta keys e values completos de volta sob demanda.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Token state', 'pt-br': 'Estado do token' },
              detail: { en: 'hidden vector entering layer', 'pt-br': 'vetor oculto entrando na camada' },
              pigment: 'muted',
            },
            {
              label: { en: 'Down-projection', 'pt-br': 'Projeção de compressão' },
              detail: { en: 'learned compression to low-dim latent', 'pt-br': 'compressão aprendida para latente compacto' },
              pigment: 'accent',
            },
            {
              label: { en: 'Latent + RoPE key cache', 'pt-br': 'Cache latente + chave RoPE' },
              detail: { en: 'stores compressed KV latent plus decoupled RoPE key', 'pt-br': 'guarda o latente comprimido de KV mais a chave de RoPE desacoplado' },
              pigment: 'success',
            },
            {
              label: { en: 'Reconstruct K & V', 'pt-br': 'Reconstruir K e V' },
              detail: { en: 'up-projections combine with cached decoupled RoPE key', 'pt-br': 'projeções de expansão combinam com a chave RoPE em cache' },
              pigment: 'caution',
            },
          ],
        },
      },
    ],
  },

  /**
   * 7.7 contrasts naive HBM score materialization (128 GiB per head at 262k)
   * against FlashAttention's SRAM tiling and online softmax rescaling using
   * the lesson's exact [1.0, 3.0] then [5.0] worked example.
   */
  't7-online-softmax-tiling': {
    lesson: '7.7-flashattention-and-io-awareness',
    title: {
      en: 'Why naive attention explodes HBM, and how SRAM tiling avoids it',
      'pt-br': 'Por que a attention ingênua estoura a HBM, e como tiles na SRAM evitam isso',
    },
    caption: {
      en: `At ${both(QWEN.contextNative.value).en} tokens, one head’s full score matrix takes 128 GiB in bf16 — larger than an 80 GB GPU. FlashAttention keeps tiles in on-chip SRAM and rescales running row statistics so the final output is exact.`,
      'pt-br': `Em ${both(QWEN.contextNative.value)['pt-br']} tokens, a matriz inteira de scores de um único head ocupa 128 GiB em bf16 — mais do que uma GPU de 80 GB. O FlashAttention mantém tiles na SRAM on-chip e reescala estatísticas correntes por linha para produzir o resultado exato.`,
    },
    steps: [
      {
        label: { en: 'Naive HBM round-trips', 'pt-br': 'Idas e vindas na HBM' },
        caption: {
          en: 'Standard attention materializes the full N × N score matrix in slow HBM, reads it back for softmax, writes probabilities back out, and reads them again to multiply V — impossible at 128 GiB per head.',
          'pt-br': 'A attention padrão materializa a matriz inteira N × N de scores na HBM lenta, lê de volta para o softmax, grava probabilidades de novo e lê mais uma vez para multiplicar V — impossível a 128 GiB por head.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Write QKᵀ to HBM', 'pt-br': 'Gravar QKᵀ na HBM' }, detail: { en: '128 GiB for 1 head (~48 TiB for 16 layers)', 'pt-br': '128 GiB por 1 head (~48 TiB nas 16 camadas)' }, pigment: 'danger' },
            { label: { en: 'Read scores back', 'pt-br': 'Reler os scores' }, detail: { en: 'slow HBM read for row softmax', 'pt-br': 'leitura lenta da HBM para softmax por linha' }, pigment: 'danger' },
            { label: { en: 'Write probs to HBM', 'pt-br': 'Gravar probs na HBM' }, detail: { en: 'another 128 GiB matrix write', 'pt-br': 'mais uma escrita de matriz de 128 GiB' }, pigment: 'danger' },
            { label: { en: 'Read probs × V', 'pt-br': 'Ler probs × V' }, detail: { en: 'fourth full-matrix trip; out of memory', 'pt-br': 'quarta viagem completa; falta memória' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'SRAM tile 1: [1.0, 3.0]', 'pt-br': 'Tile 1 na SRAM: [1,0, 3,0]' },
        caption: {
          en: `FlashAttention loads small Q, K and V tiles into fast on-chip SRAM (at Qwen’s head dim ${QWEN.headDim.value}, a 128-row K tile is 64 KiB) and tracks only each row’s running maximum m and exponential sum ℓ.`,
          'pt-br': `O FlashAttention carrega tiles pequenos de Q, K e V na SRAM on-chip rápida (com head dim ${QWEN.headDim.value} do Qwen, um tile K de 128 linhas tem 64 KiB) e guarda só o máximo corrente m e a soma exponencial ℓ de cada linha.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Load tile 1 in SRAM', 'pt-br': 'Carregar tile 1 na SRAM' }, detail: { en: '64 KiB K + 64 KiB V at d = 256', 'pt-br': '64 KiB K + 64 KiB V em d = 256' }, pigment: 'accent' },
            { label: { en: 'Local scores [1.0, 3.0]', 'pt-br': 'Scores locais [1,0, 3,0]' }, detail: { en: 'computed on chip, never saved to HBM', 'pt-br': 'calculados no chip, nunca gravados na HBM' }, pigment: 'accent' },
            { label: { en: 'Row max m₁ = 3', 'pt-br': 'Máximo m₁ = 3' }, detail: { en: 'prevents exponential overflow', 'pt-br': 'impede estouro das exponenciais' }, pigment: 'caution' },
            { label: { en: 'Running sum ℓ₁ ≈ 1.135', 'pt-br': 'Soma corrente ℓ₁ ≈ 1,135' }, detail: { en: 'e^(1−3) + e^(3−3) ≈ 0.135 + 1', 'pt-br': 'e^(1−3) + e^(3−3) ≈ 0,135 + 1' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'SRAM tile 2: [5.0] + rescale', 'pt-br': 'Tile 2 na SRAM: [5,0] + reescala' },
        caption: {
          en: 'When a larger score arrives (5.0), online softmax rescales the previous sum and partial output by e^(3−5) = e⁻² before adding the new term — matching exact whole-row softmax with O(N) extra memory.',
          'pt-br': 'Quando chega um score maior (5,0), o softmax online reescala a soma anterior e a saída parcial por e^(3−5) = e⁻² antes de somar o novo termo — igualando o softmax exato da linha inteira com memória extra O(N).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'New max m_new = 5', 'pt-br': 'Novo máximo m_new = 5' }, detail: { en: 'exceeds old max 3', 'pt-br': 'supera o máximo antigo 3' }, pigment: 'caution' },
            { label: { en: 'Rescale old sum', 'pt-br': 'Reescalar soma antiga' }, detail: { en: 'ℓ₁ × e⁻² ≈ 0.154 (same on output)', 'pt-br': 'ℓ₁ × e⁻² ≈ 0,154 (idem na saída)' }, pigment: 'accent' },
            { label: { en: 'Add new term', 'pt-br': 'Somar novo termo' }, detail: { en: '+ e^(5−5) = 1 → ℓ ≈ 1.154 (matches whole-row)', 'pt-br': '+ e^(5−5) = 1 → ℓ ≈ 1,154 (igual à linha inteira)' }, pigment: 'success' },
            { label: { en: 'Write final O once', 'pt-br': 'Gravar O final uma vez' }, detail: { en: 'only output leaves chip to HBM', 'pt-br': 'só a saída final vai do chip à HBM' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 7.8 contrasts reserving max-context buffers (1 user in lesson 9.3's 23.3 GiB
   * state pool) against PagedAttention (10 users at 32k tokens in the exact same
   * pool) plus continuous batching at every token step.
   */
  't7-paged-kv-and-batching': {
    lesson: '7.8-pagedattention-and-continuous-batching',
    title: {
      en: 'From 1 user to 10 in the same 23.3 GiB state pool',
      'pt-br': 'De 1 usuário para 10 no mesmo pool de estado de 23,3 GiB',
    },
    caption: {
      en: `Uses lesson 9.3’s 23.3 GiB (23,859 MiB) bf16 state pool on an 80 GB GPU and lesson 7.2’s ${QWEN.kvKibPerToken.value} KiB/token KV cost plus ${DELTANET_STATE_MIB} MiB fixed DeltaNet state. Paging removes reservation waste; continuous batching refills finished slots every step.`,
      'pt-br': `Usa o pool de estado em bf16 de 23,3 GiB (23.859 MiB) numa GPU de 80 GB (aula 9.3) e o custo de ${QWEN.kvKibPerToken.value} KiB/token de KV mais ${DELTANET_STATE_MIB} MiB fixos de estado DeltaNet (aula 7.2). A paginação elimina o desperdício de reserva; o continuous batching preenche vagas a cada passo.`,
    },
    steps: [
      {
        label: { en: 'Max reservation (1 user)', 'pt-br': 'Reserva máxima (1 usuário)' },
        caption: {
          en: 'Reserving Qwen3.8-27B’s full 262,144-token context up front takes 16,384 MiB of KV plus 144 MiB of reference DeltaNet state (16,528 MiB total), leaving 7,331 MiB (~7.16 GiB) — far short of a second 16,528 MiB reservation — so the 80 GB card serves one user while most of that buffer sits empty.',
          'pt-br': 'Reservar antecipadamente o contexto completo de 262.144 tokens do Qwen3.8-27B consome 16.384 MiB de KV mais 144 MiB de estado DeltaNet de referência (16.528 MiB no total), deixando 7.331 MiB (~7,16 GiB) — longe de uma segunda reserva de 16.528 MiB —, então a placa de 80 GB serve um usuário enquanto quase todo o buffer fica vazio.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: '1 reserved KV cache (262k max)', 'pt-br': '1 KV cache reservado (máx. 262k)' },
              detail: { en: '16,384 MiB (16 GiB) — mostly unused', 'pt-br': '16.384 MiB (16 GiB) — quase todo ocioso' },
              pigment: 'danger',
              weight: FULL_CONTEXT_KV_MIB,
            },
            {
              label: { en: '1 × fixed DeltaNet state', 'pt-br': '1 × estado fixo DeltaNet' },
              detail: { en: `${DELTANET_STATE_MIB} MiB reference float32 (48 layers)`, 'pt-br': `${DELTANET_STATE_MIB} MiB na referência float32 (48 camadas)` },
              pigment: 'caution',
              weight: DELTANET_STATE_MIB,
            },
            {
              label: { en: 'Unusable remainder', 'pt-br': 'Restante inutilizável' },
              detail: { en: '7,331 MiB (< 16,528 MiB; cannot fit user 2)', 'pt-br': '7.331 MiB (< 16.528 MiB; não cabe o usuário 2)' },
              pigment: 'muted',
              weight: POOL_80GB_MIB - FULL_CONTEXT_KV_MIB - DELTANET_STATE_MIB,
            },
          ],
        },
      },
      {
        label: { en: 'Paged blocks (10 users at 32k)', 'pt-br': 'Blocos paginados (10 usuários em 32k)' },
        caption: {
          en: 'Handing out 1 MiB blocks (16 tokens each) on demand via per-sequence block tables lets ten 32,768-token sessions fit side by side: 2,048 MiB KV + 144 MiB DeltaNet = 2,192 MiB each, with 1,939 MiB still free.',
          'pt-br': 'Entregar blocos de 1 MiB (16 tokens cada) sob demanda via block tables por sequência faz caber dez sessões de 32.768 tokens lado a lado: 2.048 MiB de KV + 144 MiB de DeltaNet = 2.192 MiB cada, ainda sobrando 1.939 MiB livres.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: '10 × paged KV cache (32,768 tokens)', 'pt-br': '10 × KV cache paginado (32.768 tokens)' },
              detail: { en: '10 × 2,048 MiB = 20,480 MiB (16 attention layers)', 'pt-br': '10 × 2.048 MiB = 20.480 MiB (16 camadas de attention)' },
              pigment: 'accent',
              weight: 10 * SESSION_32K_KV_MIB,
            },
            {
              label: { en: '10 × fixed DeltaNet state', 'pt-br': '10 × estado fixo DeltaNet' },
              detail: { en: `10 × ${DELTANET_STATE_MIB} MiB = ${both(10 * DELTANET_STATE_MIB).en} MiB (48 layers)`, 'pt-br': `10 × ${DELTANET_STATE_MIB} MiB = ${both(10 * DELTANET_STATE_MIB)['pt-br']} MiB (48 camadas)` },
              pigment: 'caution',
              weight: 10 * DELTANET_STATE_MIB,
            },
            {
              label: { en: 'Free pool headroom', 'pt-br': 'Folga livre no pool' },
              detail: { en: '1,939 MiB unallocated blocks', 'pt-br': '1.939 MiB em blocos não alocados' },
              pigment: 'success',
              weight: POOL_80GB_MIB - 10 * (SESSION_32K_KV_MIB + DELTANET_STATE_MIB),
            },
          ],
        },
      },
      {
        label: { en: 'Continuous batching (each step)', 'pt-br': 'Continuous batching (cada passo)' },
        caption: {
          en: 'At every token-step boundary, completed or canceled sequences release blocks via reference counts, waiting requests enter as soon as blocks are available, and active sequences advance one token.',
          'pt-br': 'A cada fronteira de passo de token, sequências concluídas ou canceladas devolvem blocos via contagem de referências, requisições em espera entram assim que há blocos livres e as ativas avançam um token.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Block table lookup', 'pt-br': 'Consulta à block table' }, detail: { en: 'logical order → scattered 1 MiB blocks', 'pt-br': 'ordem lógica → blocos físicos de 1 MiB' }, pigment: 'accent' },
            { label: { en: 'Finished leave', 'pt-br': 'Concluídas saem' }, detail: { en: 'ref-counts drop; blocks return to pool', 'pt-br': 'ref-counts caem; blocos voltam ao pool' }, pigment: 'muted' },
            { label: { en: 'Waiting enter', 'pt-br': 'Em espera entram' }, detail: { en: 'admitted by countable free blocks', 'pt-br': 'admitidas por blocos livres contáveis' }, pigment: 'success' },
            { label: { en: 'Active step +1', 'pt-br': 'Ativas avançam +1' }, detail: { en: 'long prefills chunked to avoid stalls', 'pt-br': 'prefills longos fatiados para evitar travas' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 7.9 shows the quantization ladder for Qwen3.8-27B, the toy rounding-vs-clipping
   * mechanics at scale 0.1, and why scale granularity isolates outliers. Replaces
   * the three-bullet ladder list.
   */
  't7-quantization-ladder': {
    lesson: '7.9-quantization-i-int8-int4-the-basics',
    title: {
      en: 'From 54 GB to 4-bit codes: ladder, rounding and scale groups',
      'pt-br': 'De 54 GB a códigos de 4 bits: escada, arredondamento e grupos de escala',
    },
    caption: {
      en: 'Quantization stores weights in fewer bits plus scale metadata. Real near-4-bit files sit above the 13.5 GB pure-code floor because scales and protected tensors ship alongside the codes; the KV cache still grows in bf16 unless quantized separately.',
      'pt-br': 'A quantization guarda pesos em menos bits mais metadados de escala. Arquivos reais próximos de 4 bits ficam acima do piso puro de 13,5 GB porque escalas e tensores protegidos vão junto; o KV cache segue crescendo em bf16 salvo quantization própria.',
    },
    steps: [
      {
        label: { en: 'Weight ladder (Qwen3.8-27B)', 'pt-br': 'Escada de pesos (Qwen3.8-27B)' },
        caption: {
          en: 'Halving bytes per parameter walks weights from 54 GB (bf16) to ~27 GB (int8) toward a 13.5 GB pure 4-bit floor; pinned near-4-bit GGUF text files span 15.7–17.9 GB, with Q4_K_M at 17.1 GB (15.93 GiB).',
          'pt-br': 'Cortar bytes por parâmetro pela metade desce os pesos de 54 GB (bf16) para ~27 GB (int8) rumo ao piso puro de 13,5 GB em 4 bits; arquivos GGUF de texto próximos de 4 bits ficam em 15,7–17,9 GB, com Q4_K_M em 17,1 GB (15,93 GiB).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'bf16 (2 B/param)', 'pt-br': 'bf16 (2 B/parâm.)' }, detail: { en: `~${QWEN.weightsGbBf16.value} GB baseline`, 'pt-br': `~${QWEN.weightsGbBf16.value} GB de linha de base` }, pigment: 'danger' },
            { label: { en: 'int8 (1 B/param)', 'pt-br': 'int8 (1 B/parâm.)' }, detail: { en: '~27 GB (half of bf16)', 'pt-br': '~27 GB (metade de bf16)' }, pigment: 'caution' },
            { label: { en: 'Pinned Q4_K_M (text)', 'pt-br': 'Q4_K_M fixado (texto)' }, detail: { en: '17.1 GB (15.93 GiB) incl. scales & kept tensors', 'pt-br': '17,1 GB (15,93 GiB) com escalas e tensores mantidos' }, pigment: 'accent' },
            { label: { en: 'Pure int4 floor (0.5 B)', 'pt-br': 'Piso int4 puro (0,5 B)' }, detail: { en: '13.5 GB theoretical codes only', 'pt-br': '13,5 GB teórico só de códigos' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Rounding vs clipping (s = 0.1)', 'pt-br': 'Arredondamento vs clipping (s = 0,1)' },
        caption: {
          en: 'With signed 4-bit codes from −8 to 7 and scale 0.1, an in-range weight (0.234) suffers tiny rounding error (0.034), while an out-of-range weight (1.5) hits the ceiling at 7 and suffers large clipping error (0.8).',
          'pt-br': 'Com códigos de 4 bits com sinal de −8 a 7 e escala 0,1, um peso na faixa (0,234) sofre erro pequeno de arredondamento (0,034), enquanto um peso fora da faixa (1,5) bate no teto 7 e sofre erro grande de clipping (0,8).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Divide by scale 0.1', 'pt-br': 'Dividir pela escala 0,1' }, detail: { en: '0.234 → 2.34 · 1.5 → 15', 'pt-br': '0,234 → 2,34 · 1,5 → 15' }, pigment: 'muted' },
            { label: { en: 'Round to integer', 'pt-br': 'Arredondar para inteiro' }, detail: { en: '2.34 → code 2 (small rounding)', 'pt-br': '2,34 → código 2 (arredondamento pequeno)' }, pigment: 'success' },
            { label: { en: 'Clip to [−8, 7]', 'pt-br': 'Cortar em [−8, 7]' }, detail: { en: '15 → code 7 (clipped extreme)', 'pt-br': '15 → código 7 (extremo cortado)' }, pigment: 'danger' },
            { label: { en: 'Dequantize (x̂ = s · q)', 'pt-br': 'Desquantizar (x̂ = s · q)' }, detail: { en: '0.2 (err 0.034) vs 0.7 (err 0.8)', 'pt-br': '0,2 (erro 0,034) vs 0,7 (erro 0,8)' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Scale granularity', 'pt-br': 'Granularidade das escalas' },
        caption: {
          en: 'One scale for an entire tensor lets a single large outlier coarsen every ordinary weight. Slicing into groups of 32–128 weights keeps each outlier’s damage local, trading a little extra metadata for much better accuracy.',
          'pt-br': 'Uma única escala para o tensor inteiro deixa um único outlier engrossar todo peso comum. Fatiar em grupos de 32–128 pesos mantém o estrago de cada outlier local, trocando um pouco mais de metadado por muito mais fidelidade.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Per-tensor', 'pt-br': 'Por tensor' }, detail: { en: '1 scale total; 1 outlier coarsens everything', 'pt-br': '1 escala no total; 1 outlier engrossa tudo' }, pigment: 'danger' },
            { label: { en: 'Per-channel', 'pt-br': 'Por canal' }, detail: { en: '1 scale per row or column', 'pt-br': '1 escala por linha ou coluna' }, pigment: 'caution' },
            { label: { en: 'Per-group (32–128)', 'pt-br': 'Por grupo (32–128)' }, detail: { en: 'outlier hits 1 small block; adds scale metadata', 'pt-br': 'outlier atinge 1 bloco pequeno; soma metadado de escala' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 7.10 separates algorithms (GPTQ, AWQ, PTQ + imatrix calibration, QAT),
   * container formats (GGUF) and runtime kernels, and shows why re-quantizing
   * compounds loss. Replaces the three-bullet layer list in the opening section.
   */
  't7-quant-three-layers': {
    lesson: '7.10-quantization-ii-gptq-awq-gguf-qat',
    title: {
      en: 'Three separate layers — and why lossy conversion cannot be undone',
      'pt-br': 'Três camadas separadas — e por que conversão com perda não tem volta',
    },
    caption: {
      en: 'Model names on the Hub mix how values were chosen, how files are packaged, and which kernels unpack them. Separate the three layers, and always quantize from the highest-precision source checkpoint.',
      'pt-br': 'Os nomes de modelos no Hub misturam como os valores foram escolhidos, como os arquivos são empacotados e quais kernels os desempacotam. Separe as três camadas e quantize sempre a partir do checkpoint de maior precisão.',
    },
    steps: [
      {
        label: { en: 'Algorithm · Format · Runtime', 'pt-br': 'Algoritmo · Formato · Runtime' },
        caption: {
          en: 'GPTQ, AWQ, K-quant quantizers (optionally guided by imatrix activation-importance calibration data, which informs rather than quantizes weights) and QAT choose the approximate numbers; GGUF is only the container file; the runtime’s packed kernels decide whether you actually get the speed.',
          'pt-br': 'GPTQ, AWQ, quantizadores K-quant (opcionalmente guiados por dados de calibração de importância de ativação do imatrix, que orientam o quantizador em vez de quantizar pesos por si sós) e QAT escolhem os números aproximados; GGUF é apenas o arquivo contêiner; os kernels empacotados do runtime decidem se você realmente ganha velocidade.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: '1. Algorithm', 'pt-br': '1. Algoritmo' },
              detail: { en: 'GPTQ, AWQ, PTQ (+ imatrix calibration) or QAT — chooses codes', 'pt-br': 'GPTQ, AWQ, PTQ (+ calibração imatrix) ou QAT — escolhe os códigos' },
              pigment: 'accent',
            },
            {
              label: { en: '2. Container format', 'pt-br': '2. Formato de contêiner' },
              detail: { en: 'GGUF — packages tensors, scales & metadata (17.1 GB Q4_K_M)', 'pt-br': 'GGUF — empacota tensores, escalas e metadados (17,1 GB Q4_K_M)' },
              pigment: 'caution',
            },
            {
              label: { en: '3. Runtime kernels', 'pt-br': '3. Kernels do runtime' },
              detail: { en: 'llama.cpp, MLX, vLLM — unpack on chip; fallback loses speed', 'pt-br': 'llama.cpp, MLX, vLLM — desempacotam no chip; fallback perde velocidade' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Re-quantizing compounds error', 'pt-br': 'Requantizar acumula erro' },
        caption: {
          en: 'Converting an already 4-bit file into another 4-bit format starts from rounded, clipped values. Discarded precision never comes back, so always quantize directly from the bf16 checkpoint and keep hashes.',
          'pt-br': 'Converter um arquivo já em 4 bits para outro formato de 4 bits parte de valores arredondados e cortados. A precisão descartada nunca volta, então quantize sempre direto do checkpoint bf16 e guarde os hashes.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'bf16 checkpoint', 'pt-br': 'Checkpoint bf16' }, detail: { en: 'original trained precision (~54 GB)', 'pt-br': 'precisão original treinada (~54 GB)' }, pigment: 'success' },
            { label: { en: 'First 4-bit pass', 'pt-br': 'Primeira passagem 4 bits' }, detail: { en: 'rounding & clipping discard precision once', 'pt-br': 'arredondamento e clipping descartam precisão uma vez' }, pigment: 'caution' },
            { label: { en: 'Re-quantized file', 'pt-br': 'Arquivo requantizado' }, detail: { en: 'second lossy pass; errors compound', 'pt-br': 'segunda passagem com perda; erros se acumulam' }, pigment: 'danger' },
            { label: { en: 'Keep provenance', 'pt-br': 'Guardar proveniência' }, detail: { en: 'verify hashes; always start from bf16', 'pt-br': 'verificar hashes; sempre partir do bf16' }, pigment: 'accent' },
          ],
        },
      },
    ],
  },

  /**
   * 7.11 is a serving-stack decision map. One four-stage flow captures the strict
   * order: hardware gate -> workload shape -> hybrid support & correctness ->
   * pinned benchmark on your own traffic. Replaces the 3-step numbered list and
   * closing recap.
   */
  't7-serving-decision-map': {
    lesson: '7.11-serving-stacks-vllm-sglang-tensorrt-llm',
    title: {
      en: 'Choosing a serving stack, in order',
      'pt-br': 'Escolhendo um stack de serving, em ordem',
    },
    caption: {
      en: `Start with memory, then traffic shape, then hybrid DeltaNet support and output correctness. Only after those three gates pass does a throughput benchmark mean anything.`,
      'pt-br': `Comece pela memória, depois o formato do tráfego, depois o suporte híbrido a DeltaNet e a corretude da saída. Só depois de passar nesses três portões um benchmark de vazão significa alguma coisa.`,
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: '1. Hardware gate', 'pt-br': '1. Portão de hardware' },
          detail: {
            en: `${QWEN.weightsGbBf16.value} GB bf16 + 23.3 GiB pool on 80 GB; smaller cards need quant or sharding`,
            'pt-br': `${QWEN.weightsGbBf16.value} GB bf16 + pool de 23,3 GiB em 80 GB; placas menores pedem quant ou sharding`,
          },
          pigment: 'caution',
        },
        {
          label: { en: '2. Workload shape', 'pt-br': '2. Formato da carga' },
          detail: {
            en: 'API → vLLM · agents → SGLang · NVIDIA fleet → TRT-LLM · 1 GPU → Transformers',
            'pt-br': 'API → vLLM · agentes → SGLang · frota NVIDIA → TRT-LLM · 1 GPU → Transformers',
          },
          pigment: 'accent',
        },
        {
          label: { en: '3. Support & correctness', 'pt-br': '3. Suporte e corretude' },
          detail: {
            en: 'verify DeltaNet state, chat template, thinking mode, stops & JSON',
            'pt-br': 'conferir estado DeltaNet, chat template, thinking mode, stops e JSON',
          },
          pigment: 'danger',
        },
        {
          label: { en: '4. Own benchmark', 'pt-br': '4. Seu benchmark' },
          detail: {
            en: 'pinned versions, your lengths & concurrency; track TTFT, ITL & goodput',
            'pt-br': 'versões pinadas, seus comprimentos e concorrência; medir TTFT, ITL e goodput',
          },
          pigment: 'success',
        },
      ],
    },
  },

  /**
   * 7.12 sizes the course's 24 GB local GPU scenario with Q4_K_M across short
   * and long contexts without inventing backend-dependent workspace bytes, and
   * lays out the four-step local planning order. Replaces both numbered lists.
   */
  't7-local-24gb-budget': {
    lesson: '7.12-running-models-locally',
    title: {
      en: 'What fills a 24 GB card besides the weight file',
      'pt-br': 'O que ocupa uma placa de 24 GB além do arquivo de pesos',
    },
    caption: {
      en: `A course deployment scenario for Qwen3.8-27B Q4_K_M, not a model-card minimum. File size (15.93 GiB) is only the starting point: KV cache grows at ${QWEN.kvKibPerToken.value} KiB/token, DeltaNet adds ${DELTANET_STATE_MIB} MiB, and backend workspace must be measured on the live stack.`,
      'pt-br': `Cenário de deploy do curso para o Qwen3.8-27B Q4_K_M, não um mínimo do model card. O tamanho do arquivo (15,93 GiB) é só o ponto de partida: o KV cache cresce a ${QWEN.kvKibPerToken.value} KiB/token, o DeltaNet soma ${DELTANET_STATE_MIB} MiB e o workspace do backend precisa ser medido na stack real.`,
    },
    steps: [
      {
        label: { en: '8,192-token context', 'pt-br': 'Contexto de 8.192 tokens' },
        caption: {
          en: 'At 8,192 tokens, the measured items sum to 15.93 GiB weights + 512 MiB KV + 144 MiB DeltaNet state (~16.6 GiB), leaving room for backend workspace and display use — still verify on your exact runtime.',
          'pt-br': 'Em 8.192 tokens, os itens conhecidos somam 15,93 GiB de pesos + 512 MiB de KV + 144 MiB de estado DeltaNet (~16,6 GiB), deixando folga para workspace do backend e vídeo — ainda assim meça no seu runtime exato.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Q4_K_M text weights', 'pt-br': 'Pesos de texto Q4_K_M' }, detail: { en: '15.93 GiB (17.1 GB) on disk', 'pt-br': '15,93 GiB (17,1 GB) em disco' }, pigment: 'accent' },
            { label: { en: 'KV cache (8k)', 'pt-br': 'KV cache (8k)' }, detail: { en: '512 MiB (64 KiB × 8,192)', 'pt-br': '512 MiB (64 KiB × 8.192)' }, pigment: 'caution' },
            { label: { en: 'DeltaNet state', 'pt-br': 'Estado DeltaNet' }, detail: { en: `${DELTANET_STATE_MIB} MiB constant (float32 ref.)`, 'pt-br': `${DELTANET_STATE_MIB} MiB fixos (ref. float32)` }, pigment: 'success' },
            { label: { en: 'Backend & display', 'pt-br': 'Backend e vídeo' }, detail: { en: 'workspace, buffers, optional projector — measure live', 'pt-br': 'workspace, buffers, projector opcional — medir ao vivo' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: '65,536-token context', 'pt-br': 'Contexto de 65.536 tokens' },
        caption: {
          en: 'Raising context to 65,536 tokens multiplies KV eightfold to 4 GiB (about 20.1 GiB before workspace, projector, or display), making a 24 GB card tight; full 262,144-token context alone would need 16 GiB of KV.',
          'pt-br': 'Subir o contexto para 65.536 tokens multiplica o KV por oito, para 4 GiB (cerca de 20,1 GiB antes de workspace, projector ou vídeo), apertando uma placa de 24 GB; só o contexto completo de 262.144 tokens exigiria 16 GiB de KV.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Q4_K_M text weights', 'pt-br': 'Pesos de texto Q4_K_M' }, detail: { en: '15.93 GiB (unchanged)', 'pt-br': '15,93 GiB (inalterado)' }, pigment: 'accent' },
            { label: { en: 'KV cache (64k)', 'pt-br': 'KV cache (64k)' }, detail: { en: '4 GiB — 8× larger than at 8k', 'pt-br': '4 GiB — 8× maior que em 8k' }, pigment: 'danger' },
            { label: { en: 'DeltaNet state', 'pt-br': 'Estado DeltaNet' }, detail: { en: `${DELTANET_STATE_MIB} MiB (still flat)`, 'pt-br': `${DELTANET_STATE_MIB} MiB (segue plano)` }, pigment: 'success' },
            { label: { en: 'Backend & display', 'pt-br': 'Backend e vídeo' }, detail: { en: 'tight margin on 24 GB; configure real context', 'pt-br': 'margem apertada em 24 GB; configure o contexto real' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: '4-step local plan', 'pt-br': 'Plano local em 4 passos' },
        caption: {
          en: 'Plan capacity before downloading gigabytes: choose the rung, budget real context and state, confirm hybrid DeltaNet and packed-kernel support, then measure sustained bandwidth-bound speed.',
          'pt-br': 'Planeje a capacidade antes de baixar gigabytes: escolha o degrau, orce contexto real e estado, confirme suporte híbrido a DeltaNet e kernels empacotados, e então meça a velocidade sustentada limitada por banda.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1. Pick quant rung', 'pt-br': '1. Escolher degrau' }, detail: { en: '54 → 27 → 15.7–17.9 GB text', 'pt-br': '54 → 27 → 15,7–17,9 GB texto' }, pigment: 'accent' },
            { label: { en: '2. Add real context', 'pt-br': '2. Somar contexto real' }, detail: { en: 'KV + 144 MiB state + workspace', 'pt-br': 'KV + 144 MiB estado + workspace' }, pigment: 'caution' },
            { label: { en: '3. Verify hybrid support', 'pt-br': '3. Conferir suporte híbrido' }, detail: { en: 'DeltaNet + native packed kernels', 'pt-br': 'DeltaNet + kernels empacotados nativos' }, pigment: 'danger' },
            { label: { en: '4. Measure live', 'pt-br': '4. Medir ao vivo' }, detail: { en: 'TTFT, sustained tok/s & peak RAM', 'pt-br': 'TTFT, tok/s sustentado e pico de RAM' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
