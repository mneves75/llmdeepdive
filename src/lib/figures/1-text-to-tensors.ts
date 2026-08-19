/**
 * Figures for track 1 — From Text to Tensors.
 */
import type { Figure } from './types'

export const TRACK_1_FIGURES = {
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
        'Um corpus de três palavras: low ×5, lower ×2, lowest ×3. Depois de cada merge as contagens são refeitas, porque unir destrói vizinhos antigos e cria novos — esse recount é a etapa que as pessoas pulam.',
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
            { label: { en: 'winning pair: l + o', 'pt-br': 'par vencedor: l + o' }, detail: { en: '5 + 2 + 3 = 10', 'pt-br': '5 + 2 + 3 = 10' }, pigment: 'sonar' },
          ],
        },
      },
      {
        label: { en: 'Merge 1', 'pt-br': 'Merge 1' },
        caption: {
          en: 'l+o becomes lo everywhere. Recount: the pair l+o no longer exists anywhere, and lo+w now wins outright at 10.',
          'pt-br': 'l+o vira lo em todo lugar. Recount: o par l+o não existe mais em lugar nenhum, e lo+w agora vence sozinho com 10.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'lo w _', 'pt-br': 'lo w _' }, detail: { en: '×5', 'pt-br': '×5' }, pigment: 'accent' },
            { label: { en: 'lo w e r _', 'pt-br': 'lo w e r _' }, detail: { en: '×2', 'pt-br': '×2' }, pigment: 'accent' },
            { label: { en: 'lo w e s t _', 'pt-br': 'lo w e s t _' }, detail: { en: '×3', 'pt-br': '×3' }, pigment: 'accent' },
            { label: { en: 'winning pair: lo + w', 'pt-br': 'par vencedor: lo + w' }, detail: { en: '10', 'pt-br': '10' }, pigment: 'sonar' },
          ],
        },
      },
      {
        label: { en: 'Merge 2', 'pt-br': 'Merge 2' },
        caption: {
          en: 'The vocabulary gains the piece low. Recount again: low+_ occurs 5 times and low+e occurs 2 + 3 = 5, a tie.',
          'pt-br': 'O vocabulário ganha a peça low. Recount de novo: low+_ ocorre 5 vezes e low+e ocorre 2 + 3 = 5, um empate.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'low _', 'pt-br': 'low _' }, detail: { en: '×5', 'pt-br': '×5' }, pigment: 'accent' },
            { label: { en: 'low e r _', 'pt-br': 'low e r _' }, detail: { en: '×2', 'pt-br': '×2' }, pigment: 'accent' },
            { label: { en: 'low e s t _', 'pt-br': 'low e s t _' }, detail: { en: '×3', 'pt-br': '×3' }, pigment: 'accent' },
            { label: { en: 'tie: low + _ and low + e', 'pt-br': 'empate: low + _ e low + e' }, detail: { en: '5 and 5', 'pt-br': '5 e 5' }, pigment: 'sonar' },
          ],
        },
      },
      {
        label: { en: 'Merges 3 and 4', 'pt-br': 'Merges 3 e 4' },
        caption: {
          en: 'Four merges in, the algorithm has found something that looks like a morpheme — for a purely statistical reason. It has no concept of one; that string simply kept being adjacent to itself.',
          'pt-br': 'Após quatro merges, o algoritmo encontrou algo que parece um morfema — por uma razão puramente estatística. Ele não tem conceito de morfema; aquela sequência apenas continuou adjacente a si mesma.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'low_', 'pt-br': 'low_' }, detail: { en: 'the standalone word', 'pt-br': 'a palavra isolada' }, pigment: 'kelp' },
            { label: { en: 'lowe', 'pt-br': 'lowe' }, detail: { en: 'shared stem of lower, lowest', 'pt-br': 'radical de lower, lowest' }, pigment: 'kelp' },
            { label: { en: 'merge list, in order', 'pt-br': 'lista de merges, em ordem' }, detail: { en: 'this, not the vocabulary, is what encoding replays', 'pt-br': 'isto, e não o vocabulário, é o que a codificação repete' }, pigment: 'sonar' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
