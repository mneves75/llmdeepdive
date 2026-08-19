/**
 * Figures for track 9 — Hardware & Infrastructure.
 *
 * Every number here comes from `~/lib/model-facts` or from the lesson that owns
 * the derivation. Lesson 9.3 owns the memory budget; 7.2 owns the KV arithmetic.
 */
import { QWEN } from '~/lib/model-facts'
import type { Figure } from './types'

/**
 * The roofline for one H100 SXM, in the units lesson 9.2 uses.
 *
 * Both are vendor specifications, not measurements, and the lesson says so:
 * peak bf16 dense compute and HBM3 bandwidth. The ridge is where they cross —
 * the arithmetic intensity below which a kernel can only ever be
 * bandwidth-bound, whatever else is optimised.
 */
const PEAK_TFLOPS = 989
const BANDWIDTH_TB_S = 3.35
const RIDGE = PEAK_TFLOPS / BANDWIDTH_TB_S // ≈ 295 FLOP/byte

/**
 * Every `weight` in the memory-budget stack is in GiB, because the renderer
 * turns weights into percentages of their sum — so mixing units silently
 * produces wrong bars AND wrong printed percentages.
 *
 * The weights figure is quoted in GB (decimal) in prose, as vendors quote it;
 * 54 GB is 54e9 / 2^30 ≈ 50.3 GiB. The DeltaNet state is quoted in MiB. Both
 * are converted here, once, rather than being eyeballed into the same column.
 */
const WEIGHTS_GIB = (QWEN.weightsGbBf16.value * 1e9) / 1024 ** 3
const RESERVE_GIB = 6

export const TRACK_9_FIGURES = {
  /**
   * 9.2 is titled after a chart — "one chart places every kernel" — and until
   * now drew nothing. The roof is two straight lines on log-log axes: a slanted
   * bandwidth roof of slope one, and a flat compute ceiling.
   */
  roofline: {
    lesson: '9.2-the-roofline-model',
    title: { en: 'The roofline', 'pt-br': 'O modelo roofline' },
    caption: {
      en:
        'Attainable performance is the lower of two ceilings. Left of the ridge a kernel is bandwidth-bound and only more arithmetic per byte helps; right of it, only more compute does. Decode sits far to the left, which is why it is a different machine from prefill.',
      'pt-br':
        'O desempenho atingível é o menor de dois tetos. À esquerda da crista o kernel é limitado por banda e só mais aritmética por byte ajuda; à direita, só mais computação. A decodificação fica bem à esquerda, e é por isso que ela é uma máquina diferente do prefill.',
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Arithmetic intensity', 'pt-br': 'Intensidade aritmética' },
        scale: 'log',
        min: 0.1,
        max: 10000,
        unit: 'FLOP/byte',
      },
      yAxis: {
        label: { en: 'Attainable performance', 'pt-br': 'Desempenho atingível' },
        scale: 'log',
        min: 0.1,
        max: 3000,
        unit: 'TFLOP/s',
      },
      series: [
        {
          label: { en: 'Bandwidth roof', 'pt-br': 'Teto de banda' },
          pigment: 'accent',
          points: [
            [0.1, 0.1 * BANDWIDTH_TB_S],
            [RIDGE, PEAK_TFLOPS],
          ],
          marks: [
            { at: [RIDGE, PEAK_TFLOPS], label: { en: 'ridge', 'pt-br': 'crista' } },
            // Lesson 7.3 establishes single-stream decode at roughly one
            // operation per weight byte: bandwidth-bound, far left of the ridge.
            {
              at: [1, 1 * BANDWIDTH_TB_S],
              label: { en: 'batch-1 decode', 'pt-br': 'decode lote 1' },
            },
          ],
        },
        {
          label: { en: 'Compute roof', 'pt-br': 'Teto de computação' },
          pigment: 'coral',
          points: [
            [RIDGE, PEAK_TFLOPS],
            [10000, PEAK_TFLOPS],
          ],
          // The lesson is explicit: prefill of an 8,192-token prompt carries
          // about 8,192 operations per weight byte, roughly 27x past the ridge,
          // so it rides the FLAT roof. An earlier draft of this figure put it at
          // intensity 100 on the bandwidth roof, which contradicted the prose
          // two paragraphs below it.
          marks: [
            {
              at: [8192, PEAK_TFLOPS],
              label: { en: 'prefill 8k', 'pt-br': 'prefill 8k' },
            },
          ],
        },
      ],
    },
  },

  /**
   * 9.3 owns the memory budget. The figure states the split once, so every
   * later lesson can point here instead of re-deriving it — the practice that
   * exists because four writers once produced three different budgets.
   */
  'memory-budget': {
    lesson: '9.3-kv-cache-sizing-and-memory-budgets',
    title: { en: 'What fills an accelerator', 'pt-br': 'O que ocupa um acelerador' },
    caption: {
      en:
        'Weights are fixed the moment you choose a precision. Everything left over is what decides how many concurrent sequences fit, and the KV cache is the only part that grows with every token generated.',
      'pt-br':
        'Os pesos são fixos no momento em que você escolhe a precisão. Todo o restante decide quantas sequências simultâneas cabem, e o cache KV é a única parte que cresce a cada token gerado.',
    },
    derivedFrom: '7-inference-and-efficiency/7.2-the-kv-cache',
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        {
          label: { en: 'Weights, bfloat16', 'pt-br': 'Pesos, bfloat16' },
          detail: { en: `${QWEN.weightsGbBf16.value} GB · fixed`, 'pt-br': `${QWEN.weightsGbBf16.value} GB · fixo` },
          pigment: 'muted',
          weight: WEIGHTS_GIB,
        },
        {
          label: { en: 'KV cache, one full-context sequence', 'pt-br': 'Cache KV, uma sequência de contexto completo' },
          detail: { en: `${QWEN.kvGibFullContext.value} GiB · grows per token`, 'pt-br': `${QWEN.kvGibFullContext.value} GiB · cresce por token` },
          pigment: 'sonar',
          weight: QWEN.kvGibFullContext.value,
        },
        {
          label: { en: 'DeltaNet recurrent state', 'pt-br': 'Estado recorrente DeltaNet' },
          detail: { en: `~${QWEN.deltaNetStateMib.value} MiB · constant`, 'pt-br': `~${QWEN.deltaNetStateMib.value} MiB · constante` },
          pigment: 'kelp',
          weight: QWEN.deltaNetStateMib.value / 1024,
        },
        {
          label: { en: 'Activations, fragmentation, runtime', 'pt-br': 'Ativações, fragmentação, runtime' },
          detail: { en: 'reserve, never zero', 'pt-br': 'reserva, nunca zero' },
          pigment: 'coral',
          weight: RESERVE_GIB,
        },
      ],
    },
  },
} as const satisfies Record<string, Figure>
