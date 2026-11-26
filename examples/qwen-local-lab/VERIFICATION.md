# Verification record

Date: 26 November 2026.

## Actual browser execution

Test surface: cloud Chromium browser, static page, embedded wllama 2.3.7,
official pinned Qwen3-0.6B Q8_0 GGUF, 2,048-token context, one CPU/WASM thread.
The browser did not expose a suitable WebGPU adapter. Its CPU model cache write
returned `QuotaExceededError`; the app remained usable and disclosed this condition.

| Check | Observed result |
|---|---|
| Real 639,446,688-byte model download and load | Passed; model metadata validated and ready state displayed |
| Fresh prompt: remember `ORBIT-731`, return the code | Actual model output: `ORBIT-731`; 6 output tokens |
| Follow-up asking for the previous code | Actual model output: `ORBIT-731`; 6 output tokens |
| Measured CPU decode rate for those two turns | About 2.8 tokens/second in this test environment |
| Time to first token | 10.91 seconds initially; 6.92 seconds on the follow-up |
| Stop during prompt processing | Stopped with zero visible output; prompt restored, excluded from future context; UI returned to ready |
| Release model memory | UI returned to unloaded state while preserving the transcript |
| Reload without a retained cache | Fresh download began; cancellation succeeded |
| Cache failure reporting | Explicit `QuotaExceededError` warning remained visible after load |
| Fresh generation with direct HTTP fetch blocked outside loading | Portuguese prompt `Quanto é 17 + 25? Responda apenas com o número.` produced `17 + 25 = 42` |
| Metrics for that arithmetic response | 10 output tokens, 3.4 tokens/second, 11.41 seconds to first token |
| New chat | Transcript and metrics cleared; model remained ready |
| Desktop visual check | Full-page layout, settings, progress, composer and streamed output were inspected |

The arithmetic response was correct but did not strictly follow the request to
return only the number. This illustrates the model's limited instruction following.
These short runs establish real local execution and basic behavior. They are not a
representative performance benchmark or a comparison against the assembly project.

## Executable regression checks

```sh
node --check src/app.js
node --check src/inference-worker.js
node --test tests/worker.test.cjs
python3 scripts/build.py
```

The six worker tests cover output/BOS token reserves, pruning only whole older
turns, Unicode-aware GPU context budgeting, normalized direct HTTP fetch guards,
cache deletion scope, and honest handling of partial cache failures. They use
mocked tokenizers and runtimes to test control flow; they are not inference tests.

An independent code review additionally found and led to fixes for cancellation
before the load continuation, cache-clear phase races, invisible toast messages,
and back-forward-cache cleanup. API usage was checked against the actual vendored
runtime bundles. The app uses `textContent` for user/model output and no inference
endpoint. Runtime/model versions and revisions are pinned. The bundled wllama
patch changes only asset URL resolution inside a Worker.

## Real-browser verification on Apple Silicon (26 November 2026)

Test surface: Apple M5 Pro (64 GiB unified memory, 18 logical cores), macOS 27.3 (`26C5047e`), Chromium `156.0.8078.4` serving `dist/index.html` via `scripts/serve.py` with `dist/_headers` (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, hashed CSP). Persistent Chromium profile placed on external SSD so Cache API writes were retained across page reloads.

| Check | Route | Observed result |
|---|---|---|
| Page boot + CSP + isolation | Both | HTTP 200, `crossOriginIsolated: true`, 0 console errors, 0 page errors, 0 CSP violations |
| Cold load (639,446,688-byte Q8_0 GGUF, streaming `hash-wasm` SHA-256, Cache API write) | CPU · 4 WASM threads | Passed in 40.93 s (2 external HTTP requests: HF + CDN redirect); `Model loaded and cached in this browser.` |
| Prompt 1 (`Remember ORBIT-731. Reply with only that code.`) | CPU · 4 WASM threads | `ORBIT-731`, 6 tokens, 43.7 tok/s decode, 0.65 s TTFT, 51 prompt tokens, 0 external requests |
| Prompt 2 (follow-up recalling code) | CPU · 4 WASM threads | `ORBIT-731`, 6 tokens, 44.2 tok/s decode, 0.44 s TTFT (prefix-cache reuse), 0 external requests |
| Stop mid-generation | CPU · 4 WASM threads | Stopped cleanly at 48 tokens (46.9 tok/s), partial response kept, UI returned to `ready` |
| Warm reload from Cache API (full 639.4 MB cached SHA-256 re-verify) | CPU · 4 WASM threads | Passed in 1.89 s, 0 external requests; `Model loaded from this browser’s cache.`; follow-up `17 + 25` -> `17 + 25 = 42` at 52.1 tok/s, 0.66 s TTFT |
| Cancel during loading | CPU · 4 WASM threads | Cancelled cleanly; UI returned to `idle` (`Loading cancelled`) |
| Cold load (pinned `model_lib` 6.56 MB SHA-256 + `blob:` handoff + WebLLM Q4 weights) | WebGPU · Apple Metal-3 (`shader-f16`) | Passed in 26.87 s (25 external requests), 0 CSP violations |
| Prompt 1 (`ORBIT-731`, cold shader compile) | WebGPU · Metal-3 | `<think>\n\n</think>\n\nORBIT-731`, 7 tokens, 14.0 tok/s decode, 1.82 s TTFT, 0 external requests |
| Prompt 2 (follow-up, warm shaders) | WebGPU · Metal-3 | `<think>\n\n</think>\n\nORBIT-731`, 7 tokens, 133.7 tok/s decode, 0.18 s TTFT, 0 external requests |
| Warm reload from Cache API | WebGPU · Metal-3 | Passed in 1.22 s, 0 external requests |

Note on WebGPU output: WebLLM 0.2.89 passes `enable_thinking: false` and stops the model from spending tokens on reasoning, but still emits the empty `<think>\n\n</think>\n\n` markers verbatim in streamed `delta.content` (whereas the CPU path pre-fills those markers in `formatQwen` before generation).

## Checks added when the lab moved into llmdeepdive.com

```sh
python3 scripts/fetch_vendor.py
python3 scripts/build.py
node --check src/app.js
node --check src/inference-worker.js
node --test tests/*.test.cjs
python3 -m unittest discover -s tests
```

| Check | Evidence kind |
|---|---|
| A downloaded model whose SHA-256 differs is refused with `INVALID_MODEL` and never cached; a matching one is cached | Fixture-tested (worker test, small stand-in model, node:crypto in place of hash-wasm) + real 639 MB happy path environment-tested above |
| A cached model is re-hashed before use; a mismatch deletes the entry and downloads again; a matching hit makes no request | Fixture-tested (worker test) + real 639 MB warm hit environment-tested above |
| The GPU model library is fetched from the pinned commit and refused on a size or SHA-256 mismatch; a bad cached copy is deleted and fetched again; the fetch guard still blocks it outside loading | Fixture-tested (worker test) + real Metal-3 WebGPU `blob:` handoff environment-tested above |
| hash-wasm's incremental `createSHA256()` equals one SHA-256 over the whole input | Tested against the fetched bundle in Node |
| CPU passes `top_k: 20` + `top_p: 0.8`; GPU passes `top_p: 0.8` + `enable_thinking: false` without unsupported `top_k`; WebGPU device loss during generation disposes the runtime and signals `unloaded` | Fixture-tested (worker test) |
| `fetch_vendor.py` refuses an integrity mismatch, a traversal or absolute member, a linked member, an unsafe output name, a patch matching 0 or 2 times, and an output hash mismatch (exit status 1, naming the file) | Fixture-tested (Python unittest, tarballs built in the test) |
| `build.py` embeds the exact verified vendor bytes once, puts the same script and style hashes in `dist/_headers` and the `<meta>` policy, and refuses a missing or altered vendor file | Fixture-tested (Python unittest) |

## Limits

- Safari, Firefox, mobile devices, and direct `file://` reopening have not been exhaustively tested.
- Local GGUF import and offline reopening are implemented; local GGUF files get magic and model-identity checks rather than the official SHA-256 digest (since a user may supply another compatible quantization), and were not exercised end to end in this browser session.
- WebLLM's cached GPU weights, tokenizer, and config are revision-pinned on Hugging Face rather than re-hashed byte-by-byte by this worker; only the CPU GGUF and the pinned GPU `model_lib` WASM are SHA-256 verified before use.
- The fetch guard covers direct `fetch` in the wrapper worker, not a browser-wide network firewall. Nested worker assets are embedded, and application generation contains no network calls.
- No packet-level network capture or browser-wide airplane-mode test was performed.
- Native llm.asm benchmarks and numerical parity were not reproduced. No claim of equivalent speed or bit-exact output is made.
