/**
 * Figures for track 30 — RAG Security, Privacy & Governance.
 */
import type { Figure } from './types'

export const TRACK_30_FIGURES = {
  '30-1-acl-prefilter-flow': {
    lesson: '30.1-rag-access-control-and-tenant-isolation',
    title: {
      en: 'Enforce tenant and document ACLs before vector retrieval, never in the prompt',
      'pt-br': 'Aplique ACLs de tenant e documento antes da busca vetorial, nunca no prompt',
    },
    caption: {
      en: 'Post-filtering drops candidates after top-k and breaks recall; prompt-level restrictions leak restricted chunks into model context. Pre-filtering with trusted principal claims guarantees unauthorized documents never enter scoring.',
      'pt-br': 'Pós-filtragem descarta candidatos após o top-k e derruba recall; restrições no prompt vazam trechos sigilosos para o contexto. Pré-filtragem com claims do runtime impede documentos não autorizados de entrar na pontuação.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Trusted runtime principal', 'pt-br': 'Principal autenticado no runtime' }, detail: { en: 'tenant_id + group ACLs', 'pt-br': 'tenant_id + ACLs de grupo' }, pigment: 'accent' },
        { label: { en: 'Pre-filter bitset / partition', 'pt-br': 'Bitset / partição pré-filtrada' }, detail: { en: 'only authorized chunks eligible', 'pt-br': 'só trechos autorizados elegíveis' }, pigment: 'caution' },
        { label: { en: 'Hybrid ANN + BM25 scoring', 'pt-br': 'Pontuação híbrida ANN + BM25' }, detail: { en: 'restricted docs invisible', 'pt-br': 'docs restritos invisíveis' }, pigment: 'accent' },
        { label: { en: 'Context assembled for LLM', 'pt-br': 'Contexto montado para o LLM' }, detail: { en: 'zero cross-tenant exposure', 'pt-br': 'zero exposição entre tenants' }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
