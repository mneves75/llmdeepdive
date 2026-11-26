/**
 * Figures for track 19 — Memory & Context Engineering.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The deletion lineage mirrors the Deletion fixture in
 * `examples/agent-engineering/tests/test_memory_store.py` and the two removal
 * rules in `src/agentlab/memory/store.py`. The other four figures mirror
 * `records.py`, `retrieval.py`, `compression.py`, and `evaluation.py`.
 */
import type { Figure } from './types'

export const TRACK_19_FIGURES = {
  't19-fact-promotion': {
    lesson: '19.1-working-episodic-and-semantic-memory',
    title: {
      en: 'From transcript line to semantic fact',
      'pt-br': 'De linha de transcrição a fato semântico',
    },
    caption: {
      en: 'promote() checks origin and tenant before turning an episodic observation into a semantic fact. External or model text needs a same-tenant system-of-record source.',
      'pt-br': 'promote() confere origem e tenant antes de transformar uma observação episódica em fato semântico. Texto externo ou de modelo exige uma fonte do sistema de registro do mesmo tenant.',
    },
    steps: [
      {
        label: { en: 'External claim alone', 'pt-br': 'Afirmação externa sozinha' },
        caption: {
          en: 'The supplier’s “delivered on Tuesday” and a model summary both fail on their own: neither origin is trusted, so promote() stops with UnverifiedFact.',
          'pt-br': 'O “entregue na terça” do fornecedor e um resumo de modelo falham sozinhos: nenhuma das origens é confiável, então promote() para com UnverifiedFact.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Supplier e-mail', 'pt-br': 'E-mail do fornecedor' }, detail: { en: 'episodic · origin external', 'pt-br': 'episódico · origem external' }, pigment: 'accent' },
            { label: { en: 'No corroboration', 'pt-br': 'Sem corroboração' }, detail: { en: 'corroboration is None', 'pt-br': 'corroboration é None' }, pigment: 'muted' },
            { label: { en: 'promote() gate', 'pt-br': 'Regra de promote()' }, detail: { en: 'external not in TRUSTED_ORIGINS', 'pt-br': 'external fora de TRUSTED_ORIGINS' }, pigment: 'caution' },
            { label: { en: 'Refused', 'pt-br': 'Recusado' }, detail: { en: 'raises UnverifiedFact', 'pt-br': 'levanta UnverifiedFact' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Corroborated by system of record', 'pt-br': 'Corroborada pelo sistema de registro' },
        caption: {
          en: 'With PO-1001 from the company’s purchase database agreeing in the same tenant, promote() creates a semantic fact whose derived_from lists both records and whose readers are the narrowest set allowed by both.',
          'pt-br': 'Com o PO-1001 do banco de compras da empresa concordando no mesmo tenant, promote() cria um fato semântico cujo derived_from lista os dois registros e cujos leitores são o conjunto mais restrito permitido por ambos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Supplier e-mail', 'pt-br': 'E-mail do fornecedor' }, detail: { en: 'episodic · origin external', 'pt-br': 'episódico · origem external' }, pigment: 'accent' },
            { label: { en: 'PO-1001 purchase row', 'pt-br': 'Linha de compra PO-1001' }, detail: { en: 'same tenant · origin system_of_record', 'pt-br': 'mesmo tenant · origem system_of_record' }, pigment: 'success' },
            { label: { en: 'promote() gate', 'pt-br': 'Regra de promote()' }, detail: { en: 'tenant matches · narrowest readers', 'pt-br': 'tenant bate · leitores mais restritos' }, pigment: 'accent' },
            { label: { en: 'Semantic fact', 'pt-br': 'Fato semântico' }, detail: { en: 'derived_from names both sources', 'pt-br': 'derived_from cita as duas fontes' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'User’s own rule', 'pt-br': 'Regra do próprio usuário' },
        caption: {
          en: 'A signed-in buyer’s statement may stand as the user’s claim, keeping origin="user"—right for a standing rule the buyer sets, not proof of what a supplier did.',
          'pt-br': 'A afirmação do comprador autenticado pode valer como afirmação do usuário, mantendo origin="user" — adequada para uma regra definida pelo comprador, não como prova do que um fornecedor fez.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Buyer’s statement', 'pt-br': 'Afirmação do comprador' }, detail: { en: 'episodic · origin user', 'pt-br': 'episódico · origem user' }, pigment: 'accent' },
            { label: { en: 'No extra source required', 'pt-br': 'Sem fonte extra obrigatória' }, detail: { en: 'user is in TRUSTED_ORIGINS', 'pt-br': 'user está em TRUSTED_ORIGINS' }, pigment: 'muted' },
            { label: { en: 'promote() gate', 'pt-br': 'Regra de promote()' }, detail: { en: 'keeps origin="user" and readers', 'pt-br': 'mantém origin="user" e leitores' }, pigment: 'accent' },
            { label: { en: 'User’s claim', 'pt-br': 'Afirmação do usuário' }, detail: { en: 'semantic · never payment authority', 'pt-br': 'semântico · nunca autoridade de pagamento' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  't19-filter-before-rank': {
    lesson: '19.2-ingestion-and-retrieval',
    title: {
      en: 'Order decides what the buyer sees',
      'pt-br': 'A ordem decide o que o comprador vê',
    },
    caption: {
      en: 'Query “400 boxes of M8 hex bolts” for tenant-a’s buyer, asking for the top match (k = 1) across six purchase orders. Scores come from the lesson’s BM25 exercise.',
      'pt-br': 'Consulta “400 boxes of M8 hex bolts” feita pelo comprador do tenant-a, pedindo o melhor resultado (k = 1) entre seis pedidos de compra. As notas vêm do exercício de BM25 da aula.',
    },
    steps: [
      {
        label: { en: 'Wrong order: rank, then filter', 'pt-br': 'Ordem errada: ranquear e depois filtrar' },
        caption: {
          en: 'PO-2001 (tenant-b) scores 2.071 against 1.471 for PO-1001 because only PO-2001 contains “400”. It takes the single slot, visible() drops it, and the buyer receives nothing—while IDF still counted tenant-b’s words.',
          'pt-br': 'O PO-2001 (tenant-b) marca 2,071 contra 1,471 do PO-1001 porque só o PO-2001 contém “400”. Ele ocupa a única vaga, visible() o descarta e o comprador recebe nada — enquanto o IDF ainda contou as palavras do tenant-b.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'All 6 orders', 'pt-br': 'Todos os 6 pedidos' }, detail: { en: 'tenant-a and tenant-b mixed', 'pt-br': 'tenant-a e tenant-b misturados' }, pigment: 'muted' },
            { label: { en: 'BM25 over all 6', 'pt-br': 'BM25 sobre os 6' }, detail: { en: 'IDF includes other tenants', 'pt-br': 'IDF inclui outros tenants' }, pigment: 'caution' },
            { label: { en: 'Top k = 1', 'pt-br': 'Top k = 1' }, detail: { en: 'PO-2001 wins: 2.071 vs 1.471', 'pt-br': 'PO-2001 vence: 2,071 contra 1,471' }, pigment: 'danger' },
            { label: { en: 'visible() filter', 'pt-br': 'Filtro visible()' }, detail: { en: 'drops PO-2001 · returns nothing', 'pt-br': 'descarta PO-2001 · devolve nada' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Right order: filter, then rank', 'pt-br': 'Ordem certa: filtrar e depois ranquear' },
        caption: {
          en: 'Access, expiry and supersession remove unreadable or stale records first. BM25 computes IDF over tenant-a’s visible set only, and PO-1001 fills the slot.',
          'pt-br': 'Acesso, expiração e substituição removem antes os registros ilegíveis ou vencidos. O BM25 calcula o IDF só sobre o conjunto visível do tenant-a, e o PO-1001 ocupa a vaga.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'All 6 orders', 'pt-br': 'Todos os 6 pedidos' }, detail: { en: 'tenant-a and tenant-b', 'pt-br': 'tenant-a e tenant-b' }, pigment: 'muted' },
            { label: { en: 'Access, expiry, supersedes', 'pt-br': 'Acesso, expiração, substituição' }, detail: { en: 'keeps tenant-a’s live records only', 'pt-br': 'mantém só registros ativos do tenant-a' }, pigment: 'accent' },
            { label: { en: 'BM25 over visible set', 'pt-br': 'BM25 no conjunto visível' }, detail: { en: 'IDF uses tenant-a’s records only', 'pt-br': 'IDF usa só registros do tenant-a' }, pigment: 'accent' },
            { label: { en: 'Top k = 1', 'pt-br': 'Top k = 1' }, detail: { en: 'returns PO-1001', 'pt-br': 'devolve PO-1001' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  't19-window-slice': {
    lesson: '19.3-token-budgets-and-compression',
    title: {
      en: 'One request across three context windows',
      'pt-br': 'Uma requisição em três janelas de contexto',
    },
    caption: {
      en: 'Every call reserves 4,096 tokens for the answer first and pays 8,400 fixed input tokens (1,200 instructions, 2,400 tool schemas, 4,800 for six chunks). Changing the window size changes whether the 21,000-token history fits, must shrink, or cannot even start.',
      'pt-br': 'Toda chamada reserva 4.096 tokens para a resposta primeiro e paga 8.400 tokens fixos de entrada (1.200 de instruções, 2.400 de schemas de ferramentas, 4.800 de seis trechos). Mudar o tamanho da janela muda se o histórico de 21.000 tokens cabe, precisa encolher ou nem sequer tem espaço para começar.',
    },
    steps: [
      {
        label: { en: '32,768 window (728 over)', 'pt-br': 'Janela 32.768 (728 acima)' },
        caption: {
          en: 'Input limit is 28,672 tokens. After 8,400 fixed tokens, 20,272 remain for history, so the 21,000-token conversation is 728 tokens over and must be compressed.',
          'pt-br': 'O limite de entrada é 28.672 tokens. Depois dos 8.400 fixos, sobram 20.272 para o histórico, então a conversa de 21.000 tokens passa 728 tokens do limite e precisa ser comprimida.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Output reserve', 'pt-br': 'Reserva para a resposta' }, detail: { en: '4,096 tokens', 'pt-br': '4.096 tokens' }, pigment: 'muted', weight: 4096 },
            { label: { en: 'System instructions', 'pt-br': 'Instruções de sistema' }, detail: { en: '1,200 tokens (fixed)', 'pt-br': '1.200 tokens (fixo)' }, pigment: 'accent', weight: 1200 },
            { label: { en: 'Tool schemas', 'pt-br': 'Schemas de ferramentas' }, detail: { en: '2,400 tokens (fixed)', 'pt-br': '2.400 tokens (fixo)' }, pigment: 'accent', weight: 2400 },
            { label: { en: 'Six retrieved chunks', 'pt-br': 'Seis trechos recuperados' }, detail: { en: '4,800 tokens (6 × 800, fixed)', 'pt-br': '4.800 tokens (6 × 800, fixo)' }, pigment: 'accent', weight: 4800 },
            { label: { en: 'Room left for history', 'pt-br': 'Espaço livre para o histórico' }, detail: { en: '20,272 max · 21,000 history is 728 over', 'pt-br': 'máximo 20.272 · histórico de 21.000 passa 728' }, pigment: 'caution', weight: 20272 },
          ],
        },
      },
      {
        label: { en: '131,072 window (fits)', 'pt-br': 'Janela 131.072 (cabe)' },
        caption: {
          en: 'Input limit rises to 126,976 tokens. Fixed parts (8,400) and the full 50-turn history (21,000) fit together with 97,576 tokens to spare.',
          'pt-br': 'O limite de entrada sobe para 126.976 tokens. As partes fixas (8.400) e o histórico completo de 50 falas (21.000) cabem juntos com 97.576 tokens de folga.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Output reserve', 'pt-br': 'Reserva para a resposta' }, detail: { en: '4,096 tokens', 'pt-br': '4.096 tokens' }, pigment: 'muted', weight: 4096 },
            { label: { en: 'Fixed input parts', 'pt-br': 'Partes fixas da entrada' }, detail: { en: '8,400 tokens (instructions, tools, chunks)', 'pt-br': '8.400 tokens (instruções, ferramentas, trechos)' }, pigment: 'accent', weight: 8400 },
            { label: { en: '50-turn conversation history', 'pt-br': 'Histórico de 50 falas' }, detail: { en: '21,000 tokens · fits untouched', 'pt-br': '21.000 tokens · cabe sem cortes' }, pigment: 'success', weight: 21000 },
            { label: { en: 'Unused headroom', 'pt-br': 'Folga não usada' }, detail: { en: '97,576 tokens to spare', 'pt-br': '97.576 tokens de folga' }, pigment: 'muted', weight: 97576 },
          ],
        },
      },
      {
        label: { en: '8,192 window (fixed overflow)', 'pt-br': 'Janela 8.192 (fixos estouram)' },
        caption: {
          en: 'After the 4,096-token answer reserve, only 4,096 tokens remain for input. The 8,400 fixed tokens alone exceed that by 4,304, so no history compression can help; you must cut schemas or chunks.',
          'pt-br': 'Depois da reserva de 4.096 tokens para a resposta, sobram só 4.096 para a entrada. Os 8.400 tokens fixos sozinhos passam disso em 4.304, então nenhuma compressão do histórico resolve; é preciso cortar schemas ou trechos.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Output reserve', 'pt-br': 'Reserva para a resposta' }, detail: { en: '4,096 tokens', 'pt-br': '4.096 tokens' }, pigment: 'muted', weight: 4096 },
            { label: { en: 'Entire input limit', 'pt-br': 'Todo o limite de entrada' }, detail: { en: '4,096 max · 8,400 fixed tokens exceed this by 4,304', 'pt-br': 'máximo 4.096 · 8.400 tokens fixos passam disso em 4.304' }, pigment: 'danger', weight: 4096 },
          ],
        },
      },
    ],
  },

  'memory-deletion-lineage': {
    lesson: '19.4-scoring-eviction-and-forgetting',
    title: { en: 'Eviction and deletion follow different rules', 'pt-br': 'Despejo e exclusão seguem regras diferentes' },
    caption: {
      en: 'turn-12 holds a phone number. A summary and a fact were made from it, and the vector index keeps its own copy of every record. Eviction removes one record to free space; a deletion request removes everything made from it.',
      'pt-br': 'turn-12 guarda um número de telefone. Um resumo e um fato foram feitos a partir dele, e o índice vetorial mantém sua própria cópia de cada registro. O despejo remove um registro para liberar espaço; um pedido de exclusão remove tudo o que foi feito a partir dele.',
    },
    steps: [
      {
        label: { en: 'Stored', 'pt-br': 'Guardado' },
        caption: {
          en: 'Each arrow is a derived_from link. A search for the number finds all three records.',
          'pt-br': 'Cada seta é um vínculo derived_from. Uma busca pelo número encontra os três registros.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'The user’s turn', 'pt-br': 'A fala do usuário' }, detail: { en: 'turn-12 · origin user', 'pt-br': 'turn-12 · origem user' }, pigment: 'accent' },
            { label: { en: 'A model summary of two turns', 'pt-br': 'Um resumo de duas falas feito pelo modelo' }, detail: { en: 'sum-1 · from turn-12 and turn-13', 'pt-br': 'sum-1 · de turn-12 e turn-13' }, pigment: 'accent' },
            { label: { en: 'An extracted fact', 'pt-br': 'Um fato extraído' }, detail: { en: 'fact-1 · from sum-1', 'pt-br': 'fact-1 · de sum-1' }, pigment: 'accent' },
            { label: { en: 'Copies in the vector index', 'pt-br': 'Cópias no índice vetorial' }, detail: { en: 'one per record', 'pt-br': 'uma por registro' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Evicted for space', 'pt-br': 'Despejado por espaço' },
        caption: {
          en: 'If eviction picks turn-12, it drops the turn and its index copy only. The summary is the short version kept on purpose, so it stays.',
          'pt-br': 'Se o despejo escolher turn-12, ele tira só a fala e sua cópia no índice. O resumo é a versão curta mantida de propósito, então ele fica.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'The user’s turn', 'pt-br': 'A fala do usuário' }, detail: { en: 'removed', 'pt-br': 'removida' }, pigment: 'danger' },
            { label: { en: 'A model summary of two turns', 'pt-br': 'Um resumo de duas falas feito pelo modelo' }, detail: { en: 'kept', 'pt-br': 'mantido' }, pigment: 'success' },
            { label: { en: 'An extracted fact', 'pt-br': 'Um fato extraído' }, detail: { en: 'kept', 'pt-br': 'mantido' }, pigment: 'success' },
            { label: { en: 'Copies in the vector index', 'pt-br': 'Cópias no índice vetorial' }, detail: { en: 'turn-12’s copy removed', 'pt-br': 'cópia de turn-12 removida' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Deleted on request', 'pt-br': 'Excluído a pedido' },
        caption: {
          en: 'forget("turn-12") follows the links: the summary and the fact go too, with their index copies. turn-13 and records from other sources stay.',
          'pt-br': 'forget("turn-12") segue os vínculos: o resumo e o fato também saem, com suas cópias no índice. turn-13 e registros de outras fontes ficam.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'The user’s turn', 'pt-br': 'A fala do usuário' }, detail: { en: 'removed', 'pt-br': 'removida' }, pigment: 'danger' },
            { label: { en: 'A model summary of two turns', 'pt-br': 'Um resumo de duas falas feito pelo modelo' }, detail: { en: 'removed', 'pt-br': 'removido' }, pigment: 'danger' },
            { label: { en: 'An extracted fact', 'pt-br': 'Um fato extraído' }, detail: { en: 'removed', 'pt-br': 'removido' }, pigment: 'danger' },
            { label: { en: 'Copies in the vector index', 'pt-br': 'Cópias no índice vetorial' }, detail: { en: 'three copies removed', 'pt-br': 'três cópias removidas' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  't19-eval-two-lanes': {
    lesson: '19.5-evaluate-memory',
    title: {
      en: 'Same three records, two verdicts',
      'pt-br': 'Os mesmos três registros, dois vereditos',
    },
    caption: {
      en: 'For “Who is the payee for PO-1002?”, BM25 ranks the injected supplier message first and PO-1002 itself seventh. Both retrieval and the naive control fetch the exact same three records; only lane routing separates a safe miss from a false memory.',
      'pt-br': 'Para “Who is the payee for PO-1002?”, o BM25 põe a mensagem injetada do fornecedor em primeiro e o próprio PO-1002 em sétimo. A recuperação e o controle ingênuo buscam exatamente os mesmos três registros; só a separação em faixas distingue um erro seguro de uma memória falsa.',
    },
    steps: [
      {
        label: { en: 'Provenance-aware retrieval', 'pt-br': 'Recuperação com procedência' },
        caption: {
          en: 'The injected message has origin external, so it stays in the untrusted lane. Because PO-1002 never enters the top three, the query is a safe miss: 7 of 8 recalled, 0 of 8 false memories.',
          'pt-br': 'A mensagem injetada tem origem external, então fica na faixa não confiável. Como o PO-1002 não entra nos três primeiros, a consulta é um erro seguro: 7 de 8 recuperadas, 0 de 8 memórias falsas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Top 3 from BM25', 'pt-br': 'Top 3 do BM25' }, detail: { en: '#1 injected message · PO-1002 is #7', 'pt-br': '1º mensagem injetada · PO-1002 é 7º' }, pigment: 'muted' },
            { label: { en: 'Route by origin', 'pt-br': 'Separa pela origem' }, detail: { en: 'external goes to untrusted lane', 'pt-br': 'external vai para a faixa não confiável' }, pigment: 'accent' },
            { label: { en: 'Untrusted lane', 'pt-br': 'Faixa não confiável' }, detail: { en: 'holds omega · never scored as truth', 'pt-br': 'guarda omega · nunca pontuada como verdade' }, pigment: 'caution' },
            { label: { en: 'Harness verdict', 'pt-br': 'Veredito do harness' }, detail: { en: '7 of 8 recalled · 0 false memories', 'pt-br': '7 de 8 recuperadas · 0 memórias falsas' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Naive control (provenance ignored)', 'pt-br': 'Controle ingênuo (sem procedência)' },
        caption: {
          en: 'Merging both lanes puts the injected message into the trusted lane. Because it also names PO-1002 and Supplier Alpha, recall climbs to 8 of 8—while Supplier Omega triggers a false memory (1 of 8).',
          'pt-br': 'Juntar as duas faixas põe a mensagem injetada na faixa confiável. Como ela também cita PO-1002 e Supplier Alpha, o recall sobe para 8 de 8 — enquanto Supplier Omega dispara uma memória falsa (1 de 8).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Top 3 from BM25', 'pt-br': 'Top 3 do BM25' }, detail: { en: 'same 3 records, #1 injected message', 'pt-br': 'mesmos 3 registros, 1º mensagem injetada' }, pigment: 'muted' },
            { label: { en: 'Ignore origin', 'pt-br': 'Ignora a origem' }, detail: { en: 'merges trusted and untrusted lanes', 'pt-br': 'junta as faixas confiável e não confiável' }, pigment: 'danger' },
            { label: { en: 'Trusted lane', 'pt-br': 'Faixa confiável' }, detail: { en: 'contains Supplier Alpha and omega', 'pt-br': 'contém Supplier Alpha e omega' }, pigment: 'danger' },
            { label: { en: 'Harness verdict', 'pt-br': 'Veredito do harness' }, detail: { en: '8 of 8 recalled · 1 false memory', 'pt-br': '8 de 8 recuperadas · 1 memória falsa' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
