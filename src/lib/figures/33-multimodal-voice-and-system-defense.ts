/**
 * Figures for track 33 — Multimodal, Voice & System Defense.
 *
 * Voice latency totals come directly from `~/lib/engineering-math`.
 */
import { voiceTurnLatencyMs } from '~/lib/engineering-math'
import type { Figure } from './types'

const cascaded = voiceTurnLatencyMs({ vadEndpointMs: 300, sttFinalMs: 220, llmTtftMs: 380, ttsFirstAudioMs: 180, networkRttMs: 90 })
const streaming = voiceTurnLatencyMs({ vadEndpointMs: 180, sttFinalMs: 0, llmTtftMs: 210, ttsFirstAudioMs: 0, networkRttMs: 70 })

export const TRACK_33_FIGURES = {
  '33-4-voice-latency-stack': {
    lesson: '33.4-realtime-voice-agents-and-barge-in',
    title: {
      en: 'Cascaded voice pipelines cross 1,170 ms; native streaming holds under 500 ms',
      'pt-br': 'Pipelines de voz em cascata passam de 1.170 ms; streaming nativo fica abaixo de 500 ms',
    },
    caption: {
      en: `Waiting for full transcription and full synthesis adds ${cascaded - streaming} ms of silence (${cascaded} ms cascaded vs ${streaming} ms streaming speech-to-speech), breaking natural conversational turn-taking.`,
      'pt-br': `Esperar transcrição completa e síntese completa soma ${cascaded - streaming} ms de silêncio (${cascaded} ms em cascata contra ${streaming} ms em speech-to-speech por streaming), quebrando a cadência natural da conversa.`,
    },
    steps: [
      {
        label: { en: `Cascaded (${cascaded} ms)`, 'pt-br': `Em cascata (${cascaded} ms)` },
        caption: {
          en: 'Endpointing (300 ms) + STT finalization (220 ms) + LLM TTFT (380 ms) + TTS first audio (180 ms) + network RTT (90 ms) = 1,170 ms.',
          'pt-br': 'Detecção de fim de fala (300 ms) + finalização STT (220 ms) + TTFT do LLM (380 ms) + primeiro áudio TTS (180 ms) + RTT de rede (90 ms) = 1.170 ms.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'VAD endpointing', 'pt-br': 'Detecção de fim de fala (VAD)' }, detail: { en: '300 ms', 'pt-br': '300 ms' }, pigment: 'caution', weight: 300 },
            { label: { en: 'STT finalization', 'pt-br': 'Finalização STT' }, detail: { en: '220 ms', 'pt-br': '220 ms' }, pigment: 'accent', weight: 220 },
            { label: { en: 'LLM first token', 'pt-br': 'Primeiro token do LLM' }, detail: { en: '380 ms', 'pt-br': '380 ms' }, pigment: 'danger', weight: 380 },
            { label: { en: 'TTS first audio + RTT', 'pt-br': 'Primeiro áudio TTS + RTT' }, detail: { en: '270 ms', 'pt-br': '270 ms' }, pigment: 'caution', weight: 270 },
          ],
        },
      },
      {
        label: { en: `Native streaming (${streaming} ms)`, 'pt-br': `Streaming nativo (${streaming} ms)` },
        caption: {
          en: 'Semantic endpointing (180 ms) + native audio-to-audio first frame (210 ms) + WebRTC RTT (70 ms) = 460 ms, inside the 500 ms conversational target.',
          'pt-br': 'Endpointing semântico (180 ms) + primeiro quadro nativo áudio-a-áudio (210 ms) + RTT WebRTC (70 ms) = 460 ms, dentro da meta conversacional de 500 ms.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            { label: { en: 'Semantic VAD endpointing', 'pt-br': 'Endpointing semântico (VAD)' }, detail: { en: '180 ms', 'pt-br': '180 ms' }, pigment: 'accent', weight: 180 },
            { label: { en: 'Native speech-to-speech first frame', 'pt-br': 'Primeiro quadro nativo fala-a-fala' }, detail: { en: '210 ms', 'pt-br': '210 ms' }, pigment: 'success', weight: 210 },
            { label: { en: 'WebRTC transport RTT', 'pt-br': 'RTT de transporte WebRTC' }, detail: { en: '70 ms', 'pt-br': '70 ms' }, pigment: 'muted', weight: 70 },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
