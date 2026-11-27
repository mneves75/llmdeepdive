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
  /** Trainable parameters or stored state. */
  params: string
  /** Dominant cost at inference. */
  cost: string
  introduced: string
  variants: string
}

export interface ExplorerComponent {
  id: string
  /** Role in the model or runtime. */
  system: Record<Locale, string>
  name: Record<Locale, string>
  tagline: Record<Locale, string>
  summary: Record<Locale, string>
  lenses: Record<Lens, Record<Locale, string>>
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
      params: 'No neural weights',
      cost: 'Text segmentation before the forward pass',
      introduced: 'BPE: Sennrich et al., 2016',
      variants: 'BPE · byte-level BPE · Unigram',
    },
    lenses: {
      math: { en: 'In BPE, count adjacent pairs and merge a frequent pair. Repeat to build a list of merges.', 'pt-br': 'No BPE, conte os pares adjacentes e combine um par frequente. Repita para criar uma lista de fusões.' },
      compare: { en: 'Byte-level BPE starts from bytes. Unigram chooses a segmentation using probabilities assigned to pieces.', 'pt-br': 'O BPE em bytes parte dos bytes. O Unigram escolhe uma divisão com base nas probabilidades atribuídas a cada trecho.' },
      animation: { en: 'The same word can turn into several IDs. The embedding table reads each ID separately.', 'pt-br': 'Uma palavra pode virar vários IDs. A tabela de embeddings lê cada ID separadamente.' },
      failure: { en: 'A vocabulary that splits common words into many pieces leaves less room for text in the same context window.', 'pt-br': 'Um vocabulário que divide palavras comuns em muitos pedaços deixa menos espaço para o texto na mesma janela de contexto.' },
      context: { en: 'The tokenizer encodes the prompt before the model runs and converts generated IDs back into text.', 'pt-br': 'O tokenizador codifica o prompt antes de o modelo rodar e converte os IDs gerados de volta em texto.' },
    },
    lessons: ['1.2-tokenization-i', '1.3-bpe-step-by-step', '1.4-sentencepiece-byte-level-token-counts'],
  },
  {
    id: 'embedding',
    name: { en: 'Embedding table', 'pt-br': 'Tabela de embeddings' },
    system: { en: 'Meaning as geometry', 'pt-br': 'Significado como geometria' },
    tagline: { en: 'One learned vector per token ID', 'pt-br': 'Um vetor aprendido por ID de token' },
    summary: {
      en: 'A table with one row of numbers (a vector) for each token ID. Training adjusts the rows. Some vectors end up close together because their tokens appear in similar contexts.',
      'pt-br':
        'Uma tabela com uma linha de números (um vetor) para cada ID de token. O treino ajusta essas linhas. Alguns vetores ficam próximos porque seus tokens aparecem em contextos parecidos.',
    },
    facts: {
      params: 'Vocabulary size × model width',
      cost: 'One table-row lookup per token',
      introduced: 'Bengio et al., 2003; word2vec, 2013',
      variants: 'Tied vs untied with the LM head',
    },
    lenses: {
      math: { en: 'A vocabulary of 32,000 entries and a model width of 1,024 give 32,768,000 embedding weights.', 'pt-br': 'Um vocabulário de 32.000 entradas e um modelo de largura 1.024 resultam em 32.768.000 pesos de embedding.' },
      compare: { en: 'With weight tying, one matrix serves as both the input table and the output projection. Untied models train separate matrices.', 'pt-br': 'Com pesos compartilhados, a mesma matriz serve de tabela de entrada e projeção de saída. Outros modelos treinam matrizes separadas.' },
      animation: { en: 'Token ID 17 selects row 17. Each occurrence starts with that same vector, then the model adds context.', 'pt-br': 'O token de ID 17 seleciona a linha 17. Cada ocorrência começa com o mesmo vetor e ganha contexto ao passar pelo modelo.' },
      failure: { en: 'If the tokenizer and embedding table come from different checkpoints, an ID can select a vector trained for a different token.', 'pt-br': 'Se o tokenizador e a tabela de embeddings vêm de checkpoints diferentes, um ID pode selecionar um vetor treinado para outro token.' },
      context: { en: 'The table sits between token IDs and the first transformer block. The model width is the number of values in each row.', 'pt-br': 'A tabela fica entre os IDs dos tokens e o primeiro bloco transformer. A largura do modelo é o número de valores de cada linha.' },
    },
    lessons: ['1.5-embeddings-meaning-as-geometry', '1.6-word2vec-glove-analogy'],
  },
  {
    id: 'positional',
    name: { en: 'Positional encoding', 'pt-br': 'Codificação posicional' },
    system: { en: 'Order', 'pt-br': 'Ordem' },
    tagline: { en: 'Give attention a position signal', 'pt-br': 'Dá à attention um sinal de posição' },
    summary: {
      en: 'Self-attention with no mask and no position signal cannot tell order apart: shuffle the input tokens and the outputs come back shuffled the same way, otherwise unchanged. So the model needs a separate signal for where each token sits. RoPE adds one by rotating each query and key by an angle that depends on its position.',
      'pt-br':
        'A self-attention sem máscara e sem sinal de posição não distingue a ordem: embaralhe os tokens de entrada e as saídas voltam embaralhadas do mesmo jeito, sem outra mudança. Por isso o modelo precisa de um sinal separado dizendo onde cada token está. O RoPE dá esse sinal girando cada query e cada key por um ângulo que depende da posição.',
    },
    facts: {
      params: 'Zero (RoPE, ALiBi) or max positions × d_model (learned)',
      cost: 'Input additions, vector rotations or score biases, depending on the method',
      introduced: 'Vaswani et al., 2017; RoPE: Su et al., 2021',
      variants: 'Sinusoidal · learned · RoPE · ALiBi · NoPE',
    },
    lenses: {
      math: { en: 'In RoPE (rotary position embedding), the angle difference between a query and a key depends on how far apart their positions are.', 'pt-br': 'No RoPE (embedding posicional rotativo), a diferença de ângulo entre uma query e uma key depende da distância entre suas posições.' },
      compare: { en: 'Learned absolute positions add a vector to the input. RoPE rotates queries and keys. ALiBi adds a distance-based bias to attention scores.', 'pt-br': 'Posições absolutas aprendidas somam um vetor à entrada. O RoPE gira queries e keys. O ALiBi acrescenta um viés de distância aos escores de attention.' },
      animation: { en: 'The same token at positions 2 and 5 starts with the same embedding, but in RoPE its query and key receive different rotations.', 'pt-br': 'O mesmo token nas posições 2 e 5 começa com o mesmo embedding. No RoPE, sua query e sua key recebem rotações diferentes.' },
      failure: { en: 'Using the wrong position for a cached key makes a query score it as if it came from a different location.', 'pt-br': 'Usar a posição incorreta para uma key em cache faz a query pontuá-la como se viesse de outro lugar.' },
      context: { en: 'Absolute positions act at the input. RoPE and ALiBi act inside each attention layer that uses them.', 'pt-br': 'Posições absolutas atuam na entrada. RoPE e ALiBi atuam dentro de cada camada de attention que os usa.' },
    },
    lessons: ['4.6-positional-encoding-sinusoidal-learned', '4.7-rope', '4.8-alibi-relative-bias'],
  },
  {
    id: 'norm',
    name: { en: 'Normalisation', 'pt-br': 'Normalização' },
    system: { en: 'Stability', 'pt-br': 'Estabilidade' },
    tagline: { en: 'Control the scale of activations', 'pt-br': 'Controla a escala das ativações' },
    summary: {
      en: 'Rescales the vector passed to or from a sublayer. That helps keep activations and training gradients manageable in deep networks. RMSNorm uses the size of the components without subtracting their mean.',
      'pt-br':
        'Reescala o vetor que entra ou sai de uma subcamada. Isso ajuda a controlar as ativações e os gradientes do treino em redes profundas. A RMSNorm usa a magnitude dos componentes sem subtrair a média.',
    },
    facts: {
      params: 'One learned scale per feature, with an optional bias',
      cost: 'A reduction across the features of each token vector',
      introduced: 'LayerNorm: Ba et al., 2016; RMSNorm: Zhang & Sennrich, 2019',
      variants: 'LayerNorm · RMSNorm · pre-norm vs post-norm',
    },
    lenses: {
      math: { en: 'RMSNorm divides by the root mean square of the vector entries, with a small constant to avoid division by zero, then applies learned scales.', 'pt-br': 'A RMSNorm divide pela raiz da média dos quadrados dos elementos, com uma pequena constante para evitar divisão por zero, e depois aplica escalas aprendidas.' },
      compare: { en: 'LayerNorm subtracts the mean before scaling by the standard deviation. RMSNorm only rescales.', 'pt-br': 'A LayerNorm subtrai a média antes de reescalar pelo desvio padrão. A RMSNorm só reescala.' },
      animation: { en: 'Before attention reads a token vector in a pre-norm block, normalisation rescales its features.', 'pt-br': 'Em um bloco pré-norm, a normalização reescala os componentes do vetor antes de a attention lê-lo.' },
      failure: { en: 'If activations grow too large across layers, training can become unstable or overflow at low precision.', 'pt-br': 'Se as ativações crescem demais entre as camadas, o treino pode ficar instável ou estourar o limite numérico em baixa precisão.' },
      context: { en: 'Pre-norm puts normalisation before attention and before the feed-forward network. Post-norm puts it after each residual addition.', 'pt-br': 'Pré-norm coloca a normalização antes da attention e da rede feed-forward. Pós-norm a coloca depois de cada soma residual.' },
    },
    lessons: ['2.8-initialization-normalization-residuals', '4.10-residuals-pre-norm-post-norm'],
  },
  {
    id: 'attention',
    name: { en: 'Self-attention', 'pt-br': 'Self-attention' },
    system: { en: 'Information routing', 'pt-br': 'Roteamento de informação' },
    tagline: { en: 'Mix information from visible tokens', 'pt-br': 'Combina informação dos tokens visíveis' },
    summary: {
      en: 'Each token has a query, a key and a value. The query gets a score against each visible key. Softmax turns those scores into weights that add up to 1, and attention uses those weights to mix the corresponding values.',
      'pt-br':
        'Cada token tem uma query, uma key e um value. A query recebe um escore em relação a cada key visível. O softmax converte os escores em pesos que somam 1, e a attention usa esses pesos para combinar os values correspondentes.',
    },
    facts: {
      params: 'Query, key, value and output projections. Widths vary by design.',
      cost: 'Full attention compares O(n²) token pairs in prefill',
      introduced: 'Bahdanau et al., 2014; Vaswani et al., 2017',
      variants: 'MHA · MQA · GQA · MLA · sliding-window',
    },
    lenses: {
      math: { en: 'Take the dot product of a query and each allowed key, divide by the square root of the key width, and apply softmax.', 'pt-br': 'Calcule o produto escalar de uma query com cada key permitida, divida pela raiz quadrada da largura da key e aplique softmax.' },
      compare: { en: 'Multi-head attention has separate keys and values for each head. Grouped-query attention shares them within groups of query heads.', 'pt-br': 'Na atenção multi-head, cada cabeça tem suas keys e values. Na grouped-query attention, grupos de cabeças de query compartilham keys e values.' },
      animation: { en: 'With a full causal mask, the token at position 3 can look at positions 1, 2 and 3.', 'pt-br': 'Com uma máscara causal completa, o token na posição 3 pode consultar as posições 1, 2 e 3.' },
      failure: { en: 'A broken causal mask can let a model read the next token during training. The same shortcut is unavailable when it generates text.', 'pt-br': 'Uma máscara causal incorreta pode deixar o modelo ler o próximo token durante o treino. Esse atalho não existe na geração de texto.' },
      context: { en: 'Self-attention sits inside the transformer block and combines information across positions. The feed-forward network then processes each position separately.', 'pt-br': 'A self-attention fica dentro do bloco transformer e combina informações entre posições. A rede feed-forward processa cada posição separadamente.' },
    },
    lessons: ['4.2-self-attention', '4.3-scaled-dot-product-attention', '4.4-causal-masking', '4.16-hybrid-layouts'],
  },
  {
    id: 'kv-cache',
    name: { en: 'KV cache', 'pt-br': 'Cache KV' },
    system: { en: 'Memory of the past', 'pt-br': 'Memória do passado' },
    tagline: { en: 'Reuse keys and values during generation', 'pt-br': 'Reutiliza keys e values na geração' },
    summary: {
      en: 'Attention can save the keys and values it has already computed. Each generation step reuses them. A full-attention layer still reads data for every token it can see, so its cache grows with the context and can become a major memory cost.',
      'pt-br':
        'A attention pode guardar as keys e os values que já calculou e reutilizá-los a cada passo da geração. Uma camada de attention completa ainda lê os dados de cada token visível. Seu cache cresce com o contexto e pode ocupar muita memória.',
    },
    facts: {
      params: 'None (runtime state)',
      cost: '2 × attention layers × KV heads × head width × cached tokens × bytes per value',
      introduced: 'Common in autoregressive transformer inference',
      variants: 'Paged · quantised · sliding-window · MLA-compressed',
    },
    lenses: {
      math: { en: 'For an uncompressed full-attention cache, doubling the number of stored tokens doubles its size.', 'pt-br': 'Em um cache sem compressão de attention completa, dobrar o número de tokens armazenados dobra o tamanho do cache.' },
      compare: { en: 'Grouped-query attention uses fewer KV heads. Quantisation uses fewer bytes per value. Sliding-window attention stores fewer positions.', 'pt-br': 'A grouped-query attention usa menos cabeças KV. A quantização usa menos bytes por valor. A attention com janela deslizante guarda menos posições.' },
      animation: { en: 'Prefill writes entries for the prompt. During generation, attention appends the new key and value and reads the entries it needs.', 'pt-br': 'O prefill grava as entradas do prompt. Durante a geração, a attention adiciona a nova key e o novo value e lê as entradas de que precisa.' },
      failure: { en: 'With long contexts or many simultaneous requests, the cache can fill available memory before the model weights change at all.', 'pt-br': 'Com contextos longos ou muitas requisições simultâneas, o cache pode esgotar a memória disponível sem que os pesos do modelo mudem.' },
      context: { en: 'The cache is inference state kept alongside the attention layers. It is specific to the tokens the request has processed.', 'pt-br': 'O cache é um estado de inferência associado às camadas de attention. Ele depende dos tokens que a requisição já processou.' },
    },
    lessons: ['7.2-the-kv-cache', '7.8-pagedattention-and-continuous-batching', '4.15-gated-deltanet'],
  },
  {
    id: 'residual',
    name: { en: 'Residual stream', 'pt-br': 'Fluxo residual' },
    system: { en: 'Preserving the input signal', 'pt-br': 'Preservação do sinal de entrada' },
    tagline: { en: 'Every block reads it and writes back', 'pt-br': 'Cada bloco lê e escreve de volta' },
    summary: {
      en: 'Each token has a running vector that sublayers read and update, like a variable updated with +=. In a standard residual connection, the input vector has a direct path around the sublayer and its output is added to that vector.',
      'pt-br':
        'Cada token tem um vetor acumulado que as subcamadas leem e atualizam, como uma variável atualizada com +=. Em uma conexão residual comum, a entrada passa por um caminho direto e recebe a soma da saída da subcamada.',
    },
    facts: {
      params: 'None (an addition)',
      cost: 'One elementwise sum per connection',
      introduced: 'He et al., 2015 (ResNet)',
      variants: 'Scaled residuals · DeepNorm',
    },
    lenses: {
      math: { en: 'If the sublayer produces a zero update, x + 0 leaves the input x unchanged.', 'pt-br': 'Se a subcamada produz uma atualização nula, x + 0 mantém a entrada x intacta.' },
      compare: { en: 'A plain residual connection adds the update directly. Scaled designs adjust the size of the input or update before adding.', 'pt-br': 'Uma conexão residual simples soma a atualização diretamente. Variantes escaladas ajustam a escala da entrada ou da atualização antes da soma.' },
      animation: { en: 'A token vector takes a direct path around attention, then rejoins the branch that computed the update.', 'pt-br': 'O vetor do token contorna a attention por um caminho direto e se junta à atualização calculada no outro caminho.' },
      failure: { en: 'Removing the direct path makes each sublayer carry the entire signal and can make deep networks harder to train.', 'pt-br': 'Remover o caminho direto obriga cada subcamada a carregar o sinal inteiro e pode dificultar o treino de redes profundas.' },
      context: { en: 'A standard decoder block has one residual addition around attention and one around the feed-forward network.', 'pt-br': 'Um bloco decoder padrão tem uma soma residual em torno da attention e outra em torno da rede feed-forward.' },
    },
    lessons: ['4.10-residuals-pre-norm-post-norm', '2.8-initialization-normalization-residuals'],
  },
  {
    id: 'ffn',
    name: { en: 'Feed-forward network', 'pt-br': 'Rede feed-forward' },
    system: { en: 'Feature transformation', 'pt-br': 'Transformação de características' },
    tagline: { en: 'Transform each token vector separately', 'pt-br': 'Transforma cada vetor de token separadamente' },
    summary: {
      en: 'The feed-forward network expands each token vector, applies a non-linear function, then brings the result back to the model width. A gated design adds a second expansion that controls which features pass through.',
      'pt-br':
        'A rede feed-forward expande cada vetor de token, aplica uma função não linear e devolve o resultado à largura do modelo. Em variantes com gate, uma segunda expansão controla quais características passam.',
    },
    facts: {
      params: 'Typically two or three learned matrices per dense block',
      cost: 'Matrix multiplications for each token',
      introduced: 'Vaswani et al., 2017; SwiGLU: Shazeer, 2020',
      variants: 'ReLU · GELU · SwiGLU · MoE-sparse',
    },
    lenses: {
      math: { en: 'A basic block with model width d and hidden width h has 2 × d × h weights across the two matrices, excluding biases.', 'pt-br': 'Um bloco básico de largura d e largura interna h tem 2 × d × h pesos nas duas matrizes, sem contar os vieses.' },
      compare: { en: 'GELU can activate one expanded vector. SwiGLU multiplies a gated expansion by a second expansion before projecting back down.', 'pt-br': 'A GELU pode ativar um único vetor expandido. A SwiGLU multiplica uma expansão com gate por outra expansão antes de reduzir a largura.' },
      animation: { en: 'A token vector widens, its features change, then a final projection returns it to the width required by the residual stream.', 'pt-br': 'O vetor do token ganha dimensões, suas características mudam e uma projeção final o devolve à largura do fluxo residual.' },
      failure: { en: 'An activation such as ReLU gives zero output and zero gradient on negative inputs. A unit stuck there stops learning from those inputs.', 'pt-br': 'Uma ativação como a ReLU dá saída e gradiente iguais a zero para entradas negativas. Uma unidade presa nessa faixa deixa de aprender com essas entradas.' },
      context: { en: 'This is usually the second sublayer in a decoder block, after attention. It applies the same weights at each token position.', 'pt-br': 'Costuma ser a segunda subcamada de um bloco decoder, depois da attention. Aplica os mesmos pesos em cada posição.' },
    },
    lessons: ['4.9-feed-forward-block', '4.11-full-transformer-block'],
  },
  {
    id: 'moe-router',
    name: { en: 'MoE router', 'pt-br': 'Roteador MoE' },
    system: { en: 'Sparse capacity', 'pt-br': 'Capacidade esparsa' },
    tagline: { en: 'Choose which experts process each token', 'pt-br': 'Escolhe quais experts processam cada token' },
    summary: {
      en: 'Mixture of experts (MoE) splits the feed-forward block into E smaller networks, the experts. A tiny learned gate picks k of them for each token, so total parameters grow with E while the work per token grows only with k. FareedKhan-dev’s Kimi K3 in C illustrates CPU inference with native MXFP4 experts loaded on demand from storage; a smaller resident working set still needs disk capacity and I/O time.',
      'pt-br':
        'O mixture of experts (MoE) divide o bloco feed-forward em E redes menores, os experts. Um gate pequeno e aprendido escolhe k delas para cada token, então o total de parâmetros cresce com E, mas o trabalho por token cresce só com k. O Kimi K3 in C, de FareedKhan-dev, ilustra inferência em CPU com experts MXFP4 nativos carregados do armazenamento sob demanda; um conjunto de trabalho residente menor ainda exige espaço em disco e tempo de I/O.',
    },
    facts: {
      params: 'Learned weights for the router and all experts',
      cost: 'Top-k routing activates k of E routed experts per token',
      introduced: 'Shazeer et al., 2017; Switch: Fedus et al., 2021',
      variants: 'Top-k · expert-choice · shared experts',
    },
    lenses: {
      math: { en: 'If there are eight equal-sized routed experts and the router chooses two, it uses one quarter of their combined weights for that token.', 'pt-br': 'Se há oito experts roteáveis do mesmo tamanho e o roteador escolhe dois, ele usa um quarto dos pesos desse conjunto para o token.' },
      compare: { en: 'A dense feed-forward block runs the same network for each token. A routed block lets different tokens use different networks.', 'pt-br': 'Um bloco feed-forward denso usa a mesma rede para todos os tokens. Com roteamento, tokens diferentes podem usar redes diferentes.' },
      animation: { en: 'The router scores the experts for a token, selects a few and mixes their outputs back into one token vector.', 'pt-br': 'O roteador atribui escores aos experts para um token, seleciona alguns e reúne as saídas em um único vetor.' },
      failure: { en: 'If many tokens choose the same expert, that expert can become a bottleneck while others sit idle.', 'pt-br': 'Se muitos tokens escolhem o mesmo expert, ele pode virar um gargalo enquanto os demais ficam ociosos.' },
      context: { en: 'The router is inside a sparse feed-forward sublayer. A model can put these sublayers in some blocks and keep dense ones in others.', 'pt-br': 'O roteador fica dentro de uma subcamada feed-forward esparsa. Um modelo pode usar essas subcamadas em alguns blocos e manter as densas nos demais.' },
    },
    lessons: ['4.18-mixture-of-experts', '4.9-feed-forward-block'],
  },
  {
    id: 'quantization',
    name: { en: 'Quantisation', 'pt-br': 'Quantização' },
    system: { en: 'Compression', 'pt-br': 'Compressão' },
    tagline: { en: 'Fewer bits per weight', 'pt-br': 'Menos bits por peso' },
    summary: {
      en: 'Quantisation stores weights or activations in fewer bits, for example 4 instead of 16. It can reduce memory use and traffic. Accuracy and speed depend on the format, the model and how the hardware runs it.',
      'pt-br':
        'A quantização guarda pesos ou ativações em menos bits, por exemplo 4 em vez de 16. Pode reduzir o uso e o tráfego de memória. A precisão e a velocidade dependem do formato, do modelo e de como o hardware executa as operações.',
    },
    facts: {
      params: 'Keeps the same count of weights at lower precision',
      cost: 'Less memory traffic, with conversion work depending on the kernel',
      introduced: 'GPTQ: Frantar et al., 2022; AWQ: Lin et al., 2023',
      variants: 'int8 · int4 · MXFP4 · GGUF k-quants · QAT',
    },
    lenses: {
      math: { en: 'Four-bit weights take one quarter of the raw storage of 16-bit weights. Scales and other format metadata add overhead.', 'pt-br': 'Pesos de 4 bits ocupam um quarto do espaço bruto dos pesos de 16 bits. Escalas e outros metadados do formato ocupam espaço adicional.' },
      compare: { en: 'Weight-only quantisation can leave activations in higher precision. Other formats compress both weights and activations.', 'pt-br': 'A quantização só de pesos pode manter as ativações em precisão maior. Outros formatos comprimem pesos e ativações.' },
      animation: { en: 'The selected kernel reads compact weights and computes with them directly or converts small pieces while it works.', 'pt-br': 'O kernel selecionado lê os pesos compactos e calcula com eles diretamente ou converte pequenos trechos durante a operação.' },
      failure: { en: 'Fewer bits can make rare large values harder to represent accurately. A quality test can reveal when the loss affects the task.', 'pt-br': 'Com menos bits, valores altos e raros podem ser mais difíceis de representar com precisão. Um teste de qualidade pode revelar quando essa perda afeta a tarefa.' },
      context: { en: 'Quantisation can apply to matrices across the model and to the KV cache. It is a storage and computation choice.', 'pt-br': 'A quantização pode se aplicar às matrizes do modelo e ao cache KV. É uma escolha de armazenamento e computação.' },
    },
    lessons: ['7.9-quantization-i-int8-int4-the-basics', '7.10-quantization-ii-gptq-awq-gguf-qat'],
  },
  {
    id: 'lm-head',
    name: { en: 'LM head', 'pt-br': 'Cabeça de linguagem' },
    system: { en: 'Output projection', 'pt-br': 'Projeção de saída' },
    tagline: { en: 'Back to vocabulary space', 'pt-br': 'De volta ao espaço do vocabulário' },
    summary: {
      en: 'Turns the last layer’s vector into a list of scores called logits, with one score per output row. The runtime maps eligible rows to tokens before decoding. Some models share this projection’s weights with the embedding table.',
      'pt-br':
        'Transforma o vetor da última camada em uma lista de escores chamados logits, um por linha de saída. O runtime mapeia as linhas elegíveis para tokens antes da decodificação. Alguns modelos compartilham os pesos da projeção com a tabela de embeddings.',
    },
    facts: {
      params: 'Output size × model width, shared when tied',
      cost: 'Project the final vector to output scores',
      introduced: 'Weight tying: Press & Wolf, 2017',
      variants: 'Tied · untied',
    },
    lenses: {
      math: { en: 'Each output score is the dot product of the token’s final vector and one row of the output matrix, plus a bias if the model has one.', 'pt-br': 'Cada escore de saída é o produto escalar do vetor final do token com uma linha da matriz de saída, mais um viés quando o modelo tem esse termo.' },
      compare: { en: 'Tied models reuse the embedding matrix and save weights. Untied models learn separate input and output matrices.', 'pt-br': 'Modelos com pesos compartilhados reutilizam a matriz de embeddings e economizam pesos. Outros aprendem matrizes separadas para entrada e saída.' },
      animation: { en: 'The last position’s final vector produces scores for candidate next tokens. Those scores go to the decoding rule.', 'pt-br': 'O vetor final da última posição produz os escores dos candidatos a próximo token. Esses escores seguem para a regra de decodificação.' },
      failure: { en: 'If decoding treats a padded output row as a real token, the selected ID may have no tokenizer entry.', 'pt-br': 'Se a decodificação trata uma linha extra de preenchimento como token real, o ID escolhido pode não ter entrada no tokenizador.' },
      context: { en: 'The projection runs after the transformer stack and final normalisation when the model uses it.', 'pt-br': 'A projeção vem depois da pilha de blocos transformer e da normalização final, nos modelos que a usam.' },
    },
    lessons: ['4.11-full-transformer-block', '7.4-sampling'],
  },
  {
    id: 'sampler',
    name: { en: 'Sampler', 'pt-br': 'Amostrador' },
    system: { en: 'Decoding', 'pt-br': 'Decodificação' },
    tagline: { en: 'Choose the next token', 'pt-br': 'Escolhe o próximo token' },
    summary: {
      en: 'Chooses one next token from the model output. Temperature adjusts how sharply the distribution favours high scores. Filters such as top-k, top-p and min-p remove candidates before sampling.',
      'pt-br':
        'Escolhe um próximo token a partir da saída do modelo. A temperatura ajusta quanto a distribuição favorece escores altos. Filtros como top-k, top-p e min-p removem candidatos antes da amostragem.',
    },
    facts: {
      params: 'None',
      cost: 'Score scaling, filtering and a token draw',
      introduced: 'Nucleus sampling: Holtzman et al., 2019',
      variants: 'Greedy · temperature · top-k · top-p · min-p · beam',
    },
    lenses: {
      math: { en: 'Temperature divides each logit by T before softmax. For T greater than 1, this reduces the gaps and spreads probability more evenly.', 'pt-br': 'A temperatura divide cada logit por T antes do softmax. Para T maior que 1, as diferenças diminuem e as probabilidades ficam mais equilibradas.' },
      compare: { en: 'Greedy decoding takes the highest score. Top-k sampling draws from a fixed number of candidates. Top-p adjusts the number using cumulative probability.', 'pt-br': 'A decodificação gulosa escolhe o maior escore. Top-k sorteia entre um número fixo de candidatos. Top-p ajusta esse número pela probabilidade acumulada.' },
      animation: { en: 'The sampler chooses an ID, the tokenizer decodes it, and the chosen ID becomes input for the next generation step.', 'pt-br': 'O amostrador escolhe um ID, o tokenizador o decodifica e o ID escolhido vira entrada para o próximo passo da geração.' },
      failure: { en: 'High temperature can make unlikely tokens appear more often. A restrictive filter can leave too few options and make outputs repetitive.', 'pt-br': 'Uma temperatura alta pode fazer tokens improváveis aparecerem com mais frequência. Um filtro restritivo pode deixar poucas opções e tornar as saídas repetitivas.' },
      context: { en: 'The sampler is part of the runtime’s decoding loop. Its settings can change without retraining the transformer.', 'pt-br': 'O amostrador faz parte do loop de decodificação do runtime. Suas configurações podem mudar sem retreinar o transformer.' },
    },
    lessons: ['7.4-sampling', '7.5-beam-search-speculative-decoding-and-medusa'],
  },
]

export const LENS_LABELS: Record<Lens, Record<Locale, string>> = {
  math: { en: 'The maths', 'pt-br': 'A matemática' },
  compare: { en: 'Compare designs', 'pt-br': 'Compare abordagens' },
  animation: { en: "A token's journey", 'pt-br': 'A jornada de um token' },
  failure: { en: 'Failure modes', 'pt-br': 'Modos de falha' },
  context: { en: 'Where it sits', 'pt-br': 'Onde se encaixa' },
}

const PT_FACTS: Record<string, ComponentFacts> = {
  tokenizer: {
    params: 'Sem pesos de rede neural',
    cost: 'Divisão do texto antes da passagem pelo modelo',
    introduced: 'BPE: Sennrich et al., 2016',
    variants: 'BPE · BPE em bytes · Unigram',
  },
  embedding: {
    params: 'Tamanho do vocabulário × largura do modelo',
    cost: 'Uma consulta de linha da tabela por token',
    introduced: 'Bengio et al., 2003; word2vec, 2013',
    variants: 'Pesos compartilhados ou não com a cabeça LM',
  },
  positional: {
    params: 'Zero (RoPE, ALiBi) ou proporcional ao contexto máximo × d_model (aprendida)',
    cost: 'Somas na entrada, rotações de vetores ou vieses nos escores, conforme o método',
    introduced: 'Vaswani et al., 2017; RoPE: Su et al., 2021',
    variants: 'Senoidal · aprendida · RoPE · ALiBi · NoPE',
  },
  attention: {
    params: 'Projeções de query, key, value e saída. A largura varia conforme a arquitetura.',
    cost: 'A attention completa compara O(n²) pares de tokens no prefill',
    introduced: 'Bahdanau et al., 2014; Vaswani et al., 2017',
    variants: 'MHA · MQA · GQA · MLA · janela deslizante',
  },
  ffn: {
    params: 'Em geral, duas ou três matrizes aprendidas por bloco denso',
    cost: 'Multiplicações de matrizes para cada token',
    introduced: 'Vaswani et al., 2017; SwiGLU: Shazeer, 2020',
    variants: 'ReLU · GELU · SwiGLU · MoE esparso',
  },
  norm: {
    params: 'Uma escala aprendida por componente, com viés opcional',
    cost: 'Uma redução entre os componentes do vetor de cada token',
    introduced: 'LayerNorm: Ba et al., 2016; RMSNorm: Zhang & Sennrich, 2019',
    variants: 'LayerNorm · RMSNorm · pré-norm vs. pós-norm',
  },
  residual: {
    params: 'Nenhum (uma soma)',
    cost: 'Uma soma elemento a elemento por conexão',
    introduced: 'He et al., 2015 (ResNet)',
    variants: 'Resíduos escalados · DeepNorm',
  },
  'kv-cache': {
    params: 'Nenhum (estado de execução)',
    cost: '2 × camadas de attention × cabeças KV × largura da cabeça × tokens em cache × bytes por valor',
    introduced: 'Comum na inferência autoregressiva com transformers',
    variants: 'Paginado · quantizado · janela deslizante · comprimido por MLA',
  },
  'moe-router': {
    params: 'Pesos aprendidos do roteador e de todos os experts',
    cost: 'O roteamento top-k ativa k dos E experts roteáveis por token',
    introduced: 'Shazeer et al., 2017; Switch: Fedus et al., 2021',
    variants: 'Top-k · escolha pelo especialista · especialistas compartilhados',
  },
  sampler: {
    params: 'Nenhum',
    cost: 'Ajuste dos escores, filtragem e sorteio de um token',
    introduced: 'Amostragem nucleus: Holtzman et al., 2019',
    variants: 'Gulosa · temperatura · top-k · top-p · min-p · beam search',
  },
  'lm-head': {
    params: 'Tamanho da saída × largura do modelo, com pesos reaproveitados quando compartilhados',
    cost: 'Projeção do vetor final em escores de saída',
    introduced: 'Compartilhamento de pesos: Press & Wolf, 2017',
    variants: 'Pesos compartilhados · pesos separados',
  },
  quantization: {
    params: 'Mantém a contagem de pesos, com precisão menor',
    cost: 'Menos tráfego de memória, com conversão conforme o kernel',
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

export function lensText(component: ExplorerComponent, lens: Lens, locale: Locale): string {
  return component.lenses[lens][locale]
}
