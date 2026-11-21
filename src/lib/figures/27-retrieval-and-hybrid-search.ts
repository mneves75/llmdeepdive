/**
 * Figures for track 27 — Retrieval & Hybrid Search.
 *
 * Memory footprints and RRF fusion scores come directly from `~/lib/engineering-math`.
 */
import { hnswMemory, rrfScore } from '~/lib/engineering-math'
import type { Figure } from './types'

const fp32 = hnswMemory({ vectors: 1_000_000, dims: 1536, bytesPerDim: 4, m: 16 })!
const int8 = hnswMemory({ vectors: 1_000_000, dims: 1536, bytesPerDim: 1, m: 16 })!
const bin = hnswMemory({ vectors: 1_000_000, dims: 1536, bytesPerDim: 0.125, m: 16 })!

const rrfA = rrfScore([1, 40])
const rrfB = rrfScore([3, 2])
const rrfC = rrfScore([2, null])

export const TRACK_27_FIGURES = {
  '27-1-ingestion-pipeline': {
    lesson: '27.1-document-ingestion-and-layout-parsing',
    title: {
      en: 'Where a raw PDF breaks before a single embedding is computed',
      'pt-br': 'Onde um PDF bruto quebra antes de gerar um único embedding',
    },
    caption: {
      en: 'PDF stores drawing coordinates rather than paragraphs. Extracting reading order, tables, headers and provenance metadata first determines the ceiling of every downstream retrieval metric.',
      'pt-br': 'O PDF guarda coordenadas de desenho em vez de parágrafos. Recuperar ordem de leitura, tabelas, cabeçalhos e metadados de origem define o teto de toda métrica posterior de busca.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Source bytes (PDF/HTML/DOCX)', 'pt-br': 'Bytes de origem (PDF/HTML/DOCX)' }, detail: { en: 'multi-column & scanned tables', 'pt-br': 'múltiplas colunas e tabelas escaneadas' }, pigment: 'muted' },
        { label: { en: 'Layout & reading-order parse', 'pt-br': 'Análise de layout e ordem de leitura' }, detail: { en: 'blocks, tables, headings preserved', 'pt-br': 'blocos, tabelas e títulos preservados' }, pigment: 'accent' },
        { label: { en: 'Provenance & ACL attachment', 'pt-br': 'Anexo de origem e ACL' }, detail: { en: 'doc_id, page, tenant, updated_at', 'pt-br': 'doc_id, página, tenant, updated_at' }, pigment: 'caution' },
        { label: { en: 'Index-ready canonical units', 'pt-br': 'Unidades canônicas prontas para indexar' }, detail: { en: 'auditable chunk boundaries', 'pt-br': 'fronteiras de chunks auditáveis' }, pigment: 'success' },
      ],
    },
  },
  '27-4-hnsw-memory-stack': {
    lesson: '27.4-ann-vector-indexes-and-hnsw',
    title: {
      en: 'RAM cost of 1,000,000 vectors (1,536 dims, HNSW M = 16)',
      'pt-br': 'Custo de RAM para 1.000.000 de vetores (1.536 dims, HNSW M = 16)',
    },
    caption: {
      en: `Quantizing vectors from fp32 (${fp32.totalGiB.toFixed(2)} GiB) to int8 (${int8.totalGiB.toFixed(2)} GiB) or 1-bit binary (${bin.totalGiB.toFixed(2)} GiB) shrinks vector storage sharply, while the ${fp32.graphGiB.toFixed(2)} GiB HNSW graph edge table stays fixed.`,
      'pt-br': `Quantizar vetores de fp32 (${fp32.totalGiB.toFixed(2).replace('.', ',')} GiB) para int8 (${int8.totalGiB.toFixed(2).replace('.', ',')} GiB) ou binário de 1 bit (${bin.totalGiB.toFixed(2).replace('.', ',')} GiB) reduz drasticamente o armazenamento vetorial, mas os ${fp32.graphGiB.toFixed(2).replace('.', ',')} GiB das arestas HNSW permanecem fixos.`,
    },
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        { label: { en: 'fp32 vectors + HNSW graph', 'pt-br': 'Vetores fp32 + grafo HNSW' }, detail: { en: `${fp32.totalGiB.toFixed(2)} GiB (${fp32.bytesPerVector} B/vec)`, 'pt-br': `${fp32.totalGiB.toFixed(2).replace('.', ',')} GiB (${fp32.bytesPerVector} B/vet)` }, pigment: 'danger', weight: Number(fp32.totalGiB.toFixed(2)) },
        { label: { en: 'int8 scalar-quantized + graph', 'pt-br': 'Quantização escalar int8 + grafo' }, detail: { en: `${int8.totalGiB.toFixed(2)} GiB (${int8.bytesPerVector} B/vec)`, 'pt-br': `${int8.totalGiB.toFixed(2).replace('.', ',')} GiB (${int8.bytesPerVector} B/vet)` }, pigment: 'caution', weight: Number(int8.totalGiB.toFixed(2)) },
        { label: { en: '1-bit binary + graph', 'pt-br': 'Binário de 1 bit + grafo' }, detail: { en: `${bin.totalGiB.toFixed(2)} GiB (${bin.bytesPerVector} B/vec)`, 'pt-br': `${bin.totalGiB.toFixed(2).replace('.', ',')} GiB (${bin.bytesPerVector} B/vet)` }, pigment: 'success', weight: Number(bin.totalGiB.toFixed(2)) },
      ],
    },
  },
  '27-5-rrf-fusion-grid': {
    lesson: '27.5-bm25-hybrid-search-and-rrf',
    title: {
      en: 'Reciprocal Rank Fusion rewards consensus across dense and BM25',
      'pt-br': 'Reciprocal Rank Fusion recompensa consenso entre denso e BM25',
    },
    caption: {
      en: `With k = 60, Document B (dense #3, BM25 #2 → ${rrfB.toFixed(5)}) outranks Document A (dense #1, BM25 #40 → ${rrfA.toFixed(5)}) and Document C (dense #2, absent from BM25 → ${rrfC.toFixed(5)}) without normalizing incompatible score scales.`,
      'pt-br': `Com k = 60, o Documento B (denso #3, BM25 #2 → ${rrfB.toFixed(5).replace('.', ',')}) supera o Documento A (denso #1, BM25 #40 → ${rrfA.toFixed(5).replace('.', ',')}) e o Documento C (denso #2, ausente no BM25 → ${rrfC.toFixed(5).replace('.', ',')}) sem normalizar escalas incompatíveis.`,
    },
    body: {
      kind: 'grid',
      bins: 4,
      columns: [
        { en: 'Dense rank weight', 'pt-br': 'Peso ranking denso' },
        { en: 'BM25 rank weight', 'pt-br': 'Peso ranking BM25' },
        { en: 'Fused RRF (k=60)', 'pt-br': 'RRF combinado (k=60)' },
      ],
      rows: [
        { en: 'Doc B (#3 dense, #2 BM25)', 'pt-br': 'Doc B (#3 denso, #2 BM25)' },
        { en: 'Doc A (#1 dense, #40 BM25)', 'pt-br': 'Doc A (#1 denso, #40 BM25)' },
        { en: 'Doc C (#2 dense, unranked)', 'pt-br': 'Doc C (#2 denso, ausente)' },
      ],
      cells: [
        [0.01587, 0.01613, Number(rrfB.toFixed(5))],
        [0.01639, 0.01, Number(rrfA.toFixed(5))],
        [0.01613, null, Number(rrfC.toFixed(5))],
      ],
    },
  },
} as const satisfies Record<string, Figure>
