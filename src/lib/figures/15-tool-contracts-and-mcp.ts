/**
 * Figures for track 15 — Tool Contracts & MCP.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The boundaries mirror `examples/agent-engineering/src/agentlab/tools/`: the
 * catalog in `client.py`, the per-request checks in `server.py`, the queries in
 * `queries.py` and the role and policy in `tests_postgres/test_tools_postgres.py`.
 */
import type { Figure } from './types'

export const TRACK_15_FIGURES = {
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
} as const satisfies Record<string, Figure>
