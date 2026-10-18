/**
 * Figures for track 19 — Memory & Context Engineering.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The lineage mirrors the Deletion fixture in
 * `examples/agent-engineering/tests/test_memory_store.py` and the two removal
 * rules in `src/agentlab/memory/store.py`.
 */
import type { Figure } from './types'

export const TRACK_19_FIGURES = {
  'memory-deletion-lineage': {
    lesson: '19.4-scoring-eviction-and-forgetting',
    title: { en: 'Eviction and deletion follow different rules', 'pt-br': 'Despejo e exclusão seguem regras diferentes' },
    caption: {
      en: 'turn-12 holds a phone number. A summary and a fact were made from it, and the vector index keeps its own copy of every record. Eviction removes one record to free space; a deletion request removes everything made from it.',
      'pt-br': 'turn-12 guarda um número de telefone. Um resumo e um fato foram feitos a partir dele, e o índice vetorial mantém sua própria cópia de cada registro. O despejo remove um registro para liberar espaço; um pedido de exclusão remove tudo o que foi feito a partir dele.',
    },
    steps: [
      {
        label: { en: 'Stored', 'pt-br': 'Guardado' },
        caption: {
          en: 'Each arrow is a derived_from link. A search for the number finds all three records.',
          'pt-br': 'Cada seta é um vínculo derived_from. Uma busca pelo número encontra os três registros.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'The user’s turn', 'pt-br': 'A fala do usuário' }, detail: { en: 'turn-12 · origin user', 'pt-br': 'turn-12 · origem user' }, pigment: 'accent' },
            { label: { en: 'A model summary of two turns', 'pt-br': 'Um resumo de duas falas feito pelo modelo' }, detail: { en: 'sum-1 · from turn-12 and turn-13', 'pt-br': 'sum-1 · de turn-12 e turn-13' }, pigment: 'accent' },
            { label: { en: 'An extracted fact', 'pt-br': 'Um fato extraído' }, detail: { en: 'fact-1 · from sum-1', 'pt-br': 'fact-1 · de sum-1' }, pigment: 'accent' },
            { label: { en: 'Copies in the vector index', 'pt-br': 'Cópias no índice vetorial' }, detail: { en: 'one per record', 'pt-br': 'uma por registro' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Evicted for space', 'pt-br': 'Despejado por espaço' },
        caption: {
          en: 'If eviction picks turn-12, it drops the turn and its index copy only. The summary is the short version kept on purpose, so it stays.',
          'pt-br': 'Se o despejo escolher turn-12, ele tira só a fala e sua cópia no índice. O resumo é a versão curta mantida de propósito, então ele fica.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'The user’s turn', 'pt-br': 'A fala do usuário' }, detail: { en: 'removed', 'pt-br': 'removida' }, pigment: 'danger' },
            { label: { en: 'A model summary of two turns', 'pt-br': 'Um resumo de duas falas feito pelo modelo' }, detail: { en: 'kept', 'pt-br': 'mantido' }, pigment: 'success' },
            { label: { en: 'An extracted fact', 'pt-br': 'Um fato extraído' }, detail: { en: 'kept', 'pt-br': 'mantido' }, pigment: 'success' },
            { label: { en: 'Copies in the vector index', 'pt-br': 'Cópias no índice vetorial' }, detail: { en: 'turn-12’s copy removed', 'pt-br': 'cópia de turn-12 removida' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Deleted on request', 'pt-br': 'Excluído a pedido' },
        caption: {
          en: 'forget("turn-12") follows the links: the summary and the fact go too, with their index copies. turn-13 and records from other sources stay.',
          'pt-br': 'forget("turn-12") segue os vínculos: o resumo e o fato também saem, com suas cópias no índice. turn-13 e registros de outras fontes ficam.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'The user’s turn', 'pt-br': 'A fala do usuário' }, detail: { en: 'removed', 'pt-br': 'removida' }, pigment: 'danger' },
            { label: { en: 'A model summary of two turns', 'pt-br': 'Um resumo de duas falas feito pelo modelo' }, detail: { en: 'removed', 'pt-br': 'removido' }, pigment: 'danger' },
            { label: { en: 'An extracted fact', 'pt-br': 'Um fato extraído' }, detail: { en: 'removed', 'pt-br': 'removido' }, pigment: 'danger' },
            { label: { en: 'Copies in the vector index', 'pt-br': 'Cópias no índice vetorial' }, detail: { en: 'three copies removed', 'pt-br': 'três cópias removidas' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
