/**
 * Figures for track 16 — Agent Security & Trust Boundaries.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The owners mirror `ASSISTANT_THREAT_MODEL` in
 * `examples/agent-engineering/src/agentlab/security/threats.py`.
 */
import type { Figure } from './types'

export const TRACK_16_FIGURES = {
  'assistant-trust-boundaries': {
    lesson: '16.1-threat-model-the-assistant',
    title: { en: 'Where outside text meets authority', 'pt-br': 'Onde o texto de fora encontra a autoridade' },
    caption: {
      en: 'Each arrow carries a proposal, never authority. Every boundary has an owner outside the model, and the Principal reaches the gate from the controller, not from the message.',
      'pt-br': 'Cada seta carrega uma proposta, nunca autoridade. Toda fronteira tem um dono fora do modelo, e o Principal chega ao gate pelo controlador, não pela mensagem.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Supplier message, documents, tool results', 'pt-br': 'Mensagem do fornecedor, documentos, resultados de ferramentas' }, detail: { en: 'untrusted · owner: untrusted_boundary', 'pt-br': 'não confiável · dono: untrusted_boundary' }, pigment: 'danger' },
        { label: { en: 'Model reads and proposes', 'pt-br': 'O modelo lê e propõe' }, detail: { en: 'emits a ToolRequest · owns no boundary', 'pt-br': 'emite um ToolRequest · não é dono de fronteira' }, pigment: 'caution' },
        { label: { en: 'Policy gate decides', 'pt-br': 'O gate de política decide' }, detail: { en: 'grant, Principal tenant, purchase record · owner: policy_gate', 'pt-br': 'concessão, tenant do Principal, registro de compra · dono: policy_gate' }, pigment: 'accent' },
        { label: { en: 'Back office acts with service authority', 'pt-br': 'O back office age com a autoridade do serviço' }, detail: { en: 'drafts and records · reached only through the gate', 'pt-br': 'rascunhos e registros · alcançado só pelo gate' }, pigment: 'muted' },
        { label: { en: 'A person approves payment', 'pt-br': 'Uma pessoa aprova o pagamento' }, detail: { en: 'approve_invoice · owner: human_approver', 'pt-br': 'approve_invoice · dono: human_approver' }, pigment: 'success' },
      ],
    },
  },

  /**
   * 16.2 walks through the four ordered checks in `authorize` (`grant`,
   * `CHECKS`, typed schema, and the tool's trusted-record check) and contrasts
   * the two attack calls with the benign PO-1001 positive control.
   */
  't16-policy-gate-checks': {
    lesson: '16.2-indirect-prompt-injection',
    title: { en: 'Four checks, three requests', 'pt-br': 'Quatro verificações, três pedidos' },
    caption: {
      en: 'Every ToolRequest crosses the same four checks in authorize. The detector is never an input; any single failure refuses the call, while a genuine draft passes all four.',
      'pt-br': 'Todo ToolRequest atravessa as mesmas quatro verificações em authorize. O detector nunca entra aqui; qualquer falha sozinha recusa a chamada, enquanto um rascunho legítimo passa pelas quatro.',
    },
    steps: [
      {
        label: { en: 'Attack: approve_invoice', 'pt-br': 'Ataque: approve_invoice' },
        caption: {
          en: 'Stopped at check 1. approve_invoice is not in ASSISTANT_GRANT, so authorize refuses immediately without reading any arguments.',
          'pt-br': 'Barrado na verificação 1. approve_invoice não está em ASSISTANT_GRANT, então authorize recusa na hora sem ler os argumentos.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1. Allowlist (grant)', 'pt-br': '1. Lista de permissões (grant)' }, detail: { en: 'approve_invoice not in grant · refused', 'pt-br': 'approve_invoice fora de grant · recusado' }, pigment: 'danger' },
            { label: { en: '2. Policy rule exists', 'pt-br': '2. Regra de política' }, detail: { en: 'not reached', 'pt-br': 'não alcançada' }, pigment: 'muted' },
            { label: { en: '3. Typed arguments', 'pt-br': '3. Argumentos tipados' }, detail: { en: 'not reached', 'pt-br': 'não alcançada' }, pigment: 'muted' },
            { label: { en: '4. Trusted record check', 'pt-br': '4. Conferência no registro' }, detail: { en: 'not reached', 'pt-br': 'não alcançada' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Attack: Omega draft', 'pt-br': 'Ataque: rascunho Omega' },
        caption: {
          en: 'Passes checks 1–3 because the tool is granted and the fields fit the schema. Stopped at check 4: payee "Supplier Omega" is not PO-1002’s supplier (and USD 11,340.00 is not USD 1,134.00).',
          'pt-br': 'Passa nas verificações 1–3 porque a ferramenta está concedida e os campos cabem no schema. Barrado na verificação 4: o favorecido "Supplier Omega" não é o fornecedor do PO-1002 (e USD 11.340,00 não é USD 1.134,00).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1. Allowlist (grant)', 'pt-br': '1. Lista de permissões (grant)' }, detail: { en: 'create_invoice_draft in grant · pass', 'pt-br': 'create_invoice_draft em grant · passa' }, pigment: 'success' },
            { label: { en: '2. Policy rule exists', 'pt-br': '2. Regra de política' }, detail: { en: '_check_draft in CHECKS · pass', 'pt-br': '_check_draft em CHECKS · passa' }, pigment: 'success' },
            { label: { en: '3. Typed arguments', 'pt-br': '3. Argumentos tipados' }, detail: { en: 'DraftArgs shape valid · pass', 'pt-br': 'formato de DraftArgs válido · passa' }, pigment: 'success' },
            { label: { en: '4. Trusted record check', 'pt-br': '4. Conferência no registro' }, detail: { en: 'payee != Supplier Alpha · refused', 'pt-br': 'favorecido != Supplier Alpha · recusado' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Benign: PO-1001 draft', 'pt-br': 'Benigno: rascunho PO-1001' },
        caption: {
          en: 'Positive control: an honest draft for tenant-a’s PO-1001 (Supplier Alpha, USD 500.00) passes all four checks, even if keyword_detector raises a false alarm.',
          'pt-br': 'Controle positivo: um rascunho honesto para o PO-1001 do tenant-a (Supplier Alpha, USD 500,00) passa nas quatro verificações, mesmo se keyword_detector der alarme falso.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '1. Allowlist (grant)', 'pt-br': '1. Lista de permissões (grant)' }, detail: { en: 'create_invoice_draft in grant · pass', 'pt-br': 'create_invoice_draft em grant · passa' }, pigment: 'success' },
            { label: { en: '2. Policy rule exists', 'pt-br': '2. Regra de política' }, detail: { en: '_check_draft in CHECKS · pass', 'pt-br': '_check_draft em CHECKS · passa' }, pigment: 'success' },
            { label: { en: '3. Typed arguments', 'pt-br': '3. Argumentos tipados' }, detail: { en: 'DraftArgs shape valid · pass', 'pt-br': 'formato de DraftArgs válido · passa' }, pigment: 'success' },
            { label: { en: '4. Trusted record check', 'pt-br': '4. Conferência no registro' }, detail: { en: 'tenant-a, Supplier Alpha, USD 500.00 · allowed', 'pt-br': 'tenant-a, Supplier Alpha, USD 500,00 · permitido' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 16.3 contrasts Monday's human-approved SHA-256 pins with Tuesday's catalog
   * drift (`new`, `changed`, `missing`) and a poisoned runtime tool result.
   * Replaces the four-row Tuesday bucket table.
   */
  't16-catalog-pinning-flow': {
    lesson: '16.3-tool-poisoning-and-delegation',
    title: { en: 'Pinning a catalog against Tuesday’s drift', 'pt-br': 'Fixando um catálogo contra a deriva de terça-feira' },
    caption: {
      en: 'Permissions come from Monday’s human-approved hashes compared against today’s catalog—never from a server’s edits or a tool’s return text.',
      'pt-br': 'As permissões vêm dos hashes aprovados por uma pessoa na segunda comparados ao catálogo de hoje — nunca de edições do servidor nem do texto devolvido por uma ferramenta.',
    },
    steps: [
      {
        label: { en: 'Monday: approve and pin', 'pt-br': 'Segunda: aprovar e fixar' },
        caption: {
          en: 'A person approves lookup_po and create_invoice_draft. Each definition is serialized as canonical JSON (sorted keys) and hashed with SHA-256 into the controller’s Grant.',
          'pt-br': 'Uma pessoa aprova lookup_po e create_invoice_draft. Cada definição é serializada em JSON canônico (chaves ordenadas) e convertida em hash SHA-256 no Grant do controlador.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Human review', 'pt-br': 'Revisão humana' }, detail: { en: 'approves lookup_po and create_invoice_draft', 'pt-br': 'aprova lookup_po e create_invoice_draft' }, pigment: 'accent' },
            { label: { en: 'Canonical JSON', 'pt-br': 'JSON canônico' }, detail: { en: 'name, description, schema, annotations sorted', 'pt-br': 'nome, descrição, schema e anotações ordenados' }, pigment: 'accent' },
            { label: { en: 'SHA-256 fingerprint', 'pt-br': 'Impressão digital SHA-256' }, detail: { en: 'exact hash per approved tool', 'pt-br': 'hash exato por ferramenta aprovada' }, pigment: 'accent' },
            { label: { en: 'Controller Grant', 'pt-br': 'Grant do controlador' }, detail: { en: 'stores Monday’s pins locally', 'pt-br': 'guarda localmente as fixações de segunda' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Tuesday: server drifts', 'pt-br': 'Terça: o servidor muda' },
        caption: {
          en: 'review_catalog hashes Tuesday’s catalog and classifies every discrepancy into changed, new, or missing (if a pinned tool disappeared; returning with its original fingerprint can reuse its pin). None of Tuesday’s altered or new tools can run without fresh human approval.',
          'pt-br': 'review_catalog calcula o hash do catálogo de terça e classifica cada divergência em changed, new ou missing (se uma ferramenta fixada sumir; voltando com a impressão original ela pode reutilizar a aprovação). Nenhuma ferramenta nova ou alterada de terça roda sem nova aprovação humana.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'lookup_po reworded', 'pt-br': 'lookup_po reescrita' }, detail: { en: 'bucket: changed · suspended', 'pt-br': 'lista: changed · suspensa' }, pigment: 'danger' },
            { label: { en: 'create_invoice_draft relabelled', 'pt-br': 'create_invoice_draft rerrotulada' }, detail: { en: 'bucket: changed · suspended', 'pt-br': 'lista: changed · suspensa' }, pigment: 'danger' },
            { label: { en: 'approve_invoice added', 'pt-br': 'approve_invoice incluída' }, detail: { en: 'bucket: new · blocked', 'pt-br': 'lista: new · bloqueada' }, pigment: 'caution' },
            { label: { en: 'If a pinned tool disappears', 'pt-br': 'Se uma ferramenta fixada sumir' }, detail: { en: 'bucket: missing · absent from usable', 'pt-br': 'lista: missing · fora de usable' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Runtime: poisoned result', 'pt-br': 'Execução: resultado envenenado' },
        caption: {
          en: 'Even with an unchanged catalog, a tool result claiming new authority is wrapped as untrusted data and never enters the usable set.',
          'pt-br': 'Mesmo com o catálogo intacto, um resultado de ferramenta alegando nova autoridade entra envolvido como dado não confiável e nunca entra no conjunto usable.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'lookup_po returns order + note', 'pt-br': 'lookup_po devolve pedido + nota' }, detail: { en: 'claims authority for approve_invoice', 'pt-br': 'alega autoridade para approve_invoice' }, pigment: 'danger' },
            { label: { en: 'Untrusted wrapper', 'pt-br': 'Bloco não confiável' }, detail: { en: 'tagged as untrusted tool output', 'pt-br': 'marcado como saída não confiável de ferramenta' }, pigment: 'caution' },
            { label: { en: 'Usable set unchanged', 'pt-br': 'Conjunto usable intacto' }, detail: { en: 'computed from Grant + catalog only', 'pt-br': 'calculado só a partir de Grant + catálogo' }, pigment: 'accent' },
            { label: { en: 'Policy gate refuses', 'pt-br': 'Gate de política recusa' }, detail: { en: 'approve_invoice not in usable · 0 approvals', 'pt-br': 'approve_invoice fora de usable · 0 aprovações' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 16.4 puts all three least-privilege isolation layers from `privilege.py`
   * into one stepped view: split role grants + typed handoff, CredentialBroker,
   * and render_untrusted.
   */
  't16-least-privilege-boundaries': {
    lesson: '16.4-enforce-least-privilege',
    title: { en: 'Three isolation boundaries in practice', 'pt-br': 'Três fronteiras de isolamento na prática' },
    caption: {
      en: 'Least privilege limits what each role can call, what fields cross between roles, who touches credentials, and what reaches the reviewer’s browser.',
      'pt-br': 'O menor privilégio limita o que cada papel chama, que campos passam entre papéis, quem toca nas credenciais e o que chega ao navegador de quem revisa.',
    },
    steps: [
      {
        label: { en: 'Roles & typed handoff', 'pt-br': 'Papéis e passagem tipada' },
        caption: {
          en: 'Splitting one agent into three grants keeps the mail reader read-only. Only ExtractedInvoice (po_id and total) crosses to the drafter; extra fields like payee or approved fail validation.',
          'pt-br': 'Dividir um agente em três concessões mantém o leitor de e-mail só em leitura. Só ExtractedInvoice (po_id e total) passa ao redator; campos extras como payee ou approved falham na validação.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'mail_reader', 'pt-br': 'mail_reader (leitor)' }, detail: { en: 'grant: lookup_po only · reads supplier mail', 'pt-br': 'concessão: só lookup_po · lê e-mail de fornecedor' }, pigment: 'caution' },
            { label: { en: 'ExtractedInvoice', 'pt-br': 'ExtractedInvoice' }, detail: { en: 'only po_id + total · extra fields rejected', 'pt-br': 'só po_id + total · campos extras rejeitados' }, pigment: 'accent' },
            { label: { en: 'invoice_drafter', 'pt-br': 'invoice_drafter (redator)' }, detail: { en: 'grant: lookup_po, create_invoice_draft', 'pt-br': 'concessão: lookup_po, create_invoice_draft' }, pigment: 'accent' },
            { label: { en: 'records_clerk', 'pt-br': 'records_clerk (registros)' }, detail: { en: 'separate grant: lookup_po, write_purchase_record', 'pt-br': 'concessão separada: lookup_po, write_purchase_record' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Credential broker', 'pt-br': 'Intermediário de credenciais' },
        caption: {
          en: 'The agent calls by tool name without seeing the API key. CredentialBroker checks its fixed route table, attaches the Authorization header, and redacts the secret if the service echoes it back.',
          'pt-br': 'O agente chama pelo nome da ferramenta sem ver a chave de API. CredentialBroker confere a tabela de rotas fixas, anexa o cabeçalho Authorization e oculta o segredo se o serviço o ecoar na resposta.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Agent calls lookup_po', 'pt-br': 'Agente chama lookup_po' }, detail: { en: 'holds no secret · cannot pick URL', 'pt-br': 'não guarda segredo · não escolhe URL' }, pigment: 'caution' },
            { label: { en: 'CredentialBroker', 'pt-br': 'CredentialBroker' }, detail: { en: 'fixed route · adds Bearer header', 'pt-br': 'rota fixa · anexa cabeçalho Bearer' }, pigment: 'accent' },
            { label: { en: 'Back-office service', 'pt-br': 'Serviço de back office' }, detail: { en: 'receives header · may echo it in debug', 'pt-br': 'recebe cabeçalho · pode ecoá-lo em depuração' }, pigment: 'muted' },
            { label: { en: 'Reply scrubbed', 'pt-br': 'Resposta limpa' }, detail: { en: 'secret replaced by [redacted] before model', 'pt-br': 'segredo trocado por [redacted] antes do modelo' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Inert reviewer output', 'pt-br': 'Saída inerte para revisão' },
        caption: {
          en: 'render_untrusted removes Markdown link or image targets and bare URLs before escaping HTML, so a reviewer’s screen cannot execute markup or leak order totals by loading an image.',
          'pt-br': 'render_untrusted remove destinos de links ou imagens Markdown e URLs soltas antes de escapar o HTML, impedindo a tela de revisão de rodar marcação ou vazar totais ao carregar uma imagem.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Model reply', 'pt-br': 'Resposta do modelo' }, detail: { en: 'may carry HTML or a Markdown image URL', 'pt-br': 'pode trazer HTML ou uma URL de imagem Markdown' }, pigment: 'danger' },
            { label: { en: 'Strip link & image targets', 'pt-br': 'Remover destinos de links' }, detail: { en: 'keeps label + [link removed]', 'pt-br': 'mantém o rótulo + [link removed]' }, pigment: 'accent' },
            { label: { en: 'Escape HTML characters', 'pt-br': 'Escapar caracteres HTML' }, detail: { en: 'neutralizes <, >, &, quotes', 'pt-br': 'neutraliza <, >, & e aspas' }, pigment: 'accent' },
            { label: { en: 'Reviewer screen', 'pt-br': 'Tela de revisão' }, detail: { en: 'inert text · zero outbound fetches', 'pt-br': 'texto inerte · nenhuma busca externa' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 16.5 runs nine synthetic attacks plus one benign control against an obedient
   * scripted model (`redteam.py`), breaks down what caught each of the nine
   * attacks (1 flagged + gate, 7 unflagged + gate, 1 unflagged + renderer), and
   * plants a bypass (`gate_with_pre_approved_flag`) to prove the suite fails.
   */
  't16-red-team-and-mutation': {
    lesson: '16.5-red-team-the-boundary',
    title: { en: 'Red-team harness, corpus breakdown, and mutation check', 'pt-br': 'Harness de red team, divisão do corpus e teste de mutação' },
    caption: {
      en: 'The suite assumes the model obeys every attack, checks concrete effects plus a benign control, measures the detector’s miss rate, and plants a defect to prove the tests fail when a control breaks.',
      'pt-br': 'A suíte supõe que o modelo obedece a todo ataque, confere efeitos concretos mais um controle benigno, mede a taxa de falha do detector e planta um defeito para provar que os testes falham se um controle quebrar.',
    },
    steps: [
      {
        label: { en: '1. Run corpus + control', 'pt-br': '1. Rodar corpus + controle' },
        caption: {
          en: 'Every attack pairs a synthetic message with a scripted obedient model. _harm ignores model prose and inspects the back office and renderer output string; the benign control ensures honest work still succeeds.',
          'pt-br': 'Cada ataque junta uma mensagem sintética a um modelo roteirizado obediente. _harm ignora o texto do modelo e inspeciona o back office e a string produzida pelo renderizador; o controle benigno garante que trabalho honesto ainda passe.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '9 attacks + 1 benign', 'pt-br': '9 ataques + 1 benigno' }, detail: { en: 'synthetic messages + positive control', 'pt-br': 'mensagens sintéticas + controle positivo' }, pigment: 'muted' },
            { label: { en: 'Obedient scripted model', 'pt-br': 'Modelo roteirizado obediente' }, detail: { en: 'emits every attacker-requested call', 'pt-br': 'emite toda chamada pedida pelo atacante' }, pigment: 'danger' },
            { label: { en: 'Gate + safe renderer', 'pt-br': 'Gate + renderizador seguro' }, detail: { en: 'authorize checks calls; render_untrusted cleans text', 'pt-br': 'authorize confere chamadas; render_untrusted limpa texto' }, pigment: 'accent' },
            { label: { en: '_harm checks effects', 'pt-br': '_harm confere efeitos' }, detail: { en: '0 attack findings · 1 honest PO-1001 draft', 'pt-br': '0 achados de ataque · 1 rascunho honesto do PO-1001' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2. What stopped all nine', 'pt-br': '2. O que barrou os nove' },
        caption: {
          en: 'With keyword_detector on, only 1 of 9 attacks is flagged. The other 8 reach the controls unflagged—and 0 cause harm, because the gate and safe renderer never rely on the detector.',
          'pt-br': 'Com keyword_detector ligado, só 1 de 9 ataques é sinalizado. Os outros 8 chegam aos controles sem alerta — e 0 causam dano, porque o gate e o renderizador seguro nunca dependem do detector.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Flagged by detector, stopped by gate', 'pt-br': 'Sinalizado pelo detector, barrado pelo gate' }, detail: { en: '1 of 9: hidden_comment (English keyword matched)', 'pt-br': '1 de 9: hidden_comment (frase em inglês casou)' }, weight: 1, pigment: 'caution' },
            { label: { en: 'Missed by detector, stopped by gate', 'pt-br': 'Ignorado pelo detector, barrado pelo gate' }, detail: { en: '7 of 9: base64, Portuguese, zero-width, tag breakout, exfiltration, extra args, record write', 'pt-br': '7 de 9: base64, português, largura zero, fuga de tag, exfiltração, args extras, escrita de registro' }, weight: 7, pigment: 'accent' },
            { label: { en: 'Missed by detector, stopped by renderer', 'pt-br': 'Ignorado pelo detector, barrado pelo renderizador' }, detail: { en: '1 of 9: unsafe_link (honest draft allowed; image URL stripped)', 'pt-br': '1 de 9: unsafe_link (rascunho honesto permitido; URL de imagem removida)' }, weight: 1, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '3. Mutation test (teeth)', 'pt-br': '3. Teste de mutação (dentes)' },
        caption: {
          en: 'Planting a pre_approved fast path at the top of authorize lets argument_smuggling bypass the grant and schema checks. The suite catches the approval and goes red, proving the test has teeth.',
          'pt-br': 'Plantar um atalho pre_approved no topo de authorize deixa argument_smuggling furar a concessão e o schema. A suíte pega a aprovação e fica vermelha, provando que o teste tem dentes.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Plant defect in gate', 'pt-br': 'Plantar defeito no gate' }, detail: { en: 'pre_approved=True returns Decision(True)', 'pt-br': 'pre_approved=True devolve Decision(True)' }, pigment: 'danger' },
            { label: { en: 'Re-run 9-attack corpus', 'pt-br': 'Rodar de novo os 9 ataques' }, detail: { en: 'benign control still passes', 'pt-br': 'controle benigno continua passando' }, pigment: 'caution' },
            { label: { en: 'Bypass executes', 'pt-br': 'Brecha executa' }, detail: { en: 'argument_smuggling approves PO-1002 + Omega draft', 'pt-br': 'argument_smuggling aprova PO-1002 + rascunho Omega' }, pigment: 'danger' },
            { label: { en: 'Suite fails loudly', 'pt-br': 'Suíte falha claramente' }, detail: { en: '2 findings reported · boundary defect caught', 'pt-br': '2 achados relatados · defeito na fronteira pego' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
