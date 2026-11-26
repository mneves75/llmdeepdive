/**
 * Figures for track 1 — From Text to Tensors.
 */
import { formatNumber } from '~/lib/i18n'
import { QWEN } from '~/lib/model-facts'
import type { Figure, Localised } from './types'

/** A model fact formatted for each locale's prose (248,320 / 248.320). */
const both = (value: number): Localised => ({ en: formatNumber('en', value), 'pt-br': formatNumber('pt-br', value) })

const VOCAB_ROWS = QWEN.vocabSize.value
const MAPPED_IDS = QWEN.tokenizerMappedIds.value
const UNMAPPED_ROWS = VOCAB_ROWS - MAPPED_IDS
const HIDDEN_SIZE = QWEN.hiddenSize.value
const LAYERS = QWEN.layers.value
const BPE_MODEL_IDS = 248044
const ADDED_TOKEN_IDS = MAPPED_IDS - BPE_MODEL_IDS
const EMBED_PARAMS = VOCAB_ROWS * HIDDEN_SIZE
const TOTAL_PARAMS = QWEN.paramsTotal.value
const REST_TIED = TOTAL_PARAMS - EMBED_PARAMS
const REST_UNTIED = TOTAL_PARAMS - EMBED_PARAMS * 2

export const TRACK_1_FIGURES = {
  /**
   * 1.1 walked the word café through a numbered list of stages and restated the
   * six contracts at the end. Three stepped frames carry the full path: how two
   * Unicode spellings converge at NFC, what the network and decoder do, and
   * where the round-trip guarantee stops.
   */
  't1-text-round-trip': {
    lesson: '1.1-why-computers-cant-read',
    title: { en: 'One word through Qwen3.8-27B and back', 'pt-br': 'Uma palavra pelo Qwen3.8-27B, ida e volta' },
    caption: {
      en: 'Each boundary carries one narrow contract. Follow café through encoding, the network, and decoding to see what survives and where guarantees stop.',
      'pt-br': 'Cada fronteira tem um contrato estreito. Acompanhe café pela codificação, pela rede e pela decodificação para ver o que sobrevive e onde as garantias terminam.',
    },
    steps: [
      {
        label: { en: 'Encode: café → ids', 'pt-br': 'Codificar: café → ids' },
        caption: {
          en: 'Both Unicode spellings of café (4 code points / 5 UTF-8 bytes or 5 code points / 6 UTF-8 bytes) hit NFC normalization first and converge to the same 5-byte sequence before byte-level BPE maps them into token ids.',
          'pt-br': 'As duas grafias Unicode de café (4 code points / 5 bytes UTF-8 ou 5 code points / 6 bytes UTF-8) passam primeiro pela normalização NFC e convergem para a mesma sequência de 5 bytes antes de o BPE byte-level mapeá-las em ids de token.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Two spellings', 'pt-br': 'Duas grafias' },
              detail: { en: '4 code points (5 B) or 5 code points (6 B)', 'pt-br': '4 code points (5 B) ou 5 code points (6 B)' },
              pigment: 'muted',
            },
            {
              label: { en: 'NFC normalizer', 'pt-br': 'Normalizador NFC' },
              detail: { en: 'merges canonical twins into one form', 'pt-br': 'junta grafias equivalentes numa só forma' },
              pigment: 'caution',
            },
            {
              label: { en: 'UTF-8 bytes', 'pt-br': 'Bytes UTF-8' },
              detail: { en: '5 bytes for normalized café', 'pt-br': '5 bytes para café normalizado' },
              pigment: 'accent',
            },
            {
              label: { en: 'Byte-level BPE', 'pt-br': 'BPE byte-level' },
              detail: {
                en: `maps pieces to ${both(MAPPED_IDS).en} tokenizer ids`,
                'pt-br': `mapeia pedaços em ${both(MAPPED_IDS)['pt-br']} ids do tokenizer`,
              },
              pigment: 'accent',
            },
          ],
        },
      },
      {
        label: { en: 'Network and decode', 'pt-br': 'Rede e decodificação' },
        caption: {
          en: `Each id selects one ${HIDDEN_SIZE}-number row from the ${both(VOCAB_ROWS).en}-row embedding table, ${LAYERS} layers rewrite the vectors, and the output scores all ${both(VOCAB_ROWS).en} rows before the tokenizer decoder maps a chosen id back to text.`,
          'pt-br': `Cada id seleciona uma linha de ${HIDDEN_SIZE} números na tabela de embeddings de ${both(VOCAB_ROWS)['pt-br']} linhas, ${LAYERS} camadas reescrevem os vetores, e a saída pontua todas as ${both(VOCAB_ROWS)['pt-br']} linhas antes de o decoder do tokenizer mapear um id escolhido de volta para texto.`,
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Embedding lookup', 'pt-br': 'Busca no embedding' },
              detail: {
                en: `id → ${HIDDEN_SIZE}-number row of ${both(VOCAB_ROWS).en}`,
                'pt-br': `id → linha de ${HIDDEN_SIZE} números em ${both(VOCAB_ROWS)['pt-br']}`,
              },
              pigment: 'accent',
            },
            {
              label: { en: `${LAYERS} layers`, 'pt-br': `${LAYERS} camadas` },
              detail: { en: 'rewrite each vector using surrounding tokens', 'pt-br': 'reescrevem cada vetor com base no contexto' },
              pigment: 'accent',
            },
            {
              label: { en: 'Output logits', 'pt-br': 'Logits de saída' },
              detail: {
                en: `${both(VOCAB_ROWS).en} raw scores; softmax → probabilities`,
                'pt-br': `${both(VOCAB_ROWS)['pt-br']} scores brutos; softmax → probabilidades`,
              },
              pigment: 'accent',
            },
            {
              label: { en: 'Tokenizer decoder', 'pt-br': 'Decoder do tokenizer' },
              detail: { en: 'chosen id → UTF-8 bytes → text', 'pt-br': 'id escolhido → bytes UTF-8 → texto' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'What is guaranteed', 'pt-br': 'O que é garantido' },
        caption: {
          en: 'Decoding ids from encoded normalized input reconstructs that normalized text, never the replaced combining spelling. Model-generated ids carry no NFC guarantee and can emit broken byte fragments.',
          'pt-br': 'Decodificar ids vindos de uma entrada normalizada reconstrói esse texto normalizado, nunca a grafia com acento combinante substituída. Ids gerados pelo modelo não têm garantia NFC e podem emitir fragmentos de bytes inválidos.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Encoded input', 'pt-br': 'Entrada codificada' },
              detail: { en: 'round-trips faithfully to NFC text', 'pt-br': 'faz ida e volta fiel ao texto NFC' },
              pigment: 'success',
            },
            {
              label: { en: 'Replaced spelling', 'pt-br': 'Grafia substituída' },
              detail: { en: 'original 5-code-point form is gone', 'pt-br': 'a forma original de 5 code points se perdeu' },
              pigment: 'caution',
            },
            {
              label: { en: 'Generated ids', 'pt-br': 'Ids gerados' },
              detail: { en: 'no NFC guarantee; may need replacement marks', 'pt-br': 'sem garantia NFC; podem exigir caractere substituto' },
              pigment: 'danger',
            },
            {
              label: { en: 'Comprehension', 'pt-br': 'Compreensão' },
              detail: { en: 'not proved by faithful transport', 'pt-br': 'não é provada por um transporte fiel' },
              pigment: 'muted',
            },
          ],
        },
      },
    ],
  },

  /**
   * 1.2 compares three ways to split the word unbelievability (characters, whole
   * words, subwords) and then inspects Qwen3.8-27B's byte-level tokenizer and
   * padded 248,320-row tensor shape.
   */
  't1-unit-granularity': {
    lesson: '1.2-tokenization-i',
    title: { en: 'How many units should one word cost?', 'pt-br': 'Quantas unidades uma palavra deveria custar?' },
    caption: {
      en: 'Splitting unbelievability under three textbook designs and under Qwen3.8-27B’s byte-level tokenizer. Every choice trades vocabulary size against sequence length.',
      'pt-br': 'Dividindo unbelievability em três projetos clássicos e no tokenizer byte-level do Qwen3.8-27B. Cada escolha troca tamanho de vocabulário por comprimento de sequência.',
    },
    steps: [
      {
        label: { en: 'Characters', 'pt-br': 'Caracteres' },
        caption: {
          en: 'One character per token keeps the vocabulary tiny and spells anything, but stretches every sentence across five or six times as many positions—and transformer work grows with positions.',
          'pt-br': 'Um caractere por token mantém o vocabulário minúsculo e soletra qualquer coisa, mas estica cada frase por cinco ou seis vezes mais posições — e o trabalho do transformer cresce com as posições.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'u · n · b · … · y', 'pt-br': 'u · n · b · … · y' }, detail: { en: '15 units for one word', 'pt-br': '15 unidades para uma palavra' }, pigment: 'caution' },
            { label: { en: 'Tiny vocabulary', 'pt-br': 'Vocabulário minúsculo' }, detail: { en: 'a few hundred entries; spells anything', 'pt-br': 'algumas centenas de entradas; soletra tudo' }, pigment: 'success' },
            { label: { en: 'Expensive to run', 'pt-br': 'Caro de rodar' }, detail: { en: '5–6× more positions through every layer', 'pt-br': '5–6× mais posições em cada camada' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Whole words', 'pt-br': 'Palavras inteiras' },
        caption: {
          en: 'One token per known word keeps common prose short, but any word outside the fixed list collapses to an unknown symbol—erasing names, typos, inflections, and new coinages.',
          'pt-br': 'Um token por palavra conhecida mantém a prosa comum curta, mas qualquer palavra fora da lista fixa vira um símbolo desconhecido — apagando nomes, erros de digitação, flexões e neologismos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'unbelievability', 'pt-br': 'unbelievability' }, detail: { en: '1 unit if it is in the list', 'pt-br': '1 unidade se estiver na lista' }, pigment: 'success' },
            { label: { en: 'Missing word', 'pt-br': 'Palavra ausente' }, detail: { en: 'collapses to an unknown symbol', 'pt-br': 'colapsa num símbolo desconhecido' }, pigment: 'danger' },
            { label: { en: 'Unbounded table', 'pt-br': 'Tabela sem limite' }, detail: { en: 'no finite list covers open text', 'pt-br': 'nenhuma lista finita cobre texto aberto' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Subwords', 'pt-br': 'Subpalavras' },
        caption: {
          en: 'Frequent words stay whole while rare words assemble from reusable pieces learned from a training corpus—cutting 15 character positions down to 4 without an unknown-word hole.',
          'pt-br': 'Palavras frequentes ficam inteiras enquanto palavras raras são montadas com pedaços reutilizáveis aprendidos de um corpus — reduzindo 15 posições de caractere para 4 sem o buraco do símbolo desconhecido.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'un', 'pt-br': 'un' }, detail: { en: 'reusable prefix', 'pt-br': 'prefixo reutilizável' }, pigment: 'accent' },
            { label: { en: 'believ', 'pt-br': 'believ' }, detail: { en: 'reusable stem', 'pt-br': 'radical reutilizável' }, pigment: 'accent' },
            { label: { en: 'abil', 'pt-br': 'abil' }, detail: { en: 'reusable piece', 'pt-br': 'pedaço reutilizável' }, pigment: 'accent' },
            { label: { en: 'ity', 'pt-br': 'ity' }, detail: { en: '4 units total, not 15', 'pt-br': '4 unidades no total, não 15' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Byte-level (Qwen)', 'pt-br': 'Byte-level no Qwen' },
        caption: {
          en: `Qwen3.8-27B normalizes to NFC, builds from 256 UTF-8 byte values (byte_fallback: false), and maps ${both(MAPPED_IDS).en} ids (${both(BPE_MODEL_IDS).en} BPE + ${ADDED_TOKEN_IDS} added) inside ${both(VOCAB_ROWS).en} tensor rows (${UNMAPPED_ROWS} unmapped).`,
          'pt-br': `O Qwen3.8-27B normaliza para NFC, parte dos 256 valores de byte UTF-8 (byte_fallback: false) e mapeia ${both(MAPPED_IDS)['pt-br']} ids (${both(BPE_MODEL_IDS)['pt-br']} do BPE + ${ADDED_TOKEN_IDS} adicionados) dentro de ${both(VOCAB_ROWS)['pt-br']} linhas de tensor (${UNMAPPED_ROWS} não mapeadas).`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'NFC + UTF-8 bytes', 'pt-br': 'NFC + bytes UTF-8' }, detail: { en: '256-byte base; no unknown id', 'pt-br': 'base de 256 bytes; sem id desconhecido' }, pigment: 'accent' },
            { label: { en: 'BPE entries', 'pt-br': 'Entradas BPE' }, detail: { en: `${both(BPE_MODEL_IDS).en} learned pieces`, 'pt-br': `${both(BPE_MODEL_IDS)['pt-br']} pedaços aprendidos` }, pigment: 'accent' },
            { label: { en: 'Added tokens', 'pt-br': 'Tokens adicionados' }, detail: { en: `+${ADDED_TOKEN_IDS} → ${both(MAPPED_IDS).en} mapped ids`, 'pt-br': `+${ADDED_TOKEN_IDS} → ${both(MAPPED_IDS)['pt-br']} ids mapeados` }, pigment: 'success' },
            { label: { en: 'Tensor rows', 'pt-br': 'Linhas de tensor' }, detail: { en: `${both(VOCAB_ROWS).en} total (${UNMAPPED_ROWS} unmapped, 512 × 485)`, 'pt-br': `${both(VOCAB_ROWS)['pt-br']} no total (${UNMAPPED_ROWS} sem mapa, 512 × 485)` }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 1.3 traces four BPE merges by hand across four dense paragraphs. Each merge
   * is one step here, with exactly the counts the prose uses — including the
   * recount after every merge, which is the step the lesson says people skip.
   */
  'bpe-merge-trace': {
    lesson: '1.3-bpe-step-by-step',
    title: { en: 'Four merges, counted by hand', 'pt-br': 'Quatro merges, contados à mão' },
    caption: {
      en:
        'A corpus of three words: low ×5, lower ×2, lowest ×3. After every merge the counts are recomputed, because merging destroys old neighbours and creates new ones — that recount is the step people skip.',
      'pt-br':
        'Um corpus de três palavras: low ×5, lower ×2, lowest ×3. Depois de cada merge as contagens são refeitas, porque cada merge destrói vizinhos antigos e cria novos — essa recontagem é a etapa que as pessoas pulam.',
    },
    steps: [
      {
        label: { en: 'Start', 'pt-br': 'Início' },
        caption: {
          en: 'Every word is split into characters with an end-of-word marker. Counting adjacent pairs, l+o and o+w tie at 10; the tie-break takes l+o.',
          'pt-br': 'Cada palavra é dividida em caracteres com um marcador de fim de palavra. Contando pares adjacentes, l+o e o+w empatam em 10; o desempate escolhe l+o.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'l o w _', 'pt-br': 'l o w _' }, detail: { en: '×5', 'pt-br': '×5' }, pigment: 'muted' },
            { label: { en: 'l o w e r _', 'pt-br': 'l o w e r _' }, detail: { en: '×2', 'pt-br': '×2' }, pigment: 'muted' },
            { label: { en: 'l o w e s t _', 'pt-br': 'l o w e s t _' }, detail: { en: '×3', 'pt-br': '×3' }, pigment: 'muted' },
            { label: { en: 'winning pair: l + o', 'pt-br': 'par vencedor: l + o' }, detail: { en: '5 + 2 + 3 = 10', 'pt-br': '5 + 2 + 3 = 10' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Merge 1', 'pt-br': 'Merge 1' },
        caption: {
          en: 'l+o becomes lo everywhere. Recount: the pair l+o no longer exists anywhere, and lo+w now wins outright at 10.',
          'pt-br': 'l+o vira lo em todo lugar. Recontagem: o par l+o não existe mais em lugar nenhum, e lo+w agora vence sozinho com 10.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'lo w _', 'pt-br': 'lo w _' }, detail: { en: '×5', 'pt-br': '×5' }, pigment: 'accent' },
            { label: { en: 'lo w e r _', 'pt-br': 'lo w e r _' }, detail: { en: '×2', 'pt-br': '×2' }, pigment: 'accent' },
            { label: { en: 'lo w e s t _', 'pt-br': 'lo w e s t _' }, detail: { en: '×3', 'pt-br': '×3' }, pigment: 'accent' },
            { label: { en: 'winning pair: lo + w', 'pt-br': 'par vencedor: lo + w' }, detail: { en: '10', 'pt-br': '10' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Merge 2', 'pt-br': 'Merge 2' },
        caption: {
          en: 'The vocabulary gains the piece low. Recount again: low+_ occurs 5 times and low+e occurs 2 + 3 = 5, a tie.',
          'pt-br': 'O vocabulário ganha o pedaço low. Nova recontagem: low+_ ocorre 5 vezes e low+e ocorre 2 + 3 = 5, um empate.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'low _', 'pt-br': 'low _' }, detail: { en: '×5', 'pt-br': '×5' }, pigment: 'accent' },
            { label: { en: 'low e r _', 'pt-br': 'low e r _' }, detail: { en: '×2', 'pt-br': '×2' }, pigment: 'accent' },
            { label: { en: 'low e s t _', 'pt-br': 'low e s t _' }, detail: { en: '×3', 'pt-br': '×3' }, pigment: 'accent' },
            { label: { en: 'tie: low + _ and low + e', 'pt-br': 'empate: low + _ e low + e' }, detail: { en: '5 and 5', 'pt-br': '5 e 5' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Merges 3 and 4', 'pt-br': 'Merges 3 e 4' },
        caption: {
          en: 'Four merges in, the algorithm has found something that looks like a morpheme, the smallest unit of a word that carries meaning. The reason is purely statistical: it has no concept of a morpheme, and the two halves of that string kept appearing side by side.',
          'pt-br': 'Após quatro merges, o algoritmo encontrou algo que parece um morfema, a menor unidade de uma palavra que carrega significado. A razão é puramente estatística: ele não tem conceito de morfema, e as duas metades daquela sequência viviam aparecendo lado a lado.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'low_', 'pt-br': 'low_' }, detail: { en: 'the standalone word', 'pt-br': 'a palavra isolada' }, pigment: 'success' },
            { label: { en: 'lowe', 'pt-br': 'lowe' }, detail: { en: 'shared stem of lower, lowest', 'pt-br': 'radical de lower, lowest' }, pigment: 'success' },
            { label: { en: 'merge list, in order', 'pt-br': 'lista de merges, em ordem' }, detail: { en: 'this, not the vocabulary, is what encoding replays', 'pt-br': 'isto, e não o vocabulário, é o que a codificação repete' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 1.4 contrasted three tokenizer families across three dense prose paragraphs.
   * Each family becomes one stepped pipeline showing where its assumptions enter
   * and what it trades off.
   */
  't1-tokenizer-families': {
    lesson: '1.4-sentencepiece-byte-level-token-counts',
    title: { en: 'Three tokenizer families, three pipelines', 'pt-br': 'Três famílias de tokenizers, três pipelines' },
    caption: {
      en: 'Each family reaches its token counts from different starting assumptions. None produces a language-neutral unit, so counts must be measured with the deployed tokenizer.',
      'pt-br': 'Cada família chega às suas contagens de tokens a partir de suposições iniciais diferentes. Nenhuma produz uma unidade neutra entre idiomas, então as contagens precisam ser medidas com o tokenizer em produção.',
    },
    steps: [
      {
        label: { en: 'Whitespace pre-split', 'pt-br': 'Pré-divisão por espaço' },
        caption: {
          en: 'Cutting on spaces and punctuation before learning subwords builds English-style word boundaries into preprocessing, which fits languages without spaces poorly.',
          'pt-br': 'Cortar em espaços e pontuação antes de aprender subpalavras embute fronteiras de palavra ao estilo do inglês no pré-processamento, o que se ajusta mal a idiomas sem espaços.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Raw text', 'pt-br': 'Texto bruto' }, detail: { en: 'before any subword rule', 'pt-br': 'antes de qualquer regra de subpalavra' }, pigment: 'muted' },
            { label: { en: 'Split on spaces', 'pt-br': 'Cortar nos espaços' }, detail: { en: 'punctuation and spaces cut first', 'pt-br': 'pontuação e espaços cortam primeiro' }, pigment: 'caution' },
            { label: { en: 'Learn subwords', 'pt-br': 'Aprender subpalavras' }, detail: { en: 'merges stay inside each chunk', 'pt-br': 'merges ficam dentro de cada bloco' }, pigment: 'accent' },
            { label: { en: 'Hidden bias', 'pt-br': 'Viés oculto' }, detail: { en: 'assumes space-separated words', 'pt-br': 'pressupõe palavras separadas por espaço' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'SentencePiece (Unigram)', 'pt-br': 'SentencePiece com Unigram' },
        caption: {
          en: 'SentencePiece treats whitespace as an explicit symbol so encoding and decoding reverse cleanly. Unigram starts with a large vocabulary and removes pieces that hurt corpus likelihood least; it can also sample among valid splits.',
          'pt-br': 'O SentencePiece trata o espaço em branco como um símbolo explícito, tornando codificação e decodificação reversíveis. O Unigram parte de um vocabulário grande e remove os pedaços que menos prejudicam a verossimilhança do corpus; ele também pode amostrar entre divisões válidas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Raw sentence', 'pt-br': 'Frase bruta' }, detail: { en: 'no prior whitespace split', 'pt-br': 'sem divisão prévia por espaço' }, pigment: 'accent' },
            { label: { en: 'Explicit space mark', 'pt-br': 'Símbolo de espaço' }, detail: { en: 'closed, reversible detokenization', 'pt-br': 'detokenização fechada e reversível' }, pigment: 'success' },
            { label: { en: 'Prune vocabulary', 'pt-br': 'Podar vocabulário' }, detail: { en: 'drop lowest-impact pieces to target size', 'pt-br': 'remove pedaços de menor impacto até o alvo' }, pigment: 'accent' },
            { label: { en: 'Multiple splits', 'pt-br': 'Várias divisões' }, detail: { en: 'can sample among valid segmentations', 'pt-br': 'pode amostrar entre segmentações válidas' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Byte-level BPE (Qwen)', 'pt-br': 'BPE byte-level (Qwen)' },
        caption: {
          en: 'Qwen3.8-27B normalizes valid Unicode with NFC, starts from UTF-8 byte units (byte_fallback: false), and replays ordered merges. Coverage is broad, but rare scripts still expand into more pieces.',
          'pt-br': 'O Qwen3.8-27B normaliza texto Unicode válido com NFC, parte de unidades derivadas de bytes UTF-8 (byte_fallback: false) e repete merges ordenados. A cobertura é ampla, mas escritas raras ainda viram mais pedaços.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'NFC Unicode', 'pt-br': 'Unicode NFC' }, detail: { en: 'canonical twins merged first', 'pt-br': 'grafias equivalentes unificadas antes' }, pigment: 'accent' },
            { label: { en: 'UTF-8 byte base', 'pt-br': 'Base em bytes UTF-8' }, detail: { en: 'covers valid text; no unknown id', 'pt-br': 'cobre texto válido; sem id desconhecido' }, pigment: 'success' },
            { label: { en: 'Ordered merges', 'pt-br': 'Merges ordenados' }, detail: { en: 'fixed rank list, deterministic split', 'pt-br': 'lista de ranks fixa, divisão determinística' }, pigment: 'accent' },
            { label: { en: 'Uneven length', 'pt-br': 'Comprimento desigual' }, detail: { en: 'coverage does not guarantee efficiency', 'pt-br': 'cobertura não garante eficiência' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 1.5 shows why assuming tied embeddings undercounts Qwen3.8-27B by more than
   * a billion parameters (~2.5 GB at 2 bytes per weight). Every count is derived
   * from QWEN in src/lib/model-facts.ts.
   */
  't1-untied-embedding-budget': {
    lesson: '1.5-embeddings-meaning-as-geometry',
    title: { en: 'Embedding share of Qwen3.8-27B: tied vs untied', 'pt-br': 'Fatia dos embeddings no Qwen3.8-27B: compartilhado vs separado' },
    caption: {
      en: `Each ${both(VOCAB_ROWS).en} × ${HIDDEN_SIZE} matrix holds ${both(EMBED_PARAMS).en} parameters (~4.7% of the ~27B marketed total, which includes the vision tower). Bar percentages round to whole numbers.`,
      'pt-br': `Cada matriz ${both(VOCAB_ROWS)['pt-br']} × ${HIDDEN_SIZE} guarda ${both(EMBED_PARAMS)['pt-br']} parâmetros (~4,7% do total comercial de ~27B, que inclui a torre de visão). As porcentagens das barras são arredondadas para inteiros.`,
    },
    steps: [
      {
        label: { en: 'Assumed tied (wrong shortcut)', 'pt-br': 'Suposto compartilhado (atalho errado)' },
        caption: {
          en: 'Assuming tie_word_embeddings is true counts only one 1.271B-parameter matrix—short by more than a billion parameters (~2.5 GB of weights at two bytes each).',
          'pt-br': 'Supor que tie_word_embeddings é true conta só uma matriz de 1,271 bilhão de parâmetros — ficando curto em mais de um bilhão de parâmetros (~2,5 GB de pesos a dois bytes cada).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'One shared matrix', 'pt-br': 'Uma matriz compartilhada' },
              detail: {
                en: `${both(VOCAB_ROWS).en} × ${HIDDEN_SIZE} = 1.271B params (~2.5 GB at 2 B/weight)`,
                'pt-br': `${both(VOCAB_ROWS)['pt-br']} × ${HIDDEN_SIZE} = 1,271B parâmetros (~2,5 GB a 2 B/peso)`,
              },
              pigment: 'caution',
              weight: EMBED_PARAMS,
            },
            {
              label: { en: 'Rest of the ~27B model', 'pt-br': 'Restante do modelo de ~27B' },
              detail: {
                en: `${LAYERS} layers + vision tower (~25.73B params)`,
                'pt-br': `${LAYERS} camadas + torre de visão (~25,73B parâmetros)`,
              },
              pigment: 'muted',
              weight: REST_TIED,
            },
          ],
        },
      },
      {
        label: { en: 'Untied (Qwen3.8-27B actual)', 'pt-br': 'Separado (Qwen3.8-27B real)' },
        caption: {
          en: 'Qwen3.8-27B sets tie_word_embeddings to false: input embeddings and the output language-model head are two separate matrices totaling ~2.54B parameters (~9.4%, nearly a tenth of the model).',
          'pt-br': 'O Qwen3.8-27B define tie_word_embeddings como false: o embedding de entrada e o language-model head na saída são duas matrizes separadas que somam ~2,54B parâmetros (~9,4%, quase um décimo do modelo).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Input embedding table', 'pt-br': 'Tabela de embeddings de entrada' },
              detail: {
                en: `${both(VOCAB_ROWS).en} × ${HIDDEN_SIZE} = 1.271B params`,
                'pt-br': `${both(VOCAB_ROWS)['pt-br']} × ${HIDDEN_SIZE} = 1,271B parâmetros`,
              },
              pigment: 'accent',
              weight: EMBED_PARAMS,
            },
            {
              label: { en: 'Output projection (LM head)', 'pt-br': 'Projeção de saída (LM head)' },
              detail: {
                en: `separate ${both(VOCAB_ROWS).en} × ${HIDDEN_SIZE} = 1.271B params`,
                'pt-br': `separada ${both(VOCAB_ROWS)['pt-br']} × ${HIDDEN_SIZE} = 1,271B parâmetros`,
              },
              pigment: 'success',
              weight: EMBED_PARAMS,
            },
            {
              label: { en: 'Rest of the ~27B model', 'pt-br': 'Restante do modelo de ~27B' },
              detail: {
                en: `${LAYERS} layers + vision tower (~24.46B params)`,
                'pt-br': `${LAYERS} camadas + torre de visão (~24,46B parâmetros)`,
              },
              pigment: 'muted',
              weight: REST_UNTIED,
            },
          ],
        },
      },
    ],
  },

  /**
   * 1.6 dismantles the famous king − man + woman = queen demonstration by
   * contrasting the standard candidate-exclusion rule with Linzen's (2016)
   * unexcluded evaluation on the exact same vector offset.
   */
  't1-analogy-protocol': {
    lesson: '1.6-word2vec-glove-analogy',
    title: { en: 'Same vector equation, two search rules', 'pt-br': 'A mesma equação vetorial, duas regras de busca' },
    caption: {
      en: 'Computing v_king − v_man + v_woman is only half of the benchmark. Keeping or excluding the three query words from the candidate set changes what finishes first.',
      'pt-br': 'Calcular v_king − v_man + v_woman é só metade do benchmark. Manter ou excluir as três palavras da consulta do conjunto de candidatos muda o que chega em primeiro lugar.',
    },
    steps: [
      {
        label: { en: 'Standard rule: exclude query', 'pt-br': 'Regra padrão: exclui consulta' },
        caption: {
          en: 'The standard protocol removes king, man, and woman before finding the nearest cosine neighbour, so queen frequently wins for select relation types.',
          'pt-br': 'O protocolo padrão remove king, man e woman antes de buscar o vizinho mais próximo por cosseno, então queen frequentemente vence para certos tipos de relação.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Vector offset', 'pt-br': 'Deslocamento vetorial' }, detail: { en: 'v_king − v_man + v_woman', 'pt-br': 'v_king − v_man + v_woman' }, pigment: 'accent' },
            { label: { en: 'Filter candidates', 'pt-br': 'Filtrar candidatos' }, detail: { en: 'drop king, man, woman from search', 'pt-br': 'remove king, man e woman da busca' }, pigment: 'caution' },
            { label: { en: 'Cosine search', 'pt-br': 'Busca por cosseno' }, detail: { en: 'nearest direction in remaining vocab', 'pt-br': 'direção mais próxima no restante do vocabulário' }, pigment: 'accent' },
            { label: { en: 'Top result', 'pt-br': 'Primeiro lugar' }, detail: { en: 'often queen under this protocol', 'pt-br': 'frequentemente queen sob este protocolo' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'No exclusion (Linzen, 2016)', 'pt-br': 'Sem exclusão (Linzen, 2016)' },
        caption: {
          en: 'Keep all words in the candidate list and a modest offset can leave an input word closest. Linzen (2016) reported drastic accuracy drops, including zero in several categories.',
          'pt-br': 'Mantenha todas as palavras na lista de candidatos e um deslocamento modesto pode deixar uma palavra de entrada mais próxima. Linzen (2016) reportou quedas drásticas de acurácia, incluindo zero em várias categorias.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Vector offset', 'pt-br': 'Deslocamento vetorial' }, detail: { en: 'same point: v_king − v_man + v_woman', 'pt-br': 'mesmo ponto: v_king − v_man + v_woman' }, pigment: 'muted' },
            { label: { en: 'Full vocabulary', 'pt-br': 'Vocabulário inteiro' }, detail: { en: 'king, man, woman stay candidates', 'pt-br': 'king, man e woman continuam candidatas' }, pigment: 'danger' },
            { label: { en: 'Cosine search', 'pt-br': 'Busca por cosseno' }, detail: { en: 'nearest direction across every word', 'pt-br': 'direção mais próxima entre todas as palavras' }, pigment: 'accent' },
            { label: { en: 'Top result', 'pt-br': 'Primeiro lugar' }, detail: { en: 'input word often stays closest; accuracy plunges', 'pt-br': 'palavra da consulta costuma vencer; acurácia despenca' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 1.7 works the denominator trap numerically: 2,886 bits over 1,000 tokens
   * gives PPL ≈ 7.4, plugging the same 2,886 bits over 1,400 tokens produces an
   * invalid ≈ 4.2 illusion, and bits per byte (S_A/B vs S_B/B) fixes the unit.
   */
  't1-perplexity-denominator': {
    lesson: '1.7-entropy-perplexity',
    title: { en: 'Why a different tokenizer breaks perplexity', 'pt-br': 'Por que outro tokenizer quebra a perplexity' },
    caption: {
      en: 'Perplexity averages surprise per token. Switching tokenizers changes both the prediction events and the denominator, so cross-tokenizer comparisons need a common unit such as bits per byte.',
      'pt-br': 'A perplexity faz a média da surpresa por token. Trocar de tokenizer muda tanto os eventos de predição quanto o denominador, então comparações entre tokenizers precisam de uma unidade comum, como bits por byte.',
    },
    steps: [
      {
        label: { en: 'Pair A (valid)', 'pt-br': 'Par A (válido)' },
        caption: {
          en: 'Pair A assigns 2,886 bits of total surprise across its own 1,000 tokens: 2.886 bits per token, giving perplexity 2^2.886 ≈ 7.4.',
          'pt-br': 'O par A atribui 2.886 bits de surpresa total aos seus próprios 1.000 tokens: 2,886 bits por token, dando perplexity 2^2,886 ≈ 7,4.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Total surprise S_A', 'pt-br': 'Surpresa total S_A' }, detail: { en: '2,886 bits measured on pair A', 'pt-br': '2.886 bits medidos no par A' }, pigment: 'accent' },
            { label: { en: 'Token count N_A', 'pt-br': 'Contagem N_A' }, detail: { en: '1,000 tokens from tokenizer A', 'pt-br': '1.000 tokens do tokenizer A' }, pigment: 'accent' },
            { label: { en: 'Mean per token', 'pt-br': 'Média por token' }, detail: { en: '2,886 / 1,000 = 2.886 bits/token', 'pt-br': '2.886 / 1.000 = 2,886 bits/token' }, pigment: 'accent' },
            { label: { en: 'Perplexity PPL_A', 'pt-br': 'Perplexity PPL_A' }, detail: { en: '2^2.886 ≈ 7.4', 'pt-br': '2^2,886 ≈ 7,4' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Invalid swap (wrong turn)', 'pt-br': 'Troca inválida (desvio errado)' },
        caption: {
          en: 'Reusing A’s 2,886 bits over B’s 1,400 tokens drops the number to ≈ 4.2 purely by enlarging the denominator. It does not evaluate pair B, which must measure its own total surprise S_B.',
          'pt-br': 'Reutilizar os 2.886 bits de A sobre os 1.400 tokens de B derruba o número para ≈ 4,2 apenas aumentando o denominador. Isso não avalia o par B, que precisa medir sua própria surpresa total S_B.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Reused S_A', 'pt-br': 'S_A reutilizado' }, detail: { en: '2,886 bits — does not describe pair B', 'pt-br': '2.886 bits — não descreve o par B' }, pigment: 'danger' },
            { label: { en: 'Token count N_B', 'pt-br': 'Contagem N_B' }, detail: { en: '1,400 tokens from tokenizer B', 'pt-br': '1.400 tokens do tokenizer B' }, pigment: 'caution' },
            { label: { en: 'Smaller ratio', 'pt-br': 'Razão menor' }, detail: { en: '2,886 / 1,400 ≈ 2.061 bits/token', 'pt-br': '2.886 / 1.400 ≈ 2,061 bits/token' }, pigment: 'danger' },
            { label: { en: 'Apparent PPL ≈ 4.2', 'pt-br': 'PPL aparente ≈ 4,2' }, detail: { en: 'denominator illusion, not a real score', 'pt-br': 'ilusão de denominador, não uma nota real' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Common unit: bits per byte', 'pt-br': 'Unidade comum: bits por byte' },
        caption: {
          en: 'Measure each pair’s own total surprise (S_A and S_B) on the same evaluation byte corpus and divide both by the same byte count B to get comparable bits per byte (BPB).',
          'pt-br': 'Meça a surpresa total própria de cada par (S_A e S_B) no mesmo corpus de avaliação em bytes e divida ambos pela mesma contagem de bytes B para obter bits por byte (BPB) comparáveis.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Measure each pair', 'pt-br': 'Medir cada par' }, detail: { en: 'pair A gives S_A; pair B gives S_B', 'pt-br': 'par A dá S_A; par B dá S_B' }, pigment: 'accent' },
            { label: { en: 'Shared byte count B', 'pt-br': 'Contagem comum B' }, detail: { en: 'same denominator for both pairs', 'pt-br': 'mesmo denominador para os dois pares' }, pigment: 'caution' },
            { label: { en: 'Bits per byte (BPB)', 'pt-br': 'Bits por byte (BPB)' }, detail: { en: 'S_A / B vs S_B / B', 'pt-br': 'S_A / B contra S_B / B' }, pigment: 'success' },
            { label: { en: 'Comparable unit', 'pt-br': 'Unidade comparável' }, detail: { en: 'same scale across segmentations', 'pt-br': 'mesma escala entre segmentações' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
