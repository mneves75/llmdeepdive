/**
 * Figures for track 5 — Pretraining at scale.
 *
 * Two rules carried over from track 4: every number comes from
 * `~/lib/model-facts`, and anything the reader is asked to reason about is
 * computed by the module that the lab and the tests use, never typed in here.
 * The balancing plot below calls `moeBalance` directly, so the curve and the
 * lab cannot disagree about what the sign rule does.
 */
import { MOE, QWEN } from '~/lib/model-facts'
import { moeBalance } from '~/lib/moe-math'
import { millions } from './geometry'
import type { Figure } from './types'

/** The lab's default batch: 64 tokens, 8 experts, no bias to begin with. */
const BALANCE_BATCH = { experts: 8, tokens: 64, skew: 0.5, steps: 40 } as const

const maxVioSeries = (rate: number) =>
  moeBalance({ ...BALANCE_BATCH, rate }).trace.map((point) => [point.step, Number(point.maxVio.toFixed(4))] as const)

export const TRACK_5_FIGURES = {
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
