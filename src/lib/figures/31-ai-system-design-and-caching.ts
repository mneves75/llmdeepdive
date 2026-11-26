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

/** 31.4: cumulative input tokens (in thousands) across 20 turns at 1,000 tokens/turn. */
const chatTokenAxes = {
  xAxis: {
    label: { en: 'Conversation turn', 'pt-br': 'Turno da conversa' },
    scale: 'linear',
    min: 0,
    max: 20,
  },
  yAxis: {
    label: { en: 'Cumulative input tokens', 'pt-br': 'Tokens de entrada acumulados' },
    scale: 'linear',
    min: 0,
    max: 250,
    unit: 'k',
  },
} as const

const independentTurnsSeries = {
  label: { en: 'Independent single-turn queries (1k/turn)', 'pt-br': 'Consultas independentes de um turno (1k/turno)' },
  points: [[1, 1], [5, 5], [10, 10], [15, 15], [20, 20]],
  marks: [{ at: [20, 20] as const, label: { en: '20k tokens', 'pt-br': '20 mil tokens' } }],
} as const

export const TRACK_31_FIGURES = {
  '31-1-latency-budget-stack': {
    lesson: '31.1-end-to-end-latency-budgets',
    title: {
      en: 'Where 4,520 ms goes on a single uncached RAG turn',
      'pt-br': 'Para onde vão 4.520 ms em um turno RAG sem cache',
    },
    caption: {
      en: `Retrieval (85 ms), guardrails (45 ms) and TTFT (240 ms) emit token 1 at 370 ms, while decoding the remaining 249 output tokens at 60 tok/s (${Math.round(worked.decodeMs)} ms) dominates total turn duration (${Math.round(worked.uncachedLatencyMs)} ms).`,
      'pt-br': `Recuperação (85 ms), guardrails (45 ms) e TTFT (240 ms) emitem o 1º token em 370 ms, enquanto decodificar os 249 tokens restantes a 60 tok/s (${Math.round(worked.decodeMs)} ms) domina a duração total do turno (${Math.round(worked.uncachedLatencyMs)} ms).`,
    },
    body: {
      kind: 'stack',
      direction: 'down',
      steps: [
        { label: { en: 'Hybrid retrieval + rerank', 'pt-br': 'Busca híbrida + rerank' }, detail: { en: '85 ms', 'pt-br': '85 ms' }, pigment: 'accent', weight: 85 },
        { label: { en: 'Input/output guardrails', 'pt-br': 'Guardrails entrada/saída' }, detail: { en: '45 ms', 'pt-br': '45 ms' }, pigment: 'caution', weight: 45 },
        { label: { en: 'Model prefill (TTFT, emits token 1)', 'pt-br': 'Prefill do modelo (TTFT, emite 1º token)' }, detail: { en: '240 ms', 'pt-br': '240 ms' }, pigment: 'accent', weight: 240 },
        { label: { en: 'Autoregressive decode (249 remaining tok @ 60 tok/s)', 'pt-br': 'Decode autorregressivo (249 tok restantes a 60 tok/s)' }, detail: { en: `${Math.round(worked.decodeMs)} ms`, 'pt-br': `${Math.round(worked.decodeMs)} ms` }, pigment: 'danger', weight: Math.round(worked.decodeMs) },
      ],
    },
  },

  /**
   * 31.2 contrasts exact, KV-prefix, and semantic caching across the same four
   * pipeline stages so the reader sees which layers skip model execution and
   * which carry semantic false-hit risk.
   */
  '31-2-three-cache-layers': {
    lesson: '31.2-multi-layer-caching-and-semantic-risk',
    title: {
      en: 'One request pipeline, three caching layers',
      'pt-br': 'Um mesmo pipeline de requisição, três camadas de cache',
    },
    caption: {
      en: 'Each layer intercepts a request at a different stage. Exact and semantic caches return before the LLM runs; prefix caching sits inside the inference server and skips re-reading the static prompt.',
      'pt-br': 'Cada camada intercepta a requisição em uma etapa diferente. Caches exatos e semânticos respondem antes de o LLM rodar; o cache de prefixo fica dentro do servidor de inferência e evita reler o prompt estático.',
    },
    steps: [
      {
        label: { en: 'Exact cache', 'pt-br': 'Cache exato' },
        caption: {
          en: 'Matches normalized identical inputs at the application edge in 5–20 ms. Zero model cost and zero false hits when the key scopes tenant, ACL, model version, and corpus epoch.',
          'pt-br': 'Casa entradas normalizadas idênticas na borda da aplicação em 5–20 ms. Custo zero de modelo e zero falsos acertos quando a chave delimita tenant, ACL, versão do modelo e época do corpus.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Incoming request', 'pt-br': 'Requisição recebida' }, detail: { en: 'normalized + scoped hash key', 'pt-br': 'texto normalizado + hash de escopo' }, pigment: 'accent' },
            { label: { en: 'Exact cache hit', 'pt-br': 'Acerto no cache exato' }, detail: { en: '5–20 ms; 0% false-hit risk', 'pt-br': '5–20 ms; risco de falso acerto 0%' }, pigment: 'success' },
            { label: { en: 'Model prefill', 'pt-br': 'Prefill do modelo' }, detail: { en: 'skipped', 'pt-br': 'pulado' }, pigment: 'muted' },
            { label: { en: 'Model decode', 'pt-br': 'Decode do modelo' }, detail: { en: 'skipped', 'pt-br': 'pulado' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Prefix (KV) cache', 'pt-br': 'Cache de prefixo (KV)' },
        caption: {
          en: 'Works even when every user question is unique. Reuses prefilled attention key–value blocks for the static leading prompt, cutting TTFT and input token spend by 50–90% with zero correctness risk.',
          'pt-br': 'Funciona mesmo quando toda pergunta do usuário é inédita. Reutiliza blocos key–value pré-processados do prefixo estático, cortando TTFT e gasto de entrada em 50–90% com risco zero de correção.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Incoming request', 'pt-br': 'Requisição recebida' }, detail: { en: 'stable prefix + unique query', 'pt-br': 'prefixo estável + pergunta inédita' }, pigment: 'accent' },
            { label: { en: 'Edge response cache', 'pt-br': 'Cache de resposta na borda' }, detail: { en: 'miss (new question)', 'pt-br': 'erro (pergunta nova)' }, pigment: 'muted' },
            { label: { en: 'KV prefix reuse', 'pt-br': 'Reuso de prefixo KV' }, detail: { en: 'static tokens reused; only tail prefilled', 'pt-br': 'tokens estáticos reusados; só o final faz prefill' }, pigment: 'success' },
            { label: { en: 'Model decode', 'pt-br': 'Decode do modelo' }, detail: { en: 'runs freshly for this query', 'pt-br': 'gera resposta nova para esta consulta' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Semantic cache', 'pt-br': 'Cache semântico' },
        caption: {
          en: 'Embeds the query and searches cached vectors in 15–35 ms, catching paraphrases that miss an exact cache. Needs intent, entity, negation, and paraphrase checks to contain false hits.',
          'pt-br': 'Gera o embedding da pergunta e busca vetores em cache em 15–35 ms, capturando paráfrases que escapam ao cache exato. Exige travas de intenção, entidades, negação e paráfrase para conter falsos acertos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Incoming request', 'pt-br': 'Requisição recebida' }, detail: { en: 'paraphrased FAQ query', 'pt-br': 'FAQ parafraseada' }, pigment: 'accent' },
            { label: { en: 'Vector lookup + gates', 'pt-br': 'Busca vetorial + travas' }, detail: { en: '15–35 ms; cosine >= τ + checks', 'pt-br': '15–35 ms; cosseno >= τ + checagens' }, pigment: 'caution' },
            { label: { en: 'Model prefill', 'pt-br': 'Prefill do modelo' }, detail: { en: 'skipped on verified hit', 'pt-br': 'pulado em acerto verificado' }, pigment: 'muted' },
            { label: { en: 'Model decode', 'pt-br': 'Decode do modelo' }, detail: { en: 'skipped on verified hit', 'pt-br': 'pulado em acerto verificado' }, pigment: 'muted' },
          ],
        },
      },
    ],
  },

  /**
   * 31.3 compares frontier-only, upfront routing (RouteLLM), and sequential
   * cascades (FrugalGPT) on the same worked numbers: small = USD 0.60/1k (900 ms),
   * frontier = USD 9.00/1k (4,500 ms), router = 20 ms, p = 0.75.
   */
  '31-3-routing-vs-cascade': {
    lesson: '31.3-model-routing-cascades-and-gateways',
    title: {
      en: 'How a hard query travels under three dispatch patterns',
      'pt-br': 'Como uma pergunta difícil percorre três padrões de despacho',
    },
    caption: {
      en: 'Worked prices: small model USD 0.60/1k (900 ms), frontier model USD 9.00/1k (4,500 ms), router 20 ms, and 75% of queries solvable by the small model.',
      'pt-br': 'Preços trabalhados: modelo pequeno USD 0,60/1k (900 ms), modelo de fronteira USD 9,00/1k (4.500 ms), roteador 20 ms e 75% das perguntas resolvidas pelo modelo pequeno.',
    },
    steps: [
      {
        label: { en: 'Frontier only', 'pt-br': 'Só fronteira' },
        caption: {
          en: 'Every query goes to the frontier model: 4,500 ms on hard queries, but USD 9.00 per 1,000 requests because easy queries pay frontier prices too.',
          'pt-br': 'Toda consulta vai para o modelo de fronteira: 4.500 ms nas perguntas difíceis, mas USD 9,00 por 1.000 requisições porque perguntas simples também pagam preço de fronteira.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'User prompt', 'pt-br': 'Prompt do usuário' }, detail: { en: '100% of traffic', 'pt-br': '100% do tráfego' }, pigment: 'muted' },
            { label: { en: 'Frontier model', 'pt-br': 'Modelo de fronteira' }, detail: { en: '4,500 ms; USD 9.00/1k', 'pt-br': '4.500 ms; USD 9,00/1k' }, pigment: 'danger' },
            { label: { en: 'Final answer', 'pt-br': 'Resposta final' }, detail: { en: 'highest accuracy, highest spend', 'pt-br': 'maior acurácia, maior gasto' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Upfront router', 'pt-br': 'Roteador antecipado' },
        caption: {
          en: 'Inspects the prompt before calling any LLM (20 ms). Blended spend drops 70% to USD 2.70/1k and hard queries take 4,520 ms, but misrouted hard queries are not checked after the small model replies.',
          'pt-br': 'Inspeciona o prompt antes de chamar qualquer LLM (20 ms). O gasto combinado cai 70% para USD 2,70/1k e perguntas difíceis levam 4.520 ms, mas erros do roteador não são verificados após a saída pequena.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'User prompt', 'pt-br': 'Prompt do usuário' }, detail: { en: 'difficulty scored upfront', 'pt-br': 'dificuldade estimada antes' }, pigment: 'muted' },
            { label: { en: 'Fast router', 'pt-br': 'Roteador rápido' }, detail: { en: '20 ms; compares s(x) vs θ', 'pt-br': '20 ms; compara s(x) com θ' }, pigment: 'accent' },
            { label: { en: 'Direct dispatch', 'pt-br': 'Despacho direto' }, detail: { en: '75% small, 25% frontier', 'pt-br': '75% pequeno, 25% fronteira' }, pigment: 'success' },
            { label: { en: 'Hard-query result', 'pt-br': 'Resultado difícil' }, detail: { en: '4,520 ms; USD 2.70/1k blended', 'pt-br': '4.520 ms; USD 2,70/1k combinado' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Sequential cascade', 'pt-br': 'Cascata sequencial' },
        caption: {
          en: 'Always tries the small model first and checks the output. Blended spend is USD 2.85/1k while catching small-model failures, but escalated hard queries stack both models to 5,400 ms.',
          'pt-br': 'Tenta sempre o modelo pequeno primeiro e verifica a saída. O gasto combinado fica em USD 2,85/1k capturando falhas do pequeno, mas perguntas escaladas somam ambos os modelos chegando a 5.400 ms.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'User prompt', 'pt-br': 'Prompt do usuário' }, detail: { en: '100% start small', 'pt-br': '100% começam no pequeno' }, pigment: 'muted' },
            { label: { en: 'Small model', 'pt-br': 'Modelo pequeno' }, detail: { en: '900 ms; USD 0.60/1k on all', 'pt-br': '900 ms; USD 0,60/1k em todas' }, pigment: 'accent' },
            { label: { en: 'Output verifier', 'pt-br': 'Verificador de saída' }, detail: { en: 'schema, tests, or grounding', 'pt-br': 'esquema, testes ou embasamento' }, pigment: 'success' },
            { label: { en: '25% escalate', 'pt-br': '25% escalam' }, detail: { en: '5,400 ms total; USD 2.85/1k', 'pt-br': '5.400 ms total; USD 2,85/1k' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 31.4 derives quadratic multi-turn input token growth: 1,000 tokens added
   * per turn across 20 turns sums to 210,000 tokens versus 20,000 for 20
   * independent single-turn queries (10.5x).
   */
  '31-4-quadratic-chat-tokens': {
    lesson: '31.4-unit-economics-at-scale',
    title: {
      en: 'Why uncompacted chat grows 10.5× faster than independent queries',
      'pt-br': 'Por que um chat sem compactação cresce 10,5× mais que consultas isoladas',
    },
    caption: {
      en: 'Cumulative input tokens over 20 turns when each turn adds 1,000 tokens. Re-sending the full transcript turns linear usage into quadratic spend.',
      'pt-br': 'Tokens de entrada acumulados em 20 turnos quando cada turno adiciona 1.000 tokens. Reenviar toda a transcrição transforma uso linear em gasto quadrático.',
    },
    steps: [
      {
        label: { en: 'Independent turns', 'pt-br': 'Turnos independentes' },
        caption: {
          en: 'Twenty separate one-turn queries send 1,000 input tokens each, totaling 20,000 input tokens.',
          'pt-br': 'Vinte consultas separadas de um turno enviam 1.000 tokens de entrada cada, somando 20.000 tokens de entrada.',
        },
        body: {
          kind: 'plot',
          ...chatTokenAxes,
          series: [{ ...independentTurnsSeries, pigment: 'accent' }],
        },
      },
      {
        label: { en: 'Uncompacted chat', 'pt-br': 'Chat sem compactação' },
        caption: {
          en: 'Appending every prior message and retrieved chunk re-sends earlier turns repeatedly: 1k + 2k + … + 20k = 210,000 input tokens — 10.5× more than 20 independent queries.',
          'pt-br': 'Anexar toda mensagem anterior e trecho recuperado reenvia turnos antigos repetidamente: 1k + 2k + … + 20k = 210.000 tokens de entrada — 10,5× mais que 20 consultas independentes.',
        },
        body: {
          kind: 'plot',
          ...chatTokenAxes,
          series: [
            { ...independentTurnsSeries, pigment: 'muted' },
            {
              label: { en: 'Uncompacted multi-turn chat (d·T(T+1)/2)', 'pt-br': 'Chat sem compactação (d·T(T+1)/2)' },
              pigment: 'danger',
              points: [[1, 1], [5, 15], [10, 55], [15, 120], [20, 210]],
              marks: [{ at: [20, 210], label: { en: '210k tokens (10.5×)', 'pt-br': '210 mil tokens (10,5×)' } }],
            },
          ],
        },
      },
    ],
  },

  /**
   * 31.5 shows how the same four workload constraints produce three completely
   * different production topologies across the same four architectural slots.
   */
  '31-5-three-production-blueprints': {
    lesson: '31.5-production-system-design-case-studies',
    title: {
      en: 'Same four architecture slots, three different workloads',
      'pt-br': 'Os mesmos quatro blocos arquiteturais, três cargas distintas',
    },
    caption: {
      en: 'Step through the three case studies to see how latency deadlines, privacy rules, and cost ceilings flip which caches, routers, and serving modes stay on or turn off.',
      'pt-br': 'Avance pelos três estudos de caso para ver como prazos de latência, regras de privacidade e tetos de custo ligam ou desligam caches, roteadores e modos de serving.',
    },
    steps: [
      {
        label: { en: 'Enterprise RAG', 'pt-br': 'RAG corporativo' },
        caption: {
          en: 'Zero-leak tenant isolation rules out cross-user semantic caching; live permission checks and upfront routing keep cost at USD 0.0058/query under a USD 0.015 budget.',
          'pt-br': 'Isolamento sem vazamento entre tenants descarta cache semântico entre usuários; checagem de permissões em tempo real e roteamento mantêm o custo em USD 0,0058/consulta sob teto de USD 0,015.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Security & retrieval', 'pt-br': 'Segurança e busca' }, detail: { en: 'tenant partitions + ACL pre-filter + live check', 'pt-br': 'partições por tenant + pré-filtro ACL + checagem ao vivo' }, pigment: 'accent' },
            { label: { en: 'Cache policy', 'pt-br': 'Política de cache' }, detail: { en: 'KV prefix + scoped exact; no semantic cache', 'pt-br': 'prefixo KV + exato escopado; sem semântico' }, pigment: 'success' },
            { label: { en: 'Model dispatch', 'pt-br': 'Despacho de modelos' }, detail: { en: '70% mid-tier / 30% frontier router', 'pt-br': 'roteador 70% intermediário / 30% fronteira' }, pigment: 'accent' },
            { label: { en: 'Target & result', 'pt-br': 'Meta e resultado' }, detail: { en: 'p95 TTFT ≤ 600 ms; USD 0.0058/query', 'pt-br': 'TTFT p95 ≤ 600 ms; USD 0,0058/consulta' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'B2C support', 'pt-br': 'Suporte B2C' },
        caption: {
          en: 'High FAQ repetition makes an intent-gated semantic cache pay off (40% hit rate), while in-VPC PII redaction and provisioned baseline + PAYG burst hit USD 10,100/month under a USD 12,000 cap.',
          'pt-br': 'Alta repetição de FAQs faz o cache semântico filtrado valer a pena (40% de acerto), enquanto redação de PII na VPC e base reservada + transbordo PAYG ficam em USD 10.100/mês sob teto de USD 12.000.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Privacy & guardrails', 'pt-br': 'Privacidade e guardrails' }, detail: { en: '<2 ms regex/Luhn + 15 ms NER vault in VPC', 'pt-br': 'regex/Luhn <2 ms + cofre NER 15 ms na VPC' }, pigment: 'caution' },
            { label: { en: 'Cache policy', 'pt-br': 'Política de cache' }, detail: { en: 'exact + gated semantic: 40% hits in ~20 ms', 'pt-br': 'exato + semântico filtrado: 40% em ~20 ms' }, pigment: 'success' },
            { label: { en: 'Model dispatch', 'pt-br': 'Despacho de modelos' }, detail: { en: '80% small / 20% frontier RouteLLM router', 'pt-br': 'roteador RouteLLM 80% pequeno / 20% fronteira' }, pigment: 'accent' },
            { label: { en: 'Target & result', 'pt-br': 'Meta e resultado' }, detail: { en: 'p95 TTFT ≤ 450 ms; USD 10,100/month', 'pt-br': 'TTFT p95 ≤ 450 ms; USD 10.100/mês' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Overnight batch', 'pt-br': 'Lote noturno' },
        caption: {
          en: 'With no human waiting on screen, real-time serving and semantic caching turn off completely; asynchronous Batch APIs (~50% cheaper) and deterministic cascade checks protect ≥99% recall.',
          'pt-br': 'Sem humano esperando na tela, serving em tempo real e cache semântico desligam por completo; Batch APIs assíncronas (~50% menores) e verificadores determinísticos protegem recall ≥99%.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Input & deadline', 'pt-br': 'Entrada e prazo' }, detail: { en: '50,000 unique PDFs in 6 h; no live TTFT', 'pt-br': '50.000 PDFs únicos em 6 h; sem TTFT ao vivo' }, pigment: 'muted' },
            { label: { en: 'Cache policy', 'pt-br': 'Política de cache' }, detail: { en: 'KV prefix on 3,500-tok rubric; semantic OFF', 'pt-br': 'prefixo KV na rubrica de 3.500 tok; semântico OFF' }, pigment: 'caution' },
            { label: { en: 'Model dispatch', 'pt-br': 'Despacho de modelos' }, detail: { en: 'mid-tier JSON + checks; ~15% escalate', 'pt-br': 'JSON intermediário + checagens; ~15% escalam' }, pigment: 'accent' },
            { label: { en: 'Serving & recall', 'pt-br': 'Serving e recall' }, detail: { en: 'async Batch API (~50% off); ≥99% recall', 'pt-br': 'Batch API assíncrona (~50% menos); recall ≥99%' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
