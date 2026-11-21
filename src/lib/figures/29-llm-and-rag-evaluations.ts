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

export const TRACK_29_FIGURES = {
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
} as const satisfies Record<string, Figure>
