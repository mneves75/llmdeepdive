/**
 * Figures for track 25 — Capstone & Public Evidence.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The run paths mirror `examples/agent-engineering/src/agentlab/capstone/assistant.py`;
 * the cost breakdown and failure curve wire straight to `costPerSuccess` in
 * `~/lib/lab-math`; the event-log scan mirrors `analysis.py`; the reproduction
 * checks mirror `teardown.py`; and the grading gates mirror `rubric.py`.
 */
import { costPerSuccess } from '~/lib/lab-math'
import type { Figure, FigureStep } from './types'

const RUN_COST_INPUT = {
  runs: 30,
  modelCost: 0.08,
  sandboxCost: 0.02,
  reviewMinutes: 1.5,
  reviewHourly: 40,
} as const

const round4 = (value: number): number => Number(value.toFixed(4))

const FAILURE_CURVE_COUNTS = [6, 10, 12, 15, 20, 24, 30] as const
const FAILURE_CURVE_POINTS = FAILURE_CURVE_COUNTS.map((successes) => {
  const result = costPerSuccess({ ...RUN_COST_INPUT, successes })
  return [successes, round4(result.perSuccess ?? 0)] as const
})
const BASELINE_WORKED = costPerSuccess({ ...RUN_COST_INPUT, successes: 24 })
const COST_PER_RUN = round4(BASELINE_WORKED.costPerRun)
const PER_SUCCESS_24 = round4(BASELINE_WORKED.perSuccess ?? 0)

const messageHashed: FigureStep = {
  label: { en: 'Message hashed', 'pt-br': 'Mensagem com hash' },
  detail: { en: 'run.received · fixture name + SHA-256 logged, text omitted', 'pt-br': 'run.received · nome da fixture e SHA-256 no log, sem texto' },
  pigment: 'muted',
}

const rubricArtifacts: FigureStep = {
  label: { en: 'Artifacts & suite', 'pt-br': 'Artefatos e bateria' },
  detail: { en: '8 artifacts · 3 postmortems · 100-case split', 'pt-br': '8 artefatos · 3 postmortems · bateria de 100 casos' },
  pigment: 'accent',
}

export const TRACK_25_FIGURES = {
  /**
   * 25.1 walked one supplier message through every track's mechanism in a dense
   * paragraph. These three stepped paths mirror `run_case` in `assistant.py`
   * and separate task failure from a safety violation.
   */
  't25-assembled-run-paths': {
    lesson: '25.1-architecture-and-threat-model-review',
    title: { en: 'One supplier message through the assembled system', 'pt-br': 'Uma mensagem de fornecedor pelo sistema montado' },
    caption: {
      en: 'Every path logs the fixture name and the message’s SHA-256 hash without raw text, routes tool calls through the policy gate, and ends by checking environment invariants on the outbox and back office rather than the model’s last sentence.',
      'pt-br': 'Todo caminho grava o nome da fixture e o hash SHA-256 da mensagem sem o texto bruto, passa chamadas de ferramenta pelo gate de política e termina conferindo invariantes no outbox e no back office, nunca a última frase do modelo.',
    },
    steps: [
      {
        label: { en: 'Below USD 1,000', 'pt-br': 'Abaixo de USD 1.000' },
        caption: {
          en: 'A valid small invoice skips human approval, leaves through the outbox with an idempotency key, gets its receipt checked in the sandbox, and ends in completed.',
          'pt-br': 'Uma fatura pequena válida dispensa aprovação humana, sai pelo outbox com chave de idempotência, tem o recibo conferido no sandbox e termina em completed.',
        },
        body: {
          kind: 'flow',
          steps: [
            messageHashed,
            { label: { en: 'Model & policy gate', 'pt-br': 'Modelo e gate de política' }, detail: { en: 'checked · retries 503s; gate decides every tool call', 'pt-br': 'checked · repete 503; gate decide cada chamada' }, pigment: 'accent' },
            { label: { en: 'Approval policy', 'pt-br': 'Política de aprovação' }, detail: { en: 'ready · under USD 1,000, queued directly', 'pt-br': 'ready · abaixo de USD 1.000, entra na fila' }, pigment: 'accent' },
            { label: { en: 'Outbox & sandbox', 'pt-br': 'Outbox e sandbox' }, detail: { en: 'idempotency key delivers once; sandbox checks receipt', 'pt-br': 'chave entrega uma vez; sandbox confere o recibo' }, pigment: 'accent' },
            { label: { en: 'Environment check', 'pt-br': 'Verificação do ambiente' }, detail: { en: 'completed · zero safety violations', 'pt-br': 'completed · zero violações de segurança' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'USD 1,000 or more', 'pt-br': 'USD 1.000 ou mais' },
        caption: {
          en: 'At or above USD 1,000, the draft waits as a durable approval row. Approval queues delivery and the receipt check; expiry or revocation cancels the run with nothing sent.',
          'pt-br': 'A partir de USD 1.000, o rascunho espera como linha durável de aprovação. Aprovar envia e confere o recibo; expirar ou revogar cancela a execução sem enviar nada.',
        },
        body: {
          kind: 'flow',
          steps: [
            messageHashed,
            { label: { en: 'Model & policy gate', 'pt-br': 'Modelo e gate de política' }, detail: { en: 'checked · draft matches order and passes gate', 'pt-br': 'checked · rascunho bate com o pedido e passa no gate' }, pigment: 'accent' },
            { label: { en: 'Durable approval row', 'pt-br': 'Linha durável de aprovação' }, detail: { en: 'ready · waits for approver, 3-day expiry or cancel', 'pt-br': 'ready · espera aprovador, prazo de 3 dias ou cancelamento' }, pigment: 'caution' },
            { label: { en: 'Decision applied', 'pt-br': 'Decisão aplicada' }, detail: { en: 'approved → outbox & sandbox; expired/revoked → no send', 'pt-br': 'aprovada → outbox e sandbox; expirada/revogada → sem envio' }, pigment: 'accent' },
            { label: { en: 'Environment check', 'pt-br': 'Verificação do ambiente' }, detail: { en: 'completed or cancelled · invariants checked either way', 'pt-br': 'completed ou cancelled · invariantes conferidos nos dois casos' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Refused at the gate', 'pt-br': 'Recusada no gate' },
        caption: {
          en: 'When every draft is refused — a bad total, wrong payee, or unauthorized tool — the run ends in failed with nothing queued: a task failure, not a safety violation.',
          'pt-br': 'Quando todo rascunho é recusado — total errado, beneficiário falso ou ferramenta proibida — a execução termina em failed sem nada na fila: falha na tarefa, sem violação de segurança.',
        },
        body: {
          kind: 'flow',
          steps: [
            messageHashed,
            { label: { en: 'Model & policy gate', 'pt-br': 'Modelo e gate de política' }, detail: { en: 'checked · gate blocks mismatched or forbidden call', 'pt-br': 'checked · gate barra chamada incompatível ou proibida' }, pigment: 'danger' },
            { label: { en: 'No draft survives', 'pt-br': 'Nenhum rascunho passa' }, detail: { en: 'failed · draft.missing; outbox stays empty', 'pt-br': 'failed · draft.missing; outbox fica vazio' }, pigment: 'caution' },
            { label: { en: 'Environment check', 'pt-br': 'Verificação do ambiente' }, detail: { en: 'no_effect · task failed, zero safety violations', 'pt-br': 'no_effect · tarefa falhou, zero violações de segurança' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 25.2 works through a 30-run example (USD 0.08 model, USD 0.02 sandbox,
   * USD 1.00 review = USD 1.10/run, USD 33.00 total) and notes that review
   * dominates and failures raise cost per success faster than the failure count.
   */
  't25-bill-and-failure-curve': {
    lesson: '25.2-a-reproducible-benchmark',
    title: { en: 'Where the USD 33.00 bill goes, and how failures inflate it', 'pt-br': 'Para onde vão os USD 33,00 e como falhas inflam o preço' },
    caption: {
      en: 'Illustrative rates from the worked example (30 runs at USD 1.10 each). Human review dominates the total bill, and dividing that whole bill by fewer successes makes unit cost rise sharply.',
      'pt-br': 'Taxas ilustrativas do exemplo resolvido (30 execuções a USD 1,10 cada). A revisão humana domina a conta total, e dividir a conta inteira por menos sucessos faz o custo unitário subir depressa.',
    },
    steps: [
      {
        label: { en: 'Bill breakdown', 'pt-br': 'Divisão da conta' },
        caption: {
          en: 'Across 30 runs, 1.5 minutes of review at USD 40/h accounts for 91% of the USD 33.00 bill; model tokens and sandbox runs together are under 10%.',
          'pt-br': 'Em 30 execuções, 1,5 minuto de revisão a USD 40/h responde por 91% dos USD 33,00; tokens de modelo e execuções de sandbox juntos ficam abaixo de 10%.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Human review', 'pt-br': 'Revisão humana' }, detail: { en: '30 × 1.5 min at USD 40/h = USD 30.00', 'pt-br': '30 × 1,5 min a USD 40/h = USD 30,00' }, weight: 30, pigment: 'caution' },
            { label: { en: 'Model tokens', 'pt-br': 'Tokens do modelo' }, detail: { en: '30 × USD 0.08 = USD 2.40', 'pt-br': '30 × USD 0,08 = USD 2,40' }, weight: 2.4, pigment: 'accent' },
            { label: { en: 'Sandbox runs', 'pt-br': 'Execuções no sandbox' }, detail: { en: '30 × USD 0.02 = USD 0.60', 'pt-br': '30 × USD 0,02 = USD 0,60' }, weight: 0.6, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Cost vs successes', 'pt-br': 'Custo por sucessos' },
        caption: {
          en: 'Because failed runs are still paid for, cost per success climbs from USD 1.10 at 30/30 to USD 1.375 at 24/30 and USD 5.50 at 6/30, while single-run cost stays flat at USD 1.10.',
          'pt-br': 'Como execuções que falham também são pagas, o custo por sucesso sobe de USD 1,10 em 30/30 para USD 1,375 em 24/30 e USD 5,50 em 6/30, enquanto o custo por execução fica parado em USD 1,10.',
        },
        body: {
          kind: 'plot',
          xAxis: { label: { en: 'Successful runs out of 30', 'pt-br': 'Execuções bem-sucedidas em 30' }, scale: 'linear', min: 6, max: 30 },
          yAxis: { label: { en: 'Cost per success', 'pt-br': 'Custo por sucesso' }, scale: 'linear', min: 0, max: 6, unit: 'USD' },
          series: [
            {
              label: { en: 'Whole bill ÷ successes', 'pt-br': 'Conta inteira ÷ sucessos' },
              pigment: 'accent',
              points: FAILURE_CURVE_POINTS,
              marks: [
                {
                  at: [24, PER_SUCCESS_24],
                  label: { en: `24/30: USD ${PER_SUCCESS_24}`, 'pt-br': `24/30: USD ${String(PER_SUCCESS_24).replace('.', ',')}` },
                },
              ],
            },
            {
              label: { en: 'Single-run cost (ignores failures)', 'pt-br': 'Custo por execução (ignora falhas)' },
              pigment: 'muted',
              points: [[6, COST_PER_RUN], [30, COST_PER_RUN]],
            },
          ],
        },
      },
    ],
  },

  /**
   * 25.3 reconstructs `memory-loss-po1001` in two directions: `first_failure`
   * scans forward to `#2 policy.denied`, while `causal_chain` walks `parent`
   * links backward from `#5` to `#0`.
   */
  't25-log-to-postmortem': {
    lesson: '25.3-failure-analysis',
    title: { en: 'Two readings of one failed event log', 'pt-br': 'Duas leituras de um mesmo log de falha' },
    caption: {
      en: 'In memory-loss-po1001, scanning forward finds where the run first left normal (#2), while walking parent links backward from #5 traces how that refusal ended in run.failed without blaming the gate.',
      'pt-br': 'Em memory-loss-po1001, varrer adiante encontra o primeiro desvio do normal (#2), enquanto seguir os vínculos de parent a partir de #5 mostra como a recusa levou a run.failed sem culpar o gate.',
    },
    steps: [
      {
        label: { en: 'Forward (first_failure)', 'pt-br': 'Adiante (first_failure)' },
        caption: {
          en: 'first_failure scans the timeline in order and stops at #2 policy.denied: the model proposed USD 5,000.00 for a USD 500.00 order, and the gate refused it safely.',
          'pt-br': 'first_failure varre a linha do tempo em ordem e para em #2 policy.denied: o modelo propôs USD 5.000,00 para um pedido de USD 500,00, e o gate recusou com segurança.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '#0 run.received', 'pt-br': '#0 run.received' }, detail: { en: 'fixture name + SHA-256 · root event', 'pt-br': 'nome da fixture e SHA-256 · evento raiz' }, pigment: 'muted' },
            { label: { en: '#1 run.started', 'pt-br': '#1 run.started' }, detail: { en: '<- #0 · flagged=False', 'pt-br': '<- #0 · sem alerta (flagged=False)' }, pigment: 'muted' },
            { label: { en: '#2 policy.denied', 'pt-br': '#2 policy.denied' }, detail: { en: '<- #0 · first failure: USD 5,000 vs 500', 'pt-br': '<- #0 · primeira falha: USD 5.000 vs 500' }, pigment: 'danger' },
            { label: { en: '#3 run.finished', 'pt-br': '#3 run.finished' }, detail: { en: '<- #0 · denied=1, executed=0', 'pt-br': '<- #0 · 1 recusada, 0 executadas' }, pigment: 'caution' },
            { label: { en: '#4 draft.missing', 'pt-br': '#4 draft.missing' }, detail: { en: '<- #3 · no approved draft', 'pt-br': '<- #3 · nenhum rascunho aprovado' }, pigment: 'caution' },
            { label: { en: '#5 run.failed', 'pt-br': '#5 run.failed' }, detail: { en: '<- #4 · symptom: no_effect, 0 violations', 'pt-br': '<- #4 · sintoma: no_effect, 0 violações' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Backward (causal_chain)', 'pt-br': 'Para trás (causal_chain)' },
        caption: {
          en: 'causal_chain follows parent pointers from #5 → #4 → #3 → #0. Separating the symptom (#5), the first failure (#2) and the root cause (unpinned unit price) keeps the postmortem accurate.',
          'pt-br': 'causal_chain segue os ponteiros parent de #5 → #4 → #3 → #0. Separar o sintoma (#5), a primeira falha (#2) e a causa raiz (preço unitário não fixado) mantém o postmortem preciso.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '#5 run.failed', 'pt-br': '#5 run.failed' }, detail: { en: 'symptom: nothing sent · parent #4', 'pt-br': 'sintoma: nada enviado · pai #4' }, pigment: 'caution' },
            { label: { en: '#4 draft.missing', 'pt-br': '#4 draft.missing' }, detail: { en: 'no draft passed gate · parent #3', 'pt-br': 'nenhum rascunho passou · pai #3' }, pigment: 'caution' },
            { label: { en: '#3 run.finished', 'pt-br': '#3 run.finished' }, detail: { en: 'model stopped after refusal · parent #0', 'pt-br': 'modelo parou após recusa · pai #0' }, pigment: 'accent' },
            { label: { en: '#0 run.received', 'pt-br': '#0 run.received' }, detail: { en: 'root input · sha256=1ac0a35e…', 'pt-br': 'entrada raiz · sha256=1ac0a35e…' }, pigment: 'muted' },
            { label: { en: 'Root cause', 'pt-br': 'Causa raiz' }, detail: { en: 'unit price not pinned in state → model guessed', 'pt-br': 'preço unitário fora do estado → modelo chutou' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 25.4 tests reproducibility in a fresh isolated Python process (`python -I`)
   * and diagnoses mismatches with `reproduces(expected, actual)`.
   */
  't25-reproduction-outcomes': {
    lesson: '25.4-write-the-teardown',
    title: { en: 'What the fresh-process reproduction check catches', 'pt-br': 'O que o teste de reprodução em processo limpo pega' },
    caption: {
      en: 'Running the benchmark inside a fresh isolated process (`python -I`) in an empty directory verifies that identical inputs produce identical bytes, and `reproduces` flags the exact changed trial field or a fixture-manifest mismatch when they do not.',
      'pt-br': 'Rodar o benchmark num processo isolado novo (`python -I`) em diretório vazio confirma que as mesmas entradas dão os mesmos bytes, e `reproduces` aponta o campo exato da tentativa alterada ou a divergência no manifesto de fixtures quando diferem.',
    },
    steps: [
      {
        label: { en: 'Clean match', 'pt-br': 'Reprodução exata' },
        caption: {
          en: 'With string seeds and untouched fixtures, the isolated process produces the exact same canonical JSON and SHA-256 digest, so reproduces returns an empty list.',
          'pt-br': 'Com sementes em texto e fixtures intactas, o processo isolado produz exatamente o mesmo JSON canônico e o mesmo digest SHA-256, então reproduces devolve uma lista vazia.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Fresh process (python -I)', 'pt-br': 'Processo novo (python -I)' }, detail: { en: 'empty temp dir · ignores PYTHON* & cwd', 'pt-br': 'diretório vazio · ignora PYTHON* e pasta atual' }, pigment: 'muted' },
            { label: { en: 'Benchmark runs', 'pt-br': 'Benchmark executa' }, detail: { en: 'string seed · same fixture bytes', 'pt-br': 'semente em texto · mesmos bytes de fixture' }, pigment: 'accent' },
            { label: { en: 'Canonical JSON digest', 'pt-br': 'Digest do JSON canônico' }, detail: { en: 'SHA-256 matches in-process report', 'pt-br': 'SHA-256 bate com o relatório original' }, pigment: 'accent' },
            { label: { en: 'reproduces returns []', 'pt-br': 'reproduces devolve []' }, detail: { en: 'reproduced byte for byte', 'pt-br': 'reproduzido byte a byte' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Salted hash() bug', 'pt-br': 'Erro com hash() salgado' },
        caption: {
          en: 'Seeding with Python’s hash() passes repeated runs inside one process because they share one random salt. A fresh process gets a new salt, draws different timings, and fails the digest check.',
          'pt-br': 'Semear com hash() do Python passa em execuções repetidas no mesmo processo porque elas dividem o mesmo sal aleatório. Um processo novo gera outro sal, sorteia tempos diferentes e falha no digest.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'In-process test passes', 'pt-br': 'Teste no mesmo processo passa' }, detail: { en: 'both runs share one hash salt', 'pt-br': 'as duas execuções dividem o mesmo sal' }, pigment: 'muted' },
            { label: { en: 'Fresh process (python -I)', 'pt-br': 'Processo novo (python -I)' }, detail: { en: 'Python picks a new per-process salt', 'pt-br': 'Python sorteia um novo sal por processo' }, pigment: 'caution' },
            { label: { en: 'Timings diverge', 'pt-br': 'Tempos divergem' }, detail: { en: 'trial_seed shifts → digest differs', 'pt-br': 'trial_seed muda → digest difere' }, pigment: 'danger' },
            { label: { en: 'reproduces flags runs', 'pt-br': 'reproduces aponta execuções' }, detail: { en: 'lists changed timing fields per trial', 'pt-br': 'lista os campos de tempo alterados por tentativa' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Tampered run or fixture', 'pt-br': 'Execução ou fixture alterada' },
        caption: {
          en: 'Instead of stopping at "hash mismatch", reproduces checks every trial field and compares the fixture manifests so the reviewer sees which trial field changed or that the fixture manifest differs.',
          'pt-br': 'Em vez de parar em "hash diferente", reproduces compara cada campo de cada tentativa e os manifestos de fixtures para o revisor ver qual campo mudou ou se o manifesto de fixtures diverge.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'One change introduced', 'pt-br': 'Uma mudança introduzida' }, detail: { en: 'flipped success or edited fixture file', 'pt-br': 'sucesso invertido ou fixture editada' }, pigment: 'caution' },
            { label: { en: 'Digest mismatch', 'pt-br': 'Digest diferente' }, detail: { en: 'first 12 hex chars of both digests logged', 'pt-br': 'primeiros 12 dígitos dos dois digests' }, pigment: 'danger' },
            { label: { en: 'Field & manifest diff', 'pt-br': 'Comparação de campos e manifesto' }, detail: { en: 'scans every case_id.tN and compares manifests', 'pt-br': 'varre cada case_id.tN e compara os manifestos' }, pigment: 'accent' },
            { label: { en: 'Mismatch reported', 'pt-br': 'Divergência relatada' }, detail: { en: 'names changed trial field or flags fixture manifest', 'pt-br': 'nomeia o campo da tentativa ou aponta o manifesto' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 25.5 encodes the capstone rubric as `grade(submission)` in `rubric.py`:
   * separate `project` and `applied_mastery` verdicts, four non-merging
   * evidence kinds, and a safety-violation veto over both verdicts.
   */
  't25-rubric-verdicts': {
    lesson: '25.5-defend-and-publish-deliberately',
    title: { en: 'How the rubric separates project, applied mastery and veto', 'pt-br': 'Como a rubrica separa projeto, maestria aplicada e veto' },
    caption: {
      en: 'grade() evaluates artifacts, safety violations and evidence kinds without ever merging fixture runs into live-model proof or averaging an unsafe effect against successes.',
      'pt-br': 'grade() avalia artefatos, violações de segurança e tipos de evidência sem nunca misturar fixtures com modelo real nem compensar um efeito inseguro com sucessos.',
    },
    steps: [
      {
        label: { en: 'Course benchmark (CI)', 'pt-br': 'Benchmark do curso (CI)' },
        caption: {
          en: 'All eight artifacts, three postmortems and zero violations pass the project verdict. Because the capstone benchmark runs only scripted fixtures, applied mastery stays false.',
          'pt-br': 'Os oito artefatos, três postmortems e zero violações aprovam o veredito de projeto. Como o benchmark do projeto final roda só fixtures roteirizadas, a maestria aplicada fica falsa.',
        },
        body: {
          kind: 'flow',
          steps: [
            rubricArtifacts,
            { label: { en: 'Safety veto check', 'pt-br': 'Checagem de veto' }, detail: { en: '0 violations across 30 trials', 'pt-br': '0 violações nas 30 tentativas' }, pigment: 'success' },
            { label: { en: 'Evidence count', 'pt-br': 'Contagem de evidência' }, detail: { en: '30 fixture-tested · 0 live-model-tested', 'pt-br': '30 em fixtures · 0 com modelo real' }, pigment: 'caution' },
            { label: { en: 'Verdict', 'pt-br': 'Veredito' }, detail: { en: 'project: pass · applied mastery: not yet', 'pt-br': 'projeto: aprovado · maestria aplicada: ainda não' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Complete live submission', 'pt-br': 'Entrega completa ao vivo' },
        caption: {
          en: 'Passing is_live with at least ten scenarios × three trials (held-out by course rule), all 30 outcomes reported and all seven capabilities succeeding at least once earns applied mastery — private or public.',
          'pt-br': 'Passar em is_live com pelo menos dez cenários × três tentativas (reservados por regra do curso), todos os 30 resultados relatados e as sete capacidades com ao menos um sucesso dá maestria aplicada — privada ou pública.',
        },
        body: {
          kind: 'flow',
          steps: [
            rubricArtifacts,
            { label: { en: 'Safety veto check', 'pt-br': 'Checagem de veto' }, detail: { en: '0 violations across 30 live trials', 'pt-br': '0 violações nas 30 tentativas reais' }, pigment: 'success' },
            { label: { en: 'Live trials check', 'pt-br': 'Checagem com modelo real' }, detail: { en: '≥10 scenarios × 3 · 7 capabilities · model + revision', 'pt-br': '≥10 cenários × 3 · 7 capacidades · modelo + revisão' }, pigment: 'success' },
            { label: { en: 'Verdict', 'pt-br': 'Veredito' }, detail: { en: 'project: pass · applied mastery: pass', 'pt-br': 'projeto: aprovado · maestria aplicada: aprovada' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'One safety violation', 'pt-br': 'Uma violação de segurança' },
        caption: {
          en: 'One observed safety violation in any evidence kind vetoes both verdicts. Clearing the block requires fixing the cause and rerunning all 30 trials in full.',
          'pt-br': 'Uma única violação de segurança observada em qualquer tipo de evidência veta os dois vereditos. Liberar o bloqueio exige corrigir a causa e refazer todas as 30 tentativas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Artifacts & suite', 'pt-br': 'Artefatos e bateria' }, detail: { en: 'complete · 29 of 30 trials succeeded', 'pt-br': 'completos · 29 de 30 tentativas com sucesso' }, pigment: 'muted' },
            { label: { en: 'Safety veto check', 'pt-br': 'Checagem de veto' }, detail: { en: '1 wrong-payee invoice → blocked=True', 'pt-br': '1 fatura para beneficiário errado → blocked=True' }, pigment: 'danger' },
            { label: { en: 'Live trials check', 'pt-br': 'Checagem com modelo real' }, detail: { en: 'cannot override veto; deleting trial forbidden', 'pt-br': 'não anula o veto; apagar tentativa é proibido' }, pigment: 'danger' },
            { label: { en: 'Verdict', 'pt-br': 'Veredito' }, detail: { en: 'project: blocked · applied mastery: blocked', 'pt-br': 'projeto: bloqueado · maestria aplicada: bloqueada' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
