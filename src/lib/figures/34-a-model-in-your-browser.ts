/**
 * Figures for track 34 — A Model in Your Browser.
 *
 * Every numeric value about Qwen3-0.6B and `examples/qwen-local-lab/` comes
 * from `src/lib/browser-lab-facts.ts`, never from `model-facts.ts` (which owns
 * Qwen3.8-27B).
 */
import { BROWSER_LAB, downloadSeconds } from '~/lib/browser-lab-facts'
import { formatNumber } from '~/lib/i18n'
import type { Figure, Localised } from './types'

const both = (value: number, maxFrac = 2): Localised => ({
  en: formatNumber('en', value, { maximumFractionDigits: maxFrac }),
  'pt-br': formatNumber('pt-br', value, { maximumFractionDigits: maxFrac }),
})

const bwPoints = [10, 25, 50, 100, 250, 500] as const
const cpuGpuTotalBytes = Math.round((BROWSER_LAB.gpuWeightsMb.value + BROWSER_LAB.gpuAuxMb.value) * 1_000_000)

export const TRACK_34_FIGURES = {
  /** 34.1: where each component lives inside one browser tab and where the network stops. */
  'browser-lab-architecture': {
    lesson: '34.1-what-runs-where',
    title: { en: 'What runs where inside one browser tab', 'pt-br': 'O que roda onde dentro de uma aba' },
    caption: {
      en: 'Only model downloads cross the network boundary. Once the weights are loaded, the main page talks to a dedicated Web Worker, which drives the embedded engine locally.',
      'pt-br': 'Só o download do modelo cruza a fronteira da rede. Depois que os pesos carregam, a página principal fala com um Web Worker dedicado, que dirige o motor embutido localmente.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Page UI (main thread)', 'pt-br': 'Interface (thread principal)' },
          detail: { en: 'composer, transcript, textContent rendering, optional localStorage', 'pt-br': 'campo de mensagem, histórico, renderização com textContent, localStorage opcional' },
          pigment: 'muted',
        },
        {
          label: { en: 'Wrapper Web Worker', 'pt-br': 'Web Worker envoltório' },
          detail: { en: 'blob: module, RPC messages, fetch guard outside load', 'pt-br': 'módulo blob:, mensagens RPC, bloqueio de rede fora do carregamento' },
          pigment: 'accent',
        },
        {
          label: { en: 'Embedded engine', 'pt-br': 'Motor embutido' },
          detail: { en: 'wllama 2.3.7 (WASM CPU) or WebLLM 0.2.89 (WebGPU)', 'pt-br': 'wllama 2.3.7 (WASM CPU) ou WebLLM 0.2.89 (WebGPU)' },
          pigment: 'accent',
        },
        {
          label: { en: 'Model weights', 'pt-br': 'Pesos do modelo' },
          detail: {
            en: `Qwen3-0.6B: ${both(BROWSER_LAB.cpuGgufMb.value).en} MB Q8_0 GGUF (SHA-256 checked) or ~${both(BROWSER_LAB.gpuWeightsMb.value + BROWSER_LAB.gpuAuxMb.value).en} MB Q4 MLC (revision-pinned; model_lib SHA-256 checked)`,
            'pt-br': `Qwen3-0.6B: ${both(BROWSER_LAB.cpuGgufMb.value)['pt-br']} MB GGUF Q8_0 (SHA-256 verificado) ou ~${both(BROWSER_LAB.gpuWeightsMb.value + BROWSER_LAB.gpuAuxMb.value)['pt-br']} MB MLC Q4 (revisão fixada; model_lib com SHA-256)`,
          },
          pigment: 'caution',
        },
        {
          label: { en: 'Browser Cache API', 'pt-br': 'Cache API do navegador' },
          detail: { en: 'device storage; CPU GGUF re-hashed before reuse', 'pt-br': 'armazenamento local; GGUF de CPU verificado novamente com SHA-256 antes do reuso' },
          pigment: 'success',
        },
      ],
    },
  },

  /** 34.2: anatomy of the 639.45 MB Qwen3-0.6B Q8_0 GGUF file checked by the worker. */
  'gguf-file-anatomy': {
    lesson: '34.2-inside-the-gguf-file',
    title: { en: 'Inside the 639.45 MB Qwen3-0.6B GGUF file', 'pt-br': 'Por dentro do arquivo GGUF de 639,45 MB do Qwen3-0.6B' },
    caption: {
      en: 'Weights dominate the file by orders of magnitude, while the first four bytes and metadata header let the worker reject wrong files before spending compute. Relative weights below are illustrative so the header stays legible.',
      'pt-br': 'Os pesos dominam o arquivo por ordens de grandeza, enquanto os primeiros quatro bytes e o cabeçalho de metadados deixam o worker recusar arquivos errados antes de gastar computação. Os pesos relativos abaixo são ilustrativos para manter o cabeçalho legível.',
    },
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        {
          label: { en: 'Magic header (4 bytes)', 'pt-br': 'Cabeçalho mágico (4 bytes)' },
          detail: { en: 'ASCII "GGUF" (71, 71, 85, 70) checked before load', 'pt-br': 'ASCII "GGUF" (71, 71, 85, 70) verificado antes de carregar' },
          pigment: 'caution',
          weight: 8,
        },
        {
          label: { en: 'Metadata key-value table', 'pt-br': 'Tabela chave-valor de metadados' },
          detail: {
            en: `architecture "qwen3", ${BROWSER_LAB.layers.value} layers, ${both(BROWSER_LAB.hiddenSize.value, 0).en} hidden dim, tokenizer`,
            'pt-br': `arquitetura "qwen3", ${BROWSER_LAB.layers.value} camadas, dimensão oculta ${both(BROWSER_LAB.hiddenSize.value, 0)['pt-br']}, tokenizer`,
          },
          pigment: 'accent',
          weight: 14,
        },
        {
          label: { en: 'Q8_0 quantized tensor blocks', 'pt-br': 'Blocos de tensores quantizados em Q8_0' },
          detail: {
            en: `almost all of the ${both(BROWSER_LAB.cpuGgufBytes.value, 0).en} bytes (~${both(BROWSER_LAB.cpuGgufMb.value).en} MB; ~${both(BROWSER_LAB.cpuGgufBase64Mb.value, 0).en} MB if base64-encoded)`,
            'pt-br': `quase todos os ${both(BROWSER_LAB.cpuGgufBytes.value, 0)['pt-br']} bytes (~${both(BROWSER_LAB.cpuGgufMb.value)['pt-br']} MB; ~${both(BROWSER_LAB.cpuGgufBase64Mb.value, 0)['pt-br']} MB em base64)`,
          },
          pigment: 'success',
          weight: 78,
        },
      ],
    },
  },

  /** 34.3: capability checks that route a tab to WebGPU or single/multi-thread WASM. */
  'browser-engine-selection': {
    lesson: '34.3-two-engines-one-tab',
    title: { en: 'How one tab chooses an engine', 'pt-br': 'Como uma aba escolhe o motor' },
    caption: {
      en: 'Auto mode tests real browser capabilities and picks ONE route: WebGPU when shader-f16 is available, otherwise CPU WebAssembly (up to 4 threads with COOP/COEP, or 1 thread without).',
      'pt-br': 'O modo Auto testa capacidades reais do navegador e escolhe UMA rota: WebGPU quando shader-f16 existe, ou CPU WebAssembly (até 4 threads com COOP/COEP, ou 1 thread sem eles).',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'WebGPU + shader-f16?', 'pt-br': 'WebGPU com shader-f16?' },
          detail: { en: 'requestAdapter() and features.has("shader-f16")', 'pt-br': 'requestAdapter() e features.has("shader-f16")' },
          pigment: 'accent',
        },
        {
          label: { en: 'GPU path (WebLLM)', 'pt-br': 'Rota GPU (WebLLM)' },
          detail: {
            en: `fetch pinned ${both(BROWSER_LAB.gpuModelLibMb.value).en} MB WASM lib, verify SHA-256, pass blob: URL`,
            'pt-br': `baixa lib WASM fixada de ${both(BROWSER_LAB.gpuModelLibMb.value)['pt-br']} MB, confere SHA-256, passa URL blob:`,
          },
          pigment: 'success',
        },
        {
          label: { en: 'WASM SIMD + exceptions?', 'pt-br': 'WASM SIMD + exceções?' },
          detail: { en: 'WebAssembly.validate() probes two tiny bytecode modules', 'pt-br': 'WebAssembly.validate() testa dois módulos mínimos de bytecode' },
          pigment: 'accent',
        },
        {
          label: { en: 'crossOriginIsolated?', 'pt-br': 'crossOriginIsolated?' },
          detail: {
            en: `true -> up to ${BROWSER_LAB.maxCpuThreads.value} threads (SharedArrayBuffer); false -> 1 thread`,
            'pt-br': `true -> até ${BROWSER_LAB.maxCpuThreads.value} threads (SharedArrayBuffer); false -> 1 thread`,
          },
          pigment: 'caution',
        },
      ],
    },
  },

  /** 34.4a: streaming download and incremental SHA-256 verification without a duplicate buffer. */
  'streaming-hash-pipeline': {
    lesson: '34.4-streaming-and-verifying-weights',
    title: { en: 'Hashing 639.45 MB without copying it twice', 'pt-br': 'Calculando SHA-256 de 639,45 MB sem duplicar o buffer' },
    caption: {
      en: 'Each chunk updates hash-wasm’s incremental SHA-256 as it flows through a TransformStream, so a mismatch fails before the file ever touches Cache API.',
      'pt-br': 'Cada pedaço atualiza o SHA-256 incremental da hash-wasm ao atravessar um TransformStream, então uma divergência falha antes de o arquivo tocar a Cache API.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Pinned HTTPS fetch', 'pt-br': 'Fetch HTTPS fixado' },
          detail: { en: 'immutable commit URL, credentials: omit, cache: no-store', 'pt-br': 'URL de commit imutável, credentials: omit, cache: no-store' },
          pigment: 'muted',
        },
        {
          label: { en: 'TransformStream guard', 'pt-br': 'Guarda TransformStream' },
          detail: {
            en: `aborts if bytes > ${both(BROWSER_LAB.cpuGgufBytes.value, 0).en}; calls hasher.update(chunk)`,
            'pt-br': `aborta se bytes > ${both(BROWSER_LAB.cpuGgufBytes.value, 0)['pt-br']}; chama hasher.update(chunk)`,
          },
          pigment: 'accent',
        },
        {
          label: { en: 'Blob + magic + digest', 'pt-br': 'Blob, magic e resumo SHA-256' },
          detail: { en: 'browser collects Blob; worker checks exact size, "GGUF", SHA-256', 'pt-br': 'navegador monta o Blob; worker confere tamanho exato, "GGUF" e SHA-256' },
          pigment: 'caution',
        },
        {
          label: { en: 'Cache API write / re-hash', 'pt-br': 'Gravação / re-hash na Cache API' },
          detail: { en: 'saved only after pass; warm hits stream through the same hasher', 'pt-br': 'salvo só após passar; acertos de cache passam pelo mesmo hasher' },
          pigment: 'success',
        },
      ],
    },
  },

  /** 34.4b: transfer time vs link speed for CPU GGUF vs GPU MLC. */
  'gguf-download-time': {
    lesson: '34.4-streaming-and-verifying-weights',
    title: { en: 'First-load download time by connection speed', 'pt-br': 'Tempo do primeiro download por velocidade de conexão' },
    caption: {
      en: 'Idealized transfer time (size × 8 ÷ bandwidth) for Qwen3-0.6B: the 639.45 MB Q8_0 CPU file takes nearly twice as long to fetch as the ~346.79 MB Q4 GPU bundle.',
      'pt-br': 'Tempo idealizado de transferência (tamanho × 8 ÷ banda) para o Qwen3-0.6B: o arquivo CPU Q8_0 de 639,45 MB leva quase o dobro do tempo do pacote GPU Q4 de ~346,79 MB.',
    },
    body: {
      kind: 'plot',
      xAxis: { label: { en: 'Effective download speed', 'pt-br': 'Velocidade efetiva de download' }, scale: 'log', min: 10, max: 500, unit: 'Mbps' },
      yAxis: { label: { en: 'Transfer time', 'pt-br': 'Tempo de transferência' }, scale: 'linear', min: 0, max: 550, unit: 's' },
      series: [
        {
          label: { en: 'CPU Q8_0 GGUF (639.45 MB)', 'pt-br': 'CPU GGUF Q8_0 (639,45 MB)' },
          pigment: 'accent',
          points: bwPoints.map((mbps) => [mbps, downloadSeconds(BROWSER_LAB.cpuGgufBytes.value, mbps)]),
        },
        {
          label: { en: 'GPU Q4 MLC (~346.79 MB)', 'pt-br': 'GPU MLC Q4 (~346,79 MB)' },
          pigment: 'success',
          points: bwPoints.map((mbps) => [mbps, downloadSeconds(cpuGpuTotalBytes, mbps)]),
        },
      ],
    },
  },

  /** 34.5: stepped flow of turning a chat turn into tokens and streamed output. */
  'browser-chat-turn': {
    lesson: '34.5-chat-tokens-and-context',
    title: { en: 'One chat turn, four stages inside the worker', 'pt-br': 'Um turno de chat, quatro etapas dentro do worker' },
    caption: {
      en: 'Step through how the lab turns your message history into prompt tokens, fits them inside 2,048 tokens, samples on CPU or GPU, and reuses the prefix cache on follow-ups.',
      'pt-br': 'Avance passo a passo para ver como o laboratório transforma o histórico em tokens de prompt, encaixa tudo em 2.048 tokens, faz sampling em CPU ou GPU e reaproveita o cache de prefixo em turnos seguintes.',
    },
    steps: [
      {
        label: { en: '1. Template', 'pt-br': '1. Template' },
        caption: {
          en: 'formatQwen wraps each role in <|im_start|>…<|im_end|> and pre-fills an empty <think> block on CPU; WebLLM takes structured messages with enable_thinking: false.',
          'pt-br': 'formatQwen envolve cada papel em <|im_start|>…<|im_end|> e pré-preenche um bloco <think> vazio na CPU; o WebLLM recebe mensagens estruturadas com enable_thinking: false.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'System + history', 'pt-br': 'Sistema + histórico' }, detail: { en: 'strict user/assistant alternation', 'pt-br': 'alternância estrita user/assistant' }, pigment: 'muted' },
            { label: { en: 'Chat markers', 'pt-br': 'Marcadores de chat' }, detail: { en: '<|im_start|>role … <|im_end|>', 'pt-br': '<|im_start|>role … <|im_end|>' }, pigment: 'accent' },
            { label: { en: 'No-think cue', 'pt-br': 'Sinal sem raciocínio' }, detail: { en: 'CPU pre-fills <think></think>; GPU sets enable_thinking: false', 'pt-br': 'CPU pré-preenche <think></think>; GPU usa enable_thinking: false' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: '2. Fit 2,048', 'pt-br': '2. Encaixar 2.048' },
        caption: {
          en: 'CPU counts exact tokens with the loaded tokenizer (+ BOS if needed). GPU uses a conservative UTF-8 byte upper bound + 64 bytes. Oldest complete pairs drop first; the current prompt is never silently cut.',
          'pt-br': 'A CPU conta tokens exatos com o tokenizer carregado (+ BOS se preciso). A GPU usa um teto conservador em bytes UTF-8 + 64 bytes. Os pares completos mais antigos saem primeiro; o prompt atual nunca é cortado em silêncio.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Count prompt', 'pt-br': 'Contar prompt' }, detail: { en: 'CPU: exact tokens; GPU: UTF-8 bytes + 64', 'pt-br': 'CPU: tokens exatos; GPU: bytes UTF-8 + 64' }, pigment: 'accent' },
            { label: { en: 'Reserve reply + 8', 'pt-br': 'Reservar resposta + 8' }, detail: { en: 'promptTokens + maxTokens + 8 <= 2048', 'pt-br': 'soma prompt + resposta + 8 <= 2.048' }, pigment: 'caution' },
            { label: { en: 'Drop oldest pair', 'pt-br': 'Remover par antigo' }, detail: { en: 'removes user+assistant pair, notifies UI; rejects single oversized prompt', 'pt-br': 'remove par user+assistant e avisa a UI; recusa prompt único grande demais' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: '3. Sample', 'pt-br': '3. Sampling' },
        caption: {
          en: 'Both routes apply your temperature and top_p 0.8, but CPU also applies top_k 20 whereas WebLLM 0.2.89 has no top_k parameter — so identical settings do not guarantee identical text across backends.',
          'pt-br': 'As duas rotas aplicam sua temperatura e top_p 0,8, mas a CPU também aplica top_k 20 enquanto o WebLLM 0.2.89 não tem top_k — portanto ajustes iguais não garantem texto idêntico entre backends.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'CPU (wllama)', 'pt-br': 'CPU (wllama)' }, detail: { en: 'temp + top_k 20 + top_p 0.8', 'pt-br': 'temp + top_k 20 + top_p 0,8' }, pigment: 'accent' },
            { label: { en: 'GPU (WebLLM)', 'pt-br': 'GPU (WebLLM)' }, detail: { en: 'temp + top_p 0.8 (no top_k)', 'pt-br': 'temp + top_p 0,8 (sem top_k)' }, pigment: 'caution' },
            { label: { en: 'Stream tokens', 'pt-br': 'Transmitir tokens' }, detail: { en: 'postMessage({ type: "token" }) -> textContent', 'pt-br': 'postMessage de token escrito via textContent' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '4. Prefix cache', 'pt-br': '4. Cache de prefixo' },
        caption: {
          en: 'With useCache: true, turn 2 reuses the KV state of the shared prompt prefix. On Apple M5 Pro CPU (4 threads), TTFT dropped from 0.65 s on turn 1 to 0.44 s on turn 2; on cloud 1-thread CPU, from 10.91 s to 6.92 s.',
          'pt-br': 'Com useCache: true, o turno 2 reaproveita o estado de KV do prefixo comum do prompt. No Apple M5 Pro em CPU (4 threads), o TTFT caiu de 0,65 s no turno 1 para 0,44 s no turno 2; na nuvem em 1 thread, de 10,91 s para 6,92 s.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Turn 1 prefill', 'pt-br': 'Prefill turno 1' }, detail: { en: 'computes KV for system + prompt 1 (0.65 s M5 Pro)', 'pt-br': 'calcula KV do sistema + prompt 1 (0,65 s no M5 Pro)' }, pigment: 'muted' },
            { label: { en: 'Turn 2 shared prefix', 'pt-br': 'Prefixo comum turno 2' }, detail: { en: 'KV reused, only new user turn prefilled (0.44 s M5 Pro)', 'pt-br': 'KV reaproveitado, só o novo turno faz prefill (0,44 s no M5 Pro)' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /** 34.6: isolation, fetch guard, CSP, and two-stage stop fallback. */
  'worker-guards-and-stop': {
    lesson: '34.6-keeping-it-local-and-stoppable',
    title: { en: 'How the tab stays local and stoppable', 'pt-br': 'Como a aba permanece local e interrompível' },
    caption: {
      en: 'Two layers guard the boundary: a CSP restricts which origins and scripts the browser allows at all, while the worker blocks HTTP fetch() once loading finishes and the page terminates the worker if cooperative stop stalls past 3 seconds.',
      'pt-br': 'Duas camadas guardam a fronteira: uma CSP restringe quais origens e scripts o navegador aceita, enquanto o worker bloqueia fetch() HTTP depois do carregamento e a página encerra o worker se a parada cooperativa travar além de 3 segundos.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'CSP policy', 'pt-br': 'Política CSP' },
          detail: { en: 'hashed inline script/style, blob: worker, connect-src allowlist only', 'pt-br': 'script/estilo inline com hash, worker blob:, allowlist em connect-src' },
          pigment: 'accent',
        },
        {
          label: { en: 'Worker fetch guard', 'pt-br': 'Guarda de fetch no worker' },
          detail: { en: 'throws NETWORK_DURING_GENERATION for http(s) when op !== "load"', 'pt-br': 'lança NETWORK_DURING_GENERATION para http(s) fora de "load"' },
          pigment: 'accent',
        },
        {
          label: { en: 'Cooperative stop', 'pt-br': 'Parada cooperativa' },
          detail: { en: 'AbortController + WebLLM interruptGenerate()', 'pt-br': 'AbortController + interruptGenerate() no WebLLM' },
          pigment: 'caution',
        },
        {
          label: { en: '3 s terminate fallback', 'pt-br': 'Fallback terminate em 3 s' },
          detail: { en: 'worker.terminate() kills blocked WASM prefill + nested threads', 'pt-br': 'worker.terminate() encerra prefill WASM travado + threads filhas' },
          pigment: 'danger',
        },
      ],
    },
  },

  /** 34.7: byte breakdown of the single-file dist/index.html artifact. */
  'single-html-bundle': {
    lesson: '34.7-shipping-as-one-file',
    title: { en: 'What makes up the 15.66 MB single HTML file', 'pt-br': 'O que compõe o arquivo HTML único de 15,66 MB' },
    caption: {
      en: 'Five verified vendor binaries total 11.66 MB raw; base64 encoding expands every 3 bytes into 4 ASCII characters (+33.3%), bringing dist/index.html to 15,658,390 bytes while keeping model weights separate.',
      'pt-br': 'Cinco binários verificados somam 11,66 MB brutos; a codificação base64 expande cada 3 bytes em 4 caracteres ASCII (+33,3%), levando dist/index.html a 15.658.390 bytes mantendo os pesos do modelo separados.',
    },
    body: {
      kind: 'stack',
      direction: 'up',
      steps: [
        {
          label: { en: 'WebLLM 0.2.89 JS', 'pt-br': 'WebLLM 0.2.89 JS' },
          detail: { en: `${both(BROWSER_LAB.webllmJsBytes.value / 1_000_000).en} MB raw (~9.10 MB base64)`, 'pt-br': `${both(BROWSER_LAB.webllmJsBytes.value / 1_000_000)['pt-br']} MB bruto (~9,10 MB base64)` },
          pigment: 'accent',
          weight: Math.round((BROWSER_LAB.webllmJsBytes.value * 4) / 3),
        },
        {
          label: { en: 'wllama multi-thread WASM', 'pt-br': 'wllama WASM multi-thread' },
          detail: { en: `${both(BROWSER_LAB.wllamaMultiWasmBytes.value / 1_000_000).en} MB raw (~2.92 MB base64)`, 'pt-br': `${both(BROWSER_LAB.wllamaMultiWasmBytes.value / 1_000_000)['pt-br']} MB bruto (~2,92 MB base64)` },
          pigment: 'success',
          weight: Math.round((BROWSER_LAB.wllamaMultiWasmBytes.value * 4) / 3),
        },
        {
          label: { en: 'wllama single-thread WASM', 'pt-br': 'wllama WASM single-thread' },
          detail: { en: `${both(BROWSER_LAB.wllamaSingleWasmBytes.value / 1_000_000).en} MB raw (~2.88 MB base64)`, 'pt-br': `${both(BROWSER_LAB.wllamaSingleWasmBytes.value / 1_000_000)['pt-br']} MB bruto (~2,88 MB base64)` },
          pigment: 'success',
          weight: Math.round((BROWSER_LAB.wllamaSingleWasmBytes.value * 4) / 3),
        },
        {
          label: { en: 'wllama JS + hash-wasm JS', 'pt-br': 'JS da wllama e da hash-wasm' },
          detail: { en: '0.49 MB raw (~0.65 MB base64)', 'pt-br': '0,49 MB bruto (~0,65 MB base64)' },
          pigment: 'caution',
          weight: Math.round(((BROWSER_LAB.wllamaJsBytes.value + BROWSER_LAB.hashWasmJsBytes.value) * 4) / 3),
        },
        {
          label: { en: 'UI, app, worker, notices, CSP', 'pt-br': 'UI, app, worker, licenças e CSP' },
          detail: { en: '~0.11 MB plain UTF-8 text', 'pt-br': '~0,11 MB texto UTF-8 puro' },
          pigment: 'muted',
          weight: BROWSER_LAB.builtHtmlBytes.value - Math.round((BROWSER_LAB.rawVendorPayloadBytes.value * 4) / 3),
        },
      ],
    },
  },

  /** 34.8a: evidence matrix separating fixture-tested, environment-tested, and unverified claims. */
  'browser-evidence-matrix': {
    lesson: '34.8-measuring-browser-inference',
    title: { en: 'What is proven, and by which kind of evidence', 'pt-br': 'O que está provado, e por qual tipo de evidência' },
    caption: {
      en: 'A cell is filled (1) where that evidence grade exists in VERIFICATION.md on 2026-11-26 and blank (masked) where it does not. Fixture tests never prove real-browser speed; one Mac run never proves mobile Safari.',
      'pt-br': 'Uma célula aparece preenchida (1) onde aquele grau de evidência existe em VERIFICATION.md em 26/11/2026 e bloqueada onde não existe. Testes com fixtures nunca provam velocidade em navegador real; uma rodada num Mac nunca prova Safari móvel.',
    },
    body: {
      kind: 'grid',
      bins: 4,
      columns: [
        { en: 'Fixture-tested', 'pt-br': 'Com fixtures' },
        { en: 'Chromium M5 Pro', 'pt-br': 'Chromium no M5 Pro' },
        { en: 'Safari / Mobile', 'pt-br': 'Safari / Celular' },
      ],
      rows: [
        { en: 'Tampered SHA-256 refusal & control flow', 'pt-br': 'Recusa de SHA-256 adulterado e fluxo de controle' },
        { en: 'Real 639 MB CPU cold + warm cache run', 'pt-br': 'Rodada real de 639 MB em CPU (frio e cache)' },
        { en: 'Real WebGPU pinned lib + decode run', 'pt-br': 'Rodada real em WebGPU com lib fixada e decode' },
        { en: 'Local GGUF import offline', 'pt-br': 'Importação local GGUF offline' },
      ],
      cells: [
        [1, null, null],
        [null, 1, null],
        [null, 1, null],
        [null, null, null],
      ],
    },
  },

  /** 34.8b: measured decode throughput across environments (environment-tested, not universal benchmarks). */
  'browser-decode-rates': {
    lesson: '34.8-measuring-browser-inference',
    title: { en: 'Observed decode throughput by route and prompt', 'pt-br': 'Taxa de decode observada por rota e prompt' },
    caption: {
      en: `Environment-tested single-device readings from VERIFICATION.md (2026-11-26, Qwen3-0.6B, ${both(BROWSER_LAB.contextTokens.value, 0).en} configured context). Route index: 1 = Cloud Chromium 1-thread CPU (two-turn average ${both(BROWSER_LAB.cloudCpu1ThreadDecodeTps.value, 1).en} vs arithmetic turn ${both(BROWSER_LAB.cloudCpu1ThreadArithTps.value, 1).en}), 2 = Apple M5 Pro ${BROWSER_LAB.maxCpuThreads.value}-thread CPU (turn 1: ${both(BROWSER_LAB.appleCpuDecodeTpsTurn1.value, 1).en} vs turn 2: ${both(BROWSER_LAB.appleCpuDecodeTpsTurn2.value, 1).en}), 3 = Apple M5 Pro Metal-3 WebGPU (turn 1: ${both(BROWSER_LAB.appleGpuDecodeTpsColdShader.value, 1).en} vs turn 2: ${both(BROWSER_LAB.appleGpuDecodeTpsWarmShader.value, 1).en}).`,
      'pt-br': `Leituras testadas em ambiente de VERIFICATION.md (26/11/2026, Qwen3-0.6B, contexto configurado de ${both(BROWSER_LAB.contextTokens.value, 0)['pt-br']}). Índice da rota: 1 = Chromium nuvem CPU 1 thread (média de dois turnos ${both(BROWSER_LAB.cloudCpu1ThreadDecodeTps.value, 1)['pt-br']} vs aritmética ${both(BROWSER_LAB.cloudCpu1ThreadArithTps.value, 1)['pt-br']}), 2 = Apple M5 Pro CPU ${BROWSER_LAB.maxCpuThreads.value} threads (turno 1: ${both(BROWSER_LAB.appleCpuDecodeTpsTurn1.value, 1)['pt-br']} vs turno 2: ${both(BROWSER_LAB.appleCpuDecodeTpsTurn2.value, 1)['pt-br']}), 3 = Apple M5 Pro Metal-3 WebGPU (turno 1: ${both(BROWSER_LAB.appleGpuDecodeTpsColdShader.value, 1)['pt-br']} vs turno 2: ${both(BROWSER_LAB.appleGpuDecodeTpsWarmShader.value, 1)['pt-br']}).`,
    },
    body: {
      kind: 'plot',
      xAxis: { label: { en: 'Route (1: 1-thread CPU, 2: 4-thread CPU, 3: Metal-3 GPU)', 'pt-br': 'Rota (1: CPU 1 thread, 2: CPU 4 threads, 3: GPU Metal-3)' }, scale: 'linear', min: 1, max: 3 },
      yAxis: { label: { en: 'Decode throughput', 'pt-br': 'Taxa de decode' }, scale: 'linear', min: 0, max: 140, unit: 'tok/s' },
      series: [
        {
          label: { en: 'Turn 1 (or 2-turn baseline on cloud)', 'pt-br': 'Turno 1 (ou base de 2 turnos na nuvem)' },
          pigment: 'caution',
          points: [
            [1, BROWSER_LAB.cloudCpu1ThreadDecodeTps.value],
            [2, BROWSER_LAB.appleCpuDecodeTpsTurn1.value],
            [3, BROWSER_LAB.appleGpuDecodeTpsColdShader.value],
          ],
        },
        {
          label: { en: 'Turn 2 (or arithmetic turn on cloud)', 'pt-br': 'Turno 2 (ou turno aritmético na nuvem)' },
          pigment: 'success',
          points: [
            [1, BROWSER_LAB.cloudCpu1ThreadArithTps.value],
            [2, BROWSER_LAB.appleCpuDecodeTpsTurn2.value],
            [3, BROWSER_LAB.appleGpuDecodeTpsWarmShader.value],
          ],
        },
      ],
    },
  },
} as const satisfies Record<string, Figure>
