/**
 * Figures for track 23 — Trajectory Evaluation & CI.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import type { Figure } from './types'

/** 23.5: independent trials with per-trial success p = 0.8, for k = 1..8. */
const passKAxes = {
  xAxis: {
    label: { en: 'Repeated trials (k)', 'pt-br': 'Tentativas repetidas (k)' },
    scale: 'linear',
    min: 1,
    max: 8,
  },
  yAxis: {
    label: { en: 'Probability', 'pt-br': 'Probabilidade' },
    scale: 'linear',
    min: 0,
    max: 1,
  },
} as const

const passAtKPoints = [
  [1, 0.8],
  [2, 0.96],
  [3, 0.992],
  [4, 0.9984],
  [5, 0.99968],
  [6, 0.999936],
  [7, 0.9999872],
  [8, 0.99999744],
] as const

const passPowerKPoints = [
  [1, 0.8],
  [2, 0.64],
  [3, 0.512],
  [4, 0.4096],
  [5, 0.3277],
  [6, 0.2621],
  [7, 0.2097],
  [8, 0.1678],
] as const

export const TRACK_23_FIGURES = {
  /**
   * 23.1 listed all eight events of a trial with a denied approval inline.
   * Stepping through lookup, denial and draft shows seq, causal parent and why
   * run.reply sits last outside the outcome grader.
   */
  't23-trial-trace-chain': {
    lesson: '23.1-define-success-and-capture-traces',
    title: { en: 'One trial as a causal chain of events', 'pt-br': 'Uma tentativa como cadeia causal de eventos' },
    caption: {
      en: 'Each event gets a sequence number (seq), and causally dependent events (tool.call and run.reply) record the seq of the event that caused them (parent). Reading the denial in place, between the two tool calls, is what makes a trace useful for debugging.',
      'pt-br': 'Cada evento recebe um número de sequência (seq), e eventos causalmente ligados (tool.call e run.reply) gravam o seq do evento que os causou (parent). Ler a recusa no lugar em que ocorreu, entre as duas chamadas de ferramenta, é o que torna um trace útil para depurar.',
    },
    steps: [
      {
        label: { en: 'Look up PO-1001', 'pt-br': 'Consultar PO-1001' },
        caption: {
          en: 'The trial starts at seq 0. Before lookup_po runs, the gate logs policy.allowed at seq 1, and tool.call at seq 2 records parent: 1.',
          'pt-br': 'A tentativa começa em seq 0. Antes de lookup_po rodar, o gate registra policy.allowed em seq 1, e tool.call em seq 2 grava parent: 1.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'seq 0 · run.started', 'pt-br': 'seq 0 · run.started' }, detail: { en: 'trial opens (parent: none)', 'pt-br': 'tentativa inicia (parent: nenhum)' }, pigment: 'muted' },
            { label: { en: 'seq 1 · policy.allowed', 'pt-br': 'seq 1 · policy.allowed' }, detail: { en: 'gate allows lookup_po', 'pt-br': 'gate permite lookup_po' }, pigment: 'accent' },
            { label: { en: 'seq 2 · tool.call', 'pt-br': 'seq 2 · tool.call' }, detail: { en: 'lookup_po runs (parent: 1)', 'pt-br': 'lookup_po roda (parent: 1)' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Approval refused', 'pt-br': 'Aprovação recusada' },
        caption: {
          en: 'Next the model asks to approve PO-1001. The gate refuses at seq 3 (policy.denied), so no tool.call follows and the refusal stays visible in sequence.',
          'pt-br': 'Em seguida o modelo pede para aprovar o PO-1001. O gate recusa em seq 3 (policy.denied), então nenhum tool.call segue e a recusa fica visível na sequência.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'seq 0–2 · lookup done', 'pt-br': 'seq 0–2 · consulta feita' }, detail: { en: 'earlier events stay in order', 'pt-br': 'eventos anteriores ficam em ordem' }, pigment: 'muted' },
            { label: { en: 'seq 3 · policy.denied', 'pt-br': 'seq 3 · policy.denied' }, detail: { en: 'approve_invoice refused with reason', 'pt-br': 'approve_invoice recusado com motivo' }, pigment: 'danger' },
            { label: { en: 'No tool.call', 'pt-br': 'Sem tool.call' }, detail: { en: 'blocked request never executes', 'pt-br': 'pedido bloqueado nunca executa' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Draft and reply', 'pt-br': 'Rascunho e resposta' },
        caption: {
          en: 'Continuing from seq 3: the gate permits create_invoice_draft (seq 4), tool.call runs with parent: 4 (seq 5), the loop closes (seq 6), and run.reply is stored last (seq 7, parent: 6) for humans only.',
          'pt-br': 'Seguindo de seq 3: o gate permite create_invoice_draft (seq 4), tool.call roda com parent: 4 (seq 5), o laço encerra (seq 6) e run.reply fica por último (seq 7, parent: 6) só para humanos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'seq 4 · policy.allowed', 'pt-br': 'seq 4 · policy.allowed' }, detail: { en: 'gate allows create_invoice_draft', 'pt-br': 'gate permite create_invoice_draft' }, pigment: 'accent' },
            { label: { en: 'seq 5 · tool.call', 'pt-br': 'seq 5 · tool.call' }, detail: { en: 'draft created (parent: 4)', 'pt-br': 'rascunho criado (parent: 4)' }, pigment: 'success' },
            { label: { en: 'seq 6 · run.finished', 'pt-br': 'seq 6 · run.finished' }, detail: { en: 'assistant loop ends', 'pt-br': 'laço do assistente termina' }, pigment: 'muted' },
            { label: { en: 'seq 7 · run.reply', 'pt-br': 'seq 7 · run.reply' }, detail: { en: 'parent: 6 · read by humans, never graded', 'pt-br': 'parent: 6 · lida por humanos, nunca julgada' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 23.2 walked through three traces in prose to show how partial-order rules
   * accept safe reordering while catching send-before-approval and redrafting
   * after approval. Each case is one frame here.
   */
  't23-partial-order-paths': {
    lesson: '23.2-evaluate-valid-paths',
    title: { en: 'One partial-order policy, three traces', 'pt-br': 'Uma política de ordem parcial, três traces' },
    caption: {
      en: 'Only the required-before chain and the redraft invalidation are fixed. Safe reordering passes; sending before approval or after a redraft voids approval fails with an order violation.',
      'pt-br': 'Só a cadeia de precedência e a anulação por novo rascunho são fixas. Reordenar um passo livre passa; enviar antes da aprovação ou depois de um novo rascunho anular a aprovação falha por violação de ordem.',
    },
    steps: [
      {
        label: { en: 'Safe reordering', 'pt-br': 'Reordenação segura' },
        caption: {
          en: 'Path B reads the supplier message before looking up the purchase order. Because read_supplier_message has no required-before constraint, every rule holds and the trace passes.',
          'pt-br': 'O caminho B lê a mensagem do fornecedor antes de consultar o pedido de compra. Como read_supplier_message não tem restrição de precedência, todas as regras valem e o trace passa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'read_request', 'pt-br': 'read_request' }, detail: { en: 'starts the required chain', 'pt-br': 'abre a cadeia obrigatória' }, pigment: 'accent' },
            { label: { en: 'read_supplier_message', 'pt-br': 'read_supplier_message' }, detail: { en: 'optional · order is free', 'pt-br': 'opcional · ordem livre' }, pigment: 'muted' },
            { label: { en: 'lookup_po → draft_invoice', 'pt-br': 'lookup_po → draft_invoice' }, detail: { en: 'both prerequisites in seen', 'pt-br': 'ambos os pré-requisitos em seen' }, pigment: 'accent' },
            { label: { en: 'request_approval → approval_granted', 'pt-br': 'request_approval → approval_granted' }, detail: { en: 'approval active in seen', 'pt-br': 'aprovação ativa em seen' }, pigment: 'accent' },
            { label: { en: 'send_invoice', 'pt-br': 'send_invoice' }, detail: { en: 'pass · 0 violations', 'pt-br': 'passa · 0 violações' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Send before approval', 'pt-br': 'Envio antes da aprovação' },
        caption: {
          en: 'Every required action appears in the trace, yet send_invoice runs while approval_granted is missing from seen, triggering an order violation.',
          'pt-br': 'Toda ação obrigatória aparece no trace, mas send_invoice roda enquanto approval_granted falta em seen, gerando uma violação de ordem.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'read_request → lookup_po → draft_invoice', 'pt-br': 'read_request → lookup_po → draft_invoice' }, detail: { en: 'valid prefix', 'pt-br': 'prefixo válido' }, pigment: 'muted' },
            { label: { en: 'request_approval', 'pt-br': 'request_approval' }, detail: { en: 'waiting for decision', 'pt-br': 'aguardando decisão' }, pigment: 'caution' },
            { label: { en: 'send_invoice', 'pt-br': 'send_invoice' }, detail: { en: 'order violation · no approval_granted in seen', 'pt-br': 'violação de ordem · sem approval_granted em seen' }, pigment: 'danger' },
            { label: { en: 'approval_granted', 'pt-br': 'approval_granted' }, detail: { en: 'arrives too late', 'pt-br': 'chega tarde demais' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Redraft voids approval', 'pt-br': 'Novo rascunho anula aprovação' },
        caption: {
          en: 'A second draft_invoice removes request_approval and approval_granted from seen (while keeping them in happened). Sending without a new approval fails on order.',
          'pt-br': 'Um segundo draft_invoice tira request_approval e approval_granted de seen (mantendo-os em happened). Enviar sem nova aprovação falha por ordem.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '… → approval_granted', 'pt-br': '… → approval_granted' }, detail: { en: 'approved first draft', 'pt-br': 'aprovou o primeiro rascunho' }, pigment: 'muted' },
            { label: { en: 'draft_invoice', 'pt-br': 'draft_invoice' }, detail: { en: 'redraft · clears approval from seen', 'pt-br': 'novo rascunho · limpa aprovação de seen' }, pigment: 'caution' },
            { label: { en: 'send_invoice', 'pt-br': 'send_invoice' }, detail: { en: 'order violation · approval was voided', 'pt-br': 'violação de ordem · aprovação foi anulada' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 23.3 tabulated the 100-case corpus across six categories and explained the
   * 20-case stratified held-out split in prose. Both views share exact 30/20/
   * 15/15/10/10 proportions here.
   */
  't23-corpus-stratification': {
    lesson: '23.3-build-a-100-case-corpus',
    title: { en: 'One hundred cases, stratified into dev and held-out', 'pt-br': 'Cem casos, estratificados em desenvolvimento e reservados' },
    caption: {
      en: 'Every category keeps the exact same share in the 20 held-out cases as in the full 100-case corpus. Eighty cases run here; twenty stay manifest-only because their runners belong to tracks 18–20.',
      'pt-br': 'Cada categoria mantém exatamente a mesma fração nos 20 casos reservados que no corpus de 100 casos. Oitenta casos rodam aqui; vinte ficam só no manifesto porque os runners pertencem às trilhas 18–20.',
    },
    steps: [
      {
        label: { en: 'Full corpus (100 cases)', 'pt-br': 'Corpus completo (100 casos)' },
        caption: {
          en: 'Six categories built for coverage across earlier tracks: 80 executable cases (coloured bands) and 20 manifest-only cases (muted bands).',
          'pt-br': 'Seis categorias montadas para cobertura das trilhas anteriores: 80 casos executáveis (faixas coloridas) e 20 só no manifesto (faixas neutras).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Ordinary drafts', 'pt-br': 'Rascunhos comuns' }, detail: { en: '30 cases (24 dev, 6 held out) · 6 purchase orders × 5 valid paths · runs here', 'pt-br': '30 casos (24 dev, 6 reservados) · 6 pedidos × 5 caminhos válidos · roda aqui' }, weight: 30, pigment: 'success' },
            { label: { en: 'Tool, schema and authorization failures', 'pt-br': 'Falhas de ferramenta, schema e autorização' }, detail: { en: '20 cases (16 dev, 4 held out) · 4 orders × 5 bad calls · runs here', 'pt-br': '20 casos (16 dev, 4 reservados) · 4 pedidos × 5 chamadas erradas · roda aqui' }, weight: 20, pigment: 'caution' },
            { label: { en: 'Injection and exfiltration', 'pt-br': 'Injeção e exfiltração' }, detail: { en: '15 cases (12 dev, 3 held out) · 9 attacks of lesson 16.5 · runs here', 'pt-br': '15 casos (12 dev, 3 reservados) · 9 ataques da aula 16.5 · roda aqui' }, weight: 15, pigment: 'danger' },
            { label: { en: 'Crash and idempotency', 'pt-br': 'Quedas e idempotência' }, detail: { en: '15 cases (12 dev, 3 held out) · 3 failure points × 1–5 deliveries · runs here', 'pt-br': '15 casos (12 dev, 3 reservados) · 3 pontos de falha × 1–5 entregas · roda aqui' }, weight: 15, pigment: 'accent' },
            { label: { en: 'Approval races and expiry', 'pt-br': 'Disputas e expiração de aprovação' }, detail: { en: '10 cases (8 dev, 2 held out) · scenarios of track 20 · manifest only', 'pt-br': '10 casos (8 dev, 2 reservados) · cenários da trilha 20 · só no manifesto' }, weight: 10, pigment: 'muted' },
            { label: { en: 'Browser and memory degradation', 'pt-br': 'Degradação de navegador e memória' }, detail: { en: '10 cases (8 dev, 2 held out) · scenarios of tracks 18 and 19 · manifest only', 'pt-br': '10 casos (8 dev, 2 reservados) · cenários das trilhas 18 e 19 · só no manifesto' }, weight: 10, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Held-out split (20 cases)', 'pt-br': 'Conjunto reservado (20 casos)' },
        caption: {
          en: 'Sampling count × 20 // 100 inside each category keeps the bar proportions identical: 6, 4, 3, 3, 2 and 2. No random seed can leave attacks unrepresented.',
          'pt-br': 'Sortear contagem × 20 // 100 dentro de cada categoria mantém as proporções idênticas: 6, 4, 3, 3, 2 e 2. Nenhuma semente aleatória deixa ataques de fora.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Ordinary drafts', 'pt-br': 'Rascunhos comuns' }, detail: { en: '6 of 30 held out (20%) · runs at release check', 'pt-br': '6 de 30 reservados (20%) · roda na verificação de release' }, weight: 6, pigment: 'success' },
            { label: { en: 'Tool, schema and authorization failures', 'pt-br': 'Falhas de ferramenta, schema e autorização' }, detail: { en: '4 of 20 held out (20%) · runs at release check', 'pt-br': '4 de 20 reservados (20%) · roda na verificação de release' }, weight: 4, pigment: 'caution' },
            { label: { en: 'Injection and exfiltration', 'pt-br': 'Injeção e exfiltração' }, detail: { en: '3 of 15 held out (20%) · runs at release check', 'pt-br': '3 de 15 reservados (20%) · roda na verificação de release' }, weight: 3, pigment: 'danger' },
            { label: { en: 'Crash and idempotency', 'pt-br': 'Quedas e idempotência' }, detail: { en: '3 of 15 held out (20%) · runs at release check', 'pt-br': '3 de 15 reservados (20%) · roda na verificação de release' }, weight: 3, pigment: 'accent' },
            { label: { en: 'Approval races and expiry', 'pt-br': 'Disputas e expiração de aprovação' }, detail: { en: '2 of 10 held out (20%) · manifest only', 'pt-br': '2 de 10 reservados (20%) · só no manifesto' }, weight: 2, pigment: 'muted' },
            { label: { en: 'Browser and memory degradation', 'pt-br': 'Degradação de navegador e memória' }, detail: { en: '2 of 10 held out (20%) · manifest only', 'pt-br': '2 de 10 reservados (20%) · só no manifesto' }, weight: 2, pigment: 'muted' },
          ],
        },
      },
    ],
  },

  /**
   * 23.4 explained how grade_trial short-circuits before calling ModelJudge
   * and how ModelJudge isolates untrusted reply text inside <reply> tags.
   */
  't23-grader-order': {
    lesson: '23.4-calibrate-the-graders',
    title: { en: 'Deterministic checks first, model judge second', 'pt-br': 'Verificações determinísticas primeiro, juiz de modelo depois' },
    caption: {
      en: 'Code decides whether the required effects exist before any language model sees the reply. When the judge does run, the untrusted reply stays inside <reply> tags and any unreadable output becomes invalid.',
      'pt-br': 'O código decide se os efeitos exigidos existem antes de qualquer modelo de linguagem ver a resposta. Quando o juiz roda, a resposta não confiável fica dentro de tags <reply> e qualquer saída ilegível vira invalid.',
    },
    steps: [
      {
        label: { en: 'Effect check fails', 'pt-br': 'Efeito falha' },
        caption: {
          en: 'If grade_effects reports a missing draft or disallowed effect, grade_trial fails immediately. ModelJudge receives zero calls because good wording cannot create a missing draft.',
          'pt-br': 'Se grade_effects relata um rascunho ausente ou efeito não permitido, grade_trial reprova na hora. ModelJudge recebe zero chamadas, porque boa redação não cria um rascunho que falta.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'grade_effects', 'pt-br': 'grade_effects' }, detail: { en: 'finds missing or disallowed effect', 'pt-br': 'encontra efeito ausente ou proibido' }, pigment: 'danger' },
            { label: { en: 'grade_trial stops', 'pt-br': 'grade_trial para' }, detail: { en: 'returns Verdict(False, problems)', 'pt-br': 'devolve Verdict(False, problems)' }, pigment: 'danger' },
            { label: { en: 'ModelJudge', 'pt-br': 'ModelJudge' }, detail: { en: 'never called (0 requests)', 'pt-br': 'nunca chamado (0 requisições)' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Effect check passes', 'pt-br': 'Efeito passa' },
        caption: {
          en: 'Only when effects are clean does ModelJudge send the rubric as the system message and the reply inside <reply> tags. After trimming whitespace and uppercasing, only PASS passes; FAIL or invalid fails the trial.',
          'pt-br': 'Só quando os efeitos passam é que ModelJudge envia a rubrica como mensagem de sistema e a resposta dentro de tags <reply>. Depois de remover espaços nas pontas e converter para maiúsculas, só PASS aprova; FAIL ou invalid reprova a tentativa.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'grade_effects', 'pt-br': 'grade_effects' }, detail: { en: 'empty problem list', 'pt-br': 'lista de problemas vazia' }, pigment: 'success' },
            { label: { en: 'ModelJudge prompt', 'pt-br': 'Prompt do ModelJudge' }, detail: { en: 'rubric in system; untrusted text in <reply>', 'pt-br': 'rubrica no sistema; texto não confiável em <reply>' }, pigment: 'accent' },
            { label: { en: 'Strict parser', 'pt-br': 'Parser estrito' }, detail: { en: 'PASS → pass; FAIL → fail; else → invalid', 'pt-br': 'PASS → pass; FAIL → fail; resto → invalid' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 23.4 compared two planted broken gates against the real gate across 65
   * control cases (35 negative + 30 positive). Stepping across the three gates
   * shows why both positive and negative controls are required.
   */
  't23-safety-controls': {
    lesson: '23.4-calibrate-the-graders',
    title: { en: 'Sixty-five control cases across three gates', 'pt-br': 'Sessenta e cinco casos de controle em três gates' },
    caption: {
      en: 'Negative controls (35 failures and injections) catch a gate that allows everything. Positive controls (30 ordinary cases) catch a gate that refuses everything.',
      'pt-br': 'Controles negativos (35 falhas e injeções) pegam um gate que permite tudo. Controles positivos (30 casos comuns) pegam um gate que recusa tudo.',
    },
    steps: [
      {
        label: { en: 'Real gate', 'pt-br': 'Gate real' },
        caption: {
          en: 'With the working gate in place, all 65 controls pass: 35 negative controls stay blocked (the gate stops 30, malformed-name checks stop 4 before the gate, and the renderer strips 1 unsafe link) while all 30 ordinary cases complete.',
          'pt-br': 'Com o gate funcional ativo, todos os 65 controles passam: 35 controles negativos ficam bloqueados (o gate barra 30, a validação de nomes barra 4 antes do gate e o renderizador remove 1 link inseguro) enquanto os 30 casos comuns concluem.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Negative controls blocked', 'pt-br': 'Controles negativos bloqueados' }, detail: { en: '35 of 35 pass (30 gate + 4 malformed names + 1 renderer)', 'pt-br': '35 de 35 passam (30 gate + 4 nomes malformados + 1 renderizador)' }, weight: 35, pigment: 'success' },
            { label: { en: 'Positive controls allowed', 'pt-br': 'Controles positivos permitidos' }, detail: { en: '30 of 30 pass (ordinary drafts)', 'pt-br': '30 de 30 passam (rascunhos comuns)' }, weight: 30, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Allows everything', 'pt-br': 'Permite tudo' },
        caption: {
          en: 'A broken allow-all gate fails 36 cases: 16 tool failures, 14 injections and 6 ordinary recovery paths whose wrong first draft now goes through. Four malformed names never reach the gate and the renderer strips the one unsafe link.',
          'pt-br': 'Um gate quebrado que permite tudo reprova 36 casos: 16 falhas de ferramenta, 14 injeções e 6 caminhos comuns de recuperação cujo primeiro rascunho errado agora passa. Quatro nomes malformados nunca chegam ao gate e o renderizador remove o único link inseguro.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Failed controls', 'pt-br': 'Controles reprovados' }, detail: { en: '36 fail (16 tool failures + 14 injections + 6 recovery paths)', 'pt-br': '36 falham (16 falhas de ferramenta + 14 injeções + 6 recuperações)' }, weight: 36, pigment: 'danger' },
            { label: { en: 'Still passing', 'pt-br': 'Ainda passando' }, detail: { en: '29 pass (24 ordinary + 4 malformed names + 1 renderer-stripped link)', 'pt-br': '29 passam (24 comuns + 4 nomes malformados + 1 link removido pelo renderizador)' }, weight: 29, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Refuses everything', 'pt-br': 'Recusa tudo' },
        caption: {
          en: 'A broken refuse-all gate scores 35 of 35 on negative controls and fails all 30 ordinary cases. Without positive controls, a useless gate would look perfectly safe.',
          'pt-br': 'Um gate quebrado que recusa tudo acerta 35 de 35 controles negativos e reprova todos os 30 casos comuns. Sem controles positivos, um gate inútil pareceria perfeitamente seguro.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Negative controls pass', 'pt-br': 'Controles negativos passam' }, detail: { en: '35 of 35 refused by blocking everything', 'pt-br': '35 de 35 recusados por bloquear tudo' }, weight: 35, pigment: 'caution' },
            { label: { en: 'Positive controls fail', 'pt-br': 'Controles positivos falham' }, detail: { en: '30 of 30 ordinary cases blocked', 'pt-br': '30 de 30 casos comuns bloqueados' }, weight: 30, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 23.5 computes pass@k = 1 - (1 - p)^k and pass^k = p^k for independent
   * trials with p = 0.8. Stepping from pass@k to pass^k shows how the same
   * agent looks nearly perfect or unreliable depending on which question is asked.
   */
  't23-pass-at-vs-power-k': {
    lesson: '23.5-ci-replay-and-live-trials',
    title: { en: 'Same 80% agent, two questions across k trials', 'pt-br': 'O mesmo agente de 80%, duas perguntas em k tentativas' },
    caption: {
      en: 'Independent trials with per-trial success p = 0.8 (reliability() in trials.py). The same agent looks nearly perfect under pass@k and unreliable under pass^k as k grows.',
      'pt-br': 'Tentativas independentes com chance por tentativa p = 0,8 (reliability() em trials.py). O mesmo agente parece quase perfeito em pass@k e pouco confiável em pass^k à medida que k cresce.',
    },
    steps: [
      {
        label: { en: 'pass@k (at least one)', 'pt-br': 'pass@k (ao menos uma)' },
        caption: {
          en: 'Chance that at least one of k independent trials succeeds: 0.8 at k = 1, climbing to 0.992 at k = 3 and near 1.0 by k = 5.',
          'pt-br': 'Chance de que ao menos uma de k tentativas independentes dê certo: 0,8 em k = 1, subindo para 0,992 em k = 3 e perto de 1,0 em k = 5.',
        },
        body: {
          kind: 'plot',
          ...passKAxes,
          series: [
            {
              label: { en: 'pass@k (at least one succeeds)', 'pt-br': 'pass@k (ao menos uma acerta)' },
              pigment: 'accent',
              points: passAtKPoints,
              marks: [{ at: [3, 0.992], label: { en: 'k = 3: 0.992', 'pt-br': 'k = 3: 0,992' } }],
            },
          ],
        },
      },
      {
        label: { en: 'pass^k (all k succeed)', 'pt-br': 'pass^k (todas acertam)' },
        caption: {
          en: 'Chance that every one of k independent trials succeeds: 0.8 at k = 1, dropping to 0.512 at k = 3 (barely better than a coin) and 0.168 at k = 8.',
          'pt-br': 'Chance de que todas as k tentativas independentes deem certo: 0,8 em k = 1, caindo para 0,512 em k = 3 (pouco melhor que uma moeda) e 0,168 em k = 8.',
        },
        body: {
          kind: 'plot',
          ...passKAxes,
          series: [
            {
              label: { en: 'pass@k (at least one succeeds)', 'pt-br': 'pass@k (ao menos uma acerta)' },
              pigment: 'muted',
              points: passAtKPoints,
            },
            {
              label: { en: 'pass^k (all k succeed)', 'pt-br': 'pass^k (todas as k acertam)' },
              pigment: 'danger',
              points: passPowerKPoints,
              marks: [
                { at: [3, 0.512], label: { en: 'k = 3: 0.512', 'pt-br': 'k = 3: 0,512' } },
                { at: [8, 0.1678], label: { en: 'k = 8: 0.168', 'pt-br': 'k = 8: 0,168' } },
              ],
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
