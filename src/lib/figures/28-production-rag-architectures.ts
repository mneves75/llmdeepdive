/**
 * Figures for track 28 — Production RAG Architectures.
 */
import type { Figure } from './types'

export const TRACK_28_FIGURES = {
  '28-2-rag-assembly-flow': {
    lesson: '28.2-baseline-rag-and-context-assembly',
    title: {
      en: 'Two-stage retrieval and edge-first context placement',
      'pt-br': 'Recuperação em dois estágios e posicionamento nas bordas do contexto',
    },
    caption: {
      en: 'Broad hybrid recall pulls 50 candidates, a reranker trims them to the highest-signal 5–8 chunks, and context assembly places the top evidence at the start and end of the window to counter lost-in-the-middle degradation.',
      'pt-br': 'A busca híbrida traz 50 candidatos, um reranker reduz para os 5–8 trechos mais relevantes e a montagem posiciona a evidência mais forte no início e no fim da janela para mitigar lost-in-the-middle.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Hybrid recall (BM25 + dense)', 'pt-br': 'Busca híbrida (BM25 + densa)' }, detail: { en: 'top 50 candidates', 'pt-br': 'top 50 candidatos' }, pigment: 'accent' },
        { label: { en: 'Cross-encoder / ColBERT rerank', 'pt-br': 'Rerank com cross-encoder / ColBERT' }, detail: { en: 'top 5–8 evidence chunks', 'pt-br': 'top 5–8 trechos de evidência' }, pigment: 'caution' },
        { label: { en: 'Edge-first context layout', 'pt-br': 'Layout com evidência nas bordas' }, detail: { en: '#1 at top, #2 at bottom', 'pt-br': '#1 no topo, #2 no final' }, pigment: 'accent' },
        { label: { en: 'Grounded answer or abstention', 'pt-br': 'Resposta embasada ou abstenção' }, detail: { en: 'inline chunk citations', 'pt-br': 'citações por trecho inline' }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
