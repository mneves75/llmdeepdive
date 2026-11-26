/**
 * Figures for track 32 — LLMOps & Managed AI Platforms.
 */
import type { Figure } from './types'

const hostingAxesSmall = {
  xAxis: {
    label: { en: 'Monthly requests (millions)', 'pt-br': 'Requisições mensais (milhões)' },
    scale: 'linear',
    min: 0,
    max: 1.2,
  },
  yAxis: {
    label: { en: 'Monthly cost', 'pt-br': 'Custo mensal' },
    scale: 'linear',
    min: 0,
    max: 4500,
    unit: 'USD',
  },
} as const

const hostingAxesScale = {
  xAxis: {
    label: { en: 'Monthly requests (millions)', 'pt-br': 'Requisições mensais (milhões)' },
    scale: 'linear',
    min: 0,
    max: 3.5,
  },
  yAxis: {
    label: { en: 'Monthly cost', 'pt-br': 'Custo mensal' },
    scale: 'linear',
    min: 0,
    max: 11000,
    unit: 'USD',
  },
} as const

export const TRACK_32_FIGURES = {
  '32-1-coupled-release-flow': {
    lesson: '32.1-coupled-versioning-and-release-artifacts',
    title: {
      en: 'An AI release is a coupled bundle, never a prompt edit alone',
      'pt-br': 'Um release de IA é um pacote acoplado, nunca uma edição isolada de prompt',
    },
    caption: {
      en: 'Prompt template, JSON schema, model snapshot, embedding version and index revision interact tightly. Pinning them as one immutable release manifest makes shadow testing, canary traffic and instant rollbacks deterministic.',
      'pt-br': 'Template de prompt, JSON Schema, snapshot do modelo, versão do embedding e revisão do índice interagem entre si. Fixá-los em um manifesto imutável torna shadow, canary e rollback instantâneo determinísticos.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Immutable manifest', 'pt-br': 'Manifesto imutável' }, detail: { en: 'prompt + schema + model + index', 'pt-br': 'prompt + schema + modelo + índice' }, pigment: 'accent' },
        { label: { en: 'Offline eval CI gate', 'pt-br': 'Gate de avaliação offline em CI' }, detail: { en: 'block regressions before deploy', 'pt-br': 'bloqueia regressões antes do deploy' }, pigment: 'caution' },
        { label: { en: 'Shadow & 5% canary', 'pt-br': 'Shadow e canary de 5%' }, detail: { en: 'OTel traces + live score diff', 'pt-br': 'traces OTel + diff de qualidade ao vivo' }, pigment: 'accent' },
        { label: { en: '100% promote or instant rollback', 'pt-br': 'Promoção 100% ou rollback imediato' }, detail: { en: 'revert whole bundle atomically', 'pt-br': 'reverte o pacote inteiro de forma atômica' }, pigment: 'success' },
      ],
    },
  },

  /**
   * 32.2 walks a single 700 ms RAG request through its four child spans
   * (splitting the 600 ms model call into 220 ms TTFT and 380 ms decode), then
   * shows how little total latency moves when retrieval is cut in half.
   */
  '32-2-rag-span-breakdown': {
    lesson: '32.2-opentelemetry-genai-observability',
    title: {
      en: 'Where a 700 ms RAG request actually spends its time',
      'pt-br': 'Onde uma requisição RAG de 700 ms realmente gasta seu tempo',
    },
    caption: {
      en: 'Root span rag.request (release_id = rel-2026-11-20-a4f2) broken into sequential child spans. The 600 ms model call (220 ms to first token plus 380 ms decoding 240 output tokens) takes 85.7% of the turn.',
      'pt-br': 'Span raiz rag.request (release_id = rel-2026-11-20-a4f2) dividido em spans filhos sequenciais. A chamada de 600 ms ao modelo (220 ms até o primeiro token mais 380 ms decodificando 240 tokens de saída) consome 85,7% do turno.',
    },
    steps: [
      {
        label: { en: 'Baseline trace (700 ms)', 'pt-br': 'Trace original (700 ms)' },
        caption: {
          en: 'All four sequential legs add to 700 ms. Retrieval (45 ms), reranking (35 ms) and the input guardrail (20 ms) together account for only 100 ms (14.3%).',
          'pt-br': 'As quatro etapas sequenciais somam 700 ms. Recuperação (45 ms), reranking (35 ms) e guardrail de entrada (20 ms) respondem juntos por apenas 100 ms (14,3%).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'retrieval.search (embed + vector lookup)', 'pt-br': 'retrieval.search (embedding + busca vetorial)' },
              detail: { en: '45 ms · top_k = 20 · index kb-rev-42', 'pt-br': '45 ms · top_k = 20 · índice kb-rev-42' },
              pigment: 'accent',
              weight: 45,
            },
            {
              label: { en: 'retrieval.rerank (score and trim chunks)', 'pt-br': 'retrieval.rerank (reordenar e filtrar chunks)' },
              detail: { en: '35 ms · 20 candidates kept down to 5', 'pt-br': '35 ms · 20 candidatos reduzidos a 5' },
              pigment: 'accent',
              weight: 35,
            },
            {
              label: { en: 'guardrail.input (policy check)', 'pt-br': 'guardrail.input (checagem de política)' },
              detail: { en: '20 ms · verdict = allow', 'pt-br': '20 ms · veredito = allow' },
              pigment: 'muted',
              weight: 20,
            },
            {
              label: { en: 'LLM prefill — time to first token', 'pt-br': 'Prefill do LLM — tempo até o primeiro token' },
              detail: { en: '220 ms · 1,850 input tokens', 'pt-br': '220 ms · 1.850 tokens de entrada' },
              pigment: 'caution',
              weight: 220,
            },
            {
              label: { en: 'LLM decode tail — remaining output tokens', 'pt-br': 'Cauda de decodificação — demais tokens de saída' },
              detail: { en: '380 ms · remaining 239 of 240 output tokens · finish = stop', 'pt-br': '380 ms · 239 de 240 tokens restantes · finish = stop' },
              pigment: 'danger',
              weight: 380,
            },
          ],
        },
      },
      {
        label: { en: 'Retrieval halved (677.5 ms)', 'pt-br': 'Recuperação pela metade (677,5 ms)' },
        caption: {
          en: 'Cutting retrieval.search in half (45 ms → 22.5 ms) trims total latency by only 22.5 ms (3.2%). The 600 ms model call still dominates at 88.6% of the turn.',
          'pt-br': 'Cortar retrieval.search pela metade (45 ms → 22,5 ms) reduz a latência total em apenas 22,5 ms (3,2%). A chamada de 600 ms ao modelo segue dominando com 88,6% do turno.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'retrieval.search (halved)', 'pt-br': 'retrieval.search (pela metade)' },
              detail: { en: '22.5 ms · saves 22.5 ms (−3.2% total)', 'pt-br': '22,5 ms · economiza 22,5 ms (−3,2% do total)' },
              pigment: 'success',
              weight: 22.5,
            },
            {
              label: { en: 'retrieval.rerank (unchanged)', 'pt-br': 'retrieval.rerank (inalterado)' },
              detail: { en: '35 ms · 20 candidates kept down to 5', 'pt-br': '35 ms · 20 candidatos reduzidos a 5' },
              pigment: 'muted',
              weight: 35,
            },
            {
              label: { en: 'guardrail.input (unchanged)', 'pt-br': 'guardrail.input (inalterado)' },
              detail: { en: '20 ms · verdict = allow', 'pt-br': '20 ms · veredito = allow' },
              pigment: 'muted',
              weight: 20,
            },
            {
              label: { en: 'LLM prefill — time to first token', 'pt-br': 'Prefill do LLM — tempo até o primeiro token' },
              detail: { en: '220 ms · unchanged', 'pt-br': '220 ms · inalterado' },
              pigment: 'caution',
              weight: 220,
            },
            {
              label: { en: 'LLM decode tail — still the bottleneck', 'pt-br': 'Cauda de decodificação — segue como gargalo' },
              detail: { en: '380 ms · unchanged', 'pt-br': '380 ms · inalterado' },
              pigment: 'danger',
              weight: 380,
            },
          ],
        },
      },
    ],
  },

  /**
   * 32.3 teaches a three-stage progressive delivery ladder: read-only shadow
   * dark launch, sticky powered canary, and automated rollback on HTTP-200
   * silent regressions.
   */
  '32-3-progressive-rollout-ladder': {
    lesson: '32.3-shadow-canary-and-incident-rollbacks',
    title: {
      en: 'Progressive rollout ladder and silent-regression rollback',
      'pt-br': 'Escada de rollout progressivo e rollback de regressão silenciosa',
    },
    caption: {
      en: 'Each stage exposes the candidate manifest to real traffic under tighter safeguards before moving to 100%, with an automatic pointer flip back to the baseline if any silent-regression gate trips.',
      'pt-br': 'Cada etapa expõe o manifesto candidato ao tráfego real sob proteções crescentes antes de chegar a 100%, com reversão automática do ponteiro para o baseline se algum gate silencioso disparar.',
    },
    steps: [
      {
        label: { en: '1. Shadow (dark launch)', 'pt-br': '1. Shadow (lançamento escuro)' },
        caption: {
          en: 'The gateway copies 10% of live requests asynchronously to the candidate manifest. Users still receive baseline answers only, and every external write tool is stubbed so no duplicate side effect occurs.',
          'pt-br': 'O gateway duplica 10% das requisições reais em segundo plano para o manifesto candidato. Usuários recebem só o baseline, e toda ferramenta de escrita é simulada para evitar efeitos duplicados.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Live request', 'pt-br': 'Requisição real' }, detail: { en: '100% answered by baseline', 'pt-br': '100% respondida pelo baseline' }, pigment: 'muted' },
            { label: { en: 'Async 10% copy', 'pt-br': 'Cópia assíncrona de 10%' }, detail: { en: 'sent to candidate rel-043', 'pt-br': 'enviada ao candidato rel-043' }, pigment: 'accent' },
            { label: { en: 'Stubbed write tools', 'pt-br': 'Ferramentas de escrita simuladas' }, detail: { en: 'read-only; intended writes logged only', 'pt-br': 'somente leitura; escritas apenas registradas' }, pigment: 'caution' },
            { label: { en: 'Telemetry & graders', 'pt-br': 'Telemetria e avaliadores' }, detail: { en: 'checks schema, latency, cost and quality', 'pt-br': 'checa esquema, latência, custo e qualidade' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2. Sticky canary', 'pt-br': '2. Canary fixo por sessão' },
        caption: {
          en: 'A session or tenant hash pins whole conversations to either baseline (95%) or candidate (5%), avoiding mid-thread prompt mixing. Wait for the powered sample (~1,500 requests per arm for a 3-point shift) before promoting.',
          'pt-br': 'Um hash de sessão ou tenant fixa conversas inteiras no baseline (95%) ou no candidato (5%), evitando misturar prompts no meio do chat. Espere a amostra com poder estatístico (~1.500 requisições por braço para 3 pontos) antes de promover.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Sticky hash router', 'pt-br': 'Roteador por hash fixo' }, detail: { en: 'one manifest per conversation', 'pt-br': 'um manifesto por conversa' }, pigment: 'accent' },
            { label: { en: '95% baseline / 5% canary', 'pt-br': '95% no baseline / 5% no canary' }, detail: { en: 'real users see candidate replies', 'pt-br': 'usuários reais veem respostas do candidato' }, pigment: 'caution' },
            { label: { en: 'Powered sample window', 'pt-br': 'Janela com poder amostral' }, detail: { en: '~1,500 reqs/arm (~36 h at 20k/day)', 'pt-br': '~1.500 reqs/braço (~36 h a 20 mil/dia)' }, pigment: 'accent' },
            { label: { en: 'Step up to 100%', 'pt-br': 'Avanço até 100%' }, detail: { en: '5% → 25% → 50% → 100% if green', 'pt-br': '5% → 25% → 50% → 100% se verde' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '3. Automated rollback', 'pt-br': '3. Rollback automático' },
        caption: {
          en: 'When a silent regression trips a fast trigger (schema failures > 0.5%, p95 latency +30%) or a powered quality trigger (length truncations, cost spikes, or escalations), the controller flips the single release_id pointer back to the prior immutable bundle.',
          'pt-br': 'Quando uma regressão silenciosa dispara um gatilho rápido (falhas de esquema > 0,5%, latência p95 +30%) ou de qualidade (truncamentos length, alta de custo ou escaladas), o controlador reverte o ponteiro único de release_id para o pacote imutável anterior.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'HTTP 200 masks defect', 'pt-br': 'HTTP 200 esconde o defeito' }, detail: { en: 'bad JSON, truncations or cost spike', 'pt-br': 'JSON inválido, cortes ou alta de custo' }, pigment: 'danger' },
            { label: { en: 'OTel gate trips', 'pt-br': 'Gate OTel dispara' }, detail: { en: 'candidate breaches baseline threshold', 'pt-br': 'candidato rompe limiar contra baseline' }, pigment: 'danger' },
            { label: { en: 'Atomic pointer flip', 'pt-br': 'Troca atômica de ponteiro' }, detail: { en: 'release_id reverts rel-043 → rel-042', 'pt-br': 'release_id volta de rel-043 → rel-042' }, pigment: 'caution' },
            { label: { en: 'Clean baseline restored', 'pt-br': 'Baseline limpo restaurado' }, detail: { en: 'prompt, schema, model and index in sync', 'pt-br': 'prompt, esquema, modelo e índice em sincronia' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 32.4 compares monthly bills across cached PAYG (USD 2,925 per 1M reqs),
   * managed provisioned capacity (USD 2,600 up to 1M, then PAYG overflow),
   * and a two-GPU self-hosted cluster both before ops (USD 3,650) and all-in
   * (USD 7,650, breaking even at ~2.615M reqs/month).
   */
  '32-4-hosting-break-even': {
    lesson: '32.4-api-managed-cloud-and-self-hosted-economics',
    title: {
      en: 'Monthly bill by request volume: PAYG, provisioned, and self-hosted',
      'pt-br': 'Fatura mensal por volume de requisições: PAYG, provisionado e self-hosted',
    },
    caption: {
      en: 'Cached pay-as-you-go (USD 2,925 per million requests) starts at zero and rises linearly. Fixed reservations and rented GPUs charge a flat monthly floor whether traffic arrives or not.',
      'pt-br': 'O pay-as-you-go com cache (USD 2.925 por milhão de requisições) começa em zero e sobe linearmente. Reservas fixas e GPUs alugadas cobram um piso mensal fixo havendo tráfego ou não.',
    },
    steps: [
      {
        label: { en: 'Up to 1.2M reqs/month', 'pt-br': 'Até 1,2M reqs/mês' },
        caption: {
          en: 'Managed provisioned capacity (USD 2,600/month up to 1M, spilling overflow onto PAYG) beats cached PAYG above ~889k requests, but loses in quiet months (at 700k, PAYG drops to USD 2,047.50). Two redundant 80 GB GPUs already cost USD 3,650/month before ops.',
          'pt-br': 'A capacidade provisionada gerenciada (USD 2.600/mês até 1M, com excedente em PAYG) vence o PAYG com cache acima de ~889 mil requisições, mas perde em meses fracos (em 700 mil, PAYG cai para USD 2.047,50). Duas GPUs redundantes de 80 GB já custam USD 3.650/mês antes da operação.',
        },
        body: {
          kind: 'plot',
          ...hostingAxesSmall,
          series: [
            {
              label: { en: 'Cached PAYG API', 'pt-br': 'API PAYG com cache' },
              pigment: 'accent',
              points: [[0, 0], [0.7, 2047.5], [1.0, 2925], [1.2, 3510]],
            },
            {
              label: { en: 'Managed provisioned + overflow', 'pt-br': 'Provisionado gerenciado + transbordo' },
              pigment: 'success',
              points: [[0, 2600], [1.0, 2600], [1.2, 3185]],
              marks: [{ at: [0.889, 2600], label: { en: 'Break-even: 889k', 'pt-br': 'Equilíbrio: 889 mil' } }],
            },
            {
              label: { en: '2 GPUs (hardware only)', 'pt-br': '2 GPUs (só hardware)' },
              pigment: 'danger',
              points: [[0, 3650], [1.2, 3650]],
              marks: [{ at: [0.35, 3650], label: { en: 'USD 3,650 before ops', 'pt-br': 'USD 3.650 sem operação' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Adding ops up to 3.5M reqs/month', 'pt-br': 'Somando operação até 3,5M reqs/mês' },
        caption: {
          en: 'Adding USD 4,000/month of platform engineering time lifts the fixed self-hosted floor from USD 3,650 to USD 7,650/month, pushing break-even against cached PAYG from 1.25M to 2.615M requests/month (assuming flat traffic fits two GPUs).',
          'pt-br': 'Somar USD 4.000/mês de engenharia de plataforma eleva o piso fixo do self-hosting de USD 3.650 para USD 7.650/mês, empurrando o equilíbrio frente ao PAYG de 1,25M para 2,615M requisições/mês (supondo tráfego uniforme cabendo em duas GPUs).',
        },
        body: {
          kind: 'plot',
          ...hostingAxesScale,
          series: [
            {
              label: { en: 'Cached PAYG API', 'pt-br': 'API PAYG com cache' },
              pigment: 'accent',
              points: [[0, 0], [1.0, 2925], [2.0, 5850], [3.5, 10237.5]],
            },
            {
              label: { en: '2 GPUs (hardware only)', 'pt-br': '2 GPUs (só hardware)' },
              pigment: 'muted',
              points: [[0, 3650], [3.5, 3650]],
              marks: [{ at: [1.248, 3650], label: { en: 'Hardware only: 1.25M', 'pt-br': 'Só hardware: 1,25M' } }],
            },
            {
              label: { en: 'Self-hosted all-in (GPUs + ops)', 'pt-br': 'Self-hosted completo (GPUs + operação)' },
              pigment: 'danger',
              points: [[0, 7650], [3.5, 7650]],
              marks: [{ at: [2.615, 7650], label: { en: 'All-in: 2.62M', 'pt-br': 'Completo: 2,62M' } }],
            },
          ],
        },
      },
    ],
  },

  /**
   * 32.5 contrasts default SaaS shortcuts (shared semantic cache, public
   * internet egress, global cross-region routing, vendor stateful threads)
   * against the hardened enterprise boundary path.
   */
  '32-5-enterprise-boundary-path': {
    lesson: '32.5-enterprise-tenancy-residency-and-portability',
    title: {
      en: 'Enterprise AI request path: default leaks versus hardened boundaries',
      'pt-br': 'Caminho da requisição corporativa: vazamentos padrão versus fronteiras rígidas',
    },
    caption: {
      en: 'An enterprise deployment enforces tenant isolation, private network transit, regional residency and portable state at four separate layers—missing any one creates a silent leak or vendor lock-in.',
      'pt-br': 'Uma implantação corporativa impõe isolamento de tenants, tráfego privado, residência regional e estado portável em quatro camadas distintas—falhar em qualquer uma cria vazamento silencioso ou aprisionamento.',
    },
    steps: [
      {
        label: { en: 'Default shortcuts (4 risks)', 'pt-br': 'Atalhos padrão (4 riscos)' },
        caption: {
          en: 'Convenience defaults break enterprise guarantees: a shared semantic cache leaks answers across customers, public endpoints leave the cloud network, global routing spills EU data abroad, and vendor-hosted threads trap your history.',
          'pt-br': 'Padrões de conveniência rompem garantias corporativas: um cache semântico compartilhado vaza respostas entre clientes, endpoints públicos saem da rede da nuvem, roteamento global envia dados europeus para fora e threads do fornecedor prendem seu histórico.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Shared semantic cache', 'pt-br': 'Cache semântico compartilhado' }, detail: { en: 'no tenant_id or ACL → cross-tenant leak', 'pt-br': 'sem tenant_id ou ACL → vazamento entre clientes' }, pigment: 'danger' },
            { label: { en: 'Public internet API', 'pt-br': 'API na internet pública' }, detail: { en: 'prompts leave cloud backbone with static keys', 'pt-br': 'prompts saem do backbone com chaves estáticas' }, pigment: 'caution' },
            { label: { en: 'Global cross-region routing', 'pt-br': 'Roteamento global multirregional' }, detail: { en: 'spikes spill EU/BR prompts across borders', 'pt-br': 'picos desviam prompts da UE/BR para outro país' }, pigment: 'danger' },
            { label: { en: 'Vendor stateful threads', 'pt-br': 'Threads com estado no fornecedor' }, detail: { en: 'history & chunks trapped inside one provider', 'pt-br': 'histórico e chunks presos em um só provedor' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Hardened enterprise path', 'pt-br': 'Caminho corporativo protegido' },
        caption: {
          en: 'Every retrieval filter and cache key carries tenant_id + ACL (paired with a dedicated silo when required), a thin internal gateway routes over private VPC links to a region-pinned ZDR endpoint with CMEK, and conversation state stays in your own database.',
          'pt-br': 'Todo filtro de busca e chave de cache carrega tenant_id + ACL (somado a silo dedicado quando exigido), um gateway interno fino roteia por enlace VPC privado até um endpoint regional com ZDR e CMEK, e o histórico permanece no seu próprio banco.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Tenant-scoped retrieval & cache', 'pt-br': 'Busca e cache por tenant' }, detail: { en: 'tenant_id + ACL pre-filter (+ silo if needed)', 'pt-br': 'pré-filtro tenant_id + ACL (+ silo se exigido)' }, pigment: 'success' },
            { label: { en: 'Thin internal gateway', 'pt-br': 'Gateway interno fino' }, detail: { en: 'unifies IAM, retries & OTel gen_ai.* spans', 'pt-br': 'unifica IAM, retries e spans OTel gen_ai.*' }, pigment: 'accent' },
            { label: { en: 'Private VPC endpoint', 'pt-br': 'Endpoint privado de VPC' }, detail: { en: 'PrivateLink / PSC; zero public egress', 'pt-br': 'PrivateLink / PSC; zero saída pública' }, pigment: 'accent' },
            { label: { en: 'Region-pinned ZDR + CMEK', 'pt-br': 'Região fixa com ZDR + CMEK' }, detail: { en: 'locked geography; root keys in own KMS', 'pt-br': 'geografia travada; chaves raiz no seu KMS' }, pigment: 'success' },
            { label: { en: 'App-owned state & evals', 'pt-br': 'Estado e evals próprios' }, detail: { en: 'history, chunks & suite ready to swap models', 'pt-br': 'histórico, chunks e suíte prontos para migrar' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
