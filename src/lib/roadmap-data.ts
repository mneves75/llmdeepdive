import type { Tier } from '~/lib/content'
import type { Locale } from '~/lib/i18n'

export type Localised = Readonly<Record<Locale, string>>

export interface RoadmapLevel {
  readonly code: string
  readonly tier: Tier
  readonly phase: Localised
  readonly title: Localised
  readonly goal: Localised
  readonly deliverables: Readonly<Record<Locale, readonly string[]>>
  readonly capstone: Localised
  readonly lessonIds: readonly string[]
}

export interface HundredDayStage {
  readonly index: number
  readonly days: Localised
  readonly tier: Tier
  readonly title: Localised
  readonly focus: Localised
  readonly milestone: Localised
  readonly lessonIds: readonly string[]
}

export interface PortfolioBlueprint {
  readonly id: string
  readonly tier: Tier
  readonly title: Localised
  readonly problem: Localised
  readonly proof: Localised
  readonly lessonIds: readonly string[]
}

export interface DefenseDrill {
  readonly id: string
  readonly scenario: Localised
  readonly firstCheck: Localised
  readonly lessonIds: readonly string[]
}

/**
 * The complete 16-level AI Engineering progression mapped directly onto the
 * real bilingual lesson corpus across all three course parts.
 *
 * Every lessonId here is resolved against Astro's `lessons` collection at build
 * time by `RoadmapPage.astro`: a typo or deleted lesson fails the build.
 */
export const ROADMAP_LEVELS: readonly RoadmapLevel[] = [
  {
    code: 'L0',
    tier: 'foundations',
    phase: { en: 'Phase 1 · Foundations', 'pt-br': 'Fase 1 · Fundamentos' },
    title: { en: 'Software & Python Substrate for AI Services', 'pt-br': 'Base de Software e Python para Serviços de IA' },
    goal: {
      en: 'Type-safe Python, NumPy/PyTorch tensors, HTTP/REST boundaries, async I/O, and reproducible persistence before adding a model.',
      'pt-br': 'Python tipado, tensores em NumPy/PyTorch, fronteiras HTTP/REST, I/O assíncrono e persistência reproduzível antes de adicionar um modelo.',
    },
    deliverables: {
      en: ['Typed multi-file Python service with automated tests', 'Async HTTP client handling timeouts and status codes', 'Persistent relational storage surviving restarts'],
      'pt-br': ['Serviço Python tipado com testes automatizados', 'Cliente HTTP assíncrono tratando timeouts e códigos de status', 'Persistência relacional que sobrevive a reinícios'],
    },
    capstone: { en: 'Ship a typed, tested, containerized REST service with zero AI calls first.', 'pt-br': 'Entregar um serviço REST tipado, testado e conteinerizado antes de chamar qualquer LLM.' },
    lessonIds: ['0.7-python-numpy-pytorch', '26.1-stateless-apis-and-conversation-state', '26.4-async-concurrency-rate-limits-and-batching'],
  },
  {
    code: 'L1',
    tier: 'foundations',
    phase: { en: 'Phase 1 · Foundations', 'pt-br': 'Fase 1 · Fundamentos' },
    title: { en: 'LLM Fundamentals, Inference & Model Selection', 'pt-br': 'Fundamentos de LLMs, Inferência e Escolha de Modelo' },
    goal: {
      en: 'Build an exact mental model of tokenization, attention, prefill vs decode, sampling parameters, reasoning compute, and benchmark limits.',
      'pt-br': 'Construir um modelo mental exato de tokenização, atenção, prefill vs decode, amostragem, computação de raciocínio e limites de benchmarks.',
    },
    deliverables: {
      en: ['Predict token-count cost spikes across languages and code', 'Explain why prefill is compute-bound and decode is memory-bandwidth-bound', 'Shortlist models using private evals instead of leaderboard rank alone'],
      'pt-br': ['Prever saltos de custo de tokens entre idiomas e código', 'Explicar por que prefill é limitado por cálculo e decode por largura de banda', 'Selecionar modelos por avaliações privadas em vez de ranking público'],
    },
    capstone: { en: 'Benchmark three candidate models on 20 domain prompts with latency and cost tables.', 'pt-br': 'Comparar três modelos candidatos em 20 prompts reais com tabela de latência e custo.' },
    lessonIds: ['0.1-what-is-a-language-model', '1.2-tokenization-i', '4.2-self-attention', '7.1-what-actually-happens-when-you-hit-send', '7.3-prefill-vs-decode-two-different-machines', '7.4-sampling', '6.9-reasoning-models-test-time-compute-and-long-cot', '29.4-benchmarks-leaderboards-and-contamination'],
  },
  {
    code: 'L2',
    tier: 'foundations',
    phase: { en: 'Phase 1 · Foundations', 'pt-br': 'Fase 1 · Fundamentos' },
    title: { en: 'Working with LLM APIs & Orchestration', 'pt-br': 'Trabalhando com APIs de LLM e Orquestração' },
    goal: {
      en: 'Turn single stateless completions into reliable software: SSE streaming, cancellation, constrained structured outputs, tool contracts, concurrency and retries.',
      'pt-br': 'Transformar chamadas stateless em software confiável: streaming SSE, cancelamento, saídas estruturadas, contratos de ferramentas, concorrência e retentativas.',
    },
    deliverables: {
      en: ['SSE stream accumulator with clean abort and partial-output handling', 'Generate → validate → repair loop backed by JSON Schema', 'Rate-limit-aware async queue with bounded exponential backoff'],
      'pt-br': ['Acumulador SSE com cancelamento limpo e tratamento de saída parcial', 'Laço gerar → validar → reparar guiado por JSON Schema', 'Fila assíncrona respeitando rate limits com backoff exponencial limitado'],
    },
    capstone: { en: 'Ship a streaming tool-calling assistant that validates every tool payload before execution.', 'pt-br': 'Entregar um assistente com streaming e chamadas de ferramentas validando cada payload antes de executar.' },
    lessonIds: ['26.1-stateless-apis-and-conversation-state', '26.2-streaming-sse-and-cancellation', '26.3-structured-outputs-and-constrained-decoding', '26.4-async-concurrency-rate-limits-and-batching', '15.1-from-model-output-to-a-tool-request', '24.2-retries-and-circuit-breakers'],
  },
  {
    code: 'L3',
    tier: 'foundations',
    phase: { en: 'Phase 1 · Foundations', 'pt-br': 'Fase 1 · Fundamentos' },
    title: { en: 'Prompt Engineering as Systems Engineering', 'pt-br': 'Engenharia de Prompts como Engenharia de Sistemas' },
    goal: {
      en: 'Design deterministic instruction hierarchies, calibrate few-shot exemplars, structure prefix-cache-friendly layouts, and version prompts alongside tests.',
      'pt-br': 'Projetar hierarquias de instruções determinísticas, calibrar exemplos few-shot, estruturar prefixos amigáveis ao KV cache e versionar prompts com testes.',
    },
    deliverables: {
      en: ['Stable prefix ordering that preserves KV cache hits across turns', 'Versioned prompt templates diffed against a regression suite', 'Explicit separation between privileged instructions and untrusted data'],
      'pt-br': ['Ordenação estável de prefixo que preserva acertos de KV cache entre turnos', 'Templates versionados comparados contra uma suíte de regressão', 'Separação explícita entre instruções privilegiadas e dados não confiáveis'],
    },
    capstone: { en: 'Refactor a brittle prompt into a versioned template with measured prefix-cache hit rate.', 'pt-br': 'Refatorar um prompt frágil em template versionado com taxa medida de acerto do cache de prefixo.' },
    lessonIds: ['26.5-prompt-engineering-hierarchy-and-caching', '26.3-structured-outputs-and-constrained-decoding', '7.2-the-kv-cache', '32.1-coupled-versioning-and-release-artifacts'],
  },
  {
    code: 'L4',
    tier: 'core',
    phase: { en: 'Phase 2 · Retrieval', 'pt-br': 'Fase 2 · Recuperação' },
    title: { en: 'Retrieval, Hybrid Search & Production RAG', 'pt-br': 'Recuperação, Busca Híbrida e RAG em Produção' },
    goal: {
      en: 'Build the entire retrieval stack: layout-aware parsing, chunking, Matryoshka embeddings, HNSW indexes, BM25 + RRF hybrid search, reranking, citations, abstention and GraphRAG.',
      'pt-br': 'Construir toda a pilha de recuperação: parsing de layout, chunking, embeddings Matryoshka, HNSW, busca híbrida BM25 + RRF, reranking, citações, abstenção e GraphRAG.',
    },
    deliverables: {
      en: ['Hybrid BM25 + dense vector index fused with Reciprocal Rank Fusion', 'Two-stage retrieval with cross-encoder or ColBERT reranking', 'Citation-verified generator that abstains when evidence is absent'],
      'pt-br': ['Índice híbrido BM25 + vetorial denso fundido com Reciprocal Rank Fusion', 'Recuperação em dois estágios com reranking via cross-encoder ou ColBERT', 'Gerador com citações verificadas que se abstém quando falta evidência'],
    },
    capstone: { en: 'Deploy a hybrid RAG pipeline and prove its Recall@5 and faithfulness lift over naive dense top-k.', 'pt-br': 'Publicar um pipeline RAG híbrido provando o ganho em Recall@5 e fidelidade sobre busca densa simples.' },
    lessonIds: ['27.1-document-ingestion-and-layout-parsing', '27.2-chunking-strategies-and-boundaries', '27.3-dense-embeddings-and-matryoshka', '27.4-ann-vector-indexes-and-hnsw', '27.5-bm25-hybrid-search-and-rrf', '28.1-rag-vs-long-context-vs-fine-tuning', '28.2-baseline-rag-and-context-assembly', '28.3-reranking-cross-encoders-and-colbert', '28.4-query-transformation-and-routing', '28.5-grounding-citations-abstention-and-graph-rag'],
  },
  {
    code: 'L5',
    tier: 'core',
    phase: { en: 'Phase 3 · Agentic Systems', 'pt-br': 'Fase 3 · Sistemas de Agentes' },
    title: { en: 'AI Agents, Durable State, MCP & Multi-Agent Patterns', 'pt-br': 'Agentes de IA, Estado Durável, MCP e Multiagente' },
    goal: {
      en: 'Know when a DAG beats an agent, build durable checkpoints and idempotent replays, ship a raw MCP server, isolate execution, add human approval, and bound self-correction.',
      'pt-br': 'Saber quando um DAG vence um agente, criar checkpoints duráveis e replay idempotente, implementar um servidor MCP, isolar execução, aprovar ações humanas e limitar autocorreção.',
    },
    deliverables: {
      en: ['Checkpointed agent loop with idempotent side-effect keys', 'Least-privilege MCP server with typed schemas', 'Bounded repair loop and explicit human-in-the-loop pause/resume'],
      'pt-br': ['Laço de agente com checkpoints e chaves de idempotência para efeitos colaterais', 'Servidor MCP com menor privilégio e schemas tipados', 'Laço de reparo limitado e pausa/retomada durável com aprovação humana'],
    },
    capstone: { en: 'Build and test a stateful purchasing or ops agent with replayable traces and approval gates.', 'pt-br': 'Construir e testar um agente com estado, traces reproduzíveis e portões de aprovação.' },
    lessonIds: ['14.1-when-a-workflow-needs-an-agent', '14.3-checkpoints-and-serialization', '14.5-langgraph-and-temporal', '15.2-json-rpc-and-protocol-lifecycle', '15.4-a-raw-postgres-mcp-server', '17.1-what-isolation-protects', '20.1-decide-when-approval-is-needed', '21.4-budget-the-repair-loop', '22.3-supervisor-and-peer-topologies'],
  },
  {
    code: 'L6',
    tier: 'core',
    phase: { en: 'Phase 3 · Agentic Systems', 'pt-br': 'Fase 3 · Sistemas de Agentes' },
    title: { en: 'Context Engineering & Long-Horizon Harnesses', 'pt-br': 'Engenharia de Contexto e Harnesses de Longo Horizonte' },
    goal: {
      en: 'Treat the context window as scarce RAM: partition working, episodic and semantic memory, compress without losing tool pairs, avoid lost-in-the-middle, and preserve prefix caching.',
      'pt-br': 'Tratar a janela de contexto como RAM escassa: separar memória de trabalho, episódica e semântica, compactar sem quebrar pares de ferramentas e preservar cache de prefixo.',
    },
    deliverables: {
      en: ['Explicit token budget separating fixed overhead from dynamic history', 'Compaction policy with eviction scoring and decay', 'Memory evaluation catching stale or contradictory recall'],
      'pt-br': ['Orçamento explícito de tokens separando custo fixo de histórico dinâmico', 'Política de compactação com pontuação de descarte e decaimento', 'Avaliação de memória detectando lembranças obsoletas ou contraditórias'],
    },
    capstone: { en: 'Build a long-horizon agent harness that stays within a fixed token budget across 30+ turns.', 'pt-br': 'Construir um harness de agente que respeite um orçamento fixo de tokens ao longo de 30+ turnos.' },
    lessonIds: ['19.1-working-episodic-and-semantic-memory', '19.3-token-budgets-and-compression', '19.4-scoring-eviction-and-forgetting', '19.5-evaluate-memory', '28.2-baseline-rag-and-context-assembly', '26.5-prompt-engineering-hierarchy-and-caching'],
  },
  {
    code: 'L7',
    tier: 'core',
    phase: { en: 'Phase 4 · Evaluation & Trust', 'pt-br': 'Fase 4 · Avaliação e Confiança' },
    title: { en: 'LLM, RAG & Agent Evaluations', 'pt-br': 'Avaliações de LLMs, RAG e Agentes' },
    goal: {
      en: 'Run open-coded error analysis first, measure retrieval (Recall@k, MRR, NDCG@k) separately from generation, calibrate LLM judges with Cohen’s kappa, and gate CI on regressions.',
      'pt-br': 'Executar análise de erros primeiro, medir recuperação (Recall@k, MRR, NDCG@k) separado de geração, calibrar juízes LLM com kappa de Cohen e travar regressões em CI.',
    },
    deliverables: {
      en: ['Failure taxonomy built from 50–100 real traces', 'Retrieval & generation eval harness with deterministic assertions', 'Human-calibrated LLM judge reporting Cohen’s kappa before gating releases'],
      'pt-br': ['Taxonomia de falhas construída sobre 50–100 traces reais', 'Suíte de avaliação de recuperação e geração com asserções determinísticas', 'Juiz LLM calibrado contra humanos reportando kappa de Cohen antes de travar releases'],
    },
    capstone: { en: 'Ship an automated eval suite of 100 cases that blocks a planted regression in CI.', 'pt-br': 'Publicar uma suíte automatizada de 100 casos que bloqueia uma regressão plantada no CI.' },
    lessonIds: ['29.1-error-analysis-and-failure-taxonomies', '29.2-retrieval-and-generation-metrics', '29.3-llm-as-a-judge-and-calibration', '29.4-benchmarks-leaderboards-and-contamination', '29.5-offline-to-online-eval-flywheels', '23.2-evaluate-valid-paths', '23.3-build-a-100-case-corpus'],
  },
  {
    code: 'L8',
    tier: 'advanced',
    phase: { en: 'Phase 4 · Evaluation & Trust', 'pt-br': 'Fase 4 · Avaliação e Confiança' },
    title: { en: 'AI Security, Privacy & Governance', 'pt-br': 'Segurança de IA, Privacidade e Governança' },
    goal: {
      en: 'Enforce pre-retrieval document ACLs, defend against indirect injection and corpus poisoning, bound PII egress, budget runtime guardrails, and map controls to OWASP, NIST and the EU AI Act.',
      'pt-br': 'Aplicar ACLs de documentos antes da recuperação, defender contra injeção indireta e envenenamento de corpus, limitar PII, orçar guardrails e mapear controles para OWASP, NIST e EU AI Act.',
    },
    deliverables: {
      en: ['Tenant-isolated pre-filtered vector search with zero cross-tenant leaks', 'Red-team test suite covering prompt injection, tool poisoning and data exfiltration', 'Compliance mapping against OWASP LLM Top 10 and NIST AI 600-1'],
      'pt-br': ['Busca vetorial pré-filtrada por tenant sem vazamento entre clientes', 'Suíte de red-team cobrindo injeção de prompt, envenenamento de ferramenta e exfiltração', 'Mapeamento de controles contra OWASP LLM Top 10 e NIST AI 600-1'],
    },
    capstone: { en: 'Red-team an agentic RAG app with 10+ concrete attack vectors and prove every boundary holds.', 'pt-br': 'Fazer red-team de um app RAG agêntico com 10+ ataques concretos e provar que cada barreira resiste.' },
    lessonIds: ['16.1-threat-model-the-assistant', '16.2-indirect-prompt-injection', '16.3-tool-poisoning-and-delegation', '30.1-rag-access-control-and-tenant-isolation', '30.2-corpus-poisoning-and-indirect-injection', '30.3-pii-redaction-and-data-boundaries', '30.4-jailbreaks-guardrails-and-latency-budgets', '30.5-ai-governance-owasp-nist-and-eu-ai-act'],
  },
  {
    code: 'L9',
    tier: 'advanced',
    phase: { en: 'Phase 5 · Production', 'pt-br': 'Fase 5 · Produção' },
    title: { en: 'AI System Design, Caching & Routing', 'pt-br': 'Design de Sistemas de IA, Cache e Roteamento' },
    goal: {
      en: 'Design complete production systems under explicit p95/p99 latency, cache false-hit, model-routing and unit-economics budgets at 100x traffic.',
      'pt-br': 'Projetar sistemas completos em produção sob orçamentos explícitos de latência p95/p99, risco de falso acerto em cache, roteamento de modelos e economia unitária a 100x.',
    },
    deliverables: {
      en: ['End-to-end latency breakdown across retrieval, guardrails, TTFT and decode', 'Multi-layer cache architecture separating exact, KV prefix and semantic layers', 'Unit-economics spreadsheet showing break-even cost and failure modes at 100x scale'],
      'pt-br': ['Decomposição de latência entre recuperação, guardrails, TTFT e decode', 'Arquitetura de cache em camadas separando exato, prefixo KV e semântico', 'Planilha de economia unitária mostrando ponto de equilíbrio e gargalos a 100x'],
    },
    capstone: { en: 'Write a production AI system design document defending every latency, cache and cost tradeoff.', 'pt-br': 'Escrever um documento de arquitetura de IA defendendo cada tradeoff de latência, cache e custo.' },
    lessonIds: ['31.1-end-to-end-latency-budgets', '31.2-multi-layer-caching-and-semantic-risk', '31.3-model-routing-cascades-and-gateways', '31.4-unit-economics-at-scale', '31.5-production-system-design-case-studies', '24.4-model-cascades-and-budgets', '9.10-cost-per-token'],
  },
  {
    code: 'L10',
    tier: 'advanced',
    phase: { en: 'Phase 5 · Production', 'pt-br': 'Fase 5 · Produção' },
    title: { en: 'LLMOps: Versioning, Observability & Rollbacks', 'pt-br': 'LLMOps: Versionamento, Observabilidade e Rollbacks' },
    goal: {
      en: 'Ship coupled prompt-model-index release bundles, instrument OpenTelemetry GenAI spans, run shadow and canary rollouts, and execute silent-regression rollback runbooks.',
      'pt-br': 'Entregar artefatos acoplados de prompt-modelo-índice, instrumentar spans OpenTelemetry GenAI, rodar shadow/canary e executar runbooks de rollback de regressões silenciosas.',
    },
    deliverables: {
      en: ['Immutable release manifest pinning prompt, schema, model snapshot and index version', 'OpenTelemetry traces correlating retrieval latency, tokens, cache hits and cost', 'Shadow + canary rollout with automated rollback triggers'],
      'pt-br': ['Manifesto imutável fixando prompt, schema, snapshot do modelo e versão do índice', 'Traces OpenTelemetry correlacionando latência de busca, tokens, cache e custo', 'Rollout shadow + canary com gatilhos automáticos de rollback'],
    },
    capstone: { en: 'Run a simulated silent quality regression and roll back the coupled release artifact cleanly.', 'pt-br': 'Simular uma regressão silenciosa de qualidade e reverter o artefato acoplado de release com segurança.' },
    lessonIds: ['32.1-coupled-versioning-and-release-artifacts', '32.2-opentelemetry-genai-observability', '32.3-shadow-canary-and-incident-rollbacks', '24.5-recovery-drills', '23.5-ci-replay-and-live-trials'],
  },
  {
    code: 'L11',
    tier: 'advanced',
    phase: { en: 'Phase 5 · Production', 'pt-br': 'Fase 5 · Produção' },
    title: { en: 'Managed AI Platforms, Tenancy & Self-Hosting', 'pt-br': 'Plataformas Gerenciadas, Tenancy e Self-Hosting' },
    goal: {
      en: 'Compare direct APIs, managed cloud platforms (Bedrock, Vertex AI, Azure AI Foundry) and self-hosted clusters on provisioned-throughput math, VPC residency and lock-in.',
      'pt-br': 'Comparar APIs diretas, nuvens gerenciadas (Bedrock, Vertex AI, Azure AI Foundry) e clusters próprios pela matemática de capacidade reservada, VPC e portabilidade.',
    },
    deliverables: {
      en: ['Pay-as-you-go vs provisioned throughput vs self-hosted break-even calculation', 'Private networking, IAM and zero-data-retention architecture checklist', 'Gateway abstraction isolating vendor-specific features from core logic'],
      'pt-br': ['Cálculo de break-even entre PAYG, capacidade reservada e self-hosting', 'Checklist de rede privada, IAM e contrato de retenção zero', 'Abstração de gateway isolando recursos proprietários da lógica central'],
    },
    capstone: { en: 'Produce a multi-region managed-vs-self-hosted deployment plan with exit-cost estimates.', 'pt-br': 'Produzir um plano multi-região comparando nuvem gerenciada e self-hosting com custo de migração.' },
    lessonIds: ['32.4-api-managed-cloud-and-self-hosted-economics', '32.5-enterprise-tenancy-residency-and-portability', '8.11-serving-in-the-cloud', '8.12-choosing-your-stack', '7.11-serving-stacks-vllm-sglang-tensorrt-llm'],
  },
  {
    code: 'L12',
    tier: 'frontier',
    phase: { en: 'Phase 6 · Frontier & Proof', 'pt-br': 'Fase 6 · Fronteira e Prova' },
    title: { en: 'Multimodal AI: Vision, Visual RAG, Audio & Voice Agents', 'pt-br': 'IA Multimodal: Visão, RAG Visual, Áudio e Voz' },
    goal: {
      en: 'Go beyond text: visual document retrieval with ColPali, diffusion and flow matching, neural audio codecs, Whisper STT, streaming TTS, and realtime voice agents under 500 ms.',
      'pt-br': 'Ir além do texto: recuperação visual de documentos com ColPali, difusão e flow matching, codecs neurais de áudio, Whisper, TTS em streaming e agentes de voz abaixo de 500 ms.',
    },
    deliverables: {
      en: ['Visual document retrieval benchmark comparing OCR+chunking against page-image embeddings', 'Speech pipeline measuring word error rate and endpointing delay', 'Voice turn-latency budget with VAD and barge-in interruption handling'],
      'pt-br': ['Benchmark de documentos visuais comparando OCR+chunking contra embeddings de página', 'Pipeline de fala medindo taxa de erro de palavras e atraso de fim de turno', 'Orçamento de latência de voz com VAD e tratamento de interrupção (barge-in)'],
    },
    capstone: { en: 'Ship a multimodal pipeline (visual PDF Q&A or low-latency voice agent) with measured latency.', 'pt-br': 'Entregar um pipeline multimodal (Q&A visual de PDF ou agente de voz) com latência medida.' },
    lessonIds: ['4.17-multimodal-vision-encoder', '10.1-how-video-models-see-time', '33.1-visual-document-rag-and-cross-modal-search', '33.2-diffusion-and-flow-matching-generation', '33.3-audio-tokens-whisper-stt-and-tts', '33.4-realtime-voice-agents-and-barge-in'],
  },
  {
    code: 'L13',
    tier: 'frontier',
    phase: { en: 'Phase 6 · Frontier & Proof', 'pt-br': 'Fase 6 · Fronteira e Prova' },
    title: { en: 'Fine-Tuning, Preference Alignment, Distillation & Adapter Serving', 'pt-br': 'Fine-Tuning, Alinhamento, Destilação e Serving de Adaptadores' },
    goal: {
      en: 'Know when fine-tuning beats prompting or RAG, curate clean held-out datasets, train with SFT, LoRA/QLoRA, DPO, GRPO and distillation, and serve multi-LoRA adapters safely.',
      'pt-br': 'Saber quando fine-tuning vence prompt ou RAG, curar datasets sem vazamento, treinar com SFT, LoRA/QLoRA, DPO, GRPO e destilação, e servir múltiplos adaptadores LoRA.',
    },
    deliverables: {
      en: ['Explicit decision memo proving prompting + RAG saturated before tuning', 'Before-and-after evaluation across target metrics and non-regression tests', 'Multi-LoRA serving plan with adapter versioning and rollback'],
      'pt-br': ['Decisão documentada provando que prompt + RAG saturaram antes do ajuste fino', 'Avaliação antes/depois nas métricas-alvo e em testes de não-regressão', 'Plano de serving multi-LoRA com versionamento de adaptadores e rollback'],
    },
    capstone: { en: 'Train a LoRA adapter that beats a prompted baseline on a held-out test set without general regression.', 'pt-br': 'Treinar um adaptador LoRA que supere o baseline de prompt em conjunto retido sem regressão geral.' },
    lessonIds: ['6.1-why-base-models-arent-assistants', '6.2-supervised-fine-tuning-and-instruction-data', '6.3-lora-qlora-and-peft', '6.6-dpo-skipping-the-reward-model', '6.8-grpo-and-rl-on-verifiable-rewards', '6.11-distillation-making-small-models-punch-up', '28.1-rag-vs-long-context-vs-fine-tuning', '33.5-applied-fine-tuning-and-engineering-defense'],
  },
  {
    code: 'L14',
    tier: 'frontier',
    phase: { en: 'Phase 6 · Frontier & Proof', 'pt-br': 'Fase 6 · Fronteira e Prova' },
    title: { en: 'Portfolio Builds & Public Engineering Proof', 'pt-br': 'Projetos de Portfólio e Prova Pública de Engenharia' },
    goal: {
      en: 'Compose retrieval, agents, evals, security and LLMOps into two or three public, measurable builds backed by baselines, attack tests, cost tables and failure teardowns.',
      'pt-br': 'Compor recuperação, agentes, avaliações, segurança e LLMOps em dois ou três projetos públicos medidos com baselines, testes de ataque, tabelas de custo e análise de falhas.',
    },
    deliverables: {
      en: ['Reproducible benchmark with 95% confidence intervals and cost per successful task', 'Published failure analysis documenting real bugs and design changes', 'Threat model and security evidence proving defenses hold'],
      'pt-br': ['Benchmark reproduzível com intervalos de confiança de 95% e custo por tarefa bem-sucedida', 'Análise pública de falhas documentando bugs reais e mudanças de projeto', 'Modelo de ameaças e evidências provando que as defesas funcionam'],
    },
    capstone: { en: 'Publish an end-to-end engineering teardown with live code, eval numbers and cost-per-success.', 'pt-br': 'Publicar um teardown técnico completo com código, números de avaliação e custo por sucesso.' },
    lessonIds: ['25.1-architecture-and-threat-model-review', '25.2-a-reproducible-benchmark', '25.3-failure-analysis', '25.4-write-the-teardown', '25.5-defend-and-publish-deliberately'],
  },
  {
    code: 'L15',
    tier: 'frontier',
    phase: { en: 'Phase 7 · Technical Defense', 'pt-br': 'Fase 7 · Defesa Técnica' },
    title: { en: 'Production Debugging & AI Architecture Defense', 'pt-br': 'Depuração em Produção e Defesa de Arquitetura de IA' },
    goal: {
      en: 'Reason clearly under pressure: diagnose silent RAG drops, runaway agent loops, latency spikes and model regressions, and defend every tradeoff with measurement instead of hype.',
      'pt-br': 'Raciocinar com clareza sob pressão: diagnosticar quedas silenciosas de RAG, loops de agentes, picos de latência e regressões de modelo defendendo tradeoffs com medição.',
    },
    deliverables: {
      en: ['Structured whiteboard sequence: constraints → baseline → bottlenecks → failure modes', 'Rapid triage playbooks for RAG, agent, latency and fine-tuning incidents', 'Quantified project defense answering 100x scale and 50% cost-cut challenges'],
      'pt-br': ['Sequência estruturada de arquitetura: restrições → baseline → gargalos → modos de falha', 'Playbooks de triagem rápida para incidentes de RAG, agentes, latência e fine-tuning', 'Defesa quantificada respondendo a desafios de 100x de tráfego e corte de 50% no custo'],
    },
    capstone: { en: 'Complete a three-round defense: incident debugging, system design and project teardown.', 'pt-br': 'Concluir uma defesa em três rodadas: depuração de incidente, design de sistema e teardown de projeto.' },
    lessonIds: ['33.5-applied-fine-tuning-and-engineering-defense', '31.5-production-system-design-case-studies', '32.3-shadow-canary-and-incident-rollbacks', '25.5-defend-and-publish-deliberately'],
  },
] as const

export const HUNDRED_DAY_STAGES: readonly HundredDayStage[] = [
  {
    index: 1,
    days: { en: 'Days 1–6', 'pt-br': 'Dias 1–6' },
    tier: 'foundations',
    title: { en: 'LLM Fundamentals & Inference Mental Model', 'pt-br': 'Fundamentos de LLMs e Modelo Mental de Inferência' },
    focus: {
      en: 'How tokens, embeddings, attention, KV cache, prefill/decode and sampling govern latency, context limits and cost.',
      'pt-br': 'Como tokens, embeddings, atenção, KV cache, prefill/decode e amostragem governam latência, contexto e custo.',
    },
    milestone: { en: 'Estimate token cost and prefill vs decode latency for a real workload before writing code.', 'pt-br': 'Estimar custo de tokens e latência de prefill vs decode de uma carga real antes de codificar.' },
    lessonIds: ['0.1-what-is-a-language-model', '1.2-tokenization-i', '1.5-embeddings-meaning-as-geometry', '7.1-what-actually-happens-when-you-hit-send', '7.2-the-kv-cache', '7.3-prefill-vs-decode-two-different-machines', '7.4-sampling'],
  },
  {
    index: 2,
    days: { en: 'Days 7–17', 'pt-br': 'Dias 7–17' },
    tier: 'foundations',
    title: { en: 'Building Reliable Software on LLM APIs', 'pt-br': 'Construindo Software Confiável sobre APIs de LLM' },
    focus: {
      en: 'Stateless conversations, SSE streaming and cancellation, schema-constrained outputs, tool contracts, async queues and retries.',
      'pt-br': 'Conversas stateless, streaming SSE e cancelamento, saídas restritas por schema, contratos de ferramentas, filas assíncronas e retentativas.',
    },
    milestone: { en: 'Ship a streaming API wrapper with schema validation, retry bounds and token logging.', 'pt-br': 'Entregar um wrapper de API com streaming, validação de schema, limite de retentativas e log de tokens.' },
    lessonIds: ['26.1-stateless-apis-and-conversation-state', '26.2-streaming-sse-and-cancellation', '26.3-structured-outputs-and-constrained-decoding', '26.4-async-concurrency-rate-limits-and-batching', '15.1-from-model-output-to-a-tool-request', '24.1-classify-failures-before-retrying', '24.2-retries-and-circuit-breakers'],
  },
  {
    index: 3,
    days: { en: 'Days 18–24', 'pt-br': 'Dias 18–24' },
    tier: 'foundations',
    title: { en: 'Prompt Engineering, Hierarchy & Prefix Caching', 'pt-br': 'Engenharia de Prompts, Hierarquia e Cache de Prefixo' },
    focus: {
      en: 'Instruction hierarchy, few-shot stability, prompt decomposition, prefix-cache layout and regression diffs.',
      'pt-br': 'Hierarquia de instruções, estabilidade de few-shot, decomposição de prompts, layout de cache de prefixo e diffs de regressão.',
    },
    milestone: { en: 'Version a production prompt with automated format checks and stable prefix caching.', 'pt-br': 'Versionar um prompt de produção com verificações automáticas de formato e cache de prefixo estável.' },
    lessonIds: ['26.5-prompt-engineering-hierarchy-and-caching', '16.2-indirect-prompt-injection', '32.1-coupled-versioning-and-release-artifacts'],
  },
  {
    index: 4,
    days: { en: 'Days 25–56', 'pt-br': 'Dias 25–56' },
    tier: 'core',
    title: { en: 'Retrieval, Hybrid RAG, Evals & RAG Security', 'pt-br': 'Recuperação, RAG Híbrido, Avaliações e Segurança' },
    focus: {
      en: 'Parsing, chunking, Matryoshka embeddings, HNSW, BM25 + RRF, reranking, query transforms, grounding, IR evals, ACLs and poisoning defense.',
      'pt-br': 'Parsing, chunking, embeddings Matryoshka, HNSW, BM25 + RRF, reranking, transformação de consultas, citações, métricas de IR, ACLs e defesa contra envenenamento.',
    },
    milestone: { en: 'Deploy a tenant-isolated hybrid RAG app with Recall@5, MRR, NDCG@5 and faithfulness scores.', 'pt-br': 'Publicar um app RAG híbrido isolado por tenant com métricas medidas de Recall@5, MRR, NDCG@5 e fidelidade.' },
    lessonIds: ['27.1-document-ingestion-and-layout-parsing', '27.2-chunking-strategies-and-boundaries', '27.3-dense-embeddings-and-matryoshka', '27.4-ann-vector-indexes-and-hnsw', '27.5-bm25-hybrid-search-and-rrf', '28.1-rag-vs-long-context-vs-fine-tuning', '28.2-baseline-rag-and-context-assembly', '28.3-reranking-cross-encoders-and-colbert', '28.4-query-transformation-and-routing', '28.5-grounding-citations-abstention-and-graph-rag', '29.1-error-analysis-and-failure-taxonomies', '29.2-retrieval-and-generation-metrics', '29.3-llm-as-a-judge-and-calibration', '30.1-rag-access-control-and-tenant-isolation', '30.2-corpus-poisoning-and-indirect-injection'],
  },
  {
    index: 5,
    days: { en: 'Days 57–83', 'pt-br': 'Dias 57–83' },
    tier: 'advanced',
    title: { en: 'Durable Agents, MCP, Memory, Evals & Security', 'pt-br': 'Agentes Duráveis, MCP, Memória, Avaliações e Segurança' },
    focus: {
      en: 'Workflows vs agents, checkpoints and replay, raw MCP servers, sandboxing, context compaction, human approvals, bounded repair and trajectory evals.',
      'pt-br': 'Workflows vs agentes, checkpoints e replay, servidores MCP, sandboxing, compactação de contexto, aprovação humana, reparo limitado e avaliação de trajetórias.',
    },
    milestone: { en: 'Ship an audited agent with MCP tools, approval gates, trajectory CI checks and red-team tests.', 'pt-br': 'Entregar um agente auditado com ferramentas MCP, aprovação humana, avaliação de trajetória em CI e testes de red-team.' },
    lessonIds: ['14.1-when-a-workflow-needs-an-agent', '14.3-checkpoints-and-serialization', '15.4-a-raw-postgres-mcp-server', '16.4-enforce-least-privilege', '17.4-a-python-interpreter-in-a-microvm', '19.3-token-budgets-and-compression', '20.1-decide-when-approval-is-needed', '21.4-budget-the-repair-loop', '22.3-supervisor-and-peer-topologies', '23.2-evaluate-valid-paths', '23.5-ci-replay-and-live-trials'],
  },
  {
    index: 6,
    days: { en: 'Days 84–100', 'pt-br': 'Dias 84–100' },
    tier: 'frontier',
    title: { en: 'Shipping to Production, LLMOps & Technical Defense', 'pt-br': 'Produção, LLMOps e Defesa Técnica' },
    focus: {
      en: 'Latency budgets, multi-layer caching, model routing, OTel tracing, shadow/canary rollouts, managed platforms, multimodal/voice and architecture defense.',
      'pt-br': 'Orçamentos de latência, cache em camadas, roteamento, tracing OTel, shadow/canary, plataformas gerenciadas, multimodal/voz e defesa de arquitetura.',
    },
    milestone: { en: 'Publish two measured systems with OpenTelemetry traces, cost-per-success and a failure teardown.', 'pt-br': 'Publicar dois sistemas medidos com traces OpenTelemetry, custo por sucesso e teardown de falhas.' },
    lessonIds: ['30.3-pii-redaction-and-data-boundaries', '30.4-jailbreaks-guardrails-and-latency-budgets', '30.5-ai-governance-owasp-nist-and-eu-ai-act', '31.1-end-to-end-latency-budgets', '31.2-multi-layer-caching-and-semantic-risk', '31.3-model-routing-cascades-and-gateways', '31.4-unit-economics-at-scale', '32.2-opentelemetry-genai-observability', '32.3-shadow-canary-and-incident-rollbacks', '32.4-api-managed-cloud-and-self-hosted-economics', '33.1-visual-document-rag-and-cross-modal-search', '33.4-realtime-voice-agents-and-barge-in', '33.5-applied-fine-tuning-and-engineering-defense', '25.4-write-the-teardown'],
  },
] as const

export const PROOF_RUBRIC: Readonly<Record<Locale, readonly string[]>> = {
  en: [
    'State the user, failure cost and non-AI baseline before calling a model.',
    'Measure a 30–100 case evaluation set with baseline and post-change scores plus 95% confidence intervals.',
    'Calibrate any LLM judge against human labels and report Cohen’s kappa, not raw agreement alone.',
    'Run 10+ adversarial tests (prompt injection, cross-tenant retrieval, secret leakage) and document blocked outcomes.',
    'Report p50/p95 latency and full cost per successful task (including retries and human review).',
    'Publish a failure teardown: what broke first, what you cut, and what changes at 100x traffic.',
  ],
  'pt-br': [
    'Defina o usuário, o custo de erro e um baseline sem IA antes de chamar um modelo.',
    'Meça uma suíte de 30–100 casos com escores antes e depois e intervalos de confiança de 95%.',
    'Calibre qualquer juiz LLM contra rótulos humanos e reporte o kappa de Cohen, não só concordância bruta.',
    'Execute 10+ ataques adversariais (injeção de prompt, vazamento entre tenants, segredos) e documente o bloqueio.',
    'Reporte latência p50/p95 e custo total por tarefa bem-sucedida (incluindo retentativas e revisão humana).',
    'Publique um teardown de falhas: o que quebrou primeiro, o que foi cortado e o que muda a 100x de tráfego.',
  ],
}

export const PORTFOLIO_BLUEPRINTS: readonly PortfolioBlueprint[] = [
  {
    id: 'hybrid-rag-platform',
    tier: 'core',
    title: { en: 'Tenant-Isolated Hybrid Document Q&A', 'pt-br': 'Q&A Híbrido de Documentos Isolado por Tenant' },
    problem: { en: 'Answer policy or financial PDF questions with inline citations, abstention and pre-filtered ACLs.', 'pt-br': 'Responder perguntas sobre PDFs financeiros ou políticas com citações inline, abstenção e ACL pré-filtrada.' },
    proof: { en: 'Recall@5, MRR, NDCG@5 and faithfulness before/after BM25+RRF and reranking; 0 cross-tenant leaks.', 'pt-br': 'Recall@5, MRR, NDCG@5 e fidelidade antes/depois de BM25+RRF e reranking; zero vazamento entre tenants.' },
    lessonIds: ['27.1-document-ingestion-and-layout-parsing', '27.5-bm25-hybrid-search-and-rrf', '28.3-reranking-cross-encoders-and-colbert', '29.2-retrieval-and-generation-metrics', '30.1-rag-access-control-and-tenant-isolation'],
  },
  {
    id: 'structured-invoice-pipeline',
    tier: 'foundations',
    title: { en: 'Visual Invoice Extractor with Human Review', 'pt-br': 'Extrator Visual de Notas com Revisão Humana' },
    problem: { en: 'Extract vendor, dates and line items from scanned invoices, verify arithmetic totals, and route uncertain items to humans.', 'pt-br': 'Extrair fornecedor, datas e itens de notas escaneadas, validar somas e rotear casos incertos para revisão humana.' },
    proof: { en: 'Field-level exact match on 30+ real documents; zero invalid totals saved without human sign-off.', 'pt-br': 'Acurácia por campo em 30+ documentos reais; nenhum total inválido salvo sem aprovação humana.' },
    lessonIds: ['26.3-structured-outputs-and-constrained-decoding', '33.1-visual-document-rag-and-cross-modal-search', '20.1-decide-when-approval-is-needed'],
  },
  {
    id: 'mcp-audited-agent',
    tier: 'advanced',
    title: { en: 'Audited MCP Operations Agent', 'pt-br': 'Agente Operacional Auditado via MCP' },
    problem: { en: 'Connect a model to real Postgres or ticketing tools over least-privilege MCP with durable checkpoints and bounded retries.', 'pt-br': 'Conectar um modelo a ferramentas reais via MCP de menor privilégio com checkpoints duráveis e retentativas limitadas.' },
    proof: { en: 'Trajectory policy pass rate, idempotent replay under injected crashes, and blocked tool-poisoning tests.', 'pt-br': 'Taxa de aprovação em políticas de trajetória, replay idempotente sob falhas injetadas e bloqueio de tool poisoning.' },
    lessonIds: ['14.3-checkpoints-and-serialization', '15.4-a-raw-postgres-mcp-server', '16.3-tool-poisoning-and-delegation', '23.2-evaluate-valid-paths', '25.2-a-reproducible-benchmark'],
  },
  {
    id: 'monitored-ai-gateway',
    tier: 'advanced',
    title: { en: 'Observable Multi-Model Gateway & Cache', 'pt-br': 'Gateway Multimodelo Observável com Cache' },
    problem: { en: 'Route requests across fast and frontier models with prefix/exact caching, guardrails, circuit breakers and OTel spans.', 'pt-br': 'Rotear requisições entre modelos rápidos e de fronteira com cache, guardrails, circuit breakers e spans OTel.' },
    proof: { en: 'Measured p95 latency, cost-per-1k drop from routing/caching, and automated rollback on a planted eval dip.', 'pt-br': 'Latência p95 medida, redução de custo por 1k com roteamento/cache e rollback automático em queda simulada.' },
    lessonIds: ['31.1-end-to-end-latency-budgets', '31.3-model-routing-cascades-and-gateways', '32.2-opentelemetry-genai-observability', '32.3-shadow-canary-and-incident-rollbacks'],
  },
  {
    id: 'realtime-voice-agent',
    tier: 'frontier',
    title: { en: 'Sub-500 ms Realtime Voice Assistant', 'pt-br': 'Assistente de Voz em Tempo Real (< 500 ms)' },
    problem: { en: 'Hold a natural spoken turn with voice-activity detection, streaming TTS and clean barge-in cancellation.', 'pt-br': 'Sustentar uma conversa falada natural com detecção de atividade de voz, TTS em streaming e interrupção limpa.' },
    proof: { en: 'Per-stage latency log (VAD, STT, TTFT, TTS, RTT) across 20 live turns plus interruption tests.', 'pt-br': 'Log de latência por estágio (VAD, STT, TTFT, TTS, RTT) em 20 turnos reais mais testes de interrupção.' },
    lessonIds: ['26.2-streaming-sse-and-cancellation', '33.3-audio-tokens-whisper-stt-and-tts', '33.4-realtime-voice-agents-and-barge-in'],
  },
] as const

export const DEFENSE_DRILLS: readonly DefenseDrill[] = [
  {
    id: 'rag-silent-drop',
    scenario: { en: 'RAG faithfulness drops 18% overnight with zero code deployments.', 'pt-br': 'A fidelidade do RAG cai 18% de um dia para o outro sem nenhum deploy de código.' },
    firstCheck: { en: 'Split retrieval vs generation traces: inspect corpus ingestion drift, embedding model silent updates, and ACL filter selectivity before touching the prompt.', 'pt-br': 'Separe traces de recuperação e geração: inspecione deriva na ingestão do corpus, atualização silenciosa de embeddings e seletividade de filtros ACL antes de mexer no prompt.' },
    lessonIds: ['29.1-error-analysis-and-failure-taxonomies', '29.2-retrieval-and-generation-metrics', '32.1-coupled-versioning-and-release-artifacts'],
  },
  {
    id: 'runaway-agent-bill',
    scenario: { en: 'An autonomous agent burns 10x its daily token budget in 20 minutes.', 'pt-br': 'Um agente autônomo consome 10x do orçamento diário de tokens em 20 minutos.' },
    firstCheck: { en: 'Check repair-loop retry bounds, uncached dynamic prefix churn, and tool-output payload bloat; add hard step/dollar circuit breakers and idempotency keys.', 'pt-br': 'Verifique limites do laço de reparo, quebra de cache de prefixo e explosão de saída de ferramentas; aplique circuit breakers rígidos de passos/custo e chaves de idempotência.' },
    lessonIds: ['21.4-budget-the-repair-loop', '26.5-prompt-engineering-hierarchy-and-caching', '24.4-model-cascades-and-budgets'],
  },
  {
    id: 'semantic-cache-leak',
    scenario: { en: 'Users report receiving answers meant for another account after enabling semantic caching.', 'pt-br': 'Usuários relatam respostas de outra conta depois da ativação de cache semântico.' },
    firstCheck: { en: 'Scope cache keys strictly by tenant/principal and ACL hash, raise similarity thresholds only after measuring false-hit rates, and keep personalized queries out of shared semantic caches.', 'pt-br': 'Isole chaves de cache estritamente por tenant/principal e hash de ACL, meça taxa de falso acerto e nunca compartilhe consultas personalizadas em cache semântico global.' },
    lessonIds: ['30.1-rag-access-control-and-tenant-isolation', '31.2-multi-layer-caching-and-semantic-risk'],
  },
  {
    id: 'halve-cost-100x',
    scenario: { en: 'Traffic jumps 100x and leadership asks to cut inference spend by 50% without losing quality.', 'pt-br': 'O tráfego sobe 100x e pedem corte de 50% no custo de inferência sem perda de qualidade.' },
    firstCheck: { en: 'Stack four measured levers in order: stabilize prompt prefix caching, route easy queries to a smaller model via a calibrated cascade, compress retrieved context, then evaluate provisioned throughput or self-hosting break-even.', 'pt-br': 'Empilhe quatro alavancas medidas em ordem: estabilizar cache de prefixo, rotear consultas simples para modelo menor em cascata calibrada, enxugar contexto recuperado e calcular break-even de capacidade reservada ou self-hosting.' },
    lessonIds: ['31.3-model-routing-cascades-and-gateways', '31.4-unit-economics-at-scale', '32.4-api-managed-cloud-and-self-hosted-economics'],
  },
] as const
