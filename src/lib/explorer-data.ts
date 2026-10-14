import type { Locale } from './i18n'

/**
 * The component library for the Anatomy Explorer.
 *
 * Deliberately kept as a small, flat, serialisable record — the same shape the
 * reference project used, minus its mistake of importing the whole corpus into
 * a client bundle. Prose here is chrome-length only; real teaching lives in the
 * lessons this links to.
 */

export type Lens = 'math' | 'compare' | 'animation' | 'failure' | 'context'

export interface ComponentFacts {
  /** Share of a typical dense decoder's parameters. */
  params: string
  /** Dominant cost at inference. */
  cost: string
  introduced: string
  variants: string
}

export interface ExplorerComponent {
  id: string
  /** Body-system analogue: what job this part does. */
  system: Record<Locale, string>
  name: Record<Locale, string>
  tagline: Record<Locale, string>
  summary: Record<Locale, string>
  facts: ComponentFacts
  /** Lessons that teach this component, by lesson id. */
  lessons: string[]
}

export const COMPONENTS: readonly ExplorerComponent[] = [
  {
    id: 'tokenizer',
    name: { en: 'Tokenizer', 'pt-br': 'Tokenizador' },
    system: { en: 'Input encoding', 'pt-br': 'Codificação de entrada' },
    tagline: { en: 'Text into integers', 'pt-br': 'Texto em inteiros' },
    summary: {
      en: 'Cuts text into pieces called tokens (whole words, parts of words or single characters) and swaps each piece for an integer id from a fixed list. Everything later is counted in tokens: how much text fits in the context, what a call costs, how fast a server runs.',
      'pt-br':
        'Corta o texto em pedaços chamados tokens (palavras inteiras, partes de palavras ou caracteres) e troca cada pedaço por um id inteiro de uma lista fixa. Tudo o que vem depois é contado em tokens: quanto texto cabe no contexto, quanto custa uma chamada, quão rápido um servidor responde.',
    },
    facts: {
      params: 'None (a lookup table, not learned weights)',
      cost: 'Negligible at inference',
      introduced: 'BPE: Sennrich et al., 2016',
      variants: 'BPE · SentencePiece · byte-level BPE · Unigram',
    },
    lessons: ['1.2-tokenization-i', '1.3-bpe-step-by-step', '1.4-sentencepiece-byte-level-token-counts'],
  },
  {
    id: 'embedding',
    name: { en: 'Embedding table', 'pt-br': 'Tabela de embeddings' },
    system: { en: 'Meaning as geometry', 'pt-br': 'Significado como geometria' },
    tagline: { en: 'Where words become directions', 'pt-br': 'Onde palavras viram direções' },
    summary: {
      en: 'A big table with one row of numbers (a vector) for each token id; looking up a row is all it does. Training adjusts the rows so that tokens with similar meanings point in similar directions, which is why doing arithmetic on them is meaningful.',
      'pt-br':
        'Uma tabela grande com uma linha de números (um vetor) para cada id de token; o que ela faz é consultar uma linha. O treino ajusta as linhas para que tokens de significado parecido apontem em direções parecidas, e por isso fazer contas com esses vetores tem sentido.',
    },
    facts: {
      params: '~2–10% (vocab × d_model)',
      cost: 'One table-row lookup per token',
      introduced: 'Bengio et al., 2003; word2vec, 2013',
      variants: 'Tied vs untied with the LM head',
    },
    lessons: ['1.5-embeddings-meaning-as-geometry', '1.6-word2vec-glove-analogy'],
  },
  {
    id: 'positional',
    name: { en: 'Positional encoding', 'pt-br': 'Codificação posicional' },
    system: { en: 'Order', 'pt-br': 'Ordem' },
    tagline: { en: 'Attention has no sense of sequence', 'pt-br': 'A atenção não percebe sequência' },
    summary: {
      en: 'Self-attention with no mask and no position signal cannot tell order apart: shuffle the input tokens and the outputs come back shuffled the same way, otherwise unchanged. So the model needs a separate signal for where each token sits. RoPE adds one by rotating each query and key by an angle that depends on its position.',
      'pt-br':
        'A self-attention sem máscara e sem sinal de posição não distingue a ordem: embaralhe os tokens de entrada e as saídas voltam embaralhadas do mesmo jeito, sem outra mudança. Por isso o modelo precisa de um sinal separado dizendo onde cada token está. O RoPE dá esse sinal girando cada query e cada key por um ângulo que depende da posição.',
    },
    facts: {
      params: 'Zero (RoPE, ALiBi) or max positions × d_model (learned)',
      cost: 'Fused into the attention projection',
      introduced: 'Vaswani et al., 2017; RoPE: Su et al., 2021',
      variants: 'Sinusoidal · learned · RoPE · ALiBi · NoPE',
    },
    lessons: ['4.6-positional-encoding-sinusoidal-learned', '4.7-rope', '4.8-alibi-relative-bias'],
  },
  {
    id: 'norm',
    name: { en: 'Normalisation', 'pt-br': 'Normalização' },
    system: { en: 'Stability', 'pt-br': 'Estabilidade' },
    tagline: { en: 'The reason deep stacks train at all', 'pt-br': 'A razão de pilhas profundas treinarem' },
    summary: {
      en: 'Rescales the vector each layer passes on so its size stays in a steady range. Without it, the training signal (the gradient) shrinks to nothing or blows up as it passes back through dozens of layers. RMSNorm skips the step that subtracts the mean, loses nothing measurable, and is what nearly every modern model uses.',
      'pt-br':
        'Reescala o vetor que cada camada passa adiante para que seu tamanho fique numa faixa estável. Sem isso, o sinal de treino (o gradiente) some ou explode ao voltar por dezenas de camadas. A RMSNorm pula o passo que subtrai a média, sem perda mensurável, e é a que quase todo modelo moderno usa.',
    },
    facts: {
      params: '<0.1%',
      cost: 'Cheap, but a synchronisation point',
      introduced: 'LayerNorm: Ba et al., 2016; RMSNorm: Zhang & Sennrich, 2019',
      variants: 'LayerNorm · RMSNorm · pre-norm vs post-norm',
    },
    lessons: ['2.8-initialization-normalization-residuals', '4.10-residuals-pre-norm-post-norm'],
  },
  {
    id: 'attention',
    name: { en: 'Self-attention', 'pt-br': 'Self-attention' },
    system: { en: 'Information routing', 'pt-br': 'Roteamento de informação' },
    tagline: { en: 'Every position reads every other', 'pt-br': 'Cada posição lê todas as outras' },
    summary: {
      en: 'Each token asks a question (its query), and every earlier token offers a label (its key) and some content (its value). Comparing the query with each key gives a score; softmax turns the scores into weights that add up to 1, and the output is the weighted mix of values. This is the only place tokens exchange information.',
      'pt-br':
        'Cada token faz uma pergunta (sua query), e cada token anterior oferece um rótulo (sua key) e um conteúdo (seu value). Comparar a query com cada key dá uma nota; o softmax transforma as notas em pesos que somam 1, e a saída é a mistura dos values com esses pesos. É o único lugar onde os tokens trocam informação.',
    },
    facts: {
      params: '~25–33% (four d_model × d_model projections)',
      cost: 'O(n²) in sequence length at prefill',
      introduced: 'Bahdanau et al., 2014; Vaswani et al., 2017',
      variants: 'MHA · MQA · GQA · MLA · sliding-window',
    },
    lessons: ['4.2-self-attention', '4.3-scaled-dot-product-attention', '4.4-causal-masking', '4.16-hybrid-layouts'],
  },
  {
    id: 'kv-cache',
    name: { en: 'KV cache', 'pt-br': 'Cache KV' },
    system: { en: 'Memory of the past', 'pt-br': 'Memória do passado' },
    tagline: { en: 'Why the second token is cheap', 'pt-br': 'Por que o segundo token é barato' },
    summary: {
      en: 'The keys and values of every earlier token, saved so each new token reuses them instead of recomputing the whole text so far. Generating one more token then costs work proportional to the text length rather than its square. The price is memory: at long context this cache is the biggest thing in it.',
      'pt-br':
        'As keys e os values de todos os tokens anteriores, guardados para que cada novo token os reaproveite em vez de recalcular todo o texto até ali. Gerar mais um token passa a custar trabalho proporcional ao tamanho do texto, não ao seu quadrado. O preço é memória: em contexto longo, esse cache é o que mais ocupa espaço.',
    },
    facts: {
      params: 'None (runtime state)',
      cost: '2 × layers × heads × d_head × seq × bytes',
      introduced: 'Standard practice since 2019',
      variants: 'Paged · quantised · sliding-window · MLA-compressed',
    },
    lessons: ['7.2-the-kv-cache', '7.8-pagedattention-and-continuous-batching', '4.15-gated-deltanet'],
  },
  {
    id: 'residual',
    name: { en: 'Residual stream', 'pt-br': 'Fluxo residual' },
    system: { en: 'The highway', 'pt-br': 'A via expressa' },
    tagline: { en: 'Every block reads it and writes back', 'pt-br': 'Cada bloco lê e escreve de volta' },
    summary: {
      en: 'A running vector per token that every block reads from and adds its result to, like a shared variable each function updates with +=. Because blocks add instead of overwrite, information can pass through any number of layers untouched. Interpretability research treats it as the model’s working memory.',
      'pt-br':
        'Um vetor acumulado por token que cada bloco lê e ao qual soma seu resultado, como uma variável compartilhada que cada função atualiza com +=. Como os blocos somam em vez de sobrescrever, a informação pode atravessar quantas camadas forem intacta. A pesquisa em interpretabilidade o trata como a memória de trabalho do modelo.',
    },
    facts: {
      params: 'None (an addition)',
      cost: 'Free',
      introduced: 'He et al., 2015 (ResNet)',
      variants: 'Scaled residuals · DeepNorm',
    },
    lessons: ['4.10-residuals-pre-norm-post-norm', '2.8-initialization-normalization-residuals'],
  },
  {
    id: 'ffn',
    name: { en: 'Feed-forward network', 'pt-br': 'Rede feed-forward' },
    system: { en: 'Knowledge storage', 'pt-br': 'Armazenamento de conhecimento' },
    tagline: { en: 'Where the facts live', 'pt-br': 'Onde os fatos moram' },
    summary: {
      en: 'Two matrix multiplications with a non-linear function between them, run on each token separately. It holds most of the parameters, and interpretability research keeps finding stored facts here rather than in attention.',
      'pt-br':
        'Duas multiplicações de matrizes com uma função não linear entre elas, aplicadas a cada token separadamente. Concentra a maior parte dos parâmetros, e a pesquisa em interpretabilidade segue encontrando fatos guardados aqui, não na attention.',
    },
    facts: {
      params: '~60–67% (the largest single share)',
      cost: 'Dominates decode; memory-bandwidth bound',
      introduced: 'Vaswani et al., 2017; SwiGLU: Shazeer, 2020',
      variants: 'ReLU · GELU · SwiGLU · MoE-sparse',
    },
    lessons: ['4.9-feed-forward-block', '4.11-full-transformer-block'],
  },
  {
    id: 'moe-router',
    name: { en: 'MoE router', 'pt-br': 'Roteador MoE' },
    system: { en: 'Sparse capacity', 'pt-br': 'Capacidade esparsa' },
    tagline: { en: 'Trillions of parameters, billions used', 'pt-br': 'Trilhões de parâmetros, bilhões usados' },
    summary: {
      en: 'Mixture of experts (MoE) splits the feed-forward block into E smaller networks, the experts. A tiny learned gate picks k of them for each token, so total parameters grow with E while the work per token grows only with k. FareedKhan-dev’s Kimi K3 in C illustrates CPU inference with native MXFP4 experts loaded on demand from storage; a smaller resident working set still needs disk capacity and I/O time.',
      'pt-br':
        'O mixture of experts (MoE) divide o bloco feed-forward em E redes menores, os experts. Um gate pequeno e aprendido escolhe k delas para cada token, então o total de parâmetros cresce com E, mas o trabalho por token cresce só com k. O Kimi K3 in C, de FareedKhan-dev, ilustra inferência em CPU com experts MXFP4 nativos carregados do armazenamento sob demanda; um conjunto de trabalho residente menor ainda exige espaço em disco e tempo de I/O.',
    },
    facts: {
      params: 'Router <0.1%; experts can be >90% of the model',
      cost: 'Reads k/E of the expert weights per token',
      introduced: 'Shazeer et al., 2017; Switch: Fedus et al., 2021',
      variants: 'Top-k · expert-choice · shared experts',
    },
    // Mixture-of-experts has no track of its own yet; 4.9 is where the router
    // is actually taught, as the sparse variant of the feed-forward block.
    lessons: ['4.9-feed-forward-block'],
  },
  {
    id: 'quantization',
    name: { en: 'Quantisation', 'pt-br': 'Quantização' },
    system: { en: 'Compression', 'pt-br': 'Compressão' },
    tagline: { en: 'Fewer bits per weight', 'pt-br': 'Menos bits por peso' },
    summary: {
      en: 'A change applied to every layer rather than a layer of its own: store each weight in 8, 4 or fewer bits instead of 16, accepting a small rounding error. It often decides whether a model fits on your hardware at all.',
      'pt-br':
        'Uma mudança aplicada a todas as camadas, não uma camada própria: guardar cada peso em 8, 4 ou menos bits em vez de 16, aceitando um pequeno erro de arredondamento. Muitas vezes decide se o modelo cabe ou não no seu hardware.',
    },
    facts: {
      params: 'Affects all of them',
      cost: 'Turning weights back into full precision each time they are used',
      introduced: 'GPTQ: Frantar et al., 2022; AWQ: Lin et al., 2023',
      variants: 'int8 · int4 · MXFP4 · GGUF k-quants · QAT',
    },
    lessons: ['7.9-quantization-i-int8-int4-the-basics', '7.10-quantization-ii-gptq-awq-gguf-qat'],
  },
  {
    id: 'lm-head',
    name: { en: 'LM head', 'pt-br': 'Cabeça de linguagem' },
    system: { en: 'Output projection', 'pt-br': 'Projeção de saída' },
    tagline: { en: 'Back to vocabulary space', 'pt-br': 'De volta ao espaço do vocabulário' },
    summary: {
      en: 'Turns the last layer’s vector into one score (a logit) for every token in the vocabulary; a higher score means a likelier next token. It often reuses the embedding table’s weights, on the argument that reading and writing a word should use the same representation.',
      'pt-br':
        'Transforma o vetor da última camada em uma nota (um logit) para cada token do vocabulário; nota maior significa próximo token mais provável. Costuma reaproveitar os pesos da tabela de embeddings, sob o argumento de que ler e escrever uma palavra deveriam usar a mesma representação.',
    },
    facts: {
      params: '~2–10% (or zero if tied)',
      cost: 'One large matmul per generated token',
      introduced: 'Weight tying: Press & Wolf, 2017',
      variants: 'Tied · untied',
    },
    lessons: ['4.11-full-transformer-block', '7.4-sampling'],
  },
  {
    id: 'sampler',
    name: { en: 'Sampler', 'pt-br': 'Amostrador' },
    system: { en: 'Decoding', 'pt-br': 'Decodificação' },
    tagline: { en: 'The model proposes; this disposes', 'pt-br': 'O modelo propõe; ele decide' },
    summary: {
      en: 'Picks the one token that is actually written next from the model’s probabilities over the whole vocabulary. Temperature, top-k, top-p and min-p each reshape or trim those probabilities before the pick, and they change output quality far more than most people expect.',
      'pt-br':
        'Escolhe, a partir das probabilidades do modelo sobre todo o vocabulário, o token que de fato é escrito em seguida. Temperature, top-k, top-p e min-p remodelam ou cortam essas probabilidades antes da escolha, e mudam a qualidade da saída muito mais do que se costuma imaginar.',
    },
    facts: {
      params: 'None',
      cost: 'Negligible',
      introduced: 'Nucleus sampling: Holtzman et al., 2019',
      variants: 'Greedy · temperature · top-k · top-p · min-p · beam',
    },
    lessons: ['7.4-sampling', '7.5-beam-search-speculative-decoding-and-medusa'],
  },
]

export const LENS_LABELS: Record<Lens, Record<Locale, string>> = {
  math: { en: 'The maths', 'pt-br': 'A matemática' },
  compare: { en: 'Across architectures', 'pt-br': 'Entre arquiteturas' },
  animation: { en: "A token's journey", 'pt-br': 'A jornada de um token' },
  failure: { en: 'Failure modes', 'pt-br': 'Modos de falha' },
  context: { en: 'Where it sits', 'pt-br': 'Onde se encaixa' },
}

const PT_FACTS: Record<string, ComponentFacts> = {
  tokenizer: {
    params: 'Nenhum (uma tabela de consulta, não pesos aprendidos)',
    cost: 'Desprezível na inferência',
    introduced: 'BPE: Sennrich et al., 2016',
    variants: 'BPE · SentencePiece · BPE em bytes · Unigram',
  },
  embedding: {
    params: '~2–10% (vocabulário × d_model)',
    cost: 'Uma consulta de linha da tabela por token',
    introduced: 'Bengio et al., 2003; word2vec, 2013',
    variants: 'Pesos compartilhados ou não com a cabeça LM',
  },
  positional: {
    params: 'Zero (RoPE, ALiBi) ou proporcional ao contexto máximo × d_model (aprendida)',
    cost: 'Fundido à projeção de atenção',
    introduced: 'Vaswani et al., 2017; RoPE: Su et al., 2021',
    variants: 'Senoidal · aprendida · RoPE · ALiBi · NoPE',
  },
  attention: {
    params: '~25–33% (quatro projeções d_model × d_model)',
    cost: 'O(n²) no comprimento da sequência durante o prefill',
    introduced: 'Bahdanau et al., 2014; Vaswani et al., 2017',
    variants: 'MHA · MQA · GQA · MLA · janela deslizante',
  },
  ffn: {
    params: '~60–67% (a maior parcela individual)',
    cost: 'Domina o decode; limitado pela largura de banda da memória',
    introduced: 'Vaswani et al., 2017; SwiGLU: Shazeer, 2020',
    variants: 'ReLU · GELU · SwiGLU · MoE esparso',
  },
  norm: {
    params: '<0,1%',
    cost: 'Barato, mas cria um ponto de sincronização',
    introduced: 'LayerNorm: Ba et al., 2016; RMSNorm: Zhang & Sennrich, 2019',
    variants: 'LayerNorm · RMSNorm · pré-norm vs. pós-norm',
  },
  residual: {
    params: 'Nenhum (uma soma)',
    cost: 'Praticamente zero',
    introduced: 'He et al., 2015 (ResNet)',
    variants: 'Resíduos escalados · DeepNorm',
  },
  'kv-cache': {
    params: 'Nenhum (estado de execução)',
    cost: '2 × camadas × cabeças × d_head × sequência × bytes',
    introduced: 'Prática padrão desde 2019',
    variants: 'Paginado · quantizado · janela deslizante · comprimido por MLA',
  },
  'moe-router': {
    params: 'Roteador <0,1%; especialistas podem superar 90% do modelo',
    cost: 'Lê k/E dos pesos dos especialistas por token',
    introduced: 'Shazeer et al., 2017; Switch: Fedus et al., 2021',
    variants: 'Top-k · escolha pelo especialista · especialistas compartilhados',
  },
  sampler: {
    params: 'Nenhum',
    cost: 'Desprezível',
    introduced: 'Amostragem nucleus: Holtzman et al., 2019',
    variants: 'Gulosa · temperatura · top-k · top-p · min-p · beam search',
  },
  'lm-head': {
    params: '~2–10% (ou zero com pesos compartilhados)',
    cost: 'Uma multiplicação de matrizes grande por token gerado',
    introduced: 'Compartilhamento de pesos: Press & Wolf, 2017',
    variants: 'Pesos compartilhados · pesos separados',
  },
  quantization: {
    params: 'Afeta todos os parâmetros',
    cost: 'Converter os pesos de volta à precisão cheia a cada uso',
    introduced: 'GPTQ: Frantar et al., 2022; AWQ: Lin et al., 2023',
    variants: 'int8 · int4 · MXFP4 · k-quants GGUF · QAT',
  },
}

export function factText(
  component: ExplorerComponent,
  key: keyof ComponentFacts,
  locale: Locale,
): string {
  return locale === 'pt-br' ? (PT_FACTS[component.id]?.[key] ?? component.facts[key]) : component.facts[key]
}

/** Compact, data-backed copy for the five non-WebGL reading lenses. */
export function lensText(component: ExplorerComponent, lens: Lens, locale: Locale): string {
  const isPt = locale === 'pt-br'
  switch (lens) {
    case 'math':
      return isPt
        ? `Parâmetros: ${factText(component, 'params', locale)}. Custo dominante: ${factText(component, 'cost', locale)}.`
        : `Parameters: ${factText(component, 'params', locale)}. Dominant cost: ${factText(component, 'cost', locale)}.`
    case 'compare':
      return isPt
        ? `As principais alternativas são ${factText(component, 'variants', locale)}.`
        : `The main alternatives are ${factText(component, 'variants', locale)}.`
    case 'animation':
      return `${component.tagline[locale]}. ${component.summary[locale]}`
    case 'failure':
      return isPt
        ? `Se este componente for limitado ou configurado incorretamente, o modelo perde capacidade de ${component.system[locale].toLocaleLowerCase('pt-BR')}.`
        : `If this component is constrained or misconfigured, the model loses capacity for ${component.system[locale].toLowerCase()}.`
    case 'context':
      // Deliberately no lesson-id list: ids are internal slugs, not prose, and
      // the detail panel's CTA already links the lesson by title.
      return isPt
        ? `Marco histórico: ${factText(component, 'introduced', locale)}. Variantes em uso: ${factText(component, 'variants', locale)}.`
        : `Historical marker: ${factText(component, 'introduced', locale)}. Variants in use: ${factText(component, 'variants', locale)}.`
  }
}
