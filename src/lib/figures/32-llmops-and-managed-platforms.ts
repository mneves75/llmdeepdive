/**
 * Figures for track 32 — LLMOps & Managed AI Platforms.
 */
import type { Figure } from './types'

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
} as const satisfies Record<string, Figure>
