/**
 * Figures for track 10 — Video & World Models.
 *
 * None of these numbers describe the course's running model. Track 10's
 * reference systems are Qwen3-VL (arXiv 2511.21631 plus the released
 * Qwen3-VL-8B-Instruct configs) and Meta's JEPA papers, and each constant below
 * names the table or file it was read from. `model-facts.ts` stays the home of
 * Qwen3.8-27B numbers only.
 */
import { videoTokens } from '~/lib/lab-math'
import type { Figure, FigurePigment, FigureStep, Localised } from './types'

/**
 * Qwen3-VL-8B-Instruct `vision_config` and `video_preprocessor_config.json`
 * (revision 0c351dd): patch_size 16, temporal_patch_size 2, merge_size 2. The
 * 2 fps rate is both the processor default and the rate the report used for
 * most video benchmarks. 512 × 384 is lesson 10.1's worked frame size.
 */
const QWEN3_VL = { patch: 16, merge: 2, temporal: 2, width: 512, height: 384, context: 262144 } as const

/** Visual tokens for a clip of `minutes` at `fps`, from the lab's own arithmetic. */
const tokensAt = (minutes: number, fps: number): number =>
  videoTokens({ ...QWEN3_VL, seconds: minutes * 60, fps })?.total ?? 0

const MINUTES = [0, 5, 10, 15, 20, 25, 30] as const

/**
 * V-JEPA 2.1 (arXiv 2603.14482), Table 1: the recipe ablation on a ViT-L,
 * except the last two rows (ViT-G, then the high-resolution cool-down). The
 * table's numbers, not the prose's rounded 33.9 / 0.473.
 */
const RECIPE = [
  { ade: 22.2, ssv2: 72.8 },
  { ade: 33.8, ssv2: 62.5 },
  { ade: 38.6, ssv2: 72.1 },
  { ade: 40.8, ssv2: 72.6 },
  { ade: 41.4, ssv2: 72.6 },
  { ade: 47.1, ssv2: 76.1 },
  { ade: 47.9, ssv2: 77.7 },
] as const

const recipeDetail = (index: number): { en: string; 'pt-br': string } => {
  const row = RECIPE[index]
  if (row === undefined) throw new Error(`no V-JEPA 2.1 recipe row ${index}`)
  const pt = (value: number): string => value.toFixed(1).replace('.', ',')
  return {
    en: `ADE20K ${row.ade.toFixed(1)} mIoU · SSv2 ${row.ssv2.toFixed(1)}%`,
    'pt-br': `ADE20K ${pt(row.ade)} mIoU · SSv2 ${pt(row.ssv2)}%`,
  }
}

const RECIPE_LABELS: readonly Localised[] = [
  { en: 'V-JEPA 2 recipe', 'pt-br': 'Receita do V-JEPA 2' },
  { en: '+ context loss on visible tokens', 'pt-br': '+ loss de contexto nos tokens visíveis' },
  { en: '+ deep self-supervision', 'pt-br': '+ autossupervisão profunda' },
  { en: '+ VisionMix-163M data', 'pt-br': '+ dados VisionMix-163M' },
  { en: '+ image and video tokenizers', 'pt-br': '+ tokenizers de imagem e de vídeo' },
  { en: 'scaled to ViT-G, 2B parameters', 'pt-br': 'escalado para ViT-G, 2B de parâmetros' },
  { en: '+ high-resolution cool-down', 'pt-br': '+ cool-down em alta resolução' },
]

const recipeStep = (index: number, pigment: FigurePigment): FigureStep => {
  const label = RECIPE_LABELS[index]
  if (label === undefined) throw new Error(`no V-JEPA 2.1 recipe label ${index}`)
  return { label, detail: recipeDetail(index), pigment }
}

export const TRACK_10_FIGURES = {
  /**
   * 10.1's worked clip, stage by stage. Every count is the lab's default, so a
   * reader can move from the figure to the calculator without a jump.
   */
  'video-patch-pipeline': {
    lesson: '10.1-how-video-models-see-time',
    title: { en: 'From a one-minute 512 × 384 clip to 11,520 tokens', 'pt-br': 'De um clipe de um minuto em 512 × 384 a 11.520 tokens' },
    caption: {
      en:
        'Qwen3-VL settings, 512 × 384 frames as the encoder receives them. Sampling decides how many frames exist, the two-frame temporal patch halves them, and the 2 × 2 merge divides each group by four. Every group then gets a text timestamp in front of it.',
      'pt-br':
        'Configurações do Qwen3-VL, frames de 512 × 384 como o encoder os recebe. A amostragem decide quantos frames existem, o patch temporal de dois frames os reduz à metade e o merge 2 × 2 divide cada grupo por quatro. Cada grupo então ganha um timestamp em texto na frente.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Sample at 2 fps', 'pt-br': 'Amostra a 2 fps' },
          detail: { en: '60 s → 120 frames', 'pt-br': '60 s → 120 frames' },
          pigment: 'muted',
        },
        {
          label: { en: 'Pair frames into tubelets', 'pt-br': 'Agrupa frames em tubelets' },
          detail: { en: '120 frames → 60 groups', 'pt-br': '120 frames → 60 grupos' },
          pigment: 'caution',
        },
        {
          label: { en: 'Cut 2 × 16 × 16 patches', 'pt-br': 'Corta patches 2 × 16 × 16' },
          detail: { en: '32 × 24 = 768 per group', 'pt-br': '32 × 24 = 768 por grupo' },
          pigment: 'accent',
        },
        {
          label: { en: 'Vision encoder, then 2 × 2 merge', 'pt-br': 'Vision encoder, depois merge 2 × 2' },
          detail: { en: '16 × 12 = 192 tokens per group', 'pt-br': '16 × 12 = 192 tokens por grupo' },
          pigment: 'success',
        },
        {
          label: { en: 'Timestamp text, then visual tokens', 'pt-br': 'Timestamp em texto, depois tokens visuais' },
          detail: { en: '60 × 192 = 11,520 visual tokens', 'pt-br': '60 × 192 = 11.520 tokens visuais' },
          pigment: 'danger',
        },
      ],
    },
  },

  /**
   * The same frame size held constant while the clip grows. A straight line is
   * the honest picture: token count is linear in duration, and only the
   * sampling rate or the frame size changes the slope.
   */
  'video-budget-growth': {
    lesson: '10.1-how-video-models-see-time',
    title: { en: 'Video length against a 256K window', 'pt-br': 'Duração do vídeo contra uma janela de 256K' },
    caption: {
      en:
        'Arithmetic at a fixed 512 × 384 frame: 2 fps spends 192 tokens per second of video and would fill a 262,144-token window in under 23 minutes. The released processor budget (25,165,824 pixels) would start shrinking these frames beyond 64 seconds at 2 fps, or 128 frames, so the lines show what a deployment that raises that budget pays. The report\'s needle test sampled at 1 fps with resolution adjusted to a constant visual token budget, and reached 256K tokens at 30 minutes, about 146 tokens per frame against the 96 plotted here.',
      'pt-br':
        'Aritmética com o frame fixo em 512 × 384: 2 fps gastam 192 tokens por segundo de vídeo e encheriam uma janela de 262.144 tokens em menos de 23 minutos. O orçamento publicado do processador (25.165.824 pixels) começaria a encolher esses frames depois de 64 segundos a 2 fps, ou 128 frames, então as linhas mostram o que paga um deploy que aumenta esse orçamento. O teste de agulha do relatório amostrou a 1 fps com a resolução ajustada a um orçamento constante de tokens visuais e chegou a 256K tokens em 30 minutos, cerca de 146 tokens por frame contra os 96 deste gráfico.',
    },
    body: {
      kind: 'plot',
      xAxis: { label: { en: 'Clip length', 'pt-br': 'Duração do clipe' }, scale: 'linear', min: 0, max: 30, unit: 'min' },
      yAxis: { label: { en: 'Visual tokens', 'pt-br': 'Tokens visuais' }, scale: 'linear', min: 0, max: 400000 },
      series: [
        {
          label: { en: 'Sampled at 2 fps', 'pt-br': 'Amostrado a 2 fps' },
          pigment: 'danger',
          points: MINUTES.map((minutes) => [minutes, tokensAt(minutes, 2)] as const),
          marks: [{ at: [1, tokensAt(1, 2)], label: { en: 'worked example', 'pt-br': 'exemplo resolvido' } }],
        },
        {
          label: { en: 'Sampled at 1 fps', 'pt-br': 'Amostrado a 1 fps' },
          pigment: 'caution',
          points: MINUTES.map((minutes) => [minutes, tokensAt(minutes, 1)] as const),
        },
        {
          label: { en: 'Context window, 262,144', 'pt-br': 'Janela de contexto, 262.144' },
          pigment: 'muted',
          points: [
            [0, QWEN3_VL.context],
            [30, QWEN3_VL.context],
          ],
        },
      ],
    },
  },

  /**
   * I-JEPA's training step as the paper describes it (arXiv 2301.08243,
   * section 3). Split into two steps so the reader sees the forward vector
   * loss first and then the asymmetric gradient barrier that stops collapse.
   */
  'jepa-training-step': {
    lesson: '10.2-jepa-predicting-representations',
    title: { en: 'One JEPA training step', 'pt-br': 'Um passo de treino de uma JEPA' },
    caption: {
      en:
        'The loss compares two sets of vectors, never pixels. Step from the forward prediction to the asymmetric weight update that keeps the encoder from collapsing.',
      'pt-br':
        'A loss compara dois conjuntos de vetores, nunca pixels. Avance da previsão na passagem direta para a atualização assimétrica de pesos que impede o colapso do encoder.',
    },
    steps: [
      {
        label: { en: 'Predict hidden vectors', 'pt-br': 'Prever vetores escondidos' },
        caption: {
          en:
            'The context encoder reads only visible patches. The predictor uses those vectors plus positional mask tokens to guess the hidden patch vectors, and the loss measures the distance to the target encoder’s vectors from the full image.',
          'pt-br':
            'O context encoder lê só os patches visíveis. O predictor usa esses vetores mais os mask tokens de posição para estimar os vetores dos patches escondidos, e a loss mede a distância até os vetores do target encoder sobre a imagem inteira.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Context block, targets removed', 'pt-br': 'Bloco de contexto, sem os alvos' },
              detail: { en: 'scale 0.85–1.0 of the image', 'pt-br': 'escala 0,85–1,0 da imagem' },
              pigment: 'muted',
            },
            {
              label: { en: 'Context encoder', 'pt-br': 'Context encoder (codificador de contexto)' },
              detail: { en: 'one vector per visible patch', 'pt-br': 'um vetor por patch visível' },
              pigment: 'accent',
            },
            {
              label: { en: 'Predictor + positional mask tokens', 'pt-br': 'Predictor + mask tokens de posição' },
              detail: { en: 'guesses each target patch vector', 'pt-br': 'estima o vetor de cada patch alvo' },
              pigment: 'caution',
            },
            {
              label: { en: 'Vector distance loss', 'pt-br': 'Loss de distância vetorial' },
              detail: { en: 'squared L2 in I-JEPA, L1 in V-JEPA', 'pt-br': 'L2 ao quadrado na I-JEPA, L1 na V-JEPA' },
              pigment: 'danger',
            },
            {
              label: { en: 'Target encoder', 'pt-br': 'Target encoder (codificador-alvo)' },
              detail: { en: 'sees the whole image; supplies target vectors', 'pt-br': 'vê a imagem inteira; fornece os vetores-alvo' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Asymmetric update', 'pt-br': 'Atualização assimétrica' },
        caption: {
          en:
            'Gradients reach only the context encoder and the predictor. A stop-gradient blocks gradients from the target encoder, which instead tracks the context encoder as a slowly moving exponential moving average (EMA).',
          'pt-br':
            'Os gradientes chegam só ao context encoder e ao predictor. Um stop-gradient bloqueia os gradientes para o target encoder, que em vez disso acompanha o context encoder como uma média móvel exponencial (EMA) lenta.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Context encoder (trained)', 'pt-br': 'Context encoder (treinado)' },
              detail: { en: 'updated by gradients', 'pt-br': 'atualizado por gradientes' },
              pigment: 'accent',
            },
            {
              label: { en: 'Predictor (trained)', 'pt-br': 'Predictor (treinado)' },
              detail: { en: 'updated by gradients', 'pt-br': 'atualizado por gradientes' },
              pigment: 'accent',
            },
            {
              label: { en: 'Stop-gradient barrier', 'pt-br': 'Barreira de stop-gradient' },
              detail: { en: 'blocks gradients to the target branch', 'pt-br': 'bloqueia gradientes para o ramo alvo' },
              pigment: 'danger',
            },
            {
              label: { en: 'Target encoder (EMA)', 'pt-br': 'Target encoder (por EMA)' },
              detail: { en: 'no gradient; I-JEPA momentum 0.996 → 1.0', 'pt-br': 'sem gradiente; momentum 0,996 → 1,0 na I-JEPA' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },

  /**
   * V-JEPA 2-AC's planning loop (arXiv 2506.09985, section 4). The world model
   * never draws a frame: it scores imagined representations against the
   * representation of a goal image.
   */
  'latent-planning-loop': {
    lesson: '10.3-v-jepa-2-world-models-that-plan',
    title: { en: 'Planning without drawing a single frame', 'pt-br': 'Planejar sem desenhar um único frame' },
    caption: {
      en:
        'Model-predictive control in representation space: plan, take one action, then plan again. The cross-entropy method, a sampling search, proposes action sequences, the action-conditioned predictor imagines where each one leads, and the energy is the L1 distance from that imagined state to the encoded goal image. Only the first action runs before the loop replans.',
      'pt-br':
        'Controle preditivo por modelo no espaço de representações: planeja, executa uma ação e planeja de novo. O método de entropia cruzada, uma busca por sorteio, propõe sequências de ações, o predictor condicionado a ação imagina aonde cada uma leva, e a energia é a distância L1 entre esse estado imaginado e a imagem-alvo codificada. Só a primeira ação é executada antes de o laço replanejar.',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Encode camera frame and goal image', 'pt-br': 'Codifica o frame da câmera e a imagem-alvo' },
          detail: { en: 'frozen V-JEPA 2 ViT-g', 'pt-br': 'V-JEPA 2 ViT-g congelado' },
          pigment: 'accent',
        },
        {
          label: { en: 'Sample candidate action sequences', 'pt-br': 'Sorteia sequências de ações candidatas' },
          detail: { en: 'cross-entropy method, a sampling search', 'pt-br': 'método de entropia cruzada, uma busca por sorteio' },
          pigment: 'muted',
        },
        {
          label: { en: 'Imagine the outcome of each', 'pt-br': 'Imagina o resultado de cada uma' },
          detail: { en: '~300M-parameter block-causal predictor', 'pt-br': 'predictor block-causal de ~300M parâmetros' },
          pigment: 'caution',
        },
        {
          label: { en: 'Score: L1 distance to the goal', 'pt-br': 'Pontua: distância L1 até o alvo' },
          detail: { en: 'lower energy is better', 'pt-br': 'energia menor é melhor' },
          pigment: 'danger',
        },
        {
          label: { en: 'Execute the first action, replan', 'pt-br': 'Executa a primeira ação e replaneja' },
          detail: { en: 'receding horizon: replan every step', 'pt-br': 'horizonte deslizante: replaneja a cada passo' },
          pigment: 'success',
        },
      ],
    },
  },

  /**
   * The point of 10.3's second half: the context loss alone buys dense
   * features and costs global accuracy, and deep self-supervision is what buys
   * the accuracy back. Stepped across three frames so the reader sees the dip,
   * the recovery, and the full Table 1 recipe in order.
   */
  'dense-recipe-ablation': {
    lesson: '10.3-v-jepa-2-world-models-that-plan',
    title: { en: 'How V-JEPA 2.1 bought dense features', 'pt-br': 'Como o V-JEPA 2.1 conquistou features densas' },
    caption: {
      en:
        'Linear-probe segmentation (ADE20K) and attentive-probe action recognition (SSv2), one ingredient at a time, from Table 1 of the V-JEPA 2.1 paper; higher is better for both. The first five stages use a ViT-L.',
      'pt-br':
        'Segmentação com linear probe (ADE20K) e reconhecimento de ações com attentive probe (SSv2), um ingrediente por vez, segundo a Tabela 1 do artigo do V-JEPA 2.1; nas duas, maior é melhor. As cinco primeiras etapas usam um ViT-L.',
    },
    steps: [
      {
        label: { en: '+ Context loss (the dip)', 'pt-br': '+ Loss de contexto (a queda)' },
        caption: {
          en:
            'Supervising visible tokens lifts ADE20K segmentation by 11.6 mIoU, from 22.2 to 33.8, but drops SSv2 action recognition by 10.3 points, from 72.8% to 62.5%.',
          'pt-br':
            'Supervisionar os tokens visíveis eleva a segmentação no ADE20K em 11,6 mIoU, de 22,2 para 33,8, mas derruba o reconhecimento de ações no SSv2 em 10,3 pontos, de 72,8% para 62,5%.',
        },
        body: {
          kind: 'flow',
          steps: [recipeStep(0, 'muted'), recipeStep(1, 'danger')],
        },
      },
      {
        label: { en: '+ Deep self-supervision', 'pt-br': '+ Autossupervisão profunda' },
        caption: {
          en:
            'Applying both losses at four encoder levels (three intermediate blocks and the output) restores SSv2 to 72.1% while pushing segmentation to 38.6 mIoU.',
          'pt-br':
            'Aplicar as duas losses em quatro níveis do encoder (três blocos intermediários e a saída) recupera o SSv2 para 72,1% enquanto empurra a segmentação para 38,6 mIoU.',
        },
        body: {
          kind: 'flow',
          steps: [recipeStep(0, 'muted'), recipeStep(1, 'muted'), recipeStep(2, 'accent')],
        },
      },
      {
        label: { en: 'Full 2.1 recipe', 'pt-br': 'Receita completa 2.1' },
        caption: {
          en:
            'More images (VisionMix-163M), dedicated image and video tokenizers, scaling to a 2-billion-parameter ViT-G and a high-resolution cool-down bring both metrics to their final Table 1 values.',
          'pt-br':
            'Mais imagens (VisionMix-163M), tokenizers dedicados de imagem e vídeo, escala para um ViT-G de 2 bilhões de parâmetros e um cool-down em alta resolução levam as duas métricas aos valores finais da Tabela 1.',
        },
        body: {
          kind: 'flow',
          steps: [
            recipeStep(0, 'muted'),
            recipeStep(1, 'muted'),
            recipeStep(2, 'muted'),
            recipeStep(3, 'caution'),
            recipeStep(4, 'caution'),
            recipeStep(5, 'success'),
            recipeStep(6, 'success'),
          ],
        },
      },
    ],
  },

  /**
   * VL-JEPA as instantiated in arXiv 2512.10942, section 3. Split into
   * training (no tokens, no decoder) and inference (Y-encoder dropped, decoder
   * called only when meaning shifts).
   */
  'vl-jepa-pipeline': {
    lesson: '10.4-vl-jepa-predicting-meaning',
    title: { en: 'VL-JEPA predicts an answer embedding', 'pt-br': 'A VL-JEPA prevê um embedding de resposta' },
    caption: {
      en:
        'Training compares embeddings with bidirectional InfoNCE and generates no tokens. At inference, the Y-encoder is dropped and a lightweight text decoder runs only when the predicted meaning shifts.',
      'pt-br':
        'O treino compara embeddings com InfoNCE bidirecional e não gera nenhum token. Na inferência, o Y-encoder sai de cena e um decoder de texto leve só roda quando o significado previsto muda.',
    },
    steps: [
      {
        label: { en: 'Training: match embeddings', 'pt-br': 'Treino: casar embeddings' },
        caption: {
          en:
            'No token is generated during training, and the text decoder is not used. Bidirectional InfoNCE pulls each predicted embedding toward its real answer embedding and pushes different pairs apart to prevent collapse.',
          'pt-br':
            'Nenhum token é gerado no treino, e o decoder de texto não entra nessa etapa. A InfoNCE bidirecional puxa cada embedding previsto para o embedding da resposta real e afasta pares diferentes para impedir o colapso.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'X-encoder reads the frames', 'pt-br': 'X-encoder lê os frames' },
              detail: { en: 'frozen V-JEPA 2 ViT-L, 304M', 'pt-br': 'V-JEPA 2 ViT-L congelado, 304M' },
              pigment: 'accent',
            },
            {
              label: { en: 'Predictor reads frames and query', 'pt-br': 'Predictor lê frames e pergunta' },
              detail: { en: '8 Llama-3.2-1B layers, 490M trainable', 'pt-br': '8 camadas do Llama-3.2-1B, 490M treináveis' },
              pigment: 'caution',
            },
            {
              label: { en: 'Predicted answer embedding', 'pt-br': 'Embedding de resposta previsto' },
              detail: { en: 'average-pooled, no tokens', 'pt-br': 'average pooling, sem tokens' },
              pigment: 'danger',
            },
            {
              label: { en: 'Bidirectional InfoNCE loss', 'pt-br': 'Loss InfoNCE bidirecional' },
              detail: { en: 'alignment + uniformity, no EMA', 'pt-br': 'alinhamento + uniformidade, sem EMA' },
              pigment: 'danger',
            },
            {
              label: { en: 'Y-encoder embeds the real answer', 'pt-br': 'Y-encoder gera o embedding da resposta real' },
              detail: { en: 'EmbeddingGemma-300M start', 'pt-br': 'parte do EmbeddingGemma-300M' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Inference: selective decoding', 'pt-br': 'Inferência: decodificação seletiva' },
        caption: {
          en:
            'One forward pass emits an answer embedding at each step of a video stream. Grouping segments of similar meaning lets the Y-decoder write words only at shifts — about 2.85 times fewer decodes at matched quality on EgoExo4D.',
          'pt-br':
            'Uma passagem direta emite um embedding de resposta a cada passo de um stream de vídeo. Agrupar segmentos de significado parecido permite ao Y-decoder escrever palavras só nas mudanças — cerca de 2,85 vezes menos decodificações com qualidade igual no EgoExo4D.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'X-encoder reads the video stream', 'pt-br': 'X-encoder lê o stream de vídeo' },
              detail: { en: 'frozen V-JEPA 2 ViT-L, 304M', 'pt-br': 'V-JEPA 2 ViT-L congelado, 304M' },
              pigment: 'accent',
            },
            {
              label: { en: 'Predictor emits embeddings', 'pt-br': 'Predictor emite embeddings' },
              detail: { en: 'one forward pass per step', 'pt-br': 'uma passagem direta por passo' },
              pigment: 'caution',
            },
            {
              label: { en: 'Track shifts in meaning', 'pt-br': 'Acompanha mudanças de significado' },
              detail: { en: 'smooth and cluster the stream', 'pt-br': 'suaviza e agrupa o fluxo' },
              pigment: 'accent',
            },
            {
              label: { en: 'Y-decoder writes words on shifts', 'pt-br': 'Y-decoder escreve palavras nas mudanças' },
              detail: { en: '~0.35 Hz vs 1 Hz uniform on EgoExo4D', 'pt-br': '~0,35 Hz contra 1 Hz uniforme no EgoExo4D' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
