/**
 * Figures for track 20 — Human Approval & Durable Pauses.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The policy, binding and durable-wait figures mirror `policy.py`, `binding.py`,
 * `store.py` and `temporal.py`; the callback path mirrors
 * `examples/agent-engineering/src/agentlab/approval/slack.py` and
 * `test_approval_slack.py`; the race mirrors `store.py` and
 * `test_approval_lifecycle.py`.
 */
import type { Figure } from './types'

export const TRACK_20_FIGURES = {
  't20-approval-policy-checks': {
    lesson: '20.1-decide-when-approval-is-needed',
    title: { en: 'How needs_approval routes four actions', 'pt-br': 'Como needs_approval encaminha quatro ações' },
    caption: {
      en: 'Every action enters the same ordered checks: the company effect table first, then the currency limit for irreversible writes. Any missing rule stops the chain and holds the action for a person.',
      'pt-br': 'Toda ação passa pela mesma sequência de checagens: primeiro a tabela de efeitos da empresa, depois o limite da moeda para escritas irreversíveis. Qualquer regra ausente interrompe a cadeia e retém a ação para uma pessoa.',
    },
    steps: [
      {
        label: { en: 'Read or draft', 'pt-br': 'Leitura ou rascunho' },
        caption: {
          en: 'lookup_po is a read and create_invoice_draft for USD 10,000.00 is reversible. Both stop early at the effect check and run without waiting for a person.',
          'pt-br': 'lookup_po é leitura e create_invoice_draft de USD 10.000,00 é reversível. Ambas param cedo na checagem de efeito e rodam sem esperar por uma pessoa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Tool call arrives', 'pt-br': 'A chamada chega' }, detail: { en: 'lookup_po or create_invoice_draft (USD 10,000.00)', 'pt-br': 'lookup_po ou create_invoice_draft (USD 10.000,00)' }, pigment: 'muted' },
            { label: { en: 'EFFECTS lookup', 'pt-br': 'Consulta em EFFECTS' }, detail: { en: 'read or reversible — nothing leaves the company', 'pt-br': 'read ou reversible — nada sai da empresa' }, pigment: 'accent' },
            { label: { en: 'Runs alone', 'pt-br': 'Roda sozinha' }, detail: { en: 'Need(False) · amount limit is not checked', 'pt-br': 'Need(False) · o limite de valor nem é checado' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Below the limit', 'pt-br': 'Abaixo do limite' },
        caption: {
          en: 'submit_invoice cannot be undone, so the function checks AUTO_LIMITS for USD. Because USD 999.99 is strictly below USD 1,000.00, it proceeds alone.',
          'pt-br': 'submit_invoice não pode ser desfeita, então a função consulta AUTO_LIMITS para USD. Como USD 999,99 está abaixo de USD 1.000,00, ela segue sozinha.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'submit_invoice arrives', 'pt-br': 'Chega submit_invoice' }, detail: { en: 'draft for USD 999.99', 'pt-br': 'rascunho de USD 999,99' }, pigment: 'muted' },
            { label: { en: 'EFFECTS lookup', 'pt-br': 'Consulta em EFFECTS' }, detail: { en: 'irreversible — requires a bound', 'pt-br': 'irreversible — exige um limite' }, pigment: 'accent' },
            { label: { en: 'USD limit check', 'pt-br': 'Checagem do limite USD' }, detail: { en: 'limit is USD 1,000.00 · 999.99 < 1,000.00', 'pt-br': 'o limite é USD 1.000,00 · 999,99 < 1.000,00' }, pigment: 'accent' },
            { label: { en: 'Runs alone', 'pt-br': 'Roda sozinha' }, detail: { en: 'Need(False) · below the USD 1,000.00 limit', 'pt-br': 'Need(False) · abaixo do limite de USD 1.000,00' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'At or above limit', 'pt-br': 'No limite ou acima' },
        caption: {
          en: 'The comparison uses >=, so both USD 1,000.00 exactly and INV-0042 at USD 10,000.00 are held for an approver.',
          'pt-br': 'A comparação usa >=, então tanto USD 1.000,00 exatos quanto a INV-0042 de USD 10.000,00 ficam retidos para um aprovador.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'submit_invoice arrives', 'pt-br': 'Chega submit_invoice' }, detail: { en: 'INV-0042 for USD 10,000.00 (or USD 1,000.00)', 'pt-br': 'INV-0042 de USD 10.000,00 (ou USD 1.000,00)' }, pigment: 'muted' },
            { label: { en: 'EFFECTS lookup', 'pt-br': 'Consulta em EFFECTS' }, detail: { en: 'irreversible — cannot be recalled', 'pt-br': 'irreversible — não pode ser desfeita' }, pigment: 'accent' },
            { label: { en: 'USD limit check', 'pt-br': 'Checagem do limite USD' }, detail: { en: 'amount >= USD 1,000.00', 'pt-br': 'valor >= USD 1.000,00' }, pigment: 'caution' },
            { label: { en: 'Held for a person', 'pt-br': 'Retida para uma pessoa' }, detail: { en: 'Need(True) · waits for an approver', 'pt-br': 'Need(True) · espera por um aprovador' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Missing rule', 'pt-br': 'Regra ausente' },
        caption: {
          en: 'An unlisted tool (pay_invoice), an irreversible tool with no amount (email_supplier), or a currency missing from AUTO_LIMITS (EUR) all hit the fail-safe default and wait for a person.',
          'pt-br': 'Uma ferramenta fora da tabela (pay_invoice), uma ação irreversível sem valor (email_supplier) ou uma moeda ausente em AUTO_LIMITS (EUR) caem no padrão à prova de falhas e esperam por uma pessoa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Unbounded action arrives', 'pt-br': 'Chega ação sem regra' }, detail: { en: 'pay_invoice, email_supplier, or EUR draft', 'pt-br': 'pay_invoice, email_supplier ou rascunho em EUR' }, pigment: 'muted' },
            { label: { en: 'Missing table entry or amount', 'pt-br': 'Falta entrada na tabela ou valor' }, detail: { en: 'no effect class, no draft, or no currency limit', 'pt-br': 'sem classe de efeito, sem rascunho ou sem limite de moeda' }, pigment: 'caution' },
            { label: { en: 'Held by default', 'pt-br': 'Retida por padrão' }, detail: { en: 'Need(True) · never fails open', 'pt-br': 'Need(True) · nunca falha aberta' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
  't20-approval-binding-check': {
    lesson: '20.2-bind-approval-to-one-operation',
    title: { en: 'How covers checks a draft before execution', 'pt-br': 'Como covers confere um rascunho antes da execução' },
    caption: {
      en: 'ApprovalRequest freezes the canonical SHA-256 hash of the approved draft and an expiry timestamp. Right before execution, covers checks the clock first and then recomputes the hash.',
      'pt-br': 'ApprovalRequest congela a hash SHA-256 canônica do rascunho aprovado e um prazo de validade. Logo antes da execução, covers confere primeiro o relógio e depois recalcula a hash.',
    },
    steps: [
      {
        label: { en: 'Unchanged at 09:00', 'pt-br': 'Inalterado às 09:00' },
        caption: {
          en: 'The draft matches every field the approver saw in the preview. Even if JSON key order or spacing differed earlier, canonical JSON produces the exact same SHA-256 digest.',
          'pt-br': 'O rascunho bate em todos os campos que o aprovador viu na prévia. Mesmo que a ordem das chaves ou os espaços no JSON fossem outros antes, o JSON canônico produz exatamente a mesma hash SHA-256.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'INV-0042 version 1', 'pt-br': 'INV-0042 versão 1' }, detail: { en: 'Supplier Gamma · USD 10,000.00 · before expires_at', 'pt-br': 'Supplier Gamma · USD 10.000,00 · antes de expires_at' }, pigment: 'muted' },
            { label: { en: 'Canonical JSON', 'pt-br': 'JSON canônico' }, detail: { en: 'sorted keys, no spaces, amount as text', 'pt-br': 'chaves ordenadas, sem espaços, valor como texto' }, pigment: 'accent' },
            { label: { en: 'SHA-256 matches request', 'pt-br': 'SHA-256 bate com o pedido' }, detail: { en: '64-character digest equals stored hash', 'pt-br': 'resumo de 64 caracteres igual à hash gravada' }, pigment: 'accent' },
            { label: { en: 'covers allows', 'pt-br': 'covers permite' }, detail: { en: 'Decision(True) · approved draft, in time', 'pt-br': 'Decision(True) · rascunho aprovado, no prazo' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Payee edited at 09:05', 'pt-br': 'Beneficiário alterado às 09:05' },
        caption: {
          en: 'An injected message switches the payee to Supplier Omega while keeping INV-0042 and version 1. The canonical bytes change, the digest mismatches, and covers refuses.',
          'pt-br': 'Uma mensagem injetada troca o beneficiário para Supplier Omega mantendo INV-0042 e versão 1. Os bytes canônicos mudam, o resumo não bate, e covers recusa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Edited INV-0042 version 1', 'pt-br': 'INV-0042 versão 1 editada' }, detail: { en: 'Supplier Omega · same id, version and amount', 'pt-br': 'Supplier Omega · mesmo id, versão e valor' }, pigment: 'caution' },
            { label: { en: 'Canonical JSON', 'pt-br': 'JSON canônico' }, detail: { en: 'payee field changed → different bytes', 'pt-br': 'campo payee mudou → bytes diferentes' }, pigment: 'caution' },
            { label: { en: 'SHA-256 mismatch', 'pt-br': 'SHA-256 não bate' }, detail: { en: 'recomputed digest differs from stored hash', 'pt-br': 'resumo recalculado difere da hash gravada' }, pigment: 'danger' },
            { label: { en: 'covers refuses', 'pt-br': 'covers recusa' }, detail: { en: 'Decision(False) · needs a new approval request', 'pt-br': 'Decision(False) · exige novo pedido de aprovação' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'After the deadline', 'pt-br': 'Depois do prazo' },
        caption: {
          en: 'On day four, the draft is untouched, but now >= expires_at stops execution on the very first check. An expired approval is void even for the exact original draft.',
          'pt-br': 'No quarto dia, o rascunho está intacto, mas now >= expires_at barra a execução logo na primeira checagem. Uma aprovação vencida perde a validade mesmo para o rascunho original.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Unchanged INV-0042 version 1', 'pt-br': 'INV-0042 versão 1 intacta' }, detail: { en: 'Supplier Gamma · USD 10,000.00 · day 4', 'pt-br': 'Supplier Gamma · USD 10.000,00 · dia 4' }, pigment: 'muted' },
            { label: { en: 'Clock check fails first', 'pt-br': 'Checagem de prazo falha primeiro' }, detail: { en: 'now >= request.expires_at (timezone-aware)', 'pt-br': 'now >= request.expires_at (com fuso horário)' }, pigment: 'danger' },
            { label: { en: 'covers refuses', 'pt-br': 'covers recusa' }, detail: { en: 'Decision(False) · approval expired', 'pt-br': 'Decision(False) · aprovação expirada' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
  't20-durable-wait-lifecycle': {
    lesson: '20.3-durable-waits-and-callbacks',
    title: { en: 'Three days across a crash, two implementations', 'pt-br': 'Três dias atravessando uma queda, duas implementações' },
    caption: {
      en: 'Neither implementation keeps a worker alive between Monday and Thursday. Durable state — a SQLite row on disk or an event history and timer on Temporal — outlives restarts.',
      'pt-br': 'Nenhuma das implementações mantém um worker vivo de segunda a quinta. O estado durável — uma linha no SQLite em disco ou um histórico de eventos e timer no Temporal — sobrevive a reinícios.',
    },
    steps: [
      {
        label: { en: 'SQLite row', 'pt-br': 'Linha no SQLite' },
        caption: {
          en: 'open writes a pending row with expires_at and lets the worker exit. After a crash or deploy, any new worker reads the file and runs decide inside BEGIN IMMEDIATE.',
          'pt-br': 'open grava uma linha pending com expires_at e deixa o worker sair. Depois de uma queda ou deploy, qualquer worker novo lê o arquivo e roda decide dentro de BEGIN IMMEDIATE.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Monday 09:00: open', 'pt-br': 'Segunda 09:00: open' }, detail: { en: 'saves pending row + deadline; worker exits', 'pt-br': 'grava linha pending + prazo; worker sai' }, pigment: 'accent' },
            { label: { en: 'Deploy and crash', 'pt-br': 'Deploy e queda' }, detail: { en: 'no process sleeps; row stays on disk', 'pt-br': 'nenhum processo dorme; linha fica no disco' }, pigment: 'muted' },
            { label: { en: 'Callback arrives', 'pt-br': 'Chega o callback' }, detail: { en: 'approver clicks before Thursday 09:00', 'pt-br': 'aprovador clica antes de quinta 09:00' }, pigment: 'accent' },
            { label: { en: 'Locked transaction', 'pt-br': 'Transação travada' }, detail: { en: 'BEGIN IMMEDIATE: checks deadline and approver', 'pt-br': 'BEGIN IMMEDIATE: checa prazo e aprovador' }, pigment: 'caution' },
            { label: { en: 'Row updated once', 'pt-br': 'Linha atualizada uma vez' }, detail: { en: 'compare-and-swap: pending → approved', 'pt-br': 'compare-and-swap: de pending para approved' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Temporal workflow', 'pt-br': 'Workflow no Temporal' },
        caption: {
          en: 'wait_condition creates a timer on the Temporal server. After the worker shuts down and another starts, an Update validator rejects invalid decisions before they reach history.',
          'pt-br': 'wait_condition cria um timer no servidor do Temporal. Depois que o worker desliga e outro sobe, o validador do Update rejeita decisões inválidas antes que cheguem ao histórico.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Monday 09:00: run', 'pt-br': 'Segunda 09:00: run' }, detail: { en: 'wait_condition sets server timer; worker stops', 'pt-br': 'wait_condition cria timer no servidor; worker para' }, pigment: 'accent' },
            { label: { en: 'No worker running', 'pt-br': 'Nenhum worker ativo' }, detail: { en: 'history and timer stay on Temporal server', 'pt-br': 'histórico e timer ficam no servidor Temporal' }, pigment: 'muted' },
            { label: { en: 'New worker replays', 'pt-br': 'Novo worker reproduz' }, detail: { en: 'rebuilds workflow state from event history', 'pt-br': 'reconstrói o estado do workflow pelo histórico' }, pigment: 'accent' },
            { label: { en: 'Update validator', 'pt-br': 'Validador do Update' }, detail: { en: 'checks hash and approver; rejects bad calls', 'pt-br': 'checa hash e aprovador; rejeita chamadas ruins' }, pigment: 'caution' },
            { label: { en: 'Decision accepted', 'pt-br': 'Decisão aceita' }, detail: { en: 'written to history; server timer cancelled', 'pt-br': 'gravada no histórico; timer no servidor cancelado' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Deadline passes', 'pt-br': 'O prazo vence' },
        caption: {
          en: 'If Thursday 09:00 arrives with no valid decision, both implementations close the wait as expired and submit nothing.',
          'pt-br': 'Se quinta 09:00 chegar sem decisão válida, as duas implementações encerram a espera como expired e não enviam nada.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Thursday 09:00 reached', 'pt-br': 'Quinta 09:00 atingida' }, detail: { en: 'now >= expires_at with status still pending', 'pt-br': 'now >= expires_at com status ainda pending' }, pigment: 'muted' },
            { label: { en: 'SQLite expiry path', 'pt-br': 'Caminho de expiração no SQLite' }, detail: { en: 'expire_due sweeper or a late decide marks expired', 'pt-br': 'varredor expire_due ou decide atrasado marca expired' }, pigment: 'caution' },
            { label: { en: 'Temporal timer fires', 'pt-br': 'Timer do Temporal dispara' }, detail: { en: 'wait_condition raises TimeoutError → expired', 'pt-br': 'wait_condition levanta TimeoutError → expired' }, pigment: 'caution' },
            { label: { en: 'No invoice submitted', 'pt-br': 'Nenhuma fatura enviada' }, detail: { en: 'a late click is refused; a new request is needed', 'pt-br': 'clique atrasado é recusado; exige novo pedido' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
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
