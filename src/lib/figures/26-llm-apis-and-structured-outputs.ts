/**
 * Figures for track 26 — LLM APIs & Prompt Engineering.
 */
import type { Figure } from './types'

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
} as const satisfies Record<string, Figure>
