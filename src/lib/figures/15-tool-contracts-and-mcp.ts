/**
 * Figures for track 15 — Tool Contracts & MCP.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The figures mirror `examples/agent-engineering/src/agentlab/tools/`:
 * `contracts.py` (15.1), `jsonrpc.py` and `server.py` (15.2), `client.py` and
 * `server.py` (15.3), `queries.py` and `tests_postgres/test_tools_postgres.py`
 * (15.4), and `remote_auth.py` (15.5).
 */
import type { Figure } from './types'

export const TRACK_15_FIGURES = {
  /**
   * 15.1 separates JSON parsing, strict schema validation (shape) and tenant
   * authorization (permission). Stepping through three concrete calls from the
   * lesson shows which gate stops each failure and why a well-formed request
   * still needs a separate permission check.
   */
  't15-shape-then-permission': {
    lesson: '15.1-from-model-output-to-a-tool-request',
    title: { en: 'Three calls, three different gates', 'pt-br': 'Três chamadas, três barreiras diferentes' },
    caption: {
      en: 'Parsing checks JSON syntax, the strict Pydantic model checks argument shape, and authorize_record checks tenant ownership against the trusted Principal.',
      'pt-br': 'O parsing confere a sintaxe JSON, o modelo Pydantic estrito confere a forma dos argumentos e authorize_record confere a posse do tenant contra o Principal confiável.',
    },
    steps: [
      {
        label: { en: 'Extra field rejected', 'pt-br': 'Campo extra rejeitado' },
        caption: {
          en: 'The model adds "tenant_id": "tenant-b" to a PO-1001 lookup. JSON parses, but extra="forbid" rejects the unknown field before any lookup or permission check runs.',
          'pt-br': 'O modelo acrescenta "tenant_id": "tenant-b" numa consulta ao PO-1001. O JSON faz parsing, mas extra="forbid" rejeita o campo desconhecido antes de qualquer busca ou checagem de permissão.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Model text', 'pt-br': 'Texto do modelo' }, detail: { en: 'po_id PO-1001 + tenant_id', 'pt-br': 'po_id PO-1001 + tenant_id' }, pigment: 'muted' },
            { label: { en: 'JSON parse', 'pt-br': 'Parsing do JSON' }, detail: { en: 'valid object', 'pt-br': 'objeto válido' }, pigment: 'accent' },
            { label: { en: 'Strict schema', 'pt-br': 'Schema estrito' }, detail: { en: 'rejected: extra input tenant_id', 'pt-br': 'rejeitado: campo extra tenant_id' }, pigment: 'danger' },
            { label: { en: 'Tenant check', 'pt-br': 'Checagem de tenant' }, detail: { en: 'never reached', 'pt-br': 'nem chega a rodar' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Valid shape, wrong tenant', 'pt-br': 'Forma válida, tenant errado' },
        caption: {
          en: 'A tenant-a run asks for PO-2001, which belongs to tenant-b. The order number matches ^PO-[0-9]{4}$, so shape validation passes; authorize_record refuses it with "not found", the same message as a missing order.',
          'pt-br': 'Uma execução do tenant-a pede o PO-2001, que pertence ao tenant-b. O número casa com ^PO-[0-9]{4}$, então a forma passa; authorize_record recusa com "not found", a mesma resposta de um pedido inexistente.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Model text', 'pt-br': 'Texto do modelo' }, detail: { en: 'lookup PO-2001 (caller: tenant-a)', 'pt-br': 'consultar PO-2001 (chamador: tenant-a)' }, pigment: 'muted' },
            { label: { en: 'JSON parse', 'pt-br': 'Parsing do JSON' }, detail: { en: 'valid object', 'pt-br': 'objeto válido' }, pigment: 'accent' },
            { label: { en: 'Strict schema', 'pt-br': 'Schema estrito' }, detail: { en: 'passes: matches ^PO-[0-9]{4}$', 'pt-br': 'passa: casa com ^PO-[0-9]{4}$' }, pigment: 'caution' },
            { label: { en: 'Tenant check', 'pt-br': 'Checagem de tenant' }, detail: { en: 'refused: PO-2001 not found', 'pt-br': 'recusado: PO-2001 não encontrado' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Valid and owned', 'pt-br': 'Válido e do mesmo tenant' },
        caption: {
          en: 'A tenant-a run asks for PO-1001, owned by tenant-a. Both shape validation and authorize_record pass, and the tool returns the purchase order.',
          'pt-br': 'Uma execução do tenant-a pede o PO-1001, que é do tenant-a. Tanto a validação de forma quanto authorize_record passam, e a ferramenta devolve o pedido.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Model text', 'pt-br': 'Texto do modelo' }, detail: { en: 'lookup PO-1001 (caller: tenant-a)', 'pt-br': 'consultar PO-1001 (chamador: tenant-a)' }, pigment: 'muted' },
            { label: { en: 'JSON parse', 'pt-br': 'Parsing do JSON' }, detail: { en: 'valid object', 'pt-br': 'objeto válido' }, pigment: 'accent' },
            { label: { en: 'Strict schema', 'pt-br': 'Schema estrito' }, detail: { en: 'passes: valid LookupPurchaseOrder', 'pt-br': 'passa: LookupPurchaseOrder válido' }, pigment: 'accent' },
            { label: { en: 'Tenant check', 'pt-br': 'Checagem de tenant' }, detail: { en: 'allowed: returns PO-1001', 'pt-br': 'permitido: devolve PO-1001' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 15.2 walks through the stateless MCP 2026-07-28 lifecycle over stdio:
   * start and optional discovery, per-request _meta checks with id matching
   * (and silent notifications), and orderly shutdown or crash restart.
   */
  't15-stateless-mcp-lifecycle': {
    lesson: '15.2-json-rpc-and-protocol-lifecycle',
    title: { en: 'A stateless MCP lifecycle over stdio', 'pt-br': 'Um ciclo de vida MCP sem estado via stdio' },
    caption: {
      en: 'In MCP revision 2026-07-28 there is no initialize handshake. Every request declares its own version and capabilities in params._meta, responses match by id, and no session state is negotiated (though open subscriptions end on disconnect and must be recreated).',
      'pt-br': 'Na revisão 2026-07-28 do MCP não há handshake initialize. Cada requisição declara a própria versão e as capacidades em params._meta, as respostas casam pelo id e não há sessão negociada (embora assinaturas abertas terminem ao desconectar e precisem ser recriadas).',
    },
    steps: [
      {
        label: { en: 'Launch and discover', 'pt-br': 'Lançar e descobrir' },
        caption: {
          en: 'The client starts the server as a child process and may call server/discover to learn supported versions and capabilities. No session state is created.',
          'pt-br': 'O cliente inicia o servidor como processo filho e pode chamar server/discover para saber versões e capacidades suportadas. Nenhum estado de sessão é criado.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Launch process', 'pt-br': 'Iniciar processo' }, detail: { en: 'client opens stdin and stdout pipes', 'pt-br': 'cliente abre pipes de entrada e saída' }, pigment: 'muted' },
            { label: { en: 'Discover (server/discover)', 'pt-br': 'Descoberta (server/discover)' }, detail: { en: 'id 1 + _meta version 2026-07-28', 'pt-br': 'id 1 + versão 2026-07-28 em _meta' }, pigment: 'accent' },
            { label: { en: 'Server checks _meta', 'pt-br': 'Servidor confere _meta' }, detail: { en: 'version and capabilities checked per call', 'pt-br': 'versão e capacidades conferidas por chamada' }, pigment: 'caution' },
            { label: { en: 'Capabilities reply', 'pt-br': 'Resposta de capacidades' }, detail: { en: 'id 1: tools listChanged, no session saved', 'pt-br': 'id 1: tools listChanged, sem sessão salva' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Requests and notifications', 'pt-br': 'Requisições e notificações' },
        caption: {
          en: 'Multiple messages share the same pipe. Requests carry a unique id and get one reply; notifications carry no id and get no reply at all; PendingCalls matches each answer by id, never by order.',
          'pt-br': 'Várias mensagens dividem o mesmo pipe. Requisições levam um id único e recebem uma resposta; notificações não têm id e nunca recebem resposta; PendingCalls casa cada retorno pelo id, nunca pela ordem.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Request id 2', 'pt-br': 'Requisição id 2' }, detail: { en: 'unknown version → error -32022', 'pt-br': 'versão desconhecida → erro -32022' }, pigment: 'danger' },
            { label: { en: 'Notification', 'pt-br': 'Notificação' }, detail: { en: 'cancelled (no id) → zero lines back', 'pt-br': 'cancelamento (sem id) → zero linhas de volta' }, pigment: 'muted' },
            { label: { en: 'Request id 3', 'pt-br': 'Requisição id 3' }, detail: { en: 'tools/call PO-1001 → result id 3', 'pt-br': 'tools/call PO-1001 → resultado id 3' }, pigment: 'accent' },
            { label: { en: 'PendingCalls.settle', 'pt-br': 'PendingCalls.settle' }, detail: { en: 'matches by id once; rejects duplicates', 'pt-br': 'casa pelo id uma vez; rejeita duplicatas' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Shutdown or restart', 'pt-br': 'Encerrar ou reiniciar' },
        caption: {
          en: 'To stop, the client closes the server’s standard input, waits, and escalates to SIGTERM and SIGKILL only if needed. If the server crashes, restarting loses only the requests still in flight.',
          'pt-br': 'Para parar, o cliente fecha a entrada padrão do servidor, espera e só escala para SIGTERM e SIGKILL se preciso. Se o servidor cair, reiniciar perde apenas as requisições em andamento.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Close stdin', 'pt-br': 'Fechar stdin' }, detail: { en: 'clean exit signal to the server', 'pt-br': 'sinal de saída limpa ao servidor' }, pigment: 'accent' },
            { label: { en: 'Wait for exit', 'pt-br': 'Esperar saída' }, detail: { en: 'server exits on end of input', 'pt-br': 'servidor sai no fim da entrada' }, pigment: 'accent' },
            { label: { en: 'Escalate: SIGTERM → SIGKILL', 'pt-br': 'Escalar: SIGTERM → SIGKILL' }, detail: { en: 'escalation if the server hangs', 'pt-br': 'escalada se o servidor travar' }, pigment: 'caution' },
            { label: { en: 'Safe restart', 'pt-br': 'Reinício seguro' }, detail: { en: 'no session state lost on crash', 'pt-br': 'nenhum estado de sessão perdido na queda' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 15.3 separates what a server offers (discovered page by page) from what a
   * person approved (pinned by SHA-256 fingerprint). Stepping through a normal
   * approval and a noon runtime change shows why new or reworded tools are
   * blocked locally before any request reaches the server.
   */
  't15-catalog-approval-flow': {
    lesson: '15.3-tools-resources-prompts-and-discovery',
    title: { en: 'What the server offers vs. what the model may call', 'pt-br': 'O que o servidor oferece vs. o que o modelo pode chamar' },
    caption: {
      en: 'ToolCatalog keeps offered definitions separate from user approvals, pinned by a SHA-256 hash of the whole definition. Once refreshed, a new tool or a rewritten description cannot run until a person approves it.',
      'pt-br': 'ToolCatalog mantém as definições oferecidas separadas das aprovações do usuário, presas a um hash SHA-256 da definição inteira. Após atualizar o catálogo, uma ferramenta nova ou reescrita não roda até uma pessoa aprová-la.',
    },
    steps: [
      {
        label: { en: 'Paged discovery', 'pt-br': 'Descoberta paginada' },
        caption: {
          en: 'The client pages through tools/list (two tools per page here) until nextCursor is absent, capping the loop at max_pages = 20. Listing populates offered, not approved.',
          'pt-br': 'O cliente percorre tools/list em páginas (duas ferramentas por página aqui) até nextCursor sumir, com teto de max_pages = 20. Listar preenche offered, não approved.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Server offers', 'pt-br': 'Servidor oferece' }, detail: { en: '3 tools across 2 pages', 'pt-br': '3 ferramentas em 2 páginas' }, pigment: 'accent' },
            { label: { en: 'ToolCatalog.offered', 'pt-br': 'ToolCatalog.offered' }, detail: { en: '3 definitions recorded', 'pt-br': '3 definições registradas' }, pigment: 'accent' },
            { label: { en: 'Approved hashes', 'pt-br': 'Hashes aprovados' }, detail: { en: 'none approved yet', 'pt-br': 'nenhum aprovado ainda' }, pigment: 'caution' },
            { label: { en: 'Model sees', 'pt-br': 'Modelo enxerga' }, detail: { en: '0 callable tools', 'pt-br': '0 ferramentas chamáveis' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'User approves', 'pt-br': 'Usuário aprova' },
        caption: {
          en: 'A person reviews each exact definition (name, description and inputSchema) and approves it. approve() saves its SHA-256 fingerprint, unlocking those exact definitions for the model.',
          'pt-br': 'Uma pessoa revisa cada definição exata (nome, descrição e inputSchema) e aprova. approve() guarda o fingerprint SHA-256 dela, liberando essas definições exatas para o modelo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Server offers', 'pt-br': 'Servidor oferece' }, detail: { en: '3 purchasing tools', 'pt-br': '3 ferramentas de compras' }, pigment: 'accent' },
            { label: { en: 'ToolCatalog.offered', 'pt-br': 'ToolCatalog.offered' }, detail: { en: '3 definitions match', 'pt-br': '3 definições conferem' }, pigment: 'accent' },
            { label: { en: 'Approved hashes', 'pt-br': 'Hashes aprovados' }, detail: { en: '3 SHA-256 fingerprints saved', 'pt-br': '3 fingerprints SHA-256 salvos' }, pigment: 'success' },
            { label: { en: 'Model sees', 'pt-br': 'Modelo enxerga' }, detail: { en: '3 callable tools', 'pt-br': '3 ferramentas chamáveis' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Noon catalog change', 'pt-br': 'Mudança ao meio-dia' },
        caption: {
          en: 'The server deploys export_all_purchases and rewrites lookup_purchase_order’s description. It sends notifications/tools/list_changed with no tool list; the client re-lists and update() flags both changes.',
          'pt-br': 'O servidor publica export_all_purchases e reescreve a descrição de lookup_purchase_order. Ele manda notifications/tools/list_changed sem lista; o cliente relista e update() sinaliza as duas mudanças.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Server emits', 'pt-br': 'Servidor envia' }, detail: { en: 'list_changed notification', 'pt-br': 'notificação list_changed' }, pigment: 'caution' },
            { label: { en: 'Client re-lists', 'pt-br': 'Cliente relista' }, detail: { en: '4 definitions in offered', 'pt-br': '4 definições em offered' }, pigment: 'accent' },
            { label: { en: 'Hash compare', 'pt-br': 'Comparação de hash' }, detail: { en: 'export new; lookup hash changed', 'pt-br': 'export nova; hash do lookup mudou' }, pigment: 'danger' },
            { label: { en: 'Model sees', 'pt-br': 'Modelo enxerga' }, detail: { en: 'only the 2 unchanged tools', 'pt-br': 'só as 2 ferramentas inalteradas' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Refused locally', 'pt-br': 'Recusada localmente' },
        caption: {
          en: 'If the model still asks for export_all_purchases or the reworded lookup, call_tool checks the fingerprint and refuses locally before sending anything to the server.',
          'pt-br': 'Se o modelo ainda pedir export_all_purchases ou o lookup reescrito, call_tool confere o fingerprint e recusa localmente antes de mandar qualquer mensagem ao servidor.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Model requests', 'pt-br': 'Modelo pede' }, detail: { en: 'export_all_purchases', 'pt-br': 'export_all_purchases' }, pigment: 'caution' },
            { label: { en: 'Client check', 'pt-br': 'Checagem do cliente' }, detail: { en: 'no approved SHA-256 match', 'pt-br': 'nenhum hash SHA-256 aprovado' }, pigment: 'danger' },
            { label: { en: 'Local refusal', 'pt-br': 'Recusa local' }, detail: { en: 'raises ToolNotApproved', 'pt-br': 'levanta ToolNotApproved' }, pigment: 'danger' },
            { label: { en: 'Server sees', 'pt-br': 'Servidor recebe' }, detail: { en: '0 requests for that call', 'pt-br': '0 requisições dessa chamada' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  'mcp-trust-boundaries': {
    lesson: '15.4-a-raw-postgres-mcp-server',
    title: { en: 'Five places a tool request is checked', 'pt-br': 'Cinco lugares onde um pedido de ferramenta é verificado' },
    caption: {
      en: 'Each layer checks what the one before it cannot. The model chooses only the tool and its arguments; who the caller is comes from the launch environment and reaches the database as a bound setting.',
      'pt-br': 'Cada camada verifica o que a anterior não consegue. O modelo escolhe só a ferramenta e os argumentos; quem chama vem do ambiente de lançamento e chega ao banco como uma configuração passada por parâmetro.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Host and user approve the tool', 'pt-br': 'Host e usuário aprovam a ferramenta' }, detail: { en: 'exact definition, by fingerprint', 'pt-br': 'definição exata, por fingerprint' }, pigment: 'accent' },
        { label: { en: 'Client sends one request', 'pt-br': 'O cliente envia um pedido' }, detail: { en: 'version and capabilities in _meta', 'pt-br': 'versão e capacidades em _meta' }, pigment: 'accent' },
        { label: { en: 'Server validates the arguments', 'pt-br': 'O servidor valida os argumentos' }, detail: { en: 'strict model, no tenant field', 'pt-br': 'modelo estrito, sem campo de tenant' }, pigment: 'caution' },
        { label: { en: 'Fixed query, bound parameters', 'pt-br': 'Consulta fixa, parâmetros vinculados' }, detail: { en: 'tenant from the launch principal', 'pt-br': 'tenant vindo do principal de lançamento' }, pigment: 'caution' },
        { label: { en: 'Read-only role, row security', 'pt-br': 'Papel só de leitura, segurança por linha' }, detail: { en: 'SELECT only · timeout · one tenant', 'pt-br': 'só SELECT · timeout · um tenant' }, pigment: 'success' },
      ],
    },
  },

  /**
   * 15.5 checks four already-verified token claims in order inside
   * `check_access`: audience, expiry, revocation (each returning 401
   * invalid_token) and scopes (returning 403 insufficient_scope).
   */
  't15-remote-token-gates': {
    lesson: '15.5-transport-and-authorization-boundaries',
    title: { en: 'How a remote HTTP server checks a bearer token', 'pt-br': 'Como um servidor HTTP remoto verifica um bearer token' },
    caption: {
      en: 'After a maintained library verifies the token’s cryptographic signature, check_access tests four claims in order at 12:00:00 UTC. Wrong audience, expiry or revocation returns 401; missing scope returns 403.',
      'pt-br': 'Depois que uma biblioteca mantida verifica a assinatura criptográfica do token, check_access testa quatro claims em ordem às 12:00:00 UTC. Audiência errada, expiração ou revogação devolve 401; escopo ausente devolve 403.',
    },
    steps: [
      {
        label: { en: 'Valid token (200)', 'pt-br': 'Token válido (200)' },
        caption: {
          en: 'Audience names the purchasing server, expiry (12:05:00) is strictly after now (12:00:00), jti is not revoked, and scope includes purchases:read. The fixture returns 200 with token.sub.',
          'pt-br': 'A audiência cita o servidor de compras, a expiração (12:05:00) é estritamente posterior a now (12:00:00), o jti não está revogado e o escopo inclui purchases:read. A fixture devolve 200 com token.sub.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Signature library', 'pt-br': 'Biblioteca de assinatura' }, detail: { en: 'keys and issuer verified first', 'pt-br': 'chaves e emissor verificados antes' }, pigment: 'muted' },
            { label: { en: 'aud check', 'pt-br': 'Checagem de aud' }, detail: { en: 'matches purchasing server', 'pt-br': 'casa com servidor de compras' }, pigment: 'accent' },
            { label: { en: 'exp & jti', 'pt-br': 'exp e jti' }, detail: { en: '12:05:00 > 12:00:00 · not revoked', 'pt-br': '12:05:00 > 12:00:00 · não revogado' }, pigment: 'accent' },
            { label: { en: 'scope check', 'pt-br': 'Checagem de scope' }, detail: { en: 'contains purchases:read', 'pt-br': 'contém purchases:read' }, pigment: 'accent' },
            { label: { en: '200 allowed', 'pt-br': '200 permitido' }, detail: { en: 'returns subject for Principal lookup', 'pt-br': 'devolve sujeito para buscar Principal' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Invalid token (401)', 'pt-br': 'Token inválido (401)' },
        caption: {
          en: 'A signed token for the calendar server fails the audience check immediately with 401 invalid_token, even if it carries purchases:read. Expiring at 12:00:00 or a revoked jti also stops here with 401.',
          'pt-br': 'Um token assinado para o servidor de agenda falha logo na audiência com 401 invalid_token, mesmo trazendo purchases:read. Expirar às 12:00:00 ou ter jti revogado também para aqui com 401.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Signature library', 'pt-br': 'Biblioteca de assinatura' }, detail: { en: 'signature is genuine', 'pt-br': 'assinatura é autêntica' }, pigment: 'muted' },
            { label: { en: 'aud / exp / jti', 'pt-br': 'aud / exp / jti' }, detail: { en: 'wrong aud, exp <= now, or revoked', 'pt-br': 'aud errada, exp <= now ou revogado' }, pigment: 'danger' },
            { label: { en: '401 invalid_token', 'pt-br': '401 invalid_token' }, detail: { en: 'stopped before scope check', 'pt-br': 'barrado antes de conferir escopo' }, pigment: 'danger' },
            { label: { en: 'scope check', 'pt-br': 'Checagem de scope' }, detail: { en: 'never reached', 'pt-br': 'nem chega a rodar' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Missing scope (403)', 'pt-br': 'Escopo ausente (403)' },
        caption: {
          en: 'The token is genuinely for this server, unexpired and unrevoked, but carries only calendar:read. check_access returns 403 insufficient_scope with WWW-Authenticate naming purchases:read.',
          'pt-br': 'O token é de fato para este servidor, não expirou nem foi revogado, mas traz só calendar:read. check_access devolve 403 insufficient_scope com WWW-Authenticate citando purchases:read.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Signature library', 'pt-br': 'Biblioteca de assinatura' }, detail: { en: 'signature is genuine', 'pt-br': 'assinatura é autêntica' }, pigment: 'muted' },
            { label: { en: 'aud, exp & jti', 'pt-br': 'aud, exp e jti' }, detail: { en: 'all three checks pass', 'pt-br': 'todas as três checagens passam' }, pigment: 'accent' },
            { label: { en: 'scope check', 'pt-br': 'Checagem de scope' }, detail: { en: 'missing purchases:read', 'pt-br': 'falta purchases:read' }, pigment: 'danger' },
            { label: { en: '403 insufficient_scope', 'pt-br': '403 insufficient_scope' }, detail: { en: 'WWW-Authenticate names needed scope', 'pt-br': 'WWW-Authenticate cita o escopo exigido' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
