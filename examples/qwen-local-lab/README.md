# Qwen Local Lab

A full-page browser application running Qwen3-0.6B locally. The deliverable is `dist/index.html`: HTML, CSS, application JavaScript, both runtime JavaScript bundles, the SHA-256 library and the CPU WebAssembly binaries are embedded in that one document. Model weights remain a separate download or a local GGUF file. There is no inference server, API key, analytics, or prompt upload in this application.

## Use

1. Build the page and serve `dist/` on localhost (see **Source and build**).
2. Choose Auto, WebAssembly (CPU), or WebGPU (GPU).
3. Click **Load model**. Loading is explicit because it may download hundreds of megabytes.
4. Enter a short prompt. Enter sends; Shift+Enter adds a newline.
5. Use Stop to interrupt generation, New chat to reset context, and the unload button to release model memory.

Auto uses WebGPU only when a usable adapter advertises shader-f16; otherwise it uses CPU. A GPU initialization failure is displayed and allows an explicit CPU retry, rather than silently starting a second large download.

## Standalone and offline use

The app's **Save HTML** button exports the pristine application, without the current conversation. The CPU engine and worker code are already embedded. Keep this HTML together with a Qwen3-0.6B GGUF file, and use **Use a local GGUF file**. A local file is read through the browser File API and does not get uploaded. If a browser restricts workers on file:// URLs, serve the same file from localhost; no inference backend is involved.

Official compatible model (639,446,688 bytes):
https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf

Expected upstream model SHA-256:
`9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`

The browser downloader verifies the exact model size, the GGUF magic and the full-file SHA-256 above. The digest is computed with hash-wasm's incremental `createSHA256()` while the download streams, so the check never holds a second copy of the model; a file that does not match is refused and never cached. A cached model is hashed again from storage before each use, and a mismatch deletes the entry and downloads the model again. After load the app also checks the expected Qwen3 architecture, layer count, and embedding dimension. A local GGUF file is not held to this digest, because a local import may use a different compatible quantization; it gets only the GGUF magic and model identity checks.

A tiny HTML containing all model weights is impossible for this model. Base64 embedding would increase a 639 MB model to about 853 MB before other assets. The chosen packaging keeps the runtime self-contained and the model independent. Hosted-page offline reopening is not guaranteed. Browser storage can be unavailable, full, or evicted; the interface reports cache retention failure. Once the model is loaded, generation needs no HTTP requests. The wrapper worker rejects HTTP fetches outside model loading.

## Runtime choices

| Route | Runtime | Model | Initial model transfer |
|---|---|---|---|
| CPU | wllama 2.3.7, llama.cpp WebAssembly | Official Qwen3-0.6B Q8_0 GGUF | 639.45 MB |
| GPU | WebLLM 0.2.89 | Qwen3-0.6B q4f16_1 MLC | ~335.37 MB weights + ~11.42 MB tokenizer, config and compiled library |

The GPU model revision is `8c14ce481d4c692769976ad52afea453a102df19`. WebLLM 0.2.89 points this model at a compiled library on the mutable `main` branch of `mlc-ai/binary-mlc-llm-libs`; the app downloads the same file from commit `5b7251f3bdce957be2a7bf73a6f6c560d9874df4` instead, refuses it unless it is exactly 6,561,594 bytes with SHA-256 `b277797fff1240baaba6782b7ba671834f861022b9283c93fcb4bb7c06d0373d`, and hands the verified bytes to WebLLM as a `blob:` URL. WebLLM fetches a non-HTTP library URL with plain `fetch()` and skips its own URL-keyed cache, so it runs exactly the verified bytes. The GPU weights, tokenizer and config come from the pinned Hugging Face revision through WebLLM's own loader and are not re-hashed by this app. The upstream ~1.4 GB GPU memory estimate is for 4,096 tokens; this app configures 2,048. Download size and working memory are distinct.

Both runtimes operate in a dedicated wrapper Web Worker. Wllama also owns an internal compute worker. The app emits actual streamed model output, not canned responses. CPU token counts are runtime token counts; GPU metrics come from the final usage record. Time to first token includes tokenization, prompt processing and execution; decode throughput is measured separately. Results vary with hardware, browser, context, quantization, temperature, and warm/cold state.

## Conversation behavior

- Qwen thinking mode is disabled to keep short answers practical.
- The two backends sample differently: the CPU path applies top-k 20 with top-p, while WebLLM 0.2.89 has no top-k option and samples with top-p only, so the same settings do not give identical answers on CPU and GPU.
- CPU context is counted with the model tokenizer. GPU fitting uses a conservative UTF-8 byte upper bound rather than relying on private tokenizer APIs.
- The oldest complete user/assistant pairs are omitted when necessary, with a visible notice. The full transcript remains displayed. The latest user message and system instruction are never silently truncated.
- Single prompts too large for the 2,048-token context are rejected with a clear message.
- Stop attempts cooperative cancellation. A three-second fallback terminates the worker, including its nested workers, and releases the model when native prompt processing does not respond promptly.
- Nonempty interrupted answers remain in the transcript. A failed/stopped turn with no output is restored to the composer and excluded from future model context.
- Output uses textContent, so model-produced HTML cannot execute.
- Chats are in memory by default. Remember this conversation opts into localStorage. Export creates a Markdown transcript. No browser storage is a guaranteed durable backup.

## Source and build

- `src/ui.html`: UI and inline styles.
- `src/app.js`: lifecycle, worker RPC, transcript, rendering and persistence.
- `src/inference-worker.js`: downloading, validation, local inference, cancellation and context budgeting.
- `vendor/lock.json`: the three npm packages (wllama 2.3.7, WebLLM 0.2.89, hash-wasm 4.13.0) with their registry tarball URL and sha512 integrity, and for every extracted file its archive path, output name, optional patch, byte count and SHA-256.
- `vendor/patches/wllama-worker-base-url.patch`: the one change to wllama. It resolves absolute asset URLs inside a Worker when `document` is unavailable; math/inference code is untouched.
- `scripts/fetch_vendor.py`: downloads each tarball, checks its sha512 integrity before opening it, extracts only the listed regular files (no links, no path traversal), applies the patch only if it matches exactly once, and writes the outputs only after every SHA-256 matches. Run it again and nothing changes; tarballs are cached in `.cache/`.
- `scripts/build.py`: deterministic single-HTML assembly. It refuses to build when a vendored file is missing or differs from the lock, hashes the inline module script and inline styles, and writes the Content Security Policy to both `dist/_headers` and a `<meta>` tag.
- `scripts/serve.py`: local static serving with the headers from `dist/_headers`, including those required for multithreaded WASM.
- `dist/_headers`: CSP and isolation headers for static hosts supporting this convention.

Build:

```sh
python3 scripts/fetch_vendor.py
python3 scripts/build.py
python3 scripts/serve.py
```

Open the localhost URL printed by the server. Plain static hosting also works; without cross-origin isolation the CPU backend selects one thread. Multi-threaded CPU operation needs actual HTTP COOP/COEP headers, not meta tags. The app falls back to one thread when these headers are absent. It caps CPU threads at four to avoid exhausting the device.

No npm install or build service is required to reproduce the HTML: the runtime bundles are fetched from the npm registry and checked against the lock, never installed. The scripts use only Python's standard library.

The page's policy allows only its own hashed inline script and styles, `blob:` scripts and workers (the embedded engines), `'wasm-unsafe-eval'` for WebAssembly, and connections to `huggingface.co`, its download CDN (`*.hf.co`) and `raw.githubusercontent.com`. There is no `'unsafe-inline'` or `'unsafe-eval'`, and `object-src`, `base-uri` and `form-action` are `'none'`. The HTTP header also sets `frame-ancestors 'none'`, which browsers ignore in a `<meta>` policy.

## Relationship to llm.asm

This is an independent browser implementation of the local-chat experience. It does not compile, boot, or emulate the x86 operating system in https://github.com/alesha-pro/llm.asm . The original 24,252-byte kernel is separate from its 613.66 MiB .asmbin weights. Its AVX2/FMA/F16C, APIC, physical-memory mapping and native decode benchmarks do not transfer to this browser implementation. This application uses llama.cpp through WebAssembly for CPU and MLC/WebLLM for GPU. Its different runtimes/quantizations do not inherit the author's bit-exactness or speed claims.

## Licenses and sources

Bundled wllama: MIT. Bundled WebLLM: Apache-2.0. Bundled hash-wasm: MIT. Model: Apache-2.0, downloaded separately. Third-party license text is extracted to vendor by `fetch_vendor.py` and embedded in the generated HTML. The original assembly code is not included.

- https://github.com/alesha-pro/llm.asm
- https://github.com/ngxson/wllama
- https://github.com/Daninet/hash-wasm
- https://webllm.mlc.ai/docs/
- https://huggingface.co/Qwen/Qwen3-0.6B-GGUF
- https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC
- https://emscripten.org/docs/porting/simd.html
- https://emscripten.org/docs/porting/pthreads.html

## Validation limits

See VERIFICATION.md for the actual checks and observed browser results. Passing lifecycle tests or displaying the UI is not counted as real inference verification. No performance parity with native llm.asm is asserted. Browser/GPU/device coverage beyond the recorded test environment remains unverified.
