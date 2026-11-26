/**
 * Figures for track 24 — Resilience & Graceful Degradation.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The triage steps mirror `examples/agent-engineering/src/agentlab/resilience/classify.py`,
 * the breaker mirrors `resilience/retry.py` (threshold 5, 30-second pause, as in
 * `test_resilience_retry.py`), the gate mirrors `resilience/fallback.py` and
 * `test_resilience_fallback.py`, the ledger race mirrors `resilience/budget.py`,
 * and the drill runs mirror `resilience/drill.py` and `fixtures/resilience/chaos.json`.
 */
import type { Figure } from './types'

export const TRACK_24_FIGURES = {
  't24-failure-triage': {
    lesson: '24.1-classify-failures-before-retrying',
    title: { en: 'Four Monday-morning failures, four verdicts', 'pt-br': 'Quatro falhas de segunda de manhã, quatro vereditos' },
    caption: {
      en: 'Each failure enters classify with its error prefix, route, effect and optional headers. Stepping through the four Monday cases shows why the same retry loop cannot handle them all.',
      'pt-br': 'Cada falha entra em classify com prefixo de erro, rota, efeito e cabeçalhos opcionais. Avançar pelos quatro casos de segunda mostra por que o mesmo laço de retry não serve para todos.',
    },
    steps: [
      {
        label: { en: '404 on PO-2001', 'pt-br': '404 no PO-2001' },
        caption: {
          en: 'Stop hands the failure to a person or the caller with a reason. On a live route, a missing order and a hidden one look identical, so retrying wastes work and falling back could leak another tenant’s data.',
          'pt-br': 'Stop entrega a falha a uma pessoa ou a quem chamou, com um motivo. Numa rota viva, um pedido inexistente e um escondido parecem idênticos, então repetir desperdiça trabalho e usar fallback poderia vazar dados de outro tenant.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Error prefix', 'pt-br': 'Prefixo do erro' }, detail: { en: 'http: status 404 (not found)', 'pt-br': 'http: status 404 (não encontrado)' }, pigment: 'muted' },
            { label: { en: 'Contract check', 'pt-br': 'Checagem do contrato' }, detail: { en: 'GET /v2/purchase-orders/{po_id} is a live route', 'pt-br': 'GET /v2/purchase-orders/{po_id} é uma rota viva' }, pigment: 'caution' },
            { label: { en: 'Ambiguity', 'pt-br': 'Ambiguidade' }, detail: { en: 'missing resource or hidden from this tenant', 'pt-br': 'recurso inexistente ou escondido deste tenant' }, pigment: 'caution' },
            { label: { en: 'Verdict: stop', 'pt-br': 'Veredito: stop' }, detail: { en: 'report to caller · never retry or fall back', 'pt-br': 'informar a quem chamou · nunca repetir nem usar fallback' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: '429 from provider', 'pt-br': '429 do provedor' },
        caption: {
          en: 'Retry repeats the same request later. A model completion is treated as a read here because it changes nothing outside the run, and Retry-After tells the caller how long to wait.',
          'pt-br': 'Retry repete o mesmo pedido mais tarde. Uma chamada ao modelo conta aqui como leitura porque não muda nada fora da execução, e o Retry-After diz quanto esperar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Error prefix', 'pt-br': 'Prefixo do erro' }, detail: { en: 'http: status 429 (too many requests)', 'pt-br': 'http: status 429 (pedidos demais)' }, pigment: 'muted' },
            { label: { en: 'Header parsed', 'pt-br': 'Cabeçalho lido' }, detail: { en: 'Retry-After: 120 → wait_s = 120.0', 'pt-br': 'Retry-After: 120 → wait_s = 120,0' }, pigment: 'accent' },
            { label: { en: 'Effect check', 'pt-br': 'Checagem do efeito' }, detail: { en: 'read · safe to repeat', 'pt-br': 'leitura · seguro repetir' }, pigment: 'accent' },
            { label: { en: 'Verdict: retry', 'pt-br': 'Veredito: retry' }, detail: { en: 'repeat after the 120 s wait', 'pt-br': 'repetir depois da espera de 120 s' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Timeout on invoice', 'pt-br': 'Timeout na fatura' },
        caption: {
          en: 'Reconcile asks the other system what happened before anything is sent again. A timeout means no reply arrived, not that nothing was created; without an idempotency key, resending risks a second invoice.',
          'pt-br': 'Reconcile pergunta ao outro sistema o que aconteceu antes de reenviar qualquer coisa. Um timeout diz que nenhuma resposta chegou, não que nada foi criado; sem chave de idempotência, reenviar arrisca uma segunda fatura.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Error prefix', 'pt-br': 'Prefixo do erro' }, detail: { en: 'transport: TimeoutError (no reply)', 'pt-br': 'transport: TimeoutError (sem resposta)' }, pigment: 'muted' },
            { label: { en: 'Effect check', 'pt-br': 'Checagem do efeito' }, detail: { en: 'POST /v2/invoices is a write', 'pt-br': 'POST /v2/invoices é uma escrita' }, pigment: 'caution' },
            { label: { en: 'Key check', 'pt-br': 'Checagem da chave' }, detail: { en: 'no idempotency key · outcome unknown', 'pt-br': 'sem chave de idempotência · resultado desconhecido' }, pigment: 'danger' },
            { label: { en: 'Verdict: reconcile', 'pt-br': 'Veredito: reconcile' }, detail: { en: 'ask accounts payable before resending', 'pt-br': 'perguntar às contas a pagar antes de reenviar' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: '410 on report', 'pt-br': '410 no relatório' },
        caption: {
          en: 'Fallback names a reviewed equivalent route as a candidate only. The route must already be recorded as retired in the contract, the call must be a read, and lesson 24.3’s gate still decides whether it may run.',
          'pt-br': 'Fallback indica uma rota equivalente revisada apenas como candidata. A rota já precisa estar registrada como aposentada no contrato, a chamada precisa ser uma leitura, e a checagem da aula 24.3 ainda decide se ela pode rodar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Error prefix', 'pt-br': 'Prefixo do erro' }, detail: { en: 'http: status 410 (gone)', 'pt-br': 'http: status 410 (removido)' }, pigment: 'muted' },
            { label: { en: 'Contract check', 'pt-br': 'Checagem do contrato' }, detail: { en: 'GET /v1/reports/{period} recorded as retired', 'pt-br': 'GET /v1/reports/{period} registrada como aposentada' }, pigment: 'accent' },
            { label: { en: 'Effect & equivalent', 'pt-br': 'Efeito e equivalente' }, detail: { en: 'read · reviewed portal equivalent exists', 'pt-br': 'leitura · existe equivalente revisado no portal' }, pigment: 'accent' },
            { label: { en: 'Verdict: fallback', 'pt-br': 'Veredito: fallback' }, detail: { en: 'candidate only · lesson 24.3 checks identity and role', 'pt-br': 'só candidata · aula 24.3 checa identidade e papel' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },
  'circuit-breaker-states': {
    lesson: '24.2-retries-and-circuit-breakers',
    title: { en: 'A circuit breaker through one outage', 'pt-br': 'Um circuit breaker ao longo de uma queda' },
    caption: {
      en: 'Only a recorded success closes the breaker. The end of the pause lets exactly one trial call through, and a failed trial starts the pause again.',
      'pt-br': 'Só um sucesso registrado fecha o breaker. O fim da pausa deixa passar exatamente uma chamada de teste, e um teste que falha recomeça a pausa.',
    },
    steps: [
      {
        label: { en: 'The trial fails', 'pt-br': 'O teste falha' },
        caption: {
          en: 'The provider is still down: the single trial fails, the breaker opens again and the next 30 seconds cost the provider nothing.',
          'pt-br': 'O provedor continua fora: o único teste falha, o breaker abre de novo e os próximos 30 segundos não custam nada ao provedor.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Closed', 'pt-br': 'Fechado (closed)' }, detail: { en: 'calls go through · consecutive failures counted', 'pt-br': 'chamadas passam · falhas seguidas são contadas' }, pigment: 'success' },
            { label: { en: 'Fifth failure in a row', 'pt-br': 'Quinta falha seguida' }, detail: { en: 'retry or reconcile verdicts only; a 403 counts as healthy', 'pt-br': 'só veredictos retry ou reconcile; um 403 conta como saudável' }, pigment: 'caution' },
            { label: { en: 'Open', 'pt-br': 'Aberto (open)' }, detail: { en: 'calls fail at once · nothing reaches the provider', 'pt-br': 'chamadas falham na hora · nada chega ao provedor' }, pigment: 'danger' },
            { label: { en: '30 s later: half open', 'pt-br': '30 s depois: meio aberto (half open)' }, detail: { en: 'one trial call allowed, every other caller refused', 'pt-br': 'uma chamada de teste permitida, todas as outras recusadas' }, pigment: 'accent' },
            { label: { en: 'Trial fails → open again', 'pt-br': 'Teste falha → aberto de novo' }, detail: { en: 'the pause restarts from now', 'pt-br': 'a pausa recomeça a partir de agora' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'The trial succeeds', 'pt-br': 'O teste dá certo' },
        caption: {
          en: 'The provider is back: the trial succeeds, the failure count resets to zero and every caller goes through again.',
          'pt-br': 'O provedor voltou: o teste dá certo, a contagem de falhas volta a zero e todas as chamadas passam de novo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Open', 'pt-br': 'Aberto (open)' }, detail: { en: 'calls fail at once', 'pt-br': 'chamadas falham na hora' }, pigment: 'danger' },
            { label: { en: '30 s later: half open', 'pt-br': '30 s depois: meio aberto (half open)' }, detail: { en: 'one trial call allowed', 'pt-br': 'uma chamada de teste permitida' }, pigment: 'accent' },
            { label: { en: 'Trial succeeds', 'pt-br': 'O teste dá certo' }, detail: { en: 'the run calls record(ok=True)', 'pt-br': 'a execução chama record(ok=True)' }, pigment: 'success' },
            { label: { en: 'Closed', 'pt-br': 'Fechado (closed)' }, detail: { en: 'failure count back to 0 · all calls go through', 'pt-br': 'contagem de falhas volta a 0 · todas as chamadas passam' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
  'fallback-gate': {
    lesson: '24.3-api-to-browser-fallback',
    title: { en: 'Every check a browser fallback must pass', 'pt-br': 'Cada checagem que um fallback pelo navegador precisa passar' },
    caption: {
      en: 'The checks run in this order and the first one that fails ends the attempt with its reason. The browser is reached only after all four identity and permission checks, and its result counts only after the file passes.',
      'pt-br': 'As checagens rodam nesta ordem, e a primeira que falha encerra a tentativa com o seu motivo. O navegador só é acionado depois das quatro checagens de identidade e permissão, e o resultado só conta depois que o arquivo passa.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'The API call fails', 'pt-br': 'A chamada à API falha' }, detail: { en: 'a Failure with its error, route and effect', 'pt-br': 'um Failure com error, route e effect' }, pigment: 'muted' },
        { label: { en: '24.1 says fallback', 'pt-br': 'A 24.1 diz fallback' }, detail: { en: 'a retired route, not a 401, 403 or live 404', 'pt-br': 'rota aposentada, não um 401, 403 ou 404 de rota viva' }, pigment: 'caution' },
        { label: { en: 'A reviewed read equivalent', 'pt-br': 'Um equivalente de leitura revisado' }, detail: { en: 'registered for this exact route · never a write', 'pt-br': 'registrado para esta rota exata · nunca uma escrita' }, pigment: 'caution' },
        { label: { en: 'Same principal', 'pt-br': 'O mesmo principal' }, detail: { en: 'portal account → same user, tenant and roles', 'pt-br': 'conta do portal → mesmo usuário, tenant e papéis' }, pigment: 'caution' },
        { label: { en: 'Same permission', 'pt-br': 'A mesma permissão' }, detail: { en: 'the role the API route required', 'pt-br': 'o papel que a rota da API exigia' }, pigment: 'caution' },
        { label: { en: 'Fixed button pressed', 'pt-br': 'Botão fixo pressionado' }, detail: { en: 'chosen by code, not by a model', 'pt-br': 'escolhido pelo código, não por um modelo' }, pigment: 'accent' },
        { label: { en: 'The file passes track 18’s checks', 'pt-br': 'O arquivo passa nas checagens da trilha 18' }, detail: { en: 'origin, name, columns, period · else no result', 'pt-br': 'origem, nome, colunas, período · senão, nenhum resultado' }, pigment: 'success' },
      ],
    },
  },
  't24-ledger-cas-race': {
    lesson: '24.4-model-cascades-and-budgets',
    title: { en: 'Two workers, one USD 1.00 ledger', 'pt-br': 'Dois workers, um livro-razão de USD 1,00' },
    caption: {
      en: 'Each worker wants to spend USD 0.60 from a shared USD 1.00 budget. Compare-and-swap on the row’s version turns a hidden overspend into a safe re-read, and lets a kill switch win even mid-race.',
      'pt-br': 'Cada worker quer gastar USD 0,60 de um orçamento compartilhado de USD 1,00. O compare-and-swap na versão da linha transforma um estouro silencioso numa releitura segura e faz o botão de emergência vencer mesmo no meio da corrida.',
    },
    steps: [
      {
        label: { en: 'Naive check-then-write', 'pt-br': 'Checar e escrever ingênuo' },
        caption: {
          en: 'Both workers read USD 1.00 free before either writes. Each writes USD 0.60 over the other, so USD 1.20 of calls start while the ledger records only USD 0.60.',
          'pt-br': 'Os dois workers leem USD 1,00 livre antes que qualquer um escreva. Cada um grava USD 0,60 por cima do outro, então USD 1,20 em chamadas começam enquanto o livro-razão registra só USD 0,60.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Worker A reads', 'pt-br': 'Worker A lê' }, detail: { en: 'sees USD 1.00 free', 'pt-br': 'vê USD 1,00 livre' }, pigment: 'muted' },
            { label: { en: 'Worker B reads', 'pt-br': 'Worker B lê' }, detail: { en: 'also sees USD 1.00 free before A writes', 'pt-br': 'também vê USD 1,00 livre antes de A gravar' }, pigment: 'caution' },
            { label: { en: 'Worker A writes', 'pt-br': 'Worker A grava' }, detail: { en: 'sets committed to USD 0.60 · starts call', 'pt-br': 'grava USD 0,60 comprometidos · inicia chamada' }, pigment: 'accent' },
            { label: { en: 'Worker B writes', 'pt-br': 'Worker B grava' }, detail: { en: 'overwrites with USD 0.60 · starts call', 'pt-br': 'sobrescreve com USD 0,60 · inicia chamada' }, pigment: 'danger' },
            { label: { en: 'Overspend: USD 1.20', 'pt-br': 'Estouro: USD 1,20' }, detail: { en: 'both calls run · ledger shows USD 0.60', 'pt-br': 'as duas chamadas rodam · livro-razão mostra USD 0,60' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Compare-and-swap on version', 'pt-br': 'Compare-and-swap na versão' },
        caption: {
          en: 'The update matches only if version is still what the worker read. Worker A moves version 0 to 1; Worker B hits StaleWrite, reads version 1 (USD 0.40 left), and is refused without calling a model.',
          'pt-br': 'O update só encontra a linha se a versão ainda for a que o worker leu. O Worker A leva a versão de 0 para 1; o Worker B recebe StaleWrite, lê a versão 1 (USD 0,40 livres) e é recusado sem chamar o modelo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Both read version 0', 'pt-br': 'Ambos leem a versão 0' }, detail: { en: 'committed USD 0.00 · USD 1.00 free', 'pt-br': 'comprometido USD 0,00 · USD 1,00 livre' }, pigment: 'muted' },
            { label: { en: 'Worker A commits', 'pt-br': 'Worker A confirma' }, detail: { en: 'WHERE version = 0 → version 1, USD 0.60 held', 'pt-br': 'WHERE version = 0 → versão 1, USD 0,60 reservados' }, pigment: 'success' },
            { label: { en: 'Worker B hits StaleWrite', 'pt-br': 'Worker B recebe StaleWrite' }, detail: { en: 'WHERE version = 0 matches 0 rows', 'pt-br': 'WHERE version = 0 não encontra nenhuma linha' }, pigment: 'caution' },
            { label: { en: 'Worker B reads version 1', 'pt-br': 'Worker B lê a versão 1' }, detail: { en: 'sees USD 0.40 left · USD 0.60 does not fit', 'pt-br': 'vê USD 0,40 livres · USD 0,60 não cabem' }, pigment: 'accent' },
            { label: { en: 'Refused (False)', 'pt-br': 'Recusado (False)' }, detail: { en: 'no second call starts · total stays USD 0.60', 'pt-br': 'nenhuma segunda chamada começa · total fica em USD 0,60' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Kill switch during a race', 'pt-br': 'Botão de emergência na corrida' },
        caption: {
          en: 'halt sets halted = 1 and bumps version too. A worker holding an older snapshot fails its compare-and-swap, re-reads, and sees the halt before starting a call; calls already running can still settle.',
          'pt-br': 'halt marca halted = 1 e também soma um à versão. Um worker com um snapshot antigo falha no compare-and-swap, lê de novo e vê a parada antes de chamar o modelo; chamadas já em curso ainda podem fechar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Worker reads version 1', 'pt-br': 'Worker lê a versão 1' }, detail: { en: 'snapshot shows halted = 0 and room left', 'pt-br': 'snapshot mostra halted = 0 e saldo disponível' }, pigment: 'muted' },
            { label: { en: 'Operator calls halt', 'pt-br': 'Operador chama halt' }, detail: { en: 'sets halted = 1 and bumps version to 2', 'pt-br': 'marca halted = 1 e sobe a versão para 2' }, pigment: 'danger' },
            { label: { en: 'Worker hits StaleWrite', 'pt-br': 'Worker recebe StaleWrite' }, detail: { en: 'WHERE version = 1 matches 0 rows', 'pt-br': 'WHERE version = 1 não encontra nenhuma linha' }, pigment: 'caution' },
            { label: { en: 'Worker reads version 2', 'pt-br': 'Worker lê a versão 2' }, detail: { en: 'fresh snapshot shows halted = 1', 'pt-br': 'novo snapshot mostra halted = 1' }, pigment: 'accent' },
            { label: { en: 'Refused (False)', 'pt-br': 'Recusado (False)' }, detail: { en: 'no new call starts · running calls still settle', 'pt-br': 'nenhuma chamada nova começa · as em curso ainda fecham' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
  't24-recovery-drill-runs': {
    lesson: '24.5-recovery-drills',
    title: { en: 'Four invoices through the outage and crash drills', 'pt-br': 'Quatro faturas nos exercícios de queda e pane' },
    caption: {
      en: 'Step through how the batch handles a provider outage plus a lost write reply, and then how a mid-batch crash resumes from checkpoints and the outbox without creating any invoice twice.',
      'pt-br': 'Avance para ver como o lote trata uma queda do provedor com resposta perdida e, depois, como uma pane no meio do lote retoma pelos checkpoints e pelo outbox sem criar nenhuma fatura duas vezes.',
    },
    steps: [
      {
        label: { en: 'Outage and lost reply', 'pt-br': 'Queda e resposta perdida' },
        caption: {
          en: 'The breaker opens after two failures on PO-1002, so PO-1003 and PO-1004 never reach the provider (3 model calls total). Delivery loses PO-1004’s reply after writing, and reconcile finds AP-0003 without creating a duplicate.',
          'pt-br': 'O breaker abre depois de duas falhas no PO-1002, então PO-1003 e PO-1004 nunca chegam ao provedor (3 chamadas ao modelo no total). A entrega perde a resposta do PO-1004 após gravar, e reconcile encontra a AP-0003 sem duplicar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'PO-1001 → complete', 'pt-br': 'PO-1001 → complete' }, detail: { en: 'model answers · total matches · queued', 'pt-br': 'modelo responde · total bate · enfileirado' }, pigment: 'success' },
            { label: { en: 'PO-1002 → degraded', 'pt-br': 'PO-1002 → degraded' }, detail: { en: '2 failures open breaker · fixed parser reads total', 'pt-br': '2 falhas abrem o breaker · parser fixo lê o total' }, pigment: 'caution' },
            { label: { en: 'PO-1003 → escalated', 'pt-br': 'PO-1003 → escalated' }, detail: { en: 'breaker open · parser rejects free text · nothing committed', 'pt-br': 'breaker aberto · parser recusa texto livre · nada confirmado' }, pigment: 'danger' },
            { label: { en: 'PO-1004 → degraded', 'pt-br': 'PO-1004 → degraded' }, detail: { en: 'breaker still open · parser reads fixed layout', 'pt-br': 'breaker ainda aberto · parser lê o formato fixo' }, pigment: 'caution' },
            { label: { en: 'Outbox & reconcile', 'pt-br': 'Outbox e reconcile' }, detail: { en: 'PO-1004 reply lost · AP-0003 recovered · 3 invoices, 3 creates', 'pt-br': 'resposta do PO-1004 perdida · AP-0003 recuperada · 3 faturas, 3 criações' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Crash after PO-1002', 'pt-br': 'Pane após o PO-1002' },
        caption: {
          en: 'Because delivery runs only after the loop, dying right after PO-1002 commits leaves zero invoices in accounts payable and two drafts — including PO-1002’s degraded label — safely stored on disk.',
          'pt-br': 'Como a entrega roda só depois do laço, morrer logo após confirmar o PO-1002 deixa zero faturas nas contas a pagar e dois rascunhos — incluindo o rótulo degraded do PO-1002 — salvos em disco.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'PO-1001 committed', 'pt-br': 'PO-1001 confirmado' }, detail: { en: 'checkpoint + outbox row · note: read by the model', 'pt-br': 'checkpoint + linha do outbox · nota: lido pelo modelo' }, pigment: 'success' },
            { label: { en: 'PO-1002 committed', 'pt-br': 'PO-1002 confirmado' }, detail: { en: 'parser degraded note saved inside checkpoint evidence', 'pt-br': 'nota degraded do parser salva na evidência do checkpoint' }, pigment: 'caution' },
            { label: { en: 'SimulatedCrash', 'pt-br': 'SimulatedCrash' }, detail: { en: 'process dies before PO-1003 starts or delivery runs', 'pt-br': 'processo morre antes do PO-1003 começar ou da entrega rodar' }, pigment: 'danger' },
            { label: { en: 'Accounts payable: 0', 'pt-br': 'Contas a pagar: 0' }, detail: { en: 'no invoice created yet · 2 drafts wait in the outbox', 'pt-br': 'nenhuma fatura criada ainda · 2 rascunhos esperam no outbox' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Resume after crash', 'pt-br': 'Retomada após a pane' },
        caption: {
          en: 'With the provider back, the resumed batch skips the two checkpoints already on disk, reads only PO-1003 and PO-1004, delivers all four once, and keeps PO-1002’s degraded label from its checkpoint.',
          'pt-br': 'Com o provedor de volta, o lote retomado pula os dois checkpoints já em disco, lê só PO-1003 e PO-1004, entrega os quatro uma vez e mantém o rótulo degraded do PO-1002 vindo do checkpoint.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'PO-1001 & PO-1002 skipped', 'pt-br': 'PO-1001 e PO-1002 pulados' }, detail: { en: 'store.load finds both · PO-1002 stays degraded', 'pt-br': 'store.load acha os dois · PO-1002 segue degraded' }, pigment: 'accent' },
            { label: { en: 'PO-1003 & PO-1004 read', 'pt-br': 'PO-1003 e PO-1004 lidos' }, detail: { en: 'model reads only the 2 remaining invoices', 'pt-br': 'modelo lê apenas as 2 faturas restantes' }, pigment: 'success' },
            { label: { en: 'Outbox delivers all 4', 'pt-br': 'Outbox entrega os 4' }, detail: { en: 'durable keys · 4 invoices delivered once each', 'pt-br': 'chaves duráveis · 4 faturas entregues uma vez cada' }, pigment: 'success' },
            { label: { en: 'Rerun changes nothing', 'pt-br': 'Nova execução nada muda' }, detail: { en: 'all 4 committed · 0 model calls and 0 creates', 'pt-br': 'todos os 4 confirmados · 0 chamadas ao modelo e 0 criações' }, pigment: 'muted' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
