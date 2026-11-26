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
const BLACKWELL_RESERVE_GIB = 8
const HOPPER_POOL_GIB = 23.3
const BLACKWELL_POOL_GIB = 120.5

/** 9.10: monthly bill (USD) vs monthly output volume (M tok) at 5:1 input:output. */
const billWorkedAxes = {
  xAxis: {
    label: { en: 'Monthly output volume (5:1 input mix)', 'pt-br': 'Volume mensal de saída (proporção 5:1 de entrada)' },
    scale: 'linear',
    min: 0,
    max: 100,
    unit: 'M tok',
  },
  yAxis: {
    label: { en: 'Monthly bill', 'pt-br': 'Conta mensal' },
    scale: 'linear',
    min: 0,
    max: 2000,
    unit: 'USD',
  },
} as const

const billCrossoverAxes = {
  xAxis: {
    label: { en: 'Monthly output volume (5:1 input mix)', 'pt-br': 'Volume mensal de saída (proporção 5:1 de entrada)' },
    scale: 'linear',
    min: 0,
    max: 500,
    unit: 'M tok',
  },
  yAxis: {
    label: { en: 'Monthly bill', 'pt-br': 'Conta mensal' },
    scale: 'linear',
    min: 0,
    max: 3000,
    unit: 'USD',
  },
} as const

export const TRACK_9_FIGURES = {
  /**
   * 9.1 contrasts one machine's two currencies across three workloads: batch-1
   * decode (bandwidth-limited), batch-32 decode (more work per read, still
   * bandwidth-limited), and pretraining (arithmetic-limited).
   */
  't9-two-currencies': {
    lesson: '9.1-memory-bandwidth-vs-flops',
    title: { en: 'Same weights, two hardware currencies', 'pt-br': 'Os mesmos pesos, duas moedas de hardware' },
    caption: {
      en: 'An H100-class balance point sits near 300 operations per byte. How many tokens share one weight stream decides whether you wait on memory bandwidth or on arithmetic.',
      'pt-br': 'O ponto de equilíbrio classe H100 fica perto de 300 operações por byte. Quantos tokens compartilham uma leitura de pesos decide se você espera pela bandwidth de memória ou pela aritmética.',
    },
    steps: [
      {
        label: { en: 'Batch-1 decode', 'pt-br': 'Decode em batch 1' },
        caption: {
          en: 'Each weight read serves one token (~1 op/byte). Streaming the ~54 GB checkpoint heuristic at 3.35 TB/s takes ~16.1 ms (~62 tok/s), leaving the tensor cores idle more than 99% of the step.',
          'pt-br': 'Cada leitura de pesos serve um token (~1 op/byte). Transmitir o checkpoint de ~54 GB na heurística a 3,35 TB/s leva ~16,1 ms (~62 tok/s), deixando os tensor cores ociosos por mais de 99% do passo.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'HBM weights', 'pt-br': 'Pesos na HBM' },
              detail: { en: `~${QWEN.weightsGbBf16.value} GB full checkpoint`, 'pt-br': `~${QWEN.weightsGbBf16.value} GB no checkpoint completo` },
              pigment: 'muted',
            },
            {
              label: { en: 'Memory bus', 'pt-br': 'Barramento de memória' },
              detail: { en: '3.35 TB/s peak → ~16.1 ms', 'pt-br': 'pico de 3,35 TB/s → ~16,1 ms' },
              pigment: 'danger',
            },
            {
              label: { en: 'Intensity', 'pt-br': 'Intensidade' },
              detail: { en: '~1 op/byte (balance ≈ 300)', 'pt-br': '~1 op/byte (equilíbrio ≈ 300)' },
              pigment: 'caution',
            },
            {
              label: { en: 'Tensor cores', 'pt-br': 'Núcleos tensor (tensor cores)' },
              detail: { en: '~0.3% of peak FLOPs · idle >99%', 'pt-br': '~0,3% do pico de FLOPs · ociosos >99%' },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: 'Batch-32 decode', 'pt-br': 'Decode em batch 32' },
        caption: {
          en: 'Decoding 32 independent sequences together reads the weights once per step (~32 ops/byte). Still below 300, so still bandwidth-limited, but each read feeds 32 tokens instead of one.',
          'pt-br': 'Fazer decode de 32 sequências independentes juntas lê os pesos uma vez por passo (~32 ops/byte). Ainda abaixo de 300, logo ainda limitado por bandwidth, mas cada leitura alimenta 32 tokens em vez de um.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'HBM weights', 'pt-br': 'Pesos na HBM' },
              detail: { en: `same ~${QWEN.weightsGbBf16.value} GB read once`, 'pt-br': `mesmos ~${QWEN.weightsGbBf16.value} GB lidos uma vez` },
              pigment: 'muted',
            },
            {
              label: { en: 'Memory bus', 'pt-br': 'Barramento de memória' },
              detail: { en: 'one read serves 32 sequences', 'pt-br': 'uma leitura serve 32 sequências' },
              pigment: 'caution',
            },
            {
              label: { en: 'Intensity', 'pt-br': 'Intensidade' },
              detail: { en: '~32 ops/byte (still < 300)', 'pt-br': '~32 ops/byte (ainda < 300)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Total output', 'pt-br': 'Saída total' },
              detail: { en: 'weight-only model: ~32× throughput', 'pt-br': 'modelo só de pesos: ~32× throughput' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Pretraining', 'pt-br': 'Pré-treinamento' },
        caption: {
          en: 'Pretraining runs huge batches of tokens per weight read, pushing intensity far above 300 ops/byte. The bottleneck flips from memory bandwidth to arithmetic (~6 FLOPs per parameter per token).',
          'pt-br': 'O pré-treinamento processa batches enormes de tokens por leitura de pesos, empurrando a intensidade muito acima de 300 ops/byte. O gargalo vira de bandwidth de memória para aritmética (~6 FLOPs por parâmetro por token).',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'HBM weights', 'pt-br': 'Pesos na HBM' },
              detail: { en: 'read once for huge token batches', 'pt-br': 'lidos uma vez para batches enormes' },
              pigment: 'muted',
            },
            {
              label: { en: 'Memory bus', 'pt-br': 'Barramento de memória' },
              detail: { en: 'no longer the limiting currency', 'pt-br': 'deixa de ser a moeda limitante' },
              pigment: 'success',
            },
            {
              label: { en: 'Intensity', 'pt-br': 'Intensidade' },
              detail: { en: 'far above ~300 ops/byte', 'pt-br': 'muito acima de ~300 ops/byte' },
              pigment: 'accent',
            },
            {
              label: { en: 'Tensor cores', 'pt-br': 'Núcleos tensor (tensor cores)' },
              detail: { en: '~6 FLOPs/param/token · compute-limited', 'pt-br': '~6 FLOPs/parâm./token · limitado por compute' },
              pigment: 'danger',
            },
          ],
        },
      },
    ],
  },
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
        'Attainable performance is the lower of two ceilings: the slanted bandwidth roof and the flat compute roof. Left of the ridge point a kernel is bandwidth-bound, so only more arithmetic per byte or more bandwidth helps. Right of it, only more compute helps. Batch-1 decode sits far to the left and prefill far to the right, which is why the two phases behave like different machines.',
      'pt-br':
        'O desempenho atingível é o menor de dois tetos: o teto inclinado da bandwidth e o teto plano de compute. À esquerda do ridge point o kernel é limitado por bandwidth, então só mais aritmética por byte ou mais bandwidth ajuda. À direita, só mais compute ajuda. O decode em batch 1 fica bem à esquerda e o prefill bem à direita, e é por isso que as duas fases se comportam como máquinas diferentes.',
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
          label: { en: 'Bandwidth roof', 'pt-br': 'Teto de bandwidth' },
          pigment: 'accent',
          points: [
            [0.1, 0.1 * BANDWIDTH_TB_S],
            [RIDGE, PEAK_TFLOPS],
          ],
          marks: [
            { at: [RIDGE, PEAK_TFLOPS], label: { en: 'ridge point', 'pt-br': 'crista (ridge point)' } },
            // Lesson 7.3 establishes single-stream decode at roughly one
            // operation per weight byte: bandwidth-bound, far left of the ridge.
            {
              at: [1, 1 * BANDWIDTH_TB_S],
              label: { en: 'batch-1 decode', 'pt-br': 'decode em batch 1' },
            },
          ],
        },
        {
          label: { en: 'Compute roof', 'pt-br': 'Teto de compute' },
          pigment: 'danger',
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
        'Os pesos são fixos no momento em que você escolhe a precisão. Todo o restante decide quantas sequências simultâneas cabem, e o KV cache é a única parte que cresce a cada token gerado.',
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
          label: { en: 'KV cache, one full-context sequence', 'pt-br': 'KV cache, uma sequência de contexto completo' },
          detail: { en: `${QWEN.kvGibFullContext.value} GiB · grows per token`, 'pt-br': `${QWEN.kvGibFullContext.value} GiB · cresce por token` },
          pigment: 'caution',
          weight: QWEN.kvGibFullContext.value,
        },
        {
          label: { en: 'DeltaNet recurrent state', 'pt-br': 'Estado recorrente DeltaNet' },
          detail: { en: `~${QWEN.deltaNetStateMib.value} MiB · constant`, 'pt-br': `~${QWEN.deltaNetStateMib.value} MiB · constante` },
          pigment: 'success',
          weight: QWEN.deltaNetStateMib.value / 1024,
        },
        {
          label: { en: 'Activations, fragmentation, runtime', 'pt-br': 'Ativações, fragmentação, runtime' },
          detail: { en: 'reserve, never zero', 'pt-br': 'reserva, nunca zero' },
          pigment: 'danger',
          weight: RESERVE_GIB,
        },
      ],
    },
  },

  /**
   * 9.4 shows why 2.4x total memory yields roughly 5x concurrency: the 50.3 GiB
   * bf16 weight charge is fixed, so almost every added gibibyte goes to the
   * user state pool.
   */
  't9-hopper-vs-blackwell': {
    lesson: '9.4-nvidia-cuda-hopper-blackwell',
    title: { en: 'Fixed weights, non-linear user pool', 'pt-br': 'Pesos fixos, pool de usuários não linear' },
    caption: {
      en: 'Weights take the same 50.3 GiB on both cards. Growing usable memory by about 2.4× expands the state pool by more than 5× (from 23.3 GiB to 120.5 GiB).',
      'pt-br': 'Os pesos ocupam os mesmos 50,3 GiB nas duas placas. Aumentar a memória utilizável em cerca de 2,4× expande o pool de estado em mais de 5× (de 23,3 GiB para 120,5 GiB).',
    },
    derivedFrom: '9-hardware-and-infrastructure/9.3-kv-cache-sizing-and-memory-budgets',
    steps: [
      {
        label: { en: 'Hopper 80 GB (~79.6 GiB)', 'pt-br': 'Hopper 80 GB (~79,6 GiB)' },
        caption: {
          en: 'On an 80 GB part, weights and a 6 GiB reserve take over 70% of the card, leaving 23.3 GiB: about 36 concurrent 8,192-token chats or 1 full 262,144-token sequence.',
          'pt-br': 'Numa peça de 80 GB, os pesos e uma reserva de 6 GiB consomem mais de 70% da placa, deixando 23,3 GiB: cerca de 36 chats concorrentes de 8.192 tokens ou 1 sequência completa de 262.144 tokens.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Weights, bfloat16', 'pt-br': 'Pesos, bfloat16' },
              detail: { en: '50.3 GiB · fixed cost', 'pt-br': '50,3 GiB · custo fixo' },
              pigment: 'muted',
              weight: WEIGHTS_GIB,
            },
            {
              label: { en: 'Runtime reserve', 'pt-br': 'Reserva de runtime' },
              detail: { en: '6 GiB · driver, activations, fragmentation', 'pt-br': '6 GiB · driver, ativações, fragmentação' },
              pigment: 'danger',
              weight: RESERVE_GIB,
            },
            {
              label: { en: 'KV + DeltaNet state pool', 'pt-br': 'Pool de KV + estado DeltaNet' },
              detail: { en: '23.3 GiB → ~36 chats (8K) or 1 full (262K)', 'pt-br': '23,3 GiB → ~36 chats (8K) ou 1 completo (262K)' },
              pigment: 'accent',
              weight: HOPPER_POOL_GIB,
            },
          ],
        },
      },
      {
        label: { en: 'Blackwell 192 GB class (~178.8 GiB)', 'pt-br': 'Blackwell classe 192 GB (~178,8 GiB)' },
        caption: {
          en: 'With the same 50.3 GiB weights and an 8 GiB reserve (178.8 GiB illustrative available capacity), the pool jumps to 120.5 GiB: about 188 concurrent 8,192-token chats or 7 full-context sequences.',
          'pt-br': 'Com os mesmos 50,3 GiB de pesos e reserva de 8 GiB (178,8 GiB de capacidade disponível ilustrativa), o pool salta para 120,5 GiB: cerca de 188 chats concorrentes de 8.192 tokens ou 7 sequências de contexto completo.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Weights, bfloat16', 'pt-br': 'Pesos, bfloat16' },
              detail: { en: '50.3 GiB · same fixed cost', 'pt-br': '50,3 GiB · mesmo custo fixo' },
              pigment: 'muted',
              weight: WEIGHTS_GIB,
            },
            {
              label: { en: 'Runtime reserve', 'pt-br': 'Reserva de runtime' },
              detail: { en: '8 GiB · slightly larger reserve', 'pt-br': '8 GiB · reserva um pouco maior' },
              pigment: 'danger',
              weight: BLACKWELL_RESERVE_GIB,
            },
            {
              label: { en: 'KV + DeltaNet state pool', 'pt-br': 'Pool de KV + estado DeltaNet' },
              detail: { en: '120.5 GiB → ~188 chats (8K) or ~7 full (262K)', 'pt-br': '120,5 GiB → ~188 chats (8K) ou ~7 completos (262K)' },
              pigment: 'success',
              weight: BLACKWELL_POOL_GIB,
            },
          ],
        },
      },
    ],
  },

  /**
   * 9.5 contrasts one 192 GB MI300X-class accelerator (capacity and single-process
   * simplicity) against two 80 GB parts in tensor parallel (halved weight read per
   * device, paid for by 128 all-reduces per token).
   */
  't9-single-vs-sharded': {
    lesson: '9.5-amd-rocm-mi3xx',
    title: { en: 'One large device vs two sharded devices', 'pt-br': 'Um dispositivo grande vs dois com sharding' },
    caption: {
      en: 'A single 192 GB part eliminates multi-GPU coordination and wins on capacity; a tightly linked pair halves each device’s weight read to chase single-user speed, at the cost of 128 all-reduces per token.',
      'pt-br': 'Uma única peça de 192 GB elimina a coordenação entre GPUs e vence em capacidade; um par bem interconectado corta pela metade a leitura de pesos por placa para buscar latência menor, ao custo de 128 all-reduces por token.',
    },
    derivedFrom: '9-hardware-and-infrastructure/9.3-kv-cache-sizing-and-memory-budgets',
    steps: [
      {
        label: { en: 'One 192 GB device (MI300X class)', 'pt-br': 'Um dispositivo de 192 GB (classe MI300X)' },
        caption: {
          en: 'All 50.3 GiB of bf16 weights stay on one card, leaving 133.7 GiB of pool (~8 full-context or ~208 8K chats) with zero inter-GPU communication. Checkpoint-size heuristic at 5.3 TB/s: ~10.2 ms (~98 tok/s).',
          'pt-br': 'Todos os 50,3 GiB de pesos em bf16 ficam numa só placa, deixando 133,7 GiB de pool (~8 chats completos ou ~208 de 8K) sem comunicação entre GPUs. Heurística pelo checkpoint a 5,3 TB/s: ~10,2 ms (~98 tok/s).',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Weights', 'pt-br': 'Pesos' },
              detail: { en: '50.3 GiB on 1 card', 'pt-br': '50,3 GiB em 1 placa' },
              pigment: 'muted',
            },
            {
              label: { en: 'State pool', 'pt-br': 'Pool de estado' },
              detail: { en: '133.7 GiB · ~8 full / ~208 (8K)', 'pt-br': '133,7 GiB · ~8 completos / ~208 (8K)' },
              pigment: 'success',
            },
            {
              label: { en: 'Weight read heuristic', 'pt-br': 'Heurística de leitura' },
              detail: { en: '54 GB / 5.3 TB/s ≈ 10.2 ms (~98 tok/s)', 'pt-br': '54 GB / 5,3 TB/s ≈ 10,2 ms (~98 tok/s)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Coordination', 'pt-br': 'Coordenação' },
              detail: { en: '0 all-reduces · one process', 'pt-br': '0 all-reduces · processo único' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Two 80 GB devices (tensor parallel)', 'pt-br': 'Dois dispositivos de 80 GB (tensor parallel)' },
        caption: {
          en: 'Splitting weights across two 80 GB cards halves each card’s read to ~27 GB (~8.1 ms at 3.35 TB/s, ~124 tok/s before sync), but adds 2 all-reduces per layer across 64 layers (near ~107 tok/s in lesson 9.9).',
          'pt-br': 'Dividir os pesos entre duas placas de 80 GB corta a leitura por placa para ~27 GB (~8,1 ms a 3,35 TB/s, ~124 tok/s antes da sincronização), mas acrescenta 2 all-reduces por camada em 64 camadas (perto de ~107 tok/s na aula 9.9).',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Weights per card', 'pt-br': 'Pesos por placa' },
              detail: { en: '~27 GB each (split in half)', 'pt-br': '~27 GB em cada (dividido ao meio)' },
              pigment: 'muted',
            },
            {
              label: { en: 'Weight read heuristic', 'pt-br': 'Heurística de leitura' },
              detail: { en: '27 GB / 3.35 TB/s ≈ 8.1 ms (~124 tok/s)', 'pt-br': '27 GB / 3,35 TB/s ≈ 8,1 ms (~124 tok/s)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Coordination', 'pt-br': 'Coordenação' },
              detail: { en: `128 all-reduces/token (2 × ${QWEN.layers.value} layers)`, 'pt-br': `128 all-reduces/token (2 × ${QWEN.layers.value} camadas)` },
              pigment: 'caution',
            },
            {
              label: { en: 'Net heuristic (9.9)', 'pt-br': 'Heurística líquida (9.9)' },
              detail: { en: '~107 tok/s on fast fabric · benchmark both', 'pt-br': '~107 tok/s em fabric rápido · meça os dois' },
              pigment: 'accent',
            },
          ],
        },
      },
    ],
  },

  /**
   * 9.6 separates loading (the PCIe boundary unified memory deletes) from
   * decoding speed (the bandwidth division unified memory does not repeal).
   */
  't9-discrete-vs-unified': {
    lesson: '9.6-apple-silicon-unified-memory',
    title: { en: 'Where the weights live: discrete GPU vs unified memory', 'pt-br': 'Onde os pesos ficam: GPU discreta vs unified memory' },
    caption: {
      en: 'Unified memory deletes the PCIe copy and private VRAM ceiling, so a 17.1 GB artifact fits directly in a 64 GB pool. Decode speed still follows memory bandwidth divided by active bytes.',
      'pt-br': 'A unified memory elimina a cópia pelo PCIe e o teto privado de VRAM, então um artefato de 17,1 GB cabe direto num pool de 64 GB. A velocidade de decode continua seguindo a bandwidth dividida pelos bytes ativos.',
    },
    steps: [
      {
        label: { en: 'Discrete GPU (24 GB VRAM)', 'pt-br': 'GPU discreta (24 GB de VRAM)' },
        caption: {
          en: 'Even with 128 GB of host RAM, a 24 GB discrete card can only keep 24 GB resident on the GPU. Weights are staged in host RAM and copied over PCIe; anything that spills to CPU RAM runs at system-memory speed.',
          'pt-br': 'Mesmo com 128 GB de RAM no host, uma placa discreta de 24 GB só mantém 24 GB residentes na GPU. Os pesos passam pela RAM do host e são copiados pelo PCIe; o que sobra na RAM da CPU roda na velocidade dela.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Model file', 'pt-br': 'Arquivo do modelo' },
              detail: { en: '17.1 GB Q4_K_M artifact', 'pt-br': 'artefato Q4_K_M de 17,1 GB' },
              pigment: 'muted',
            },
            {
              label: { en: 'Host RAM', 'pt-br': 'RAM do host' },
              detail: { en: '128 GB · read here first', 'pt-br': '128 GB · lido aqui primeiro' },
              pigment: 'muted',
            },
            {
              label: { en: 'PCIe bus', 'pt-br': 'Barramento PCIe' },
              detail: { en: 'copied across to the card', 'pt-br': 'copiado até a placa' },
              pigment: 'danger',
            },
            {
              label: { en: 'GPU VRAM', 'pt-br': 'VRAM da GPU' },
              detail: { en: '24 GB ceiling for weights + KV', 'pt-br': 'teto de 24 GB para pesos + KV' },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'Unified memory (64 GB Apple silicon)', 'pt-br': 'Memória unificada (64 GB Apple silicon)' },
        caption: {
          en: 'CPU, GPU, and Neural Engine share one physical pool, so the 17.1 GB artifact and its KV cache stay resident without copying. On an M3 Ultra (800 GB/s), 800 / 17.1 gives a ~46.8 tok/s planning heuristic (vs ~14.8 tok/s for 54 GB bf16).',
          'pt-br': 'CPU, GPU e Neural Engine compartilham um único pool físico, então o artefato de 17,1 GB e seu KV cache ficam residentes sem cópia. Num M3 Ultra (800 GB/s), 800 / 17,1 dá heurística de ~46,8 tok/s (contra ~14,8 tok/s em bf16 de 54 GB).',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Model file', 'pt-br': 'Arquivo do modelo' },
              detail: { en: '17.1 GB Q4_K_M artifact', 'pt-br': 'artefato Q4_K_M de 17,1 GB' },
              pigment: 'muted',
            },
            {
              label: { en: 'Shared memory pool', 'pt-br': 'Pool de memória compartilhado' },
              detail: { en: '64 GB · loaded once, no copy', 'pt-br': '64 GB · carregado uma vez, sem cópia' },
              pigment: 'success',
            },
            {
              label: { en: 'CPU, GPU & Neural Engine', 'pt-br': 'CPU, GPU e Neural Engine' },
              detail: { en: 'all read the same pool directly', 'pt-br': 'todos leem o mesmo pool diretamente' },
              pigment: 'accent',
            },
            {
              label: { en: 'Speed ceiling', 'pt-br': 'Teto de velocidade' },
              detail: { en: 'still bandwidth ÷ active bytes (800 GB/s on M3 Ultra)', 'pt-br': 'segue sendo bandwidth ÷ bytes ativos (800 GB/s no M3 Ultra)' },
              pigment: 'caution',
            },
          ],
        },
      },
    ],
  },

  /**
   * 9.7 walks through why 27B fails a 3 GB phone app budget at 4-bit and 2-bit
   * on both capacity and bandwidth, pointing to a 3-4B model on the Hexagon NPU.
   */
  't9-edge-sizing-path': {
    lesson: '9.7-qualcomm-hexagon-and-the-edge',
    title: { en: 'Sizing a phone app budget: 3 GB ceiling', 'pt-br': 'Dimensionando um orçamento de app: teto de 3 GB' },
    caption: {
      en: 'Quantization reduces bytes per weight, not parameter count. Under a 3 GB app budget and ~60 GB/s mobile LPDDR, fitting the phone means choosing or distilling a 3–4B model instead of squeezing 27B.',
      'pt-br': 'A quantização reduz bytes por peso, não o número de parâmetros. Com orçamento de 3 GB por app e LPDDR móvel perto de 60 GB/s, caber no celular exige escolher ou destilar um modelo de 3–4B em vez de espremer o 27B.',
    },
    steps: [
      {
        label: { en: '27B at 4 bits (fails)', 'pt-br': '27B em 4 bits (falha)' },
        caption: {
          en: 'The pinned 17.1 GB 4-bit artifact is 5.7× larger than the 3 GB app budget. Even if it could load, 60 GB/s ÷ 17.1 GB gives a ~3.5 tok/s proxy — unusable interactively.',
          'pt-br': 'O artefato fixado de 17,1 GB em 4 bits é 5,7× maior que o orçamento de 3 GB do app. Mesmo que coubesse, 60 GB/s ÷ 17,1 GB dá proxy de ~3,5 tok/s — inutilizável em uso interativo.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Artifact size', 'pt-br': 'Tamanho do artefato' },
              detail: { en: '17.1 GB (Q4_K_M)', 'pt-br': '17,1 GB (Q4_K_M)' },
              pigment: 'danger',
            },
            {
              label: { en: '3 GB app budget', 'pt-br': 'Orçamento de 3 GB' },
              detail: { en: '5.7× too large', 'pt-br': '5,7× grande demais' },
              pigment: 'danger',
            },
            {
              label: { en: 'Mobile bandwidth (~60 GB/s)', 'pt-br': 'Bandwidth móvel (~60 GB/s)' },
              detail: { en: '~3.5 tok/s proxy even if resident', 'pt-br': 'proxy de ~3,5 tok/s mesmo se residente' },
              pigment: 'caution',
            },
            {
              label: { en: 'Verdict', 'pt-br': 'Veredito' },
              detail: { en: 'fails on both capacity and speed', 'pt-br': 'falha em capacidade e em velocidade' },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: '27B at 2 bits (still fails)', 'pt-br': '27B em 2 bits (ainda falha)' },
        caption: {
          en: '27 billion weights at 0.25 bytes each is 6.75 GB before group scales — still more than twice the 3 GB limit, while quality drops steeply below 4 bits. Fitting 3 GB would demand 0.89 bits per weight.',
          'pt-br': '27 bilhões de pesos a 0,25 byte cada dão 6,75 GB antes das escalas de grupo — ainda mais que o dobro de 3 GB, com queda brusca de qualidade abaixo de 4 bits. Caber em 3 GB exigiria 0,89 bit por peso.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Packed weights', 'pt-br': 'Pesos empacotados' },
              detail: { en: '6.75 GB before scales', 'pt-br': '6,75 GB antes das escalas' },
              pigment: 'danger',
            },
            {
              label: { en: '3 GB app budget', 'pt-br': 'Orçamento de 3 GB' },
              detail: { en: '>2× over limit (needs 0.89 bpw)', 'pt-br': '>2× acima do limite (exige 0,89 bpw)' },
              pigment: 'danger',
            },
            {
              label: { en: 'Quality curve', 'pt-br': 'Curva de qualidade' },
              detail: { en: 'steep degradation below 4 bits', 'pt-br': 'degradação íngreme abaixo de 4 bits' },
              pigment: 'danger',
            },
            {
              label: { en: 'Verdict', 'pt-br': 'Veredito' },
              detail: { en: 'parameter count is the wrong term', 'pt-br': 'o número de parâmetros é o termo errado' },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: '3–4B at 4 bits (fits)', 'pt-br': '3–4B em 4 bits (cabe)' },
        caption: {
          en: 'A 3–4B model (pretrained small or distilled) lands near ~2 GB at 4 bits, leaves room for KV cache and workspace inside 3 GB, gives a ~30 tok/s bandwidth proxy, and runs on the Hexagon NPU via QNN while routing hard requests to 27B in the cloud.',
          'pt-br': 'Um modelo de 3–4B (pré-treinado pequeno ou destilado) fica perto de ~2 GB em 4 bits, deixa folga para KV cache e workspace nos 3 GB, dá proxy de ~30 tok/s e roda na NPU Hexagon via QNN enquanto tarefas difíceis vão ao 27B na nuvem.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Small model (~3–4B)', 'pt-br': 'Modelo pequeno (~3–4B)' },
              detail: { en: '~2 GB at 4 bits (distilled or small)', 'pt-br': '~2 GB em 4 bits (destilado ou pequeno)' },
              pigment: 'success',
            },
            {
              label: { en: '3 GB app budget', 'pt-br': 'Orçamento de 3 GB' },
              detail: { en: 'fits with KV cache + workspace', 'pt-br': 'cabe com KV cache + workspace' },
              pigment: 'success',
            },
            {
              label: { en: 'Mobile bandwidth (~60 GB/s)', 'pt-br': 'Bandwidth móvel (~60 GB/s)' },
              detail: { en: '~30 tok/s proxy · interactive', 'pt-br': 'proxy de ~30 tok/s · interativo' },
              pigment: 'accent',
            },
            {
              label: { en: 'Hybrid path', 'pt-br': 'Caminho híbrido' },
              detail: { en: 'Hexagon NPU via QNN · cloud for 27B', 'pt-br': 'NPU Hexagon via QNN · nuvem para 27B' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 9.8 shows how moving weights from off-die HBM to on-wafer SRAM changes the
   * numerator B in tok/s <= B/W — and how the wall returns whenever weights
   * spill off-wafer.
   */
  't9-wafer-memory-path': {
    lesson: '9.8-cerebras-wafer-scale',
    title: { en: 'Where weights sit decides the numerator B', 'pt-br': 'Onde os pesos ficam decide o numerador B' },
    caption: {
      en: 'Inverting tok/s ≤ B/W checks any speed claim against memory physics: 1,000 tok/s implies 54 TB/s at 54 GB/token or 17.1 TB/s at 17.1 GB/token.',
      'pt-br': 'Inverter tok/s ≤ B/W testa qualquer alegação de velocidade contra a física da memória: 1.000 tok/s exigem 54 TB/s com 54 GB/token ou 17,1 TB/s com 17,1 GB/token.',
    },
    steps: [
      {
        label: { en: 'Off-die HBM (GPU)', 'pt-br': 'HBM fora do die (GPU)' },
        caption: {
          en: 'Stacked DRAM beside the die gives large capacity and supports batched throughput per dollar, but its interposer (~3.35 TB/s on H100) sits 5× to 16× below what 1,000 tok/s requires.',
          'pt-br': 'A DRAM empilhada ao lado do die oferece grande capacidade e sustenta throughput por dólar via batching, mas seu interposer (~3,35 TB/s na H100) fica de 5× a 16× abaixo do que 1.000 tok/s exigem.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Weight location', 'pt-br': 'Local dos pesos' },
              detail: { en: 'stacked DRAM beside the die', 'pt-br': 'DRAM empilhada ao lado do die' },
              pigment: 'muted',
            },
            {
              label: { en: 'Interface', 'pt-br': 'Interface' },
              detail: { en: 'interposer · ~3.35 TB/s (H100)', 'pt-br': 'interposer · ~3,35 TB/s (H100)' },
              pigment: 'caution',
            },
            {
              label: { en: '1,000 tok/s check', 'pt-br': 'Teste de 1.000 tok/s' },
              detail: { en: 'needs 17.1–54 TB/s · exceeds HBM', 'pt-br': 'exige 17,1–54 TB/s · excede a HBM' },
              pigment: 'danger',
            },
            {
              label: { en: 'Strength', 'pt-br': 'Ponto forte' },
              detail: { en: 'capacity + batching for throughput per USD', 'pt-br': 'capacidade + batching para throughput por USD' },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'On-wafer SRAM', 'pt-br': 'SRAM no wafer' },
        caption: {
          en: 'Fabricating an entire silicon wafer as one device puts local SRAM beside every core. Removing the off-die interface raises the numerator B so 17.1–54 TB/s is dimensionally consistent — optimizing latency per stream.',
          'pt-br': 'Fabricar um wafer inteiro de silício como um só dispositivo coloca SRAM local ao lado de cada núcleo. Remover a interface fora do die eleva o numerador B, tornando 17,1–54 TB/s dimensionalmente consistentes — otimizando latência por fluxo.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Weight location', 'pt-br': 'Local dos pesos' },
              detail: { en: 'local SRAM beside every core', 'pt-br': 'SRAM local ao lado de cada núcleo' },
              pigment: 'success',
            },
            {
              label: { en: 'Interface', 'pt-br': 'Interface' },
              detail: { en: 'no off-die HBM read · raises B', 'pt-br': 'sem leitura HBM fora do die · eleva B' },
              pigment: 'success',
            },
            {
              label: { en: '1,000 tok/s check', 'pt-br': 'Teste de 1.000 tok/s' },
              detail: { en: '17.1–54 TB/s is physically plausible', 'pt-br': '17,1–54 TB/s é fisicamente plausível' },
              pigment: 'accent',
            },
            {
              label: { en: 'Trade-off', 'pt-br': 'Compromisso' },
              detail: { en: 'low capacity per area · stream latency', 'pt-br': 'baixa capacidade por área · latência por fluxo' },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'Off-wafer spill (wall returns)', 'pt-br': 'Extravasamento fora do wafer' },
        caption: {
          en: 'Wafer scale moves the memory wall rather than repealing it. If weights exceed on-wafer SRAM and stream from external memory, an interface re-enters the path and lesson 9.1’s limit governs again; the 16 GiB full-context KV cache does not shrink either.',
          'pt-br': 'O wafer scale desloca a barreira de memória, não a revoga. Se os pesos excedem a SRAM no wafer e vêm de memória externa, uma interface volta ao caminho e o limite da aula 9.1 governa de novo; os 16 GiB de KV no contexto completo também não encolhem.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Weight location', 'pt-br': 'Local dos pesos' },
              detail: { en: 'external store or multiple wafers', 'pt-br': 'armazenamento externo ou vários wafers' },
              pigment: 'muted',
            },
            {
              label: { en: 'Interface', 'pt-br': 'Interface' },
              detail: { en: 'off-wafer link returns to read path', 'pt-br': 'link fora do wafer volta à leitura' },
              pigment: 'danger',
            },
            {
              label: { en: 'Effect on B/W', 'pt-br': 'Efeito em B/W' },
              detail: { en: 'interface bandwidth governs again', 'pt-br': 'bandwidth da interface governa de novo' },
              pigment: 'danger',
            },
            {
              label: { en: 'KV cache', 'pt-br': 'KV cache' },
              detail: { en: `${QWEN.kvGibFullContext.value} GiB full-context KV stays unchanged`, 'pt-br': `${QWEN.kvGibFullContext.value} GiB de KV em contexto completo não muda` },
              pigment: 'caution',
            },
          ],
        },
      },
    ],
  },

  /**
   * 9.9 splits one decode step into weight-read time vs 128 serial all-reduces
   * across N=2 fast, N=4 fast, and N=4 slow — making diminishing returns and the
   * slow-fabric inversion visible immediately.
   */
  't9-tp-latency-split': {
    lesson: '9.9-interconnects-and-clusters',
    title: { en: 'One decode step: weight reads vs 128 all-reduces', 'pt-br': 'Um passo de decode: leitura de pesos vs 128 all-reduces' },
    caption: {
      en: 'Adding GPUs halves each device’s weight read, while the 128 serial synchronizations per token stay fixed. On a slow interconnect, waiting on round trips overtakes the weight read.',
      'pt-br': 'Acrescentar GPUs corta pela metade a leitura de pesos por placa, mas as 128 sincronizações em série por token permanecem fixas. Num interconnect lento, esperar pelas idas e voltas ultrapassa a leitura de pesos.',
    },
    steps: [
      {
        label: { en: '2 GPUs · fast fabric (9.34 ms)', 'pt-br': '2 GPUs · fabric rápido (9,34 ms)' },
        caption: {
          en: 'Each GPU reads ~27 GB (~8.06 ms at 3.35 TB/s) plus 1.28 ms for 128 collectives at an assumed 10 µs each: 9.34 ms total (~107 tok/s heuristic). Communication is 14% of the step.',
          'pt-br': 'Cada GPU lê ~27 GB (~8,06 ms a 3,35 TB/s) mais 1,28 ms pelos 128 coletivos a 10 µs assumidos cada: 9,34 ms no total (heurística de ~107 tok/s). A comunicação é 14% do passo.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Weight read (27 GB per GPU)', 'pt-br': 'Leitura de pesos (27 GB por GPU)' },
              detail: { en: '8.06 ms · checkpoint heuristic', 'pt-br': '8,06 ms · heurística pelo checkpoint' },
              pigment: 'accent',
              weight: 8.06,
            },
            {
              label: { en: '128 serial all-reduces (10 µs assumed)', 'pt-br': '128 all-reduces em série (10 µs assumidos)' },
              detail: { en: '1.28 ms · fast intra-node fabric', 'pt-br': '1,28 ms · fabric rápido dentro do nó' },
              pigment: 'caution',
              weight: 1.28,
            },
          ],
        },
      },
      {
        label: { en: '4 GPUs · fast fabric (5.31 ms)', 'pt-br': '4 GPUs · fabric rápido (5,31 ms)' },
        caption: {
          en: 'Doubling from 2 to 4 GPUs halves the weight read to 4.03 ms while sync stays at 1.28 ms: 5.31 ms total (~188 tok/s) — a 1.76× speedup, not 2×, as communication grows to 24% of the step.',
          'pt-br': 'Dobrar de 2 para 4 GPUs corta a leitura pela metade para 4,03 ms enquanto a sincronização segue em 1,28 ms: 5,31 ms no total (~188 tok/s) — ganho de 1,76×, não 2×, com a comunicação subindo para 24% do passo.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Weight read (13.5 GB per GPU)', 'pt-br': 'Leitura de pesos (13,5 GB por GPU)' },
              detail: { en: '4.03 ms · halved by 4-way split', 'pt-br': '4,03 ms · dividido por 4 placas' },
              pigment: 'accent',
              weight: 4.03,
            },
            {
              label: { en: '128 serial all-reduces (10 µs assumed)', 'pt-br': '128 all-reduces em série (10 µs assumidos)' },
              detail: { en: '1.28 ms · fixed synchronization floor', 'pt-br': '1,28 ms · piso fixo de sincronização' },
              pigment: 'caution',
              weight: 1.28,
            },
          ],
        },
      },
      {
        label: { en: '4 GPUs · slow fabric (10.43 ms)', 'pt-br': '4 GPUs · fabric lento (10,43 ms)' },
        caption: {
          en: 'At an assumed 50 µs per collective, 128 round trips cost 6.40 ms (61% of the step). Total time hits 10.43 ms (~96 tok/s) — four GPUs on a slow link run slower than two on a fast one.',
          'pt-br': 'A 50 µs assumidos por coletivo, 128 idas e voltas custam 6,40 ms (61% do passo). O tempo total chega a 10,43 ms (~96 tok/s) — quatro GPUs num link lento ficam mais lentas que duas num rápido.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Weight read (13.5 GB per GPU)', 'pt-br': 'Leitura de pesos (13,5 GB por GPU)' },
              detail: { en: '4.03 ms · checkpoint heuristic', 'pt-br': '4,03 ms · heurística pelo checkpoint' },
              pigment: 'accent',
              weight: 4.03,
            },
            {
              label: { en: '128 serial all-reduces (50 µs assumed)', 'pt-br': '128 all-reduces em série (50 µs assumidos)' },
              detail: { en: '6.40 ms · latency dominates the step', 'pt-br': '6,40 ms · latência domina o passo' },
              pigment: 'danger',
              weight: 6.4,
            },
          ],
        },
      },
    ],
  },

  /**
   * 9.10 plots monthly bill vs output token volume (at 5:1 input:output) for
   * all three options, first zoomed into the 40M worked load and then zoomed
   * out to the ~335M break-even crossover.
   */
  't9-serving-bill-crossover': {
    lesson: '9.10-cost-per-token',
    title: { en: 'Monthly bill as traffic grows', 'pt-br': 'Conta mensal conforme o tráfego cresce' },
    caption: {
      en: 'Each workload unit combines 5 million input tokens and 1 million output tokens (USD 5.45 on the managed endpoint). Fixed-cost hardware only beats per-token pricing once volume fills enough of its capacity.',
      'pt-br': 'Cada unidade de carga combina 5 milhões de tokens de entrada e 1 milhão de saída (USD 5,45 no endpoint gerenciado). Hardware de custo fixo só vence a cobrança por token quando o volume ocupa o suficiente da sua capacidade.',
    },
    steps: [
      {
        label: { en: 'Worked load (40M output)', 'pt-br': 'Carga base (40M de saída)' },
        caption: {
          en: 'At 40M output tokens (200M input), the managed endpoint (USD 218) and owned Mac (USD 194, capped at ~65.7M assumed capacity) sit close together; the rented GPU stays flat at USD 1,825 (1.9% utilization).',
          'pt-br': 'Em 40M de tokens de saída (200M de entrada), o endpoint gerenciado (USD 218) e o Mac próprio (USD 194, limitado a ~65,7M de capacidade assumida) ficam próximos; a GPU alugada segue fixa em USD 1.825 (1,9% de utilização).',
        },
        body: {
          kind: 'plot',
          ...billWorkedAxes,
          series: [
            {
              label: { en: 'Managed endpoint (USD 5.45 / unit)', 'pt-br': 'Endpoint gerenciado (USD 5,45 / unidade)' },
              pigment: 'accent',
              points: [[0, 0], [40, 218], [100, 545]],
              marks: [{ at: [40, 218], label: { en: '40M: USD 218', 'pt-br': '40M: USD 218' } }],
            },
            {
              label: { en: 'Owned Mac (USD 194, up to ~65.7M)', 'pt-br': 'Mac próprio (USD 194, até ~65,7M)' },
              pigment: 'success',
              points: [[0, 194], [65.7, 194]],
              marks: [{ at: [65.7, 194], label: { en: 'Mac cap: 65.7M', 'pt-br': 'teto Mac: 65,7M' } }],
            },
            {
              label: { en: 'Rented GPU (USD 1,825 fixed)', 'pt-br': 'GPU alugada (USD 1.825 fixo)' },
              pigment: 'danger',
              points: [[0, 1825], [100, 1825]],
              marks: [{ at: [40, 1825], label: { en: 'rented: USD 1,825', 'pt-br': 'alugada: USD 1.825' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Break-even (~335M output)', 'pt-br': 'Ponto de equilíbrio (~335M de saída)' },
        caption: {
          en: 'The managed endpoint crosses the flat USD 1,825 rental line near 335 million output tokens (about 1.7 billion input) — roughly 8× the worked workload and ~16% of the rented GPU’s assumed capacity.',
          'pt-br': 'O endpoint gerenciado cruza a linha fixa de USD 1.825 do aluguel perto de 335 milhões de tokens de saída (cerca de 1,7 bilhão de entrada) — cerca de 8× a carga base e ~16% da capacidade assumida da GPU alugada.',
        },
        body: {
          kind: 'plot',
          ...billCrossoverAxes,
          series: [
            {
              label: { en: 'Managed endpoint (USD 5.45 / unit)', 'pt-br': 'Endpoint gerenciado (USD 5,45 / unidade)' },
              pigment: 'accent',
              points: [[0, 0], [40, 218], [334.86, 1825], [500, 2725]],
              marks: [{ at: [334.86, 1825], label: { en: 'break-even ~335M', 'pt-br': 'equilíbrio ~335M' } }],
            },
            {
              label: { en: 'Owned Mac (USD 194, up to ~65.7M)', 'pt-br': 'Mac próprio (USD 194, até ~65,7M)' },
              pigment: 'success',
              points: [[0, 194], [65.7, 194]],
              marks: [{ at: [65.7, 194], label: { en: 'Mac cap: 65.7M', 'pt-br': 'teto Mac: 65,7M' } }],
            },
            {
              label: { en: 'Rented GPU (USD 1,825 fixed)', 'pt-br': 'GPU alugada (USD 1.825 fixo)' },
              pigment: 'danger',
              points: [[0, 1825], [500, 1825]],
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
