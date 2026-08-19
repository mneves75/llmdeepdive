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
  accent: string
}

export const COMPONENTS: readonly ExplorerComponent[] = [
  {
    id: 'tokenizer',
    name: { en: 'Tokenizer', 'pt-br': 'Tokenizador' },
    system: { en: 'Input encoding', 'pt-br': 'Codificação de entrada' },
    tagline: { en: 'Text into integers', 'pt-br': 'Texto em inteiros' },
    summary: {
      en: 'Splits text into subword units and maps each to an integer. Every downstream cost — context length, price per call, throughput — is denominated in these units.',
      'pt-br':
        'Divide o texto em unidades de subpalavra e mapeia cada uma para um inteiro. Todo custo seguinte — tamanho de contexto, preço por chamada, throughput — é contado nessas unidades.',
    },
    facts: {
      params: 'None (a lookup table, not learned weights)',
      cost: 'Negligible at inference',
      introduced: 'BPE: Sennrich et al., 2016',
      variants: 'BPE · SentencePiece · byte-level BPE · Unigram',
    },
    lessons: ['1.2-tokenization-i', '1.3-bpe-step-by-step', '1.4-sentencepiece-byte-level-token-counts'],
    accent: '#007f91',
  },
  {
    id: 'embedding',
    name: { en: 'Embedding table', 'pt-br': 'Tabela de embeddings' },
    system: { en: 'Meaning as geometry', 'pt-br': 'Significado como geometria' },
    tagline: { en: 'Where words become directions', 'pt-br': 'Onde palavras viram direções' },
    summary: {
      en: 'A learned matrix of one vector per vocabulary entry. Similar meanings end up in similar directions, which is why arithmetic on these vectors does anything at all.',
      'pt-br':
        'Uma matriz aprendida com um vetor por entrada do vocabulário. Significados parecidos acabam em direções parecidas — é por isso que aritmética com esses vetores funciona.',
    },
    facts: {
      params: '~2–10% (vocab × d_model)',
      cost: 'One gather per token',
      introduced: 'Bengio et al., 2003; word2vec, 2013',
      variants: 'Tied vs untied with the LM head',
    },
    lessons: ['1.5-embeddings-meaning-as-geometry', '1.6-word2vec-glove-analogy'],
    accent: '#287855',
  },
  {
    id: 'positional',
    name: { en: 'Positional encoding', 'pt-br': 'Codificação posicional' },
    system: { en: 'Order', 'pt-br': 'Ordem' },
    tagline: { en: 'Attention has no sense of sequence', 'pt-br': 'A atenção não percebe sequência' },
    summary: {
      en: 'Self-attention is permutation-invariant: without this, "dog bites man" and "man bites dog" are the same input. RoPE encodes position as a rotation, which is why it extrapolates further than the alternatives.',
      'pt-br':
        'A auto-atenção é invariante a permutação: sem isso, "cão morde homem" e "homem morde cão" são a mesma entrada. RoPE codifica posição como rotação, e por isso extrapola melhor que as alternativas.',
    },
    facts: {
      params: 'Zero (RoPE, ALiBi) or vocab-sized (learned)',
      cost: 'Fused into the attention projection',
      introduced: 'Vaswani et al., 2017; RoPE: Su et al., 2021',
      variants: 'Sinusoidal · learned · RoPE · ALiBi · NoPE',
    },
    lessons: ['4.6-positional-encoding-sinusoidal-learned', '4.7-rope', '4.8-alibi-relative-bias'],
    accent: '#c59e00',
  },
  {
    id: 'attention',
    name: { en: 'Self-attention', 'pt-br': 'Auto-atenção' },
    system: { en: 'Information routing', 'pt-br': 'Roteamento de informação' },
    tagline: { en: 'Every position reads every other', 'pt-br': 'Cada posição lê todas as outras' },
    summary: {
      en: 'Each position emits a query, and every earlier position offers a key and a value. The softmax over query·key decides how much of each value to mix in. This is the only place tokens exchange information.',
      'pt-br':
        'Cada posição emite uma query, e cada posição anterior oferece uma key e um value. O softmax sobre query·key decide quanto de cada value entra na mistura. É o único lugar onde tokens trocam informação.',
    },
    facts: {
      params: '~25–33% (four d_model × d_model projections)',
      cost: 'O(n²) in sequence length at prefill',
      introduced: 'Bahdanau et al., 2014; Vaswani et al., 2017',
      variants: 'MHA · MQA · GQA · MLA · sliding-window',
    },
    lessons: ['4.2-self-attention', '4.3-scaled-dot-product-attention', '4.4-causal-masking', '4.16-hybrid-layouts'],
    accent: '#d74234',
  },
  {
    id: 'ffn',
    name: { en: 'Feed-forward network', 'pt-br': 'Rede feed-forward' },
    system: { en: 'Knowledge storage', 'pt-br': 'Armazenamento de conhecimento' },
    tagline: { en: 'Where the facts live', 'pt-br': 'Onde os fatos moram' },
    summary: {
      en: 'Two projections with a non-linearity between them, applied independently at every position. It holds most of the parameters, and interpretability work keeps finding retrievable facts here rather than in attention.',
      'pt-br':
        'Duas projeções com uma não-linearidade entre elas, aplicadas de forma independente em cada posição. Concentra a maior parte dos parâmetros, e trabalhos de interpretabilidade seguem encontrando fatos recuperáveis aqui, não na atenção.',
    },
    facts: {
      params: '~60–67% (the largest single share)',
      cost: 'Dominates decode; memory-bandwidth bound',
      introduced: 'Vaswani et al., 2017; SwiGLU: Shazeer, 2020',
      variants: 'ReLU · GELU · SwiGLU · MoE-sparse',
    },
    lessons: ['4.9-feed-forward-block', '4.11-full-transformer-block'],
    accent: '#c59e00',
  },
  {
    id: 'norm',
    name: { en: 'Normalisation', 'pt-br': 'Normalização' },
    system: { en: 'Stability', 'pt-br': 'Estabilidade' },
    tagline: { en: 'The reason deep stacks train at all', 'pt-br': 'A razão de pilhas profundas treinarem' },
    summary: {
      en: 'Rescales activations so gradients neither vanish nor explode through dozens of layers. RMSNorm drops the mean-centring step and loses nothing measurable, so nearly every modern model uses it.',
      'pt-br':
        'Reescala ativações para que os gradientes não desapareçam nem explodam ao longo de dezenas de camadas. RMSNorm descarta a centralização pela média sem perda mensurável, e por isso quase todo modelo moderno a usa.',
    },
    facts: {
      params: '<0.1%',
      cost: 'Cheap, but a synchronisation point',
      introduced: 'LayerNorm: Ba et al., 2016; RMSNorm: Zhang & Sennrich, 2019',
      variants: 'LayerNorm · RMSNorm · pre-norm vs post-norm',
    },
    lessons: ['2.8-initialization-normalization-residuals', '4.10-residuals-pre-norm-post-norm'],
    accent: '#58717b',
  },
  {
    id: 'residual',
    name: { en: 'Residual stream', 'pt-br': 'Fluxo residual' },
    system: { en: 'The highway', 'pt-br': 'A via expressa' },
    tagline: { en: 'Every block reads it and writes back', 'pt-br': 'Cada bloco lê e escreve de volta' },
    summary: {
      en: 'Not a layer but a shared bus. Each block adds its output to the running sum, so information can skip any number of layers untouched. Interpretability treats it as the model’s working memory.',
      'pt-br':
        'Não é uma camada, e sim um barramento compartilhado. Cada bloco soma sua saída ao acumulado, então a informação pode pular quantas camadas quiser intacta. A interpretabilidade o trata como a memória de trabalho do modelo.',
    },
    facts: {
      params: 'None (an addition)',
      cost: 'Free',
      introduced: 'He et al., 2015 (ResNet)',
      variants: 'Scaled residuals · DeepNorm',
    },
    lessons: ['4.10-residuals-pre-norm-post-norm', '2.8-initialization-normalization-residuals'],
    accent: '#287855',
  },
  {
    id: 'kv-cache',
    name: { en: 'KV cache', 'pt-br': 'Cache KV' },
    system: { en: 'Memory of the past', 'pt-br': 'Memória do passado' },
    tagline: { en: 'Why the second token is cheap', 'pt-br': 'Por que o segundo token é barato' },
    summary: {
      en: 'Keys and values for every past position, kept so each new token does not recompute the whole prefix. It converts quadratic work into linear — and becomes the dominant memory cost at long context.',
      'pt-br':
        'Keys e values de todas as posições anteriores, guardados para que cada novo token não recompute o prefixo inteiro. Converte trabalho quadrático em linear — e vira o maior custo de memória em contexto longo.',
    },
    facts: {
      params: 'None (runtime state)',
      cost: '2 × layers × heads × d_head × seq × bytes',
      introduced: 'Standard practice since 2019',
      variants: 'Paged · quantised · sliding-window · MLA-compressed',
    },
    lessons: ['7.2-the-kv-cache', '7.8-pagedattention-and-continuous-batching', '4.15-gated-deltanet'],
    accent: '#007f91',
  },
  {
    id: 'moe-router',
    name: { en: 'MoE router', 'pt-br': 'Roteador MoE' },
    system: { en: 'Sparse capacity', 'pt-br': 'Capacidade esparsa' },
    tagline: { en: 'Trillions of parameters, billions used', 'pt-br': 'Trilhões de parâmetros, bilhões usados' },
    summary: {
      en: 'A tiny learned gate picks k experts out of E for each token. Total parameters grow with E while per-token compute grows only with k. Colibrì implements this systems path for Kimi K3 in pure C by streaming selected MXFP4 experts from storage.',
      'pt-br':
        'Um gate pequeno e aprendido escolhe k experts entre E para cada token. O total de parâmetros cresce com E, mas o cálculo por token cresce só com k. O Colibrì implementa esse caminho para o Kimi K3 em C puro, transmitindo do armazenamento os experts MXFP4 selecionados.',
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
    accent: '#c59e00',
  },
  {
    id: 'sampler',
    name: { en: 'Sampler', 'pt-br': 'Amostrador' },
    system: { en: 'Decoding', 'pt-br': 'Decodificação' },
    tagline: { en: 'The model proposes; this disposes', 'pt-br': 'O modelo propõe; ele decide' },
    summary: {
      en: 'Turns a distribution over the vocabulary into one chosen token. Temperature, top-k, top-p and min-p all reshape that distribution — and they change output quality far more than most people expect.',
      'pt-br':
        'Transforma uma distribuição sobre o vocabulário em um token escolhido. Temperature, top-k, top-p e min-p remodelam essa distribuição — e mudam a qualidade da saída muito mais do que se costuma imaginar.',
    },
    facts: {
      params: 'None',
      cost: 'Negligible',
      introduced: 'Nucleus sampling: Holtzman et al., 2019',
      variants: 'Greedy · temperature · top-k · top-p · min-p · beam',
    },
    lessons: ['7.4-sampling', '7.5-beam-search-speculative-decoding-and-medusa'],
    accent: '#007f91',
  },
  {
    id: 'lm-head',
    name: { en: 'LM head', 'pt-br': 'Cabeça de linguagem' },
    system: { en: 'Output projection', 'pt-br': 'Projeção de saída' },
    tagline: { en: 'Back to vocabulary space', 'pt-br': 'De volta ao espaço do vocabulário' },
    summary: {
      en: 'Projects the final hidden state onto one logit per vocabulary entry. Often shares weights with the embedding table, on the argument that reading and writing a word should use the same representation.',
      'pt-br':
        'Projeta o estado oculto final em um logit por entrada do vocabulário. Costuma compartilhar pesos com a tabela de embeddings, sob o argumento de que ler e escrever uma palavra deveriam usar a mesma representação.',
    },
    facts: {
      params: '~2–10% (or zero if tied)',
      cost: 'One large matmul per generated token',
      introduced: 'Weight tying: Press & Wolf, 2017',
      variants: 'Tied · untied',
    },
    lessons: ['4.11-full-transformer-block', '7.4-sampling'],
    accent: '#007f91',
  },
  {
    id: 'quantization',
    name: { en: 'Quantisation', 'pt-br': 'Quantização' },
    system: { en: 'Compression', 'pt-br': 'Compressão' },
    tagline: { en: 'Fewer bits per weight', 'pt-br': 'Menos bits por peso' },
    summary: {
      en: 'Not a layer but a transformation applied across all of them: store weights in 8, 4 or fewer bits. It is the difference between a model that fits your hardware and one that does not.',
      'pt-br':
        'Não é uma camada, mas uma transformação aplicada a todas elas: guardar pesos em 8, 4 ou menos bits. É a diferença entre um modelo que cabe no seu hardware e um que não cabe.',
    },
    facts: {
      params: 'Affects all of them',
      cost: 'Dequantisation on the critical path',
      introduced: 'GPTQ: Frantar et al., 2022; AWQ: Lin et al., 2023',
      variants: 'int8 · int4 · MXFP4 · GGUF k-quants · QAT',
    },
    lessons: ['7.9-quantization-i-int8-int4-the-basics', '7.10-quantization-ii-gptq-awq-gguf-qat'],
    accent: '#d74234',
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
    cost: 'Uma operação gather por token',
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
    cost: 'Desquantização no caminho crítico',
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
