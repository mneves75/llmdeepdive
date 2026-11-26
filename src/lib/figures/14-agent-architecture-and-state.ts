/**
 * Figures for track 14 — Agent Architecture & Durable State.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The run paths mirror `examples/agent-engineering/src/agentlab/state/transitions.py`
 * and its tests; the lost-reply timeline mirrors `outbox.py` and `test_state_outbox.py`;
 * the escalation ladder mirrors `workflow.py`, the commit/CAS frames mirror
 * `checkpoints.py`, and the framework crash paths mirror `frameworks.py` and
 * `test_state_frameworks.py`.
 */
import type { Figure, FigureStep } from './types'

const received: FigureStep = { label: { en: 'Request received', 'pt-br': 'Pedido recebido' }, detail: { en: 'received · step 0', 'pt-br': 'received · passo 0' }, pigment: 'muted' }
const outcomeAssertion: FigureStep = {
  label: { en: 'Outcome assertion', 'pt-br': 'Asserção de resultado' },
  detail: { en: 'total == quantity × unit price', 'pt-br': 'total == quantidade × preço unitário' },
  pigment: 'success',
}

export const TRACK_14_FIGURES = {
  /**
   * 14.1 compares a deterministic parser, one model call in a fixed workflow,
   * and a bounded agent on the same purchasing job, all checked by the same
   * outcome assertion. Replaces the summary comparison table.
   */
  't14-workflow-to-agent': {
    lesson: '14.1-when-a-workflow-needs-an-agent',
    title: { en: 'Three ways to handle one purchasing job', 'pt-br': 'Três formas de fazer o mesmo trabalho de compras' },
    caption: {
      en: 'Each step up hands more control to a language model, which costs more and adds ways to err. Every path ends at the same outcome assertion against the purchase record.',
      'pt-br': 'Cada degrau entrega mais controle a um modelo de linguagem, o que custa mais e cria novas formas de errar. Todo caminho termina na mesma asserção de resultado contra o registro de compra.',
    },
    steps: [
      {
        label: { en: 'Fixed parser', 'pt-br': 'Parser fixo' },
        caption: {
          en: 'One supplier, one fixed layout. A regular expression extracts the order and total with zero model calls, and raises ValueError on any unknown format.',
          'pt-br': 'Um fornecedor, um layout fixo. Uma expressão regular extrai o pedido e o total sem chamar modelo algum, e levanta ValueError diante de qualquer formato desconhecido.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Fixed-layout e-mail', 'pt-br': 'E-mail de layout fixo' }, detail: { en: 'same subject and total line', 'pt-br': 'mesmo assunto e linha de total' }, pigment: 'muted' },
            { label: { en: 'Regex parser', 'pt-br': 'Parser com regex' }, detail: { en: 'deterministic · zero model calls', 'pt-br': 'determinístico · zero chamadas ao modelo' }, pigment: 'accent' },
            { label: { en: 'Fixed code checks & records', 'pt-br': 'Código fixo confere e registra' }, detail: { en: 'same steps every run', 'pt-br': 'mesmos passos em toda execução' }, pigment: 'accent' },
            outcomeAssertion,
          ],
        },
      },
      {
        label: { en: 'One model call', 'pt-br': 'Uma chamada ao modelo' },
        caption: {
          en: 'Forty suppliers writing free text. One model call extracts the fields into JSON; fixed code validates the JSON and controls every step after it.',
          'pt-br': 'Quarenta fornecedores escrevendo em texto livre. Uma chamada ao modelo extrai os campos em JSON; código fixo valida o JSON e controla todos os passos seguintes.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Free-text e-mail', 'pt-br': 'E-mail em texto livre' }, detail: { en: 'wording varies by supplier', 'pt-br': 'redação varia por fornecedor' }, pigment: 'muted' },
            { label: { en: 'One model call', 'pt-br': 'Uma chamada ao modelo' }, detail: { en: 'extracts PO and total as JSON', 'pt-br': 'extrai pedido e total em JSON' }, pigment: 'caution' },
            { label: { en: 'Fixed code validates & records', 'pt-br': 'Código fixo valida e registra' }, detail: { en: 'model chooses no later step', 'pt-br': 'o modelo não escolhe passos seguintes' }, pigment: 'accent' },
            outcomeAssertion,
          ],
        },
      },
      {
        label: { en: 'Bounded agent', 'pt-br': 'Agente com limite' },
        caption: {
          en: 'A disputed short delivery (40 billed, 36 logged). The model chooses the next tool from what the last step found, bounded by a transition table and step budget.',
          'pt-br': 'Uma entrega incompleta contestada (40 cobradas, 36 registradas). O modelo escolhe a próxima ferramenta a partir do passo anterior, limitado por tabela de transições e orçamento.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Disputed delivery', 'pt-br': 'Entrega contestada' }, detail: { en: '40 billed vs 36 received', 'pt-br': '40 cobradas vs 36 recebidas' }, pigment: 'muted' },
            { label: { en: 'Model picks next tool', 'pt-br': 'Modelo escolhe a ferramenta' }, detail: { en: 'look up order, ask supplier, split', 'pt-br': 'consultar pedido, perguntar, dividir' }, pigment: 'caution' },
            { label: { en: 'Code enforces bounds', 'pt-br': 'Código impõe os limites' }, detail: { en: 'transition table & step budget', 'pt-br': 'tabela de transições e orçamento' }, pigment: 'accent' },
            { label: { en: 'Record agreed invoice', 'pt-br': 'Registrar fatura acordada' }, detail: { en: 'loop ends when resolved or capped', 'pt-br': 'laço encerra ao resolver ou atingir limite' }, pigment: 'accent' },
            outcomeAssertion,
          ],
        },
      },
    ],
  },

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

  /**
   * 14.3 explains atomic SQLite transactions, crash rollback before COMMIT, and
   * compare-and-swap (CAS) rejecting a stale concurrent writer.
   */
  't14-checkpoint-commit-and-cas': {
    lesson: '14.3-checkpoints-and-serialization',
    title: { en: 'How save handles commits, crashes and two writers', 'pt-br': 'Como save trata commits, quedas e dois escritores' },
    caption: {
      en: 'Every write runs inside one SQLite transaction guarded by WHERE version = ?. A crash leaves nothing half-written, and a second writer on a stale version is rejected.',
      'pt-br': 'Cada escrita roda numa única transação SQLite protegida por WHERE version = ?. Uma queda não deixa nada pela metade, e um segundo escritor numa versão antiga é rejeitado.',
    },
    steps: [
      {
        label: { en: 'Atomic commit', 'pt-br': 'Commit atômico' },
        caption: {
          en: 'One worker saves version 4 from version 3. State and outbox rows commit together inside one transaction.',
          'pt-br': 'Um worker salva a versão 4 a partir da versão 3. As linhas de estado e do outbox são confirmadas juntas numa única transação.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Load version 3', 'pt-br': 'Carregar versão 3' }, detail: { en: 'read expected_version = 3', 'pt-br': 'lê expected_version = 3' }, pigment: 'muted' },
            { label: { en: 'Open transaction', 'pt-br': 'Abrir transação' }, detail: { en: 'BEGIN IMMEDIATE takes write lock', 'pt-br': 'BEGIN IMMEDIATE pega o lock de escrita' }, pigment: 'accent' },
            { label: { en: 'Update run_state', 'pt-br': 'Atualizar run_state' }, detail: { en: 'WHERE version = 3 → 1 row matched', 'pt-br': 'WHERE version = 3 → 1 linha casada' }, pigment: 'accent' },
            { label: { en: 'Insert outbox rows', 'pt-br': 'Inserir linhas no outbox' }, detail: { en: 'same open transaction', 'pt-br': 'na mesma transação aberta' }, pigment: 'accent' },
            { label: { en: 'Commit together', 'pt-br': 'Confirmar juntos' }, detail: { en: 'COMMIT · version 4 durable', 'pt-br': 'COMMIT · versão 4 durável' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Crash mid-step', 'pt-br': 'Queda no meio' },
        caption: {
          en: 'In the subprocess test, the worker dies with os._exit(1) after the UPDATE and outbox insert, before COMMIT. Reopening the file rolls back both writes.',
          'pt-br': 'No teste com subprocesso, o worker morre com os._exit(1) após o UPDATE e a inserção no outbox, antes do COMMIT. Ao reabrir o arquivo, o SQLite desfaz as duas escritas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Committed state', 'pt-br': 'Estado confirmado' }, detail: { en: 'version 1 · checked · empty outbox', 'pt-br': 'versão 1 · checked · outbox vazio' }, pigment: 'muted' },
            { label: { en: 'UPDATE & INSERT run', 'pt-br': 'UPDATE e INSERT rodam' }, detail: { en: 'not yet committed', 'pt-br': 'ainda sem confirmação' }, pigment: 'caution' },
            { label: { en: 'Process dies', 'pt-br': 'Processo morre' }, detail: { en: 'os._exit(1) before COMMIT', 'pt-br': 'os._exit(1) antes do COMMIT' }, pigment: 'danger' },
            { label: { en: 'Next worker opens file', 'pt-br': 'Próximo worker abre o arquivo' }, detail: { en: 'SQLite rolls back open transaction', 'pt-br': 'SQLite desfaz a transação aberta' }, pigment: 'accent' },
            { label: { en: 'Clean last checkpoint', 'pt-br': 'Último checkpoint intacto' }, detail: { en: 'version 1 · checked · empty outbox', 'pt-br': 'versão 1 · checked · outbox vazio' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Stale writer (CAS)', 'pt-br': 'Escritor antigo (CAS)' },
        caption: {
          en: 'Workers A and B both read version 3. A commits ready as version 4; B tries to save needs_info with expected_version=3, matches zero rows, gets StaleWrite and must reload.',
          'pt-br': 'Os workers A e B leem a versão 3. A confirma ready como versão 4; B tenta salvar needs_info com expected_version=3, não casa nenhuma linha, recebe StaleWrite e precisa recarregar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'A & B load version 3', 'pt-br': 'A e B carregam versão 3' }, detail: { en: 'no read lock held', 'pt-br': 'sem lock de leitura' }, pigment: 'muted' },
            { label: { en: 'A commits ready', 'pt-br': 'A confirma ready' }, detail: { en: 'row moves to version 4', 'pt-br': 'linha avança para versão 4' }, pigment: 'success' },
            { label: { en: 'B runs UPDATE', 'pt-br': 'B roda o UPDATE' }, detail: { en: 'WHERE version = 3 → 0 rows', 'pt-br': 'WHERE version = 3 → 0 linhas' }, pigment: 'caution' },
            { label: { en: 'StaleWrite & rollback', 'pt-br': 'StaleWrite e rollback' }, detail: { en: 'A’s decision is not overwritten', 'pt-br': 'decisão de A não é sobrescrita' }, pigment: 'danger' },
            { label: { en: 'B reloads version 4', 'pt-br': 'B recarrega a versão 4' }, detail: { en: 're-decides from A’s state', 'pt-br': 'decide de novo a partir de A' }, pigment: 'accent' },
          ],
        },
      },
    ],
  },

  /**
   * 14.5 compares LangGraph's super-step checkpoint resume with Temporal's
   * event-history replay across worker restarts.
   */
  't14-langgraph-vs-temporal': {
    lesson: '14.5-langgraph-and-temporal',
    title: { en: 'After a crash: checkpoint resume vs history replay', 'pt-br': 'Após uma queda: retomada por checkpoint vs replay do histórico' },
    caption: {
      en: 'Both frameworks skip finished steps and repeat interrupted work. Neither stops an external service from creating two invoices without an idempotency key.',
      'pt-br': 'Os dois frameworks pulam passos concluídos e repetem trabalho interrompido. Nenhum impede um serviço externo de criar duas faturas sem uma chave de idempotência.',
    },
    steps: [
      {
        label: { en: 'LangGraph: checkpoint resume', 'pt-br': 'LangGraph: retomada por checkpoint' },
        caption: {
          en: 'With durability="sync", LangGraph commits a SQLite checkpoint after each super-step. Resuming with invoke(None, config) skips receive and reruns check from its start.',
          'pt-br': 'Com durability="sync", o LangGraph grava um checkpoint no SQLite após cada super-step. Retomar com invoke(None, config) pula receive e roda check de novo do início.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'receive finishes', 'pt-br': 'receive termina' }, detail: { en: 'checkpoint saved to SQLite', 'pt-br': 'checkpoint gravado no SQLite' }, pigment: 'accent' },
            { label: { en: 'check crashes', 'pt-br': 'check cai no meio' }, detail: { en: 'attempt 1 raises RuntimeError', 'pt-br': 'tentativa 1 levanta RuntimeError' }, pigment: 'danger' },
            { label: { en: 'Process restarts', 'pt-br': 'Processo reinicia' }, detail: { en: 'resumes via invoke(None, config)', 'pt-br': 'retoma via invoke(None, config)' }, pigment: 'muted' },
            { label: { en: 'check runs again', 'pt-br': 'check roda de novo' }, detail: { en: 'receive: 1 call · check: 2 calls', 'pt-br': 'receive: 1 chamada · check: 2 chamadas' }, pigment: 'caution' },
            { label: { en: 'complete finishes', 'pt-br': 'complete termina' }, detail: { en: 'final status: completed', 'pt-br': 'status final: completed' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Temporal: history replay', 'pt-br': 'Temporal: replay do histórico' },
        caption: {
          en: 'Temporal replays workflow code on a second worker using stored activity results. When create_invoice loses its reply, Temporal retries it and the idempotency key keeps one invoice.',
          'pt-br': 'O Temporal reproduz o código do workflow num segundo worker usando os resultados salvos das activities. Quando create_invoice perde a resposta, o Temporal a repete e a chave mantém uma fatura.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Worker 1 checks order', 'pt-br': 'Worker 1 confere pedido' }, detail: { en: 'check_purchase saved in history', 'pt-br': 'check_purchase salvo no histórico' }, pigment: 'accent' },
            { label: { en: '3-day timer starts', 'pt-br': 'Timer de 3 dias inicia' }, detail: { en: 'Worker 1 stops; timer persists', 'pt-br': 'Worker 1 para; timer persiste' }, pigment: 'muted' },
            { label: { en: 'Worker 2 replays history', 'pt-br': 'Worker 2 reproduz histórico' }, detail: { en: 'check_purchase: 1 call (reused)', 'pt-br': 'check_purchase: 1 chamada (reusada)' }, pigment: 'accent' },
            { label: { en: 'create_invoice retries', 'pt-br': 'create_invoice repete' }, detail: { en: 'reply lost → attempt 2, same key', 'pt-br': 'resposta perdida → tentativa 2, mesma chave' }, pigment: 'caution' },
            { label: { en: 'One invoice recorded', 'pt-br': 'Uma fatura registrada' }, detail: { en: 'AP-0001 · no ActivityTaskFailed', 'pt-br': 'AP-0001 · sem ActivityTaskFailed' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
