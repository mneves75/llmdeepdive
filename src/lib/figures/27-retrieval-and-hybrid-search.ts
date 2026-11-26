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
  '27-2-sliding-chunk-overlap': {
    lesson: '27.2-chunking-strategies-and-boundaries',
    title: {
      en: 'How overlap multiplies chunks and indexed tokens (L = 2,400, C = 400)',
      'pt-br': 'Como a sobreposição multiplica chunks e tokens indexados (L = 2.400, C = 400)',
    },
    caption: {
      en: 'The same 2,400-token section sliced into 400-token windows at three overlap settings. Each step shrinks the stride (C − O), increasing both the stored vector count and total tokens sent to the embedding model.',
      'pt-br': 'A mesma seção de 2.400 tokens fatiada em janelas de 400 tokens sob três níveis de sobreposição. Cada passo encurta o avanço (C − O), aumentando tanto o número de vetores armazenados quanto o total de tokens enviados ao modelo de embedding.',
    },
    steps: [
      {
        label: { en: '0% overlap (O = 0)', 'pt-br': 'Sobreposição 0% (O = 0)' },
        caption: {
          en: 'Stride 400 tokens: 6 non-overlapping chunks and 2,400 indexed tokens (0% overhead). Cheap to store, yet any sentence crossing a 400-token boundary splits in half.',
          'pt-br': 'Passo de 400 tokens: 6 chunks sem sobreposição e 2.400 tokens indexados (0% de acréscimo). Barato para armazenar, mas qualquer frase que cruze a marca de 400 tokens fica partida ao meio.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chunk 1', 'pt-br': 'Bloco 1' }, detail: { en: 'tokens 1–400 (400 tokens)', 'pt-br': 'tokens 1 a 400 (400 tokens)' }, pigment: 'accent' },
            { label: { en: 'Chunk 2', 'pt-br': 'Bloco 2' }, detail: { en: 'tokens 401–800 (stride 400)', 'pt-br': 'tokens 401 a 800 (passo 400)' }, pigment: 'accent' },
            { label: { en: 'Chunks 3–5', 'pt-br': 'Blocos 3 a 5' }, detail: { en: 'tokens 801–2,000 (no overlap)', 'pt-br': 'tokens 801 a 2.000 (sem repetição)' }, pigment: 'muted' },
            { label: { en: 'Chunk 6', 'pt-br': 'Bloco 6' }, detail: { en: 'tokens 2,001–2,400 (6 vectors, 2,400 tokens)', 'pt-br': 'tokens 2.001 a 2.400 (6 vetores, 2.400 tokens)' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '20% overlap (O = 80)', 'pt-br': 'Sobreposição 20% (O = 80)' },
        caption: {
          en: 'Stride 320 tokens: 7 full 400-token chunks plus a 160-token tail chunk make 8 vectors and 2,960 indexed tokens — 560 extra tokens (+23.3% embedding compute).',
          'pt-br': 'Passo de 320 tokens: 7 chunks cheios de 400 tokens mais um trecho final de 160 tokens formam 8 vetores e 2.960 tokens indexados — 560 tokens extras (+23,3% de cálculo de embedding).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chunk 1', 'pt-br': 'Bloco 1' }, detail: { en: 'tokens 1–400 (400 tokens)', 'pt-br': 'tokens 1 a 400 (400 tokens)' }, pigment: 'accent' },
            { label: { en: 'Chunk 2', 'pt-br': 'Bloco 2' }, detail: { en: 'tokens 321–720 (80 shared, stride 320)', 'pt-br': 'tokens 321 a 720 (80 repetidos, passo 320)' }, pigment: 'caution' },
            { label: { en: 'Chunks 3–6', 'pt-br': 'Blocos 3 a 6' }, detail: { en: 'tokens 641–2,000 (advance +320)', 'pt-br': 'tokens 641 a 2.000 (avanço +320)' }, pigment: 'muted' },
            { label: { en: 'Chunk 7', 'pt-br': 'Bloco 7' }, detail: { en: 'tokens 1,921–2,320 (400 tokens)', 'pt-br': 'tokens 1.921 a 2.320 (400 tokens)' }, pigment: 'caution' },
            { label: { en: 'Chunk 8', 'pt-br': 'Bloco 8' }, detail: { en: 'tokens 2,241–2,400 (160 tokens; 2,960 total)', 'pt-br': 'tokens 2.241 a 2.400 (160 tokens; 2.960 no total)' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: '50% overlap (O = 200)', 'pt-br': 'Sobreposição 50% (O = 200)' },
        caption: {
          en: 'Stride 200 tokens: 11 full 400-token chunks produce 11 vectors and 4,400 indexed tokens (+83.3% extra tokens) — nearly doubling both embedding compute and vector storage.',
          'pt-br': 'Passo de 200 tokens: 11 chunks cheios de 400 tokens geram 11 vetores e 4.400 tokens indexados (+83,3% de tokens extras) — quase dobrando tanto o cálculo de embeddings quanto os vetores armazenados.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Chunk 1', 'pt-br': 'Bloco 1' }, detail: { en: 'tokens 1–400 (400 tokens)', 'pt-br': 'tokens 1 a 400 (400 tokens)' }, pigment: 'accent' },
            { label: { en: 'Chunk 2', 'pt-br': 'Bloco 2' }, detail: { en: 'tokens 201–600 (200 shared, stride 200)', 'pt-br': 'tokens 201 a 600 (200 repetidos, passo 200)' }, pigment: 'danger' },
            { label: { en: 'Chunks 3–10', 'pt-br': 'Blocos 3 a 10' }, detail: { en: 'tokens 401–2,200 (advance +200)', 'pt-br': 'tokens 401 a 2.200 (avanço +200)' }, pigment: 'muted' },
            { label: { en: 'Chunk 11', 'pt-br': 'Bloco 11' }, detail: { en: 'tokens 2,001–2,400 (11 vectors, 4,400 tokens)', 'pt-br': 'tokens 2.001 a 2.400 (11 vetores, 4.400 tokens)' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
  '27-3-matryoshka-two-stage': {
    lesson: '27.3-dense-embeddings-and-matryoshka',
    title: {
      en: 'Matryoshka prefixes: nested sizes, mandatory re-normalization, and two-stage search',
      'pt-br': 'Prefixos Matryoshka: tamanhos aninhados, renormalização obrigatória e busca em dois estágios',
    },
    caption: {
      en: 'A Matryoshka encoder packs the broadest meaning into the leading coordinates, letting you slice a 1,536-dim vector down to 256 dims (6× smaller), restore unit length, and rescore only the top-100 finalists at full width.',
      'pt-br': 'Um codificador Matryoshka concentra o sentido mais geral nas primeiras coordenadas, permitindo fatiar um vetor de 1.536 dims para 256 dims (6× menor), restaurar o comprimento unitário e repontuar apenas os 100 finalistas em largura total.',
    },
    steps: [
      {
        label: { en: 'Nested prefix sizes', 'pt-br': 'Prefixos aninhados' },
        caption: {
          en: 'Training applies the contrastive loss to multiple leading prefixes at once. Keeping the first 256 fp32 coordinates shrinks one vector from 6,144 B to 1,024 B (6× less memory).',
          'pt-br': 'O treino aplica a perda contrastiva a vários prefixos iniciais ao mesmo tempo. Manter as primeiras 256 coordenadas fp32 reduz um vetor de 6.144 B para 1.024 B (6× menos memória).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'First 64 dims', 'pt-br': 'Primeiras 64 dims' }, detail: { en: '256 B (24× smaller; coarsest signal)', 'pt-br': '256 B (24× menor; sinal mais amplo)' }, pigment: 'success' },
            { label: { en: 'First 256 dims', 'pt-br': 'Primeiras 256 dims' }, detail: { en: '1,024 B (6× smaller; >95% typical quality)', 'pt-br': '1.024 B (6× menor; >95% da qualidade típica)' }, pigment: 'accent' },
            { label: { en: 'First 512 dims', 'pt-br': 'Primeiras 512 dims' }, detail: { en: '2,048 B (3× smaller; sharper detail)', 'pt-br': '2.048 B (3× menor; detalhe mais fino)' }, pigment: 'caution' },
            { label: { en: 'Full 1,536 dims', 'pt-br': 'Todas as 1.536 dims' }, detail: { en: '6,144 B in fp32 (full representation)', 'pt-br': '6.144 B em fp32 (representação completa)' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Slice and re-normalize', 'pt-br': 'Fatiar e renormalizar' },
        caption: {
          en: 'Dropping the trailing 1,280 coordinates shrinks every vector’s length below 1.0 by a different amount. Re-normalizing the 256-dim prefix restores unit L2 length so dot product matches cosine again.',
          'pt-br': 'Descartar as 1.280 coordenadas finais encolhe o comprimento de cada vetor abaixo de 1,0 em proporções diferentes. Renormalizar o prefixo de 256 dims restaura a norma L2 unitária para o produto escalar voltar a equivaler ao cosseno.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Confirm MRL model', 'pt-br': 'Confirmar modelo MRL' }, detail: { en: '1,536-dim output, norm = 1.0', 'pt-br': 'saída de 1.536 dims, norma = 1,0' }, pigment: 'muted' },
            { label: { en: 'Slice first 256 dims', 'pt-br': 'Fatiar 256 dims iniciais' }, detail: { en: '1,024 B; norm drops below 1.0', 'pt-br': '1.024 B; norma cai abaixo de 1,0' }, pigment: 'caution' },
            { label: { en: 'L2 re-normalize', 'pt-br': 'Renormalizar norma L2' }, detail: { en: 'divide by new length → norm = 1.0', 'pt-br': 'dividir pelo novo tamanho → norma = 1,0' }, pigment: 'success' },
            { label: { en: 'Index queries & docs', 'pt-br': 'Indexar consultas e docs' }, detail: { en: 'both sides must use 256 dims', 'pt-br': 'ambos os lados precisam usar 256 dims' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Two-stage search funnel', 'pt-br': 'Funil em dois estágios' },
        caption: {
          en: 'At query time, compact 256-dim vectors stay in fast RAM to eliminate almost all chunks cheaply, and full 1,536-dim vectors on disk rescore only the 100 finalists.',
          'pt-br': 'Na hora da busca, vetores enxutos de 256 dims ficam na RAM rápida para eliminar quase todo o acervo de forma barata, e os vetores completos de 1.536 dims em disco repontuam só os 100 finalistas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '256-dim query prefix', 'pt-br': 'Prefixo de consulta (256)' }, detail: { en: 'sliced and unit-normalized', 'pt-br': 'fatiado e normalizado para 1,0' }, pigment: 'accent' },
            { label: { en: 'Fast RAM scan (256)', 'pt-br': 'Varredura rápida em RAM' }, detail: { en: '6× less memory and scan bandwidth', 'pt-br': '6× menos memória e banda de leitura' }, pigment: 'accent' },
            { label: { en: 'Top-100 finalists', 'pt-br': 'Top-100 finalistas' }, detail: { en: 'shortlist passed to stage two', 'pt-br': 'lista curta enviada ao estágio dois' }, pigment: 'caution' },
            { label: { en: 'Full 1,536-dim rescore', 'pt-br': 'Repontuação em 1.536 dims' }, detail: { en: 'loaded from disk for exact order', 'pt-br': 'lidos do disco para ordem final exata' }, pigment: 'success' },
          ],
        },
      },
    ],
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
