/**
 * Figures for track 20 — Human Approval & Durable Pauses.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The callback path mirrors `examples/agent-engineering/src/agentlab/approval/slack.py`
 * and `test_approval_slack.py`; the race mirrors `store.py` and `test_approval_lifecycle.py`.
 */
import type { Figure } from './types'

export const TRACK_20_FIGURES = {
  'approval-callback-path': {
    lesson: '20.4-slack-and-teams-approval-adapters',
    title: { en: 'One Slack click, from the button to a decision', 'pt-br': 'Um clique no Slack, do botão até a decisão' },
    caption: {
      en: 'The HTTP handler only authenticates, validates and queues, then answers. Who clicked and what the click binds to are decided later, by code that never reads a name from the payload.',
      'pt-br': 'O handler HTTP só autentica, valida e enfileira, e então responde. Quem clicou e a que o clique se vincula são decididos depois, por código que nunca lê um nome do payload.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Approver clicks Approve', 'pt-br': 'O aprovador clica em Approve' }, detail: { en: 'Slack POSTs the form-encoded payload', 'pt-br': 'O Slack envia o payload codificado como formulário' }, pigment: 'muted' },
        { label: { en: 'Signature and timestamp checked', 'pt-br': 'Assinatura e timestamp verificados' }, detail: { en: 'v0 HMAC-SHA256 over the raw body · within 5 min · else 401', 'pt-br': 'HMAC-SHA256 v0 sobre o corpo bruto · até 5 min · senão 401' }, pigment: 'accent' },
        { label: { en: 'Written to the inbox, keyed by body hash', 'pt-br': 'Gravado na caixa de entrada, pela hash do corpo' }, detail: { en: 'a duplicate delivery is not queued twice', 'pt-br': 'uma entrega duplicada não entra duas vezes na fila' }, pigment: 'accent' },
        { label: { en: 'HTTP 200 sent back', 'pt-br': 'HTTP 200 devolvido' }, detail: { en: 'within Slack’s 3-second window; nothing decided yet', 'pt-br': 'dentro da janela de 3 segundos do Slack; nada decidido ainda' }, pigment: 'success' },
        { label: { en: 'Worker maps workspace and user', 'pt-br': 'O worker mapeia workspace e usuário' }, detail: { en: 'runtime directory → Principal, or refused', 'pt-br': 'diretório do runtime → Principal, ou recusa' }, pigment: 'caution' },
        { label: { en: 'Store records one decision', 'pt-br': 'O store registra uma única decisão' }, detail: { en: 'approver check · deadline at arrival · pending → approved', 'pt-br': 'checagem do aprovador · prazo na chegada · pending → approved' }, pigment: 'success' },
      ],
    },
  },
  'approval-race': {
    lesson: '20.5-deny-expire-revoke-and-resume',
    title: { en: 'Approval and cancellation, in two orders', 'pt-br': 'Aprovação e cancelamento, em duas ordens' },
    caption: {
      en: 'Each operation runs as one write transaction that re-reads the row first, so whichever comes second sees what the first one did. Either order ends with at most one invoice.',
      'pt-br': 'Cada operação roda como uma transação de escrita que relê a linha primeiro, então a que vem depois vê o que a primeira fez. Qualquer ordem termina com no máximo uma fatura.',
    },
    steps: [
      {
        label: { en: 'Cancel before execute', 'pt-br': 'Cancelamento antes do execute' },
        caption: {
          en: 'Worker A saw approved a moment ago, but its execute re-reads the row inside the transaction and finds revoked.',
          'pt-br': 'O worker A viu approved um instante antes, mas seu execute relê a linha dentro da transação e encontra revoked.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Approver approves', 'pt-br': 'O aprovador aprova' }, detail: { en: 'pending → approved', 'pt-br': 'de pending para approved' }, pigment: 'accent' },
            { label: { en: 'Worker A reads the status', 'pt-br': 'O worker A lê o status' }, detail: { en: 'approved (time of check)', 'pt-br': 'approved (momento da checagem)' }, pigment: 'muted' },
            { label: { en: 'Buyer cancels the run', 'pt-br': 'O comprador cancela a execução' }, detail: { en: 'approved → revoked', 'pt-br': 'de approved para revoked' }, pigment: 'caution' },
            { label: { en: 'Worker A executes', 'pt-br': 'O worker A executa' }, detail: { en: 're-read finds revoked · refused', 'pt-br': 'a releitura encontra revoked · recusado' }, pigment: 'danger' },
            { label: { en: 'No invoice submitted', 'pt-br': 'Nenhuma fatura enviada' }, detail: { en: 'outbox empty', 'pt-br': 'outbox vazio' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Execute before cancel', 'pt-br': 'Execute antes do cancelamento' },
        caption: {
          en: 'The approval is consumed and the effect queued in one transaction. The late cancellation is refused and reported, because undoing a submission is a new action.',
          'pt-br': 'A aprovação é consumida e o efeito enfileirado numa só transação. O cancelamento tardio é recusado e informado, porque desfazer um envio é uma ação nova.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Approver approves', 'pt-br': 'O aprovador aprova' }, detail: { en: 'pending → approved', 'pt-br': 'de pending para approved' }, pigment: 'accent' },
            { label: { en: 'Worker A executes', 'pt-br': 'O worker A executa' }, detail: { en: 'approved → consumed · outbox row added', 'pt-br': 'approved → consumed · linha no outbox' }, pigment: 'success' },
            { label: { en: 'Buyer cancels the run', 'pt-br': 'O comprador cancela a execução' }, detail: { en: 'already consumed · refused', 'pt-br': 'já consumed · recusado' }, pigment: 'danger' },
            { label: { en: 'Worker B executes', 'pt-br': 'O worker B executa' }, detail: { en: 'already consumed · refused', 'pt-br': 'já consumed · recusado' }, pigment: 'danger' },
            { label: { en: 'One invoice submitted', 'pt-br': 'Uma fatura enviada' }, detail: { en: 'delivered once by the outbox', 'pt-br': 'entregue uma vez pelo outbox' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
