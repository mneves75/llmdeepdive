/**
 * Figures for track 12 — DGX & CUDA.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import type { Figure } from './types'

/** 12.2: planning decode rate (tok/s) for the 54 GB bf16 checkpoint as bytes spill to LPDDR5X. */
const stationSpillAxes = {
  xAxis: {
    label: { en: 'Share of 54 GB checkpoint in LPDDR5X', 'pt-br': 'Fração do checkpoint de 54 GB na LPDDR5X' },
    scale: 'linear',
    min: 0,
    max: 100,
    unit: '%',
  },
  yAxis: {
    label: { en: 'Planning decode rate', 'pt-br': 'Taxa de planejamento no decode' },
    scale: 'linear',
    min: 0,
    max: 150,
    unit: 'tok/s',
  },
} as const

const stationSequentialPoints = [
  [0, 131.5],
  [10, 48.8],
  [20, 30.0],
  [35, 19.0],
  [50, 13.9],
  [75, 9.6],
  [100, 7.3],
] as const

export const TRACK_12_FIGURES = {
  /**
   * 12.1 explains that the DGX Spark's 128 GB unified LPDDR5x pool easily holds
   * Qwen3.8-27B and a 32,768-token KV cache, while its 273 GB/s bandwidth caps
   * single-stream decode. Stepping from bf16 (54 GB) to Q4_K_M (17.1 GB) shows
   * how weights dominate the memory budget while context stays small.
   */
  't12-spark-capacity-split': {
    lesson: '12.1-dgx-spark-grace-blackwell-on-a-desk',
    title: { en: 'What fits inside the Spark’s 128 GB shared pool', 'pt-br': 'O que cabe no pool compartilhado de 128 GB do Spark' },
    caption: {
      en: 'Both checkpoints fit beside a 32,768-token KV cache and the display reserve, leaving ample room for the operating system. Single-stream decode still runs through the same 273 GB/s interface.',
      'pt-br': 'Os dois checkpoints cabem ao lado de um KV cache de 32.768 tokens e da reserva do display, com folga para o sistema operacional. O decode de fluxo único ainda passa pela mesma interface de 273 GB/s.',
    },
    steps: [
      {
        label: { en: 'bf16 checkpoint (54 GB)', 'pt-br': 'Checkpoint bf16 (54 GB)' },
        caption: {
          en: 'Full 16-bit weights take under half of the 128 GB pool; a 32,768-token cache adds 2 GiB (about 4 percent of the weights). Planning decode heuristic: 273 / 54 ≈ 5.1 tok/s.',
          'pt-br': 'Os pesos completos em 16 bits ocupam menos da metade dos 128 GB; um cache de 32.768 tokens soma 2 GiB (cerca de 4 por cento dos pesos). Heurística de planejamento no decode: 273 / 54 ≈ 5,1 tok/s.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'bf16 model weights', 'pt-br': 'Pesos do modelo em bf16' },
              detail: { en: '54 GB read every decode token at 273 GB/s', 'pt-br': '54 GB lidos a cada token de decode a 273 GB/s' },
              pigment: 'accent',
              weight: 54,
            },
            {
              label: { en: 'KV cache and recurrent state', 'pt-br': 'KV cache e estado recorrente' },
              detail: { en: '2 GiB (~2.15 GB) at 32,768 tokens (lesson 9.6)', 'pt-br': '2 GiB (~2,15 GB) em 32.768 tokens (aula 9.6)' },
              pigment: 'caution',
              weight: 2.15,
            },
            {
              label: { en: 'Display-reserved memory', 'pt-br': 'Memória reservada ao display' },
              detail: { en: '2 GB default, switchable to 4 GB in BIOS', 'pt-br': '2 GB por padrão, alternável para 4 GB na BIOS' },
              pigment: 'muted',
              weight: 2,
            },
            {
              label: { en: 'Operating system and headroom', 'pt-br': 'Sistema operacional e folga' },
              detail: { en: 'about 70 GB left; size budgets from MemAvailable', 'pt-br': 'cerca de 70 GB restantes; dimensione por MemAvailable' },
              pigment: 'success',
              weight: 69.85,
            },
          ],
        },
      },
      {
        label: { en: 'Q4_K_M checkpoint (17.1 GB)', 'pt-br': 'Checkpoint Q4_K_M (17,1 GB)' },
        caption: {
          en: 'Quantizing to 17.1 GB leaves over 100 GB free and trims the bytes carried through the 273 GB/s door each step. Planning decode heuristic: 273 / 17.1 ≈ 16.0 tok/s.',
          'pt-br': 'Quantizar para 17,1 GB deixa mais de 100 GB livres e reduz os bytes que cruzam a porta de 273 GB/s a cada passo. Heurística de planejamento no decode: 273 / 17,1 ≈ 16,0 tok/s.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Q4_K_M quantized weights', 'pt-br': 'Pesos quantizados Q4_K_M' },
              detail: { en: '17.1 GB pinned GGUF artifact (lessons 7.12 and 8.7)', 'pt-br': '17,1 GB do artefato GGUF fixado (aulas 7.12 e 8.7)' },
              pigment: 'accent',
              weight: 17.1,
            },
            {
              label: { en: 'KV cache and recurrent state', 'pt-br': 'KV cache e estado recorrente' },
              detail: { en: '2 GiB (~2.15 GB) at 32,768 tokens (lesson 9.6)', 'pt-br': '2 GiB (~2,15 GB) em 32.768 tokens (aula 9.6)' },
              pigment: 'caution',
              weight: 2.15,
            },
            {
              label: { en: 'Display-reserved memory', 'pt-br': 'Memória reservada ao display' },
              detail: { en: '2 GB default, switchable to 4 GB in BIOS', 'pt-br': '2 GB por padrão, alternável para 4 GB na BIOS' },
              pigment: 'muted',
              weight: 2,
            },
            {
              label: { en: 'Operating system and headroom', 'pt-br': 'Sistema operacional e folga' },
              detail: { en: 'about 107 GB left inside the 128 GB shared pool', 'pt-br': 'cerca de 107 GB restantes no pool compartilhado de 128 GB' },
              pigment: 'success',
              weight: 106.75,
            },
          ],
        },
      },
    ],
  },

  /**
   * 12.2 models the 54 GB bf16 checkpoint split between 252 GB HBM3e (7.1 TB/s)
   * and 496 GB LPDDR5X (396 GB/s). The plot replaces the 4-row blend table and
   * shows why averaging rates lies and why even overlapped prefetching falls off
   * a cliff past 5.3% spill.
   */
  't12-station-spill-cliff': {
    lesson: '12.2-dgx-station-hbm-beside-a-big-pool',
    title: { en: 'How fast decode drops as weights spill into LPDDR5X', 'pt-br': 'Como o decode despenca quando pesos transbordam para a LPDDR5X' },
    caption: {
      en: 'Bandwidth-only planning rates for the 54 GB bf16 checkpoint split between HBM3e (7,100 GB/s) and LPDDR5X (396 GB/s). Idealized vendor-peak figures, not measured latency bounds.',
      'pt-br': 'Taxas de planejamento só de bandwidth para o checkpoint bf16 de 54 GB dividido entre HBM3e (7.100 GB/s) e LPDDR5X (396 GB/s). Números idealizados de pico do fabricante, não limites medidos de latência.',
    },
    steps: [
      {
        label: { en: 'Sequential reads vs rate average', 'pt-br': 'Leituras sequenciais vs média das taxas' },
        caption: {
          en: 'Times add: 10% in LPDDR5X takes 20.5 ms per token (49 tok/s, down from 131), and a 50/50 split takes 3.8 + 68.2 = 72.0 ms (13.9 tok/s), nowhere near the wrong 69 tok/s rate average.',
          'pt-br': 'Os tempos se somam: 10% na LPDDR5X levam 20,5 ms por token (49 tok/s, ante 131), e uma divisão 50/50 leva 3,8 + 68,2 = 72,0 ms (13,9 tok/s), longe da média errada de 69 tok/s.',
        },
        body: {
          kind: 'plot',
          ...stationSpillAxes,
          series: [
            {
              label: { en: 'Sequential reads (times add)', 'pt-br': 'Leituras sequenciais (tempos somados)' },
              pigment: 'accent',
              points: stationSequentialPoints,
              marks: [
                { at: [10, 48.8], label: { en: '10% spill: 49 tok/s', 'pt-br': '10% fora: 49 tok/s' } },
                { at: [50, 13.9], label: { en: '50/50: 13.9 tok/s', 'pt-br': '50/50: 13,9 tok/s' } },
              ],
            },
            {
              label: { en: 'Averaging the two rates (wrong)', 'pt-br': 'Média das duas taxas (errada)' },
              pigment: 'danger',
              points: [[0, 131.5], [50, 69.4], [100, 7.3]],
              marks: [
                { at: [50, 69.4], label: { en: 'Wrong average: 69 tok/s', 'pt-br': 'Média errada: 69 tok/s' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Overlapped prefetching', 'pt-br': 'Prefetch sobreposto' },
        caption: {
          en: 'Reading the next layer while computing the current one turns the sum into the larger of the two times. That hides the slow pool only up to 5.3% spill; beyond that point, LPDDR5X sets the pace.',
          'pt-br': 'Ler a próxima camada enquanto a atual calcula troca a soma pelo maior dos dois tempos. Isso esconde o pool lento só até 5,3% de transbordo; acima disso, a LPDDR5X dita o ritmo.',
        },
        body: {
          kind: 'plot',
          ...stationSpillAxes,
          series: [
            {
              label: { en: 'Sequential reads (times add)', 'pt-br': 'Leituras sequenciais (tempos somados)' },
              pigment: 'muted',
              points: stationSequentialPoints,
            },
            {
              label: { en: 'Overlapped prefetch (max of both times)', 'pt-br': 'Prefetch sobreposto (maior dos dois tempos)' },
              pigment: 'success',
              points: [
                [0, 131.5],
                [5.3, 138.8],
                [10, 73.3],
                [20, 36.7],
                [35, 21.0],
                [50, 14.7],
                [75, 9.8],
                [100, 7.3],
              ],
              marks: [
                { at: [5.3, 138.8], label: { en: '5.3% crossover', 'pt-br': 'corte em 5,3%' } },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 12.3 introduces the four execution levels and then the four memory tiers
   * along with compute capability 12.x (GB10) limits. Pairing both in a 2-step
   * flow replaces the numbered memory list and dense limit recap.
   */
  't12-cuda-execution-and-memory': {
    lesson: '12.3-the-cuda-programming-model',
    title: { en: 'Execution scope and memory scope on GB10 (compute capability 12.x)', 'pt-br': 'Escopo de execução e escopo de memória no GB10 (compute capability 12.x)' },
    caption: {
      en: 'CUDA pairs each level of thread grouping with a matching memory tier, from smallest and fastest on the left to largest and slowest on the right. Limits shown are NVIDIA’s compute capability 12.x figures.',
      'pt-br': 'O CUDA associa cada nível de agrupamento de threads a uma camada de memória correspondente, da menor e mais rápida à esquerda até a maior e mais lenta à direita. Os limites mostrados são os da compute capability 12.x da NVIDIA.',
    },
    steps: [
      {
        label: { en: 'Execution hierarchy', 'pt-br': 'Hierarquia de execução' },
        caption: {
          en: 'One kernel launch creates a grid of blocks; each block runs on one streaming multiprocessor (SM), scheduled in warps of 32 threads.',
          'pt-br': 'Um lançamento de kernel cria um grid de blocos; cada bloco roda num streaming multiprocessor (SM), escalonado em warps de 32 threads.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Thread', 'pt-br': 'Thread' },
              detail: { en: 'runs kernel for one element; up to 1,536 resident per SM', 'pt-br': 'roda o kernel para um elemento; até 1.536 residentes por SM' },
              pigment: 'accent',
            },
            {
              label: { en: 'Warp (32 threads)', 'pt-br': 'Warp (grupo de 32 threads)' },
              detail: { en: 'scheduled together (SIMT); up to 48 resident warps per SM', 'pt-br': 'escalonadas juntas (SIMT); até 48 warps residentes por SM' },
              pigment: 'caution',
            },
            {
              label: { en: 'Block', 'pt-br': 'Bloco' },
              detail: { en: 'up to 1,024 threads on one SM; up to 24 resident blocks per SM', 'pt-br': 'até 1.024 threads num SM; até 24 blocos residentes por SM' },
              pigment: 'accent',
            },
            {
              label: { en: 'Grid', 'pt-br': 'Grid' },
              detail: { en: 'all blocks in one launch, rounded up to cover n elements', 'pt-br': 'todos os blocos de um lançamento, arredondado para cobrir n elementos' },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: 'Memory hierarchy', 'pt-br': 'Hierarquia de memória' },
        caption: {
          en: 'Moving left to right trades speed for capacity. Keeping data in registers and shared memory avoids 32-byte global DRAM transactions.',
          'pt-br': 'Ir da esquerda para a direita troca velocidade por capacidade. Manter dados em registradores e memória compartilhada evita transações de 32 bytes na DRAM global.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Registers', 'pt-br': 'Registradores' },
              detail: { en: 'private to one thread; 64 K per SM (~42 each at full occupancy)', 'pt-br': 'privados de uma thread; 64 K por SM (~42 cada na occupancy total)' },
              pigment: 'success',
            },
            {
              label: { en: 'Shared memory / L1', 'pt-br': 'Memória compartilhada / L1' },
              detail: { en: 'shared by one block on the SM; 100 KiB/SM (99 KiB per block)', 'pt-br': 'compartilhada por um bloco no SM; 100 KiB/SM (99 KiB por bloco)' },
              pigment: 'accent',
            },
            {
              label: { en: 'L2 cache', 'pt-br': 'Cache L2' },
              detail: { en: 'shared across the whole GPU chip; catches cross-block reuse', 'pt-br': 'compartilhado por todo o chip da GPU; captura reuso entre blocos' },
              pigment: 'caution',
            },
            {
              label: { en: 'Global memory (DRAM)', 'pt-br': 'Memória global (DRAM)' },
              detail: { en: 'largest and slowest; moves in 32-byte warp transactions', 'pt-br': 'maior e mais lenta; move-se em transações de 32 bytes por warp' },
              pigment: 'muted',
            },
          ],
        },
      },
    ],
  },

  /**
   * 12.4 walks through shared-memory tiling with its two __syncthreads()
   * barriers and contrasts that 16x reuse against batch-1 decode (GEMV).
   * Stepping through load+barrier 1, compute+barrier 2, and decode GEMV
   * replaces the prose loop narration before the kernel listing.
   */
  't12-tiled-matmul-cycle': {
    lesson: '12.4-writing-a-fast-kernel-tiling-and-tensor-cores',
    title: { en: 'One 16×16 tile step, then why batch-1 decode breaks the pattern', 'pt-br': 'Um passo de tile 16×16 e por que o decode em batch 1 quebra o padrão' },
    caption: {
      en: 'Tiling keeps every loaded number on chip so 16 threads reuse it; two barriers guard the load and the overwrite. Batch-1 decode has only one vector, so no weight is reused across a tile.',
      'pt-br': 'O tiling mantém cada número carregado no chip para que 16 threads o reutilizem; duas barreiras protegem a carga e a sobrescrita. O decode em batch 1 tem só um vetor, então nenhum peso é reutilizado num tile.',
    },
    steps: [
      {
        label: { en: '1. Load tile & Barrier 1', 'pt-br': '1. Carregar tile e Barreira 1' },
        caption: {
          en: 'Every thread loads one entry of A and one of B into shared arrays As and Bs (zero-filling out-of-range positions), then stops at Barrier 1 so no thread reads half-filled memory.',
          'pt-br': 'Cada thread carrega um valor de A e um de B nos arrays compartilhados As e Bs (preenchendo posições fora da faixa com zero) e para na Barreira 1 para ninguém ler memória pela metade.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Global DRAM', 'pt-br': 'DRAM global' },
              detail: { en: 'read one 16×16 tile of A and B (0.0f outside bounds)', 'pt-br': 'lê um tile 16×16 de A e B (0,0f fora dos limites)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Shared memory', 'pt-br': 'Memória compartilhada' },
              detail: { en: 'stage As and Bs on the SM once for the whole block', 'pt-br': 'guarda As e Bs no SM uma vez para o bloco inteiro' },
              pigment: 'accent',
            },
            {
              label: { en: 'Barrier 1', 'pt-br': 'Barreira 1' },
              detail: { en: '__syncthreads() waits until every slot is written', 'pt-br': '__syncthreads() espera até toda posição ser gravada' },
              pigment: 'caution',
            },
            {
              label: { en: 'Multiply loop', 'pt-br': 'Laço de multiplicação' },
              detail: { en: 'waits until Barrier 1 releases the block', 'pt-br': 'aguarda até a Barreira 1 liberar o bloco' },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: '2. Reuse 16× & Barrier 2', 'pt-br': '2. Reusar 16× e Barreira 2' },
        caption: {
          en: 'Each value in shared memory feeds 16 multiply-adds, lifting intensity 16× from 0.25 to 4 FLOP/B (~1.1 TFLOP/s roof on Spark). Barrier 2 holds fast threads before the next tile overwrites As and Bs.',
          'pt-br': 'Cada valor na memória compartilhada alimenta 16 multiplicações com soma, subindo a intensidade 16× de 0,25 para 4 FLOP/B (teto de ~1,1 TFLOP/s no Spark). A Barreira 2 segura threads rápidas antes de o próximo tile sobrescrever As e Bs.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Global DRAM', 'pt-br': 'DRAM global' },
              detail: { en: 'idle during this tile; 16× fewer global bytes moved', 'pt-br': 'ociosa neste tile; 16× menos bytes movidos da memória global' },
              pigment: 'muted',
            },
            {
              label: { en: 'Shared memory', 'pt-br': 'Memória compartilhada' },
              detail: { en: 'each loaded element serves 16 threads (0.25 → 4 FLOP/B)', 'pt-br': 'cada elemento carregado serve 16 threads (0,25 → 4 FLOP/B)' },
              pigment: 'success',
            },
            {
              label: { en: 'Multiply-add / Tensor Core', 'pt-br': 'Multiplicação com soma / Tensor Core' },
              detail: { en: '16 scalar steps per thread, or one warp tile instruction', 'pt-br': '16 passos escalares por thread, ou uma instrução de tile por warp' },
              pigment: 'accent',
            },
            {
              label: { en: 'Barrier 2', 'pt-br': 'Barreira 2' },
              detail: { en: '__syncthreads() stops early refill before all reads end', 'pt-br': '__syncthreads() impede recarga antes do fim de todas as leituras' },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: '3. Batch-1 decode (GEMV)', 'pt-br': '3. Decode em batch 1 (GEMV)' },
        caption: {
          en: 'One token vector fills at most 1 of 16 tile columns and uses each weight once: ~1 FLOP/B in bf16 or ~3.6 FLOP/B in NVFP4. Decode kernels stream weights into registers and reduce across the warp.',
          'pt-br': 'Um vetor de token preenche no máximo 1 de 16 colunas do tile e usa cada peso uma vez: ~1 FLOP/B em bf16 ou ~3,6 FLOP/B em NVFP4. Kernels de decode leem pesos em fluxo para registradores e reduzem no warp.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Global DRAM', 'pt-br': 'DRAM global' },
              detail: { en: 'each weight read once per token (~1 FLOP/B bf16, ~3.6 NVFP4)', 'pt-br': 'cada peso lido uma vez por token (~1 FLOP/B bf16, ~3,6 NVFP4)' },
              pigment: 'danger',
            },
            {
              label: { en: '16-wide tile', 'pt-br': 'Tile de largura 16' },
              detail: { en: '1 vector fills at most 1/16 of a tile; no weight reuse', 'pt-br': '1 vetor preenche no máximo 1/16 do tile; sem reuso de pesos' },
              pigment: 'muted',
            },
            {
              label: { en: 'Warp reduction', 'pt-br': 'Redução no warp' },
              detail: { en: 'wide loads into registers, then sum 32 partial sums', 'pt-br': 'cargas largas em registradores e soma de 32 somas parciais' },
              pigment: 'accent',
            },
            {
              label: { en: 'Bandwidth roof', 'pt-br': 'Teto de bandwidth' },
              detail: { en: 'high memory %, low FLOP % in Nsight Compute is expected', 'pt-br': 'memória alta e FLOP baixo no Nsight Compute é o esperado' },
              pigment: 'danger',
            },
          ],
        },
      },
    ],
  },

  /**
   * 12.5 organizes the CUDA serving stack as a five-rung ladder from hardware
   * up and walks it bottom-up with one command per rung. This stepped upward
   * stack replaces both the top layer list and the bottom check list.
   */
  't12-cuda-stack-ladder': {
    lesson: '12.5-the-cuda-stack-for-llms',
    title: { en: 'Five rungs between your GPU and an LLM completion', 'pt-br': 'Cinco degraus entre sua GPU e uma resposta de LLM' },
    caption: {
      en: 'Each layer sits on the ones below it. Check the stack from the bottom rung up: a healthy HTTP endpoint does not prove the layers underneath are running fast Blackwell kernels.',
      'pt-br': 'Cada camada apoia-se nas de baixo. Verifique a stack do degrau inferior para cima: um endpoint HTTP ativo não prova que as camadas abaixo estão rodando kernels rápidos para Blackwell.',
    },
    steps: [
      {
        label: { en: 'What each rung must agree on', 'pt-br': 'No que cada degrau precisa concordar' },
        caption: {
          en: 'Stock Founders Edition Spark ships DGX OS 7.5.0, driver 580.159.03 and CUDA Toolkit 13.0.2. The driver sets the ceiling for every toolkit, library and container above it.',
          'pt-br': 'O Spark Founders Edition de fábrica traz DGX OS 7.5.0, driver 580.159.03 e CUDA Toolkit 13.0.2. O driver define o teto para cada toolkit, biblioteca e contêiner acima dele.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            {
              label: { en: 'Driver', 'pt-br': 'Driver' },
              detail: { en: 'talks to GB10 (12.1); 580.159.03 stock sets ceiling (13.4 features need 615+)', 'pt-br': 'conversa com o GB10 (12.1); 580.159.03 define o teto (recursos 13.4 pedem 615+)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Toolkit and runtime', 'pt-br': 'Toolkit e runtime' },
              detail: { en: 'nvcc, headers and runtime (13.0.2 stock) — must fit under the driver', 'pt-br': 'nvcc, cabeçalhos e runtime (13.0.2 de fábrica) — precisam caber sob o driver' },
              pigment: 'accent',
            },
            {
              label: { en: 'Math and collective libraries', 'pt-br': 'Bibliotecas matemáticas e coletivas' },
              detail: { en: 'cuBLAS, cuDNN, CUTLASS 4.8 (min CUDA 13.0) and NCCL', 'pt-br': 'cuBLAS, cuDNN, CUTLASS 4.8 (mín. CUDA 13.0) e NCCL' },
              pigment: 'caution',
            },
            {
              label: { en: 'Framework wheel or container', 'pt-br': 'Wheel do framework ou contêiner' },
              detail: { en: 'aarch64 PyTorch cu130 wheel or pinned NGC container targeting 12.1', 'pt-br': 'wheel aarch64 PyTorch cu130 ou contêiner NGC fixado mirando 12.1' },
              pigment: 'caution',
            },
            {
              label: { en: 'LLM server', 'pt-br': 'Servidor de LLM' },
              detail: { en: 'vLLM, TensorRT-LLM, llama.cpp b11380 or TensorFold v1.2.1', 'pt-br': 'vLLM, TensorRT-LLM, llama.cpp b11380 ou TensorFold v1.2.1' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'One check per rung, bottom-up', 'pt-br': 'Uma verificação por degrau, de baixo para cima' },
        caption: {
          en: 'Start at the driver and move up one rung at a time. A passing import or /health response never proves optimized kernels; only the arch list plus a timed run does.',
          'pt-br': 'Comece pelo driver e suba um degrau por vez. Um import que passa ou um /health positivo nunca prova kernels otimizados; só a lista de arquiteturas somada a uma execução cronometrada prova.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            {
              label: { en: 'Verify driver and capability', 'pt-br': 'Conferir driver e capability' },
              detail: { en: 'nvidia-smi --query-gpu=name,driver_version,compute_cap → 580+ and 12.1', 'pt-br': 'nvidia-smi --query-gpu=name,driver_version,compute_cap → 580+ e 12.1' },
              pigment: 'accent',
            },
            {
              label: { en: 'Verify toolkit', 'pt-br': 'Conferir o toolkit' },
              detail: { en: 'nvcc --version → confirm compiler release fits the driver branch', 'pt-br': 'nvcc --version → confirmar que a versão do compilador cabe no ramo do driver' },
              pigment: 'accent',
            },
            {
              label: { en: 'Verify libraries and build target', 'pt-br': 'Conferir bibliotecas e alvo de build' },
              detail: { en: 'check container tag or CMake 121a-real target and CUDA 13 libraries', 'pt-br': 'conferir tag do contêiner ou alvo CMake 121a-real e bibliotecas CUDA 13' },
              pigment: 'caution',
            },
            {
              label: { en: 'Verify framework arch list', 'pt-br': 'Conferir a lista de arquiteturas do framework' },
              detail: { en: 'compare get_device_capability() with get_arch_list() + time a matmul', 'pt-br': 'comparar get_device_capability() com get_arch_list() + cronometrar um matmul' },
              pigment: 'caution',
            },
            {
              label: { en: 'Verify live completion', 'pt-br': 'Conferir uma resposta real' },
              detail: { en: 'curl /health and /v1/models, then time one real completion', 'pt-br': 'curl em /health e /v1/models, depois cronometrar uma completion real' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
