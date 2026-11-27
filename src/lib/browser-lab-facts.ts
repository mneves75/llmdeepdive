/**
 * Qwen Local Lab (`examples/qwen-local-lab/`) — single numeric source of truth
 * for Track 34 ("A model in your browser").
 *
 * NONE of these values describe the main course model (Qwen3.8-27B). Track 34
 * teaches a small browser-resident system running Qwen3-0.6B; keeping its facts
 * here separates the two models structurally so no caption or prose can mix them.
 */

export type LabFactKind = 'config' | 'lock' | 'code' | 'derived' | 'measured-apple' | 'measured-cloud'

export interface LabFact {
  readonly value: number
  readonly unit: string
  readonly kind: LabFactKind
  readonly note: string
}

const fact = (value: number, unit: string, kind: LabFactKind, note: string): LabFact =>
  ({ value, unit, kind, note })

export const BROWSER_LAB = {
  // Model architecture checked after CPU GGUF load in src/inference-worker.js:271-278
  paramsBillions: fact(0.6, 'B parameters', 'config', 'Qwen3-0.6B marketed parameter count'),
  layers: fact(28, 'layers', 'config', 'validateCpuIdentity checks metadata.hparams.nLayer === 28'),
  hiddenSize: fact(1024, 'dimensions', 'config', 'validateCpuIdentity checks metadata.hparams.nEmbd === 1024'),
  contextTokens: fact(2048, 'tokens', 'code', 'CONTEXT_SIZE = 2048 in src/inference-worker.js:1'),

  // CPU GGUF artifact (Qwen/Qwen3-0.6B-GGUF @ 23749fefcc72300e3a2ad315e1317431b06b590a)
  cpuGgufBytes: fact(639_446_688, 'bytes', 'code', 'CPU_MODEL_SIZE in src/inference-worker.js:4'),
  cpuGgufMb: fact(639.45, 'MB', 'derived', '639,446,688 / 1,000,000 rounded to 2 decimals'),
  cpuGgufBase64Mb: fact(852.6, 'MB', 'derived', '639,446,688 * 4 / 3 / 1,000,000 (~853 MB if base64-embedded)'),

  // GPU MLC artifact (mlc-ai/Qwen3-0.6B-q4f16_1-MLC @ 8c14ce481d4c692769976ad52afea453a102df19)
  gpuWeightsMb: fact(335.37, 'MB', 'config', 'README.md: Qwen3-0.6B q4f16_1 MLC weight shards'),
  gpuAuxMb: fact(11.42, 'MB', 'config', 'README.md: tokenizer, config, and compiled library combined'),
  gpuModelLibBytes: fact(6_561_594, 'bytes', 'code', 'GPU_MODEL_LIB_SIZE in src/inference-worker.js:11 (commit 5b7251f3)'),
  gpuModelLibMb: fact(6.56, 'MB', 'derived', '6,561,594 / 1,000,000'),
  gpuMemoryEstimateGb: fact(1.4, 'GB', 'config', 'README.md: upstream GPU memory estimate at 4,096 context'),

  // Vendored runtime bundles from vendor/lock.json
  wllamaJsBytes: fact(273_580, 'bytes', 'lock', '@wllama/wllama@2.3.7 esm/index.js + worker base-URL patch'),
  wllamaSingleWasmBytes: fact(2_158_740, 'bytes', 'lock', '@wllama/wllama@2.3.7 single-thread/wllama.wasm'),
  wllamaMultiWasmBytes: fact(2_189_054, 'bytes', 'lock', '@wllama/wllama@2.3.7 multi-thread/wllama.wasm'),
  webllmJsBytes: fact(6_822_309, 'bytes', 'lock', '@mlc-ai/web-llm@0.2.89 lib/index.js'),
  hashWasmJsBytes: fact(216_120, 'bytes', 'lock', 'hash-wasm@4.13.0 dist/index.esm.min.js'),
  rawVendorPayloadBytes: fact(
    273_580 + 2_158_740 + 2_189_054 + 6_822_309 + 216_120,
    'bytes',
    'derived',
    'sum of the five embedded runtime/hasher binaries before base64 encoding (11,659,803 B)',
  ),
  builtHtmlBytes: fact(15_658_390, 'bytes', 'lock', 'scripts/build.py deterministic dist/index.html size (2026-11-26)'),
  builtHtmlMb: fact(15.66, 'MB', 'derived', '15,658,390 / 1,000,000'),

  // Runtime control-flow parameters from src/app.js & src/inference-worker.js
  maxCpuThreads: fact(4, 'threads', 'code', 'app.js:220 caps WASM threads at 4 when crossOriginIsolated'),
  cpuBatchSize: fact(128, 'tokens', 'code', 'inference-worker.js:312 n_batch: 128'),
  cpuTopK: fact(20, 'tokens', 'code', 'inference-worker.js:548 sampling.top_k: 20 (CPU only)'),
  topP: fact(0.8, 'probability', 'code', 'inference-worker.js:548,567 top_p: 0.8 on both backends'),
  stopFallbackMs: fact(3000, 'ms', 'code', 'app.js:301 terminates worker if cooperative stop does not finish'),
  gpuContextReserveBytes: fact(64, 'bytes', 'code', 'inference-worker.js:497 UTF-8 byte upper bound + 64 reserve'),
  contextSafetyMarginTokens: fact(8, 'tokens', 'code', 'inference-worker.js:499 promptTokens + maxTokens + 8 <= 2048'),

  // Environment-tested measurements: Apple M5 Pro (64 GiB), macOS 27.3, Chromium 156.0.8078.4, 2026-11-26
  appleCpuColdLoadSec: fact(40.93, 's', 'measured-apple', 'VERIFICATION.md: 639.45 MB download + streaming SHA-256 + Cache API save + 4-thread init'),
  appleCpuWarmReloadSec: fact(1.89, 's', 'measured-apple', 'VERIFICATION.md: Cache API read + full 639.45 MB SHA-256 re-verify + 4-thread init (0 HTTP requests)'),
  appleCpuDecodeTpsTurn1: fact(43.7, 'tok/s', 'measured-apple', 'VERIFICATION.md: 4 WASM threads, ORBIT-731 turn 1'),
  appleCpuDecodeTpsTurn2: fact(44.2, 'tok/s', 'measured-apple', 'VERIFICATION.md: 4 WASM threads, ORBIT-731 follow-up'),
  appleCpuDecodeTpsWarm: fact(52.1, 'tok/s', 'measured-apple', 'VERIFICATION.md: 4 WASM threads, 17+25 after warm reload'),
  appleCpuTtftTurn1Sec: fact(0.65, 's', 'measured-apple', 'VERIFICATION.md: 4 WASM threads, turn 1 TTFT'),
  appleCpuTtftTurn2Sec: fact(0.44, 's', 'measured-apple', 'VERIFICATION.md: 4 WASM threads, turn 2 TTFT (prefix cache reuse)'),
  appleGpuColdLoadSec: fact(26.87, 's', 'measured-apple', 'VERIFICATION.md: Metal-3 WebGPU shader-f16, pinned model_lib SHA-256 + Q4 shards'),
  appleGpuWarmReloadSec: fact(1.22, 's', 'measured-apple', 'VERIFICATION.md: Metal-3 WebGPU warm Cache API reload (0 HTTP requests)'),
  appleGpuDecodeTpsColdShader: fact(14.0, 'tok/s', 'measured-apple', 'VERIFICATION.md: Metal-3 WebGPU turn 1 (cold shader compile)'),
  appleGpuDecodeTpsWarmShader: fact(133.7, 'tok/s', 'measured-apple', 'VERIFICATION.md: Metal-3 WebGPU turn 2 (warm shaders)'),
  appleGpuTtftColdShaderSec: fact(1.82, 's', 'measured-apple', 'VERIFICATION.md: Metal-3 WebGPU turn 1 TTFT'),
  appleGpuTtftWarmShaderSec: fact(0.18, 's', 'measured-apple', 'VERIFICATION.md: Metal-3 WebGPU turn 2 TTFT'),

  // Environment-tested measurements: Cloud Chromium, 1 CPU/WASM thread (no cross-origin isolation), 2026-11-26
  cloudCpu1ThreadDecodeTps: fact(2.8, 'tok/s', 'measured-cloud', 'VERIFICATION.md: 1 WASM thread, ORBIT-731 two-turn rate'),
  cloudCpu1ThreadArithTps: fact(3.4, 'tok/s', 'measured-cloud', 'VERIFICATION.md: 1 WASM thread, pt-BR 17+25 turn'),
  cloudCpu1ThreadTtftTurn1Sec: fact(10.91, 's', 'measured-cloud', 'VERIFICATION.md: 1 WASM thread, turn 1 TTFT'),
  cloudCpu1ThreadTtftTurn2Sec: fact(6.92, 's', 'measured-cloud', 'VERIFICATION.md: 1 WASM thread, turn 2 TTFT'),
} as const satisfies Record<string, LabFact>

/** Transfer time in seconds for `bytes` over a link of `mbps` megabits/s (decimal). */
export function downloadSeconds(bytes: number, mbps: number): number {
  return Math.round(((bytes * 8) / (mbps * 1_000_000)) * 10) / 10
}
