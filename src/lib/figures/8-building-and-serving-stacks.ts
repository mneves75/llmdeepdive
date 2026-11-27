/**
 * Figures for track 8 — Building & Serving Stacks.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import { formatNumber } from '~/lib/i18n'
import { QWEN } from '~/lib/model-facts'
import type { Figure, Localised } from './types'

/** Format a number for both locales' prose (248,320 / 248.320). */
const both = (value: number): Localised => ({
  en: formatNumber('en', value),
  'pt-br': formatNumber('pt-br', value),
})

const VOCAB = both(QWEN.vocabSize.value)
const HIDDEN = both(QWEN.hiddenSize.value)
const FFN = both(QWEN.ffnIntermediate.value)
const LAYERS = both(QWEN.layers.value)
const ATTN_LAYERS = both(QWEN.attentionLayers.value)
const DELTANET_LAYERS = both(QWEN.deltaNetLayers.value)
const Q_HEADS = both(QWEN.queryHeads.value)
const KV_HEADS = both(QWEN.kvHeads.value)
const HEAD_DIM = both(QWEN.headDim.value)
const Q_OUT = both(QWEN.qProjectionOut.value)
const Q_STATE = both(QWEN.queryStateWidth.value)
const KV_OUT = both(QWEN.kvProjectionOut.value)
const KV_KIB = both(QWEN.kvKibPerToken.value)
const KV_FULL_GIB = both(QWEN.kvGibFullContext.value)
const CONTEXT_NATIVE = both(QWEN.contextNative.value)
const DELTANET_MIB = both(QWEN.deltaNetStateMib.value)
const WEIGHTS_GB = both(QWEN.weightsGbBf16.value)

export const TRACK_8_FIGURES = {
  /**
   * 8.1 walked Qwen3.8-27B's module tree in a bullet list and then unpacked
   * the non-square attention projections in prose. Frame 1 shows the full
   * bottom-up tree; Frame 2 opens one 4-layer repeat and the q/k/v/o shapes.
   */
  't8-qwen-module-tree': {
    lesson: '8.1-pytorch-the-reference-runtime',
    title: {
      en: 'Qwen3.8-27B’s executable module tree',
      'pt-br': 'A árvore de módulos executável do Qwen3.8-27B',
    },
    caption: {
      en: 'Walking the PyTorch module tree verifies the 48/16 hybrid split behind lesson 7.2’s 64 KiB/token cache count and shows why q_proj is 12,288 wide instead of 5,120.',
      'pt-br': 'Percorrer a árvore de módulos no PyTorch comprova a divisão híbrida 48/16 por trás dos 64 KiB/token da aula 7.2 e mostra por que q_proj tem largura 12.288 em vez de 5.120.',
    },
    steps: [
      {
        label: { en: 'Full module tree', 'pt-br': 'Árvore completa' },
        caption: {
          en: 'From bottom to top: embedding lookup, 64 decoder layers (joined by a parallel 27-layer vision tower for images and video), then a final RMSNorm and an untied lm_head.',
          'pt-br': 'De baixo para cima: consulta de embedding, 64 camadas de decoder (com uma vision tower paralela de 27 camadas para imagem e vídeo), depois RMSNorm final e lm_head não amarrada.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            {
              label: { en: 'Embedding table', 'pt-br': 'Tabela de embedding' },
              detail: {
                en: `${VOCAB.en} × ${HIDDEN.en} lookup (~1.271B parameters)`,
                'pt-br': `consulta ${VOCAB['pt-br']} × ${HIDDEN['pt-br']} (~1,271 bilhão de parâmetros)`,
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Vision tower (parallel input)', 'pt-br': 'Vision tower (entrada paralela)' },
              detail: {
                en: `27 layers, hidden 1,152, patch 16 → projected to ${HIDDEN.en}`,
                'pt-br': `27 camadas, hidden 1.152, patch 16 → projetada para ${HIDDEN['pt-br']}`,
              },
              pigment: 'caution',
            },
            {
              label: { en: `${LAYERS.en} decoder layers`, 'pt-br': `${LAYERS['pt-br']} camadas de decoder` },
              detail: {
                en: `16 repeats of [3 Gated DeltaNet + 1 gated attention] = ${DELTANET_LAYERS.en} + ${ATTN_LAYERS.en}`,
                'pt-br': `16 ciclos de [3 Gated DeltaNet + 1 gated attention] = ${DELTANET_LAYERS['pt-br']} + ${ATTN_LAYERS['pt-br']}`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Final RMSNorm + untied lm_head', 'pt-br': 'RMSNorm final + lm_head separada' },
              detail: {
                en: `${HIDDEN.en} → ${VOCAB.en} logits (~1.271B own parameters)`,
                'pt-br': `${HIDDEN['pt-br']} → ${VOCAB['pt-br']} logits (~1,271 bilhão de parâmetros próprios)`,
              },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Inside one 4-layer repeat', 'pt-br': 'Dentro de um ciclo de 4 camadas' },
        caption: {
          en: 'All 64 layers share two pre-norm RMSNorms (eps 1e-6) and a gated FFN (5,120 → 17,408 → 5,120). Only the mixer slot alternates, and gated attention widens q_proj to 12,288.',
          'pt-br': 'Todas as 64 camadas compartilham dois RMSNorms pre-norm (eps 1e-6) e uma FFN com gating (5.120 → 17.408 → 5.120). Só o slot do mixer alterna, e a gated attention alarga q_proj para 12.288.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Layers 1–3: Gated DeltaNet', 'pt-br': 'Camadas 1–3: Gated DeltaNet' },
              detail: {
                en: `${DELTANET_LAYERS.en} layers total; fixed recurrent state; shared RMSNorm + ${HIDDEN.en}→${FFN.en}→${HIDDEN.en} FFN`,
                'pt-br': `${DELTANET_LAYERS['pt-br']} camadas no total; estado recorrente fixo; RMSNorm + FFN ${HIDDEN['pt-br']}→${FFN['pt-br']}→${HIDDEN['pt-br']}`,
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Layer 4: Gated attention', 'pt-br': 'Camada 4: Gated attention' },
              detail: {
                en: `${ATTN_LAYERS.en} layers total; ${Q_HEADS.en} query heads, ${KV_HEADS.en} KV heads, dim ${HEAD_DIM.en}`,
                'pt-br': `${ATTN_LAYERS['pt-br']} camadas no total; ${Q_HEADS['pt-br']} query heads, ${KV_HEADS['pt-br']} KV heads, dim ${HEAD_DIM['pt-br']}`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'q_proj (non-square)', 'pt-br': 'q_proj (não quadrada)' },
              detail: {
                en: `${HIDDEN.en} → ${Q_OUT.en}: split per head into ${Q_STATE.en} queries + ${Q_STATE.en} gate`,
                'pt-br': `${HIDDEN['pt-br']} → ${Q_OUT['pt-br']}: dividida por head em ${Q_STATE['pt-br']} queries + ${Q_STATE['pt-br']} porta`,
              },
              pigment: 'caution',
            },
            {
              label: { en: 'k_proj, v_proj & o_proj', 'pt-br': 'k_proj, v_proj e o_proj' },
              detail: {
                en: `k/v: ${HIDDEN.en} → ${KV_OUT.en} each; o_proj: ${Q_STATE.en} → ${HIDDEN.en}`,
                'pt-br': `k/v: ${HIDDEN['pt-br']} → ${KV_OUT['pt-br']} cada; o_proj: ${Q_STATE['pt-br']} → ${HIDDEN['pt-br']}`,
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.2 separates the four moving parts around the weights and shows why tool
   * calling and enable_thinking live in the template and harness, not in the
   * forward pass.
   */
  't8-transformers-plumbing': {
    lesson: '8.2-huggingface-transformers-ecosystem',
    title: {
      en: 'Four layers of plumbing around the weights',
      'pt-br': 'Quatro camadas de encanamento em torno dos pesos',
    },
    caption: {
      en: 'Only the loaded weights run the forward pass. Revision drift, enable_thinking failures, and broken tool calls almost always live in the surrounding plumbing.',
      'pt-br': 'Só os pesos carregados executam o forward pass. Deriva de revisão, falhas de enable_thinking e erros de tool calling quase sempre moram no encanamento em volta.',
    },
    steps: [
      {
        label: { en: 'Chat request path', 'pt-br': 'Caminho do chat' },
        caption: {
          en: 'enable_thinking is consumed by the Jinja template inside apply_chat_template — never by generate() or the model weights.',
          'pt-br': 'enable_thinking é consumido pelo template Jinja dentro de apply_chat_template — nunca por generate() nem pelos pesos do modelo.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Pinned revision', 'pt-br': 'Revisão fixada' },
              detail: {
                en: 'exact Hub commit hash; prevents silent drift across downloads',
                'pt-br': 'hash exato de commit no Hub; impede deriva silenciosa entre downloads',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'safetensors shards', 'pt-br': 'Shards em safetensors' },
              detail: {
                en: `JSON header + memory-mapped ${WEIGHTS_GB.en} GB bf16 bytes; no code runs`,
                'pt-br': `header JSON + ${WEIGHTS_GB['pt-br']} GB em bf16 mapeados em memória; nenhum código roda`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'apply_chat_template', 'pt-br': 'apply_chat_template (template)' },
              detail: {
                en: 'Jinja file renders roles & enable_thinking into token ids + mask',
                'pt-br': 'arquivo Jinja converte papéis e enable_thinking em ids de token + máscara',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'generate()', 'pt-br': 'Loop generate()' },
              detail: {
                en: 'runs forward loop with do_sample=True and preset knobs until stop',
                'pt-br': 'roda o forward em loop com do_sample=True e o preset até a parada',
              },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Tool-calling text loop', 'pt-br': 'Ciclo em texto do tool calling' },
        caption: {
          en: 'The forward pass never knows a tool exists. Tools enter as rendered text, return as emitted tokens, and are validated and executed by your harness.',
          'pt-br': 'O forward pass nunca sabe que existe uma ferramenta. Ferramentas entram como texto renderizado, voltam como tokens emitidos e são validadas e executadas pelo seu harness.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Messages + tool specs', 'pt-br': 'Mensagens + specs de tools' },
              detail: {
                en: 'passed together into apply_chat_template',
                'pt-br': 'enviadas juntas para apply_chat_template',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Trained token layout', 'pt-br': 'Layout treinado de tokens' },
              detail: {
                en: 'template writes exact special tokens the model expects',
                'pt-br': 'template escreve os special tokens exatos que o modelo espera',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Structured call tokens', 'pt-br': 'Tokens de chamada estruturada' },
              detail: {
                en: 'model emits ordinary tokens naming a function and arguments',
                'pt-br': 'modelo emite tokens comuns nomeando uma função e argumentos',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Harness parse & run', 'pt-br': 'Parsing e execução no harness' },
              detail: {
                en: 'validates meaning & permissions, runs tool, appends result message',
                'pt-br': 'valida significado e permissões, executa a ferramenta e anexa o resultado',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.3 shows why batch-1 decode leaves the GPU mostly idle under eager mode,
   * what torch.compile removes, and what CUDA graph capture removes next.
   */
  't8-launch-overhead-remedies': {
    lesson: '8.3-torch-compile-and-cuda-graphs',
    title: {
      en: 'Closing the idle gaps in single-token decode',
      'pt-br': 'Fechando os buracos ociosos no decode de um token',
    },
    caption: {
      en: 'Neither remedy speeds up a matrix multiply. Compilation shrinks how many kernels must be told to the GPU; CUDA graphs shrink how often the CPU has to tell it.',
      'pt-br': 'Nenhum dos dois remédios acelera uma multiplicação de matrizes. A compilação reduz quantos kernels precisam ser ditos à GPU; os CUDA graphs reduzem com que frequência a CPU precisa dizer.',
    },
    steps: [
      {
        label: { en: 'Eager decode', 'pt-br': 'Decode eager' },
        caption: {
          en: 'An illustrative ~30 kernels per layer across 64 layers means roughly 2,000 CPU launches per token — milliseconds of host overhead that cap speed even on an infinitely fast GPU.',
          'pt-br': 'Numa média ilustrativa de ~30 kernels por camada ao longo de 64 camadas, são cerca de 2.000 lançamentos de CPU por token — milissegundos de overhead no host que travam a velocidade mesmo numa GPU infinitamente rápida.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Python frame', 'pt-br': 'Frame Python' },
              detail: {
                en: 'interpreter overhead paid on every single operation',
                'pt-br': 'custo do interpretador pago em cada operação isolada',
              },
              pigment: 'danger',
            },
            {
              label: { en: 'Dispatch & check', 'pt-br': 'Dispatch e checagem' },
              detail: {
                en: 'operator lookup and argument validation on the CPU',
                'pt-br': 'busca no registro de operadores e checagem de argumentos na CPU',
              },
              pigment: 'danger',
            },
            {
              label: { en: '~2,000 launches / token', 'pt-br': '~2.000 lançamentos / token' },
              detail: {
                en: `illustrative ~30 ops × ${LAYERS.en} layers handed to the driver one by one`,
                'pt-br': `ilustrativo: ~30 ops × ${LAYERS['pt-br']} camadas entregues ao driver uma a uma`,
              },
              pigment: 'danger',
            },
            {
              label: { en: 'GPU bursts + gaps', 'pt-br': 'Rajadas + buracos na GPU' },
              detail: {
                en: 'GPU finishes tiny work and waits on the host; binds once 4-bit lifts bandwidth',
                'pt-br': 'GPU termina trabalho curto e espera o host; vira o gargalo quando 4 bits eleva a banda',
              },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'With torch.compile', 'pt-br': 'Com torch.compile' },
        caption: {
          en: 'Tracing merges chains of small elementwise operations into fused kernels and bypasses per-op Python, provided dynamic sequence lengths do not trip guards and force recompiles.',
          'pt-br': 'O tracing funde cadeias de operações elementwise pequenas em kernels fundidos e evita Python por operação, desde que comprimentos dinâmicos não quebrem guards nem forcem recompilações.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Trace + guards', 'pt-br': 'Tracing + guards' },
              detail: {
                en: 'records forward graph; checks dtype, shape and device before reuse',
                'pt-br': 'grava o grafo do forward; confere dtype, shape e device antes de reusar',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Fused kernels', 'pt-br': 'Kernels fundidos' },
              detail: {
                en: 'norms, SiLU gate and residual adds run in fewer memory round trips',
                'pt-br': 'normas, gate SiLU e somas residuais rodam com menos idas à memória',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Fewer launches', 'pt-br': 'Menos lançamentos' },
              detail: {
                en: 'compiled code replaces per-operation Python dispatch',
                'pt-br': 'código compilado substitui o dispatch Python por operação',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Remaining host gap', 'pt-br': 'Folga restante no host' },
              detail: {
                en: 'still submits a sequence of launches on every decode step',
                'pt-br': 'ainda submete uma sequência de lançamentos a cada passo de decode',
              },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'With CUDA graphs', 'pt-br': 'Com CUDA graphs' },
        caption: {
          en: 'Capturing the steady decode step replays all launches as one submission against fixed buffer addresses — the exact reason paged KV block tables are updated in place.',
          'pt-br': 'Capturar o passo fixo de decode reproduz todos os lançamentos como uma única submissão em endereços fixos — o motivo exato pelo qual tabelas de blocos do KV paginado são atualizadas no lugar.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'One-time capture', 'pt-br': 'Captura única' },
              detail: {
                en: 'records static shapes, bucketed batch sizes and fixed memory pointers',
                'pt-br': 'grava shapes estáticos, buckets de batch size e ponteiros fixos de memória',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'In-place buffer update', 'pt-br': 'Atualização no lugar' },
              detail: {
                en: 'new token id and paged KV block table written to the same addresses',
                'pt-br': 'novo id de token e tabela de blocos do KV gravados nos mesmos endereços',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Single submission', 'pt-br': 'Submissão única' },
              detail: {
                en: 'host issues one replay command instead of hundreds of launches',
                'pt-br': 'host envia um único comando de replay em vez de centenas de lançamentos',
              },
              pigment: 'success',
            },
            {
              label: { en: 'Back-to-back GPU work', 'pt-br': 'GPU sem pausas' },
              detail: {
                en: 'idle host gaps vanish; check graph breaks and DeltaNet capture per version',
                'pt-br': 'buracos do host somem; confira graph breaks e captura do DeltaNet por versão',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.4 separates the configured utilization ceiling from the realized KV pool
   * and shows the startup measurement loop. No invented GB shares: lesson 9.3
   * owns the exact memory budget.
   */
  't8-vllm-memory-sizing': {
    lesson: '8.4-vllm',
    title: {
      en: 'From utilization ceiling to realized KV pool',
      'pt-br': 'Do teto de utilização ao pool de KV realizado',
    },
    caption: {
      en: 'vLLM sizes the KV pool by subtraction inside --gpu-memory-utilization. Exact byte budgets belong to lessons 7.2 and 9.3; here the source of truth is your startup log.',
      'pt-br': 'O vLLM dimensiona o pool de KV por subtração dentro de --gpu-memory-utilization. O orçamento exato em bytes pertence às aulas 7.2 e 9.3; aqui a fonte de verdade é o log de startup.',
    },
    steps: [
      {
        label: { en: 'Inside the GPU ceiling', 'pt-br': 'Dentro do teto da GPU' },
        caption: {
          en: 'Under fixed KV pre-allocation, everything inside the utilization fraction competes for the same card: pushing the flag toward 0.98 deletes the headroom that absorbs prefill spikes and causes out-of-memory crashes (newer extensible KV sizing can default to 1.0 on supported CUDA/ROCm setups).',
          'pt-br': 'Na pré-alocação fixa de KV, tudo dentro da fração de utilização disputa a mesma placa: empurrar a flag rumo a 0,98 elimina a folga que absorve picos de prefill e provoca quedas por falta de memória (o dimensionamento extensível mais recente de KV pode usar 1,0 por padrão em setups CUDA/ROCm suportados).',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            {
              label: { en: 'Resident model weights', 'pt-br': 'Pesos residentes do modelo' },
              detail: {
                en: `${WEIGHTS_GB.en} GB in bf16; fixed floor before any cache exists`,
                'pt-br': `${WEIGHTS_GB['pt-br']} GB em bf16; piso fixo antes de existir qualquer cache`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Activations, CUDA graphs & fragmentation', 'pt-br': 'Ativações, CUDA graphs e fragmentação' },
              detail: {
                en: 'prefill peak tensors, captured graph pools, and allocator gaps',
                'pt-br': 'tensors de pico do prefill, pools de graphs capturados e lacunas do alocador',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Hybrid recurrent state', 'pt-br': 'Estado recorrente híbrido' },
              detail: {
                en: `${DELTANET_LAYERS.en} DeltaNet layers (~${DELTANET_MIB.en} MiB/seq in fp32 reference; runtime dtype varies)`,
                'pt-br': `${DELTANET_LAYERS['pt-br']} camadas DeltaNet (~${DELTANET_MIB['pt-br']} MiB/seq na referência fp32; dtype varia por runtime)`,
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Realized KV block pool', 'pt-br': 'Pool de blocos de KV realizado' },
              detail: {
                en: `what remains; ${KV_KIB.en} KiB/token across the ${ATTN_LAYERS.en} full-attention layers (lesson 7.2)`,
                'pt-br': `o que sobra; ${KV_KIB['pt-br']} KiB/token nas ${ATTN_LAYERS['pt-br']} camadas de full attention (aula 7.2)`,
              },
              pigment: 'success',
            },
            {
              label: { en: 'Headroom outside the ceiling', 'pt-br': 'Folga fora do teto' },
              detail: {
                en: 'reserved for ECC, OS overhead and bursts under fixed pre-allocation (avoid 0.98)',
                'pt-br': 'reservada para ECC, overhead do sistema e rajadas na pré-alocação fixa (evite 0,98)',
              },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: 'Startup sizing loop', 'pt-br': 'Ciclo de dimensionamento' },
        caption: {
          en: 'Measure before serving: pin versions, read the realized KV pool from startup logs, bound --max-model-len to fit inside it, and verify output against eager PyTorch.',
          'pt-br': 'Meça antes de servir: fixe versões, leia o pool de KV realizado nos logs de startup, limite --max-model-len para caber nele e verifique a saída contra o PyTorch eager.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Pin & leave headroom', 'pt-br': 'Fixe e deixe folga' },
              detail: {
                en: 'pin checkpoint + vLLM version; start with deliberate slack (e.g. 0.90)',
                'pt-br': 'fixe checkpoint + versão do vLLM; comece com folga deliberada (ex.: 0,90)',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Read startup log', 'pt-br': 'Leia o log de startup' },
              detail: {
                en: 'check realized KV pool and implied max concurrency; reconcile gaps',
                'pt-br': 'confira o pool de KV realizado e a concorrência máxima implícita; concilie diferenças',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Bound --max-model-len', 'pt-br': 'Limite --max-model-len' },
              detail: {
                en: 'must fit at least one full sequence inside the realized pool',
                'pt-br': 'precisa acomodar ao menos uma sequência inteira dentro do pool realizado',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Run canary & admit', 'pt-br': 'Rode o canário e admita' },
              detail: {
                en: 'check DeltaNet output vs lesson 8.1; paging lets shorter chats share the pool',
                'pt-br': 'valide saída DeltaNet contra aula 8.1; paginação faz chats curtos dividirem o pool',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.5 contrasts RadixAttention prefix sharing on 40 agent calls with a
   * position-1 volatile token that destroys it, then traces constrained
   * decoding at the sampler.
   */
  't8-sglang-radix-and-grammar': {
    lesson: '8.5-sglang',
    title: {
      en: 'RadixAttention prefix reuse and grammar masking',
      'pt-br': 'Reuso de prefixo no RadixAttention e máscara de gramática',
    },
    caption: {
      en: 'Prefix sharing depends on exact token-id matches from position 1 — and in hybrid models is conditional on saving and matching the recurrent DeltaNet state checkpoint at that boundary; constrained decoding enforces shape at the sampler, not truth.',
      'pt-br': 'O compartilhamento de prefixo exige casamento exato de ids de token desde a posição 1 — e em modelos híbridos depende de salvar e casar o checkpoint do estado recorrente DeltaNet nessa fronteira; o decoding restrito impõe formato no sampler, não verdade.',
    },
    steps: [
      {
        label: { en: 'Stable prefix (40 calls)', 'pt-br': 'Prefixo estável (40 chamadas)' },
        caption: {
          en: 'All 40 calls begin with the same 3,000-token preamble (187.5 MiB KV at 64 KiB/token; ~7.32 GiB across 40). Keeping 1 shared copy frees 39 duplicate copies (7.14 GiB KV) and 39/40 preamble prefills — conditional on matching DeltaNet state in hybrid models.',
          'pt-br': 'Todas as 40 chamadas começam com o mesmo preâmbulo de 3.000 tokens (187,5 MiB de KV a 64 KiB/token; ~7,32 GiB nas 40). Manter 1 cópia compartilhada libera 39 cópias duplicadas (7,14 GiB de KV) e 39/40 dos prefills — condicionado ao casamento do estado DeltaNet em modelos híbridos.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: '3,000-token preamble', 'pt-br': 'Preâmbulo de 3.000 tokens' },
              detail: {
                en: `stored once: 187.5 MiB KV (${ATTN_LAYERS.en} layers) + DeltaNet state checkpoint (~${DELTANET_MIB.en} MiB ref)`,
                'pt-br': `guardado uma vez: 187,5 MiB de KV (${ATTN_LAYERS['pt-br']} camadas) + checkpoint DeltaNet (~${DELTANET_MIB['pt-br']} MiB ref)`,
              },
              pigment: 'success',
            },
            {
              label: { en: 'Radix tree match', 'pt-br': 'Casamento na radix tree' },
              detail: {
                en: 'all 40 calls reuse root KV (when hybrid DeltaNet state matches); 1 prefill instead of 40',
                'pt-br': 'as 40 chamadas reusando o KV da raiz (quando o estado DeltaNet híbrido casa); 1 prefill em vez de 40',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Divergent suffixes', 'pt-br': 'Sufixos divergentes' },
              detail: {
                en: 'new blocks allocated only for each call’s own final paragraph',
                'pt-br': 'blocos novos alocados só para o parágrafo final próprio de cada chamada',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'LRU eviction', 'pt-br': 'Despejo por LRU' },
              detail: {
                en: 'hot shared prefixes stay resident; one-off branches age out first',
                'pt-br': 'prefixos quentes ficam residentes; ramos avulsos saem primeiro',
              },
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: 'Volatile token first', 'pt-br': 'Token volátil no topo' },
        caption: {
          en: 'Putting a timestamp, request id, or shuffled tool list at token 1 breaks exact prefix matching immediately: sharing collapses to zero and all 40 calls pay full price.',
          'pt-br': 'Colocar timestamp, id de requisição ou lista de tools embaralhada no token 1 quebra o casamento exato na hora: o compartilhamento cai a zero e todas as 40 chamadas pagam preço cheio.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Volatile line at token 1', 'pt-br': 'Linha volátil no token 1' },
              detail: {
                en: 'timestamp, trace id, or unstable ordering differs on every call',
                'pt-br': 'timestamp, id de trace ou ordem instável muda em cada chamada',
              },
              pigment: 'danger',
            },
            {
              label: { en: 'Root match = 0', 'pt-br': 'Casamento na raiz = 0' },
              detail: {
                en: 'radix tree is anchored at position 1, so nothing after it matches',
                'pt-br': 'radix tree ancora na posição 1, então nada depois dela casa',
              },
              pigment: 'danger',
            },
            {
              label: { en: '40 full prefills', 'pt-br': '40 prefills inteiros' },
              detail: {
                en: '120,000 preamble tokens recomputed across the 40 calls',
                'pt-br': '120.000 tokens de preâmbulo recomputados nas 40 chamadas',
              },
              pigment: 'danger',
            },
            {
              label: { en: '~7.3 GiB duplicate KV', 'pt-br': '~7,3 GiB de KV duplicado' },
              detail: {
                en: '40 separate copies occupy the pool; zero reuse achieved',
                'pt-br': '40 cópias separadas ocupam o pool; nenhum reuso alcançado',
              },
              pigment: 'danger',
            },
          ],
        },
      },
      {
        label: { en: 'Constrained decoding', 'pt-br': 'Decoding restrito' },
        caption: {
          en: 'Masking illegal logits forces valid syntax on emitted tokens, but never guarantees truthful content or that generation finished before a length cap or timeout.',
          'pt-br': 'Mascarar logits ilegais impõe sintaxe válida aos tokens emitidos, mas nunca garante conteúdo verdadeiro nem que a geração terminou antes de um limite de tamanho ou timeout.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Compile & cache grammar', 'pt-br': 'Compilar e cachear gramática' },
              detail: {
                en: 'JSON schema compiles into a reusable state machine',
                'pt-br': 'schema JSON vira uma máquina de estados reaproveitável',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Mask illegal logits', 'pt-br': 'Mascarar logits ilegais' },
              detail: {
                en: 'every token that cannot legally follow gets zero probability',
                'pt-br': 'todo token que não pode seguir legalmente recebe probabilidade zero',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Sample remaining tokens', 'pt-br': 'Amostrar tokens restantes' },
              detail: {
                en: 'guarantees schema shape only for emitted, supported features',
                'pt-br': 'garante formato do schema apenas para tokens emitidos e recursos suportados',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Downstream checks', 'pt-br': 'Checagens a jusante' },
              detail: {
                en: 'verify normal stop, re-validate schema, check meaning & permissions',
                'pt-br': 'confira parada normal, revalide o schema, cheque significado e permissões',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.6 contrasts TensorRT-LLM's removed AOT serialized-engine path (1.2) with
   * the current PyTorch-only direct serving path (1.3 from v1.3.0rc21, July 2026).
   */
  't8-tensorrt-llm-backends': {
    lesson: '8.6-tensorrt-llm',
    title: {
      en: 'TensorRT-LLM: legacy engine build vs PyTorch-only serving',
      'pt-br': 'TensorRT-LLM: build legado contra serving só em PyTorch',
    },
    caption: {
      en: 'The serialized TensorRT-engine backend was removed in July 2026 (from v1.3.0rc21); older stable 1.2 releases keep it. Specialization remains, and so does the validation matrix.',
      'pt-br': 'O backend de engines TensorRT serializados foi removido em julho de 2026 (a partir da v1.3.0rc21); releases estáveis 1.2 mantêm o caminho antigo. A especialização continua, assim como a matriz de validação.',
    },
    steps: [
      {
        label: { en: 'Legacy 1.2: AOT engine', 'pt-br': 'Legado 1.2: engine AOT' },
        caption: {
          en: 'Older guides describe converting checkpoints and running trtllm-build to emit frozen engine files scoped to fixed input-shape ranges.',
          'pt-br': 'Guias antigos descrevem converter checkpoints e rodar trtllm-build para emitir arquivos de engine congelados para faixas fixas de shape.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Hugging Face checkpoint', 'pt-br': 'Checkpoint Hugging Face' },
              detail: {
                en: 'weights and config pinned on disk',
                'pt-br': 'pesos e config fixados em disco',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Convert + trtllm-build', 'pt-br': 'Converter + trtllm-build' },
              detail: {
                en: 'ahead-of-time compile into serialized engine for fixed shape bounds',
                'pt-br': 'compilação antecipada num engine serializado para faixas fixas de shape',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Serve frozen engine', 'pt-br': 'Servir engine congelado' },
              detail: {
                en: 'rebuild required when GPU model, precision, or shape limits change',
                'pt-br': 'exige rebuild quando muda o modelo de GPU, precisão ou limites de shape',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Validate deployment', 'pt-br': 'Validar deployment' },
              detail: {
                en: 'check accuracy canary, realized KV pool and production SLO',
                'pt-br': 'conferir canário de corretude, pool de KV realizado e SLO de produção',
              },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'Current 1.3+: PyTorch-only', 'pt-br': 'Atual 1.3+: só PyTorch' },
        caption: {
          en: 'From v1.3.0rc21 onward, trtllm-serve loads Hugging Face checkpoints directly on top of NVIDIA kernels, in-flight batching, paged KV, quantization and parallelism.',
          'pt-br': 'A partir da v1.3.0rc21, trtllm-serve carrega checkpoints Hugging Face direto sobre kernels NVIDIA, in-flight batching, KV paginado, quantization e paralelismo.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Hugging Face checkpoint', 'pt-br': 'Checkpoint Hugging Face' },
              detail: {
                en: 'pinned revision; no conversion or trtllm-build step',
                'pt-br': 'revisão fixada; sem conversão nem etapa trtllm-build',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'trtllm-serve directly', 'pt-br': 'trtllm-serve direto' },
              detail: {
                en: 'PyTorch sole backend since v1.3.0rc21 (July 2026)',
                'pt-br': 'PyTorch como único backend desde v1.3.0rc21 (julho de 2026)',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'NVIDIA serving stack', 'pt-br': 'Stack de serving NVIDIA' },
              detail: {
                en: 'tuned kernels, in-flight batching, paged KV, quant, speculative decode',
                'pt-br': 'kernels dedicados, in-flight batching, KV paginado, quant e decode especulativo',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Revalidate on change', 'pt-br': 'Revalidar a cada mudança' },
              detail: {
                en: 'verify DeltaNet ops, canary vs eager, and goodput inside your SLO',
                'pt-br': 'checar ops DeltaNet, canário contra eager e goodput dentro do seu SLO',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.7 separates the GGUF container layout from the per-tensor quantization
   * ladder (Q8_0, k-quants, i-quants) and explains the 17.1 GB vs 13.5 GB gap.
   */
  't8-gguf-container-and-ladder': {
    lesson: '8.7-llama-cpp-and-gguf',
    title: {
      en: 'GGUF container layout and the quantization ladder',
      'pt-br': 'Estrutura do contêiner GGUF e escada de quantization',
    },
    caption: {
      en: 'GGUF is the self-describing container; compression lives in each tensor’s quantization type, which is why the pinned Q4_K_M file is 17.1 GB (15.93 GiB) rather than 13.5 GB.',
      'pt-br': 'GGUF é o contêiner autodescritivo; a compressão mora no tipo de quantization de cada tensor, motivo pelo qual o arquivo Q4_K_M fixado tem 17,1 GB (15,93 GiB) e não 13,5 GB.',
    },
    steps: [
      {
        label: { en: 'Inside one GGUF file', 'pt-br': 'Por dentro de um GGUF' },
        caption: {
          en: 'Three ordered sections let llama.cpp inspect architecture support before allocating memory and memory-map weights directly from disk.',
          'pt-br': 'Três seções em ordem deixam o llama.cpp conferir suporte à arquitetura antes de alocar memória e mapear pesos direto do disco.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Typed metadata header', 'pt-br': 'Header de metadados tipados' },
              detail: {
                en: 'architecture name, hyperparameters, full tokenizer and chat template',
                'pt-br': 'nome da arquitetura, hiperparâmetros, tokenizer completo e chat template',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Tensor directory', 'pt-br': 'Diretório de tensors' },
              detail: {
                en: 'every tensor’s name, shape, byte offset, and own quantization type',
                'pt-br': 'nome, shape, offset em bytes e tipo próprio de quantization de cada tensor',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Packed tensor bytes', 'pt-br': 'Bytes empacotados dos tensors' },
              detail: {
                en: 'memory-mapped from disk on demand; no decompression on load',
                'pt-br': 'mapeados do disco sob demanda; sem descompressão no carregamento',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Pre-load gate', 'pt-br': 'Portão antes do load' },
              detail: {
                en: 'refuses unknown architectures (such as missing DeltaNet support) cleanly',
                'pt-br': 'recusa arquiteturas desconhecidas (como falta de suporte DeltaNet) de forma limpa',
              },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'The quantization ladder', 'pt-br': 'A escada de quantization' },
        caption: {
          en: 'Moving down saves memory at growing quality or decode-speed cost. Pinned Q4_K_M lands at 17.1 GB (15.93 GiB) because scales, super-blocks, and protected tensors sit above the naive 13.5 GB floor.',
          'pt-br': 'Descer na escada economiza memória ao custo crescente de qualidade ou velocidade de decode. O Q4_K_M fixado chega a 17,1 GB (15,93 GiB) porque escalas, super-blocos e tensors preservados somam bytes acima dos 13,5 GB ingênuos.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Q8_0 (8-bit blocks)', 'pt-br': 'Q8_0 (blocos de 8 bits)' },
              detail: {
                en: 'about half of bf16 size; near-lossless in practice',
                'pt-br': 'cerca de metade do tamanho em bf16; praticamente sem perdas na prática',
              },
              pigment: 'success',
            },
            {
              label: { en: 'k-quants (Q6_K down to Q2_K)', 'pt-br': 'k-quants (de Q6_K até Q2_K)' },
              detail: {
                en: 'two-level super-block scales; M protects more sensitive tensors than S; pinned Q4_K_M = 17.1 GB',
                'pt-br': 'escalas em super-bloco de dois níveis; M protege mais tensors sensíveis que S; Q4_K_M fixado = 17,1 GB',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'i-quants (IQ4_NL down to IQ1_S)', 'pt-br': 'i-quants (de IQ4_NL até IQ1_S)' },
              detail: {
                en: 'codebook reconstruction; stays coherent at tiny bit rates, adds decode lookup cost; lowest rungs require imatrix',
                'pt-br': 'reconstrução por codebook; mantém coerência em poucos bits, soma custo de consulta no decode; degraus baixos exigem imatrix',
              },
              pigment: 'caution',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.8 shows how runner layers override parameters silently and how Ollama's
   * VRAM-tier num_ctx defaults compare against Qwen3.8-27B's 64 KiB/token KV
   * cost and 262,144-token native window.
   */
  't8-runner-override-and-context': {
    lesson: '8.8-ollama-and-local-runners',
    title: {
      en: 'Parameter precedence and VRAM-tier context defaults',
      'pt-br': 'Precedência de parâmetros e janelas padrão por VRAM',
    },
    caption: {
      en: 'Treat a runner as packaging, not policy: pin sampling and num_ctx in a versioned Modelfile, audit client SDK options, and price every context token at 64 KiB (lesson 7.2).',
      'pt-br': 'Trate o runner como empacotamento, nunca como política: fixe sampling e num_ctx num Modelfile versionado, audite o SDK cliente e precifique cada token de contexto a 64 KiB (aula 7.2).',
    },
    steps: [
      {
        label: { en: 'Who sets your parameters?', 'pt-br': 'Quem define seus parâmetros?' },
        caption: {
          en: 'Each layer can override the one before it without raising an error. Thinking mode is controlled separately by the chat template and toggle, not by temperature.',
          'pt-br': 'Cada camada pode sobrescrever a anterior sem levantar erro. O thinking mode é controlado à parte pelo chat template e pelo toggle, não pela temperatura.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Registry defaults', 'pt-br': 'Padrões do registry' },
              detail: {
                en: 'whatever the packager wrote; may not match the model card',
                'pt-br': 'o que o empacotador escreveu; pode não bater com o model card',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Your pinned Modelfile', 'pt-br': 'Seu Modelfile fixado' },
              detail: {
                en: 'inherits tag; pins all 6 instruct sampling knobs + num_ctx',
                'pt-br': 'herda a tag; fixa os 6 ajustes instruct de sampling + num_ctx',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Per-request API options', 'pt-br': 'Opções por requisição na API' },
              detail: {
                en: 'override Modelfile for that call; audit what your SDK sends by default',
                'pt-br': 'sobrescrevem o Modelfile na chamada; audite o que o SDK envia por padrão',
              },
              pigment: 'danger',
            },
            {
              label: { en: 'llama.cpp execution', 'pt-br': 'Execução no llama.cpp' },
              detail: {
                en: 'runs GGUF + chat template (thinking toggle is a separate control)',
                'pt-br': 'roda o GGUF + chat template (o toggle de thinking é um controle separado)',
              },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Context tiers vs KV cost', 'pt-br': 'Tiers de contexto vs KV' },
        caption: {
          en: 'Ollama’s lower VRAM-tier defaults (4K and 32K) sit below Qwen3.8-27B’s 262,144-token native window, while its 48+ GiB tier (256K) equals that native window; exceeding num_ctx silently trims older context (chat trimming can preserve system messages while dropping earlier turns).',
          'pt-br': 'Os padrões de tiers menores de VRAM do Ollama (4K e 32K) ficam abaixo da janela nativa de 262.144 tokens do Qwen3.8-27B, enquanto o tier de 48+ GiB (256K) iguala essa janela nativa; ultrapassar num_ctx apara contexto antigo em silêncio (o corte em chat pode preservar mensagens de system enquanto descarta turnos anteriores).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Under 24 GiB VRAM → 4K default', 'pt-br': 'Abaixo de 24 GiB de VRAM → padrão 4K' },
              detail: {
                en: 'older context is silently trimmed past 4K without error (chat mode can retain system prompts)',
                'pt-br': 'contexto antigo é aparado em silêncio acima de 4K sem erro (modo chat pode manter prompts de system)',
              },
              pigment: 'danger',
            },
            {
              label: { en: 'Lesson’s 24 GiB cap → 16,384 tokens', 'pt-br': 'Teto da aula em 24 GiB → 16.384 tokens' },
              detail: {
                en: `1 GiB KV at ${KV_KIB.en} KiB/token; deliberate headroom beside the 17.1 GB file`,
                'pt-br': `1 GiB de KV a ${KV_KIB['pt-br']} KiB/token; folga deliberada ao lado do arquivo de 17,1 GB`,
              },
              pigment: 'success',
            },
            {
              label: { en: '24–48 GiB VRAM → 32K default', 'pt-br': '24 a 48 GiB de VRAM → padrão 32K' },
              detail: {
                en: '2 GiB KV; still eight times smaller than the native context window',
                'pt-br': '2 GiB de KV; ainda oito vezes menor que a janela nativa de contexto',
              },
              pigment: 'caution',
            },
            {
              label: { en: `48+ GiB → 256K default (native ${CONTEXT_NATIVE.en})`, 'pt-br': `48+ GiB → padrão 256K (nativo ${CONTEXT_NATIVE['pt-br']})` },
              detail: {
                en: `equals native window; ${KV_FULL_GIB.en} GiB KV at full context; choose and pay for what you use`,
                'pt-br': `iguala a janela nativa; ${KV_FULL_GIB['pt-br']} GiB de KV no contexto cheio; escolha e pague pelo que usa`,
              },
              pigment: 'accent',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.9 clarifies MLX's two defining design choices: lazy graph evaluation
   * (and why naive timing lies) and unified memory vs discrete VRAM topology.
   */
  't8-mlx-lazy-and-unified': {
    lesson: '8.9-mlx',
    title: {
      en: 'MLX’s lazy timeline and unified-memory topology',
      'pt-br': 'Linha do tempo lazy e topologia de memória unificada no MLX',
    },
    caption: {
      en: 'Lazy evaluation delays both runtime and peak memory until a value is read (while explicit mx.compile fuses eligible kernels); unified memory removes host-to-device copies while sharing one physical pool with the OS and Metal.',
      'pt-br': 'A lazy evaluation adia tanto o tempo de execução quanto o pico de memória até um valor ser lido (enquanto mx.compile explícito funde kernels elegíveis); a memória unificada elimina cópias host-device mas divide um só pool físico com o sistema operacional e o Metal.',
    },
    steps: [
      {
        label: { en: 'Lazy evaluation timeline', 'pt-br': 'Linha do tempo lazy' },
        caption: {
          en: 'Writing y = model(x) only records graph nodes (for example, 2 ms); kernel fusion comes from explicit compilation via mx.compile rather than plain lazy evaluation alone. Printing or calling mx.eval(y) executes the graph (for example, 900 ms) and triggers peak memory.',
          'pt-br': 'Escrever y = model(x) apenas grava nós no grafo (por exemplo, 2 ms); a fusão de kernels vem da compilação explícita via mx.compile, não automaticamente da lazy evaluation sozinha. Imprimir ou chamar mx.eval(y) executa o grafo (por exemplo, 900 ms) e dispara o pico de memória.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'y = model(x)', 'pt-br': 'Chamada y = model(x)' },
              detail: {
                en: 'records nodes in a computation graph; no math runs yet',
                'pt-br': 'registra nós num grafo de computação; nenhuma conta roda ainda',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'mx.compile (optional fusion)', 'pt-br': 'mx.compile (fusão opcional)' },
              detail: {
                en: 'explicit graph compilation fuses kernels; lazy eval alone skips unread nodes',
                'pt-br': 'compilação explícita do grafo funde kernels; lazy eval sozinha só pula nós não lidos',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'print(y) or eval', 'pt-br': 'print(y) ou avaliação forçada' },
              detail: {
                en: 'work and peak memory happen here, not where the line was written',
                'pt-br': 'trabalho e pico de memória ocorrem aqui, não na linha em que foi escrito',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Benchmark rule', 'pt-br': 'Regra de benchmark' },
              detail: {
                en: 'force evaluation before stopping the clock or reading peak RAM',
                'pt-br': 'force a avaliação antes de parar o cronômetro ou ler o pico de RAM',
              },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Discrete GPU vs unified Mac', 'pt-br': 'GPU discreta vs Mac unificado' },
        caption: {
          en: 'Brochure capacity (24 GB vs 32 GB) cannot pick a winner. Measure the realized working set — weights, KV, DeltaNet state and runtime buffers — and real throughput on both.',
          'pt-br': 'A capacidade de catálogo (24 GB contra 32 GB) não decide o vencedor. Meça o working set realizado — pesos, KV, estado DeltaNet e buffers de runtime — e o throughput real nos dois.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Discrete GPU (e.g. 24 GB VRAM)', 'pt-br': 'GPU discreta (ex.: 24 GB de VRAM)' },
              detail: {
                en: 'separate CPU and GPU pools linked by PCIe; higher decode bandwidth while everything fits; CPU spill hits PCIe',
                'pt-br': 'pools separados de CPU e GPU ligados por PCIe; maior banda de decode enquanto tudo cabe; spill para CPU bate no PCIe',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Unified memory (e.g. 32 GB Mac)', 'pt-br': 'Memória unificada (ex.: Mac de 32 GB)' },
              detail: {
                en: 'one shared pool for CPU, GPU, OS and Metal; no .to(device) copy; overflowing RAM swaps to disk and crawls',
                'pt-br': 'um pool compartilhado para CPU, GPU, SO e Metal; sem cópia .to(device); estourar a RAM gera swap em disco e derruba a velocidade',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Realized-fit rule for both', 'pt-br': 'Regra de fit realizado para ambos' },
              detail: {
                en: 'convert or load exact artifact, force eval, and check working set at target context and concurrency',
                'pt-br': 'converta ou carregue o artefato exato, force avaliação e cheque o working set no contexto e concorrência alvo',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.10 contrasts vLLM's Python + hand-written vendor kernel stack against
   * Modular MAX's graph compiler + Mojo/MLIR stack.
   */
  't8-vllm-vs-max-stack': {
    lesson: '8.10-modular-max-mojo',
    title: {
      en: 'Hand-written vendor kernels vs compiler-first serving',
      'pt-br': 'Kernels escritos à mão contra serving guiado por compilador',
    },
    caption: {
      en: 'Both stacks still need a serving scheduler and paged KV manager. They differ on who owns kernel optimization and how hard it is to target a second GPU vendor.',
      'pt-br': 'Os dois stacks ainda precisam de scheduler de serving e gerenciador de KV paginado. Eles diferem em quem é dono da otimização de kernels e no esforço para mirar um segundo fornecedor de GPU.',
    },
    steps: [
      {
        label: { en: 'Hand-written stack (vLLM)', 'pt-br': 'Stack manual (vLLM)' },
        caption: {
          en: 'Specialists tune CUDA or Triton kernels near the hardware limit for one GPU family; moving to another vendor means maintaining separate kernel implementations.',
          'pt-br': 'Especialistas ajustam kernels CUDA ou Triton perto do limite do hardware para uma família de GPU; migrar para outro fornecedor significa manter implementações separadas de kernels.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Python serving layer', 'pt-br': 'Camada de serving Python' },
              detail: {
                en: 'scheduler, paged KV allocator and continuous-batching loop',
                'pt-br': 'scheduler, alocador de KV paginado e loop de continuous batching',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'PyTorch dispatch', 'pt-br': 'Dispatch do PyTorch' },
              detail: {
                en: 'routes model operations to hand-selected libraries and kernels',
                'pt-br': 'roteia operações do modelo para bibliotecas e kernels escolhidos à mão',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Vendor kernels', 'pt-br': 'Kernels por fornecedor' },
              detail: {
                en: 'hand-tuned CUDA or Triton written separately per vendor family',
                'pt-br': 'CUDA ou Triton ajustados à mão e escritos à parte por família de fornecedor',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Trade-off', 'pt-br': 'Compromisso' },
              detail: {
                en: 'mature & fast on one fleet; new vendor or layer type needs new kernels',
                'pt-br': 'maduro e rápido numa frota; fornecedor ou camada nova pede novos kernels',
              },
              pigment: 'caution',
            },
          ],
        },
      },
      {
        label: { en: 'Compiler-first (MAX + Mojo)', 'pt-br': 'Compilador primeiro (MAX + Mojo)' },
        caption: {
          en: 'An ahead-of-time graph compiler owns fusion, layout and retargeting across NVIDIA and AMD from Mojo/MLIR kernels — at the cost of verifying younger model and quant coverage.',
          'pt-br': 'Um compilador antecipado de grafos assume fusão, layout e redirecionamento entre NVIDIA e AMD a partir de kernels Mojo/MLIR — ao custo de validar cobertura mais jovem de modelos e quants.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'OpenAI-shaped server', 'pt-br': 'Servidor padrão OpenAI' },
              detail: {
                en: 'serving layer still handles batching and KV memory across requests',
                'pt-br': 'camada de serving ainda faz batching e memória de KV entre requisições',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'AOT graph compiler', 'pt-br': 'Compilador de grafos AOT' },
              detail: {
                en: 'owns operator fusion, memory layout and device scheduling before traffic',
                'pt-br': 'controla fusão de operadores, layout de memória e escalonamento antes do tráfego',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Mojo → MLIR kernels', 'pt-br': 'Kernels Mojo → MLIR' },
              detail: {
                en: 'one kernel source with static types, ownership, SIMD and tiling',
                'pt-br': 'um único código de kernel com tipos estáticos, ownership, SIMD e tiling',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Verification gate', 'pt-br': 'Portão de verificação' },
              detail: {
                en: 'portable across NVIDIA & AMD; verify DeltaNet, quant format and like-for-like speed',
                'pt-br': 'portátil entre NVIDIA e AMD; valide DeltaNet, formato de quant e velocidade equivalente',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.11 works through a 30,000-request monthly Cloudflare Workers AI bill
   * (Aug 2026 published rates: USD 0.45/M input, USD 3.20/M output). Each frame
   * is a true proportional split of one total (tokens, standard bill, thinking bill).
   */
  't8-cloud-bill-asymmetry': {
    lesson: '8.11-serving-in-the-cloud',
    title: {
      en: 'Why output tokens dominate a metered bill',
      'pt-br': 'Por que os tokens de saída dominam uma fatura por token',
    },
    caption: {
      en: 'Worked monthly example (30,000 requests at Aug 2026 Cloudflare Workers AI rates, gross before the 10,000-neuron daily free allocation): 1,200 input tokens, 400 reply tokens, and +800 thinking tokens in step 3.',
      'pt-br': 'Exemplo mensal trabalhado (30.000 requisições nas tarifas de agosto de 2026 do Cloudflare Workers AI, bruto antes da franquia diária de 10.000 neurons): 1.200 tokens de entrada, 400 de resposta e +800 de raciocínio no passo 3.',
    },
    steps: [
      {
        label: { en: 'Token share (standard)', 'pt-br': 'Fatia de tokens (padrão)' },
        caption: {
          en: '48 million tokens total: 36 million input (75%) and 12 million output (25%). By token count alone, input looks like the main driver.',
          'pt-br': '48 milhões de tokens no total: 36 milhões de entrada (75%) e 12 milhões de saída (25%). Olhando só o volume, a entrada parece mandar.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Input tokens', 'pt-br': 'Tokens de entrada' },
              detail: {
                en: '36 million tokens (30,000 × 1,200)',
                'pt-br': '36 milhões de tokens (30.000 × 1.200)',
              },
              pigment: 'accent',
              weight: 36,
            },
            {
              label: { en: 'Output tokens', 'pt-br': 'Tokens de saída' },
              detail: {
                en: '12 million tokens (30,000 × 400)',
                'pt-br': '12 milhões de tokens (30.000 × 400)',
              },
              pigment: 'caution',
              weight: 12,
            },
          ],
        },
      },
      {
        label: { en: 'Bill share (USD 54.60)', 'pt-br': 'Fatia da conta (USD 54,60)' },
        caption: {
          en: 'At USD 0.45/M input and USD 3.20/M output, the shares flip: output is a quarter of the tokens and 70% of the USD 54.60 gross bill.',
          'pt-br': 'A USD 0,45/M na entrada e USD 3,20/M na saída, as fatias invertem: a saída é um quarto dos tokens e 70% da conta bruta de USD 54,60.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Input cost', 'pt-br': 'Custo de entrada' },
              detail: {
                en: 'USD 16.20 (36M × USD 0.45/M)',
                'pt-br': 'USD 16,20 (36M × USD 0,45/M)',
              },
              pigment: 'accent',
              weight: 16.2,
            },
            {
              label: { en: 'Output cost', 'pt-br': 'Custo de saída' },
              detail: {
                en: 'USD 38.40 (12M × USD 3.20/M)',
                'pt-br': 'USD 38,40 (12M × USD 3,20/M)',
              },
              pigment: 'danger',
              weight: 38.4,
            },
          ],
        },
      },
      {
        label: { en: 'With thinking (USD 131.40)', 'pt-br': 'Com thinking (USD 131,40)' },
        caption: {
          en: 'Adding 800 reasoning tokens per request triples output to 36M tokens (USD 115.20). The total jumps 2.4× to USD 131.40 from one flag, with input untouched.',
          'pt-br': 'Somar 800 tokens de raciocínio por requisição triplica a saída para 36M de tokens (USD 115,20). O total salta 2,4× para USD 131,40 com uma única flag, sem tocar na entrada.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Input cost (unchanged)', 'pt-br': 'Custo de entrada (inalterado)' },
              detail: {
                en: 'USD 16.20 (36M × USD 0.45/M)',
                'pt-br': 'USD 16,20 (36M × USD 0,45/M)',
              },
              pigment: 'accent',
              weight: 16.2,
            },
            {
              label: { en: 'Output + thinking cost', 'pt-br': 'Custo de saída + thinking' },
              detail: {
                en: 'USD 115.20 (36M × USD 3.20/M: 400 reply + 800 thinking per request)',
                'pt-br': 'USD 115,20 (36M × USD 3,20/M: 400 de resposta + 800 de raciocínio por chamada)',
              },
              pigment: 'danger',
              weight: 115.2,
            },
          ],
        },
      },
    ],
  },

  /**
   * 8.12 synthesizes the whole track into a three-question selection funnel
   * and a four-part benchmark passport that makes comparisons auditable.
   */
  't8-stack-decision-and-passport': {
    lesson: '8.12-choosing-your-stack',
    title: {
      en: 'Choosing a stack and auditing a benchmark',
      'pt-br': 'Escolhendo o stack e auditando um benchmark',
    },
    caption: {
      en: 'Decide with arithmetic and confirm with measurement. Speed belongs to a model, hardware, and workload together — never to a stack name on its own.',
      'pt-br': 'Decida com aritmética e confirme com medição. Velocidade pertence ao conjunto modelo, hardware e carga — nunca ao nome de um stack isolado.',
    },
    steps: [
      {
        label: { en: 'Three selection questions', 'pt-br': 'Três perguntas de escolha' },
        caption: {
          en: 'Answer hardware fit first, workload shape second, and ops headcount third; then verify the candidate on your own traffic.',
          'pt-br': 'Responda primeiro ao hardware, segundo ao formato da carga e terceiro à capacidade de ops; depois confirme o candidato no seu próprio tráfego.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: '1. Hardware fit', 'pt-br': '1. Hardware' },
              detail: {
                en: `${WEIGHTS_GB.en} GB bf16 → 80 GB+ or shard; 17.1 GB Q4_K_M → 24 GB GPU / 32 GB Mac`,
                'pt-br': `${WEIGHTS_GB['pt-br']} GB bf16 → 80 GB+ ou shard; 17,1 GB Q4_K_M → GPU 24 GB / Mac 32 GB`,
              },
              pigment: 'muted',
            },
            {
              label: { en: '2. Workload shape', 'pt-br': '2. Formato da carga' },
              detail: {
                en: '1 user → MLX/Ollama; internal API → vLLM; shared prefix or JSON → SGLang',
                'pt-br': '1 usuário → MLX/Ollama; API interna → vLLM; prefixo compartilhado ou JSON → SGLang',
              },
              pigment: 'accent',
            },
            {
              label: { en: '3. Ops & fleet', 'pt-br': '3. Ops e frota' },
              detail: {
                en: 'NVIDIA fleet → TensorRT-LLM; mixed → MAX; low/spiky, no ops → Cloud API',
                'pt-br': 'frota NVIDIA → TensorRT-LLM; mista → MAX; volume baixo/irregular sem ops → nuvem',
              },
              pigment: 'caution',
            },
            {
              label: { en: '4. Measure locally', 'pt-br': '4. Medir na sua carga' },
              detail: {
                en: 'treat vendor numbers as hypotheses until reproduced on your traffic',
                'pt-br': 'trate números de fornecedor como hipóteses até reproduzir no seu tráfego',
              },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Four-part benchmark passport', 'pt-br': 'Passaporte de benchmark em 4 partes' },
        caption: {
          en: 'Following MLPerf and HELM principles, record every run under these four headings so reviewers can audit what was held constant and why failed runs were discarded.',
          'pt-br': 'Seguindo os princípios de MLPerf e HELM, registre cada execução nestes quatro blocos para que revisores auditem o que ficou fixo e por que execuções falhas foram descartadas.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Identity', 'pt-br': 'Identidade' },
              detail: {
                en: 'exact model & runtime revisions, driver, template, weight/KV/state formats, drafter',
                'pt-br': 'revisões exatas de modelo e runtime, driver, template, formatos de pesos/KV/estado e drafter',
              },
              pigment: 'muted',
            },
            {
              label: { en: 'Protocol', 'pt-br': 'Protocolo' },
              detail: {
                en: 'prompt set, harness & scorer, sampling/thinking policy, lengths, concurrency, warm-up',
                'pt-br': 'prompts, harness e scorer, política de sampling/thinking, tamanhos, concorrência e warm-up',
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Validity', 'pt-br': 'Validade' },
              detail: {
                en: 'correctness canaries first, realized KV, discard rules, separate error counts',
                'pt-br': 'canários de correção antes, KV realizado, regras de descarte e erros separados',
              },
              pigment: 'caution',
            },
            {
              label: { en: 'Results', 'pt-br': 'Resultados' },
              detail: {
                en: 'TTFT, decode rate, p50/p95/p99, throughput, peak memory, measured energy only',
                'pt-br': 'TTFT, taxa de decode, p50/p95/p99, throughput, pico de memória e energia só se medida',
              },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
