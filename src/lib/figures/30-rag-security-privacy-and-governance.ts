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

  /**
   * 30.2 explains why five crafted texts overwhelm a two-million-chunk corpus:
   * retrieval passes only the top k chunks, so beating the true document's
   * similarity crowds it out completely before generation starts.
   */
  't30-poisoned-rag-takeover': {
    lesson: '30.2-corpus-poisoning-and-indirect-injection',
    title: {
      en: 'How five poisoned chunks hijack top-5 retrieval',
      'pt-br': 'Como cinco trechos envenenados tomam o top-5',
    },
    caption: {
      en: 'Corpus size does not dilute an attack when top-k retrieval keeps only five chunks. Five payloads matching the query push the true document out of context before the model writes a word.',
      'pt-br': 'O tamanho do corpus não dilui um ataque quando a busca top-k entrega só cinco trechos. Cinco textos alinhados à pergunta expulsam o documento verdadeiro antes de o modelo escrever uma palavra.',
    },
    steps: [
      {
        label: { en: 'Clean search', 'pt-br': 'Busca limpa' },
        caption: {
          en: 'Before poisoning, the official routing-number document scores 0.82 similarity, lands inside the top 5, and grounds the answer.',
          'pt-br': 'Antes do envenenamento, o documento oficial da conta marca 0,82 de similaridade, entra no top 5 e embasa a resposta.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'User query', 'pt-br': 'Consulta do usuário' }, detail: { en: 'asks for Vendor X routing number', 'pt-br': 'pede a conta do Fornecedor X' }, pigment: 'muted' },
            { label: { en: '2,000,000 clean chunks', 'pt-br': '2.000.000 de trechos limpos' }, detail: { en: 'true document scores 0.82', 'pt-br': 'documento real marca 0,82' }, pigment: 'accent' },
            { label: { en: 'Top-5 context slots', 'pt-br': 'Vagas do top-5' }, detail: { en: 'true doc leads; 0% poisoned', 'pt-br': 'doc real lidera; 0% envenenado' }, pigment: 'accent' },
            { label: { en: 'Grounded answer', 'pt-br': 'Resposta embasada' }, detail: { en: 'returns the official number', 'pt-br': 'devolve a conta oficial' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Five payloads added', 'pt-br': 'Cinco payloads entram' },
        caption: {
          en: 'The attacker uploads five texts (0.00025% of the corpus) pairing the exact question prefix with a forged account. Their 0.89–0.93 scores fill every top-5 slot.',
          'pt-br': 'O atacante publica cinco textos (0,00025% do corpus) juntando o prefixo da pergunta a uma conta forjada. As notas de 0,89–0,93 lotam todas as 5 vagas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '5 crafted uploads', 'pt-br': '5 textos forjados' }, detail: { en: 'prefix S matches Q; body I fakes answer', 'pt-br': 'prefixo S imita Q; corpo I forja resposta' }, pigment: 'danger' },
            { label: { en: 'Tiny corpus share', 'pt-br': 'Fatia mínima da base' }, detail: { en: '5 of 2,000,000 chunks (0.00025%)', 'pt-br': '5 em 2.000.000 de trechos (0,00025%)' }, pigment: 'caution' },
            { label: { en: 'Higher similarity', 'pt-br': 'Similaridade maior' }, detail: { en: '0.89–0.93 beats the true doc’s 0.82', 'pt-br': '0,89–0,93 supera os 0,82 do doc real' }, pigment: 'danger' },
            { label: { en: 'Top-5 saturated', 'pt-br': 'Top-5 lotado' }, detail: { en: '5 of 5 slots poisoned (100% of context)', 'pt-br': '5 de 5 vagas tomadas (100% do contexto)' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Corrupted answer', 'pt-br': 'Resposta corrompida' },
        caption: {
          en: 'The model never sees the true document at rank 6. Reading five agreeing chunks, it outputs the forged number — a 90% black-box attack success rate in Zou et al. (2024).',
          'pt-br': 'O modelo nunca vê o documento real no 6.º lugar. Lendo cinco trechos concordantes, responde a conta forjada — taxa de 90% em cenário caixa-preta em Zou et al. (2024).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Prompt context', 'pt-br': 'Contexto do prompt' }, detail: { en: 'system rules + 5 agreeing fake chunks', 'pt-br': 'regras do sistema + 5 trechos falsos iguais' }, pigment: 'caution' },
            { label: { en: 'True doc unseen', 'pt-br': 'Doc real excluído' }, detail: { en: 'pushed to rank 6 before generation', 'pt-br': 'empurrado ao 6.º lugar antes da geração' }, pigment: 'muted' },
            { label: { en: 'Model misled', 'pt-br': 'Modelo convencido' }, detail: { en: 'outputs attacker’s forged number', 'pt-br': 'emite a conta escolhida pelo atacante' }, pigment: 'danger' },
            { label: { en: '90% black-box rate', 'pt-br': '90% caixa-preta' }, detail: { en: 'measured across million-passage corpora', 'pt-br': 'medido em bases com milhões de passagens' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 30.3 contrasts output-only scrubbing against pre-boundary redaction and
   * per-session pseudonymization across the five hops of a production RAG stack.
   */
  't30-pii-redaction-hops': {
    lesson: '30.3-pii-redaction-and-data-boundaries',
    title: {
      en: 'Output scrubbing vs. pre-boundary redaction',
      'pt-br': 'Limpeza na saída versus redação pré-fronteira',
    },
    caption: {
      en: 'A RAG request copies text across five storage and network hops. Scrubbing only the final answer leaves raw personal data and secrets in indexes, vendor APIs, and logs.',
      'pt-br': 'Uma requisição RAG copia texto por cinco saltos de rede e armazenamento. Limpar apenas a resposta final deixa dados pessoais e segredos em índices, APIs externas e logs.',
    },
    steps: [
      {
        label: { en: 'Output-only scrubbing', 'pt-br': 'Limpeza só na saída' },
        caption: {
          en: 'Waiting until the model replies hides sensitive text on the user’s screen, but raw credentials and personal identifiers have already crossed four earlier hops.',
          'pt-br': 'Esperar a resposta do modelo esconde o texto sensível na tela do usuário, mas credenciais e dados pessoais brutos já cruzaram quatro saltos anteriores.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Ingestion & chunking', 'pt-br': 'Ingestão e fatiamento' }, detail: { en: 'raw PII and API keys enter pipeline', 'pt-br': 'PII bruto e chaves de API entram no fluxo' }, pigment: 'danger' },
            { label: { en: 'Embedding & vector store', 'pt-br': 'Embedding e banco vetorial' }, detail: { en: 'raw text sent out and stored in index', 'pt-br': 'texto bruto enviado e salvo no índice' }, pigment: 'danger' },
            { label: { en: 'Inference API & cache', 'pt-br': 'API de inferência e cache' }, detail: { en: 'unredacted prompt crosses to vendor', 'pt-br': 'prompt sem redação cruza para fornecedor' }, pigment: 'danger' },
            { label: { en: 'Traces & eval logs', 'pt-br': 'Traces e logs de eval' }, detail: { en: 'production PII copied to dashboards', 'pt-br': 'PII de produção copiado para painéis' }, pigment: 'danger' },
            { label: { en: 'Output scrubber', 'pt-br': 'Filtro de saída' }, detail: { en: 'masks screen after leak occurred', 'pt-br': 'mascara a tela após o vazamento' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Pre-boundary gateway', 'pt-br': 'Gateway pré-fronteira' },
        caption: {
          en: 'Running deterministic rules and NER before indexing or inference strips secrets permanently and swaps recurring names for short-lived session placeholders.',
          'pt-br': 'Rodar regras determinísticas e NER antes da indexação ou inferência remove segredos de vez e troca nomes recorrentes por marcadores temporários de sessão.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Two-stage detector', 'pt-br': 'Detector em duas etapas' }, detail: { en: 'regex/checksum (< 1 ms) + NER (10–30 ms)', 'pt-br': 'regex e dígito verificador (< 1 ms) + NER (10–30 ms)' }, pigment: 'accent' },
            { label: { en: 'Mask or session vault', 'pt-br': 'Máscara ou cofre efêmero' }, detail: { en: 'secrets erased; PII -> <PERSON_1>', 'pt-br': 'segredos apagados; PII -> <PERSON_1>' }, pigment: 'caution' },
            { label: { en: 'Index & ZDR vendor', 'pt-br': 'Índice e provedor ZDR' }, detail: { en: 'only sanitized text crosses boundary', 'pt-br': 'só texto higienizado cruza a fronteira' }, pigment: 'success' },
            { label: { en: 'Redacted telemetry', 'pt-br': 'Telemetria higienizada' }, detail: { en: 'traces and evals keep zero raw secrets', 'pt-br': 'traces e evals sem segredos brutos' }, pigment: 'success' },
            { label: { en: 'Authorized restore', 'pt-br': 'Reversão autorizada' }, detail: { en: 'vault re-attaches names only on return', 'pt-br': 'cofre reconecta nomes só no retorno' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 30.4 works the base-rate trap on 100,000 daily requests (0.2% attacks, 95%
   * recall). Comparing 3% FPR against a 0.5% FPR budget makes the refusal split
   * immediate.
   */
  't30-base-rate-refusals': {
    lesson: '30.4-jailbreaks-guardrails-and-latency-budgets',
    title: {
      en: 'Who gets blocked when attacks are rare',
      'pt-br': 'Quem é bloqueado quando ataques são raros',
    },
    caption: {
      en: 'Out of 100,000 daily requests, 200 (0.2%) are real attacks and 99,800 are benign. With 95% attack recall (190 caught, 10 missed), the false-positive rate sets how many innocent users get refused.',
      'pt-br': 'Em 100.000 requisições diárias, 200 (0,2%) são ataques reais e 99.800 são benignas. Com 95% de recall em ataques (190 barrados, 10 passaram), a taxa de falsos positivos define quantos inocentes são recusados.',
    },
    steps: [
      {
        label: { en: '3% false-positive rate', 'pt-br': '3% de falsos positivos' },
        caption: {
          en: '3,184 requests blocked per day: 2,994 innocent users against 190 real attacks. Precision is 190 / 3,184 = 5.97%, so roughly 94 in 100 refusals hit legitimate traffic.',
          'pt-br': '3.184 pedidos bloqueados por dia: 2.994 usuários inocentes contra 190 ataques reais. A precisão é 190 / 3.184 = 5,97%, então quase 94 em cada 100 recusas atingem tráfego legítimo.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Benign users wrongly blocked', 'pt-br': 'Usuários legítimos bloqueados' }, detail: { en: '2,994 of 99,800 benign requests (3%)', 'pt-br': '2.994 de 99.800 pedidos benignos (3%)' }, pigment: 'danger', weight: 2994 },
            { label: { en: 'Real attacks blocked', 'pt-br': 'Ataques reais bloqueados' }, detail: { en: '190 of 200 attacks (95% recall)', 'pt-br': '190 de 200 ataques (95% de recall)' }, pigment: 'success', weight: 190 },
          ],
        },
      },
      {
        label: { en: '0.5% false-positive budget', 'pt-br': 'Orçamento de 0,5%' },
        caption: {
          en: 'Tightening the false-positive rate to 0.5% cuts innocent refusals sixfold, from 2,994 to 499, raising alert precision from 5.97% to 27.6% while catching the same 190 attacks.',
          'pt-br': 'Reduzir a taxa de falsos positivos para 0,5% corta recusas indevidas seis vezes, de 2.994 para 499, elevando a precisão de 5,97% para 27,6% com os mesmos 190 ataques barrados.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Benign users wrongly blocked', 'pt-br': 'Usuários legítimos bloqueados' }, detail: { en: '499 of 99,800 benign requests (0.5%)', 'pt-br': '499 de 99.800 pedidos benignos (0,5%)' }, pigment: 'caution', weight: 499 },
            { label: { en: 'Real attacks blocked', 'pt-br': 'Ataques reais bloqueados' }, detail: { en: '190 of 200 attacks (95% recall)', 'pt-br': '190 de 200 ataques (95% de recall)' }, pigment: 'success', weight: 190 },
          ],
        },
      },
    ],
  },

  /**
   * 30.4 stages guardrails across three tiers, parallelizes Tier 1 with
   * retrieval, and guards streaming output with a buffered sliding window.
   */
  't30-guardrail-pipeline': {
    lesson: '30.4-jailbreaks-guardrails-and-latency-budgets',
    title: {
      en: 'Scheduling guardrails inside a latency budget',
      'pt-br': 'Agendando guardrails dentro do orçamento de latência',
    },
    caption: {
      en: 'Overlapping the small input classifier with retrieval hides 45 ms of delay without weakening the gate; a short sliding buffer screens streaming output while heavy judges audit offline.',
      'pt-br': 'Sobrepor o classificador leve de entrada à recuperação esconde 45 ms de espera sem enfraquecer o portão; um buffer deslizante vigia a saída em streaming enquanto juízes pesados auditam fora do caminho crítico.',
    },
    steps: [
      {
        label: { en: 'Serial input gate', 'pt-br': 'Portão em série' },
        caption: {
          en: 'Running Tier 1 screening before retrieval stacks both waits: 45 ms plus 85 ms delays model prefill by 130 ms.',
          'pt-br': 'Rodar a triagem da Camada 1 antes da recuperação soma as duas esperas: 45 ms mais 85 ms atrasam o prefill do modelo em 130 ms.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Tier 0 rules', 'pt-br': 'Camada 0: regras' }, detail: { en: '< 2 ms: caps, Unicode, secrets', 'pt-br': '< 2 ms: limites, Unicode, segredos' }, pigment: 'accent' },
            { label: { en: 'Tier 1 classifier', 'pt-br': 'Camada 1: classificador' }, detail: { en: '45 ms: blocks retrieval start', 'pt-br': '45 ms: trava início da busca' }, pigment: 'caution' },
            { label: { en: 'RAG retrieval', 'pt-br': 'Recuperação RAG' }, detail: { en: '85 ms: waits for Tier 1', 'pt-br': '85 ms: espera a Camada 1' }, pigment: 'accent' },
            { label: { en: 'LLM prefill', 'pt-br': 'Prefill do LLM' }, detail: { en: 'begins late at 130 ms', 'pt-br': 'inicia atrasado aos 130 ms' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Parallel speculative gate', 'pt-br': 'Portão paralelo especulativo' },
        caption: {
          en: 'Starting Tier 1 and retrieval together caps the wait at max(85, 45) = 85 ms. On a flag, retrieved chunks are dropped and a safe refusal returns before calling the LLM.',
          'pt-br': 'Disparar Camada 1 e busca juntos limita a espera a max(85, 45) = 85 ms. Havendo alerta, os trechos são descartados e uma recusa segura volta antes de chamar o LLM.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Tier 0 rules', 'pt-br': 'Camada 0: regras' }, detail: { en: '< 2 ms: deterministic screen', 'pt-br': '< 2 ms: triagem determinística' }, pigment: 'accent' },
            { label: { en: 'Tier 1 + Retrieval', 'pt-br': 'Camada 1 + Busca' }, detail: { en: '45 ms hidden inside 85 ms search', 'pt-br': '45 ms ocultos nos 85 ms da busca' }, pigment: 'success' },
            { label: { en: 'Gate decision', 'pt-br': 'Decisão do portão' }, detail: { en: 'drop chunks on flag, else pass', 'pt-br': 'descarta trechos se falhar; senão segue' }, pigment: 'caution' },
            { label: { en: 'LLM prefill', 'pt-br': 'Prefill do LLM' }, detail: { en: 'begins at 85 ms (45 ms saved)', 'pt-br': 'inicia em 85 ms (45 ms economizados)' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Streaming output + audit', 'pt-br': 'Saída em streaming + auditoria' },
        caption: {
          en: 'Holding a 20–40 token trailing buffer lets deterministic checks and overlapping 48-token Tier 1 windows abort unsafe replies mid-stream while Tier 2 audits out of band.',
          'pt-br': 'Reter um buffer de 20–40 tokens na ponta permite checagens determinísticas e janelas sobrepostas de 48 tokens na Camada 1 para cortar respostas inseguras, enquanto a Camada 2 audita em segundo plano.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Trailing buffer', 'pt-br': 'Buffer na ponta' }, detail: { en: 'holds 20–40 tokens before flush', 'pt-br': 'retém 20–40 tokens antes de exibir' }, pigment: 'accent' },
            { label: { en: 'Window check', 'pt-br': 'Checagem por janela' }, detail: { en: 'PII rules + Tier 1 every 48 tokens', 'pt-br': 'regras de PII + Camada 1 a cada 48 tokens' }, pigment: 'caution' },
            { label: { en: 'Flush or abort', 'pt-br': 'Exibir ou abortar' }, detail: { en: 'stream safe text; stop on breach', 'pt-br': 'libera texto seguro; corta se violar' }, pigment: 'success' },
            { label: { en: 'Tier 2 async audit', 'pt-br': 'Camada 2 assíncrona' }, detail: { en: '0 ms delay: heavy judge & human review', 'pt-br': '0 ms de espera: juiz pesado e revisão humana' }, pigment: 'muted' },
          ],
        },
      },
    ],
  },

  /**
   * 30.5 classifies legal obligations under Regulation (EU) 2024/1689 into four
   * escalating risk tiers based on intended use rather than parameter count.
   */
  't30-eu-ai-act-tiers': {
    lesson: '30.5-ai-governance-owasp-nist-and-eu-ai-act',
    title: {
      en: 'EU AI Act risk tiers by intended use',
      'pt-br': 'Camadas de risco do EU AI Act por uso pretendido',
    },
    caption: {
      en: 'Regulation (EU) 2024/1689 assigns obligations from minimal to prohibited based on how an AI system is deployed. High-risk duties begin 2 December 2027 (Annex III) and 2 August 2028 (Annex I).',
      'pt-br': 'O Regulamento (UE) 2024/1689 atribui obrigações do risco mínimo ao proibido conforme o uso em produção. Deveres de alto risco começam em 2 de dezembro de 2027 (Anexo III) e 2 de agosto de 2028 (Anexo I).',
    },
    body: {
      kind: 'stack',
      direction: 'up',
      steps: [
        {
          label: { en: 'Minimal risk', 'pt-br': 'Risco mínimo' },
          detail: {
            en: 'internal code search, spam filters, doc helpers; voluntary codes plus GDPR and security law',
            'pt-br': 'busca interna de código, filtros de spam, assistentes de docs; códigos voluntários mais GDPR/LGPD e segurança',
          },
          pigment: 'muted',
        },
        {
          label: { en: 'Limited risk (Article 50 transparency)', 'pt-br': 'Risco limitado (transparência, Artigo 50)' },
          detail: {
            en: 'interaction disclosure for chatbots plus machine-readable marking of synthetic text, audio, image, and video',
            'pt-br': 'aviso de interação em chatbots mais marcação legível por máquina em texto, áudio, imagem e vídeo sintéticos',
          },
          pigment: 'accent',
        },
        {
          label: { en: 'High risk (Annex III & Annex I)', 'pt-br': 'Alto risco (Anexo III e Anexo I)' },
          detail: {
            en: 'HR screening, credit, critical infrastructure, medical safety; risk system, Annex IV docs, automatic logs, human oversight, conformity check',
            'pt-br': 'triagem de RH, crédito, infraestrutura crítica, segurança médica; gestão de risco, docs do Anexo IV, logs automáticos, supervisão humana e conformidade',
          },
          pigment: 'caution',
        },
        {
          label: { en: 'Unacceptable risk (prohibited)', 'pt-br': 'Risco inaceitável (proibido)' },
          detail: {
            en: 'social scoring, untargeted face scraping, workplace or school emotion recognition, manipulative exploitation',
            'pt-br': 'pontuação social, raspagem facial indiscriminada, reconhecimento de emoções no trabalho ou escola, exploração manipulativa',
          },
          pigment: 'danger',
        },
      ],
    },
  },
} as const satisfies Record<string, Figure>
