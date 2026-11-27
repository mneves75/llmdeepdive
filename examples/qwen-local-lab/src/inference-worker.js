const CONTEXT_SIZE = 2048;
// Holds the CPU GGUF and the pinned GPU model library; WebLLM keeps the GPU weights in its own caches.
const MODEL_CACHE_NAME = "qwen-local-lab-model-v1";
const CPU_MODEL_SIZE = 639446688;
const CPU_MODEL_URL = "https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf";
const CPU_MODEL_SHA256 = "9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031";
const GPU_MODEL_ID = "Qwen3-0.6B-q4f16_1-MLC";
const GPU_MODEL_URL = "https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC/resolve/8c14ce481d4c692769976ad52afea453a102df19/";
// WebLLM 0.2.89's prebuilt record loads this file from the mutable main branch; this pins the same bytes to a commit.
const GPU_MODEL_LIB_URL = "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/5b7251f3bdce957be2a7bf73a6f6c560d9874df4/web-llm-models/v0_2_87/base/Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm";
const GPU_MODEL_LIB_SIZE = 6561594;
const GPU_MODEL_LIB_SHA256 = "b277797fff1240baaba6782b7ba671834f861022b9283c93fcb4bb7c06d0373d";
const DEFAULT_SYSTEM = "You are a helpful assistant. Answer clearly and concisely.";
const encoder = new TextEncoder();
const quietLogger = { log() {}, debug() {}, info() {}, warn() {}, error() {} };

let runtime = null;
let backend = null;
let operation = null;
let webllmModule = null;
let webllmConfig = null;
let modelCacheStatus = 'unknown';
let modelCacheWarning = '';

const nativeFetch = self.fetch.bind(self);
self.fetch = async (resource, options) => {
  const value = resource instanceof Request ? resource.url : String(resource);
  const url = new URL(value, self.location.href);
  if (['http:', 'https:'].includes(url.protocol) && operation?.kind !== 'load') {
    throw new AppError('Network access is disabled during local generation. Reload the model if an asset is missing.', 'NETWORK_DURING_GENERATION');
  }
  return nativeFetch(resource instanceof Request ? resource : url.href, options);
};

class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

function reply(id, type, details = {}) {
  self.postMessage({ id, type, ...details });
}

function progress(op, value, text) {
  if (operation === op && !op.stopped) {
    reply(op.id, "progress", {
      progress: Math.min(1, Math.max(0, Number(value) || 0)),
      text,
    });
  }
}

function assertActive(op) {
  if (op.stopped || op.controller.signal.aborted) {
    throw new DOMException("Operation cancelled.", "AbortError");
  }
}

function beginOperation(message) {
  if (operation) {
    throw new AppError("Another operation is still running. Stop it or wait for it to finish.", "BUSY");
  }
  const op = {
    id: message.id,
    kind: message.type,
    controller: new AbortController(),
    stopped: false,
    text: "",
    tokens: null,
    firstTokenAt: null,
    startedAt: performance.now(),
    promptTokens: null,
    decodeTps: null,
    finishReason: "stop",
  };
  operation = op;
  return op;
}

function finishOperation(op) {
  if (operation === op) operation = null;
}

function errorDetails(error, op) {
  if (op?.stopped || error?.name === "AbortError" || error?.name === "WllamaAbortError") {
    return { code: "ABORTED", message: "Operation stopped. You can load the model again." };
  }
  if (error instanceof AppError) return { code: error.code, message: error.message };
  const message = String(error?.message || error || "Unknown error");
  if (/out of memory|allocation|allocate|memory access|memory limit|wasm memory|maximum memory/i.test(message)) {
    return {
      code: "MEMORY",
      message: "The browser could not allocate enough memory. Close other heavy tabs, then reload the model. CPU mode needs room for the model, working memory and the context cache.",
    };
  }
  if (/device.{0,12}lost|GPUDevice|WebGPU|shader-f16|adapter/i.test(message)) {
    return {
      code: "GPU_UNAVAILABLE",
      message: "The GPU runtime could not start or the GPU device was lost. Try CPU / WebAssembly mode, or update your browser and graphics driver.",
    };
  }
  if (/fetch|network|load failed|connection|download/i.test(message)) {
    return {
      code: "NETWORK",
      message: "A model asset could not be downloaded. Check your connection and whether Hugging Face and raw.githubusercontent.com are allowed, then retry. A downloaded local GGUF can also be used in CPU mode.",
    };
  }
  if (/context|n_ctx|KV cache/i.test(message)) {
    return { code: "CONTEXT", message: "The conversation exceeded the available context. Start a new chat or shorten the current message." };
  }
  return {
    code: "RUNTIME",
    message: "The local inference runtime failed. Reload the model and try a shorter prompt. If the error repeats in GPU mode, select CPU / WebAssembly.",
  };
}

function requireAsset(assets, name) {
  const value = assets?.[name];
  if (typeof value !== "string" || !value.startsWith("blob:")) {
    throw new AppError("An embedded runtime asset is missing. Reload this page and try again.", "ASSET_MISSING");
  }
  return value;
}

async function disposeRuntime() {
  const current = runtime;
  const currentBackend = backend;
  runtime = null;
  backend = null;
  if (current) {
    if (currentBackend === "wasm") await current.exit();
    else await current.unload();
  }
}

function validateWasmSupport() {
  const simd = [0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11];
  const exceptions = [0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,8,1,6,0,6,64,25,11,11];
  if (typeof WebAssembly === "undefined" ||
      !WebAssembly.validate(new Uint8Array(simd)) ||
      !WebAssembly.validate(new Uint8Array(exceptions))) {
    throw new AppError("This browser does not support the WebAssembly SIMD and exception features required by CPU mode. Use an up-to-date desktop browser.", "WASM_UNSUPPORTED");
  }
}

async function validateGguf(blob, expectedSize = null) {
  if (!(blob instanceof Blob) || blob.size < 16 ||
      (expectedSize !== null && blob.size !== expectedSize)) {
    throw new AppError("The model file is incomplete or has an unexpected size. Download the GGUF again.", "INVALID_MODEL");
  }
  const magic = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (magic[0] !== 71 || magic[1] !== 71 || magic[2] !== 85 || magic[3] !== 70) {
    throw new AppError("The selected file is not a GGUF model. Select a Qwen3-0.6B .gguf file.", "INVALID_MODEL");
  }
}

async function sha256Hasher(assets) {
  const { createSHA256 } = await import(requireAsset(assets, "hashwasm"));
  return createSHA256();
}

// Hash the model chunk by chunk as it streams, so verification never holds a second model-sized buffer.
function hashingStream(op, hasher, onProgress) {
  let loaded = 0;
  let lastUpdate = 0;
  return new TransformStream({
    transform(chunk, controller) {
      assertActive(op);
      loaded += chunk.byteLength;
      if (loaded > CPU_MODEL_SIZE) {
        throw new AppError("The model download has an unexpected size. Please retry.", "INVALID_MODEL");
      }
      hasher.update(chunk);
      const now = performance.now();
      if (now - lastUpdate > 120 || loaded === CPU_MODEL_SIZE) {
        lastUpdate = now;
        onProgress(loaded);
      }
      controller.enqueue(chunk);
    },
  });
}

function assertModelDigest(hasher) {
  if (hasher.digest("hex") !== CPU_MODEL_SHA256) {
    throw new AppError("The model file does not match the official SHA-256 checksum, so it was not used. Download it again.", "INVALID_MODEL");
  }
}

async function obtainCpuModel(op, assets) {
  let cache = null;
  modelCacheStatus = 'unavailable';
  modelCacheWarning = 'Browser storage is unavailable; reloading may need another download.';
  try {
    if (globalThis.caches) {
      cache = await caches.open(MODEL_CACHE_NAME);
      const saved = await cache.match(CPU_MODEL_URL);
      if (saved) {
        progress(op, 0.15, "Reading Qwen3 from this browser's model cache…");
        const blob = await saved.blob();
        const hasher = await sha256Hasher(assets);
        assertActive(op);
        try {
          await validateGguf(blob, CPU_MODEL_SIZE);
          await blob.stream().pipeThrough(hashingStream(op, hasher, loaded => progress(op, 0.15 + 0.6 * loaded / CPU_MODEL_SIZE,
            `Verifying the cached model's SHA-256 · ${(loaded / 1000000).toFixed(1)} / 639.4 MB`))).pipeTo(new WritableStream());
          assertModelDigest(hasher);
          modelCacheStatus = 'hit';
          modelCacheWarning = '';
          progress(op, 0.8, "Cached model verified. Preparing the CPU runtime…");
          return blob;
        } catch {
          assertActive(op);
          await cache.delete(CPU_MODEL_URL);
        }
      }
    }
  } catch (error) {
    assertActive(op);
    cache = null;
    modelCacheWarning = `Browser cache is unavailable (${error.name || 'storage error'}). Reloading needs another download or a local file.`;
    console.warn(modelCacheWarning);
    progress(op, 0.02, "Browser caching is unavailable. The model will load for this session.");
  }

  const hasher = await sha256Hasher(assets);
  assertActive(op);
  progress(op, 0.03, "Downloading Qwen3 Q8 · 639 MB. The model stays on this device.");
  const response = await fetch(CPU_MODEL_URL, {
    signal: op.controller.signal,
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok || !response.body) {
    throw new AppError(`The model download failed (HTTP ${response.status}). Check your connection and retry.`, "NETWORK");
  }
  // Let the browser collect the stream into a Blob instead of retaining all chunks in the JS heap.
  const body = response.body.pipeThrough(hashingStream(op, hasher, loaded => progress(op, 0.03 + 0.72 * loaded / CPU_MODEL_SIZE,
    `Downloading model · ${(loaded / 1000000).toFixed(1)} / 639.4 MB`)));
  const blob = await new Response(body).blob();
  assertActive(op);
  await validateGguf(blob, CPU_MODEL_SIZE);
  progress(op, 0.76, "Checking the model's SHA-256 checksum…");
  assertModelDigest(hasher);
  if (cache) {
    progress(op, 0.77, "Saving the model in this browser for later loads…");
    try {
      await cache.put(CPU_MODEL_URL, new Response(blob, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(blob.size),
        },
      }));
      modelCacheStatus = 'saved';
      modelCacheWarning = '';
    } catch (error) {
      modelCacheWarning = `The browser could not retain the model cache (${error.name || 'storage error'}). Use a local GGUF to avoid another download.`;
      console.warn(modelCacheWarning);
      progress(op, 0.79, "Model downloaded. Storage is full or restricted, so this session will not be cached.");
    }
  }
  assertActive(op);
  return blob;
}

function validateCpuIdentity(engine) {
  const metadata = engine.getModelMetadata();
  if (metadata.meta?.["general.architecture"] !== "qwen3" ||
      Number(metadata.hparams?.nLayer) !== 28 ||
      Number(metadata.hparams?.nEmbd) !== 1024) {
    throw new AppError("This page supports Qwen3-0.6B GGUF models. The selected model has a different architecture or size.", "WRONG_MODEL");
  }
}

async function loadCpu(message, op) {
  validateWasmSupport();
  const moduleUrl = requireAsset(message.assets, "wllama");
  const singleWasm = requireAsset(message.assets, "singleWasm");
  const multiWasm = requireAsset(message.assets, "multiWasm");
  progress(op, 0.01, "Starting the embedded WebAssembly runtime…");
  const { Wllama } = await import(moduleUrl);
  assertActive(op);
  let model;
  if (message.file) {
    modelCacheStatus = 'local-file';
    modelCacheWarning = '';
    progress(op, 0.1, "Checking the local GGUF file…");
    await validateGguf(message.file);
    model = message.file;
  } else {
    model = await obtainCpuModel(op, message.assets);
  }
  assertActive(op);
  const requestedThreads = Number.isInteger(message.threads) ? message.threads : 4;
  const threads = self.crossOriginIsolated
    ? Math.max(1, Math.min(requestedThreads, navigator.hardwareConcurrency || 1, 16))
    : 1;
  runtime = new Wllama({
    "single-thread/wllama.wasm": singleWasm,
    "multi-thread/wllama.wasm": multiWasm,
  }, { suppressNativeLog: true, logger: quietLogger });
  backend = "wasm";
  progress(op, 0.84, `Loading Qwen3 into memory · ${threads} CPU thread${threads === 1 ? "" : "s"}…`);
  await runtime.loadModel([model], {
    n_ctx: CONTEXT_SIZE,
    n_threads: threads,
    n_batch: 128,
  });
  assertActive(op);
  validateCpuIdentity(runtime);
  const actualContext = runtime.getLoadedContextInfo().n_ctx;
  if (actualContext < CONTEXT_SIZE) {
    throw new AppError("The runtime could not allocate the requested context. Free some browser memory and retry.", "MEMORY");
  }
  progress(op, 1, "Qwen3 is ready. Prompts are processed on your CPU.");
  reply(op.id, "loaded", {
    backend,
    modelId: message.file ? "local/Qwen3-0.6B-GGUF" : "Qwen/Qwen3-0.6B-GGUF:Q8_0",
    label: message.file ? "Qwen3 0.6B · local GGUF" : "Qwen3 0.6B · Q8_0",
    threads: runtime.getNumThreads(),
    contextSize: CONTEXT_SIZE,
    cacheStatus: modelCacheStatus,
    cacheWarning: modelCacheWarning,
  });
}

async function isPinnedModelLibrary(bytes, assets) {
  if (bytes.byteLength !== GPU_MODEL_LIB_SIZE) return false;
  const hasher = await sha256Hasher(assets);
  hasher.update(bytes);
  return hasher.digest("hex") === GPU_MODEL_LIB_SHA256;
}

async function obtainModelLibrary(op, assets) {
  let cache = null;
  try {
    if (globalThis.caches) {
      cache = await caches.open(MODEL_CACHE_NAME);
      const saved = await cache.match(GPU_MODEL_LIB_URL);
      if (saved) {
        const bytes = new Uint8Array(await saved.arrayBuffer());
        if (await isPinnedModelLibrary(bytes, assets)) return bytes;
        await cache.delete(GPU_MODEL_LIB_URL);
      }
    }
  } catch {
    assertActive(op);
  }
  assertActive(op);
  progress(op, 0.02, "Downloading the pinned GPU model library · 6.6 MB…");
  const response = await fetch(GPU_MODEL_LIB_URL, {
    signal: op.controller.signal,
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    throw new AppError(`The GPU model library download failed (HTTP ${response.status}). Check your connection and retry.`, "NETWORK");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  assertActive(op);
  if (!(await isPinnedModelLibrary(bytes, assets))) {
    throw new AppError("The GPU model library does not match its pinned SHA-256, so it was not used. Retry, or select CPU / WebAssembly mode.", "INVALID_MODEL");
  }
  try {
    await cache?.put(GPU_MODEL_LIB_URL, new Response(bytes, { headers: { "Content-Type": "application/wasm" } }));
  } catch {
    // Not retaining the library only means the next GPU load downloads it again.
  }
  return bytes;
}

async function getWebllm(assets) {
  if (!webllmModule) webllmModule = await import(requireAsset(assets, "webllm"));
  if (!webllmConfig) {
    const record = webllmModule.prebuiltAppConfig.model_list.find(item => item.model_id === GPU_MODEL_ID);
    if (!record) throw new AppError("The embedded GPU runtime does not include the selected model.", "ASSET_MISSING");
    webllmConfig = {
      cacheBackend: "cache",
      model_list: [{ ...record, model: GPU_MODEL_URL }],
    };
  }
  return webllmModule;
}

async function loadGpu(message, op) {
  if (message.file) {
    throw new AppError("Local GGUF files use CPU / WebAssembly mode. Select CPU mode to load this file.", "WRONG_BACKEND");
  }
  if (!navigator.gpu) {
    throw new AppError("WebGPU is unavailable in this browser. Select CPU / WebAssembly mode, or use a supported browser over HTTPS or localhost.", "GPU_UNAVAILABLE");
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  assertActive(op);
  if (!adapter || !adapter.features.has("shader-f16")) {
    throw new AppError("This GPU does not expose the shader-f16 feature required by the embedded Qwen3 GPU model. Select CPU / WebAssembly mode.", "GPU_UNAVAILABLE");
  }
  progress(op, 0.01, "Preparing the GPU runtime. First load downloads about 350 MB of model assets.");
  const library = await obtainModelLibrary(op, message.assets);
  const webllm = await getWebllm(message.assets);
  assertActive(op);
  // WebLLM fetches a non-http(s) model_lib with plain fetch() and skips its URL-keyed cache,
  // so it runs exactly the bytes verified above.
  const libraryUrl = URL.createObjectURL(new Blob([library], { type: "application/wasm" }));
  webllmConfig.model_list[0].model_lib = libraryUrl;
  runtime = new webllm.MLCEngine({
    appConfig: webllmConfig,
    logLevel: "SILENT",
    initProgressCallback(report) {
      progress(op, report.progress, report.text);
    },
  });
  backend = "webgpu";
  try {
    await runtime.reload(GPU_MODEL_ID, { context_window_size: CONTEXT_SIZE });
  } finally {
    URL.revokeObjectURL(libraryUrl);
  }
  assertActive(op);
  progress(op, 1, "Qwen3 is ready. Prompts are processed on your GPU.");
  reply(op.id, "loaded", {
    backend,
    modelId: GPU_MODEL_ID,
    label: "Qwen3 0.6B · Q4 / WebGPU",
    threads: 0,
    contextSize: CONTEXT_SIZE,
  });
}

async function handleLoad(message, op) {
  if (message.backend !== "wasm" && message.backend !== "webgpu") {
    throw new AppError("Select CPU / WebAssembly or WebGPU.", "WRONG_BACKEND");
  }
  await disposeRuntime();
  assertActive(op);
  if (message.backend === "wasm") await loadCpu(message, op);
  else await loadGpu(message, op);
}

function normalizeMessages(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AppError("Enter a message before starting generation.", "EMPTY_PROMPT");
  }
  const messages = input.map(message => {
    if (!message || !["system", "user", "assistant"].includes(message.role) || typeof message.content !== "string") {
      throw new AppError("The chat contains an invalid message. Start a new chat and retry.", "INVALID_CHAT");
    }
    return { role: message.role, content: message.content };
  });
  if (messages[0].role !== "system") messages.unshift({ role: "system", content: DEFAULT_SYSTEM });
  if (messages.length < 2 || messages.at(-1).role !== "user" || !messages.at(-1).content.trim()) {
    throw new AppError("Enter a non-empty user message before generation.", "EMPTY_PROMPT");
  }
  for (let index = 1; index < messages.length; index++) {
    if (messages[index].role !== (index % 2 ? "user" : "assistant")) {
      throw new AppError("The chat history must contain complete user and assistant turns. Start a new chat and retry.", "INVALID_CHAT");
    }
  }
  return messages;
}

function formatQwen(messages) {
  return messages.map(message => `<|im_start|>${message.role}\n${message.content}<|im_end|>\n`).join("")
    + "<|im_start|>assistant\n<think>\n\n</think>\n\n";
}

function generationOptions(message) {
  const maxTokens = Number(message.maxTokens ?? 256);
  const temperature = Number(message.temperature ?? 0.7);
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 1024) {
    throw new AppError("The response limit must be between 1 and 1,024 tokens.", "INVALID_OPTIONS");
  }
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new AppError("Temperature must be a number between 0 and 2.", "INVALID_OPTIONS");
  }
  return { maxTokens, temperature };
}

async function fitContext(messages, maxTokens, op) {
  let droppedTurns = 0;
  let promptTokens;
  let prompt;
  while (true) {
    assertActive(op);
    prompt = formatQwen(messages);
    if (backend === "wasm") {
      const tokens = await runtime.tokenize(prompt, true);
      promptTokens = tokens.length + (runtime.mustAddBosToken() && tokens[0] !== runtime.getBOS() ? 1 : 0);
    } else {
      // Qwen's byte-level BPE cannot exceed one token per UTF-8 byte; reserve extra template space.
      promptTokens = encoder.encode(prompt).byteLength + 64;
    }
    if (promptTokens + maxTokens + 8 <= CONTEXT_SIZE) break;
    if (messages.length <= 2) {
      throw new AppError(
        backend === "wasm"
          ? `The current message and system prompt need ${promptTokens} tokens. Shorten them or reduce the response limit to fit the ${CONTEXT_SIZE}-token context.`
          : `The current message and system prompt exceed the GPU mode's conservative context budget. Shorten them, reduce the response limit, or use CPU mode for exact token counting.`,
        "PROMPT_TOO_LONG"
      );
    }
    messages.splice(1, 2);
    droppedTurns++;
  }
  op.promptTokens = backend === "wasm" ? promptTokens : null;
  reply(op.id, "context", {
    promptTokens,
    estimated: backend === "webgpu",
    promptTokenUpperBound: backend === "webgpu" ? promptTokens : null,
    droppedTurns,
  });
  return { messages, prompt };
}

function observedMetrics(op) {
  const now = performance.now();
  const duration = op.firstTokenAt === null ? 0 : now - op.firstTokenAt;
  return {
    tokens: op.tokens,
    ttftMs: op.firstTokenAt === null ? null : op.firstTokenAt - op.startedAt,
    totalMs: now - op.startedAt,
    decodeTps: op.decodeTps ?? (op.tokens > 1 && duration > 0 ? (op.tokens - 1) * 1000 / duration : null),
    promptTokens: op.promptTokens,
  };
}

function emitToken(op) {
  const metrics = observedMetrics(op);
  reply(op.id, "token", {
    text: op.text,
    tokenCount: op.tokens,
    firstTokenMs: metrics.ttftMs,
    elapsedMs: metrics.totalMs,
    decodeTps: metrics.decodeTps,
  });
}

async function generateCpu(op, prompt, options) {
  op.tokens = 0;
  await runtime.createCompletion(prompt, {
    nPredict: options.maxTokens,
    sampling: { temp: options.temperature, top_k: 20, top_p: 0.8 },
    useCache: true,
    abortSignal: op.controller.signal,
    onNewToken(token, piece, text) {
      if (op.stopped) return;
      if (op.firstTokenAt === null) op.firstTokenAt = performance.now();
      op.tokens++;
      op.text = text;
      emitToken(op);
    },
  });
  op.finishReason = op.stopped ? "stop" : op.tokens >= options.maxTokens ? "length" : "stop";
}

async function generateGpu(op, messages, options) {
  const stream = await runtime.chat.completions.create({
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    top_p: 0.8,
    stream: true,
    stream_options: { include_usage: true },
    extra_body: { enable_thinking: false },
  });
  for await (const chunk of stream) {
    if (op.stopped) await runtime.interruptGenerate();
    const choice = chunk.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === "string" && delta.length && !op.stopped) {
      if (op.firstTokenAt === null) op.firstTokenAt = performance.now();
      op.text += delta;
      emitToken(op);
    }
    if (choice?.finish_reason) op.finishReason = choice.finish_reason;
    if (chunk.usage) {
      const usage = chunk.usage;
      if (Number.isFinite(usage.completion_tokens)) op.tokens = usage.completion_tokens;
      if (Number.isFinite(usage.prompt_tokens)) op.promptTokens = usage.prompt_tokens;
      const decodeTps = usage.extra?.decode_tokens_per_s;
      if (Number.isFinite(decodeTps) && decodeTps > 0) op.decodeTps = decodeTps;
    }
  }
}

async function handleGenerate(message, op) {
  if (!runtime || !backend) throw new AppError("Load a model before sending a message.", "NOT_LOADED");
  const options = generationOptions(message);
  const fitted = await fitContext(normalizeMessages(message.messages), options.maxTokens, op);
  assertActive(op);
  if (backend === "wasm") await generateCpu(op, fitted.prompt, options);
  else await generateGpu(op, fitted.messages, options);
  reply(op.id, "done", {
    text: op.text,
    metrics: observedMetrics(op),
    stopped: op.stopped,
    finishReason: op.finishReason,
  });
}

function handleStop() {
  const op = operation;
  if (!op || !["load", "generate"].includes(op.kind)) return;
  op.stopped = true;
  op.controller.abort();
  if (backend === "webgpu" && runtime) {
    if (op.kind === "load") void runtime.unload().catch(() => {});
    else void runtime.interruptGenerate().catch(() => {});
  }
}

async function handleReset(message) {
  if (runtime) {
    if (backend === "wasm") await runtime.kvClear();
    else await runtime.resetChat();
  }
  reply(message.id, "resetDone");
}

async function handleClearCache(message, op) {
  const warnings = [];
  progress(op, 0, "Removing the models cached by this page…");
  try {
    if (globalThis.caches) await caches.delete(MODEL_CACHE_NAME);
  } catch {
    warnings.push("The browser did not allow removal of the CPU model cache.");
  }
  try {
    if (globalThis.caches) {
      // WebLLM's generic delete helper fetches its manifest on a cache miss.
      // Delete only this model's existing entries, including partial downloads.
      // The model library lives in MODEL_CACHE_NAME: WebLLM receives it as a blob URL and never caches it.
      const names = await caches.keys();
      for (const name of ['webllm/model', 'webllm/config']) {
        if (!names.includes(name)) continue;
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          if (request.url.startsWith(GPU_MODEL_URL)) {
            await cache.delete(request);
          }
        }
      }
    }
  } catch {
    warnings.push("The browser did not allow complete removal of the GPU model cache.");
  }
  if (warnings.length) {
    throw new AppError(`${warnings.join(" ")} You can clear this site's storage in browser settings.`, "CACHE_CLEAR");
  }
  reply(message.id, "cacheCleared", {
    warnings,
    message: "This page's downloaded model caches were cleared. A loaded model remains in memory until released.",
  });
}

self.onmessage = async ({ data: message }) => {
  if (!message || typeof message.type !== "string") return;
  if (message.type === "stop") {
    handleStop();
    return;
  }
  let op;
  try {
    if (!["load", "generate", "reset", "clearCache"].includes(message.type)) {
      throw new AppError("Unknown worker operation.", "INVALID_OPERATION");
    }
    op = beginOperation(message);
    if (message.type === "load") await handleLoad(message, op);
    else if (message.type === "generate") await handleGenerate(message, op);
    else if (message.type === "reset") await handleReset(message);
    else await handleClearCache(message, op);
  } catch (error) {
    if (op?.kind === "generate" && op.stopped) {
      reply(op.id, "done", {
        text: op.text,
        metrics: observedMetrics(op),
        stopped: true,
        finishReason: "stop",
      });
    } else {
      const details = errorDetails(error, op);
      const shouldDispose = op?.kind === "load" || (op?.kind === "generate" && details.code === "GPU_UNAVAILABLE");
      if (shouldDispose) {
        try { await disposeRuntime(); } catch { /* The caller can replace a failed worker. */ }
      }
      reply(message.id, "error", { ...details, ...(shouldDispose && op?.kind === "generate" ? { unloaded: true } : {}) });
    }
  } finally {
    if (op) finishOperation(op);
  }
};
