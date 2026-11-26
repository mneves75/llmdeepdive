/**
 * Figures for track 26 — LLM APIs & Prompt Engineering.
 */
import type { Figure } from './types'

/** 26.2: elapsed time (s) vs tokens visible to the user (300 ms TTFT, 50 tokens/s, 400 tokens). */
const streamingAxes = {
  xAxis: {
    label: { en: 'Elapsed time', 'pt-br': 'Tempo decorrido' },
    scale: 'linear',
    min: 0,
    max: 9,
    unit: 's',
  },
  yAxis: {
    label: { en: 'Tokens shown to user', 'pt-br': 'Tokens exibidos ao usuário' },
    scale: 'linear',
    min: 0,
    max: 400,
  },
} as const

const blockingSeries = {
  label: { en: 'Without streaming', 'pt-br': 'Sem streaming' },
  points: [[0, 0], [2.3, 0], [4.3, 0], [6.3, 0], [8.2, 0], [8.3, 400]],
} as const

const streamingSeries = {
  label: { en: 'SSE streaming', 'pt-br': 'Streaming SSE' },
  points: [[0, 0], [0.3, 0], [2.3, 100], [4.3, 200], [6.3, 300], [8.3, 400]],
} as const

export const TRACK_26_FIGURES = {
  '26-1-stateless-request-cycle': {
    lesson: '26.1-stateless-apis-and-conversation-state',
    title: {
      en: 'A multi-turn chat resends the entire prefix every time',
      'pt-br': 'Um chat multi-turno reenvia todo o prefixo a cada chamada',
    },
    caption: {
      en: 'Stateless completion APIs keep no memory between HTTP requests. The client stores the message log, sends system plus prior turns plus the new prompt, and pays input tokens for the full prefix unless prefix caching hits.',
      'pt-br': 'APIs stateless não guardam memória entre requisições HTTP. O cliente armazena o histórico, envia system mais turnos anteriores mais o novo prompt e paga tokens de entrada pelo prefixo inteiro salvo acerto no cache de prefixo.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Client state store', 'pt-br': 'Estado no cliente' }, detail: { en: 'system + turns 1..t', 'pt-br': 'system + turnos 1..t' }, pigment: 'muted' },
        { label: { en: 'HTTP POST full message array', 'pt-br': 'HTTP POST com lista completa' }, detail: { en: 'stateless boundary', 'pt-br': 'fronteira stateless' }, pigment: 'accent' },
        { label: { en: 'Prefix cache lookup + prefill', 'pt-br': 'Busca no cache de prefixo + prefill' }, detail: { en: 'cached_tokens vs fresh suffix', 'pt-br': 'cached_tokens vs sufixo novo' }, pigment: 'caution' },
        { label: { en: 'Assistant delta appended', 'pt-br': 'Resposta anexada ao histórico' }, detail: { en: 'turn t+1 persisted by app', 'pt-br': 'turno t+1 salvo pela aplicação' }, pigment: 'success' },
      ],
    },
  },

  /**
   * 26.2 compares non-streaming, SSE streaming, and early cancellation on the
   * same 300 ms TTFT, 50 tokens/s, 400-token request. Replaces the two-bullet
   * wait-time walkthrough in prose.
   */
  '26-2-streaming-vs-blocking': {
    lesson: '26.2-streaming-sse-and-cancellation',
    title: {
      en: 'Visible tokens over time: blocking, streaming, and early stop',
      'pt-br': 'Tokens visíveis no tempo: bloqueante, streaming e parada antecipada',
    },
    caption: {
      en: 'Same 300 ms prefill and 50 tokens/s decode for a 400-token answer. Streaming reveals the first token at 0.3 s instead of 8.3 s without speeding up the GPU, and cancelling early stops future decode work while prefill and already-emitted tokens stay billed.',
      'pt-br': 'O mesmo prefill de 300 ms e decode a 50 tokens/s para uma resposta de 400 tokens. O streaming revela o primeiro token em 0,3 s em vez de 8,3 s sem acelerar a GPU, e cancelar cedo interrompe o decode restante enquanto o prefill e os tokens já emitidos seguem cobrados.',
    },
    steps: [
      {
        label: { en: 'Without streaming', 'pt-br': 'Sem streaming' },
        caption: {
          en: 'The server holds all 400 tokens until decode finishes. The screen stays blank for 8.3 s, then receives the whole answer in one jump.',
          'pt-br': 'O servidor retém todos os 400 tokens até o fim do decode. A tela fica vazia por 8,3 s e recebe a resposta inteira de uma vez.',
        },
        body: {
          kind: 'plot',
          ...streamingAxes,
          series: [
            {
              ...blockingSeries,
              pigment: 'danger',
              marks: [{ at: [8.3, 400], label: { en: 'All 400 at 8.3 s', 'pt-br': 'Todos os 400 em 8,3 s' } }],
            },
          ],
        },
      },
      {
        label: { en: 'With SSE streaming', 'pt-br': 'Com streaming SSE' },
        caption: {
          en: 'Prefill finishes at 0.3 s (TTFT) and each next token arrives every 20 ms (ITL). Reading starts 8 seconds sooner even though total completion stays 8.3 s.',
          'pt-br': 'O prefill termina em 0,3 s (TTFT) e cada token seguinte chega a cada 20 ms (ITL). A leitura começa 8 segundos antes, embora a conclusão total continue em 8,3 s.',
        },
        body: {
          kind: 'plot',
          ...streamingAxes,
          series: [
            { ...blockingSeries, pigment: 'muted' },
            {
              ...streamingSeries,
              pigment: 'accent',
              marks: [{ at: [4.3, 200], label: { en: '50 tokens/s after 0.3 s TTFT', 'pt-br': '50 tokens/s após 0,3 s de TTFT' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Stopped at 100 tokens', 'pt-br': 'Parado aos 100 tokens' },
        caption: {
          en: 'Aborting the stream at 2.3 s frees the GPU and avoids generating the remaining 300 tokens (6.0 s saved). The 0.3 s prefill and the 100 emitted tokens are still billed.',
          'pt-br': 'Abortar o stream em 2,3 s libera a GPU e evita gerar os 300 tokens restantes (6,0 s economizados). O prefill de 0,3 s e os 100 tokens emitidos continuam cobrados.',
        },
        body: {
          kind: 'plot',
          ...streamingAxes,
          series: [
            { ...streamingSeries, pigment: 'muted' },
            {
              label: { en: 'Aborted at token 100', 'pt-br': 'Abortado no token 100' },
              pigment: 'success',
              points: [[0, 0], [0.3, 0], [2.3, 100]],
              marks: [{ at: [2.3, 100], label: { en: 'Abort at 2.3 s (100 billed)', 'pt-br': 'Aborto em 2,3 s (100 cobrados)' } }],
            },
          ],
        },
      },
    ],
  },

  '26-3-constrained-decoding-loop': {
    lesson: '26.3-structured-outputs-and-constrained-decoding',
    title: {
      en: 'Constrained decoding masks invalid tokens before sampling',
      'pt-br': 'A decodificação restrita mascara tokens inválidos antes da amostragem',
    },
    caption: {
      en: 'A compiled JSON Schema finite-state machine sets illegal token logits to negative infinity at every decode step, guaranteeing syntactic validity while application validators still check semantic invariants.',
      'pt-br': 'Uma máquina de estados compilada do JSON Schema zera a probabilidade de tokens ilegais em cada passo de decode, garantindo sintaxe válida enquanto validadores da aplicação ainda checam regras semânticas.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'JSON Schema compiled to FSM', 'pt-br': 'JSON Schema compilado em FSM' }, detail: { en: 'allowed token set per state', 'pt-br': 'tokens permitidos por estado' }, pigment: 'accent' },
        { label: { en: 'Logit mask applied', 'pt-br': 'Máscara aplicada aos logits' }, detail: { en: 'illegal tokens → -∞', 'pt-br': 'tokens ilegais → -∞' }, pigment: 'caution' },
        { label: { en: 'Token sampled & state advances', 'pt-br': 'Token amostrado e estado avança' }, detail: { en: '100% schema-valid syntax', 'pt-br': 'sintaxe 100% válida no schema' }, pigment: 'accent' },
        { label: { en: 'Semantic domain check', 'pt-br': 'Validação semântica de domínio' }, detail: { en: 'accept / repair / reject', 'pt-br': 'aceitar / reparar / rejeitar' }, pigment: 'success' },
      ],
    },
  },

  /**
   * 26.4 contrasts an unbounded 50-worker burst against a client-side pacer
   * sized by Little's Law (~2 workers for 500 RPM, 100,000 TPM, 2,000 tokens,
   * 2.0 s latency). Replaces the burst narrative and the step-by-step bucket
   * reconciliation walk-through in prose.
   */
  '26-4-dual-quota-pacer': {
    lesson: '26.4-async-concurrency-rate-limits-and-batching',
    title: {
      en: 'Unpaced burst versus client-side dual-quota pacing',
      'pt-br': 'Rajada sem controle versus cadência dupla no cliente',
    },
    caption: {
      en: 'For a 500 RPM, 100,000 TPM quota with 2,000-token, 2.0 s calls, Little’s Law sets steady-state concurrency near 2 workers. Pacing requests before they leave your process prevents HTTP 429 retry storms.',
      'pt-br': 'Numa cota de 500 RPM e 100.000 TPM com chamadas de 2.000 tokens e 2,0 s, a Lei de Little fixa a concorrência perto de 2 workers. Cadenciar antes do envio evita tempestades de erros HTTP 429.',
    },
    steps: [
      {
        label: { en: 'Unpaced burst (50 workers)', 'pt-br': 'Rajada sem freio (50 workers)' },
        caption: {
          en: 'Launching 50 parallel calls sends 100,000 tokens in the first second, emptying the full minute budget immediately and forcing 58 seconds of HTTP 429 retries.',
          'pt-br': 'Disparar 50 chamadas paralelas envia 100.000 tokens no primeiro segundo, esvazia o orçamento do minuto de imediato e força 58 segundos de novas tentativas após HTTP 429.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '50 parallel calls', 'pt-br': '50 chamadas paralelas' }, detail: { en: 'unbounded async loop', 'pt-br': 'laço assíncrono sem limite' }, pigment: 'muted' },
            { label: { en: '100,000 tokens in 1 s', 'pt-br': '100.000 tokens em 1 s' }, detail: { en: 'minute TPM bucket empties at once', 'pt-br': 'balde de TPM do minuto zera na hora' }, pigment: 'danger' },
            { label: { en: 'HTTP 429 wall', 'pt-br': 'Barreira de HTTP 429' }, detail: { en: 'wasted sockets and p99 spikes', 'pt-br': 'conexões perdidas e pico de p99' }, pigment: 'danger' },
            { label: { en: '58 s of retries', 'pt-br': '58 s de novas tentativas' }, detail: { en: 'workers collide at minute reset', 'pt-br': 'workers colidem na virada do minuto' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Paced client (~2 workers)', 'pt-br': 'Cliente cadenciado (~2 workers)' },
        caption: {
          en: 'A semaphore bounds open sockets while local RPM and TPM buckets reserve estimated input plus max_tokens before dispatch, then credit back unused output tokens when real usage returns.',
          'pt-br': 'Um semáforo limita conexões abertas enquanto baldes locais de RPM e TPM reservam entrada estimada mais max_tokens antes do envio e estornam tokens não usados quando o uso real retorna.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Semaphore gate', 'pt-br': 'Portão de semáforo' }, detail: { en: 'caps simultaneous open sockets', 'pt-br': 'limita sockets abertos simultâneos' }, pigment: 'accent' },
            { label: { en: 'RPM & TPM buckets', 'pt-br': 'Baldes de RPM e TPM' }, detail: { en: 'reserve input + max_tokens first', 'pt-br': 'reservam entrada + max_tokens antes' }, pigment: 'accent' },
            { label: { en: 'API call + headers', 'pt-br': 'Chamada à API + cabeçalhos' }, detail: { en: 'read remaining tokens and Retry-After', 'pt-br': 'lê saldo restante e Retry-After' }, pigment: 'caution' },
            { label: { en: 'Reconcile usage', 'pt-br': 'Reconciliar uso real' }, detail: { en: 'refund unused output to TPM bucket', 'pt-br': 'devolve saída não usada ao balde TPM' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 26.5 shows the 4,000-token static prefix + 500-token dynamic suffix worked
   * example as a top-down stack: putting a live timestamp on line 1 invalidates
   * all 4,500 tokens (USD 13.50 / 1,000 calls); moving it to the bottom caches
   * 89% of input tokens at a 90% discount (USD 2.70 / 1,000 calls). Replaces
   * the two prose comparison bullets in Section 3.
   */
  '26-5-prompt-prefix-stack': {
    lesson: '26.5-prompt-engineering-hierarchy-and-caching',
    title: {
      en: 'Prompt layout: one volatile byte at the top breaks the whole prefix cache',
      'pt-br': 'Layout do prompt: um byte volátil no topo invalida todo o cache de prefixo',
    },
    caption: {
      en: 'Worked example: 4,000-token static prefix plus 500-token dynamic suffix at USD 3.00/M uncached and USD 0.30/M cached reads. Bar widths show each band’s share of the 4,500 input tokens.',
      'pt-br': 'Exemplo resolvido: prefixo estático de 4.000 tokens mais sufixo dinâmico de 500 tokens a USD 3,00/M sem cache e USD 0,30/M em cache. A largura das barras mostra a fatia de cada bloco nos 4.500 tokens de entrada.',
    },
    steps: [
      {
        label: { en: 'Timestamp on line 1 (0% cached)', 'pt-br': 'Horário na linha 1 (0% em cache)' },
        caption: {
          en: 'Putting a live clock timestamp on line 1 changes token 1 on every call. Because causal attention depends on every earlier token, all 4,500 tokens recompute at full price: USD 0.0135/call (USD 13.50 per 1,000 calls).',
          'pt-br': 'Colocar um relógio ao vivo na linha 1 muda o token 1 a cada chamada. Como a atenção causal depende de todos os tokens anteriores, os 4.500 tokens são recalculados a preço cheio: USD 0,0135/chamada (USD 13,50 por 1.000 chamadas).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Line 1 timestamp + static prefix (4,000 tokens)', 'pt-br': 'Horário na linha 1 + prefixo estático (4.000 tokens)' },
              detail: { en: 'System policy, tool schemas, examples — invalidated by token 1 (USD 3.00/M)', 'pt-br': 'Política de sistema, schemas de ferramentas, exemplos — invalidados no token 1 (USD 3,00/M)' },
              pigment: 'danger',
              weight: 4000,
            },
            {
              label: { en: 'Dynamic user turn (500 tokens)', 'pt-br': 'Turno dinâmico do usuário (500 tokens)' },
              detail: { en: 'Current question and retrieved chunks — computed fresh (USD 3.00/M)', 'pt-br': 'Pergunta atual e trechos recuperados — calculados do zero (USD 3,00/M)' },
              pigment: 'danger',
              weight: 500,
            },
          ],
        },
      },
      {
        label: { en: 'Stable top, volatile bottom (89% cached)', 'pt-br': 'Estável no topo, volátil na base (89% em cache)' },
        caption: {
          en: 'Moving the timestamp into the user turn leaves the first 4,000 tokens byte-identical across calls. Only the 500-token suffix recomputes: USD 0.0027/call (USD 2.70 per 1,000 calls — an 80% cost drop).',
          'pt-br': 'Mover o horário para o turno do usuário mantém os primeiros 4.000 tokens idênticos byte a byte. Só o sufixo de 500 tokens é recalculado: USD 0,0027/chamada (USD 2,70 por 1.000 chamadas — queda de 80% no custo).',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Static prefix (4,000 tokens)', 'pt-br': 'Prefixo estático (4.000 tokens)' },
              detail: { en: 'System policy → sorted tool schemas → fixed examples — KV cache hit (USD 0.30/M)', 'pt-br': 'Política de sistema → schemas ordenados → exemplos fixos — acerto no KV cache (USD 0,30/M)' },
              pigment: 'success',
              weight: 4000,
            },
            {
              label: { en: 'Volatile suffix (500 tokens)', 'pt-br': 'Sufixo volátil (500 tokens)' },
              detail: { en: 'User question, retrieved chunks, live timestamp — computed fresh (USD 3.00/M)', 'pt-br': 'Pergunta do usuário, trechos recuperados, horário ao vivo — calculados do zero (USD 3,00/M)' },
              pigment: 'caution',
              weight: 500,
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
