// Control-flow-only tests. Runtime/tokenizer mocks do not establish real inference,
// model correctness, browser compatibility, cache persistence, or performance.
// Run: node --test tests/worker.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../src/inference-worker.js'), 'utf8');
const cpuCache = 'qwen-local-lab-model-v1';
const gpuRoot = 'https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC/resolve/8c14ce481d4c692769976ad52afea453a102df19/';
const modelLibrary = 'https://example.invalid/Qwen3-0.6B-q4f16_1-webgpu.wasm';

// Replaces a pinned `const NAME = value;` line, so a tiny fixture can stand in for a model.
function withConstants(text, constants) {
  for (const [name, value] of Object.entries(constants)) {
    const line = new RegExp(`^const ${name} = .*;$`, 'm');
    assert.match(text, line, `the worker must declare ${name}`);
    text = text.replace(line, `const ${name} = ${JSON.stringify(value)};`);
  }
  return text;
}

function harness(extra = {}, { respond = () => new Response('mock asset'), constants = {} } = {}) {
  const events = [];
  const requests = [];
  const scope = vm.createContext({
    TextEncoder, Blob, Request, Response, TransformStream, ReadableStream, WritableStream,
    AbortController, DOMException, WebAssembly, URL, performance,
    navigator: { hardwareConcurrency: 4 },
    location: { href: 'https://example.invalid/inference-worker.js' },
    postMessage: event => events.push(event),
    fetch: async (resource, options) => {
      const value = resource instanceof Request ? resource.url : String(resource);
      const url = new URL(value, scope.location.href).href;
      requests.push({ url, options });
      return respond(url);
    },
    console: { warn() {}, error() {}, log() {} },
    ...extra,
  });
  vm.runInContext('self = globalThis', scope);
  vm.runInContext(withConstants(source, constants), scope, { filename: 'inference-worker.js' });
  return { scope, events, requests, run: code => vm.runInContext(code, scope) };
}

async function fit(h, messages, maxTokens = 256) {
  h.scope.inputMessages = messages;
  h.scope.maxTokens = maxTokens;
  return h.run(`(async () => {
    const op = beginOperation({ id: 1, type: 'generate' });
    try { return await fitContext(normalizeMessages(inputMessages), maxTokens, op); }
    finally { finishOperation(op); }
  })()`);
}

function cpu(h, tokenize, bos = false) {
  h.scope.mockTokenize = tokenize;
  h.scope.mockBos = bos;
  h.run(`backend = 'wasm'; runtime = {
    tokenize: mockTokenize, mustAddBosToken: () => mockBos, getBOS: () => 1
  }`);
}

test('CPU context reserves the response budget and an added BOS token', async () => {
  const messages = [{ role: 'user', content: 'Keep this message intact.' }];
  for (const { count, bos, fits } of [
    { count: 1530, bos: false, fits: true },
    { count: 1531, bos: false, fits: false },
    { count: 1530, bos: true, fits: false },
  ]) {
    const h = harness();
    cpu(h, async () => Array(count).fill(7), bos);
    if (fits) {
      const result = await fit(h, messages, 510);
      assert.equal(result.messages.at(-1).content, messages[0].content);
      assert.equal(h.events.at(-1).promptTokens, 1530);
    } else {
      await assert.rejects(fit(h, messages, 510), { code: 'PROMPT_TOO_LONG' });
    }
    assert.equal(h.requests.length, 0);
  }
});

test('context pressure removes complete oldest turns and preserves system/current messages', async () => {
  const h = harness();
  cpu(h, async text => Array(text.length).fill(7));
  const messages = [
    { role: 'system', content: 'Preserve this system prompt.' },
    { role: 'user', content: 'old user '.repeat(90) },
    { role: 'assistant', content: 'old assistant '.repeat(60) },
    { role: 'user', content: 'recent question' },
    { role: 'assistant', content: 'recent answer' },
    { role: 'user', content: 'Preserve the current question.' },
  ];
  const original = JSON.stringify(messages);
  const result = await fit(h, messages, 512);
  assert.equal(JSON.stringify(result.messages), JSON.stringify([messages[0], ...messages.slice(3)]));
  assert.equal(JSON.stringify(messages), original, 'The transcript supplied by the UI must not be mutated');
  assert.equal(h.events.at(-1).droppedTurns, 1);
  assert.ok(h.events.at(-1).promptTokens + 512 <= 2048);
});

test('GPU context bounds use UTF-8 bytes and reject an oversized single message', async () => {
  const h = harness();
  h.run("backend = 'webgpu'");
  const unicode = '🙂'.repeat(450);
  const ascii = 'a'.repeat(unicode.length);
  await assert.rejects(fit(h, [{ role: 'user', content: unicode }]), { code: 'PROMPT_TOO_LONG' });
  const result = await fit(h, [{ role: 'user', content: ascii }]);
  assert.equal(result.messages.at(-1).content, ascii);
  const event = h.events.at(-1);
  assert.equal(event.estimated, true);
  assert.ok(event.promptTokens + 256 <= 2048);
  assert.equal(h.requests.length, 0);
});

test('HTTP fetch guard normalizes supported input forms and blocks calls outside loading', async () => {
  const h = harness();
  const resources = [
    'https://example.invalid/model.bin',
    '  \tHTTPS://example.invalid/model.bin\n',
    '//example.invalid/model.bin',
    '/model.bin',
    new URL('http://example.invalid/model.bin'),
    new Request('https://example.invalid/model.bin'),
    { toString: () => 'https://example.invalid/model.bin' },
  ];
  for (const kind of [null, 'generate', 'reset', 'clearCache']) {
    h.scope.operationKind = kind;
    h.run('operation = operationKind ? { kind: operationKind } : null');
    for (const resource of resources) {
      h.scope.resource = resource;
      const promise = h.run('fetch(resource)');
      assert.equal(typeof promise.then, 'function', 'fetch must preserve asynchronous rejection semantics');
      await assert.rejects(promise, { code: 'NETWORK_DURING_GENERATION' });
    }
  }
  assert.equal(h.requests.length, 0, 'No blocked call may reach native fetch');
  h.run("operation = { kind: 'load' }");
  await h.run("fetch('https://example.invalid/model.bin')");
  h.run('operation = null');
  await h.run("fetch('blob:https://example.invalid/local-asset')");
  assert.equal(h.requests.length, 2, 'Loading and embedded Blob assets remain usable');
});

function fakeCaches(initial, failDelete = false) {
  const data = new Map(Object.entries(initial).map(([name, urls]) => [name, new Set(urls)]));
  return {
    data,
    api: {
      keys: async () => [...data.keys()],
      delete: async name => data.delete(name),
      open: async name => {
        if (!data.has(name)) data.set(name, new Set());
        return {
          keys: async () => [...data.get(name)].map(url => new Request(url)),
          delete: async request => {
            if (failDelete) throw new DOMException('Storage blocked', 'SecurityError');
            return data.get(name).delete(request.url);
          },
        };
      },
    },
  };
}

async function clearCache(h) {
  await h.run("self.onmessage({ data: { type: 'clearCache', id: 10 } })");
}

test('cache clearing removes only the owned model cache and pinned GPU entries without fetching a manifest', async () => {
  const otherRevision = gpuRoot.replace('/8c14ce481d4c692769976ad52afea453a102df19/', '/other-revision/');
  const lookalikePrefix = gpuRoot.slice(0, -1) + '-different/weights.bin';
  const cache = fakeCaches({
    [cpuCache]: ['https://example.invalid/cpu-model'],
    'webllm/model': [gpuRoot + 'params_shard_0.bin', otherRevision + 'params_shard_0.bin', lookalikePrefix],
    'webllm/config': [gpuRoot + 'mlc-chat-config.json', 'https://example.invalid/other-config'],
    'webllm/wasm': [modelLibrary, modelLibrary + '.backup'],
    'unrelated-app': [gpuRoot + 'params_shard_0.bin'],
  });
  const h = harness({ caches: cache.api });
  await clearCache(h);
  assert.equal(h.events.at(-1).type, 'cacheCleared');
  assert.equal(cache.data.has(cpuCache), false);
  assert.deepEqual([...cache.data.get('webllm/model')], [otherRevision + 'params_shard_0.bin', lookalikePrefix]);
  assert.deepEqual([...cache.data.get('webllm/config')], ['https://example.invalid/other-config']);
  // The pinned model library lives in the owned model cache; WebLLM never caches a blob: model_lib.
  assert.deepEqual([...cache.data.get('webllm/wasm')], [modelLibrary, modelLibrary + '.backup']);
  assert.equal(cache.data.get('unrelated-app').size, 1);
  assert.equal(h.requests.length, 0);
});

test('empty-cache clearing stays offline; partial deletion failure is not reported as success', async () => {
  const empty = fakeCaches({});
  const h = harness({ caches: empty.api });
  await clearCache(h);
  assert.equal(h.events.at(-1).type, 'cacheCleared');
  assert.equal(empty.data.size, 0, 'Clearing an empty cache should not create cache containers');
  assert.equal(h.requests.length, 0);

  const blocked = fakeCaches({ 'webllm/model': [gpuRoot + 'params_shard_0.bin'] }, true);
  const failing = harness({ caches: blocked.api });
  await clearCache(failing);
  assert.equal(failing.events.at(-1).type, 'error');
  assert.equal(failing.events.at(-1).code, 'CACHE_CLEAR');
  assert.equal(blocked.data.get('webllm/model').size, 1);
  assert.equal(failing.requests.length, 0);
});

// Integrity checks. A tiny fixture stands in for each model (the pinned size and digest
// constants are replaced in the worker source), and node:crypto stands in for hash-wasm,
// whose incremental API is checked against the fetched bundle below.
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const gguf = fill => Uint8Array.from({ length: 32 }, (_, i) => (i < 4 ? [71, 71, 85, 70][i] : fill));
const goodModel = gguf(1);
const tamperedModel = gguf(2);
const goodLibrary = Uint8Array.from({ length: 16 }, (_, i) => i);
const tamperedLibrary = Uint8Array.from({ length: 16 }, (_, i) => 15 - i);
const modelCacheUrl = 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf';

function nodeHasher() {
  const hash = crypto.createHash('sha256');
  return { update: data => { hash.update(data); }, digest: () => hash.digest('hex') };
}

function modelCache(entries = {}) {
  const store = new Map(Object.entries(entries));
  const log = [];
  const cache = {
    match: async url => (store.has(String(url)) ? new Response(store.get(String(url))) : undefined),
    put: async (url, response) => {
      log.push(['put', String(url)]);
      store.set(String(url), new Uint8Array(await response.arrayBuffer()));
    },
    delete: async url => {
      log.push(['delete', String(url)]);
      return store.delete(String(url));
    },
  };
  return { store, log, api: { open: async () => cache } };
}

function integrityHarness(cache, respond, constants) {
  const h = harness({ caches: cache.api, nodeHasher }, { respond, constants });
  h.run('sha256Hasher = async () => nodeHasher()');
  return h;
}

async function inLoad(h, call) {
  const value = await h.run(`(async () => {
    const op = beginOperation({ id: 2, type: 'load' });
    try { return await ${call}; } finally { finishOperation(op); }
  })()`);
  // The worker's Uint8Array comes from the vm realm; copy it into this one for deepEqual.
  return ArrayBuffer.isView(value) ? Uint8Array.from(value) : new Uint8Array(await value.arrayBuffer());
}

const cpuConstants = expected => ({ CPU_MODEL_SIZE: 32, CPU_MODEL_SHA256: sha256(expected) });

test('a downloaded model is hashed while it streams and refused before caching on a digest mismatch', async () => {
  const cache = modelCache();
  const h = integrityHarness(cache, () => new Response(tamperedModel), cpuConstants(goodModel));
  await assert.rejects(inLoad(h, 'obtainCpuModel(op, {})'), { code: 'INVALID_MODEL' });
  assert.equal(cache.store.size, 0, 'A model that fails its digest must not be cached');
  assert.deepEqual(h.requests.map(r => r.url), [modelCacheUrl]);

  const accepted = modelCache();
  const ok = integrityHarness(accepted, () => new Response(goodModel), cpuConstants(goodModel));
  assert.deepEqual(await inLoad(ok, 'obtainCpuModel(op, {})'), goodModel);
  assert.deepEqual(accepted.store.get(modelCacheUrl), goodModel);
  assert.ok(ok.events.some(e => e.text === "Checking the model's SHA-256 checksum…"));
});

test('a cached model is re-hashed before use; a mismatch deletes it and downloads again', async () => {
  const cache = modelCache({ [modelCacheUrl]: tamperedModel });
  const h = integrityHarness(cache, () => new Response(goodModel), cpuConstants(goodModel));
  assert.deepEqual(await inLoad(h, 'obtainCpuModel(op, {})'), goodModel);
  assert.deepEqual(cache.log, [['delete', modelCacheUrl], ['put', modelCacheUrl]]);
  assert.equal(h.requests.length, 1);
  assert.ok(h.events.some(e => e.text?.startsWith("Verifying the cached model's SHA-256")));

  const valid = modelCache({ [modelCacheUrl]: goodModel });
  const hit = integrityHarness(valid, () => assert.fail('a verified cache hit must not download'), cpuConstants(goodModel));
  assert.deepEqual(await inLoad(hit, 'obtainCpuModel(op, {})'), goodModel);
  assert.equal(hit.run('modelCacheStatus'), 'hit');
  assert.deepEqual(valid.log, []);
});

test('the GPU model library is pinned to a commit and refused unless its size and SHA-256 match', async () => {
  const constants = { GPU_MODEL_LIB_SIZE: 16, GPU_MODEL_LIB_SHA256: sha256(goodLibrary) };
  for (const served of [tamperedLibrary, goodLibrary.slice(1)]) {
    const cache = modelCache();
    const h = integrityHarness(cache, () => new Response(served), constants);
    await assert.rejects(inLoad(h, 'obtainModelLibrary(op, {})'), { code: 'INVALID_MODEL' });
    assert.equal(cache.store.size, 0);
    assert.equal(h.requests.length, 1);
    assert.match(h.requests[0].url, /^https:\/\/raw\.githubusercontent\.com\/mlc-ai\/binary-mlc-llm-libs\/[0-9a-f]{40}\//);
  }

  const libraryUrl = harness().run('GPU_MODEL_LIB_URL');
  const cache = modelCache({ [libraryUrl]: tamperedLibrary });
  const h = integrityHarness(cache, () => new Response(goodLibrary), constants);
  assert.deepEqual(await inLoad(h, 'obtainModelLibrary(op, {})'), goodLibrary);
  assert.deepEqual(cache.log, [['delete', libraryUrl], ['put', libraryUrl]]);

  // The same pinned fetch outside a load is refused by the guard before it reaches the network.
  h.run("operation = { kind: 'generate' }");
  await assert.rejects(h.run('fetch(GPU_MODEL_LIB_URL)'), { code: 'NETWORK_DURING_GENERATION' });
  assert.equal(h.requests.length, 1);
});

const hashWasmPath = path.join(__dirname, '../vendor/hash-wasm.js');
test('hash-wasm createSHA256 hashes chunk by chunk like one SHA-256 over the whole input', {
  skip: !fs.existsSync(hashWasmPath) && 'run scripts/fetch_vendor.py first',
}, async () => {
  const { createSHA256 } = await import(require('node:url').pathToFileURL(hashWasmPath).href);
  const data = crypto.randomBytes(300000);
  const hasher = await createSHA256();
  for (let offset = 0; offset < data.length; offset += 65536) hasher.update(data.subarray(offset, offset + 65536));
  assert.equal(hasher.digest('hex'), sha256(data));
});

test('CPU and GPU sampling options stay explicit and GPU omits unsupported top_k', async () => {
  const cpuCalls = [];
  const cpuH = harness();
  cpuH.scope.mockRuntime = {
    async createCompletion(prompt, opts) { cpuCalls.push(opts); },
  };
  cpuH.run('backend = "wasm"; runtime = mockRuntime');
  await cpuH.run('generateCpu({ stopped: false, firstTokenAt: null, startedAt: 0, tokens: 0, text: "", controller: new AbortController() }, "p", { maxTokens: 32, temperature: 0.6 })');
  assert.deepEqual({ ...cpuCalls[0].sampling }, { temp: 0.6, top_k: 20, top_p: 0.8 });

  const gpuCalls = [];
  const gpuH = harness();
  gpuH.scope.mockRuntime = {
    chat: {
      completions: {
        async create(opts) {
          gpuCalls.push(opts);
          return { async *[Symbol.asyncIterator]() {} };
        },
      },
    },
  };
  gpuH.run('backend = "webgpu"; runtime = mockRuntime');
  await gpuH.run('generateGpu({ stopped: false, firstTokenAt: null, startedAt: 0, tokens: 0, text: "", controller: new AbortController() }, [{ role: "user", content: "hi" }], { maxTokens: 32, temperature: 0.6 })');
  assert.equal(gpuCalls[0].temperature, 0.6);
  assert.equal(gpuCalls[0].top_p, 0.8);
  assert.equal('top_k' in gpuCalls[0], false);
  assert.deepEqual({ ...gpuCalls[0].extra_body }, { enable_thinking: false });
});

test('WebGPU device loss during generation disposes the runtime and signals unloaded', async () => {
  let unloaded = 0;
  const h = harness();
  h.scope.mockRuntime = {
    async unload() { unloaded++; },
    chat: {
      completions: {
        async create() { throw new Error('GPUDevice was lost during compute'); },
      },
    },
  };
  h.run('backend = "webgpu"; runtime = mockRuntime');
  await h.scope.self.onmessage({
    data: {
      type: 'generate',
      id: 7,
      messages: [{ role: 'user', content: 'hello' }],
      maxTokens: 32,
      temperature: 0.6,
    },
  });
  assert.equal(unloaded, 1);
  assert.equal(h.run('runtime'), null);
  assert.equal(h.run('backend'), null);
  const errEvent = h.events.find(e => e.type === 'error');
  assert.equal(errEvent?.code, 'GPU_UNAVAILABLE');
  assert.equal(errEvent?.unloaded, true);
});
