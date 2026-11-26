/**
 * Figures for track 13 — llama.cpp in Depth.
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

/** Derived fp32 (4 bytes/value) RPC payload sizes for Qwen3.8-27B from model-facts.ts. */
const QWEN_HIDDEN_FP32_BYTES = QWEN.hiddenSize.value * 4
const QWEN_LOGITS_FP32_BYTES = QWEN.vocabSize.value * 4
const QWEN_RPC_TOTAL_BYTES = QWEN_HIDDEN_FP32_BYTES + QWEN_LOGITS_FP32_BYTES

export const TRACK_13_FIGURES = {
  /**
   * 13.1 walks through how the ggml backend scheduler cuts a graph into splits
   * with copy seams, how -ngl places the last layers on the GPU, and how
   * --n-cpu-moe adds two seams per overridden layer.
   */
  't13-graph-splits-and-placement': {
    lesson: '13.1-inside-llama-cpp-ggml-graphs-backends',
    title: {
      en: 'How weight placement cuts a ggml graph into splits',
      'pt-br': 'Como a colocação dos pesos corta um grafo ggml em splits',
    },
    caption: {
      en: 'When supported, the scheduler prefers to run each operation on the backend holding its weights (unless a backend’s offload_op policy routes it elsewhere). Every time consecutive nodes switch hardware, the scheduler inserts a seam that copies the tensor across.',
      'pt-br': 'Quando há suporte, o scheduler prefere rodar cada operação no backend onde moram seus pesos (salvo exceções da política offload_op do backend). Toda vez que nós consecutivos trocam de hardware, o scheduler insere uma costura que copia o tensor entre eles.',
    },
    steps: [
      {
        label: { en: 'Three splits, two seams', 'pt-br': 'Três splits, duas costuras' },
        caption: {
          en: 'Six illustrative nodes whose weights sit on GPU, GPU, CPU, CPU, GPU, GPU produce three consecutive runs (splits) and two tensor copies at the seams.',
          'pt-br': 'Seis nós ilustrativos com pesos em GPU, GPU, CPU, CPU, GPU, GPU geram três trechos consecutivos (splits) e duas cópias de tensor nas costuras.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Split 1: nodes 1–2', 'pt-br': 'Split 1: nós 1–2' },
              detail: { en: 'weights on GPU', 'pt-br': 'pesos na GPU' },
              pigment: 'accent',
            },
            {
              label: { en: 'Seam 1', 'pt-br': 'Costura 1' },
              detail: { en: 'copy tensor GPU → CPU', 'pt-br': 'copia tensor GPU → CPU' },
              pigment: 'caution',
            },
            {
              label: { en: 'Split 2: nodes 3–4', 'pt-br': 'Split 2: nós 3–4' },
              detail: { en: 'weights on CPU', 'pt-br': 'pesos na CPU' },
              pigment: 'muted',
            },
            {
              label: { en: 'Seam 2', 'pt-br': 'Costura 2' },
              detail: { en: 'copy tensor CPU → GPU', 'pt-br': 'copia tensor CPU → GPU' },
              pigment: 'caution',
            },
            {
              label: { en: 'Split 3: nodes 5–6', 'pt-br': 'Split 3: nós 5–6' },
              detail: { en: 'weights on GPU', 'pt-br': 'pesos na GPU' },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'Layer split (-ngl 10)', 'pt-br': 'Divisão por camadas (-ngl 10)' },
        caption: {
          en: 'On 28-layer Qwen3-1.7B Q8_0 (29 groups with the output layer), -ngl 10 puts the last layers (19 to 28) on Metal (MTL0) and leaves 0 to 18 on the CPU; the KV cache follows each layer.',
          'pt-br': 'No Qwen3-1.7B Q8_0 de 28 camadas (29 grupos com a camada de saída), -ngl 10 põe as últimas camadas (19 a 28) no Metal (MTL0) e deixa 0 a 18 na CPU; o KV cache acompanha cada camada.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Layers 0–18', 'pt-br': 'Camadas 0–18' },
              detail: { en: 'CPU · 152 MiB KV cache', 'pt-br': 'CPU · 152 MiB de KV cache' },
              pigment: 'muted',
            },
            {
              label: { en: 'One seam', 'pt-br': 'Uma costura' },
              detail: { en: 'copy hidden state CPU → MTL0', 'pt-br': 'copia estado oculto CPU → MTL0' },
              pigment: 'caution',
            },
            {
              label: { en: 'Layers 19–27 + output (28)', 'pt-br': 'Camadas 19–27 + saída (28)' },
              detail: { en: 'MTL0 GPU · 72 MiB KV cache', 'pt-br': 'GPU MTL0 · 72 MiB de KV cache' },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'MoE override (--n-cpu-moe 20)', 'pt-br': 'Sobrescrita MoE (--n-cpu-moe 20)' },
        caption: {
          en: 'On Qwen3.6-35B-A3B Q4_K_XL, moving experts of the first 20 layers to a 9,378 MiB CPU_REPACK buffer adds one seam into the CPU and one back out per layer, raising splits from 2 to 42.',
          'pt-br': 'No Qwen3.6-35B-A3B Q4_K_XL, mover os experts das primeiras 20 camadas para um buffer CPU_REPACK de 9.378 MiB acrescenta uma costura de entrada na CPU e outra de saída por camada, levando os splits de 2 para 42.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Attention block', 'pt-br': 'Bloco de attention' },
              detail: { en: 'runs on MTL0 GPU', 'pt-br': 'roda na GPU MTL0' },
              pigment: 'accent',
            },
            {
              label: { en: 'Seam into CPU', 'pt-br': 'Costura para a CPU' },
              detail: { en: '1st copy in each overridden layer', 'pt-br': '1ª cópia em cada camada sobrescrita' },
              pigment: 'caution',
            },
            {
              label: { en: 'MoE experts (layers 0–19)', 'pt-br': 'Experts MoE (camadas 0–19)' },
              detail: { en: 'CPU_REPACK · 9,378 MiB', 'pt-br': 'CPU_REPACK · 9.378 MiB' },
              pigment: 'danger',
            },
            {
              label: { en: 'Seam back to GPU', 'pt-br': 'Costura de volta à GPU' },
              detail: { en: '2nd copy in each overridden layer', 'pt-br': '2ª cópia em cada camada sobrescrita' },
              pigment: 'caution',
            },
            {
              label: { en: 'Total graph splits', 'pt-br': 'Total de splits no grafo' },
              detail: { en: '2 + 2 × 20 = 42 splits', 'pt-br': '2 + 2 × 20 = 42 splits' },
              pigment: 'muted',
            },
          ],
        },
      },
    ],
  },

  /**
   * 13.2 turns a Hugging Face checkpoint into a verified quantized GGUF in four
   * stages. Each frame highlights the active tool, the file it produces, and
   * the guard that catches errors at that stage.
   */
  't13-gguf-build-pipeline': {
    lesson: '13.2-making-your-own-gguf-convert-imatrix-quantize',
    title: {
      en: 'From Hugging Face folder to verified GGUF',
      'pt-br': 'Da pasta do Hugging Face ao GGUF verificado',
    },
    caption: {
      en: 'Every later step reads the bf16 base file rather than a previously quantized file, and held-out text stays separate from calibration text. Numbers are from the Qwen3-0.6B run at b11380.',
      'pt-br': 'Toda etapa seguinte lê o arquivo bf16 de base, nunca um arquivo já quantizado, e o texto de avaliação fica separado do texto de calibração. Os números vêm da execução com o Qwen3-0.6B no b11380.',
    },
    steps: [
      {
        label: { en: '1. Convert', 'pt-br': '1. Converter' },
        caption: {
          en: 'convert_hf_to_gguf.py packs the checkpoint folder into one bf16 GGUF (311 tensors, 1.5 GB for Qwen3-0.6B). Check --print-supported-models first; lossless only relative to a bf16 source.',
          'pt-br': 'O convert_hf_to_gguf.py empacota a pasta do checkpoint num único GGUF bf16 (311 tensores, 1,5 GB no Qwen3-0.6B). Confira --print-supported-models antes; sem perdas apenas em relação a uma origem bf16.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Convert to bf16', 'pt-br': 'Converter para bf16' },
              detail: { en: 'model-bf16.gguf (1.5 GB)', 'pt-br': 'model-bf16.gguf (1,5 GB)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Collect imatrix', 'pt-br': 'Coletar imatrix' },
              detail: { en: 'waiting for bf16 file', 'pt-br': 'aguarda o arquivo bf16' },
              pigment: 'muted',
            },
            {
              label: { en: 'Quantize', 'pt-br': 'Quantizar' },
              detail: { en: 'waiting for bf16 + imatrix', 'pt-br': 'aguarda bf16 + imatrix' },
              pigment: 'muted',
            },
            {
              label: { en: 'Measure KL', 'pt-br': 'Medir KL' },
              detail: { en: 'waiting for candidate file', 'pt-br': 'aguarda o arquivo candidato' },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: '2. Collect', 'pt-br': '2. Coletar' },
        caption: {
          en: 'llama-imatrix runs calibration text (305 chunks of 512 tokens from llama.cpp docs) through the bf16 file and stores the sum of squared activations per column in imatrix.gguf.',
          'pt-br': 'O llama-imatrix passa texto de calibração (305 chunks de 512 tokens da documentação do llama.cpp) pelo arquivo bf16 e grava a soma das ativações ao quadrado por coluna em imatrix.gguf.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Convert to bf16', 'pt-br': 'Converter para bf16' },
              detail: { en: 'model-bf16.gguf ready', 'pt-br': 'model-bf16.gguf pronto' },
              pigment: 'success',
            },
            {
              label: { en: 'Collect imatrix', 'pt-br': 'Coletar imatrix' },
              detail: { en: 'calib.txt → imatrix.gguf', 'pt-br': 'calib.txt → imatrix.gguf' },
              pigment: 'accent',
            },
            {
              label: { en: 'Quantize', 'pt-br': 'Quantizar' },
              detail: { en: 'next: steer rounding error', 'pt-br': 'próximo: orientar o erro' },
              pigment: 'muted',
            },
            {
              label: { en: 'Measure KL', 'pt-br': 'Medir KL' },
              detail: { en: 'held-out text kept apart', 'pt-br': 'texto separado para teste' },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: '3. Quantize', 'pt-br': '3. Quantizar' },
        caption: {
          en: 'llama-quantize reads model-bf16.gguf and imatrix.gguf (plus any --tensor-type overrides) to write model-Q4_K_M.gguf (456.11 MiB of quantized tensor data; 461.8 MiB GGUF file on disk with header, metadata, and alignment). It refuses to requantize an already quantized file or make IQ2_XXS without a matrix.',
          'pt-br': 'O llama-quantize lê model-bf16.gguf e imatrix.gguf (mais eventuais sobrescritas --tensor-type) para gerar model-Q4_K_M.gguf (456,11 MiB de tensores quantizados; arquivo GGUF de 461,8 MiB em disco com cabeçalho, metadados e alinhamento). Ele recusa requantizar um arquivo já quantizado ou gerar IQ2_XXS sem matriz.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Convert to bf16', 'pt-br': 'Converter para bf16' },
              detail: { en: 'always the source input', 'pt-br': 'sempre a entrada de origem' },
              pigment: 'success',
            },
            {
              label: { en: 'Collect imatrix', 'pt-br': 'Coletar imatrix' },
              detail: { en: 'imatrix.gguf attached', 'pt-br': 'imatrix.gguf anexado' },
              pigment: 'success',
            },
            {
              label: { en: 'Quantize', 'pt-br': 'Quantizar' },
              detail: { en: '456.11 MiB tensors (461.8 MiB file)', 'pt-br': '456,11 MiB tensores (461,8 MiB arquivo)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Measure KL', 'pt-br': 'Medir KL' },
              detail: { en: 'next: score against bf16', 'pt-br': 'próximo: pontuar contra bf16' },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: '4. Measure', 'pt-br': '4. Medir' },
        caption: {
          en: 'llama-perplexity records bf16 reference logits once (base.kld) on held-out Wikitext-2 test, then scores each quant by mean KL divergence: 0.1036 without imatrix fell to 0.0689 with imatrix at the same 456.11 MiB of quantized tensors (461.8 MiB file).',
          'pt-br': 'O llama-perplexity grava uma vez os logits de referência do bf16 (base.kld) no teste separado do Wikitext-2 e pontua cada quantização pela divergência KL média: de 0,1036 sem matriz para 0,0689 com imatrix nos mesmos 456,11 MiB de tensores quantizados (arquivo de 461,8 MiB).',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Convert to bf16', 'pt-br': 'Converter para bf16' },
              detail: { en: 'records base.kld reference', 'pt-br': 'grava referência base.kld' },
              pigment: 'success',
            },
            {
              label: { en: 'Collect imatrix', 'pt-br': 'Coletar imatrix' },
              detail: { en: 'disjoint from test text', 'pt-br': 'disjunto do texto de teste' },
              pigment: 'success',
            },
            {
              label: { en: 'Quantize', 'pt-br': 'Quantizar' },
              detail: { en: 'same 456.11 MiB tensors (461.8 MiB file)', 'pt-br': 'mesmos 456,11 MiB tensores (461,8 MiB)' },
              pigment: 'success',
            },
            {
              label: { en: 'Measure KL', 'pt-br': 'Medir KL' },
              detail: { en: 'KL 0.1036 → 0.0689 (top-1 85.8%)', 'pt-br': 'KL 0,1036 → 0,0689 (topo 85,8%)' },
              pigment: 'accent',
            },
          ],
        },
      },
    ],
  },

  /**
   * 13.3 contrasts unified (-c 8192) and divided (-c 8192 -np 4) KV pools in
   * llama-server at b11380. Both frames allocate the same 8,192-token pool, so
   * stack shares represent exact slices of one total budget.
   */
  't13-server-kv-pool-modes': {
    lesson: '13.3-llama-server-in-production',
    title: {
      en: 'One 8,192-token KV pool, two ways to share it across four slots',
      'pt-br': 'Um pool de KV de 8.192 tokens, duas formas de dividi-lo entre quatro slots',
    },
    caption: {
      en: 'Leaving -np at auto turns on a unified pool (kv_unified = true). Passing an explicit -np 4 turns it off and divides -c evenly across the slots (padded to multiples of 256).',
      'pt-br': 'Deixar -np em auto liga o pool unificado (kv_unified = true). Passar um -np 4 explícito desliga o pool unificado e divide -c igualmente entre os slots (arredondado para múltiplos de 256).',
    },
    steps: [
      {
        label: { en: 'Unified pool (-c 8192)', 'pt-br': 'Pool unificado (-c 8192)' },
        caption: {
          en: 'With -np unset, every slot reports n_ctx_slot = 8192, but all four share one 8,192-token pool. One 6,000-token conversation leaves 2,192 tokens shared among the other three slots.',
          'pt-br': 'Sem -np, cada slot informa n_ctx_slot = 8192, mas os quatro dividem um único pool de 8.192 tokens. Uma conversa de 6.000 tokens deixa 2.192 tokens divididos entre os outros três slots.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Slot 0 (one long conversation)', 'pt-br': 'Slot 0 (uma conversa longa)' },
              detail: { en: '6,000 tokens in use', 'pt-br': '6.000 tokens em uso' },
              pigment: 'accent',
              weight: 6000,
            },
            {
              label: { en: 'Slots 1, 2 and 3 (shared remainder)', 'pt-br': 'Slots 1, 2 e 3 (restante compartilhado)' },
              detail: { en: '2,192 tokens left across 3 slots', 'pt-br': '2.192 tokens restantes para 3 slots' },
              pigment: 'caution',
              weight: 2192,
            },
          ],
        },
      },
      {
        label: { en: 'Divided slots (-c 8192 -np 4)', 'pt-br': 'Slots divididos (-c 8192 -np 4)' },
        caption: {
          en: 'With explicit -np 4, kv_unified = false and each slot gets a hard ceiling of 2,048 tokens (8,192 ÷ 4). Unused tokens in one slot cannot be borrowed by another.',
          'pt-br': 'Com -np 4 explícito, kv_unified = false e cada slot recebe um teto rígido de 2.048 tokens (8.192 ÷ 4). Tokens ociosos num slot não podem ser emprestados a outro.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Slot 0', 'pt-br': 'Slot 0' },
              detail: { en: '2,048 tokens hard ceiling', 'pt-br': 'teto rígido de 2.048 tokens' },
              pigment: 'accent',
              weight: 2048,
            },
            {
              label: { en: 'Slot 1', 'pt-br': 'Slot 1' },
              detail: { en: '2,048 tokens hard ceiling', 'pt-br': 'teto rígido de 2.048 tokens' },
              pigment: 'accent',
              weight: 2048,
            },
            {
              label: { en: 'Slot 2', 'pt-br': 'Slot 2' },
              detail: { en: '2,048 tokens hard ceiling', 'pt-br': 'teto rígido de 2.048 tokens' },
              pigment: 'accent',
              weight: 2048,
            },
            {
              label: { en: 'Slot 3', 'pt-br': 'Slot 3' },
              detail: { en: '2,048 tokens hard ceiling', 'pt-br': 'teto rígido de 2.048 tokens' },
              pigment: 'accent',
              weight: 2048,
            },
          ],
        },
      },
    ],
  },

  /**
   * 13.4 shows why the same two machines trade first place between llama-bench's
   * pp (prefill) and tg (decode) tests on the maintainers' gpt-oss-120b MXFP4 runs.
   */
  't13-prefill-vs-decode-bench': {
    lesson: '13.4-benchmarking-with-llama-bench',
    title: {
      en: 'Why the winner flips between pp and tg',
      'pt-br': 'Por que o vencedor se inverte entre pp e tg',
    },
    caption: {
      en: 'Maintainers’ llama-bench runs on gpt-oss-120b MXFP4 (a 59.02 GiB Mixture-of-Experts checkpoint, n_ubatch 2048, flash attention on) at builds 7948 (Mac Studio M2 Ultra) and 7941 (DGX Spark). These are gpt-oss figures, not Qwen figures.',
      'pt-br': 'Execuções de llama-bench dos mantenedores no gpt-oss-120b MXFP4 (um checkpoint Mixture-of-Experts de 59,02 GiB, n_ubatch 2048, flash attention ligada) nos builds 7948 (Mac Studio M2 Ultra) e 7941 (DGX Spark). São números do gpt-oss, não do Qwen.',
    },
    steps: [
      {
        label: { en: 'Prefill (pp2048)', 'pt-br': 'Prefill (pp2048 — prompt)' },
        caption: {
          en: 'Prompt tokens enter in a 2,048-token batch, amortizing active expert and shared weight reads across many routed tokens, so raw arithmetic capacity dominates. DGX Spark leads by about 1.48×.',
          'pt-br': 'Os tokens do prompt entram num batch de 2.048 tokens, diluindo as leituras dos pesos compartilhados e dos experts ativos entre muitos tokens roteados, então a capacidade bruta de cálculo domina. O DGX Spark lidera por cerca de 1,48×.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Prompt batch', 'pt-br': 'Batch do prompt' },
              detail: { en: '2,048 tokens processed together', 'pt-br': '2.048 tokens processados juntos' },
              pigment: 'muted',
            },
            {
              label: { en: 'Amortized MoE weight reads', 'pt-br': 'Leituras diluídas no MoE' },
              detail: { en: '59.02 GiB total MoE; active experts shared across batch', 'pt-br': 'MoE de 59,02 GiB; experts ativos divididos no batch' },
              pigment: 'accent',
            },
            {
              label: { en: 'Compute-bound', 'pt-br': 'Limitado por compute' },
              detail: { en: 'arithmetic speed sets the pace', 'pt-br': 'velocidade de cálculo dita o ritmo' },
              pigment: 'caution',
            },
            {
              label: { en: 'DGX Spark leads 1.48×', 'pt-br': 'DGX Spark lidera 1,48×' },
              detail: { en: '2,443.91 vs 1,648.69 t/s', 'pt-br': '2.443,91 vs 1.648,69 t/s' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Decode (tg32)', 'pt-br': 'Decode (tg32 — geração)' },
        caption: {
          en: 'Each generated token routes only to its active experts plus shared layers (not all 59.02 GiB, since gpt-oss-120b is MoE), reading those active weights at batch 1. Memory bandwidth dominates, though the measured 1.46× gap is smaller than the 2.9× peak-bandwidth ratio (800 vs 273 GB/s).',
          'pt-br': 'Cada token gerado aciona apenas seus experts ativos e camadas compartilhadas (não todos os 59,02 GiB, pois o gpt-oss-120b é MoE), lendo esses pesos ativos em batch 1. A bandwidth de memória domina, embora a vantagem medida de 1,46× seja menor que a razão de 2,9× das bandwidths de pico (800 vs 273 GB/s).',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'One token at a time', 'pt-br': 'Um token de cada vez' },
              detail: { en: 'each step depends on the last', 'pt-br': 'cada passo depende do anterior' },
              pigment: 'muted',
            },
            {
              label: { en: 'Active-expert weight read', 'pt-br': 'Leitura dos experts ativos' },
              detail: { en: 'MoE routes each token to active experts only (not all 59.02 GiB)', 'pt-br': 'MoE roteia cada token só aos experts ativos (não os 59,02 GiB)' },
              pigment: 'accent',
            },
            {
              label: { en: 'Bandwidth-bound', 'pt-br': 'Limitado por bandwidth' },
              detail: { en: 'memory speed, plus fixed overhead', 'pt-br': 'velocidade da memória + custos fixos' },
              pigment: 'caution',
            },
            {
              label: { en: 'Mac M2 Ultra leads 1.46×', 'pt-br': 'Mac M2 Ultra lidera 1,46×' },
              detail: { en: '85.60 vs 58.72 t/s (peak ratio 2.9×)', 'pt-br': '85,60 vs 58,72 t/s (razão de pico 2,9×)' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 13.5 part 1: one speculative verification step under --spec-type draft-simple
   * with --spec-draft-n-max 3, replacing the made-up 3-proposed / 2-accepted prose
   * walkthrough.
   */
  't13-speculative-verify-step': {
    lesson: '13.5-speculative-decoding-and-rpc-in-llama-cpp',
    title: {
      en: 'One speculative verification step (--spec-draft-n-max 3)',
      'pt-br': 'Um passo de verificação especulativa (--spec-draft-n-max 3)',
    },
    caption: {
      en: 'Illustrative step where the draft proposes 3 tokens and the target accepts 2. Because the target pass also produces 1 token of its own, one target pass commits 3 tokens (ceiling: 4 when all 3 match).',
      'pt-br': 'Passo ilustrativo em que o rascunho propõe 3 tokens e o alvo aceita 2. Como a passada do alvo também gera 1 token próprio, uma passada do alvo confirma 3 tokens (teto: 4 quando os 3 coincidem).',
    },
    steps: [
      {
        label: { en: '1. Draft guesses 3', 'pt-br': '1. Rascunho sugere 3' },
        caption: {
          en: 'The small draft model runs three quick forward passes and proposes three candidate tokens ahead of the current context.',
          'pt-br': 'O modelo pequeno de rascunho roda três passadas rápidas e propõe três tokens candidatos à frente do contexto atual.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Current context', 'pt-br': 'Contexto atual' },
              detail: { en: 'tokens already committed', 'pt-br': 'tokens já confirmados' },
              pigment: 'muted',
            },
            {
              label: { en: 'Draft 1', 'pt-br': 'Rascunho 1' },
              detail: { en: 'proposed by small model', 'pt-br': 'proposto pelo modelo pequeno' },
              pigment: 'accent',
            },
            {
              label: { en: 'Draft 2', 'pt-br': 'Rascunho 2' },
              detail: { en: 'proposed by small model', 'pt-br': 'proposto pelo modelo pequeno' },
              pigment: 'accent',
            },
            {
              label: { en: 'Draft 3', 'pt-br': 'Rascunho 3' },
              detail: { en: 'proposed by small model', 'pt-br': 'proposto pelo modelo pequeno' },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: '2. Target checks all 3', 'pt-br': '2. Alvo confere os 3' },
        caption: {
          en: 'One forward pass of the target scores all three positions at once. In the default path, each draft is accepted only when it equals the target’s own sample; here drafts 1 and 2 match and draft 3 misses.',
          'pt-br': 'Uma única passada do alvo pontua as três posições de uma vez. No caminho padrão, cada rascunho só é aceito quando coincide com a amostra do próprio alvo; aqui os rascunhos 1 e 2 batem e o 3 falha.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Current context', 'pt-br': 'Contexto atual' },
              detail: { en: 'one target weight read', 'pt-br': 'uma leitura dos pesos do alvo' },
              pigment: 'muted',
            },
            {
              label: { en: 'Draft 1', 'pt-br': 'Rascunho 1' },
              detail: { en: 'matches target sample', 'pt-br': 'bate com a amostra do alvo' },
              pigment: 'success',
            },
            {
              label: { en: 'Draft 2', 'pt-br': 'Rascunho 2' },
              detail: { en: 'matches target sample', 'pt-br': 'bate com a amostra do alvo' },
              pigment: 'success',
            },
            {
              label: { en: 'Draft 3', 'pt-br': 'Rascunho 3' },
              detail: { en: 'rejected by target', 'pt-br': 'rejeitado pelo alvo' },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: '3. Commit 3 tokens', 'pt-br': '3. Confirma 3 tokens' },
        caption: {
          en: 'The two matching drafts stay and the target’s own sample replaces Draft 3, so this verification step commits 3 tokens (1 + 2 accepted). Mean len averages that count across steps.',
          'pt-br': 'Os dois rascunhos que bateram ficam e a amostra do próprio alvo substitui o Rascunho 3, então este passo confirma 3 tokens (1 + 2 aceitos). O mean len tira a média dessa contagem entre passos.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Accepted 1', 'pt-br': 'Aceito 1' },
              detail: { en: 'committed', 'pt-br': 'confirmado' },
              pigment: 'success',
            },
            {
              label: { en: 'Accepted 2', 'pt-br': 'Aceito 2' },
              detail: { en: 'committed', 'pt-br': 'confirmado' },
              pigment: 'success',
            },
            {
              label: { en: 'Target token', 'pt-br': 'Token do alvo' },
              detail: { en: 'replaces Draft 3', 'pt-br': 'substitui o Rascunho 3' },
              pigment: 'caution',
            },
            {
              label: { en: 'Step total: 3', 'pt-br': 'Total do passo: 3' },
              detail: { en: 'ceiling is 4 with 3 drafts', 'pt-br': 'teto é 4 com 3 rascunhos' },
              pigment: 'muted',
            },
          ],
        },
      },
    ],
  },

  /**
   * 13.5 part 2: what crosses the RPC link at model load (bandwidth-bound) vs
   * on every decoded token (latency/round-trip-bound). Qwen3.8-27B derived byte
   * counts come from model-facts.ts.
   */
  't13-rpc-load-vs-decode': {
    lesson: '13.5-speculative-decoding-and-rpc-in-llama-cpp',
    title: {
      en: 'What crosses the RPC link: load vs decode',
      'pt-br': 'O que cruza o enlace RPC: carregamento vs decode',
    },
    caption: {
      en: 'Measured on loopback with Qwen3-1.7B Q8_0 (layer split, output layer remote) and derived for Qwen3.8-27B in fp32 from model-facts.ts. Weights move once at load; decode moves ~1 MB or less per token, so network round trips dominate.',
      'pt-br': 'Medido em loopback com o Qwen3-1.7B Q8_0 (layer split, camada de saída remota) e derivado para o Qwen3.8-27B em fp32 a partir de model-facts.ts. Os pesos cruzam uma vez no carregamento; o decode move cerca de 1 MB ou menos por token, então as idas e vindas da rede dominam.',
    },
    steps: [
      {
        label: { en: 'At load (bandwidth)', 'pt-br': 'No carregamento (bandwidth)' },
        caption: {
          en: 'Remote weights cross once via set_tensor (largest single write: 330,612,736 B on Qwen3-1.7B). Tensors over 10 MiB are offered by hash so a server started with -c skips repeat transfers.',
          'pt-br': 'Os pesos remotos cruzam uma vez via set_tensor (maior escrita isolada: 330.612.736 B no Qwen3-1.7B). Tensores acima de 10 MiB são oferecidos por hash para que um servidor iniciado com -c pule transferências repetidas.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Offer by hash (>10 MiB)', 'pt-br': 'Oferta por hash (>10 MiB)' },
              detail: { en: 'ggml-rpc-server -c skips cached weights', 'pt-br': 'ggml-rpc-server -c pula pesos em cache' },
              pigment: 'success',
            },
            {
              label: { en: 'Send remote weights', 'pt-br': 'Enviar pesos remotos' },
              detail: { en: 'set_tensor · up to 330 MB each on 1.7B', 'pt-br': 'set_tensor · até 330 MB cada no 1.7B' },
              pigment: 'accent',
            },
            {
              label: { en: 'Link bandwidth ceiling', 'pt-br': 'Teto de bandwidth do enlace' },
              detail: { en: '17.1 GB upper bound: 13.7 s on 10 GbE, ~1.7 s at 10 GB/s', 'pt-br': 'teto de 17,1 GB: 13,7 s em 10 GbE, ~1,7 s a 10 GB/s' },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'Per token (round trips)', 'pt-br': 'Por token (idas e vindas)' },
        caption: {
          en: `Under layer split with the output layer remote, each decoded token sends a tiny hidden-state vector, a graph_recompute trigger (a few bytes once reused), and reads logits back: 615,936 B on Qwen3-1.7B, or ${both(QWEN_RPC_TOTAL_BYTES).en} B (~1.01 MB) derived for Qwen3.8-27B.`,
          'pt-br': `No layer split com a camada de saída remota, cada token decodificado envia um pequeno vetor de estado oculto, um disparo graph_recompute (alguns bytes quando reaproveitado) e lê os logits de volta: 615.936 B no Qwen3-1.7B, ou ${both(QWEN_RPC_TOTAL_BYTES)['pt-br']} B (~1,01 MB) derivados para o Qwen3.8-27B.`,
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Hidden state out', 'pt-br': 'Estado oculto enviado' },
              detail: {
                en: `8,192 B (1.7B) · ${both(QWEN_HIDDEN_FP32_BYTES).en} B (27B)`,
                'pt-br': `8.192 B (1.7B) · ${both(QWEN_HIDDEN_FP32_BYTES)['pt-br']} B (27B)`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Graph trigger', 'pt-br': 'Disparo do grafo' },
              detail: { en: 'graph_recompute: a few bytes when reused', 'pt-br': 'graph_recompute: alguns bytes quando reaproveitado' },
              pigment: 'muted',
            },
            {
              label: { en: 'Logits read back', 'pt-br': 'Logits lidos de volta' },
              detail: {
                en: `607,744 B (1.7B) · ${both(QWEN_LOGITS_FP32_BYTES).en} B (27B)`,
                'pt-br': `607.744 B (1.7B) · ${both(QWEN_LOGITS_FP32_BYTES)['pt-br']} B (27B)`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Round-trip latency', 'pt-br': 'Latência de ida e volta' },
              detail: { en: '~1 MB/token vs 17.1 GB weights; hops dominate', 'pt-br': '~1 MB/token vs 17,1 GB de pesos; saltos dominam' },
              pigment: 'danger',
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
