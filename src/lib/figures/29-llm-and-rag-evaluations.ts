/**
 * Figures for track 29 — LLM & RAG Evaluations.
 *
 * Retrieval metrics and Cohen's kappa come directly from `~/lib/engineering-math`.
 */
import { judgeCalibration, retrievalMetrics } from '~/lib/engineering-math'
import type { Figure } from './types'

const ir = retrievalMetrics({ hits: [false, true, false, true, true, false, false, true], totalRelevant: 5, k: 5 })!
const bal = judgeCalibration({ tp: 42, fp: 8, fn: 6, tn: 44 })!
const imb = judgeCalibration({ tp: 90, fp: 5, fn: 4, tn: 1 })!
const balKappa = bal.kappa!
const imbKappa = imb.kappa!

/** 29.4: public benchmark score versus leaked fraction for Model X and Model Y. */
const contaminationAxes = {
  xAxis: {
    label: { en: 'Leaked share of benchmark', 'pt-br': 'Fatia vazada do benchmark' },
    scale: 'linear',
    min: 0,
    max: 50,
    unit: '%',
  },
  yAxis: {
    label: { en: 'Published benchmark score', 'pt-br': 'Nota publicada no benchmark' },
    scale: 'linear',
    min: 50,
    max: 85,
    unit: '%',
  },
} as const

const modelYCleanSeries = {
  label: { en: 'Model Y (uncontaminated: 66.0%)', 'pt-br': 'Modelo Y (limpo: 66,0%)' },
  pigment: 'success',
  points: [[0, 66], [50, 66]],
} as const

const modelXCleanSeries = {
  label: { en: 'Model X (clean ability: 60.0%)', 'pt-br': 'Modelo X (capacidade limpa: 60,0%)' },
  pigment: 'muted',
  points: [[0, 60], [50, 60]],
} as const

export const TRACK_29_FIGURES = {
  /**
   * 29.1 tabulated 50 audited RAG failures and walked through the four-stage
   * coding-to-checks workflow. Stepping from the Pareto stack to the audit
   * workflow replaces the markdown table and shows both what broke and how raw
   * trace notes turn into narrow pass/fail checks.
   */
  't29-error-taxonomy-pareto': {
    lesson: '29.1-error-analysis-and-failure-taxonomies',
    title: {
      en: 'From 50 failed traces to targeted binary checks',
      'pt-br': 'De 50 rastros com falha a verificações binárias direcionadas',
    },
    caption: {
      en: 'Open coding turns 50 flagged support traces into five named failure buckets, exposing that 68% break before generation starts. Each recurring bucket then becomes a narrow pass/fail check.',
      'pt-br': 'A codificação aberta transforma 50 rastros sinalizados em cinco categorias nomeadas de falha, revelando que 68% quebram antes de a geração começar. Cada categoria recorrente vira então uma verificação binária passa/falha.',
    },
    steps: [
      {
        label: { en: 'Pareto of 50 failures', 'pt-br': 'Pareto das 50 falhas' },
        caption: {
          en: '34 of 50 failures (68%, red bands) occur in retrieval and context assembly before the generator writes a word; 14 (28%, amber) happen in abstention and citations; only 2 (4%, muted) are tone slips.',
          'pt-br': '34 de 50 falhas (68%, faixas vermelhas) ocorrem na busca e na montagem de contexto antes de o gerador escrever uma palavra; 14 (28%, âmbar) ocorrem em abstenção e citações; apenas 2 (4%, neutro) são desvios de tom.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Retrieved superseded policy version', 'pt-br': 'Recuperou versão vencida de política' },
              detail: { en: '21 of 50 · ingestion metadata & retrieval filter', 'pt-br': '21 de 50 · metadados de ingestão e filtro de busca' },
              weight: 21,
              pigment: 'danger',
            },
            {
              label: { en: 'Missed exception in chunk #4', 'pt-br': 'Ignorou exceção no trecho #4' },
              detail: { en: '13 of 50 · reranking & context assembly', 'pt-br': '13 de 50 · reranking e montagem de contexto' },
              weight: 13,
              pigment: 'danger',
            },
            {
              label: { en: 'Guessed on unindexed topic', 'pt-br': 'Chutou em tema não indexado' },
              detail: { en: '9 of 50 · abstention gate & prompt', 'pt-br': '9 de 50 · portão de abstenção e prompt' },
              weight: 9,
              pigment: 'caution',
            },
            {
              label: { en: 'Cited chunk contradicted claim', 'pt-br': 'Trecho citado contradizia a afirmação' },
              detail: { en: '5 of 50 · grounding & citation verifier', 'pt-br': '5 de 50 · embasamento e verificador de citações' },
              weight: 5,
              pigment: 'caution',
            },
            {
              label: { en: 'Stiff wording or formatting slip', 'pt-br': 'Tom rígido ou desvio de formatação' },
              detail: { en: '2 of 50 · prompt tone & post-processing', 'pt-br': '2 de 50 · tom do prompt e pós-processamento' },
              weight: 2,
              pigment: 'muted',
            },
          ],
        },
      },
      {
        label: { en: 'Audit workflow', 'pt-br': 'Fluxo da auditoria' },
        caption: {
          en: 'Read complete traces without pre-built labels, blame the earliest broken stage, group notes into 5 to 8 categories until 20 new traces add none, then convert each category into a pass/fail check.',
          'pt-br': 'Leia rastros completos sem rótulos prontos, atribua a falha à primeira etapa que quebrou, agrupe notas em 5 a 8 categorias até 20 rastros novos não revelarem nenhuma outra e converta cada categoria em uma verificação passa/falha.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Open coding', 'pt-br': 'Codificação aberta' },
              detail: { en: 'read 50–100 full traces; log raw concrete defects', 'pt-br': 'ler 50–100 rastros completos; anotar defeitos concretos' },
              pigment: 'accent',
            },
            {
              label: { en: 'First-upstream rule', 'pt-br': 'Regra do primeiro defeito' },
              detail: { en: 'charge each failure to the earliest broken stage', 'pt-br': 'atribuir cada falha à primeira etapa que quebrou' },
              pigment: 'caution',
            },
            {
              label: { en: 'Axial coding', 'pt-br': 'Codificação axial' },
              detail: { en: 'group into 5–8 stage categories until saturation', 'pt-br': 'agrupar em 5–8 categorias por etapa até saturar' },
              pigment: 'accent',
            },
            {
              label: { en: 'Binary checks & regression', 'pt-br': 'Checagens binárias e regressão' },
              detail: { en: 'deterministic code first, narrow pass/fail judges second', 'pt-br': 'código determinístico primeiro, juízes passa/falha depois' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },
  '29-2-ir-metrics-grid': {
    lesson: '29.2-retrieval-and-generation-metrics',
    title: {
      en: 'Rank position changes RR and NDCG@5 even when Recall@5 is identical',
      'pt-br': 'A posição no ranking altera RR e NDCG@5 mesmo com Recall@5 idêntico',
    },
    caption: {
      en: `With 5 relevant chunks in the corpus and hits at ranks 2, 4 and 5 inside top-5, Recall@5 is ${(ir.recallAtK * 100).toFixed(1)}% and Precision@5 is ${(ir.precisionAtK * 100).toFixed(1)}%, while missing rank 1 holds single-query RR to ${ir.rr.toFixed(3)} and NDCG@5 to ${ir.ndcgAtK.toFixed(3)}.`,
      'pt-br': `Com 5 trechos relevantes no corpus e acertos nas posições 2, 4 e 5 do top-5, Recall@5 é ${(ir.recallAtK * 100).toFixed(1).replace('.', ',')}% e Precision@5 é ${(ir.precisionAtK * 100).toFixed(1).replace('.', ',')}%, enquanto errar a posição 1 segura o RR da consulta em ${ir.rr.toFixed(3).replace('.', ',')} e NDCG@5 em ${ir.ndcgAtK.toFixed(3).replace('.', ',')}.`,
    },
    body: {
      kind: 'grid',
      bins: 4,
      columns: [
        { en: 'Rank 1', 'pt-br': 'Posição 1' },
        { en: 'Rank 2', 'pt-br': 'Posição 2' },
        { en: 'Rank 3', 'pt-br': 'Posição 3' },
        { en: 'Rank 4', 'pt-br': 'Posição 4' },
        { en: 'Rank 5', 'pt-br': 'Posição 5' },
      ],
      rows: [
        { en: 'Discount 1 / log2(rank + 1)', 'pt-br': 'Desconto 1 / log2(pos + 1)' },
        { en: 'Worked run (hits at 2, 4, 5)', 'pt-br': 'Execução (acertos em 2, 4, 5)' },
      ],
      cells: [
        [1.0, 0.631, 0.5, 0.431, 0.387],
        [null, 0.631, null, 0.431, 0.387],
      ],
    },
  },
  '29-3-kappa-confusion-grid': {
    lesson: '29.3-llm-as-a-judge-and-calibration',
    title: {
      en: 'High raw agreement can hide a near-useless LLM judge',
      'pt-br': 'Alta concordância bruta pode esconder um juiz LLM quase inútil',
    },
    caption: {
      en: `A balanced judge (42/8/6/44) hits ${(bal.observedAgreement * 100).toFixed(0)}% agreement with κ = ${balKappa.toFixed(3)}. An imbalanced rubber-stamp judge (90/5/4/1) scores ${(imb.observedAgreement * 100).toFixed(0)}% raw agreement yet drops to κ = ${imbKappa.toFixed(3)} because chance agreement alone is ${(imb.expectedAgreement * 100).toFixed(1)}%.`,
      'pt-br': `Um juiz equilibrado (42/8/6/44) atinge ${(bal.observedAgreement * 100).toFixed(0)}% de concordância com κ = ${balKappa.toFixed(3).replace('.', ',')}. Um juiz carimbador desbalanceado (90/5/4/1) marca ${(imb.observedAgreement * 100).toFixed(0)}% bruto mas cai para κ = ${imbKappa.toFixed(3).replace('.', ',')} porque o acaso sozinho já concorda em ${(imb.expectedAgreement * 100).toFixed(1).replace('.', ',')}%.`,
    },
    body: {
      kind: 'grid',
      bins: 4,
      columns: [
        { en: 'Raw agreement (Po)', 'pt-br': 'Concordância bruta (Po)' },
        { en: 'Chance agreement (Pe)', 'pt-br': 'Acaso esperado (Pe)' },
        { en: 'Cohen’s kappa (κ)', 'pt-br': 'Kappa de Cohen (κ)' },
      ],
      rows: [
        { en: 'Balanced judge (42/8/6/44)', 'pt-br': 'Juiz equilibrado (42/8/6/44)' },
        { en: 'Rubber-stamp judge (90/5/4/1)', 'pt-br': 'Juiz carimbador (90/5/4/1)' },
      ],
      cells: [
        [Number(bal.observedAgreement.toFixed(3)), Number(bal.expectedAgreement.toFixed(3)), Number(balKappa.toFixed(3))],
        [Number(imb.observedAgreement.toFixed(3)), Number(imb.expectedAgreement.toFixed(3)), Number(imbKappa.toFixed(3))],
      ],
    },
  },

  /**
   * 29.4 contrasts Model X (95% on leaked items, 60% on clean items) against
   * uncontaminated Model Y (66% clean). Stepping from 0% private evaluation to
   * increasing benchmark leakage shows the crossover near 17% and the 70.5% vs
   * 66.0% reversal at 30% leakage.
   */
  't29-contamination-crossover': {
    lesson: '29.4-benchmarks-leaderboards-and-contamination',
    title: {
      en: 'How benchmark leakage flips the leaderboard winner',
      'pt-br': 'Como o vazamento de benchmark inverte o vencedor do leaderboard',
    },
    caption: {
      en: 'Model Y solves 66.0% of unseen questions while Model X solves 60.0% clean and memorizes 95.0% of leaked items. Once more than about 17% of a public benchmark leaks into Model X’s training data, the weaker model takes first place.',
      'pt-br': 'O Modelo Y resolve 66,0% das questões inéditas, enquanto o Modelo X resolve 60,0% limpas e memoriza 95,0% dos itens vazados. Acima de cerca de 17% de vazamento no benchmark público, o modelo mais fraco assume o primeiro lugar.',
    },
    steps: [
      {
        label: { en: 'Private eval (0% leak)', 'pt-br': 'Avaliação privada (0% vazado)' },
        caption: {
          en: 'On private company policies with zero leakage, Model Y leads Model X by 6 percentage points (66.0% versus 60.0%).',
          'pt-br': 'Em políticas privadas da empresa com vazamento zero, o Modelo Y lidera o Modelo X por 6 pontos percentuais (66,0% contra 60,0%).',
        },
        body: {
          kind: 'plot',
          ...contaminationAxes,
          series: [
            {
              ...modelYCleanSeries,
              marks: [{ at: [0, 66], label: { en: 'Private: 66%', 'pt-br': 'Privado: 66%' } }],
            },
            {
              ...modelXCleanSeries,
              marks: [{ at: [0, 60], label: { en: 'Private: 60%', 'pt-br': 'Privado: 60%' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Public benchmark with leakage', 'pt-br': 'Benchmark público com vazamento' },
        caption: {
          en: 'Every 10% of leaked items adds 3.5 points to Model X’s published score. At 30% leakage, Model X posts 70.5% and appears 4.5 points ahead of Model Y despite being 6 points weaker on unseen questions.',
          'pt-br': 'Cada 10% de itens vazados soma 3,5 pontos à nota publicada do Modelo X. Com 30% de vazamento, o Modelo X marca 70,5% e parece 4,5 pontos à frente do Modelo Y apesar de ser 6 pontos mais fraco em questões inéditas.',
        },
        body: {
          kind: 'plot',
          ...contaminationAxes,
          series: [
            modelYCleanSeries,
            {
              label: { en: 'Model X (public score with leakage)', 'pt-br': 'Modelo X (nota pública com vazamento)' },
              pigment: 'danger',
              points: [[0, 60], [17.14, 66], [30, 70.5], [50, 77.5]],
              marks: [
                { at: [17.14, 66], label: { en: 'Crosses near 17%', 'pt-br': 'Cruza perto de 17%' } },
                { at: [30, 70.5], label: { en: '30% leak: 70.5%', 'pt-br': '30% vazado: 70,5%' } },
              ],
            },
            modelXCleanSeries,
          ],
        },
      },
    ],
  },

  /**
   * 29.5 split evaluation into three cost/speed tiers (markdown table) and
   * closed the loop from live production failures back into offline CI tests
   * (bulleted workflow). Stepping between the three tiers and the four-step
   * feedback loop replaces both structures in one interactive figure.
   */
  't29-eval-flywheel-tiers': {
    lesson: '29.5-offline-to-online-eval-flywheels',
    title: {
      en: 'Three evaluation tiers and the loop that keeps them fresh',
      'pt-br': 'Três camadas de avaliação e o ciclo que as mantém atualizadas',
    },
    caption: {
      en: 'Fast deterministic gates protect every pull request, multi-trial suites protect releases, and low-cost live monitoring feeds new production failures back into the versioned offline suite.',
      'pt-br': 'Gates determinísticos rápidos protegem cada pull request, suítes com múltiplas tentativas protegem lançamentos, e o monitoramento ao vivo de baixo custo devolve novas falhas de produção à suíte offline versionada.',
    },
    steps: [
      {
        label: { en: 'Three evaluation tiers', 'pt-br': 'Três camadas de avaliação' },
        caption: {
          en: 'Speed and spend follow the trigger: ~45 s and ~USD 0.15 per PR, ~8 min and ~USD 2.50 per release run, and 0 ms user wait at ~USD 0.80/day for live 2% stratified judge sampling.',
          'pt-br': 'Velocidade e gasto seguem o gatilho: ~45 s e ~USD 0,15 por PR, ~8 min e ~USD 2,50 por execução de release, e 0 ms de espera ao usuário por ~USD 0,80/dia na amostragem estratificada de 2% no juiz.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Tier 1 · PR commit gate', 'pt-br': 'Camada 1 · Gate de PR' },
              detail: { en: '40 fast golden + code cases · ~45 s · ~USD 0.15/PR · blocks merge', 'pt-br': '40 casos rápidos e em código · ~45 s · ~USD 0,15/PR · bloqueia merge' },
              pigment: 'accent',
            },
            {
              label: { en: 'Tier 2 · Release / nightly', 'pt-br': 'Camada 2 · Release / noturna' },
              detail: { en: '250 stratified cases × 3 trials · calibrated judges (κ ≥ 0.70) · ~8 min · ~USD 2.50/run', 'pt-br': '250 casos estratificados × 3 tentativas · juízes calibrados (κ ≥ 0,70) · ~8 min · ~USD 2,50/execução' },
              pigment: 'caution',
            },
            {
              label: { en: 'Tier 3 · Online async monitor', 'pt-br': 'Camada 3 · Monitor assíncrono online' },
              detail: { en: '100% deterministic telemetry + 2% stratified async judge · 0 ms user wait · ~USD 0.80/day', 'pt-br': '100% telemetria determinística + 2% juiz assíncrono estratificado · 0 ms ao usuário · ~USD 0,80/dia' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Closing the flywheel to CI', 'pt-br': 'Fechando o ciclo de volta ao CI' },
        caption: {
          en: 'Live monitoring only raises quality when newly discovered failures are redacted, labeled, added to the versioned golden set, paired with monthly 50-trace kappa checks, and pruned when policies retire.',
          'pt-br': 'O monitoramento ao vivo só eleva a qualidade quando novas falhas são anonimizadas, rotuladas, congeladas no conjunto dourado versionado, acompanhadas de checagens mensais de kappa em 50 rastros e podadas quando políticas saem de vigor.',
        },
        body: {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Capture & redact', 'pt-br': 'Capturar e anonimizar' },
              detail: { en: 'export full failing trace and strip personal data', 'pt-br': 'exportar o rastro completo com falha e remover dados pessoais' },
              pigment: 'danger',
            },
            {
              label: { en: 'Minimize & label', 'pt-br': 'Minimizar e rotular' },
              detail: { en: 'assign taxonomy bucket and freeze in golden CI suite', 'pt-br': 'classificar na taxonomia e congelar na suíte dourada de CI' },
              pigment: 'accent',
            },
            {
              label: { en: 'Re-check judge kappa', 'pt-br': 'Reverificar o kappa do juiz' },
              detail: { en: 'human-label 50 fresh traces monthly to catch judge drift', 'pt-br': 'rotular 50 rastros recentes por mês para pegar deriva do juiz' },
              pigment: 'caution',
            },
            {
              label: { en: 'Prune stale cases', 'pt-br': 'Podar casos vencidos' },
              detail: { en: 'retire deleted policies so CI stays fast and trustworthy', 'pt-br': 'aposentar políticas excluídas para manter o CI rápido e confiável' },
              pigment: 'success',
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
