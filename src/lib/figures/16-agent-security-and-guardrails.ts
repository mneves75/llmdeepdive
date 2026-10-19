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
} as const satisfies Record<string, Figure>
