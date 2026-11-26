/**
 * Figures for track 22 — Multi-Agent Systems & A2A.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * Numbers and scenarios mirror `examples/agent-engineering/src/agentlab/multiagent/`
 * (`baseline.py`, `handoff.py`, `topology.py`, `a2a.py`, `team.py`) and their tests.
 */
import type { Figure } from './types'

export const TRACK_22_FIGURES = {
  /**
   * 22.1 compares one agent against a planner-workers-synthesizer team on one
   * and four invoices. Replaces the prose walk-through of the call chain vs
   * fan-out and the growing re-read sequence.
   */
  't22-single-vs-team-calls': {
    lesson: '22.1-decide-whether-to-divide-work',
    title: {
      en: 'How calls and input tokens stack up',
      'pt-br': 'Como chamadas e tokens de entrada se acumulam',
    },
    caption: {
      en: 'Fixture measurements from baseline.py. On four invoices the team shortens the critical path and reads fewer tokens because each worker sees only one message; on one invoice the planner and synthesizer add overhead with nothing to parallelize.',
      'pt-br': 'Medições de fixture de baseline.py. Em quatro faturas a equipe encurta o caminho crítico e lê menos tokens porque cada worker vê só uma mensagem; em uma fatura o planejador e o sintetizador adicionam custo sem nada para paralelizar.',
    },
    steps: [
      {
        label: { en: 'Single agent (4 invoices)', 'pt-br': 'Agente único (4 faturas)' },
        caption: {
          en: 'One growing conversation: each call waits for the previous reply and re-reads every earlier message. Total: 4 calls, critical path 4, 748 estimated input tokens.',
          'pt-br': 'Uma conversa crescente: cada chamada espera a resposta anterior e relê todas as mensagens anteriores. Total: 4 chamadas, caminho crítico 4, 748 tokens de entrada estimados.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Call 1 · PO-1001', 'pt-br': 'Chamada 1 · PO-1001' }, detail: { en: 'instructions + message 1', 'pt-br': 'instruções + mensagem 1' }, pigment: 'accent' },
            { label: { en: 'Call 2 · PO-1002', 'pt-br': 'Chamada 2 · PO-1002' }, detail: { en: 'waits for 1 · re-reads 1 + msg 2', 'pt-br': 'espera 1 · relê 1 + msg 2' }, pigment: 'accent' },
            { label: { en: 'Call 3 · PO-1003', 'pt-br': 'Chamada 3 · PO-1003' }, detail: { en: 'waits for 2 · re-reads 1–2 + msg 3', 'pt-br': 'espera 2 · relê 1–2 + msg 3' }, pigment: 'caution' },
            { label: { en: 'Call 4 · PO-1004', 'pt-br': 'Chamada 4 · PO-1004' }, detail: { en: 're-reads all 4 msgs · 748 in · path 4', 'pt-br': 'relê as 4 msgs · 748 entr. · caminho 4' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Team (4 invoices)', 'pt-br': 'Equipe (4 faturas)' },
        caption: {
          en: 'Four independent workers follow the planner, each reading only the plan and one message (giving dependency depth 3, though the test fixture calls them sequentially). Total: 6 calls, 422 estimated input tokens (about 0.72× baseline cost).',
          'pt-br': 'Quatro workers independentes seguem o planejador, cada um lendo só o plano e uma mensagem (profundidade de dependência 3, embora a fixture de teste os chame em sequência). Total: 6 chamadas, 422 tokens de entrada estimados (cerca de 0,72× o custo do baseline).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Planner (depth 1)', 'pt-br': 'Planejador (nível 1)' }, detail: { en: 'lists PO-1001 to PO-1004', 'pt-br': 'lista de PO-1001 a PO-1004' }, pigment: 'muted' },
            { label: { en: '4 independent workers (depth 2)', 'pt-br': '4 workers independentes (nível 2)' }, detail: { en: 'each reads plan + 1 invoice only', 'pt-br': 'cada um lê só o plano + 1 fatura' }, pigment: 'accent' },
            { label: { en: 'Synthesizer (depth 3)', 'pt-br': 'Sintetizador (nível 3)' }, detail: { en: 'merges 4 lines · 422 in · path 3', 'pt-br': 'junta 4 linhas · 422 entr. · caminho 3' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Team on 1 invoice', 'pt-br': 'Equipe em 1 fatura' },
        caption: {
          en: 'With only one invoice there is nothing to parallelize. The planner and synthesizer still run, so the team takes 3 sequential calls and 144 input tokens against 1 call and 102 tokens for the lone agent.',
          'pt-br': 'Com apenas uma fatura não há nada para paralelizar. O planejador e o sintetizador ainda rodam, então a equipe faz 3 chamadas em sequência e lê 144 tokens contra 1 chamada e 102 tokens do agente único.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Planner (step 1)', 'pt-br': 'Planejador (passo 1)' }, detail: { en: 'extra call for 1 order', 'pt-br': 'chamada extra para 1 pedido' }, pigment: 'caution' },
            { label: { en: '1 worker (step 2)', 'pt-br': '1 worker (passo 2)' }, detail: { en: 'reads plan + PO-1001', 'pt-br': 'lê plano + PO-1001' }, pigment: 'accent' },
            { label: { en: 'Synthesizer (step 3)', 'pt-br': 'Sintetizador (passo 3)' }, detail: { en: '144 in · path 3 vs lone path 1', 'pt-br': '144 entr. · caminho 3 vs único 1' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 22.2 separates schema validation (receive + discriminated union +
   * controller identity) from evidence verification (claim_problem against
   * EvidenceStore). Replaces the prose walk-through of the three outcomes.
   */
  't22-handoff-validation-gate': {
    lesson: '22.2-typed-handoffs',
    title: {
      en: 'Two gates a handoff must pass',
      'pt-br': 'Dois portões que uma passagem precisa atravessar',
    },
    caption: {
      en: 'Gate 1 (receive) checks structure and attaches the sender from the controller. Gate 2 (claim_problem) checks truth against trusted records in the tenant’s EvidenceStore; valid JSON can still fail gate 2.',
      'pt-br': 'O portão 1 (receive) confere a estrutura e anexa o remetente pelo controlador. O portão 2 (claim_problem) confere a verdade contra registros confiáveis no EvidenceStore do tenant; JSON válido ainda pode falhar no portão 2.',
    },
    steps: [
      {
        label: { en: 'Bad shape (gate 1)', 'pt-br': 'Formato inválido (portão 1)' },
        caption: {
          en: 'A status of "failed" with a stray claims list, a forged sender field, or schema_version 2 fails strict discriminated validation inside receive. Nothing reaches the next agent.',
          'pt-br': 'Um status "failed" com uma lista claims sobrando, um campo sender forjado ou schema_version 2 falha na validação estrita discriminada dentro de receive. Nada chega ao próximo agente.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Worker JSON', 'pt-br': 'JSON do worker' }, detail: { en: 'status: failed + stray claims (or sender)', 'pt-br': 'status: failed + claims extra (ou sender)' }, pigment: 'muted' },
            { label: { en: 'Gate 1 · receive()', 'pt-br': 'Portão 1 · receive()' }, detail: { en: 'discriminator picks Failed; strict mode forbids extras', 'pt-br': 'discriminador escolhe Failed; modo estrito proíbe extras' }, pigment: 'caution' },
            { label: { en: 'HandoffRejected', 'pt-br': 'HandoffRejected' }, detail: { en: 'stopped · error capped at 300 chars', 'pt-br': 'barrado · erro limitado a 300 caracteres' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Untrusted source (gate 2)', 'pt-br': 'Fonte não confiável (portão 2)' },
        caption: {
          en: 'The opening attack report is valid JSON and cites a real SHA-256 hash, so it passes gate 1. Gate 2 checks EvidenceStore and refuses it because only the untrusted supplier message is cited.',
          'pt-br': 'O relatório do ataque inicial é JSON válido e cita um hash SHA-256 real, então passa pelo portão 1. O portão 2 consulta o EvidenceStore e o recusa porque só a mensagem não confiável do fornecedor é citada.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Worker JSON', 'pt-br': 'JSON do worker' }, detail: { en: 'PO-1002 payee: Supplier Omega · email hash', 'pt-br': 'PO-1002 payee: Supplier Omega · hash do e-mail' }, pigment: 'muted' },
            { label: { en: 'Gate 1 · receive()', 'pt-br': 'Portão 1 · receive()' }, detail: { en: 'valid Done · controller wraps Principal', 'pt-br': 'Done válido · controlador anexa Principal' }, pigment: 'accent' },
            { label: { en: 'Gate 2 · claim_problem()', 'pt-br': 'Portão 2 · claim_problem()' }, detail: { en: 'email has trusted=False in EvidenceStore', 'pt-br': 'e-mail tem trusted=False no EvidenceStore' }, pigment: 'caution' },
            { label: { en: 'Claim refused', 'pt-br': 'Afirmação recusada' }, detail: { en: 'no trusted evidence states it', 'pt-br': 'nenhuma evidência confiável a afirma' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Trusted record (accepted)', 'pt-br': 'Registro confiável (aceito)' },
        caption: {
          en: 'A claim of Supplier Alpha citing PO-1002’s purchase record passes both gates. Even if its note contains injected instructions, no code reads note for control.',
          'pt-br': 'Uma afirmação de Supplier Alpha citando o registro de compra do PO-1002 passa pelos dois portões. Mesmo que note traga instruções injetadas, nenhum código lê note para decidir.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Worker JSON', 'pt-br': 'JSON do worker' }, detail: { en: 'PO-1002 payee: Supplier Alpha · record hash + note', 'pt-br': 'PO-1002 payee: Supplier Alpha · hash do registro + note' }, pigment: 'muted' },
            { label: { en: 'Gate 1 · receive()', 'pt-br': 'Portão 1 · receive()' }, detail: { en: 'valid Done · controller adds Principal & role', 'pt-br': 'Done válido · controlador põe Principal e papel' }, pigment: 'accent' },
            { label: { en: 'Gate 2 · claim_problem()', 'pt-br': 'Portão 2 · claim_problem()' }, detail: { en: 'trusted purchase record matches; note ignored by code', 'pt-br': 'registro confiável bate; note ignorado pelo código' }, pigment: 'accent' },
            { label: { en: 'Accepted', 'pt-br': 'Aceito' }, detail: { en: 'returns None · safe for drafter', 'pt-br': 'devolve None · seguro para o redator' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 22.3 defines the three end states of supervise() (completed, partial,
   * failed) plus cooperative cancellation and bounded compensation. Replaces
   * the prose enumeration of the three outcomes and the opening-case replay.
   */
  't22-supervisor-fan-in': {
    lesson: '22.3-supervisor-and-peer-topologies',
    title: {
      en: 'Three defined outcomes of a supervisor fan-in',
      'pt-br': 'Três desfechos definidos para o fan-in de um supervisor',
    },
    caption: {
      en: 'Only a required failure stops running siblings and triggers undo. Optional failures degrade the status to partial without throwing away finished work; failed compensations stop after cleanup_attempts.',
      'pt-br': 'Só uma falha obrigatória cancela irmãos em execução e dispara undo. Falhas opcionais levam o status a partial sem descartar trabalho pronto; compensações com erro param após cleanup_attempts.',
    },
    steps: [
      {
        label: { en: 'Completed', 'pt-br': 'Completed (concluído)' },
        caption: {
          en: 'Every required and optional child finishes cleanly. The supervisor collects all results and ends in completed.',
          'pt-br': 'Todos os filhos obrigatórios e opcionais terminam sem erro. O supervisor reúne todos os resultados e encerra em completed.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Fan-out', 'pt-br': 'Fan-out' }, detail: { en: 'po-1001 & po-1003 start together', 'pt-br': 'po-1001 e po-1003 começam juntos' }, pigment: 'muted' },
            { label: { en: 'All succeed', 'pt-br': 'Todos acertam' }, detail: { en: 'po-1001: 500.00 · po-1003: 780.00', 'pt-br': 'po-1001: 500.00 · po-1003: 780.00' }, pigment: 'accent' },
            { label: { en: 'Status: completed', 'pt-br': 'Estado: completed' }, detail: { en: '0 failed · 0 cancelled · 0 undone', 'pt-br': '0 falhas · 0 cancelados · 0 desfeitos' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Partial (optional fails)', 'pt-br': 'Partial (opcional falha)' },
        caption: {
          en: 'The optional supplier-rating child times out while required po-1001 succeeds. The supervisor records the error in failed, keeps po-1001, and cancels or undoes nothing.',
          'pt-br': 'O filho opcional supplier-rating estoura o tempo enquanto o obrigatório po-1001 acerta. O supervisor registra o erro em failed, mantém po-1001 e não cancela nem desfaz nada.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Fan-out', 'pt-br': 'Fan-out' }, detail: { en: 'po-1001 (required) · supplier-rating (optional)', 'pt-br': 'po-1001 (obrigatório) · supplier-rating (opcional)' }, pigment: 'muted' },
            { label: { en: 'Optional raises', 'pt-br': 'Opcional lança erro' }, detail: { en: 'portal timed out → logged in failed', 'pt-br': 'portal expirou → registrado em failed' }, pigment: 'caution' },
            { label: { en: 'Status: partial', 'pt-br': 'Estado: partial' }, detail: { en: 'po-1001 kept · nothing cancelled or undone', 'pt-br': 'po-1001 mantido · nada cancelado ou desfeito' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Failed (cancel & undo)', 'pt-br': 'Failed (cancelar e desfazer)' },
        caption: {
          en: 'Required po-1003 fails: running po-1004 is cancelled so its finally block releases its lock, and finished reserve-number runs undo up to cleanup_attempts (default 2). Unfinished undos go to cleanup_pending.',
          'pt-br': 'O obrigatório po-1003 falha: po-1004 em execução é cancelado para que seu bloco finally libere o lock, e o concluído reserve-number roda undo até cleanup_attempts (padrão 2). Undos que falham vão para cleanup_pending.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Required child fails', 'pt-br': 'Filho obrigatório falha' }, detail: { en: 'po-1003 missing · INV-0001 already reserved', 'pt-br': 'po-1003 ausente · INV-0001 já reservado' }, pigment: 'danger' },
            { label: { en: 'Cancel running siblings', 'pt-br': 'Cancelar irmãos ativos' }, detail: { en: 'po-1004 cancelled · finally releases lock', 'pt-br': 'po-1004 cancelado · finally libera o lock' }, pigment: 'caution' },
            { label: { en: 'Bounded undo (≤ 2 tries)', 'pt-br': 'Undo limitado (≤ 2 tentativas)' }, detail: { en: 'releases INV-0001, or queues cleanup_pending', 'pt-br': 'libera INV-0001 ou envia a cleanup_pending' }, pigment: 'accent' },
            { label: { en: 'Status: failed', 'pt-br': 'Estado: failed' }, detail: { en: 'reservation stays in audit history', 'pt-br': 'reserva permanece no histórico de auditoria' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 22.4 traces the A2A v1.0.1 lifecycle across two separate processes:
   * discovery -> auth & version -> completed artifact, protocol refusal, and
   * cross-tenant task rejection.
   */
  't22-a2a-request-lifecycle': {
    lesson: '22.4-a2a-interoperability',
    title: {
      en: 'An A2A v1.0.1 exchange between two processes',
      'pt-br': 'Uma troca A2A v1.0.1 entre dois processos',
    },
    caption: {
      en: 'The client discovers the card without credentials, verifies the binding, version and origin, then sends a bearer token and A2A-Version on every JSON-RPC call. Protocol errors differ from refused work.',
      'pt-br': 'O cliente descobre o card sem credenciais, confere binding, versão e origem e envia um token bearer e A2A-Version em toda chamada JSON-RPC. Erros de protocolo diferem de trabalho recusado.',
    },
    steps: [
      {
        label: { en: 'Discover & complete', 'pt-br': 'Descobrir e concluir' },
        caption: {
          en: 'GET /.well-known/agent-card.json finds the JSONRPC 1.0 interface on the same origin. SendMessage carries Bearer auth and A2A-Version: 1.0 (1.0.1 also negotiates as 1.0), returning TASK_STATE_COMPLETED with an artifact.',
          'pt-br': 'GET /.well-known/agent-card.json acha a interface JSONRPC 1.0 na mesma origem. SendMessage leva autenticação Bearer e A2A-Version: 1.0 (1.0.1 também negocia como 1.0), devolvendo TASK_STATE_COMPLETED com artefato.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'GET Agent Card', 'pt-br': 'GET no Agent Card' }, detail: { en: '/.well-known/agent-card.json (public)', 'pt-br': '/.well-known/agent-card.json (público)' }, pigment: 'muted' },
            { label: { en: 'choose_interface()', 'pt-br': 'choose_interface()' }, detail: { en: 'JSONRPC · 1.0 · same origin verified', 'pt-br': 'JSONRPC · 1.0 · mesma origem verificada' }, pigment: 'accent' },
            { label: { en: 'POST SendMessage', 'pt-br': 'POST em SendMessage' }, detail: { en: 'Bearer token + A2A-Version: 1.0 + PO-1001', 'pt-br': 'Token Bearer + A2A-Version: 1.0 + PO-1001' }, pigment: 'accent' },
            { label: { en: 'Task + Artifact', 'pt-br': 'Tarefa + Artefato' }, detail: { en: 'TASK_STATE_COMPLETED · 500.00 USD', 'pt-br': 'TASK_STATE_COMPLETED · 500.00 USD' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Protocol or auth refusal', 'pt-br': 'Recusa de protocolo ou auth' },
        caption: {
          en: 'A card pointing to another host or offering only 0.3 stops on the client before any token is sent. On the server, bad credentials get HTTP 401 and an absent, 0.5 or 2.0 version gets JSON-RPC -32009.',
          'pt-br': 'Um card apontando para outro host ou oferecendo só 0.3 para no cliente antes de enviar qualquer token. No servidor, credencial errada gera HTTP 401 e versão ausente, 0.5 ou 2.0 gera JSON-RPC -32009.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Client card check', 'pt-br': 'Checagem do card no cliente' }, detail: { en: 'foreign origin or 0.3 → IncompatibleAgent', 'pt-br': 'outra origem ou 0.3 → IncompatibleAgent' }, pigment: 'danger' },
            { label: { en: 'Server HTTP auth', 'pt-br': 'Auth HTTP no servidor' }, detail: { en: 'missing/bad token → 401 WWW-Authenticate', 'pt-br': 'token ausente/errado → 401 WWW-Authenticate' }, pigment: 'danger' },
            { label: { en: 'Server version gate', 'pt-br': 'Portão de versão no servidor' }, detail: { en: 'empty (0.3), 0.5, 2.0 → -32009, nothing runs', 'pt-br': 'vazio (0.3), 0.5, 2.0 → -32009, nada roda' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Cross-tenant refusal', 'pt-br': 'Recusa entre tenants' },
        caption: {
          en: 'Asking for another tenant’s order (PO-2001) is a valid protocol call, so the task ends in TASK_STATE_REJECTED with no artifact. Polling another tenant’s task id returns -32001 TaskNotFound, hiding whether it exists.',
          'pt-br': 'Pedir o pedido de outro tenant (PO-2001) é uma chamada válida de protocolo, então a tarefa termina em TASK_STATE_REJECTED sem artefato. Consultar o id de tarefa de outro tenant devolve -32001 TaskNotFound, escondendo se ela existe.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Authenticated call', 'pt-br': 'Chamada autenticada' }, detail: { en: 'tenant-a asks for PO-2001 (tenant-b)', 'pt-br': 'tenant-a pede PO-2001 (tenant-b)' }, pigment: 'muted' },
            { label: { en: 'Protocol passes', 'pt-br': 'Protocolo aceita' }, detail: { en: 'HTTP 200 · valid Bearer · A2A-Version 1.0', 'pt-br': 'HTTP 200 · Bearer válido · A2A-Version 1.0' }, pigment: 'accent' },
            { label: { en: 'Tenant scope check', 'pt-br': 'Checagem de tenant' }, detail: { en: 'Principal does not own PO-2001', 'pt-br': 'Principal não é dono de PO-2001' }, pigment: 'caution' },
            { label: { en: 'TASK_STATE_REJECTED', 'pt-br': 'TASK_STATE_REJECTED' }, detail: { en: 'no artifact · foreign GetTask → -32001', 'pt-br': 'sem artefato · GetTask alheio → -32001' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 22.5 traces the Researcher -> Coder -> Reviewer pipeline under controller
   * governance: honest acceptance vs prompt injection and unanimous bad review.
   */
  't22-controller-gated-team': {
    lesson: '22.5-researcher-coder-reviewer',
    title: {
      en: 'Agents propose; the controller gates every step',
      'pt-br': 'Os agentes propõem; o controlador barra cada etapa',
    },
    caption: {
      en: 'Each role holds one grant in ROLE_GRANTS. Only controller-verified claims enter verified.csv, only the sandbox runs code, reviewers see the coder’s report as untrusted data, and acceptance requires expected_report plus a majority of all reviews (invalid reviews count in the denominator).',
      'pt-br': 'Cada papel tem uma concessão em ROLE_GRANTS. Só afirmações verificadas pelo controlador entram em verified.csv, só o sandbox roda código, revisores recebem o relatório do programador como dado não confiável, e a aceitação exige expected_report e maioria de todas as revisões (inválidas entram no denominador).',
    },
    steps: [
      {
        label: { en: 'Honest run', 'pt-br': 'Execução honesta' },
        caption: {
          en: 'Researcher looks up PO-1002 and cites the record; controller writes verified.csv (1134.00); Coder writes a script that runs in the sandbox; controller recomputes expected_report and Reviewer approves.',
          'pt-br': 'O pesquisador consulta PO-1002 e cita o registro; o controlador escreve verified.csv (1134.00); o programador escreve um script que roda no sandbox; o controlador recalcula expected_report e o revisor aprova.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Researcher', 'pt-br': 'Pesquisador' }, detail: { en: 'grant: lookup_po · cites PO-1002 record', 'pt-br': 'concessão: lookup_po · cita registro PO-1002' }, pigment: 'accent' },
            { label: { en: 'Controller filter', 'pt-br': 'Filtro do controlador' }, detail: { en: 'claim_problem → verified.csv (1134.00)', 'pt-br': 'claim_problem → verified.csv (1134.00)' }, pigment: 'accent' },
            { label: { en: 'Coder + Sandbox', 'pt-br': 'Programador + Sandbox' }, detail: { en: 'grant: run_python → out/report.json', 'pt-br': 'concessão: run_python → out/report.json' }, pigment: 'accent' },
            { label: { en: 'Recompute + Review', 'pt-br': 'Recomputação + Revisão' }, detail: { en: 'expected_report OK + verdict: approve → accepted', 'pt-br': 'expected_report OK + verdict: approve → aceito' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Attack & bad review blocked', 'pt-br': 'Ataque e revisão errada barrados' },
        caption: {
          en: 'An injected message cannot grant run_python to the Researcher, cannot sneak 11340.00 past claim_problem into verified.csv, and three approving reviewers still cannot pass a report whose grand_total fails expected_report.',
          'pt-br': 'Uma mensagem injetada não concede run_python ao pesquisador, não infiltra 11340.00 por claim_problem até verified.csv, e três revisores aprovando ainda não passam um relatório cujo grand_total falha em expected_report.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Researcher asks run_python', 'pt-br': 'Pesquisador pede run_python' }, detail: { en: 'refused by ROLE_GRANTS · never hits backend', 'pt-br': 'recusado por ROLE_GRANTS · nunca chega ao backend' }, pigment: 'danger' },
            { label: { en: 'Untrusted claims dropped', 'pt-br': 'Afirmações sem confiança caem' }, detail: { en: 'Supplier Omega & 11340.00 excluded from CSV', 'pt-br': 'Supplier Omega e 11340.00 ficam fora do CSV' }, pigment: 'caution' },
            { label: { en: 'Wrong grand_total', 'pt-br': 'grand_total errado' }, detail: { en: '11340.00 ≠ 1134.00 · caught by expected_report', 'pt-br': '11340.00 ≠ 1134.00 · pego por expected_report' }, pigment: 'danger' },
            { label: { en: '3/3 approve → rejected', 'pt-br': '3/3 aprovam → recusado' }, detail: { en: 'problems non-empty → accepted: False', 'pt-br': 'problems não vazio → accepted: False' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 22.5 plots majority_error(0.3, 3, shared) from independent (0.216) to
   * fully correlated (0.300), showing why agreeing copies of one model cannot
   * replace the controller's deterministic recomputation.
   */
  't22-correlated-reviewer-error': {
    lesson: '22.5-researcher-coder-reviewer',
    title: {
      en: 'How shared errors erode a three-reviewer majority',
      'pt-br': 'Como erros compartilhados corroem a maioria de três revisores',
    },
    caption: {
      en: 'Simple mixture model majority_error(0.3, 3, shared) from team.py when each reviewer errs with probability 0.3. As correlation rises from 0 to 1, a three-reviewer vote loses its entire advantage over one reviewer.',
      'pt-br': 'Modelo simples de mistura majority_error(0.3, 3, shared) de team.py quando cada revisor erra com probabilidade 0,3. Conforme a correlação sobe de 0 para 1, o voto de três revisores perde toda a vantagem sobre um único revisor.',
    },
    body: {
      kind: 'plot',
      xAxis: {
        label: { en: 'Shared-judgement weight (shared)', 'pt-br': 'Peso de julgamento compartilhado (shared)' },
        scale: 'linear',
        min: 0,
        max: 1,
      },
      yAxis: {
        label: { en: 'Majority error probability', 'pt-br': 'Probabilidade de erro da maioria' },
        scale: 'linear',
        min: 0,
        max: 0.35,
      },
      series: [
        {
          label: { en: 'One reviewer alone (0.300)', 'pt-br': 'Um revisor sozinho (0,300)' },
          pigment: 'muted',
          points: [[0, 0.3], [1, 0.3]],
        },
        {
          label: { en: 'Majority of three reviewers', 'pt-br': 'Maioria de três revisores' },
          pigment: 'accent',
          points: [[0, 0.216], [0.25, 0.237], [0.5, 0.258], [0.75, 0.279], [1, 0.3]],
          marks: [
            { at: [0, 0.216], label: { en: 'Independent: 0.216', 'pt-br': 'Independentes: 0,216' } },
            { at: [0.5, 0.258], label: { en: 'shared = 0.5: 0.258', 'pt-br': 'shared = 0,5: 0,258' } },
            { at: [1, 0.3], label: { en: 'Copied: 0.300', 'pt-br': 'Copiados: 0,300' } },
          ],
        },
      ],
    },
  },
} as const satisfies Record<string, Figure>
