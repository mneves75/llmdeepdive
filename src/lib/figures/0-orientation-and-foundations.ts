/**
 * Figures for track 0 — Orientation & Foundations.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import { formatNumber } from '~/lib/i18n'
import { QWEN } from '~/lib/model-facts'
import type { Figure, FigureStep, Localised } from './types'

/** A Qwen fact formatted for each locale's prose (248,320 / 248.320). */
const both = (value: number): Localised => ({ en: formatNumber('en', value), 'pt-br': formatNumber('pt-br', value) })

const TOKENIZER_MAPPED_IDS = QWEN.tokenizerMappedIds.value
const UNMAPPED_ROWS = QWEN.vocabSize.value - TOKENIZER_MAPPED_IDS

/** 0.2: one word of "the cat sat on the ___", as one model family sees it. */
const word = (text: string, detail: Localised, pigment: FigureStep['pigment']): FigureStep => ({
  label: { en: text, 'pt-br': text },
  detail,
  pigment,
})

/** 0.3: three logits (4.0, 2.0, 1.0) on the x axis, their probabilities on y. */
const softmaxAxes = {
  xAxis: {
    label: { en: 'Logit, before temperature', 'pt-br': 'Logit, antes da temperatura' },
    scale: 'linear',
    min: 0,
    max: 5,
  },
  yAxis: {
    label: { en: 'Probability after softmax', 'pt-br': 'Probabilidade depois do softmax' },
    scale: 'linear',
    min: 0,
    max: 1,
  },
} as const

const softmaxAtOne = {
  label: { en: 'Temperature 1.0', 'pt-br': 'Temperatura 1,0' },
  pigment: 'muted',
  points: [[1, 0.042], [2, 0.114], [4, 0.844]],
} as const

/** 0.6: w after each update of gradient descent on L(w) = w², from w = 1. */
const descentAxes = {
  xAxis: {
    label: { en: 'Update number', 'pt-br': 'Número da atualização' },
    scale: 'linear',
    min: 0,
    max: 4,
  },
  yAxis: {
    label: { en: 'Parameter w', 'pt-br': 'Parâmetro w' },
    scale: 'linear',
    min: -2,
    max: 2.5,
  },
} as const

const descentSmallStep = {
  label: { en: 'Learning rate 0.1', 'pt-br': 'Taxa de aprendizado 0,1' },
  points: [[0, 1], [1, 0.8], [2, 0.64], [3, 0.512], [4, 0.4096]],
} as const

export const TRACK_0_FIGURES = {
  /**
   * 0.1 walked the request through a numbered list and then a paragraph on what
   * happens after softmax. The stages, the 248,320-score width and the split
   * into mapped and unmapped rows are carried here; the list keeps only the
   * definitions.
   */
  'next-token-pipeline': {
    lesson: '0.1-what-is-a-language-model',
    title: { en: 'From your prompt to one token', 'pt-br': 'Do seu prompt a um token' },
    caption: {
      en: 'Tokenization maps text to ids before the forward pass; the network runs from vectors to logits, softmax turns logits into probabilities, and a separate decoding rule picks one token. Probabilities in this lesson are illustrative.',
      'pt-br': 'A tokenização mapeia texto para ids antes do forward pass; a rede vai dos vetores aos logits, o softmax converte logits em probabilidades, e uma regra de decodificação separada escolhe um token. As probabilidades desta aula são ilustrativas.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Text', 'pt-br': 'Texto' }, detail: { en: 'The capital of France is', 'pt-br': 'A capital da França é' }, pigment: 'muted' },
        { label: { en: 'Tokens', 'pt-br': 'Tokens' }, detail: { en: 'pieces from a fixed vocabulary', 'pt-br': 'pedaços de um vocabulário fixo' }, pigment: 'accent' },
        { label: { en: 'Ids', 'pt-br': 'Ids' }, detail: { en: 'one whole number per token', 'pt-br': 'um número inteiro por token' }, pigment: 'accent' },
        { label: { en: 'Vectors', 'pt-br': 'Vetores' }, detail: { en: 'a list of numbers per token, passed through the network', 'pt-br': 'uma lista de números por token, que atravessa a rede' }, pigment: 'accent' },
        {
          label: { en: 'Logits', 'pt-br': 'Logits' },
          detail: {
            en: `${both(QWEN.vocabSize.value).en} raw scores: ${both(TOKENIZER_MAPPED_IDS).en} rows have a tokenizer id, ${UNMAPPED_ROWS} have none`,
            'pt-br': `${both(QWEN.vocabSize.value)['pt-br']} scores brutos: ${both(TOKENIZER_MAPPED_IDS)['pt-br']} linhas têm id no tokenizer, ${UNMAPPED_ROWS} não têm`,
          },
          pigment: 'accent',
        },
        { label: { en: 'Probabilities', 'pt-br': 'Probabilidades' }, detail: { en: 'softmax: none negative, all summing to 1', 'pt-br': 'softmax: nenhuma negativa, todas somando 1' }, pigment: 'success' },
        { label: { en: 'One token', 'pt-br': 'Um token' }, detail: { en: 'a decoding rule you control picks it, say Paris', 'pt-br': 'uma regra de decodificação que você controla escolhe, digamos Paris' }, pigment: 'caution' },
      ],
    },
  },

  /**
   * 0.2 described, in four separate sections, how much of the text each model
   * family can use. The same five words, seen by each machine in turn, replace
   * the cat/dog paragraph, the "step twenty waits for step nineteen" paragraph
   * and the sentence on every position consulting every earlier one.
   */
  'what-each-model-sees': {
    lesson: '0.2-history-ngram-to-gpt',
    title: { en: 'The same five words, four machines', 'pt-br': 'As mesmas cinco palavras, quatro máquinas' },
    caption: {
      en: 'Each machine predicts the word after "the cat sat on the". What changes from one to the next is how much of that context it can use, and how.',
      'pt-br': 'Cada máquina prevê a palavra depois de "the cat sat on the". O que muda de uma para a outra é quanto desse contexto ela consegue usar, e como.',
    },
    steps: [
      {
        label: { en: 'Counting', 'pt-br': 'Contagem' },
        caption: {
          en: 'A trigram model keeps only the last two words. Put dog in place of cat and the key is still "on the", so the two sentences look identical to it.',
          'pt-br': 'Um modelo de trigramas guarda só as duas últimas palavras. Troque cat por dog e a chave continua "on the", então as duas frases parecem idênticas para ele.',
        },
        body: {
          kind: 'flow',
          steps: [
            word('the', { en: 'discarded', 'pt-br': 'descartada' }, 'muted'),
            word('cat', { en: 'discarded', 'pt-br': 'descartada' }, 'muted'),
            word('sat', { en: 'discarded', 'pt-br': 'descartada' }, 'muted'),
            word('on', { en: 'context', 'pt-br': 'contexto' }, 'accent'),
            word('the', { en: 'context', 'pt-br': 'contexto' }, 'accent'),
            word('?', { en: 'count, then divide', 'pt-br': 'contar e dividir' }, 'caution'),
          ],
        },
      },
      {
        label: { en: 'Learned vectors', 'pt-br': 'Vetores aprendidos' },
        caption: {
          en: 'Each word in a fixed window becomes an embedding, and one learned function maps the window to a distribution. Because cat and dog can get nearby vectors, what is learned about one carries over to the other. The window is four words here only for the picture.',
          'pt-br': 'Cada palavra numa janela fixa vira um embedding, e uma única função aprendida leva a janela a uma distribuição. Como cat e dog podem receber vetores próximos, o que se aprende sobre um vale para o outro. A janela tem quatro palavras aqui só para o desenho.',
        },
        body: {
          kind: 'flow',
          steps: [
            word('the', { en: 'outside the window', 'pt-br': 'fora da janela' }, 'muted'),
            word('cat', { en: 'embedding', 'pt-br': 'embedding' }, 'accent'),
            word('sat', { en: 'embedding', 'pt-br': 'embedding' }, 'accent'),
            word('on', { en: 'embedding', 'pt-br': 'embedding' }, 'accent'),
            word('the', { en: 'embedding', 'pt-br': 'embedding' }, 'accent'),
            word('?', { en: 'learned function of the window', 'pt-br': 'função aprendida da janela' }, 'caution'),
          ],
        },
      },
      {
        label: { en: 'Recurrence', 'pt-br': 'Recorrência' },
        caption: {
          en: 'A recurrent network carries one hidden state from word to word, so no word is cut off by a window. Each step needs the state from the step before it, so the steps cannot run side by side, and the earliest words fade from the state.',
          'pt-br': 'Uma rede recorrente carrega um único hidden state de palavra em palavra, então nenhuma palavra fica de fora por causa de uma janela. Cada passo precisa do estado do passo anterior, então os passos não rodam lado a lado, e as primeiras palavras vão se apagando do estado.',
        },
        body: {
          kind: 'flow',
          steps: [
            word('the', { en: 'state 1', 'pt-br': 'estado 1' }, 'muted'),
            word('cat', { en: 'state 2, waits for 1', 'pt-br': 'estado 2, espera o 1' }, 'accent'),
            word('sat', { en: 'state 3, waits for 2', 'pt-br': 'estado 3, espera o 2' }, 'accent'),
            word('on', { en: 'state 4, waits for 3', 'pt-br': 'estado 4, espera o 3' }, 'accent'),
            word('the', { en: 'state 5, waits for 4', 'pt-br': 'estado 5, espera o 4' }, 'accent'),
            word('?', { en: 'read from state 5 alone', 'pt-br': 'lido só do estado 5' }, 'caution'),
          ],
        },
      },
      {
        label: { en: 'Attention', 'pt-br': 'Attention' },
        caption: {
          en: 'Every position consults every earlier position directly, and during training all positions are computed at once. Causal masking hides every later position from each position, so the model cannot peek at the answer.',
          'pt-br': 'Cada posição consulta diretamente cada posição anterior, e no treinamento todas as posições são computadas de uma vez. O mascaramento causal esconde de cada posição as que vêm depois dela, então o modelo não espia a resposta.',
        },
        body: {
          kind: 'flow',
          steps: [
            word('the', { en: 'consulted directly', 'pt-br': 'consultada diretamente' }, 'accent'),
            word('cat', { en: 'consulted directly', 'pt-br': 'consultada diretamente' }, 'accent'),
            word('sat', { en: 'consulted directly', 'pt-br': 'consultada diretamente' }, 'accent'),
            word('on', { en: 'consulted directly', 'pt-br': 'consultada diretamente' }, 'accent'),
            word('the', { en: 'consulted directly', 'pt-br': 'consultada diretamente' }, 'accent'),
            word('?', { en: 'weighs all five at once', 'pt-br': 'pesa as cinco de uma vez' }, 'success'),
          ],
        },
      },
    ],
  },

  /**
   * 0.3 computes softmax of (4.0, 2.0, 1.0) at temperature 1.0 and 0.7, then
   * walks into the wrong turn of dividing probabilities instead. Every point is
   * a number the lesson's own arithmetic produces; the sentence on how the
   * leader gains and the tail loses moved into the captions.
   */
  'temperature-reshapes-softmax': {
    lesson: '0.3-probability-you-need',
    title: { en: 'Same logits, three readings', 'pt-br': 'Os mesmos logits, três leituras' },
    caption: {
      en: 'The three logits from the worked example, 4.0, 2.0 and 1.0, never change. Only whether you scale before softmax or after it changes the probabilities.',
      'pt-br': 'Os três logits do exemplo resolvido, 4,0, 2,0 e 1,0, nunca mudam. Só o fato de escalar antes ou depois do softmax muda as probabilidades.',
    },
    steps: [
      {
        label: { en: 'Temperature 1.0', 'pt-br': 'Temperatura 1,0' },
        caption: {
          en: 'Plain softmax: about 0.844, 0.114 and 0.042. This is the temperature of Qwen3.8-27B’s thinking-mode preset.',
          'pt-br': 'Softmax puro: cerca de 0,844, 0,114 e 0,042. Essa é a temperatura do preset do modo de raciocínio do Qwen3.8-27B.',
        },
        body: { kind: 'plot', ...softmaxAxes, series: [{ ...softmaxAtOne, pigment: 'accent' }] },
      },
      {
        label: { en: 'Temperature 0.7', 'pt-br': 'Temperatura 0,7' },
        caption: {
          en: 'Dividing the logits by 0.7 widens their gaps before exponentiation. The leader gains about nine points, to 0.934, and the tail loses most of what it had.',
          'pt-br': 'Dividir os logits por 0,7 alarga as diferenças entre eles antes da exponenciação. O líder ganha cerca de nove pontos, chegando a 0,934, e a cauda perde quase tudo o que tinha.',
        },
        body: {
          kind: 'plot',
          ...softmaxAxes,
          series: [
            softmaxAtOne,
            {
              label: { en: 'Temperature 0.7', 'pt-br': 'Temperatura 0,7' },
              pigment: 'accent',
              points: [[1, 0.013], [2, 0.054], [4, 0.934]],
            },
          ],
        },
      },
      {
        label: { en: 'The wrong turn', 'pt-br': 'O desvio errado' },
        caption: {
          en: 'Dividing the probabilities by 0.7 and renormalizing lands exactly on the temperature 1.0 curve: the constant cancels, so nothing changes.',
          'pt-br': 'Dividir as probabilidades por 0,7 e renormalizar cai exatamente sobre a curva da temperatura 1,0: a constante se cancela, então nada muda.',
        },
        body: {
          kind: 'plot',
          ...softmaxAxes,
          series: [
            softmaxAtOne,
            {
              label: { en: 'Probabilities divided by 0.7, renormalized', 'pt-br': 'Probabilidades divididas por 0,7, renormalizadas' },
              pigment: 'danger',
              points: [[1, 0.042], [2, 0.114], [4, 0.844]],
            },
          ],
        },
      },
    ],
  },

  /**
   * 0.4 closed with a paragraph that walked one token's path through the three
   * tools: lookup, projection, dot product. The path is drawn here and the
   * paragraph keeps only the gradient sentence and the conclusion.
   */
  'vector-matrix-dot-path': {
    lesson: '0.4-vectors-matrices-dot-products',
    title: { en: 'Where the three tools meet', 'pt-br': 'Onde as três ferramentas se encontram' },
    caption: {
      en: 'A vector holds the state, a matrix turns it into a new vector, and a dot product turns two vectors into one score.',
      'pt-br': 'Um vetor guarda o estado, uma matriz o transforma num novo vetor, e um produto escalar transforma dois vetores num único score.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Token id', 'pt-br': 'Id do token' }, detail: { en: 'one whole number', 'pt-br': 'um número inteiro' }, pigment: 'muted' },
        {
          label: { en: 'Embedding lookup', 'pt-br': 'Consulta ao embedding' },
          detail: { en: `a vector of ${QWEN.hiddenSize.value} numbers`, 'pt-br': `um vetor de ${QWEN.hiddenSize.value} números` },
          pigment: 'accent',
        },
        { label: { en: 'Projection matrices', 'pt-br': 'Matrizes de projeção' }, detail: { en: 'turn the state into queries and keys', 'pt-br': 'transformam o estado em queries e keys' }, pigment: 'accent' },
        { label: { en: 'Dot products', 'pt-br': 'Produtos escalares' }, detail: { en: 'query against key gives an attention score', 'pt-br': 'query contra key dá um score de attention' }, pigment: 'success' },
      ],
    },
  },

  /**
   * 0.5 stated the feed-forward block's shape in its opening and again at the
   * end of the insight callout. The widen, bend, narrow sequence and the cost of
   * the widening matrix are drawn here, from the config values.
   */
  'feed-forward-widen-narrow': {
    lesson: '0.5-matrix-multiplication-transformation',
    title: { en: 'Widen, bend, narrow', 'pt-br': 'Alargar, dobrar, estreitar' },
    caption: {
      en: 'Schematic widen-bend-narrow path using Qwen3.8-27B’s dimensions. The shipped SwiGLU block runs two parallel widening projections (gate and up) and multiplies SiLU(gate) × up before narrowing back (lesson 4.9).',
      'pt-br': 'Caminho esquemático alargar-dobrar-estreitar com as dimensões do Qwen3.8-27B. O bloco SwiGLU entregue roda duas projeções de alargamento em paralelo (gate e up) e multiplica SiLU(gate) × up antes de estreitar de volta (aula 4.9).',
    },
    body: {
      kind: 'flow',
      steps: [
        {
          label: { en: 'Hidden state', 'pt-br': 'Hidden state (estado oculto)' },
          detail: { en: `${QWEN.hiddenSize.value} numbers`, 'pt-br': `${QWEN.hiddenSize.value} números` },
          pigment: 'muted',
        },
        {
          label: { en: 'Widening projection', 'pt-br': 'Projeção de alargamento' },
          detail: {
            en: `${QWEN.ffnIntermediate.value} × ${QWEN.hiddenSize.value}: about 89.1 million multiply-adds per widening matrix`,
            'pt-br': `${QWEN.ffnIntermediate.value} × ${QWEN.hiddenSize.value}: cerca de 89,1 milhões de multiply-adds por matriz de alargamento`,
          },
          pigment: 'accent',
        },
        { label: { en: 'Gated nonlinearity', 'pt-br': 'Não linearidade com gate' }, detail: { en: 'SiLU(gate) × up in Qwen (lessons 2.3 and 4.9)', 'pt-br': 'SiLU(gate) × up no Qwen (aulas 2.3 e 4.9)' }, pigment: 'caution' },
        {
          label: { en: 'Narrowed back', 'pt-br': 'Estreitado de volta' },
          detail: { en: `${QWEN.hiddenSize.value} numbers`, 'pt-br': `${QWEN.hiddenSize.value} números` },
          pigment: 'muted',
        },
      ],
    },
  },

  /**
   * 0.6 works gradient descent on L(w) = w² with two learning rates. The values
   * of w after each update are exactly the lesson's; the picture carries the
   * "marches steadily" and "magnitude grows" shapes the prose described.
   */
  'descent-step-size': {
    lesson: '0.6-derivatives-gradients',
    title: { en: 'Same gradient, two stride lengths', 'pt-br': 'O mesmo gradiente, dois tamanhos de passo' },
    caption: {
      en: 'Gradient descent on L(w) = w², starting at w = 1. Every gradient is correct in both runs; only the learning rate differs.',
      'pt-br': 'Gradient descent em L(w) = w², começando em w = 1. Todo gradiente está correto nas duas execuções; só a taxa de aprendizado muda.',
    },
    steps: [
      {
        label: { en: 'Learning rate 0.1', 'pt-br': 'Taxa 0,1' },
        caption: {
          en: 'Each update multiplies w by 0.8: 1, 0.8, 0.64, 0.512, 0.4096. The run closes in on the minimum at zero.',
          'pt-br': 'Cada atualização multiplica w por 0,8: 1, 0,8, 0,64, 0,512, 0,4096. A execução se aproxima do mínimo em zero.',
        },
        body: { kind: 'plot', ...descentAxes, series: [{ ...descentSmallStep, pigment: 'accent' }] },
      },
      {
        label: { en: 'Learning rate 1.1', 'pt-br': 'Taxa 1,1' },
        caption: {
          en: 'Each update overshoots the minimum and lands farther out on the other side: 1, −1.2, 1.44, −1.728, 2.0736. The size of w grows by 20 percent every step.',
          'pt-br': 'Cada atualização passa do mínimo e cai mais longe do outro lado: 1, −1,2, 1,44, −1,728, 2,0736. O tamanho de w cresce 20 por cento a cada passo.',
        },
        body: {
          kind: 'plot',
          ...descentAxes,
          series: [
            { ...descentSmallStep, pigment: 'muted' },
            {
              label: { en: 'Learning rate 1.1', 'pt-br': 'Taxa de aprendizado 1,1' },
              pigment: 'danger',
              points: [[0, 1], [1, -1.2], [2, 1.44], [3, -1.728], [4, 2.0736]],
            },
          ],
        },
      },
    ],
  },

  /**
   * 0.7 listed the training loop's rhythm in one sentence and the division of
   * labour between backward and step in another. Each call and what it does,
   * and does not do, is one stage here.
   */
  'training-step-rhythm': {
    lesson: '0.7-python-numpy-pytorch',
    title: { en: 'One training step, in order', 'pt-br': 'Um passo de treinamento, em ordem' },
    caption: {
      en: 'The SGD loop below repeats these five stages (the code combines forward pass and loss on one line). In this standard loop without a closure, backward computes gradients without changing parameters, and step updates parameters without computing gradients.',
      'pt-br': 'O loop SGD abaixo repete estas cinco etapas (o código junta forward pass e loss numa linha). Neste loop padrão sem closure, backward computa gradientes sem mudar parâmetros, e step atualiza parâmetros sem computar gradientes.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'optimizer.zero_grad()', 'pt-br': 'optimizer.zero_grad()' }, detail: { en: 'clears the gradients left from the last step', 'pt-br': 'limpa os gradientes deixados pelo passo anterior' }, pigment: 'muted' },
        { label: { en: 'Forward pass', 'pt-br': 'Forward pass (passagem direta)' }, detail: { en: 'the model turns inputs into predictions', 'pt-br': 'o modelo transforma entradas em previsões' }, pigment: 'accent' },
        { label: { en: 'Loss', 'pt-br': 'Loss' }, detail: { en: 'predictions and targets reduced to one number', 'pt-br': 'previsões e alvos reduzidos a um número' }, pigment: 'accent' },
        { label: { en: 'loss.backward()', 'pt-br': 'loss.backward()' }, detail: { en: 'fills each trainable parameter’s .grad; changes no parameter', 'pt-br': 'preenche o .grad de cada parâmetro treinável; não muda nenhum parâmetro' }, pigment: 'caution' },
        { label: { en: 'optimizer.step()', 'pt-br': 'optimizer.step()' }, detail: { en: 'updates the parameters; computes no gradient here', 'pt-br': 'atualiza os parâmetros; não computa gradiente aqui' }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
