/**
 * Figures for track 7 — Inference & Efficiency.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * Every number here comes from `~/lib/model-facts`. Nothing is derived locally.
 */
import { QWEN, QWEN_COMMON_MISTAKE } from '~/lib/model-facts'
import type { Figure } from './types'

export const TRACK_7_FIGURES = {
  /**
   * 7.2 owns the KV-cache derivation for the whole course. The figure walks the
   * same three steps the prose does — including the wrong turn, which is the
   * lesson's actual teaching device and must be shown as wrong rather than
   * quietly corrected.
   */
  'kv-cache-derivation': {
    lesson: '7.2-the-kv-cache',
    title: {
      en: 'Why only 16 of 64 layers cache',
      'pt-br': 'Por que apenas 16 das 64 camadas fazem cache',
    },
    caption: {
      en:
        'The cache grows per token, but only in the full-attention layers. Assuming every layer caches is the classic wrong turn, and it overstates the budget fourfold.',
      'pt-br':
        'O cache cresce por token, mas apenas nas camadas de atenção completa. Supor que toda camada faz cache é o erro clássico, e superestima o orçamento em quatro vezes.',
    },
    steps: [
      {
        label: { en: 'Per layer', 'pt-br': 'Por camada' },
        caption: {
          en: `${QWEN.kvHeads.value} KV heads × ${QWEN.headDim.value} dimensions × 2 (keys and values) × ${QWEN.bytesPerElement.value} bytes = 4 KiB, for every token, in every layer that attends.`,
          'pt-br': `${QWEN.kvHeads.value} cabeças KV × ${QWEN.headDim.value} dimensões × 2 (chaves e valores) × ${QWEN.bytesPerElement.value} bytes = 4 KiB, para cada token, em cada camada que atende.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'KV heads', 'pt-br': 'Cabeças KV' }, detail: { en: String(QWEN.kvHeads.value), 'pt-br': String(QWEN.kvHeads.value) }, pigment: 'accent' },
            { label: { en: 'Head dimension', 'pt-br': 'Dimensão da cabeça' }, detail: { en: String(QWEN.headDim.value), 'pt-br': String(QWEN.headDim.value) }, pigment: 'accent' },
            { label: { en: 'Keys and values', 'pt-br': 'Chaves e valores' }, detail: { en: '× 2', 'pt-br': '× 2' }, pigment: 'sonar' },
            { label: { en: 'bfloat16', 'pt-br': 'bfloat16' }, detail: { en: `× ${QWEN.bytesPerElement.value} B`, 'pt-br': `× ${QWEN.bytesPerElement.value} B` }, pigment: 'sonar' },
            { label: { en: '4 KiB per token', 'pt-br': '4 KiB por token' }, detail: { en: 'per layer', 'pt-br': 'por camada' }, pigment: 'kelp' },
          ],
        },
      },
      {
        label: { en: 'The wrong turn', 'pt-br': 'O erro clássico' },
        caption: {
          en: `Multiply by all ${QWEN.layers.value} layers and you get ${QWEN_COMMON_MISTAKE.kvKibPerTokenIfEveryLayerCached.value} KiB per token, or ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB at full context. This is wrong. It assumes every layer is an attention layer.`,
          'pt-br': `Multiplique pelas ${QWEN.layers.value} camadas e você obtém ${QWEN_COMMON_MISTAKE.kvKibPerTokenIfEveryLayerCached.value} KiB por token, ou ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB no contexto completo. Isso está errado: supõe que toda camada é de atenção.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Assumed: all layers cache', 'pt-br': 'Suposto: todas as camadas fazem cache' },
              detail: { en: `${QWEN.layers.value} layers → ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB`, 'pt-br': `${QWEN.layers.value} camadas → ${QWEN_COMMON_MISTAKE.kvGibFullContextIfEveryLayerCached.value} GiB` },
              pigment: 'coral',
              weight: QWEN.layers.value,
            },
          ],
        },
      },
      {
        label: { en: 'The real layout', 'pt-br': 'O layout real' },
        caption: {
          en: `Only ${QWEN.attentionLayers.value} layers are full attention; the other ${QWEN.deltaNetLayers.value} are Gated DeltaNet and cache nothing per token. That gives ${QWEN.kvKibPerToken.value} KiB per token and ${QWEN.kvGibFullContext.value} GiB at full context — beside a DeltaNet state of about ${QWEN.deltaNetStateMib.value} MiB that never grows.`,
          'pt-br': `Apenas ${QWEN.attentionLayers.value} camadas são de atenção completa; as outras ${QWEN.deltaNetLayers.value} são Gated DeltaNet e não fazem cache por token. Isso dá ${QWEN.kvKibPerToken.value} KiB por token e ${QWEN.kvGibFullContext.value} GiB no contexto completo — ao lado de um estado DeltaNet de cerca de ${QWEN.deltaNetStateMib.value} MiB que nunca cresce.`,
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'Gated DeltaNet layers', 'pt-br': 'Camadas Gated DeltaNet' },
              detail: { en: `${QWEN.deltaNetLayers.value} layers · ~${QWEN.deltaNetStateMib.value} MiB total, constant`, 'pt-br': `${QWEN.deltaNetLayers.value} camadas · ~${QWEN.deltaNetStateMib.value} MiB no total, constante` },
              pigment: 'kelp',
              weight: QWEN.deltaNetLayers.value,
            },
            {
              label: { en: 'Full-attention layers', 'pt-br': 'Camadas de atenção completa' },
              detail: { en: `${QWEN.attentionLayers.value} layers · ${QWEN.kvKibPerToken.value} KiB per token · ${QWEN.kvGibFullContext.value} GiB at full context`, 'pt-br': `${QWEN.attentionLayers.value} camadas · ${QWEN.kvKibPerToken.value} KiB por token · ${QWEN.kvGibFullContext.value} GiB no contexto completo` },
              pigment: 'sonar',
              weight: QWEN.attentionLayers.value,
            },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
