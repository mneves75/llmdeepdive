/**
 * Figures for track 14 — Agent Architecture & Durable State.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The run paths mirror `examples/agent-engineering/src/agentlab/state/transitions.py`
 * and its tests; the lost-reply timeline mirrors `outbox.py` and `test_state_outbox.py`.
 */
import type { Figure, FigureStep } from './types'

const received: FigureStep = { label: { en: 'Request received', 'pt-br': 'Pedido recebido' }, detail: { en: 'received · step 0', 'pt-br': 'received · passo 0' }, pigment: 'muted' }

export const TRACK_14_FIGURES = {
  'agent-run-paths': {
    lesson: '14.2-states-dags-branches-and-loops',
    title: { en: 'Three paths through one transition table', 'pt-br': 'Três caminhos pela mesma tabela de transições' },
    caption: {
      en: 'Every arrow is a row of the table. The loop through needs_info is legal, so only the step budget stops a supplier who never answers.',
      'pt-br': 'Cada seta é uma linha da tabela. O laço por needs_info é legal, então só o orçamento de passos para um fornecedor que nunca responde.',
    },
    steps: [
      {
        label: { en: 'Straight through', 'pt-br': 'Direto ao fim' },
        caption: {
          en: 'The invoice matches the purchase order on the first check: three moves, well inside the default budget of 12.',
          'pt-br': 'A fatura bate com o pedido de compra na primeira verificação: três movimentos, bem dentro do orçamento padrão de 12.',
        },
        body: {
          kind: 'flow',
          steps: [
            received,
            { label: { en: 'Invoice checked', 'pt-br': 'Fatura verificada' }, detail: { en: 'checked · step 1', 'pt-br': 'checked · passo 1' }, pigment: 'accent' },
            { label: { en: 'Ready to complete', 'pt-br': 'Pronta para concluir' }, detail: { en: 'ready · step 2', 'pt-br': 'ready · passo 2' }, pigment: 'accent' },
            { label: { en: 'Run completed', 'pt-br': 'Execução concluída' }, detail: { en: 'completed · step 3', 'pt-br': 'completed · passo 3' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'One revision loop', 'pt-br': 'Um laço de revisão' },
        caption: {
          en: 'The quantity is missing, the supplier answers, and the second check passes. The cycle ran once and the run still finished.',
          'pt-br': 'Falta a quantidade, o fornecedor responde e a segunda verificação passa. O ciclo rodou uma vez e a execução ainda terminou.',
        },
        body: {
          kind: 'flow',
          steps: [
            received,
            { label: { en: 'Invoice checked', 'pt-br': 'Fatura verificada' }, detail: { en: 'checked · step 1', 'pt-br': 'checked · passo 1' }, pigment: 'accent' },
            { label: { en: 'Asked the supplier', 'pt-br': 'Fornecedor consultado' }, detail: { en: 'needs_info · step 2', 'pt-br': 'needs_info · passo 2' }, pigment: 'caution' },
            { label: { en: 'Checked again', 'pt-br': 'Verificada de novo' }, detail: { en: 'checked · step 3', 'pt-br': 'checked · passo 3' }, pigment: 'accent' },
            { label: { en: 'Ready to complete', 'pt-br': 'Pronta para concluir' }, detail: { en: 'ready · step 4', 'pt-br': 'ready · passo 4' }, pigment: 'accent' },
            { label: { en: 'Run completed', 'pt-br': 'Execução concluída' }, detail: { en: 'completed · step 5', 'pt-br': 'completed · passo 5' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Budget exhausted', 'pt-br': 'Orçamento esgotado' },
        caption: {
          en: 'With a budget of 5 and a supplier who never answers, the fifth move would not finish the run, so it ends the run in failed instead.',
          'pt-br': 'Com orçamento de 5 e um fornecedor que nunca responde, o quinto movimento não terminaria a execução, então ele a encerra em failed.',
        },
        body: {
          kind: 'flow',
          steps: [
            received,
            { label: { en: 'Invoice checked', 'pt-br': 'Fatura verificada' }, detail: { en: 'checked · step 1', 'pt-br': 'checked · passo 1' }, pigment: 'accent' },
            { label: { en: 'Asked the supplier', 'pt-br': 'Fornecedor consultado' }, detail: { en: 'needs_info · step 2', 'pt-br': 'needs_info · passo 2' }, pigment: 'caution' },
            { label: { en: 'Checked again', 'pt-br': 'Verificada de novo' }, detail: { en: 'checked · step 3', 'pt-br': 'checked · passo 3' }, pigment: 'accent' },
            { label: { en: 'Asked again', 'pt-br': 'Consultado de novo' }, detail: { en: 'needs_info · step 4', 'pt-br': 'needs_info · passo 4' }, pigment: 'caution' },
            { label: { en: 'Budget spent', 'pt-br': 'Orçamento gasto' }, detail: { en: 'failed · step 5', 'pt-br': 'failed · passo 5' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
  'outbox-lost-reply': {
    lesson: '14.4-replay-and-side-effects',
    title: { en: 'A lost reply, from commit to reconciliation', 'pt-br': 'Uma resposta perdida, do commit à reconciliação' },
    caption: {
      en: 'The accounts-payable system wrote the invoice, but the sender never heard back. The idempotency key lets it ask what happened instead of creating a second invoice.',
      'pt-br': 'O sistema de contas a pagar gravou a fatura, mas quem enviou nunca recebeu resposta. A chave de idempotência permite perguntar o que aconteceu em vez de criar uma segunda fatura.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'State and outbox row commit together', 'pt-br': 'Estado e linha do outbox gravados juntos' }, detail: { en: 'ready · outbox row pending', 'pt-br': 'ready · linha do outbox em pending' }, pigment: 'accent' },
        { label: { en: 'Deliverer sends with the key', 'pt-br': 'O entregador envia com a chave' }, detail: { en: 'run-1:create_invoice', 'pt-br': 'run-1:create_invoice' }, pigment: 'accent' },
        { label: { en: 'Service records the invoice', 'pt-br': 'O serviço registra a fatura' }, detail: { en: 'AP-0001 stored under the key', 'pt-br': 'AP-0001 guardada sob a chave' }, pigment: 'success' },
        { label: { en: 'Reply lost on the way back', 'pt-br': 'Resposta perdida na volta' }, detail: { en: 'outcome unknown → reconciling', 'pt-br': 'resultado desconhecido → reconciling' }, pigment: 'danger' },
        { label: { en: 'Reconcile asks by key', 'pt-br': 'A reconciliação pergunta pela chave' }, detail: { en: 'find → AP-0001', 'pt-br': 'find → AP-0001' }, pigment: 'caution' },
        { label: { en: 'Row marked done, one invoice', 'pt-br': 'Linha marcada done, uma fatura' }, detail: { en: 'no second create call', 'pt-br': 'nenhuma segunda chamada a create' }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
