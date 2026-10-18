# Repair log: tracks 8–13 (lane `tracks-8-13`)

Scope: every lesson of tracks 8 (stacks), 9 (hardware), 10 (video and world
models), 11 (Mac/MLX), 12 (DGX/CUDA) and 13 (llama.cpp), both locales: 41 lesson
pairs, 82 files. `updated` is `"2026-10-18"` on every changed file. No `id`,
`track`, `order`, `title`, `tier`, `prerequisites`, `unlocks`, `lab`, `citations` or
`correctIndex` changed, and no option count changed: a script parsing each changed
file and its `HEAD` version with `scripts/content-utils.mjs` printed "82 changed files
checked against HEAD; 0 protected-field differences", and no diff line touches those
fields. Bridge links to 15.1, 16.1 and 25.2 point at lessons other
lanes are writing; no gate resolves body links today.

## Findings

| ID | Lesson | What changed (one line) | Source / counterexample | Status |
|---|---|---|---|---|
| F19, F35 | 8.6 | Removal date July 2026 (not August), "the 1.3 pre-releases from v1.3.0rc21 (July 2026) on ship without it; stable 1.2 releases still include the engine-build path"; AutoDeploy claim removed (body and teach-back); quiz 2 explanation says 1.3 pre-releases from v1.3.0rc21 on have no engine-build step. | Removal commit `7e833f7220` (#15918, 2026-07-14); `tensorrt_llm/commands/build.py` present at `v1.2.1` and `v1.3.0rc19`, absent from `v1.3.0rc21` (2026-07-15) onward; AutoDeploy removed by `3195913ffd` (#19028, 2026-09-24), absent from `v1.3.0rc29` and `v1.4.0rc0`. Upstream conflict: `docs/source/release-notes.md` (at `v1.4.0rc0`) files the removal under "Release 1.2", yet both stable tags `v1.2.0`/`v1.2.1` still ship `build.py`; the tree was preferred. No stable 1.3 exists. | fixed |
| F35 | 9.4 | "Engine builders … choose which path each layer takes" → runtimes such as TensorRT-LLM ship kernels for these paths and the served quantization recipe decides each layer's path. | Same sources as F19. 12.5 and 8.12 checked: already consistent (no engine-build framing). | fixed |
| F19 (7.11) | 7.11 | Not edited (another lane's; that lane already removed the engine-build wording). Re-read on 2026-10-18: line 72 still says "Current releases use PyTorch as the sole backend (… removed in August 2026)". The source says July 2026 (`7e833f7220`, first tagged `v1.3.0rc21`), and the latest stable release, `v1.2.1`, still ships the engine builder. | As above. | reported |
| F16 | 12.2 | Every quotient labelled an idealized peak-bandwidth planning figure: "worst case" → all-LPDDR5X planning rate, not a guaranteed floor; the overlap/max model is "in this bandwidth-only model"; caveat says sum and max are not bounds on real latency because compute, cache/state traffic, launches and sub-peak bandwidth add time; teach-back and quiz 2 explanation carry the same label. | F16's own argument; a measured token can exceed even the sum once compute and overhead are counted. | fixed |
| F22 | 8.9 | Teach-back: the MLX conversion is its own artifact and the 17.1 GB GGUF number is a comparison point; quiz 1 rewritten as "why should a 4-bit MLX conversion also exceed 13.5 GB", with "it inherits exactly the GGUF's 17.1 GB" as a distractor. | 8.9's own conversion command writes a separate MLX directory. | fixed |
| F23 | 8.1, 8.3 | 8.1: bar is logits within tolerance, first divergence on a near-tie, distribution statistics and task checks, not identical greedy text; 8.3 warning: near-ties can flip under greedy too, and the differential test checks tolerance, near-ties and task checks. 8.2 quiz 2 updated to match. | bf16 summation order (the lessons' own statement) makes a near-tie flip possible under greedy decoding. | fixed |
| F24 | 8.1 | Eager = op-by-op dispatch without graph capture or compiler fusion; it can call hand-written fused kernels; paged KV and continuous batching are separate serving features the reference path does not add (body, teach-back, quiz 3). | Eager PyTorch calls fused SDPA kernels; batching and paging live in the serving layer (8.4). | fixed |
| F26 | 8.5 | Summary and "guarantee" sentences scoped to the emitted tokens and supported schema features; caveat adds truncation, cancellation, timeouts and unsupported keywords, and requires a normal stop, a full parse, re-validation and meaning/permission checks before any tool runs, linking 15.1. Quiz 3 correct option and explanation follow. | A request that hits `max_tokens` stops mid-object regardless of the grammar. | fixed |
| F27 | 8.10 | Hand-tuned kernels are "near the hardware limit for that work"; which limit (bandwidth vs tensor-core compute) depends on measured arithmetic intensity, and large-batch prefill is usually compute-bound (7.3). Quiz 1 correct option no longer says "saturates memory bandwidth at high batch". | 7.3 and 9.2 place large-batch prefill right of the ridge. | fixed |
| F32 | 9.6 | The 24 GB cliff is for fully GPU-resident operation; llama.cpp CPU offload (8.7) still runs larger models at system-memory speed. Quiz 2 stem now asks about full residency and a distractor tests "offload makes it equally resident". | 8.7's offload guidance. | fixed |
| F33 | 9.9 | Summary, teach-back prompt/answer, body and closing rule: 4 KV heads limit how far the cache shards; beyond degree 4 KV is replicated while weights still shard; degree 8 is a priced cost, not ruled out. Quiz 1 stem reframed; distractors test 17,408/8 and 248,320/8 divisibility. | 17,408 / 8 = 2,176 and 248,320 / 8 = 31,040; 5.8 (other lane) already repaired the owning F06 text. | fixed |
| F34 | 9.5 | Teach-back: TP pair "could beat" one part for a single stream, settled only by benchmarking; summary bullet: single part "can win" on concurrency and simplicity, cost per token depends on prices and utilization (9.10); decision line adds a benchmark of both. Quiz 2 explanation says it is a benchmark question. | 9.10's inputs (price, utilization). | fixed |
| F36 | 9.1, 9.2, 9.8 | 32× batching gain labelled a weight-only simplified model; each added sequence's KV/state reads, context-dependent attention and scheduling make the real gain smaller; 9.8's "Nobody serves a production GPU at batch one" → "usually runs many sequences per step". | Per-sequence cache and state bytes (7.2, 9.3) are not amortized by batching. | fixed |
| F39 | 8.12 | Worked case now states peak request rate, lengths, measured service time and latency target, with a made-up Little's-law check (0.5 req/s × 20 s ≈ 10 in flight < 36); closing line names the queueing check. | Capacity (36 resident) says nothing about latency under bursts; L = λW. | fixed |
| F14 | 10.4 | Body already said matched data/schedule with architectural differences in both locales. Teach-back "controlled comparison" → matched comparison with different predictors, not an objective-only ablation; quiz 2 stem "only intended difference" → "what differed", with "only the objective, same 1B predictor" as a distractor. | Lesson body (0.5B slice vs full 1B). | fixed (wave-0 incomplete: teach-back and quiz) |
| F15 | 11.4 | Code: `chunk.get("choices") or []`, `(choice.get("delta") or {})`, `prompt_tokens_details` null-safe, one shared result dict; a measured rate now carries "approximate: assumes the first text chunk carried one token". Prose explains multi-token chunks, the first-chunk caveat and the `None`-with-note behaviour. | Harness below, in memory, no network. | fixed (wave-0 handled the five required fixtures; two further shapes raised) |
| F20 | 8.8 | EN still said the engine "deliberately does not have" a local server; now "a bare engine binary does not offer out of the box", plus the note (already in pt-BR) that llama.cpp ships `llama-server` and the runner adds model management on top. | 8.7 teaches `llama-server`. | fixed (wave-0 had fixed pt-BR only) |
| F21 | 8.8 | Full thinking preset was already there; added that sampling does not switch the mode, to use the runner's thinking toggle and to inspect the rendered prompt. | F21 acceptance text; the lesson's own toggle paragraph. | fixed (wave-0 lacked toggle/rendered-prompt step) |
| F25 | 8.2 | "covered in the agent-engineering tracks (15 and 16)" → links to 15.1 and 16.1; step 4 now checks argument meaning and caller permission before running the tool. | Bridge paths from the dispatch. | fixed (wave-0 lacked the links) |
| F28 | 8.11 | 4.29× and capacity-risk wording confirmed in both locales; EN "no engineer is paged … only because" garbled sentence rewritten. | 3,000 / 700 ≈ 4.29. | checked; wording fix only |
| F29 | 13.2 | Body was already qualified; teach-back still said "writes a lossless bf16 GGUF" (both locales) → lossless only for a bf16 source. pt-BR prose now writes 1,0009765625 and 1,0 (locale decimals). | 1.0009765625 = 1 + 2⁻¹⁰: exact in fp16 (10 mantissa bits), rounds to 1.0 in bf16 (7 bits). | fixed (wave-0 incomplete: teach-back) |
| F30 | 9.10 | Teach-back already said 8.37×; body still said "roughly fourteen times the endpoint price" (EN) and pt-BR said 8.37× right after a per-million figure. Both now: ≈14× the output-token rate, a lopsided comparison; like for like USD 1,825 vs USD 218 ≈ 8.37×. Bridge sentence added: cost per token is not cost per successful agent task (retries, failed attempts, human waiting), linking 25.2. | 1825 / 218 = 8.37; 45.63 / 3.20 = 14.3. | fixed (wave-0 incomplete: body) |
| F31 | 9.7 | pt-BR analogy no longer says distillation is "the only move through the door"; both locales: summary, analogy, teach-back, "what fits" section, bullets, warning and closing name two routes (an already-small pretrained model or a distilled sibling), scoped to the stated 3 GB scenario; bullets say sub-4-bit formats exist but quality falls steeply. Quiz 2 stem scoped to the 3 GB scenario; explanation names both routes. | F31 acceptance text. | fixed (wave-0 incomplete) |
| bridge | 13.3 | No 13.x lesson covers grammar/JSON constraints, so 13.3's "What the server exposes" gains a paragraph: a schema-valid object is only a request; check a normal stop, argument meaning and caller permission (15.1). No llama-server flag named (none was read at the pinned tag for this). | Dispatch brief. | added |

### F15 harness

Not tracked (the brief forbids touching `tests/`), so the method is recorded here.
The script extracts the lesson's ```` ```python ```` block, drops the final `print(...)`
line, `exec`s it, replaces `urllib.request.urlopen` with an object that yields SSE
lines and `time` with a fake whose `perf_counter()` returns each line's timestamp, and
calls `measure("http://fixture", "p")`. Fixture lines are `data: <json>` with
text chunks `{"choices": [{"index": 0, "delta": {"content": "Hi"}}]}`, usage chunks
`{"choices": [], "usage": {"prompt_tokens": 10, "completion_tokens": N, "total_tokens": 10 + N}}`,
and a final `data: [DONE]`. The three extra shapes: usage with
`"prompt_tokens_details": null`, a usage chunk with `"choices": null`, and a first
delta `{"role": "assistant", "content": null}`. A fixture fails if `measure` raises or
returns no rate without a note.

Before (both locales identical):

```
two text chunks with usage               OK   rate=1.0 note=None
one chunk, one token                     OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
one chunk, two tokens                    OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
two chunks without usage                 OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
no text chunks, zero usage               OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
usage with null prompt_tokens_details    RAISED AttributeError: 'NoneType' object has no attribute 'get'
usage chunk with choices null            RAISED TypeError: 'NoneType' object is not iterable
role-only first delta, content null      OK   rate=1.0 note=None
failures: 2
```

After (both locales identical):

```
two text chunks with usage               OK   rate=1.0 note='approximate: assumes the first text chunk carried one token'
one chunk, one token                     OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
one chunk, two tokens                    OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
two chunks without usage                 OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
no text chunks, zero usage               OK   rate=None note='decode rate unavailable: need at least two text chunks and a usage block'
usage with null prompt_tokens_details    OK   rate=1.0 note='approximate: assumes the first text chunk carried one token'
usage chunk with choices null            OK   rate=1.0 note='approximate: assumes the first text chunk carried one token'
role-only first delta, content null      OK   rate=1.0 note='approximate: assumes the first text chunk carried one token'
failures: 0
```

This shows the function's behaviour on recorded-shape fixtures, not what each pinned server emits.

## Quiz census

Correct option uniquely the longest (the `content:parity` measure), per track:

| Track | Items | EN before → after | pt-BR before → after |
|---|---:|---:|---:|
| 8 | 30 | 29 → 8 | 29 → 2 |
| 9 | 21 | 21 → 6 | 21 → 5 |
| 10 | 16 | 16 → 4 | 16 → 4 |
| 11 | 15 | 13 → 2 | 14 → 4 |
| 12 | 15 | 14 → 1 | 14 → 2 |
| 13 | 15 | 13 → 2 | 13 → 1 |

Length rank of the correct option across the 112 items (1 = longest, ties share the
better rank):

| Locale | Before 1/2/3/4 | After 1/2/3/4 |
|---|---|---|
| EN | 108 / 4 / 0 / 0 | 34 / 49 / 14 / 15 |
| pt-BR | 108 / 3 / 1 / 0 | 24 / 47 / 28 / 13 |

Second-longest is now the most common rank (44% EN, 42% pt-BR), because most repairs
added one distractor of comparable detail. That is a weaker cue than the old 96%,
but it is a cue. A first pass also padded distractors with intensifiers to clear the
gate; those fillers were reverted and the correct option tightened instead, which is
why some items stay cued within the 30% target. 11.5 quiz 2 (JACCL vs ring/MPI/NCCL)
stays cued by one character because its options are backend names.

## Quiz items

Positions are 0-based option indices; `*` marks the correct one. "d" = distractors
rewritten, "c" = correct tightened (claim, numbers and conditions kept; reasoning
moved to `explanation`), "s" = converted to a scenario/trace/numeric item. Every
changed item's `explanation` now says why the tempting wrong answer fails. The same
misconception sits in the same position in both locales.

| Lesson | # | Change | Misconception each new distractor tests |
|---|---|---|---|
| 8.1 | 1 | d | 0 FFN alternates instead of mixer; 2 norm placement/epsilon/FFN width vary by layer; 3 DeltaNet is an add-on beside attention |
| 8.1 | 2 | d (numeric) | 0 gate lives in its own matrix (6144); 1 projections are square; 3 KV width applies to every projection |
| 8.1 | 3 | d, c | 0 a different summation order is "less accurate"; 1 eager cannot call fused kernels (F24); 2 eager recompiles per length |
| 8.2 | 1 | d, c | 1 safety comes from Hub signatures; 2 unpickling in a sandbox; 3 weights stored as text |
| 8.2 | 2 | d, c | 0 bitwise-equal logits (F23); 2 compare final answers only; 3 identical hashes guarantee identical replies |
| 8.3 | 1 | d, c | 0 prefill is one kernel; 2 bound types swapped; 3 graphs replay token values |
| 8.3 | 2 | d, c | 0 static values instead of addresses; 1 host-resident inputs; 3 replay resolves addresses dynamically |
| 8.3 | 3 | d | 0 compiled is always slower; 1 compile moves weights to CPU; 2 compile upcasts dtype |
| 8.4 | 1 | d, c | 0 paging compresses KV; 1 finished sessions donate blocks; 3 overflow spills to CPU |
| 8.4 | 2 | d, c | 0 flag is capped/ignored; 1 bigger pool breaks batching; 2 fraction counts other processes, weights spill |
| 8.4 | 3 | d (numeric), c | 1 64 KiB spread over 64 layers; 2 DeltaNet state grows per token; 3 64 KiB per layer |
| 8.5 | 1 | d, c | 0 matching is content-addressed anywhere; 1 tree keyed from the end; 2 LRU evicts by position |
| 8.5 | 2 | s, d, c | 1 sharing cuts per-token FLOPs; 2 shared blocks page weights out; 3 sessions held separate weight copies |
| 8.5 | 3 | d, c | 0 a complete valid object can skip checks (F26); 2 mask guarantees correct values; 3 schema checked only post hoc |
| 8.6 | 1 | d, c | 1 FP8 has more mantissa precision; 2 INT8 is unsigned; 3 FP8 tensor cores do not round |
| 8.6 | 2 | d | 0 only vLLM pages KV; 2 speed implies changed tokens; 3 engine-build time dominates long prompts (F19) |
| 8.6 | 3 | d, c | 0 upstream fixed batches; 1 prefill/decode disaggregation; 3 per-batch CUDA graphs |
| 8.7 | 1 | d, c | 0 one 4-bit type for all tensors; 2 whole-file compression; 3 per-layer split with bf16 rest |
| 8.7 | 2 | d (numeric), c | 0 bf16 fallback copy; 1 header holds 3.6 GB; 3 a byte per code (would be ~27 GB) |
| 8.8 | 1 | d | 0 DeltaNet forgets early tokens; 1 GGUF caps prompts at 32,768; 3 context only for bf16 |
| 8.8 | 2 | d, c | 0 runner quantizes on load; 1 PyTorch archive converted at startup; 2 per-GPU compiled engine |
| 8.9 | 1 | s, d (F22) | 0 lazy graph needs a bf16 copy; 1 unified memory pads to bytes; 2 MLX inherits the GGUF's 17.1 GB |
| 8.9 | 2 | s (trace), d | 1 GPU-to-CPU copy on print; 2 cached result then recompute; 3 print triggers mx.compile |
| 8.10 | 1 | d, c (F27) | 0 compilers always win; 1 direction reversed by batch size; 3 fused kernels change output quality |
| 8.10 | 2 | d | 0 coordination is cross-request fusion; 1 per-request temperature; 2 per-request weight copies |
| 8.11 | 1 | d (numeric), c | 0 blended input rate on all tokens; 1 rates swapped; 2 output rate on all tokens |
| 8.11 | 2 | d, c | 1 non-English routed to a pricier model; 2 per-byte surcharge token; 3 per-character billing |
| 8.12 | 1 | d, c | 1 tokens/s is engine-only; 2 aggregate rate is a per-stream lower bound; 3 same GPU makes it valid |
| 8.12 | 2 | d, c | 1 throughput surcharge; 2 faster engines emit more tokens; 3 prices reset from benchmarks |
| 9.1 | 1 | d | 0 more FLOPs help decode; 2 KV pool caches weights; 3 higher clocks help |
| 9.1 | 2 | d (numeric), c | 0 prefill like decode; 1 ratio inverted; 3 intensity is the machine's ridge |
| 9.2 | 1 | d, c | 0 decode should reach half of peak; 1 thermal throttling; 2 peak applies to FP8 only |
| 9.2 | 2 | d, c | 1 drifts left; 2 drifts right; 3 long context makes attention compute-bound |
| 9.3 | 1 | d (direction), c | 1 64-layer cache (would lower the count, not raise it); 2 FP8 weights assumed; 3 vision tower omitted |
| 9.3 | 2 | d, c | 0 FP8 vs fp32 factor of four; 2 GQA divides by four (already counted); 3 three of four layers are vision |
| 9.3 | 3 | d | 0 FP8 halves the state; 1 constant fraction; 3 state moves to CPU |
| 9.4 | 1 | d, c | 0 bandwidth frees slots; 2 clocks; 3 FP4 cache |
| 9.4 | 2 | d, c | 0 point moves right; 1 intensity scales with bandwidth; 3 decode is compute-bound |
| 9.5 | 1 | d, c | 0 capacity lowers TTFT; 1 capacity adds FLOPs; 3 more HBM means more bandwidth |
| 9.5 | 2 | d (numeric), c (F34) | 0 sharding always loses; 1 bandwidth ratio with free all-reduces; 2 60 tok/s ceiling from another part |
| 9.6 | 1 | d, c | 0 speed scales with RAM; 1 at least as fast as a discrete GPU; 2 no per-token read |
| 9.6 | 2 | d, c, stem (F32) | 1 automatic compression; 2 discrete GPU cannot read 4-bit; 3 offload equals residency |
| 9.7 | 1 | d (numeric), c | 1 halving bits halves 17.1 GB below 3 GB; 2 metadata dominates; 3 2-bit gives a 4× speedup |
| 9.7 | 2 | d, stem (F31) | 0 distillation packs bits; 2 students skip operator checks; 3 students keep no KV |
| 9.8 | 1 | d | 0 bytes term via compression; 2 adds only arithmetic; 3 only prefill intensity |
| 9.8 | 2 | d, c | 0 layer count; 1 greedy reads fewer bytes; 3 padding dominates the read |
| 9.9 | 1 | d (numeric), stem (F33) | 0 hidden size blocks TP 8; 1 17,408 not divisible by 8; 3 248,320 not divisible by 8 |
| 9.9 | 2 | d (numeric) | 0 190 MiB/s saturates PCIe; 1 broadcast to all nodes; 2 all-reduce moves KV |
| 9.10 | 1 | d, c | 0 throughput excludes KV reads; 1 per-token licence; 3 per-byte billing |
| 9.10 | 2 | d, c | 0 memory billed separately; 1 memory sets endpoint prices; 2 HBM sets power draw |
| 10.1 | 1 | d | 1 a group per frame; 2 merge halves time; 3 native frame rate (kept) |
| 10.1 | 2 | d | 0 only the long side counts; 2 fixed count (kept); 3 larger patches at high resolution |
| 10.1 | 3 | d, c | 0 timestamps are free; 1 MRoPE lacks time; 3 timestamps skip the encoder |
| 10.1 | 4 | d | 0 decode dominates; 1 tokenization dominates; 2 timestamps go through the encoder |
| 10.2 | 1 | d, c | 0 shared gradients only speed convergence; 2 pixel noise leaks; 3 gradients reveal masks |
| 10.2 | 2 | d, c | 0 BERT-style single patches; 1 tiny targets; 3 predict from noise |
| 10.2 | 3 | d (numeric), c | 0 holds for every task; 1 runs fully matched; 2 epoch direction reversed |
| 10.2 | 4 | d, c | 1 predictor outputs pixels; 2 encoder is invertible; 3 predictor has a vocabulary |
| 10.3 | 1 | d, c | 0 pixel-space planning; 1 learned reward; 3 action tokens |
| 10.3 | 2 | d, c | 0 labelled demonstrations; 1 trained in the test labs; 2 simulation only |
| 10.3 | 3 | d, c | 1 encoder too small; 2 tubelets mix frames; 3 EMA momentum |
| 10.3 | 4 | d, c | 0 20 points everywhere with fixed settings; 2 doubled in both labs; 3 simulation only |
| 10.4 | 1 | d | 1 frame prediction; 2 EMA target as in V-JEPA |
| 10.4 | 2 | d, c, stem (F14) | 1 objective-only with the same predictor; 2 ten times the data; 3 different encoders |
| 10.4 | 3 | d, c | 0 no encoder to run; 2 a fast decoder makes per-frame decoding cheap; 3 answer replay cache |
| 10.4 | 4 | d, c | 0 replaces next-token everywhere; 1 retrieval only; 3 AR cannot model the world |
| 11.1 | 1 | d (numeric) | 0 46.8 is the M3 quotient, not a benchmark; 1 22.2 is the bf16 quotient, not a roofline |
| 11.1 | 2 | d, c | 1 compute never matters; 2 bandwidth fell; 3 Neural Engine runs decode |
| 11.1 | 3 | d, c | 0 GPU can use all RAM; 1 free-memory reading; 2 wired limits only for discrete GPUs |
| 11.2 | 1 | d | 1 second call on CPU; 2 compile switched off; 3 counter counts failures |
| 11.2 | 2 | d | 0 clock resolution; 1 cached product; 2 dead-code elimination |
| 11.2 | 3 | d, c | 0 wired limit can exceed the system's; 2 cache limit = wired limit; 3 active memory includes cache |
| 11.3 | 1 | d, c | 0 codes grow to 5 bits; 1 unquantized copies; 2 mode switch to mxfp8 |
| 11.3 | 2 | d, c | 0 fuse is lossless; 2 fuse rewrites the tokenizer; 3 fuse changes rank |
| 11.3 | 3 | d | 1 rotation on all layers and DeltaNet quantized; 2 both raise; 3 caps DeltaNet length |
| 11.4 | 1 | d (pt-BR only, length) | 2 endpoint choice (same idea, a few more words) |
| 11.4 | 2 | d, c | 0 trust SECURITY.md; 1 API key required on loopback; 3 --lan-share opens the port |
| 11.5 | 1 | d (numeric), c | 0 add both link directions; 1 bits/bytes slip gives 8×; 3 Gb/TB slip gives 1,200× |
| 11.5 | 3 | d | 0 non-zero on failure; 1 counts failed ranks; 2 shell 126 |
| 12.1 | 1 | d, c | 0 a published measurement; 2 a hard bound; 3 a prefill prediction |
| 12.1 | 2 | d, c | 0 Tensor Core reservation; 1 fixed 64/64 split; 2 ECC capacity loss |
| 12.1 | 3 | d, c | 1 FP4 unusable so bf16 rate applies; 2 weights staged via CPU; 3 measured at batch 1 |
| 12.2 | 1 | d, c | 0 one fast pool; 1 one slow blended pool; 2 always copied to HBM |
| 12.2 | 2 | d (numeric) | 1 averaged rates; 2 all-HBM rate; 3 all-LPDDR5X rate; explanation labels it a planning figure (F16) |
| 12.2 | 3 | d, c | 0 runtime major version; 1 CPU ISA; 3 Blackwell never portable |
| 12.3 | 1 | d, c | 1 launch fails; 2 runtime clips the grid; 3 runtime rounds down |
| 12.3 | 3 | d, c | 0 32-bit pointers; 1 no runtime installed; 2 nvcc built for the CPU |
| 12.4 | 1 | d | 1 halved traffic; 3 shared-memory copies count as global traffic |
| 12.4 | 2 | d, c | 0 no bf16 support; 2 hardware disables them in decode; 3 FP32 inputs required |
| 12.4 | 3 | d | 0 move to Tensor Cores; 2 GPU idle; 3 profiler cannot measure batch 1 |
| 12.5 | 1 | d, c | 0 minor-version compatibility covers new features; 2 aarch64 limited to CUDA 12; 3 firmware reflash |
| 12.5 | 2 | d, c | 0 vLLM replaces kernels; 1 batch size is the fix; 2 display compositor |
| 12.5 | 3 | d, c | 1 INT4 per-tensor; 2 MXFP4 (blocks of 32, E8M0, 4.25 bits); 3 no block scale |
| 13.1 | 1 | d, c | 0 -ngl counts from the input side; 1 interleaved layers; 2 embedding plus first layers |
| 13.1 | 2 | d | 0 memory shrinks; 2 CUDA-only flag |
| 13.1 | 3 | d, c | 0 CPU one token at a time; 1 GPU tokenizer; 3 flash attention forces GPU |
| 13.2 | 1 | d | 1 bpw fell at the same size; 2 tokenizer retrained; 3 tensor types moved |
| 13.2 | 2 | d, c | 0 KL is faster; 1 perplexity impossible on quants; 3 KL needs no reference |
| 13.2 | 3 | d | 1 OOM; 2 matrix discarded; 3 statistics are text-independent |
| 13.3 | 3 | d | 0 context shift; 2 slot mix-up; 3 response cache |
| 13.4 | 1 | d, c | 0 same work, shorter run; 2 disk and network; 3 includes tokenization/sampling |
| 13.4 | 2 | d, c | 1 -ngl ignored; 2 Metal ignores counts; 3 equal columns dropped |
| 13.4 | 3 | d, c | 0 user rows from a shared table; 1 vendor releases; 2 README quant table |
| 13.5 | 1 | d, c | 0 auto drafting; 1 vocab error; 2 -md implies draft-simple |
| 13.5 | 2 | d, c | 0 weights per token; 2 KV per token; 3 full graph per token |
| 13.5 | 3 | d | 3 low acceptance changes the output distribution |

Unchanged items (not cued, already scenario or numeric): 8.2 #3, 11.4 #3, 11.5 #2
(names only), 12.3 #2 (numeric), 13.3 #1, 13.3 #2 (trace items).

Reviewer: none yet; this log is the lane's own record for independent review.
