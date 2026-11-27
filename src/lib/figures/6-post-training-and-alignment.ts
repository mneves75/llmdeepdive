/**
 * Figures for track 6 — Post-training & Alignment.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import { formatNumber } from '~/lib/i18n'
import { QWEN } from '~/lib/model-facts'
import type { Figure, Localised } from './types'

const both = (value: number): Localised => ({ en: formatNumber('en', value), 'pt-br': formatNumber('pt-br', value) })

const LAYERS = QWEN.layers.value
const VOCAB = both(QWEN.vocabSize.value)
const WEIGHTS_BF16_GB = QWEN.weightsGbBf16.value
const WEIGHTS_4BIT_FLOOR_GB = WEIGHTS_BF16_GB / 4
const FULL_ADAMW_GB = WEIGHTS_BF16_GB * 6
const LORA_ADAPTER_AND_GRAD_GB = 0.168
const LORA_ADAMW_GB = 0.5

/** 6.4: pairwise logistic loss -log(sigma(m)) = log(1 + exp(-m)) over margin m. */
const rewardLossAxes = {
  xAxis: {
    label: { en: 'Score margin r(x, y⁺) − r(x, y⁻)', 'pt-br': 'Margem de escore r(x, y⁺) − r(x, y⁻)' },
    scale: 'linear',
    min: -2,
    max: 2,
  },
  yAxis: {
    label: { en: 'Pairwise logistic loss', 'pt-br': 'Loss logística pareada' },
    scale: 'linear',
    min: 0,
    max: 2.4,
  },
} as const

const rewardLossCurve = [
  [-2, 2.1269],
  [-1.5, 1.7014],
  [-0.8, 1.1711],
  [0, 0.6931],
  [0.8, 0.3711],
  [1.5, 0.2014],
  [2, 0.1269],
] as const

/** 6.5: PPO clipped surrogate J_t = min(rho * A, clip(rho, 0.8, 1.2) * A) with eps = 0.2. */
const ppoClipAxes = {
  xAxis: {
    label: { en: 'Probability ratio ρ = π_new / π_old', 'pt-br': 'Razão de probabilidades ρ = π_nova / π_antiga' },
    scale: 'linear',
    min: 0.5,
    max: 1.7,
  },
  yAxis: {
    label: { en: 'Surrogate objective J', 'pt-br': 'Objetivo substituto J' },
    scale: 'linear',
    min: -3.5,
    max: 3.5,
  },
} as const

export const TRACK_6_FIGURES = {
  /**
   * 6.1 contrasted four plausible base-model continuations with assistant
   * post-training and Qwen3.8-27B's two shipped operating modes. Stepping
   * through the three frames replaces the numbered list of continuations.
   */
  't6-base-vs-assistant': {
    lesson: '6.1-why-base-models-arent-assistants',
    title: { en: 'Same prompt, three stages of shaping', 'pt-br': 'Mesmo prompt, três estágios de moldagem' },
    caption: {
      en: `The prompt "Write three reasons to test backups" goes through the same ${LAYERS} layers and ${VOCAB.en}-token vocabulary in every frame. Only the learned weights and serving convention change which continuation wins.`,
      'pt-br': `O prompt "Escreva três razões para testar backups" atravessa as mesmas ${LAYERS} camadas e o mesmo vocabulário de ${VOCAB['pt-br']} tokens em cada quadro. Só os pesos aprendidos e a convenção de serving mudam qual continuação vence.`,
    },
    steps: [
      {
        label: { en: 'Base model', 'pt-br': 'Modelo base' },
        caption: {
          en: 'Pretraining rewards any continuation that fits written text, so multiple plausible continuations (four illustrative branches below) can share non-trivial probability mass. Nothing in the objective marks the imperative as an instruction to execute.',
          'pt-br': 'O pretraining recompensa qualquer continuação que caiba em texto escrito, então várias continuações plausíveis (quatro ramos ilustrativos abaixo) podem dividir massa de probabilidade relevante. Nada no objetivo marca o imperativo como uma instrução a executar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Three reasons', 'pt-br': 'Três razões' }, detail: { en: 'what the user actually wanted', 'pt-br': 'o que o usuário realmente queria' }, pigment: 'accent' },
            { label: { en: 'A fourth prompt', 'pt-br': 'Um quarto prompt' }, detail: { en: 'continues a list of prompts', 'pt-br': 'continua uma lista de prompts' }, pigment: 'muted' },
            { label: { en: 'A critique', 'pt-br': 'Uma crítica' }, detail: { en: 'questions the premise instead', 'pt-br': 'questiona a premissa em vez de responder' }, pigment: 'muted' },
            { label: { en: 'A document header', 'pt-br': 'Um cabeçalho' }, detail: { en: 'treats the line as a section title', 'pt-br': 'trata a linha como título de seção' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Post-trained assistant', 'pt-br': 'Assistente pós-treinado' },
        caption: {
          en: 'A chat template wraps the request in ordinary role tokens, and post-trained weights shift default probability mass onto the assistant-turn answer without adding new layers or heads.',
          'pt-br': 'Um chat template envolve o pedido em tokens comuns de papel, e os pesos pós-treinados deslocam a massa de probabilidade padrão para a resposta no turno do assistente sem acrescentar camadas nem heads.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chat template', 'pt-br': 'Template de chat' }, detail: { en: 'system, user and assistant role markers', 'pt-br': 'marcadores de papel system, user e assistant' }, pigment: 'accent' },
            { label: { en: 'Same architecture, updated weights', 'pt-br': 'Mesma arquitetura, pesos atualizados' }, detail: { en: 'identical attention mechanics; post-training updates weight values', 'pt-br': 'mecânica de attention idêntica; o pós-treino atualiza os valores dos pesos' }, pigment: 'accent' },
            { label: { en: 'Assistant reply', 'pt-br': 'Resposta do assistente' }, detail: { en: 'three reasons, directly in the assistant turn', 'pt-br': 'três razões, direto no turno do assistente' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Qwen3.8-27B modes', 'pt-br': 'Modos do Qwen3.8-27B' },
        caption: {
          en: 'One post-trained checkpoint ships two modes. Thinking mode is the default; passing enable_thinking set to False switches to direct answers under the instruct preset.',
          'pt-br': 'Um único checkpoint pós-treinado entrega dois modos. O thinking mode é o padrão; passar enable_thinking em False muda para respostas diretas sob o preset instruct.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'One checkpoint', 'pt-br': 'Um checkpoint' }, detail: { en: `${LAYERS} layers, ${VOCAB.en}-row vocabulary`, 'pt-br': `${LAYERS} camadas, vocabulário de ${VOCAB['pt-br']} linhas` }, pigment: 'muted' },
            { label: { en: 'Thinking (default)', 'pt-br': 'Thinking (padrão)' }, detail: { en: 'thinking segment + answer; temp 1.0, top_p 0.95', 'pt-br': 'segmento de thinking + resposta; temp 1,0, top_p 0,95' }, pigment: 'accent' },
            { label: { en: 'Instruct (switch off)', 'pt-br': 'Instruct (desligado)' }, detail: { en: 'enable_thinking=False; temp 0.7, top_p 0.80', 'pt-br': 'enable_thinking=False; temp 0,7, top_p 0,80' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 6.2 walked through a 460-token conversation split into 18 markers, 96
   * system, 226 user, and 120 assistant tokens, contrasting masked SFT with
   * unmasked training. The proportional stack replaces the four-bullet token
   * list and makes the 340-vs-120 gradient split immediately visible.
   */
  't6-sft-loss-mask': {
    lesson: '6.2-supervised-fine-tuning-and-instruction-data',
    title: { en: 'Which tokens enter the SFT loss', 'pt-br': 'Quais tokens entram na loss do SFT' },
    caption: {
      en: 'One 460-token conversation passes through the forward pass intact in both cases. The loss mask zeroes direct cross-entropy loss on prompt tokens, while gradients from the scored assistant loss still flow back through prompt representations via attention.',
      'pt-br': 'Uma conversa de 460 tokens atravessa o forward pass inteira nos dois casos. A máscara da loss zera a cross-entropy direta nos tokens do prompt, enquanto gradientes da loss do assistente ainda fluem de volta pelas representações do prompt via attention.',
    },
    steps: [
      {
        label: { en: 'Masked (correct SFT)', 'pt-br': 'Mascarado (SFT correto)' },
        caption: {
          en: 'All 460 tokens stay in context so the model attends over them, while only the 120 assistant tokens (26%) contribute direct cross-entropy loss terms.',
          'pt-br': 'Todos os 460 tokens ficam no contexto para o modelo prestar attention neles, enquanto só os 120 tokens do assistente (26%) contribuem com termos diretos de loss de cross-entropy.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Template markers', 'pt-br': 'Marcadores do template' }, detail: { en: '18 tokens — in context, masked out of loss', 'pt-br': '18 tokens — no contexto, mascarados da loss' }, weight: 18, pigment: 'muted' },
            { label: { en: 'System instruction', 'pt-br': 'Instrução de system' }, detail: { en: '96 tokens — in context, masked out of loss', 'pt-br': '96 tokens — no contexto, mascarados da loss' }, weight: 96, pigment: 'muted' },
            { label: { en: 'User request', 'pt-br': 'Pedido do usuário' }, detail: { en: '226 tokens — in context, masked out of loss', 'pt-br': '226 tokens — no contexto, mascarados da loss' }, weight: 226, pigment: 'muted' },
            { label: { en: 'Assistant reply', 'pt-br': 'Resposta do assistente' }, detail: { en: '120 tokens — scored in cross-entropy loss', 'pt-br': '120 tokens — pontuados na loss de cross-entropy' }, weight: 120, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Unmasked (wrong turn)', 'pt-br': 'Sem máscara (desvio errado)' },
        caption: {
          en: 'Without the mask, 340 of 460 direct cross-entropy loss terms (74%) train the model to imitate markers, system instructions, and user questions — so it finishes an answer and writes the next user turn.',
          'pt-br': 'Sem a máscara, 340 de 460 termos diretos de loss de cross-entropy (74%) treinam o modelo a imitar marcadores, instruções de system e perguntas do usuário — e ele termina a resposta escrevendo o próximo turno do usuário.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Template markers', 'pt-br': 'Marcadores do template' }, detail: { en: '18 tokens — trains on structural markers', 'pt-br': '18 tokens — treina em marcadores estruturais' }, weight: 18, pigment: 'danger' },
            { label: { en: 'System instruction', 'pt-br': 'Instrução de system' }, detail: { en: '96 tokens — trains on system text', 'pt-br': '96 tokens — treina em texto de system' }, weight: 96, pigment: 'danger' },
            { label: { en: 'User request', 'pt-br': 'Pedido do usuário' }, detail: { en: '226 tokens — trains to imitate user prompts', 'pt-br': '226 tokens — treina para imitar prompts de usuário' }, weight: 226, pigment: 'danger' },
            { label: { en: 'Assistant reply', 'pt-br': 'Resposta do assistente' }, detail: { en: '120 tokens — only a quarter of the direct loss terms', 'pt-br': '120 tokens — apenas um quarto dos termos diretos de loss' }, weight: 120, pigment: 'accent' },
          ],
        },
      },
    ],
  },

  /**
   * 6.3 compares the illustrative static memory budgets of full fine-tuning,
   * LoRA, and QLoRA on a 27B-class model (before activations, buffers and
   * quantization metadata).
   */
  't6-lora-qlora-memory': {
    lesson: '6.3-lora-qlora-and-peft',
    derivedFrom: '5-pretraining-at-scale/5.7-data-parallelism-zero-fsdp',
    title: { en: 'Where training memory goes on a 27B model', 'pt-br': 'Para onde vai a memória de treino num modelo de 27B' },
    caption: {
      en: 'Illustrative weight, gradient, and AdamW state budgets before activations, backend buffers, and quantization metadata. LoRA shrinks optimizer state; QLoRA shrinks the frozen backbone too.',
      'pt-br': 'Orçamentos ilustrativos de pesos, gradientes e estado do AdamW antes de ativações, buffers do backend e metadados de quantização. O LoRA encolhe o estado do otimizador; o QLoRA encolhe também o backbone congelado.',
    },
    steps: [
      {
        label: { en: 'Full fine-tuning (~432 GB)', 'pt-br': 'Fine-tuning completo (~432 GB)' },
        caption: {
          en: `Updating all 27B parameters requires ${WEIGHTS_BF16_GB} GB of bf16 weights, ${WEIGHTS_BF16_GB} GB of gradients, and ${FULL_ADAMW_GB} GB of fp32 AdamW and master-weight state — multi-GPU territory before storing one activation.`,
          'pt-br': `Atualizar todos os 27B de parâmetros exige ${WEIGHTS_BF16_GB} GB de pesos em bf16, ${WEIGHTS_BF16_GB} GB de gradientes e ${FULL_ADAMW_GB} GB de estado AdamW e master weights em fp32 — território multi-GPU antes de guardar uma única ativação.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Weights (bf16)', 'pt-br': 'Pesos (bf16)' }, detail: { en: `${WEIGHTS_BF16_GB} GB (2 bytes per parameter)`, 'pt-br': `${WEIGHTS_BF16_GB} GB (2 bytes por parâmetro)` }, weight: WEIGHTS_BF16_GB, pigment: 'accent' },
            { label: { en: 'Gradients (bf16)', 'pt-br': 'Gradientes (bf16)' }, detail: { en: `${WEIGHTS_BF16_GB} GB (2 bytes per parameter)`, 'pt-br': `${WEIGHTS_BF16_GB} GB (2 bytes por parâmetro)` }, weight: WEIGHTS_BF16_GB, pigment: 'caution' },
            { label: { en: 'AdamW + fp32 master weights', 'pt-br': 'AdamW + master weights em fp32' }, detail: { en: `${FULL_ADAMW_GB} GB (12 bytes per parameter)`, 'pt-br': `${FULL_ADAMW_GB} GB (12 bytes por parâmetro)` }, weight: FULL_ADAMW_GB, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'LoRA (~54.7 GB)', 'pt-br': 'LoRA (~54,7 GB)' },
        caption: {
          en: 'With ~42M trainable adapter parameters (illustrative rank-16 sizing), AdamW state drops from 324 GB to ~0.5 GB — three orders of magnitude — but the frozen 54 GB bf16 backbone still exceeds a 24–48 GB GPU.',
          'pt-br': 'Com cerca de 42M de parâmetros treináveis de adapter (dimensionamento ilustrativo de posto 16), o estado do AdamW cai de 324 GB para ~0,5 GB — três ordens de grandeza —, mas o backbone congelado de 54 GB em bf16 ainda excede uma GPU de 24–48 GB.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Frozen backbone (bf16)', 'pt-br': 'Backbone congelado (bf16)' }, detail: { en: `${WEIGHTS_BF16_GB} GB — no gradients or optimizer state`, 'pt-br': `${WEIGHTS_BF16_GB} GB — sem gradientes nem estado de otimizador` }, weight: WEIGHTS_BF16_GB, pigment: 'muted' },
            { label: { en: 'LoRA adapters + gradients', 'pt-br': 'Adapters LoRA + gradientes' }, detail: { en: '~84 MB weights + ~84 MB gradients in bf16', 'pt-br': '~84 MB de pesos + ~84 MB de gradientes em bf16' }, weight: LORA_ADAPTER_AND_GRAD_GB, pigment: 'accent' },
            { label: { en: 'Adapter AdamW state', 'pt-br': 'Estado AdamW dos adapters' }, detail: { en: '~0.5 GB (12 bytes × ~42M parameters)', 'pt-br': '~0,5 GB (12 bytes × ~42M parâmetros)' }, weight: LORA_ADAMW_GB, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'QLoRA (14.2 GB floor)', 'pt-br': 'QLoRA (piso de 14,2 GB)' },
        caption: {
          en: `Quantizing the frozen backbone sets a ${WEIGHTS_4BIT_FLOOR_GB} GB pure 4-bit floor before quantization metadata, buffers, and activations. Sequence length and micro-batch then decide whether a 24–48 GB card holds.`,
          'pt-br': `Quantizar o backbone congelado define um piso puro de 4 bits de 13,5 GB antes de metadados de quantização, buffers e ativações. Comprimento de sequência e micro-batch então decidem se uma placa de 24–48 GB aguenta.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Frozen backbone (4-bit floor)', 'pt-br': 'Backbone congelado (piso de 4 bits)' }, detail: { en: '13.5 GB pure 4-bit floor; dequantized on the fly', 'pt-br': 'piso puro de 13,5 GB em 4 bits; desquantizado na hora' }, weight: WEIGHTS_4BIT_FLOOR_GB, pigment: 'accent' },
            { label: { en: 'LoRA adapters + gradients', 'pt-br': 'Adapters LoRA + gradientes' }, detail: { en: '~84 MB weights + ~84 MB gradients in higher precision', 'pt-br': '~84 MB de pesos + ~84 MB de gradientes em precisão maior' }, weight: LORA_ADAPTER_AND_GRAD_GB, pigment: 'success' },
            { label: { en: 'Adapter AdamW state', 'pt-br': 'Estado AdamW dos adapters' }, detail: { en: '~0.5 GB — still leaves room for activations if sequence length fits', 'pt-br': '~0,5 GB — deixa espaço para ativações se o comprimento couber' }, weight: LORA_ADAMW_GB, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 6.4 shows the pairwise logistic reward loss at margins -0.8, 0, and +0.8,
   * then demonstrates shift invariance by adding +5 to both scores.
   */
  't6-reward-margin-loss': {
    lesson: '6.4-reward-models-and-human-preference-data',
    title: { en: 'Only the gap between scores enters the loss', 'pt-br': 'Só a distância entre os escores entra na loss' },
    caption: {
      en: 'Pairwise logistic loss −log σ(m) depends solely on the margin m = r(x, y⁺) − r(x, y⁻). Absolute score levels never appear in the objective.',
      'pt-br': 'A loss logística pareada −log σ(m) depende somente da margem m = r(x, y⁺) − r(x, y⁻). Níveis absolutos de escore nunca aparecem no objetivo.',
    },
    steps: [
      {
        label: { en: 'Loss across margins', 'pt-br': 'Loss conforme a margem' },
        caption: {
          en: 'When the chosen response leads by +0.8 (scores 1.2 vs 0.4), loss is 0.37. A tie (margin 0) gives log 2 ≈ 0.69; inverting the pair to −0.8 pushes loss to 1.17.',
          'pt-br': 'Quando a resposta escolhida lidera por +0,8 (escores 1,2 contra 0,4), a loss é 0,37. Um empate (margem 0) dá log 2 ≈ 0,69; inverter o par para −0,8 leva a loss a 1,17.',
        },
        body: {
          kind: 'plot',
          ...rewardLossAxes,
          series: [
            {
              label: { en: '−log σ(m)', 'pt-br': '−log σ(m)' },
              pigment: 'accent',
              points: rewardLossCurve,
              marks: [
                { at: [-0.8, 1.1711], label: { en: '−0.8: loss 1.17', 'pt-br': '−0,8: loss 1,17' } },
                { at: [0, 0.6931], label: { en: '0: loss 0.69', 'pt-br': '0: loss 0,69' } },
                { at: [0.8, 0.3711], label: { en: '1.2 vs 0.4: 0.37', 'pt-br': '1,2 vs 0,4: 0,37' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Add +5 to both scores', 'pt-br': 'Somar +5 aos dois escores' },
        caption: {
          en: 'Shifting both scores from (1.2, 0.4) to (6.2, 5.4) leaves the margin at 0.8 and lands on the exact same point (loss 0.37). Because no fixed zero exists, a hard threshold like "> 3.0" breaks on retrain.',
          'pt-br': 'Deslocar os dois escores de (1,2; 0,4) para (6,2; 5,4) mantém a margem em 0,8 e cai exatamente no mesmo ponto (loss 0,37). Como não existe zero fixo, um limiar rígido como "> 3,0" quebra ao retreinar.',
        },
        body: {
          kind: 'plot',
          ...rewardLossAxes,
          series: [
            {
              label: { en: '−log σ(m) (unchanged curve)', 'pt-br': '−log σ(m) (curva inalterada)' },
              pigment: 'muted',
              points: rewardLossCurve,
            },
            {
              label: { en: 'Shifted pair: 6.2 − 5.4 = 0.8', 'pt-br': 'Par deslocado: 6,2 − 5,4 = 0,8' },
              pigment: 'caution',
              points: [[0.8, 0.3711]],
              marks: [
                { at: [0.8, 0.3711], label: { en: '6.2 vs 5.4 → same 0.37', 'pt-br': '6,2 vs 5,4 → mesmos 0,37' } },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 6.5 plots PPO's asymmetric clipped surrogate J_t for A = +2.0 vs A = -2.0
   * at clip epsilon = 0.2, directly showing why positive advantage flattens
   * past rho = 1.2 while negative advantage keeps plunging.
   */
  't6-ppo-clip-asymmetry': {
    lesson: '6.5-rlhf-with-ppo',
    title: { en: 'Why PPO’s clip is one-sided', 'pt-br': 'Por que o clip do PPO é assimétrico' },
    caption: {
      en: 'Surrogate objective J = min(ρA, clip(ρ, 0.8, 1.2)A) for clip range ε = 0.2. Clipping flattens extra reward for moving too far in a favourable direction, without blocking punishment for moving the wrong way.',
      'pt-br': 'Objetivo substituto J = min(ρA, clip(ρ, 0,8, 1,2)A) com faixa de clip ε = 0,2. O clipping achata o crédito extra por ir longe demais na direção favorável, sem bloquear a punição por ir na direção errada.',
    },
    steps: [
      {
        label: { en: 'Positive advantage (A = +2.0)', 'pt-br': 'Vantagem positiva (A = +2,0)' },
        caption: {
          en: 'Past ρ = 1.2 the surrogate flattens at 2.4. At ρ = 1.5 the sample stops rewarding further increases — though the ratio itself is still 1.5, not clamped.',
          'pt-br': 'Acima de ρ = 1,2 o objetivo achata em 2,4. Em ρ = 1,5 a amostra para de premiar novos aumentos — embora a razão em si continue em 1,5, sem trava rígida.',
        },
        body: {
          kind: 'plot',
          ...ppoClipAxes,
          series: [
            {
              label: { en: 'Unclipped ρ · A', 'pt-br': 'Sem clip ρ · A' },
              pigment: 'muted',
              points: [[0.5, 1.0], [1.2, 2.4], [1.5, 3.0], [1.7, 3.4]],
            },
            {
              label: { en: 'Clipped surrogate J (A = +2.0)', 'pt-br': 'Objetivo com clip J (A = +2,0)' },
              pigment: 'accent',
              points: [[0.5, 1.0], [0.8, 1.6], [1.0, 2.0], [1.2, 2.4], [1.5, 2.4], [1.7, 2.4]],
              marks: [
                { at: [1.5, 2.4], label: { en: 'ρ = 1.5: flat at 2.4', 'pt-br': 'ρ = 1,5: achatado em 2,4' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Negative advantage (A = −2.0)', 'pt-br': 'Vantagem negativa (A = −2,0)' },
        caption: {
          en: 'At ρ = 1.5, min(−3.0, −2.4) is −3.0: the clip flattens only below ρ = 0.8 (already pushed down), while a bad action that became more likely keeps getting pushed down at full slope.',
          'pt-br': 'Em ρ = 1,5, min(−3,0; −2,4) é −3,0: o clip só achata abaixo de ρ = 0,8 (já empurrado para baixo), enquanto uma ação ruim que ficou mais provável segue sendo punida com inclinação total.',
        },
        body: {
          kind: 'plot',
          ...ppoClipAxes,
          series: [
            {
              label: { en: 'Unclipped ρ · A', 'pt-br': 'Sem clip ρ · A' },
              pigment: 'muted',
              points: [[0.5, -1.0], [0.8, -1.6], [1.5, -3.0], [1.7, -3.4]],
            },
            {
              label: { en: 'Clipped surrogate J (A = −2.0)', 'pt-br': 'Objetivo com clip J (A = −2,0)' },
              pigment: 'danger',
              points: [[0.5, -1.6], [0.8, -1.6], [1.0, -2.0], [1.2, -2.4], [1.5, -3.0], [1.7, -3.4]],
              marks: [
                { at: [1.5, -3.0], label: { en: 'ρ = 1.5: still −3.0', 'pt-br': 'ρ = 1,5: ainda −3,0' } },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 6.6 walks one preference pair through DPO's four log-probabilities and
   * then shows why a falling chosen log-probability can still widen the margin.
   */
  't6-dpo-pair-margin': {
    lesson: '6.6-dpo-skipping-the-reward-model',
    title: { en: 'How DPO turns a pair into a margin', 'pt-br': 'Como a DPO transforma um par em margem' },
    caption: {
      en: 'DPO scores both responses under the trainable policy and a frozen reference, then pushes the chosen response’s relative gain ahead of the rejected one’s.',
      'pt-br': 'A DPO pontua as duas respostas sob a policy treinável e uma referência congelada, e empurra o ganho relativo da escolhida à frente do da rejeitada.',
    },
    steps: [
      {
        label: { en: 'Worked pair (β = 0.1)', 'pt-br': 'Par resolvido (β = 0,1)' },
        caption: {
          en: 'Neither response’s raw log-probability decides the loss on its own; only how far each shifted relative to the frozen reference enters the margin.',
          'pt-br': 'Nenhuma log-probabilidade bruta decide a loss sozinha; só o quanto cada resposta se deslocou em relação à referência congelada entra na margem.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chosen y⁺', 'pt-br': 'Escolhida y⁺' }, detail: { en: 'policy −42.0 vs ref −45.0 → gain +3.0', 'pt-br': 'policy −42,0 vs ref −45,0 → ganho +3,0' }, pigment: 'success' },
            { label: { en: 'Rejected y⁻', 'pt-br': 'Rejeitada y⁻' }, detail: { en: 'policy −50.0 vs ref −48.0 → loss −2.0', 'pt-br': 'policy −50,0 vs ref −48,0 → perda −2,0' }, pigment: 'danger' },
            { label: { en: 'Scaled margin m', 'pt-br': 'Margem escalada m' }, detail: { en: '0.1 × (3.0 − (−2.0)) = 0.5', 'pt-br': '0,1 × (3,0 − (−2,0)) = 0,5' }, pigment: 'accent' },
            { label: { en: 'DPO loss', 'pt-br': 'Loss da DPO' }, detail: { en: '−log σ(0.5) ≈ 0.47', 'pt-br': '−log σ(0,5) ≈ 0,47' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Why chosen can still fall', 'pt-br': 'Por que a escolhida pode cair' },
        caption: {
          en: 'Watching chosen log-probability alone looks alarming, yet the gap between chosen and rejected doubled from 8 to 16. That is healthy unless chosen collapses together with response length.',
          'pt-br': 'Olhar só a log-probabilidade da escolhida parece alarmante, mas a distância entre escolhida e rejeitada dobrou de 8 para 16. Isso é saudável, salvo quando a escolhida desaba junto com o comprimento.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chosen y⁺ drifts', 'pt-br': 'Escolhida y⁺ desliza' }, detail: { en: '−42 → −44 under the policy', 'pt-br': '−42 → −44 sob a policy' }, pigment: 'caution' },
            { label: { en: 'Rejected y⁻ drops', 'pt-br': 'Rejeitada y⁻ desaba' }, detail: { en: '−50 → −60 under the policy', 'pt-br': '−50 → −60 sob a policy' }, pigment: 'danger' },
            { label: { en: 'Gap widens', 'pt-br': 'Distância cresce' }, detail: { en: '8 → 16 (chosen wins by twice as much)', 'pt-br': '8 → 16 (escolhida vence pelo dobro)' }, pigment: 'success' },
            { label: { en: 'What to check', 'pt-br': 'O que monitorar' }, detail: { en: 'margin, pairwise accuracy, length, KL', 'pt-br': 'margem, acurácia pareada, comprimento, KL' }, pigment: 'accent' },
          ],
        },
      },
    ],
  },

  /**
   * 6.7 organizes DPO, ORPO, KTO, and SimPO along four axes so the reader
   * sees which single design choice shifts between methods.
   */
  't6-alignment-zoo-axes': {
    lesson: '6.7-orpo-kto-simpo-and-the-alignment-zoo',
    title: { en: 'Four axes that sort the alignment zoo', 'pt-br': 'Quatro eixos que organizam o zoológico do alinhamento' },
    caption: {
      en: 'Step across DPO, ORPO, KTO, and SimPO to see which axis each method actually changes: feedback unit, response score, policy anchor, and optimization target.',
      'pt-br': 'Avance por DPO, ORPO, KTO e SimPO para ver qual eixo cada método de fato muda: unidade de feedback, escore da resposta, âncora da policy e alvo de otimização.',
    },
    steps: [
      {
        label: { en: 'DPO', 'pt-br': 'DPO' },
        caption: {
          en: 'Baseline pairwise method: sums token log-probabilities against a frozen reference checkpoint and widens the relative margin.',
          'pt-br': 'Linha de base pareada: soma log-probabilidades de token contra um checkpoint de referência congelado e amplia a margem relativa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Feedback unit', 'pt-br': 'Unidade de feedback' }, detail: { en: 'chosen / rejected pair', 'pt-br': 'par escolhida / rejeitada' }, pigment: 'accent' },
            { label: { en: 'Response score', 'pt-br': 'Escore da resposta' }, detail: { en: 'summed log-prob ratio', 'pt-br': 'soma das log-razões' }, pigment: 'accent' },
            { label: { en: 'Policy anchor', 'pt-br': 'Âncora da policy' }, detail: { en: 'frozen reference model', 'pt-br': 'modelo de referência congelado' }, pigment: 'caution' },
            { label: { en: 'Target', 'pt-br': 'Alvo' }, detail: { en: 'widen relative margin', 'pt-br': 'ampliar margem relativa' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'ORPO', 'pt-br': 'ORPO' },
        caption: {
          en: 'Collapses SFT and preference alignment into one reference-free stage: a supervised floor on the chosen response plus an odds-ratio penalty on the pair.',
          'pt-br': 'Junta SFT e alinhamento por preferência num estágio sem referência: um piso supervisionado na resposta escolhida mais uma penalidade de razão de chances no par.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Feedback unit', 'pt-br': 'Unidade de feedback' }, detail: { en: 'chosen / rejected pair', 'pt-br': 'par escolhida / rejeitada' }, pigment: 'muted' },
            { label: { en: 'Response score', 'pt-br': 'Escore da resposta' }, detail: { en: 'length-normalized odds', 'pt-br': 'chances normalizadas por comprimento' }, pigment: 'accent' },
            { label: { en: 'Policy anchor', 'pt-br': 'Âncora da policy' }, detail: { en: 'SFT term on chosen (no ref)', 'pt-br': 'termo SFT na escolhida (sem ref)' }, pigment: 'caution' },
            { label: { en: 'Target', 'pt-br': 'Alvo' }, detail: { en: 'likelihood floor + odds penalty', 'pt-br': 'piso de verossimilhança + penalidade' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'KTO', 'pt-br': 'KTO' },
        caption: {
          en: 'Changes the data contract to unpaired thumbs-up / thumbs-down verdicts and weights losses and gains asymmetrically around a prospect-theory reference point.',
          'pt-br': 'Muda o contrato de dados para vereditos isolados de polegar para cima ou para baixo e pondera perdas e ganhos de forma assimétrica em torno de um ponto de referência.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Feedback unit', 'pt-br': 'Unidade de feedback' }, detail: { en: 'single desirable / undesirable label', 'pt-br': 'rótulo isolado desejável / indesejável' }, pigment: 'accent' },
            { label: { en: 'Response score', 'pt-br': 'Escore da resposta' }, detail: { en: 'log-prob ratio vs reference', 'pt-br': 'log-razão contra a referência' }, pigment: 'muted' },
            { label: { en: 'Policy anchor', 'pt-br': 'Âncora da policy' }, detail: { en: 'reference + prospect baseline', 'pt-br': 'referência + ponto de referência' }, pigment: 'caution' },
            { label: { en: 'Target', 'pt-br': 'Alvo' }, detail: { en: 'asymmetric gain / loss value', 'pt-br': 'valor assimétrico de ganho / perda' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'SimPO', 'pt-br': 'SimPO' },
        caption: {
          en: 'Drops the reference model completely and divides log-probability by token count; this length normalization can reverse long-vs-short rankings relative to summed scoring.',
          'pt-br': 'Descarta o modelo de referência por completo e divide a log-probabilidade pelo número de tokens; essa normalização por comprimento pode inverter rankings entre respostas longas e curtas em relação à soma.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Feedback unit', 'pt-br': 'Unidade de feedback' }, detail: { en: 'chosen / rejected pair', 'pt-br': 'par escolhida / rejeitada' }, pigment: 'muted' },
            { label: { en: 'Response score', 'pt-br': 'Escore da resposta' }, detail: { en: 'average log-prob per token', 'pt-br': 'log-probabilidade média por token' }, pigment: 'accent' },
            { label: { en: 'Policy anchor', 'pt-br': 'Âncora da policy' }, detail: { en: 'none (reference-free)', 'pt-br': 'nenhuma (sem referência)' }, pigment: 'danger' },
            { label: { en: 'Target', 'pt-br': 'Alvo' }, detail: { en: 'fixed target margin γ', 'pt-br': 'margem-alvo fixa γ' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 6.8 illustrates GRPO group-relative advantages on an 8-attempt coding
   * group across three regimes: mixed (2/8 pass), all-fail (0/8), and all-pass (8/8).
   */
  't6-grpo-group-signal': {
    lesson: '6.8-grpo-and-rl-on-verifiable-rewards',
    title: { en: 'Contrast inside a GRPO group is the learning signal', 'pt-br': 'O contraste dentro do grupo GRPO é o sinal de aprendizado' },
    caption: {
      en: 'GRPO samples G = 8 attempts for one prompt, scores each with an executable checker, and standardizes rewards within the group instead of training a separate value network.',
      'pt-br': 'O GRPO amostra G = 8 tentativas para um prompt, pontua cada uma com um verificador executável e padroniza as recompensas dentro do grupo em vez de treinar uma rede de valor separada.',
    },
    steps: [
      {
        label: { en: '2 of 8 pass (signal)', 'pt-br': '2 de 8 passam (há sinal)' },
        caption: {
          en: 'Mixed outcomes give non-zero spread (std ≈ 0.433): the two passing patches are pushed up hard (+1.73) and the six failures are pushed down gently (−0.58).',
          'pt-br': 'Resultados mistos geram dispersão não nula (desvio padrão ≈ 0,433): os dois patches que passam sobem com força (+1,73) e as seis falhas descem suavemente (−0,58).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Sample group', 'pt-br': 'Amostrar grupo' }, detail: { en: '8 candidate patches for one prompt', 'pt-br': '8 patches candidatos para um prompt' }, pigment: 'accent' },
            { label: { en: 'Sandbox tests', 'pt-br': 'Testes no sandbox' }, detail: { en: '2 pass (R = 1), 6 fail (R = 0)', 'pt-br': '2 passam (R = 1), 6 falham (R = 0)' }, pigment: 'success' },
            { label: { en: 'Group baseline', 'pt-br': 'Linha de base do grupo' }, detail: { en: 'mean 0.25, std ≈ 0.433', 'pt-br': 'média 0,25, desvio padrão ≈ 0,433' }, pigment: 'accent' },
            { label: { en: 'Advantages Aᵢ', 'pt-br': 'Vantagens Aᵢ' }, detail: { en: '+1.73 for winners, −0.58 for failures', 'pt-br': '+1,73 para vencedores, −0,58 para falhas' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '0 of 8 pass (all fail)', 'pt-br': '0 de 8 passam (todos falham)' },
        caption: {
          en: 'When a problem is too hard, every reward is 0 and every advantage is 0. Eight generations spend compute while teaching nothing about the task (only KL pull remains if β > 0).',
          'pt-br': 'Quando o problema é difícil demais, toda recompensa é 0 e toda vantagem é 0. Oito gerações gastam computação sem ensinar nada sobre a tarefa (só resta o puxão da KL se β > 0).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Sample group', 'pt-br': 'Amostrar grupo' }, detail: { en: '8 candidate patches for one prompt', 'pt-br': '8 patches candidatos para um prompt' }, pigment: 'muted' },
            { label: { en: 'Sandbox tests', 'pt-br': 'Testes no sandbox' }, detail: { en: '0 pass, 8 fail (all R = 0)', 'pt-br': '0 passam, 8 falham (todos R = 0)' }, pigment: 'danger' },
            { label: { en: 'Group baseline', 'pt-br': 'Linha de base do grupo' }, detail: { en: 'mean 0, std 0 (no spread)', 'pt-br': 'média 0, desvio padrão 0 (sem dispersão)' }, pigment: 'danger' },
            { label: { en: 'Advantages Aᵢ', 'pt-br': 'Vantagens Aᵢ' }, detail: { en: 'all 0 — zero reward gradient', 'pt-br': 'todos 0 — nenhum gradiente de recompensa' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: '8 of 8 pass (all pass)', 'pt-br': '8 de 8 passam (todos passam)' },
        caption: {
          en: 'A task so easy that every sample succeeds collapses the exact same way: zero spread means zero contrast and zero reward gradient.',
          'pt-br': 'Uma tarefa tão fácil que todas as amostras acertam colapsa do mesmo jeito: dispersão zero significa contraste zero e nenhum gradiente de recompensa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Sample group', 'pt-br': 'Amostrar grupo' }, detail: { en: '8 candidate patches for one prompt', 'pt-br': '8 patches candidatos para um prompt' }, pigment: 'muted' },
            { label: { en: 'Sandbox tests', 'pt-br': 'Testes no sandbox' }, detail: { en: '8 pass, 0 fail (all R = 1)', 'pt-br': '8 passam, 0 falham (todos R = 1)' }, pigment: 'caution' },
            { label: { en: 'Group baseline', 'pt-br': 'Linha de base do grupo' }, detail: { en: 'mean 1, std 0 (no spread)', 'pt-br': 'média 1, desvio padrão 0 (sem dispersão)' }, pigment: 'caution' },
            { label: { en: 'Advantages Aᵢ', 'pt-br': 'Vantagens Aᵢ' }, detail: { en: 'all 0 — zero reward gradient', 'pt-br': 'todos 0 — nenhum gradiente de recompensa' }, pigment: 'muted' },
          ],
        },
      },
    ],
  },

  /**
   * 6.9 compares three operating points from the cited independent Qwen3.8-27B
   * deployment study (50 hard questions, 4,096-token output ceiling, plus
   * easy-prompt median latency). Replaces the three-bullet result list.
   */
  't6-thinking-operating-points': {
    lesson: '6.9-reasoning-models-test-time-compute-and-long-cot',
    title: { en: 'Three operating points under a 4,096-token budget', 'pt-br': 'Três pontos de operação sob um teto de 4.096 tokens' },
    caption: {
      en: 'Results from the cited independent Qwen3.8-27B deployment study on 50 hard questions capped at 4,096 output tokens, alongside median (p50) latency on easy prompts.',
      'pt-br': 'Resultados do estudo independente de deployment do Qwen3.8-27B citado nesta aula em 50 questões difíceis com teto de 4.096 tokens de saída, ao lado da latência mediana (p50) em prompts fáceis.',
    },
    steps: [
      {
        label: { en: 'Thinking off', 'pt-br': 'Thinking desligado' },
        caption: {
          en: 'Fastest and cheapest on easy work (~0.93 s median), but scores 68% on the 50 hard questions with one answer cut off at the ceiling.',
          'pt-br': 'Mais rápido e barato em trabalho fácil (mediana ~0,93 s), mas marca 68% nas 50 questões difíceis com uma resposta cortada no teto.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Request flag', 'pt-br': 'Flag da requisição' }, detail: { en: 'enable_thinking=false', 'pt-br': 'enable_thinking=false' }, pigment: 'muted' },
            { label: { en: '50 hard questions', 'pt-br': '50 questões difíceis' }, detail: { en: '68% accuracy', 'pt-br': '68% de acurácia' }, pigment: 'caution' },
            { label: { en: 'Truncations', 'pt-br': 'Truncamentos' }, detail: { en: '1 hit the 4,096-token cap', 'pt-br': '1 atingiu o teto de 4.096 tokens' }, pigment: 'muted' },
            { label: { en: 'Easy-prompt p50', 'pt-br': 'p50 em prompts fáceis' }, detail: { en: '~0.93 s median latency', 'pt-br': 'latência mediana ~0,93 s' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Effort: low', 'pt-br': 'Esforço: low' },
        caption: {
          en: 'Finished every single one of the 50 hard questions inside the 4,096-token ceiling and scored 94%, at the cost of ~9× slower median latency on easy prompts.',
          'pt-br': 'Concluiu todas as 50 questões difíceis dentro do teto de 4.096 tokens e marcou 94%, ao custo de latência mediana ~9× maior em prompts fáceis.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Request flag', 'pt-br': 'Flag da requisição' }, detail: { en: 'reasoning_effort=low', 'pt-br': 'reasoning_effort=low' }, pigment: 'accent' },
            { label: { en: '50 hard questions', 'pt-br': '50 questões difíceis' }, detail: { en: '94% accuracy', 'pt-br': '94% de acurácia' }, pigment: 'success' },
            { label: { en: 'Truncations', 'pt-br': 'Truncamentos' }, detail: { en: '0 hit the 4,096-token cap', 'pt-br': '0 atingiram o teto de 4.096 tokens' }, pigment: 'success' },
            { label: { en: 'Easy-prompt p50', 'pt-br': 'p50 em prompts fáceis' }, detail: { en: '8.35–8.51 s cluster', 'pt-br': 'faixa de 8,35–8,51 s' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Effort: xhigh', 'pt-br': 'Esforço: xhigh' },
        caption: {
          en: 'Scored 44/45 on answers that finished, yet 5 answers hit the 4,096-token budget — pulling overall score to 88%. McNemar p = 0.25 vs low means this 50-item sample lacks statistical evidence of a difference (it does not prove equal underlying capability), while the 5 truncations point to a budget bottleneck.',
          'pt-br': 'Marcou 44/45 nas respostas que terminaram, mas 5 atingiram o orçamento de 4.096 tokens — puxando o placar geral para 88%. McNemar p = 0,25 vs low significa que essa amostra de 50 itens não traz evidência estatística de diferença (não prova capacidade subjacente igual), enquanto os 5 truncamentos apontam gargalo de orçamento.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Request flag', 'pt-br': 'Flag da requisição' }, detail: { en: 'xhigh (or unset default)', 'pt-br': 'xhigh (ou padrão ausente)' }, pigment: 'accent' },
            { label: { en: '50 hard questions', 'pt-br': '50 questões difíceis' }, detail: { en: '88% overall (44/45 finished)', 'pt-br': '88% geral (44/45 concluídas)' }, pigment: 'accent' },
            { label: { en: 'Truncations', 'pt-br': 'Truncamentos' }, detail: { en: '5 ran out of 4,096 tokens', 'pt-br': '5 ficaram sem orçamento de 4.096 tokens' }, pigment: 'danger' },
            { label: { en: 'Easy-prompt p50', 'pt-br': 'p50 em prompts fáceis' }, detail: { en: '8.35–8.51 s cluster', 'pt-br': 'faixa de 8,35–8,51 s' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 6.10 shows both roles of a written constitution: supervised critique-and-
   * revision (replacing the 4-item numbered roommate-laptop list) and RLAIF
   * preference labelling under human governance.
   */
  't6-constitutional-two-phases': {
    lesson: '6.10-constitutional-ai-and-rlaif',
    title: { en: 'Two ways a constitution enters training', 'pt-br': 'Duas formas pelas quais uma constituição entra no treino' },
    caption: {
      en: 'Explicit written clauses drive both supervised self-revision and AI-generated preference pairs. Humans still author, prioritize, and audit the rules.',
      'pt-br': 'Cláusulas escritas explícitas guiam tanto a autorrevisão supervisionada quanto os pares de preferência gerados por IA. Humanos continuam escrevendo, priorizando e auditando as regras.',
    },
    steps: [
      {
        label: { en: 'Phase 1: Critique & revise (SFT)', 'pt-br': 'Fase 1: Crítica e revisão (SFT)' },
        caption: {
          en: 'On the roommate-laptop prompt, the clause names both the forbidden action (breaking into another person’s account) and the permitted help (securing the user’s own device), turning the revision into SFT data.',
          'pt-br': 'No prompt do notebook do colega, a cláusula nomeia tanto a ação proibida (invadir a conta de outra pessoa) quanto a ajuda permitida (proteger o próprio aparelho), transformando a revisão em dado de SFT.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1. Initial draft', 'pt-br': '1. Rascunho inicial' }, detail: { en: 'unaligned policy lists account-takeover tricks', 'pt-br': 'policy não alinhada lista truques de invasão' }, pigment: 'danger' },
            { label: { en: '2. Named clause', 'pt-br': '2. Cláusula nomeada' }, detail: { en: 'forbid unauthorized access; offer lawful defense', 'pt-br': 'proibir acesso não autorizado; oferecer defesa lícita' }, pigment: 'accent' },
            { label: { en: '3. Model critique', 'pt-br': '3. Crítica do modelo' }, detail: { en: 'flags third-party intrusion and missed defense', 'pt-br': 'aponta invasão de terceiro e defesa omitida' }, pigment: 'caution' },
            { label: { en: '4. Revision → SFT', 'pt-br': '4. Revisão → SFT' }, detail: { en: 'lock laptop, rotate passwords, check logs', 'pt-br': 'proteger notebook, trocar senhas, checar registros' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Phase 2: AI preferences (RLAIF / offline DPO)', 'pt-br': 'Fase 2: Preferências de IA (RLAIF / DPO offline)' },
        caption: {
          en: 'A model judge ranks candidate pairs under the same clauses. RL-based RLAIF trains a reward model and runs an explicit RL policy update (e.g. PPO), whereas offline preference optimization (e.g. DPO) updates the policy directly from those pairs. Human audits remain essential because one judge repeats its blind spots.',
          'pt-br': 'Um modelo jurado ordena pares de candidatos sob as mesmas cláusulas. O RLAIF baseado em RL treina um reward model e roda uma atualização explícita de policy por RL (ex.: PPO), enquanto a otimização offline de preferência (ex.: DPO) atualiza a policy direto desses pares. Auditorias humanas seguem essenciais porque um único jurado repete seus pontos cegos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Candidate pair', 'pt-br': 'Par de candidatos' }, detail: { en: 'two responses sampled for one prompt', 'pt-br': 'duas respostas amostradas para um prompt' }, pigment: 'muted' },
            { label: { en: 'Judge + clause', 'pt-br': 'Jurado + cláusula' }, detail: { en: 'model ranks pair and logs clause invoked', 'pt-br': 'modelo ordena o par e registra a cláusula' }, pigment: 'accent' },
            { label: { en: 'RLAIF (RM + RL) or DPO', 'pt-br': 'RLAIF (RM + RL) ou DPO' }, detail: { en: 'RM + RL policy update, or offline DPO directly', 'pt-br': 'RM + atualização por RL, ou DPO offline direto' }, pigment: 'accent' },
            { label: { en: 'Human audit', 'pt-br': 'Auditoria humana' }, detail: { en: 'catches shared blind spots and over-refusal', 'pt-br': 'detecta pontos cegos compartilhados e recusa excessiva' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 6.11 contrasts logit distillation (enabled by open weights like Qwen3.8-27B
   * or approximated via APIs exposing top-k logprobs) with sequence distillation
   * (the route behind text-only black-box APIs, requiring external verification).
   */
  't6-distillation-two-routes': {
    lesson: '6.11-distillation-making-small-models-punch-up',
    title: { en: 'Two ways a student learns from a teacher', 'pt-br': 'Duas formas de um student aprender com um teacher' },
    caption: {
      en: 'Both routes train a genuinely smaller parameter count — unlike quantization, which keeps all 27B weights in fewer bits. Open weights expose full logits (and APIs returning top-k logprobs allow approximate logit distillation); text-only black-box APIs restrict you to sequence-level distillation.',
      'pt-br': 'As duas rotas treinam uma contagem de parâmetros genuinamente menor — ao contrário da quantização, que mantém todos os 27B de pesos em menos bits. Pesos abertos expõem logits completos (e APIs que retornam top-k logprobs permitem distillation aproximada de logits); APIs caixa-preta só de texto restringem você à distillation em nível de sequência.',
    },
    steps: [
      {
        label: { en: 'Logit distillation (open or top-k logprobs)', 'pt-br': 'Distillation de logits (aberto ou top-k logprobs)' },
        caption: {
          en: `Qwen3.8-27B ships under Apache 2.0, exposing logits over all ${VOCAB.en} vocabulary rows; APIs returning top-k logprobs support an approximate version. Soft probabilities reveal plausible runners-up ("kitten" 0.25) that a one-hot label ("cat" 1.0) hides; implementations usually cache only the top entries per token.`,
          'pt-br': `O Qwen3.8-27B vem sob Apache 2.0, expondo logits sobre todas as ${VOCAB['pt-br']} linhas do vocabulário; APIs que retornam top-k logprobs suportam uma versão aproximada. Probabilidades suaves revelam boas alternativas ("gatinho" 0,25) que um rótulo one-hot ("gato" 1,0) esconde; implementações costumam guardar só as entradas do topo por token.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Open teacher / top-k API', 'pt-br': 'Teacher aberto / API top-k' }, detail: { en: `full ${VOCAB.en}-row logits or top-k logprobs`, 'pt-br': `logits de ${VOCAB['pt-br']} linhas ou top-k logprobs` }, pigment: 'accent' },
            { label: { en: 'Soft targets (temp T)', 'pt-br': 'Alvos suaves (temp T)' }, detail: { en: 'cat 0.70, kitten 0.25, car 0.05', 'pt-br': 'gato 0,70, gatinho 0,25, carro 0,05' }, pigment: 'accent' },
            { label: { en: 'KL + hard loss', 'pt-br': 'KL + loss dura' }, detail: { en: 'student matches top-k distribution', 'pt-br': 'student acompanha a distribuição top-k' }, pigment: 'caution' },
            { label: { en: 'Smaller student', 'pt-br': 'Student menor' }, detail: { en: 'fewer parameters; can then be quantized', 'pt-br': 'menos parâmetros; depois pode ser quantizado' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Sequence distillation (text-only API or open)', 'pt-br': 'Distillation de sequência (API só texto ou aberto)' },
        caption: {
          en: 'Behind a text-only black-box API (without logprobs), generate under a pinned preset, filter with an external checker rather than the same teacher, and run SFT on the surviving answers.',
          'pt-br': 'Atrás de uma API caixa-preta só de texto (sem logprobs), gere sob um preset fixado, filtre com um verificador externo em vez do próprio teacher e rode SFT nas respostas sobreviventes.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Pinned preset', 'pt-br': 'Preset fixado' }, detail: { en: 'record mode and sampling config', 'pt-br': 'registrar modo e config de sampling' }, pigment: 'muted' },
            { label: { en: 'External verifier', 'pt-br': 'Verificador externo' }, detail: { en: 'tests, exact match, or schema check', 'pt-br': 'testes, checagem exata ou de schema' }, pigment: 'accent' },
            { label: { en: 'Verified survivors', 'pt-br': 'Sobreviventes verificados' }, detail: { en: 'discard failures; avoid circular self-filter', 'pt-br': 'descartar falhas; evitar autofiltro circular' }, pigment: 'caution' },
            { label: { en: 'Student SFT', 'pt-br': 'SFT do student' }, detail: { en: 'direct answers often beat copied traces', 'pt-br': 'respostas diretas costumam vencer traços copiados' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
