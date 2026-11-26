/**
 * Figures for track 11 — Mac Studio Ultra & MLX.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import { QWEN } from '~/lib/model-facts'
import type { Figure } from './types'

/**
 * 11.1: single-stream decode planning heuristic (vendor bandwidth ÷ file size).
 * Lesson 9.6 owns the method; lesson 11.1 owns the M5 Ultra quotients for the
 * pinned 17.1 GB Q4_K_M artifact and the 54 GB bf16 checkpoint.
 */
const M3_BANDWIDTH_GB_S = 800
const M5_BANDWIDTH_GB_S = 1200
const Q4_ARTIFACT_GB = 17.1
const BF16_CHECKPOINT_GB = QWEN.weightsGbBf16.value
const HEURISTIC_SIZES_GB = [15, Q4_ARTIFACT_GB, 20, 25, 30, 40, BF16_CHECKPOINT_GB, 60] as const

const decodeHeuristic = (bandwidthGbS: number, sizeGb: number): number =>
  Math.round((bandwidthGbS / sizeGb) * 10) / 10

const decodeHeuristicAxes = {
  xAxis: {
    label: { en: 'Model file size', 'pt-br': 'Tamanho do arquivo do modelo' },
    scale: 'linear',
    min: 15,
    max: 60,
    unit: 'GB',
  },
  yAxis: {
    label: { en: 'Single-stream decode heuristic', 'pt-br': 'Heurística de decode em stream único' },
    scale: 'linear',
    min: 0,
    max: 80,
    unit: 'tok/s',
  },
} as const

const m3HeuristicPoints = HEURISTIC_SIZES_GB.map(
  (gb) => [gb, decodeHeuristic(M3_BANDWIDTH_GB_S, gb)] as const,
)
const m5HeuristicPoints = HEURISTIC_SIZES_GB.map(
  (gb) => [gb, decodeHeuristic(M5_BANDWIDTH_GB_S, gb)] as const,
)

export const TRACK_11_FIGURES = {
  /**
   * 11.1 contrasts M3 Ultra (800 GB/s) with M5 Ultra (1,200 GB/s) on the
   * bandwidth ÷ file-size planning heuristic. Neither memory capacity nor peak
   * compute appears on either axis, showing why extra compute helps prefill
   * rather than single-stream decode.
   */
  't11-ultra-decode-heuristic': {
    lesson: '11.1-mac-studio-ultra-as-an-inference-machine',
    derivedFrom: '9-hardware-and-infrastructure/9.6-apple-silicon-unified-memory',
    title: {
      en: 'Vendor bandwidth sets the single-stream decode curve',
      'pt-br': 'A bandwidth do fabricante define a curva de decode em stream único',
    },
    caption: {
      en: 'Planning heuristic (vendor bandwidth divided by model file size, not a measurement). Capacity decides what fits and compute speeds up prefill; neither lifts this single-stream decode curve.',
      'pt-br': 'Heurística de planejamento (bandwidth do fabricante dividida pelo tamanho do arquivo, não uma medição). A capacidade decide o que cabe e o compute acelera o prefill; nenhum dos dois ergue esta curva de decode em stream único.',
    },
    steps: [
      {
        label: { en: 'M3 Ultra (800 GB/s)', 'pt-br': 'M3 Ultra (800 GB/s)' },
        caption: {
          en: 'At the 800 GB/s figure used in lesson 9.6, the pinned 17.1 GB Q4_K_M file lands near 46.8 tokens per second. Smaller files stream faster; larger tiers of memory (96 to 512 GB) do not move the curve.',
          'pt-br': 'Com os 800 GB/s usados na aula 9.6, o arquivo Q4_K_M fixado de 17,1 GB fica perto de 46,8 tokens por segundo. Arquivos menores passam mais rápido; níveis maiores de memória (96 a 512 GB) não movem a curva.',
        },
        body: {
          kind: 'plot',
          ...decodeHeuristicAxes,
          series: [
            {
              label: { en: 'M3 Ultra at 800 GB/s', 'pt-br': 'M3 Ultra a 800 GB/s' },
              pigment: 'accent',
              points: m3HeuristicPoints,
              marks: [
                {
                  at: [Q4_ARTIFACT_GB, decodeHeuristic(M3_BANDWIDTH_GB_S, Q4_ARTIFACT_GB)],
                  label: { en: 'Q4_K_M 17.1 GB (~46.8 tok/s)', 'pt-br': 'Q4_K_M 17,1 GB (~46,8 tok/s)' },
                },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'M5 Ultra (1,200 GB/s)', 'pt-br': 'M5 Ultra (1.200 GB/s)' },
        caption: {
          en: 'Raising vendor bandwidth by 1.5× to 1.2 TB/s lifts every point by 1.5×: ~70.2 tok/s for the 17.1 GB Q4_K_M file and ~22.2 tok/s for the 54 GB bf16 checkpoint. Apple’s up-to-4.3× peak compute jump helps long-prompt prefill, not this curve.',
          'pt-br': 'Elevar a bandwidth do fabricante em 1,5× para 1,2 TB/s ergue cada ponto em 1,5×: ~70,2 tok/s para o Q4_K_M de 17,1 GB e ~22,2 tok/s para o checkpoint bf16 de 54 GB. O salto de até 4,3× em compute de pico da Apple ajuda o prefill de prompts longos, não esta curva.',
        },
        body: {
          kind: 'plot',
          ...decodeHeuristicAxes,
          series: [
            {
              label: { en: 'M3 Ultra at 800 GB/s', 'pt-br': 'M3 Ultra a 800 GB/s' },
              pigment: 'muted',
              points: m3HeuristicPoints,
            },
            {
              label: { en: 'M5 Ultra at 1,200 GB/s', 'pt-br': 'M5 Ultra a 1.200 GB/s' },
              pigment: 'accent',
              points: m5HeuristicPoints,
              marks: [
                {
                  at: [Q4_ARTIFACT_GB, decodeHeuristic(M5_BANDWIDTH_GB_S, Q4_ARTIFACT_GB)],
                  label: { en: 'Q4_K_M 17.1 GB (~70.2 tok/s)', 'pt-br': 'Q4_K_M 17,1 GB (~70,2 tok/s)' },
                },
                {
                  at: [BF16_CHECKPOINT_GB, decodeHeuristic(M5_BANDWIDTH_GB_S, BF16_CHECKPOINT_GB)],
                  label: { en: 'bf16 54 GB (~22.2 tok/s)', 'pt-br': 'bf16 54 GB (~22,2 tok/s)' },
                },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 11.2 explains lazy graph recording, blocking mx.eval, overlapped
   * mx.async_eval (used by mlx-lm's generate_step), and why a naive stopwatch
   * or peak-memory check before eval reads garbage.
   */
  't11-mlx-lazy-overlap': {
    lesson: '11.2-mlx-in-depth-lazy-graphs-compile-streams',
    title: {
      en: 'Recording, blocking, and overlapping an MLX graph',
      'pt-br': 'Registrar, bloquear e sobrepor um grafo no MLX',
    },
    caption: {
      en: 'MLX appends operations to a lazy graph and computes nothing until triggered. The trigger you pick decides both GPU utilization and whether a timing or peak-memory reading is real.',
      'pt-br': 'O MLX acrescenta operações a um grafo lazy e não calcula nada até receber um gatilho. O gatilho escolhido decide tanto o uso da GPU quanto se uma leitura de tempo ou pico de memória é real.',
    },
    steps: [
      {
        label: { en: 'Record only (timing bug)', 'pt-br': 'Só registrar (erro de medição)' },
        caption: {
          en: 'Writing y = a @ a only records a graph node. Stopping a timer or checking peak memory before mx.eval measures graph recording and sees 0 MB allocated for the product.',
          'pt-br': 'Escrever y = a @ a apenas registra um nó no grafo. Parar um cronômetro ou checar o pico de memória antes do mx.eval mede a montagem do grafo e vê 0 MB alocado para o produto.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Python line', 'pt-br': 'Linha em Python' }, detail: { en: 'y = a @ a', 'pt-br': 'y = a @ a' }, pigment: 'muted' },
            { label: { en: 'Graph node added', 'pt-br': 'Nó adicionado ao grafo' }, detail: { en: 'operation recorded, not run', 'pt-br': 'operação registrada, não executada' }, pigment: 'accent' },
            { label: { en: 'Early timer & peak', 'pt-br': 'Timer e pico precoces' }, detail: { en: 'tiny ms, 0 MB peak — wrong', 'pt-br': 'poucos ms, pico 0 MB — errado' }, pigment: 'danger' },
            { label: { en: 'GPU queue', 'pt-br': 'Fila da GPU' }, detail: { en: 'still idle until eval', 'pt-br': 'parada até o eval' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Blocking mx.eval', 'pt-br': 'mx.eval bloqueante' },
        caption: {
          en: 'Calling mx.eval launches the GPU work and pauses Python until it finishes. Timings and peak memory are now real, but the CPU waits idle before starting the next step.',
          'pt-br': 'Chamar mx.eval dispara o trabalho na GPU e pausa o Python até terminar. O tempo e o pico de memória agora são reais, mas a CPU fica parada antes de começar o próximo passo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Build step n', 'pt-br': 'Monta passo n' }, detail: { en: 'CPU records graph nodes', 'pt-br': 'CPU registra os nós do grafo' }, pigment: 'accent' },
            { label: { en: 'mx.eval(y)', 'pt-br': 'mx.eval(y)' }, detail: { en: 'submits work and blocks CPU', 'pt-br': 'envia o trabalho e bloqueia a CPU' }, pigment: 'caution' },
            { label: { en: 'GPU runs step n', 'pt-br': 'GPU roda passo n' }, detail: { en: 'real timing and peak memory', 'pt-br': 'tempo e pico de memória reais' }, pigment: 'accent' },
            { label: { en: 'Build step n+1', 'pt-br': 'Monta passo n+1' }, detail: { en: 'starts only after GPU ends', 'pt-br': 'só começa depois que a GPU termina' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Overlapped mx.async_eval', 'pt-br': 'mx.async_eval sobreposto' },
        caption: {
          en: 'In mlx-lm’s generate_step, the CPU builds step n+1 from the still-uncomputed token node, calls mx.async_eval to queue it immediately, and only then calls .item() on step n. CPU and GPU run side by side.',
          'pt-br': 'No generate_step do mlx-lm, a CPU monta o passo n+1 a partir do nó de token ainda não calculado, chama mx.async_eval para enfileirá-lo na hora e só então chama .item() no passo n. CPU e GPU trabalham juntas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Build step n+1', 'pt-br': 'Monta passo n+1' }, detail: { en: 'chains onto uncomputed token n', 'pt-br': 'encadeia no token n ainda pendente' }, pigment: 'accent' },
            { label: { en: 'mx.async_eval', 'pt-br': 'mx.async_eval' }, detail: { en: 'returns at once; GPU runs n', 'pt-br': 'retorna na hora; GPU roda n' }, pigment: 'success' },
            { label: { en: '.item() on step n', 'pt-br': '.item() no passo n' }, detail: { en: 'reads previous token’s value', 'pt-br': 'lê o valor do token anterior' }, pigment: 'caution' },
            { label: { en: 'CPU + GPU overlap', 'pt-br': 'Sobreposição CPU + GPU' }, detail: { en: 'next graph ready without stalling', 'pt-br': 'próximo grafo pronto sem travar' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 11.3 replaces the five-item numbered stage list in the intro and illustrates
   * the silent 4-bit re-quantization trap at the mlx_lm.fuse join.
   */
  't11-mlx-lm-pipeline': {
    lesson: '11.3-mlx-lm-in-practice',
    title: {
      en: 'The mlx-lm path and the 4-bit fuse join',
      'pt-br': 'O caminho do mlx-lm e a junção do fuse em 4 bits',
    },
    caption: {
      en: 'Five commands take a 16-bit checkpoint to a tuned, cached model in mlx-lm 0.32.0. Step through to see how fusing directly into 4 bits can round away a small LoRA adapter.',
      'pt-br': 'Cinco comandos levam um checkpoint de 16 bits a um modelo ajustado e em cache no mlx-lm 0.32.0. Avance os passos para ver como o fuse direto em 4 bits pode arredondar e apagar um adapter LoRA pequeno.',
    },
    steps: [
      {
        label: { en: 'Five-stage path', 'pt-br': 'Caminho em cinco etapas' },
        caption: {
          en: 'Convert shrinks weights and prints effective bits per weight; check measures perplexity on held-out text; tune trains a LoRA adapter; fuse merges it into weights; cache saves repeated prompt prefill.',
          'pt-br': 'Converter encolhe os pesos e informa os bits efetivos por peso; conferir mede perplexidade em texto separado; ajustar treina um adapter LoRA; fazer o fuse incorpora o adapter aos pesos; guardar em cache salva o prefill de prompts repetidos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Convert', 'pt-br': 'Converter' }, detail: { en: 'mlx_lm.convert · read bpw', 'pt-br': 'mlx_lm.convert · ler bpw' }, pigment: 'accent' },
            { label: { en: 'Check', 'pt-br': 'Conferir' }, detail: { en: 'mlx_lm.perplexity · held-out text', 'pt-br': 'mlx_lm.perplexity · texto separado' }, pigment: 'accent' },
            { label: { en: 'Tune', 'pt-br': 'Ajustar' }, detail: { en: 'mlx_lm.lora · QLoRA if 4-bit', 'pt-br': 'mlx_lm.lora · QLoRA se em 4 bits' }, pigment: 'accent' },
            { label: { en: 'Fuse', 'pt-br': 'Fazer o fuse' }, detail: { en: 'mlx_lm.fuse · watch 4-bit rounding', 'pt-br': 'mlx_lm.fuse · atenção ao 4 bits' }, pigment: 'caution' },
            { label: { en: 'Cache', 'pt-br': 'Guardar em cache' }, detail: { en: 'mlx_lm.cache_prompt · shared prefix', 'pt-br': 'mlx_lm.cache_prompt · prefixo comum' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '4-bit fuse (adapter erased)', 'pt-br': 'Fuse em 4 bits (adapter apagado)' },
        caption: {
          en: 'Without --dequantize, tuner/lora.py expands each 4-bit layer, adds the adapter delta, and quantizes back to 4 bits. In the 30-step toy run, logits drifted ~23 from base + adapter and the top token reverted to the base model.',
          'pt-br': 'Sem --dequantize, o tuner/lora.py expande cada camada de 4 bits, soma o delta do adapter e quantiza de volta para 4 bits. Na execução de brinquedo de 30 passos, os logits ficaram a ~23 da base + adapter e o token principal voltou ao do modelo base.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '4-bit base', 'pt-br': 'Base em 4 bits' }, detail: { en: 'quantized layer weights', 'pt-br': 'pesos quantizados da camada' }, pigment: 'muted' },
            { label: { en: 'Dequantize', 'pt-br': 'Desquantizar' }, detail: { en: 'expand back to 16-bit', 'pt-br': 'expandir de volta para 16 bits' }, pigment: 'accent' },
            { label: { en: 'Add LoRA delta', 'pt-br': 'Somar delta LoRA' }, detail: { en: 'small update from tuning', 'pt-br': 'pequena mudança do ajuste' }, pigment: 'accent' },
            { label: { en: 'Re-quantize to 4-bit', 'pt-br': 'Requantizar para 4 bits' }, detail: { en: 'gap ~23; base top token returns', 'pt-br': 'distância ~23; volta ao token base' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Keep the adapter intact', 'pt-br': 'Manter o adapter intacto' },
        caption: {
          en: 'Compare last-position logits against base + adapter. Either pass --dequantize for a 16-bit fuse (gap 0.25 in the toy run, adapter top token kept) or skip fusing and load the adapter with --adapter-path.',
          'pt-br': 'Compare os logits da última posição com a base + adapter. Passe --dequantize para um fuse em 16 bits (distância 0,25 na execução de brinquedo, token do adapter mantido) ou pule o fuse e carregue o adapter com --adapter-path.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Base + adapter', 'pt-br': 'Modelo base + adapter' }, detail: { en: 'reference logits to match', 'pt-br': 'logits de referência para conferir' }, pigment: 'muted' },
            { label: { en: 'Option A: --dequantize', 'pt-br': 'Opção A: --dequantize' }, detail: { en: '16-bit fuse; gap 0.25, token kept', 'pt-br': 'fuse 16 bits; distância 0,25, mantido' }, pigment: 'success' },
            { label: { en: 'Option B: --adapter-path', 'pt-br': 'Opção B: --adapter-path' }, detail: { en: 'keep 4-bit base and adapter apart', 'pt-br': 'manter base 4 bits e adapter separados' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 11.4 contrasts stopping the TTFT clock on the first byte (headers / SSE
   * keepalive comments) against stopping on the first chunk carrying text.
   */
  't11-sse-ttft-clock': {
    lesson: '11.4-serving-from-a-mac-mlx-lm-server-and-mlx-serve',
    title: {
      en: 'Where to stop the clock on a streamed reply',
      'pt-br': 'Onde parar o relógio numa resposta em streaming',
    },
    caption: {
      en: 'Compare two servers with one client clock. HTTP headers and SSE keep-alive lines arrive before any token exists, so only the first chunk with text ends time to first token.',
      'pt-br': 'Compare dois servidores com um só relógio no cliente. Headers HTTP e linhas SSE de keep-alive chegam antes de existir qualquer token; só o primeiro chunk com texto encerra o tempo até o primeiro token.',
    },
    steps: [
      {
        label: { en: 'First byte (wrong clock)', 'pt-br': 'Primeiro byte (relógio errado)' },
        caption: {
          en: 'mlx_lm.server writes SSE comments such as ": keepalive 10/11" while processing the prompt, and headers arrive even earlier. Stopping at first_byte hides prefill time.',
          'pt-br': 'O mlx_lm.server escreve comentários SSE como ": keepalive 10/11" enquanto processa o prompt, e os headers chegam ainda antes. Parar em first_byte esconde o tempo de prefill.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Send request', 'pt-br': 'Enviar pedido' }, detail: { en: 'start client timer at t0', 'pt-br': 'inicia relógio do cliente em t0' }, pigment: 'muted' },
            { label: { en: 'Headers & : keepalive', 'pt-br': 'Headers e : keepalive' }, detail: { en: 'first_byte — stops during prefill', 'pt-br': 'first_byte — para durante o prefill' }, pigment: 'danger' },
            { label: { en: 'First text chunk', 'pt-br': 'Primeiro chunk de texto' }, detail: { en: 'first token actually arrives here', 'pt-br': 'o primeiro token chega só aqui' }, pigment: 'muted' },
            { label: { en: 'Remaining chunks', 'pt-br': 'Chunks seguintes' }, detail: { en: 'rest of the streamed reply', 'pt-br': 'restante da resposta em streaming' }, pigment: 'muted' },
            { label: { en: 'Usage & [DONE]', 'pt-br': 'Usage e [DONE]' }, detail: { en: 'token counts and cached_tokens', 'pt-br': 'contagens de tokens e cached_tokens' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'First text chunk (honest clock)', 'pt-br': 'Primeiro chunk de texto (relógio honesto)' },
        caption: {
          en: 'Ignore headers and keep-alive comments, stop TTFT at the first non-empty delta.content, compute approximate decode rate over the remaining tokens, and record cached_tokens to separate cold and warm runs.',
          'pt-br': 'Ignore headers e comentários de keep-alive, pare o TTFT no primeiro delta.content não vazio, calcule a taxa aproximada de decode nos tokens restantes e registre cached_tokens para separar execuções frias de quentes.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Send request', 'pt-br': 'Enviar pedido' }, detail: { en: 'start client timer at t0', 'pt-br': 'inicia relógio do cliente em t0' }, pigment: 'muted' },
            { label: { en: 'Headers & : keepalive', 'pt-br': 'Headers e : keepalive' }, detail: { en: 'skipped by the timer', 'pt-br': 'ignorados pelo cronômetro' }, pigment: 'muted' },
            { label: { en: 'First text chunk', 'pt-br': 'Primeiro chunk de texto' }, detail: { en: 'TTFT stops here (first_text)', 'pt-br': 'o TTFT para aqui (first_text)' }, pigment: 'accent' },
            { label: { en: 'Remaining chunks', 'pt-br': 'Chunks seguintes' }, detail: { en: 'decode ≈ (n − 1) / (last − first)', 'pt-br': 'decode ≈ (n − 1) / (último − primeiro)' }, pigment: 'success' },
            { label: { en: 'Usage & [DONE]', 'pt-br': 'Usage e [DONE]' }, detail: { en: 'check cached_tokens: cold vs warm', 'pt-br': 'conferir cached_tokens: frio vs quente' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 11.5 contrasts 1,200 GB/s local memory against 10–15 GB/s Thunderbolt 5
   * and shows why tensor-parallel decode is latency-bound (128 waits per token)
   * whereas long prefill is bandwidth-bound (~5 GiB for 4,096 tokens).
   */
  't11-cluster-wire-bottleneck': {
    lesson: '11.5-clustering-macs-mlx-distributed',
    derivedFrom: '9-hardware-and-infrastructure/9.9-interconnects-and-clusters',
    title: {
      en: 'Local memory against the Thunderbolt 5 wire',
      'pt-br': 'Memória local contra o cabo Thunderbolt 5',
    },
    caption: {
      en: 'M5 Ultra local memory (1,200 GB/s) is 80× to 120× faster than Thunderbolt 5 (10–15 GB/s). Weights stay inside each Mac and only activations cross, creating opposite bottlenecks in decode and prefill.',
      'pt-br': 'A memória local do M5 Ultra (1.200 GB/s) é de 80× a 120× mais rápida que o Thunderbolt 5 (10–15 GB/s). Os pesos ficam dentro de cada Mac e só as ativações atravessam, criando gargalos opostos no decode e no prefill.',
    },
    steps: [
      {
        label: { en: '80×–120× gap', 'pt-br': 'Diferença de 80× a 120×' },
        caption: {
          en: 'Thunderbolt 5 moves 80 Gb/s symmetrically (10 GB/s) or 120 Gb/s in Bandwidth Boost (15 GB/s). Because local memory runs at 1,200 GB/s, weights stay sharded on each Mac and only activations cross.',
          'pt-br': 'O Thunderbolt 5 move 80 Gb/s simétricos (10 GB/s) ou 120 Gb/s em Bandwidth Boost (15 GB/s). Como a memória local roda a 1.200 GB/s, os pesos ficam divididos em cada Mac e só ativações atravessam.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Mac A memory', 'pt-br': 'Memória do Mac A' }, detail: { en: '1,200 GB/s · weights stay local', 'pt-br': '1.200 GB/s · pesos ficam locais' }, pigment: 'success' },
            { label: { en: 'Thunderbolt 5 link', 'pt-br': 'Link Thunderbolt 5' }, detail: { en: '10–15 GB/s · activations only', 'pt-br': '10–15 GB/s · só ativações' }, pigment: 'danger' },
            { label: { en: 'Mac B memory', 'pt-br': 'Memória do Mac B' }, detail: { en: '1,200 GB/s · weights stay local', 'pt-br': '1.200 GB/s · pesos ficam locais' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Decode: latency-bound', 'pt-br': 'Decode: limitado por latência' },
        caption: {
          en: 'Lesson 9.9’s tensor-parallel model sends 128 all-reduces per token totaling 1.25 MiB—only ~0.13 ms of wire time at 10 GB/s (~0.09 ms at 15). Waiting on 128 sequential messages dominates, which is why JACCL RDMA is needed over TCP ring.',
          'pt-br': 'O modelo de tensor parallelism da aula 9.9 envia 128 all-reduces por token somando 1,25 MiB — só ~0,13 ms de transmissão a 10 GB/s (~0,09 ms a 15). Esperar 128 mensagens em sequência domina, por isso o JACCL com RDMA é necessário sobre o ring em TCP.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1 decoded token', 'pt-br': '1 token decodificado' }, detail: { en: 'tensor-parallel step', 'pt-br': 'passo de tensor parallelism' }, pigment: 'muted' },
            { label: { en: '128 all-reduces', 'pt-br': '128 all-reduces' }, detail: { en: '128 waits in sequence', 'pt-br': '128 esperas em sequência' }, pigment: 'danger' },
            { label: { en: '1.25 MiB payload', 'pt-br': '1,25 MiB de dados' }, detail: { en: '~0.13 ms wire time at 10 GB/s', 'pt-br': '~0,13 ms no fio a 10 GB/s' }, pigment: 'muted' },
            { label: { en: 'Latency-bound', 'pt-br': 'Limitado por latência' }, detail: { en: 'needs JACCL RDMA full mesh', 'pt-br': 'exige JACCL RDMA em malha total' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Long prefill: bandwidth-bound', 'pt-br': 'Prefill longo: limitado por bandwidth' },
        caption: {
          en: 'A 4,096-token prefill moves ~5 GiB of activations—roughly 0.54 s at 10 GB/s (0.36 s at 15), ignoring overhead and overlap. Clustering pays off when a model outgrows one Mac’s GPU-usable pool or on long-prefill jobs.',
          'pt-br': 'Um prefill de 4.096 tokens move ~5 GiB de ativações — cerca de 0,54 s a 10 GB/s (0,36 s a 15), sem overhead nem sobreposição. O cluster compensa quando o modelo não cabe no pool utilizável pela GPU de um Mac ou em prefills longos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '4,096-token prompt', 'pt-br': 'Prompt de 4.096 tokens' }, detail: { en: 'bulk prefill pass', 'pt-br': 'passada em bloco do prefill' }, pigment: 'muted' },
            { label: { en: '~5 GiB activations', 'pt-br': '~5 GiB de ativações' }, detail: { en: 'transferred over the link', 'pt-br': 'transferidos pelo link' }, pigment: 'accent' },
            { label: { en: '~0.54 s at 10 GB/s', 'pt-br': '~0,54 s a 10 GB/s' }, detail: { en: '~0.36 s at 15 GB/s heuristic', 'pt-br': 'heurística de ~0,36 s a 15 GB/s' }, pigment: 'caution' },
            { label: { en: 'Bandwidth-bound', 'pt-br': 'Limitado por bandwidth' }, detail: { en: 'pays off on fit or long prefill', 'pt-br': 'compensa em capacidade ou prefill' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
