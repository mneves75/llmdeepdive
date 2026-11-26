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
  /**
   * 33.1 replaces the prose walkthrough of OCR-free page retrieval and the two
   * dot-product bullets of the ColPali MaxSim worked example with one stepped
   * figure: the five-stage pipeline, then the 2×3 query-to-patch score table.
   */
  '33-1-colpali-maxsim': {
    lesson: '33.1-visual-document-rag-and-cross-modal-search',
    title: {
      en: 'ColPali indexes page patches and scores each query token against its best patch',
      'pt-br': 'O ColPali indexa patches da página e pontua cada token da consulta no seu melhor patch',
    },
    caption: {
      en: 'Step 1 follows a PDF page from rendered image to VLM answer without OCR. Step 2 shows the exact dot products for the worked 2-token query against a 3-patch page, where each row keeps only its maximum.',
      'pt-br': 'O passo 1 acompanha uma página PDF da imagem renderizada até a resposta do VLM sem OCR. O passo 2 mostra os produtos escalares exatos da consulta de 2 tokens contra uma página de 3 patches, em que cada linha guarda apenas o máximo.',
    },
    steps: [
      {
        label: { en: '1. OCR-free pipeline', 'pt-br': '1. Pipeline sem OCR' },
        caption: {
          en: 'Each page becomes 1,024 patch vectors (256 KiB in bf16, compressed 16× to 16 KiB in 1-bit binary) for fast CPU screening before exact MaxSim rescoring on the top 50 candidates.',
          'pt-br': 'Cada página vira 1.024 vetores de patch (256 KiB em bf16, comprimidos 16× para 16 KiB em binário de 1 bit) para triagem rápida em CPU antes da repontuação MaxSim exata nas 50 melhores candidatas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'PDF page image', 'pt-br': 'Imagem da página PDF' }, detail: { en: 'rendered directly; no OCR', 'pt-br': 'renderizada direto; sem OCR' }, pigment: 'muted' },
            { label: { en: 'Patch grid', 'pt-br': 'Grade de patches' }, detail: { en: '32 × 32 = 1,024 visual tiles', 'pt-br': '32 × 32 = 1.024 quadrantes visuais' }, pigment: 'accent' },
            { label: { en: '1-bit binary index', 'pt-br': 'Índice binário de 1 bit' }, detail: { en: '128 dims; 16 KiB/page (16× smaller)', 'pt-br': '128 dims; 16 KiB/página (16× menor)' }, pigment: 'accent' },
            { label: { en: 'Exact MaxSim rescore', 'pt-br': 'Repontuação MaxSim exata' }, detail: { en: 'bf16 vectors on top 50 pages', 'pt-br': 'vetores bf16 nas 50 melhores páginas' }, pigment: 'caution' },
            { label: { en: 'VLM generation', 'pt-br': 'Geração com VLM' }, detail: { en: 'reads top 3–5 full page images', 'pt-br': 'lê direto as 3 a 5 melhores páginas' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2. MaxSim score matrix', 'pt-br': '2. Matriz de escore MaxSim' },
        caption: {
          en: 'Row maxima are highlighted: q1 ("Brazil") peaks at 0.9 on p2 (country table row) and q2 ("margin") peaks at 0.8 on p1 (chart title), summing to MaxSim = 1.7.',
          'pt-br': 'Os máximos de cada linha ficam em destaque: q1 ("Brasil") atinge 0,9 em p2 (linha da tabela) e q2 ("margem") atinge 0,8 em p1 (título do gráfico), somando MaxSim = 1,7.',
        },
        body: {
          kind: 'grid',
          columns: [
            { en: 'p1: chart title', 'pt-br': 'p1: título do gráfico' },
            { en: 'p2: table row', 'pt-br': 'p2: linha da tabela' },
            { en: 'p3: footer', 'pt-br': 'p3: rodapé' },
          ],
          rows: [
            { en: 'q1 ("Brazil")', 'pt-br': 'q1 ("Brasil")' },
            { en: 'q2 ("margin")', 'pt-br': 'q2 ("margem")' },
          ],
          cells: [
            [0.2, 0.9, 0.4],
            [0.8, 0.3, 0.5],
          ],
          bins: 4,
        },
      },
    ],
  },

  /**
   * 33.2 ties together the three quantitative levers of image/video generation:
   * 48× VAE latent compression, the straight 1D Flow Matching trajectory from
   * x0 = -1.0 to x1 = 3.0, and the H100 latency curve for standard CFG vs
   * guidance-distilled checkpoints (35 ms/pass + 80 ms VAE decode).
   */
  '33-2-flow-matching-and-cfg': {
    lesson: '33.2-diffusion-and-flow-matching-generation',
    title: {
      en: 'Latent compression, straight Flow Matching paths, and the CFG latency curve',
      'pt-br': 'Compressão latente, trajetórias retas no Flow Matching e a curva de latência do CFG',
    },
    caption: {
      en: 'Modern generators shrink pixels 48× with a VAE before iterating, follow constant-velocity straight lines in Flow Matching, and cut H100 latency 6× by distilling Classifier-Free Guidance into fewer steps.',
      'pt-br': 'Geradores modernos encolhem pixels 48× com um VAE antes de iterar, seguem linhas retas de velocidade constante no Flow Matching e reduzem a latência em H100 em 6× destilando o Classifier-Free Guidance em menos passos.',
    },
    steps: [
      {
        label: { en: '1. 48× latent pipeline', 'pt-br': '1. Pipeline latente 48×' },
        caption: {
          en: 'All iterative denoising runs inside the 64 × 64 × 4 latent grid (16,384 values instead of 786,432 RGB values); the VAE decoder runs once at the end.',
          'pt-br': 'Todo o refinamento iterativo ocorre na grade latente 64 × 64 × 4 (16.384 valores em vez de 786.432 valores RGB); o decodificador VAE roda uma única vez no fim.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Raw RGB image', 'pt-br': 'Imagem RGB bruta' }, detail: { en: '512 × 512 × 3 = 786,432 values', 'pt-br': '512 × 512 × 3 = 786.432 valores' }, pigment: 'muted' },
            { label: { en: 'VAE encoder', 'pt-br': 'Codificador VAE' }, detail: { en: '8× down per side (48× smaller)', 'pt-br': 'redução 8× por lado (48× menor)' }, pigment: 'accent' },
            { label: { en: 'Latent tensor', 'pt-br': 'Tensor latente' }, detail: { en: '64 × 64 × 4 = 16,384 values', 'pt-br': '64 × 64 × 4 = 16.384 valores' }, pigment: 'accent' },
            { label: { en: 'Iterative DiT', 'pt-br': 'DiT iterativo' }, detail: { en: 'N denoising steps in latent space', 'pt-br': 'N passos de denoising no espaço latente' }, pigment: 'caution' },
            { label: { en: 'VAE decoder (1×)', 'pt-br': 'Decodificador VAE (1×)' }, detail: { en: 'maps clean latent back to RGB', 'pt-br': 'converte o latente limpo de volta a RGB' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2. Linear Flow Matching', 'pt-br': '2. Flow Matching linear' },
        caption: {
          en: 'From noise x0 = -1.0 to target x1 = 3.0, the linear path x_t = (1 - t)x0 + t·x1 crosses 0.0 at t = 0.25 with constant velocity v = 4.0.',
          'pt-br': 'Do ruído x0 = -1,0 ao alvo x1 = 3,0, o caminho linear x_t = (1 - t)x0 + t·x1 passa por 0,0 em t = 0,25 com velocidade constante v = 4,0.',
        },
        body: {
          kind: 'plot',
          xAxis: { label: { en: 'Interpolation time t', 'pt-br': 'Tempo de interpolação t' }, scale: 'linear', min: 0, max: 1 },
          yAxis: { label: { en: 'State x_t', 'pt-br': 'Estado x_t' }, scale: 'linear', min: -1.5, max: 3.5 },
          series: [
            {
              label: { en: 'Straight path (constant v = 4.0)', 'pt-br': 'Trajetória reta (v constante = 4,0)' },
              pigment: 'accent',
              points: [[0, -1], [0.25, 0], [0.5, 1], [0.75, 2], [1, 3]],
              marks: [
                { at: [0, -1], label: { en: 'x0 = -1.0 (noise)', 'pt-br': 'x0 = -1,0 (ruído)' } },
                { at: [0.25, 0], label: { en: 't = 0.25 → x = 0.0', 'pt-br': 't = 0,25 → x = 0,0' } },
                { at: [1, 3], label: { en: 'x1 = 3.0 (data)', 'pt-br': 'x1 = 3,0 (dado)' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: '3. Steps × CFG latency', 'pt-br': '3. Latência de passos × CFG' },
        caption: {
          en: 'At 35 ms per DiT pass on an H100 plus 80 ms VAE decode, 30 steps with standard 2× CFG take 2,180 ms, while 8 guidance-distilled 1× steps take 360 ms—a 6× speedup.',
          'pt-br': 'A 35 ms por passagem DiT em uma H100 mais 80 ms do VAE, 30 passos com CFG padrão 2× levam 2.180 ms, enquanto 8 passos destilados 1× levam 360 ms—ganho de 6×.',
        },
        body: {
          kind: 'plot',
          xAxis: { label: { en: 'Denoising steps (N)', 'pt-br': 'Passos de denoising (N)' }, scale: 'linear', min: 0, max: 30 },
          yAxis: { label: { en: 'Total latency', 'pt-br': 'Latência total' }, scale: 'linear', min: 0, max: 2500, unit: 'ms' },
          series: [
            {
              label: { en: 'Standard CFG (2× passes/step + 80 ms VAE)', 'pt-br': 'CFG padrão (2× passagens/passo + 80 ms VAE)' },
              pigment: 'danger',
              points: [[4, 360], [8, 640], [20, 1480], [30, 2180]],
              marks: [{ at: [30, 2180], label: { en: '30 steps + CFG: 2,180 ms', 'pt-br': '30 passos + CFG: 2.180 ms' } }],
            },
            {
              label: { en: 'Guidance-distilled (1× pass/step + 80 ms VAE)', 'pt-br': 'Guidance destilado (1× passagem/passo + 80 ms VAE)' },
              pigment: 'success',
              points: [[4, 220], [8, 360], [20, 780], [30, 1130]],
              marks: [{ at: [8, 360], label: { en: '8 steps distilled: 360 ms', 'pt-br': '8 passos destilados: 360 ms' } }],
            },
          ],
        },
      },
    ],
  },

  /**
   * 33.3 contrasts Whisper's continuous log-Mel spectrogram pipeline with
   * EnCodec's discrete Residual Vector Quantization (RVQ) pipeline, then plots
   * how keeping 1 to 8 RVQ codebooks scales bitrate linearly at 75 frames/s.
   */
  '33-3-audio-codecs-and-rvq': {
    lesson: '33.3-audio-tokens-whisper-stt-and-tts',
    title: {
      en: 'Two ways to compress waveforms: Whisper spectrograms versus EnCodec RVQ tokens',
      'pt-br': 'Dois caminhos para comprimir áudio: espectrogramas do Whisper versus tokens RVQ do EnCodec',
    },
    caption: {
      en: 'Raw audio has tens of thousands of samples per second. Whisper compresses 30 s into 1,500 continuous encoder frames; EnCodec quantizes 24 kHz sound into discrete codebook tokens whose bitrate scales linearly with active codebooks.',
      'pt-br': 'Áudio bruto tem dezenas de milhares de amostras por segundo. O Whisper comprime 30 s em 1.500 quadros contínuos no codificador; o EnCodec quantiza som de 24 kHz em tokens discretos cuja taxa de bits escala linearmente com os codebooks ativos.',
    },
    steps: [
      {
        label: { en: '1. Whisper (continuous)', 'pt-br': '1. Whisper (contínuo)' },
        caption: {
          en: 'A 30-second clip at 16 kHz (480,000 samples) shrinks to 3,000 log-Mel frames (80 bands), then 1,500 encoder states at 50 Hz that the text decoder cross-attends over.',
          'pt-br': 'Um clipe de 30 segundos a 16 kHz (480.000 amostras) encolhe para 3.000 quadros log-Mel (80 bandas) e depois 1.500 estados no codificador a 50 Hz sobre os quais o decodificador faz cross-attention.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '16 kHz waveform', 'pt-br': 'Onda a 16 kHz' }, detail: { en: '480,000 samples per 30 s', 'pt-br': '480.000 amostras em 30 s' }, pigment: 'muted' },
            { label: { en: 'Log-Mel spectrogram', 'pt-br': 'Espectrograma log-Mel' }, detail: { en: '25 ms window, 10 ms stride → 3,000 frames', 'pt-br': 'janela 25 ms, passo 10 ms → 3.000 quadros' }, pigment: 'accent' },
            { label: { en: '2 conv layers', 'pt-br': '2 camadas conv.' }, detail: { en: 'stride 2 → 1,500 states (50 Hz)', 'pt-br': 'stride 2 → 1.500 estados (50 Hz)' }, pigment: 'accent' },
            { label: { en: 'Multitask decoder', 'pt-br': 'Decodificador multitarefa' }, detail: { en: 'prefix tokens + BPE text output', 'pt-br': 'tokens de prefixo + saída de texto BPE' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '2. EnCodec RVQ (discrete)', 'pt-br': '2. EnCodec RVQ (discreto)' },
        caption: {
          en: '320× downsampling yields 75 frames/s. Codebook 1 captures coarse phonetics and pitch; each deeper codebook quantizes the leftover residual error across K = 8 codebooks of 1,024 entries (10 bits each).',
          'pt-br': 'A redução de 320× gera 75 quadros/s. O codebook 1 captura fonética e entonação principais; cada codebook seguinte quantiza o erro residual restante em K = 8 codebooks de 1.024 entradas (10 bits cada).',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: '24 kHz waveform', 'pt-br': 'Onda a 24 kHz' }, detail: { en: '24,000 samples/second', 'pt-br': '24.000 amostras/segundo' }, pigment: 'muted' },
            { label: { en: '320× conv encoder', 'pt-br': 'Codificador conv. 320×' }, detail: { en: '75 continuous frames/s', 'pt-br': '75 quadros contínuos/s' }, pigment: 'accent' },
            { label: { en: 'Codebook 1 (c1)', 'pt-br': 'Codebook 1 (c1)' }, detail: { en: '1,024 centroids; coarse speech & pitch', 'pt-br': '1.024 centróides; fala e entonação' }, pigment: 'caution' },
            { label: { en: 'Codebooks 2–8', 'pt-br': 'Codebooks 2 a 8' }, detail: { en: 'quantize residual error r = z - e(c)', 'pt-br': 'quantizam o erro residual r = z - e(c)' }, pigment: 'accent' },
            { label: { en: 'Discrete stream', 'pt-br': 'Fluxo discreto' }, detail: { en: '600 tokens/s at 6.0 kbps', 'pt-br': '600 tokens/s a 6,0 kbps' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: '3. Variable bitrate', 'pt-br': '3. Taxa de bits variável' },
        caption: {
          en: 'Because every codebook adds 75 tokens/s × 10 bits = 0.75 kbps, dropping upper codebooks scales cleanly from 6.0 kbps (K = 8) down to 0.75 kbps (K = 1) without retraining.',
          'pt-br': 'Como cada codebook soma 75 tokens/s × 10 bits = 0,75 kbps, descartar codebooks superiores reduz a taxa de 6,0 kbps (K = 8) até 0,75 kbps (K = 1) sem retreinar.',
        },
        body: {
          kind: 'plot',
          xAxis: { label: { en: 'Active RVQ codebooks (K)', 'pt-br': 'Codebooks RVQ ativos (K)' }, scale: 'linear', min: 0, max: 8 },
          yAxis: { label: { en: 'Audio bitrate', 'pt-br': 'Taxa de bits de áudio' }, scale: 'linear', min: 0, max: 6.5, unit: 'kbps' },
          series: [
            {
              label: { en: 'EnCodec at 75 frames/s, 10 bits/token', 'pt-br': 'EnCodec a 75 quadros/s, 10 bits/token' },
              pigment: 'accent',
              points: [[1, 0.75], [2, 1.5], [4, 3], [8, 6]],
              marks: [
                { at: [1, 0.75], label: { en: 'K=1: 75 tok/s (0.75 kbps)', 'pt-br': 'K=1: 75 tok/s (0,75 kbps)' } },
                { at: [8, 6], label: { en: 'K=8: 600 tok/s (6.0 kbps)', 'pt-br': 'K=8: 600 tok/s (6,0 kbps)' } },
              ],
            },
          ],
        },
      },
    ],
  },

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

  /**
   * 33.5 compares weight memory across 1–100 enterprise tenants (54 GB base +
   * 60 MB LoRA per tenant) and then traces how one S-LoRA GPU serves a mixed
   * batch through Unified Paging and parallel adapter deltas.
   */
  '33-5-slora-multi-adapter': {
    lesson: '33.5-applied-fine-tuning-and-engineering-defense',
    title: {
      en: 'S-LoRA shrinks 100-tenant weight memory 90×—from 5,400 GB to 60 GB',
      'pt-br': 'O S-LoRA reduz a memória de pesos de 100 tenants em 90×—de 5.400 GB para 60 GB',
    },
    caption: {
      en: 'Step 1 compares merging one 54 GB base copy per tenant against sharing one base with 60 MB rank-16 adapters. Step 2 shows how one 80 GB GPU serves a mixed tenant batch in parallel.',
      'pt-br': 'O passo 1 compara fundir uma cópia de 54 GB por tenant contra compartilhar uma base com adaptadores de 60 MB (posto 16). O passo 2 mostra como uma GPU de 80 GB atende um lote misto de tenants em paralelo.',
    },
    steps: [
      {
        label: { en: '1. Weight memory vs tenants', 'pt-br': '1. Memória de pesos vs tenants' },
        caption: {
          en: '100 merged copies need 5,400 GB (~68 GPUs of 80 GB). S-LoRA holds 54 GB base + 6 GB for 100 adapters = 60 GB, fitting on a single 80 GB GPU.',
          'pt-br': '100 cópias fundidas pedem 5.400 GB (~68 GPUs de 80 GB). O S-LoRA guarda 54 GB de base + 6 GB para 100 adaptadores = 60 GB, cabendo em uma única GPU de 80 GB.',
        },
        body: {
          kind: 'plot',
          xAxis: { label: { en: 'Enterprise tenants', 'pt-br': 'Tenants corporativos' }, scale: 'linear', min: 0, max: 100 },
          yAxis: { label: { en: 'Total weight memory', 'pt-br': 'Memória total de pesos' }, scale: 'linear', min: 0, max: 6000, unit: 'GB' },
          series: [
            {
              label: { en: 'Merged full copies (54 GB/tenant)', 'pt-br': 'Cópias completas fundidas (54 GB/tenant)' },
              pigment: 'danger',
              points: [[1, 54], [25, 1350], [50, 2700], [100, 5400]],
              marks: [{ at: [100, 5400], label: { en: '100 copies: 5,400 GB (~68 GPUs)', 'pt-br': '100 cópias: 5.400 GB (~68 GPUs)' } }],
            },
            {
              label: { en: 'S-LoRA (54 GB base + 60 MB/tenant)', 'pt-br': 'S-LoRA (base de 54 GB + 60 MB/tenant)' },
              pigment: 'success',
              points: [[1, 54.06], [25, 55.5], [50, 57], [100, 60]],
              marks: [{ at: [100, 60], label: { en: 'S-LoRA: 60 GB (1 GPU, 90× less)', 'pt-br': 'S-LoRA: 60 GB (1 GPU, 90× menos)' } }],
            },
          ],
        },
      },
      {
        label: { en: '2. Mixed-batch serving', 'pt-br': '2. Serving em lote misto' },
        caption: {
          en: 'The shared base runs once for the entire batch while Unified Paging brings active adapters from host RAM and custom kernels apply each request’s A and B adapter deltas in parallel.',
          'pt-br': 'A base compartilhada roda uma vez para o lote inteiro enquanto o Unified Paging traz adaptadores ativos da RAM do host e kernels em lote aplicam os deltas A e B de cada requisição em paralelo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Mixed tenant batch', 'pt-br': 'Lote misto de tenants' }, detail: { en: 'each request tags its adapter_id', 'pt-br': 'cada pedido marca seu adapter_id' }, pigment: 'muted' },
            { label: { en: 'Shared frozen base', 'pt-br': 'Base congelada compartilhada' }, detail: { en: '54 GB in GPU VRAM, runs once', 'pt-br': '54 GB na VRAM da GPU, roda uma vez' }, pigment: 'accent' },
            { label: { en: 'Unified Paging pool', 'pt-br': 'Pool de Unified Paging' }, detail: { en: 'active 60 MB adapters paged from host RAM', 'pt-br': 'adaptadores ativos de 60 MB paginados da RAM' }, pigment: 'caution' },
            { label: { en: 'Parallel adapter deltas', 'pt-br': 'Deltas de adaptador em paralelo' }, detail: { en: 'batched kernels add each tenant’s A, B update', 'pt-br': 'kernels em lote somam o delta A, B de cada tenant' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
