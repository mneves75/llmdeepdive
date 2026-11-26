/**
 * Figures for track 28 — Production RAG Architectures.
 */
import type { Figure } from './types'

const costCurveAxes = {
  xAxis: {
    label: { en: 'Monthly queries', 'pt-br': 'Consultas mensais' },
    scale: 'linear',
    min: 0,
    max: 10,
    unit: 'k',
  },
  yAxis: {
    label: { en: 'Monthly input cost', 'pt-br': 'Custo mensal de entrada' },
    scale: 'linear',
    min: 0,
    max: 4000,
    unit: 'USD',
  },
} as const

const uncachedLongContext = {
  label: { en: 'Uncached long context (200k tokens)', 'pt-br': 'Contexto longo sem cache (200 mil tokens)' },
  points: [[0, 0], [5, 2000], [10, 4000]],
} as const

const cachedLongContext = {
  label: { en: '90%-cached long context', 'pt-br': 'Contexto longo com 90% de cache' },
  points: [[0, 0], [5, 380], [10, 760]],
} as const

const maxsimColumns = [
  { en: 'return', 'pt-br': 'devolução' },
  { en: 'customs', 'pt-br': 'alfândega' },
  { en: 'hold', 'pt-br': 'retenção' },
] as const

const maxsimRows = [
  { en: 'refund', 'pt-br': 'reembolso' },
  { en: 'delay', 'pt-br': 'atraso' },
] as const

export const TRACK_28_FIGURES = {
  '28-1-rag-context-cost-curve': {
    lesson: '28.1-rag-vs-long-context-vs-fine-tuning',
    title: {
      en: 'Monthly input bill for a 200,000-token handbook',
      'pt-br': 'Fatura mensal de entrada para um manual de 200.000 tokens',
    },
    caption: {
      en: 'At USD 2.00 per million uncached input tokens (USD 0.20 on a 90%-discounted prefix-cache hit), monthly input cost scales linearly with query volume and with the number of tokens sent per request.',
      'pt-br': 'A USD 2,00 por milhão de tokens de entrada sem cache (USD 0,20 com 90% de desconto em acerto de cache de prefixo), o custo mensal cresce de forma linear com o volume de consultas e com os tokens enviados por requisição.',
    },
    steps: [
      {
        label: { en: 'Long context (uncached vs cached)', 'pt-br': 'Contexto longo (sem cache vs em cache)' },
        caption: {
          en: 'Sending all 200,000 tokens uncached reaches USD 4,000 at 10,000 queries. A 90% warm prefix-cache hit rate drops the bill to USD 760 (9,000 × USD 0.04 + 1,000 × USD 0.40), though every weekly edit invalidates the cache.',
          'pt-br': 'Enviar os 200.000 tokens sem cache chega a USD 4.000 em 10.000 consultas. Uma taxa de 90% de acerto no cache de prefixo reduz a conta para USD 760 (9.000 × USD 0,04 + 1.000 × USD 0,40), mas toda edição semanal invalida o cache.',
        },
        body: {
          kind: 'plot',
          ...costCurveAxes,
          series: [
            {
              ...uncachedLongContext,
              pigment: 'danger',
              marks: [{ at: [10, 4000], label: { en: 'USD 4,000', 'pt-br': 'USD 4.000' } }],
            },
            {
              ...cachedLongContext,
              pigment: 'caution',
              marks: [{ at: [10, 760], label: { en: 'USD 760', 'pt-br': 'USD 760' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Adding baseline RAG (3,000 tokens)', 'pt-br': 'Adicionando RAG básico (3.000 tokens)' },
        caption: {
          en: 'Retrieving six 500-token chunks sends 3,000 tokens per query and totals USD 60 at 10,000 queries — 67 times cheaper than uncached long context and about 12.7 times cheaper than 90%-cached long context.',
          'pt-br': 'Recuperar seis trechos de 500 tokens envia 3.000 tokens por consulta e soma USD 60 em 10.000 consultas — 67 vezes mais barato que o contexto longo sem cache e cerca de 12,7 vezes mais barato que o contexto longo com 90% de cache.',
        },
        body: {
          kind: 'plot',
          ...costCurveAxes,
          series: [
            { ...uncachedLongContext, pigment: 'muted' },
            {
              ...cachedLongContext,
              pigment: 'caution',
              marks: [{ at: [10, 760], label: { en: 'USD 760', 'pt-br': 'USD 760' } }],
            },
            {
              label: { en: 'RAG (6 × 500 = 3,000 tokens)', 'pt-br': 'RAG (6 × 500 = 3.000 tokens)' },
              pigment: 'success',
              points: [[0, 0], [5, 30], [10, 60]],
              marks: [{ at: [10, 60], label: { en: 'USD 60', 'pt-br': 'USD 60' } }],
            },
          ],
        },
      },
    ],
  },

  '28-2-window-token-slices': {
    lesson: '28.2-baseline-rag-and-context-assembly',
    title: {
      en: 'Budgeting an 8,192-token window in prompt order',
      'pt-br': 'Orçando uma janela de 8.192 tokens na ordem do prompt',
    },
    caption: {
      en: 'Subtracting fixed and reserved slices (2,750 tokens) leaves 5,442 tokens for retrieved evidence — up to 9 formatted chunks at 550 tokens each, though sending the top 5–8 reduces distractor noise. Keeping static instructions first preserves prefix caching.',
      'pt-br': 'Subtrair as fatias fixas e reservadas (2.750 tokens) deixa 5.442 tokens para evidências — até 9 trechos formatados de 550 tokens cada, embora enviar os 5–8 melhores reduza ruído. Manter instruções estáticas no topo preserva o cache de prefixo.',
    },
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        {
          label: { en: 'Static system prompt and citation rules', 'pt-br': 'Prompt de sistema estático e regras de citação' },
          detail: { en: '600 tokens — pinned first for prefix caching', 'pt-br': '600 tokens — fixado no início para o cache de prefixo' },
          pigment: 'accent',
          weight: 600,
        },
        {
          label: { en: 'Recent conversation history', 'pt-br': 'Histórico recente da conversa' },
          detail: { en: '1,000 tokens — capped by recent turns', 'pt-br': '1.000 tokens — limitado aos turnos recentes' },
          pigment: 'muted',
          weight: 1000,
        },
        {
          label: { en: 'Retrieved evidence budget', 'pt-br': 'Orçamento para evidências recuperadas' },
          detail: { en: '5,442 tokens — up to 9 chunks of 550 tokens', 'pt-br': '5.442 tokens — até 9 trechos de 550 tokens' },
          pigment: 'success',
          weight: 5442,
        },
        {
          label: { en: 'Current user question', 'pt-br': 'Pergunta atual do usuário' },
          detail: { en: '150 tokens — right after the evidence block', 'pt-br': '150 tokens — logo após o bloco de evidências' },
          pigment: 'accent',
          weight: 150,
        },
        {
          label: { en: 'Reserved answer output', 'pt-br': 'Saída reservada para a resposta' },
          detail: { en: '1,000 tokens — prevents mid-sentence cutoffs', 'pt-br': '1.000 tokens — evita cortes no meio da frase' },
          pigment: 'caution',
          weight: 1000,
        },
      ],
    },
  },

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

  '28-3-colbert-maxsim-grid': {
    lesson: '28.3-reranking-cross-encoders-and-colbert',
    title: {
      en: 'ColBERT MaxSim on a 2 × 3 token matrix',
      'pt-br': 'MaxSim do ColBERT em uma matriz de tokens 2 × 3',
    },
    caption: {
      en: 'ColBERT compares every query token against every precomputed passage token, keeps only the single strongest match per query row, and sums those maxima.',
      'pt-br': 'O ColBERT compara cada token da consulta com cada token pré-computado do trecho, mantém só o casamento mais forte de cada linha e soma esses máximos.',
    },
    steps: [
      {
        label: { en: 'All token similarities', 'pt-br': 'Todas as similaridades' },
        caption: {
          en: 'Each cell is the cosine similarity between one query-token vector (row) and one precomputed passage-token vector (column).',
          'pt-br': 'Cada célula é a similaridade de cosseno entre um vetor de token da consulta (linha) e um vetor pré-computado de token do trecho (coluna).',
        },
        body: {
          kind: 'grid',
          columns: maxsimColumns,
          rows: maxsimRows,
          cells: [
            [0.82, 0.15, 0.2],
            [0.18, 0.4, 0.76],
          ],
          bins: 4,
        },
      },
      {
        label: { en: 'Keep each row maximum (MaxSim)', 'pt-br': 'Manter o máximo por linha (MaxSim)' },
        caption: {
          en: 'Weaker matches are ignored so unrelated passage words do not dilute the score: 0.82 (refund → return) + 0.76 (delay → hold) = 1.58.',
          'pt-br': 'Casamentos fracos são ignorados para que palavras irrelevantes do trecho não diluam a nota: 0,82 (reembolso → devolução) + 0,76 (atraso → retenção) = 1,58.',
        },
        body: {
          kind: 'grid',
          columns: maxsimColumns,
          rows: maxsimRows,
          cells: [
            [0.82, null, null],
            [null, null, 0.76],
          ],
          bins: 4,
        },
      },
    ],
  },

  '28-4-query-transform-pipeline': {
    lesson: '28.4-query-transformation-and-routing',
    title: {
      en: 'Three ways to rescue a weak raw query',
      'pt-br': 'Três formas de resgatar uma consulta bruta fraca',
    },
    caption: {
      en: 'Each pattern inserts a bounded planning or verification step around retrieval so pronouns, vocabulary gaps, or low-scoring results do not poison generation.',
      'pt-br': 'Cada padrão insere uma etapa limitada de planejamento ou verificação em torno da busca para que pronomes, descompasso de vocabulário ou resultados fracos não contaminem a geração.',
    },
    steps: [
      {
        label: { en: 'Rewrite and parallel split', 'pt-br': 'Reescrita e divisão paralela' },
        caption: {
          en: 'A 180 ms rewrite turns a two-part question into standalone sub-queries; running both 35 ms hybrid searches concurrently totals 215 ms instead of 250 ms.',
          'pt-br': 'Uma reescrita de 180 ms transforma uma pergunta composta em subconsultas autocontidas; rodar as duas buscas híbridas de 35 ms em paralelo soma 215 ms em vez de 250 ms.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Raw user prompt', 'pt-br': 'Prompt bruto do usuário' }, detail: { en: 'pronouns or two-part question', 'pt-br': 'pronomes ou pergunta composta' }, pigment: 'muted' },
            { label: { en: 'Fast rewriter', 'pt-br': 'Reescritor rápido' }, detail: { en: '180 ms; standalone sub-queries', 'pt-br': '180 ms; subconsultas autocontidas' }, pigment: 'accent' },
            { label: { en: 'Parallel hybrid search', 'pt-br': 'Busca híbrida paralela' }, detail: { en: 'max(35, 35) = 35 ms (215 ms vs 250 ms serial)', 'pt-br': 'max(35, 35) = 35 ms (215 ms vs 250 ms em série)' }, pigment: 'accent' },
            { label: { en: 'RRF merge and rerank', 'pt-br': 'Fusão RRF e rerank' }, detail: { en: 'merges sub-query hits before generation', 'pt-br': 'funde resultados antes da geração' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'HyDE for vocabulary gaps', 'pt-br': 'HyDE para descompasso de vocabulário' },
        caption: {
          en: 'HyDE embeds a synthetic answer-like draft to match formal documentation, then discards the draft immediately; keep original-query BM25 active so private codes are never lost.',
          'pt-br': 'O HyDE gera o embedding de um rascunho sintético em formato de resposta para casar com a documentação formal e o descarta em seguida; mantenha BM25 na consulta original para não perder códigos privados.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Conceptual question', 'pt-br': 'Pergunta conceitual' }, detail: { en: 'interrogative phrasing', 'pt-br': 'forma interrogativa' }, pigment: 'muted' },
            { label: { en: 'Draft synthetic passage', 'pt-br': 'Rascunho sintético' }, detail: { en: 'declarative answer style', 'pt-br': 'prosa declarativa de resposta' }, pigment: 'caution' },
            { label: { en: 'Embed draft + search', 'pt-br': 'Embedding do rascunho + busca' }, detail: { en: 'paired with original BM25', 'pt-br': 'pareado com BM25 original' }, pigment: 'accent' },
            { label: { en: 'Discard draft; ground reply', 'pt-br': 'Descartar rascunho; embasar' }, detail: { en: 'real retrieved chunks only', 'pt-br': 'apenas trechos reais recuperados' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Corrective RAG (max 1 retry)', 'pt-br': 'Corrective RAG (máx. 1 repetição)' },
        caption: {
          en: 'When stage-1 relevance scores fall below the confidence threshold, Corrective RAG rejects the weak chunks and triggers at most one corrective rewrite or fallback search.',
          'pt-br': 'Quando a relevância do estágio 1 cai abaixo do limiar de confiança, o Corrective RAG descarta os trechos fracos e aciona no máximo uma reescrita corretiva ou busca reserva.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Stage-1 chunks', 'pt-br': 'Trechos do estágio 1' }, detail: { en: 'low relevance scores', 'pt-br': 'notas baixas de relevância' }, pigment: 'danger' },
            { label: { en: 'Reject weak set', 'pt-br': 'Descartar conjunto fraco' }, detail: { en: 'block noise before generation', 'pt-br': 'bloqueia ruído antes de gerar' }, pigment: 'danger' },
            { label: { en: 'One corrective retry', 'pt-br': 'Uma tentativa corretiva' }, detail: { en: 'rewrite, relax filter, or fallback', 'pt-br': 'reescreve, relaxa filtro ou muda fonte' }, pigment: 'caution' },
            { label: { en: 'Verified context or empty', 'pt-br': 'Contexto verificado ou vazio' }, detail: { en: 'capped to protect tail latency', 'pt-br': 'limitado para proteger a latência de cauda' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  '28-5-grounding-and-graphrag-flow': {
    lesson: '28.5-grounding-citations-abstention-and-graph-rag',
    title: {
      en: 'Abstention gates, citation audits, and GraphRAG synthesis',
      'pt-br': 'Portões de abstenção, auditoria de citações e síntese GraphRAG',
    },
    caption: {
      en: 'Production grounding checks evidence before and after generation, and switches from chunk lookup to offline community summaries only when queries span the entire corpus.',
      'pt-br': 'O embasamento em produção verifica evidências antes e depois da geração, e só troca a busca por trechos por resumos offline de comunidades quando a pergunta abrange o corpus inteiro.',
    },
    steps: [
      {
        label: { en: 'Two-gate abstention', 'pt-br': 'Abstenção em dois portões' },
        caption: {
          en: 'Gate 1 skips the generator when top reranker score falls below 0.35 — cutting the worked example’s error cost from 800 to 240 units (80% caught on 100 unanswerable queries plus 5 answerable false abstentions). Gate 2 adds a schema abstained: true check when a required detail is absent.',
          'pt-br': 'O Portão 1 pula o gerador quando a maior nota do reranker cai abaixo de 0,35 — reduzindo o custo de erro do exemplo de 800 para 240 unidades (80% barradas em 100 perguntas sem resposta mais 5 abstenções falsas em respondíveis). O Portão 2 adiciona abstained: true no esquema quando falta um detalhe exigido.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Reranked candidates', 'pt-br': 'Candidatos reordenados' }, detail: { en: 'top score checked first', 'pt-br': 'melhor nota checada primeiro' }, pigment: 'muted' },
            { label: { en: 'Gate 1: score < 0.35?', 'pt-br': 'Portão 1: nota < 0,35?' }, detail: { en: 'skips LLM; 800 → 240 units in example', 'pt-br': 'pula LLM; 800 → 240 unidades no exemplo' }, pigment: 'caution' },
            { label: { en: 'Gate 2: missing detail?', 'pt-br': 'Portão 2: falta detalhe?' }, detail: { en: 'model sets abstained: true', 'pt-br': 'modelo marca abstained: true' }, pigment: 'accent' },
            { label: { en: 'Calibrated abstention', 'pt-br': 'Abstenção calibrada' }, detail: { en: 'trades false abstentions for fewer hallucinations', 'pt-br': 'troca abstenções falsas por menos alucinações' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Two-layer citation audit', 'pt-br': 'Auditoria de citações em duas camadas' },
        caption: {
          en: 'Given prompt chunks {c1..c5}, deterministic code catches fabricated c7 in microseconds; a separate entailment check catches c2 citing hardware warranties for a software claim, leaving verified c1.',
          'pt-br': 'Com os trechos {c1..c5} no prompt, código determinístico barra o c7 inventado em microssegundos; uma checagem separada de implicação barra c2 (garantia de hardware em regra de software), aprovando c1.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Structured claims', 'pt-br': 'Afirmações estruturadas' }, detail: { en: 'cite c1, c7, and c2', 'pt-br': 'citam c1, c7 e c2' }, pigment: 'muted' },
            { label: { en: 'Layer 1: ID membership', 'pt-br': 'Camada 1: ID existe?' }, detail: { en: 'c7 rejected in microseconds', 'pt-br': 'c7 rejeitado em microssegundos' }, pigment: 'danger' },
            { label: { en: 'Layer 2: entailment check', 'pt-br': 'Camada 2: implicação' }, detail: { en: 'c2 rejected; wrong topic', 'pt-br': 'c2 rejeitado; tema trocado' }, pigment: 'caution' },
            { label: { en: 'Grounded claim ships', 'pt-br': 'Afirmação embasada segue' }, detail: { en: 'c1 passes syntax and support', 'pt-br': 'c1 passa em sintaxe e suporte' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'GraphRAG global synthesis', 'pt-br': 'Síntese global no GraphRAG' },
        caption: {
          en: 'Because top-8 chunks cover at most 0.4% of 2,000 incident reports, GraphRAG extracts entities upfront (3M input tokens) and runs map-reduce across precomputed community summaries at query time.',
          'pt-br': 'Como 8 trechos cobrem no máximo 0,4% de 2.000 relatórios, o GraphRAG extrai entidades antecipadamente (3 milhões de tokens) e executa map-reduce sobre resumos de comunidades na consulta.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Offline extraction', 'pt-br': 'Extração offline' }, detail: { en: '2,000 docs → 3M input tokens', 'pt-br': '2.000 docs → 3M tokens de entrada' }, pigment: 'caution' },
            { label: { en: 'Entity–relation graph', 'pt-br': 'Grafo de entidades' }, detail: { en: 'Leiden community clusters', 'pt-br': 'agrupamento de Leiden' }, pigment: 'accent' },
            { label: { en: 'Community summaries', 'pt-br': 'Resumos de comunidade' }, detail: { en: 'pre-generated per cluster', 'pt-br': 'pré-gerados por grupo' }, pigment: 'accent' },
            { label: { en: 'Query-time map-reduce', 'pt-br': 'Map-reduce na consulta' }, detail: { en: 'synthesizes all communities', 'pt-br': 'sintetiza todas as comunidades' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
