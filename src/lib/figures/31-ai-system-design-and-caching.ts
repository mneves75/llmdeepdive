/**
 * Figures for track 31 — AI System Design & Caching.
 *
 * Latency stage numbers come directly from `~/lib/engineering-math`.
 */
import { aiSystemBudget } from '~/lib/engineering-math'
import type { Figure } from './types'

const worked = aiSystemBudget({
  retrievalMs: 85,
  guardrailMs: 45,
  ttftMs: 240,
  outputTokens: 250,
  decodeTps: 60,
  cacheHitRate: 0.35,
  cacheLookupMs: 18,
  falseHitRate: 0.02,
  monthlyRequestsK: 1000,
  costPer1kUncachedUsd: 4.5,
  provisionedMonthlyUsd: 2600,
})!

export const TRACK_31_FIGURES = {
  '31-1-latency-budget-stack': {
    lesson: '31.1-end-to-end-latency-budgets',
    title: {
      en: 'Where 4,537 ms goes on a single uncached RAG turn',
      'pt-br': 'Para onde vão 4.537 ms em um turno RAG sem cache',
    },
    caption: {
      en: `Retrieval (85 ms), guardrails (45 ms) and TTFT (240 ms) determine time to first token (370 ms), while generating 250 output tokens at 60 tok/s (${Math.round(worked.decodeMs)} ms) dominates total turn duration (${Math.round(worked.uncachedLatencyMs)} ms).`,
      'pt-br': `Recuperação (85 ms), guardrails (45 ms) e TTFT (240 ms) definem o tempo até o primeiro token (370 ms), enquanto gerar 250 tokens a 60 tok/s (${Math.round(worked.decodeMs)} ms) domina a duração total do turno (${Math.round(worked.uncachedLatencyMs)} ms).`,
    },
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        { label: { en: 'Hybrid retrieval + rerank', 'pt-br': 'Busca híbrida + rerank' }, detail: { en: '85 ms', 'pt-br': '85 ms' }, pigment: 'accent', weight: 85 },
        { label: { en: 'Input/output guardrails', 'pt-br': 'Guardrails entrada/saída' }, detail: { en: '45 ms', 'pt-br': '45 ms' }, pigment: 'caution', weight: 45 },
        { label: { en: 'Model prefill (TTFT)', 'pt-br': 'Prefill do modelo (TTFT)' }, detail: { en: '240 ms', 'pt-br': '240 ms' }, pigment: 'accent', weight: 240 },
        { label: { en: 'Autoregressive decode (250 tok @ 60 tok/s)', 'pt-br': 'Decode autorregressivo (250 tok a 60 tok/s)' }, detail: { en: `${Math.round(worked.decodeMs)} ms`, 'pt-br': `${Math.round(worked.decodeMs)} ms` }, pigment: 'danger', weight: Math.round(worked.decodeMs) },
      ],
    },
  },
} as const satisfies Record<string, Figure>
