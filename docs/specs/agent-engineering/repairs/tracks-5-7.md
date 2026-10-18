# Repair log: tracks 5–7 (lane `tracks-5-7`)

Scope: lessons of tracks 5 (pretraining), 6 (post-training) and 7 (inference), both
locales. 36 lesson pairs changed (every lesson in the three tracks except 7.6, whose
two numeric items were not length-cued). `updated` is `"2026-10-18"` on every changed
file. No `id`, `track`, `order`, `title`, `tier`, `prerequisites`, `unlocks`, `lab`,
`citations` or `correctIndex` changed, and no option count changed (checked against
`HEAD` with js-yaml).

## Findings

| ID | Lesson | What changed (one line) | Source / counterexample | Status |
|---|---|---|---|---|
| F05 | 5.4 | Body says excluding embedding/head from N is a fitting convention, the input embedding is a lookup, and the untied head's dense logits projection still costs compute (added back in 5.13); quiz 2 explanation no longer says the head does not drive compute. | Kaplan et al. 2020 (arXiv 2001.08361v1) §2/Fig. 6: N excludes embeddings because the trends come out "significantly cleaner"; 5.13 already counts the head separately. | fixed |
| F10 | 6.11 | Step 1 lists the full six-value sampling configuration for both modes (adds min_p, presence_penalty 1.5 / 0.0, repetition_penalty) and replaces "a model nobody validated" with "presets are the reproducible baseline; other settings need recorded configuration and your own evaluation". | Model card presets as recorded in 7.4 and 6.6; F10's own acceptance text. | fixed |
| F12 | 7.11 | A 24/48 GB card changes the artifact (lower precision, sharding) before the engine; engine support is a property of engine version × model × quantization format ("some serving engines accept quantized formats", llama.cpp runners GGUF), with 7.10's kernel caveat. Same in the teach-back model answer. | 7.10's runtime caveat (silent dequantized fallback, uneven kernel support). The sentence deliberately names no engine: 8.4 and 8.5 say nothing about which quantized formats vLLM or SGLang load, so no per-engine claim was source-checked. | fixed |
| F04 | 5.5 | Arithmetic kept (21% compute, 11% tokens, D=20N held fixed, now stated). Premise corrected: Chinchilla counts embedding matrices in N and their FLOPs in C, so the 24B figure is now framed as the cost of mixing in Kaplan's convention, not "a strict application". | Hoffmann et al. 2022 (arXiv 2203.15556v1) Appendix F: "we also count embeddings matrices in the total parameter count". | fixed (wave-0 arithmetic confirmed; premise repaired) |
| F06 | 5.8 | Teach-back no longer says replication is "for no saving"; degree-8 body paragraph no longer says "in exchange for nothing" (other projections still split eight ways, the trade is measured); intro corrected to "a quarter of their full size on every rank instead of an eighth". Quiz 1 now also tests the 24-query-head divisor. | Wave-0 insight callout; at TP=8 with 4 KV heads replicated in pairs each rank holds 1 of 4 heads. | fixed (wave-0 was incomplete) |
| F07 | 5.7, 5.9, 6.3, 6.5 | One owned breakdown: 5.7 now owns the training-state budget (2 + 2 + 4 + 8 = 16 B/param, 432 GB) instead of attributing it to 9.3; 5.9, 6.3 and 6.5 reference 5.7. EN 6.3/6.5 "540 GB" (wave-0 value) corrected to 432 GB; "430 to 540 GB" → about 432 GB; "324 to 432 GB" optimizer comparison → 324 GB. pt-BR 6.3 and 6.5 had none of the wave-0 edits and now match. 5.9 says 16 B is the whole budget, not optimizer-only, and "persistent optimizer footprint" → "persistent per-parameter footprint". 5.7 quiz 1 adds the 540 GB double count as a distractor. 5.10 quiz 2 stem now cites only 5.7. | 27e9 × 16 B = 432 GB; 540 GB = 20 B/param = the double count F07 names. 9.3 contains no training-state budget (grep: no optimizer/AdamW/master/gradient lines). | fixed (wave-0 EN fix was arithmetically wrong; pt-BR was missing) |
| F08 | 6.6 | "Third" paragraph now explains length conditionally (more per-token log-ratio terms once the policy moves; measure the margin by segment) instead of "dominated by trace length"; teach-back and quiz 2 no longer equate summed log-probability with the margin; quiz 2 correct option says "sums per-token log-ratios". | Equal policy and reference give a zero margin at any length (DPO margin formula in the lesson). | fixed (wave-0 left the unconditional sentence, teach-back and quiz) |
| F09 | 6.9 | Heading, opening question and teach-back prompt/model answer reframed from "hot trace vs cool final answer" to per-mode presets (thinking-mode answers are also sampled at 1.0); the rationale is labelled a hypothesis in the teach-back too. | Model card presets are per mode (7.4's table); card gives no rationale. | fixed (wave-0 only hedged one paragraph) |
| F11 | 7.11 | Removed the KV-only 381,700-token recalculation; the paragraph now names the 23.3 GiB state pool (9.3) and cites 7.8's ten 32K sessions (2 GiB KV + 144 MiB DeltaNet each). "Overstates by a fifth" kept: naive 80−54 GB = 24.2 GiB ÷ 2 GiB = 12 vs 10. | 7.8 capacity paragraph and teach-back. | fixed (wave-0 still re-derived capacity) |
| F13 | 7.13 | No change needed: both locales now read 71.9 as between 76.7 and 69.8 with the largest bpw of the three; quiz and teach-back do not repeat the old claim. | `LLAMA_CPP_QUANT_BENCH` rows Q4_K_S 76.71, Q3_K_S 69.84, Q4_K_M 71.93 / 4.8944 bpw. | checked, no change |
| F19 (7.11) | 7.11 | Removed "rebuilds when shapes change" and the teach-back's "engine builds"; ops cost is now version pinning and revalidation when model, precision, runtime version or traffic mix change, matching 8.6. 8.6 was read, not edited. | 8.6 body: no conversion/trtllm-build step, "What you no longer do is build and maintain separate engine files". | fixed (agreement with 8.6; 8.6's own upstream claim is the track-8 lane's) |
| pending | 5.8 | Sequence-parallel paragraph: DeltaNet layers need a rank-to-rank state handoff (forward) and gradient handoff (backward), constant size, not "no exchange". | LASP (Sun et al., arXiv 2404.02882v1) Algorithm 2 (forward, lines 12 and 17; backward in Algorithm 3): "Recv activation KV_{t−1} from rank (i − 1)", "Send activation KV_t to rank (i + 1)"; the delta rule's recurrence has the same dependency. Not cited in prose (citations are protected). | fixed |
| pending | 6.8 | "No gradient whatsoever" → no reward gradient; the β-weighted KL term still pulls toward the reference, so the update is exactly zero only at β = 0. Same in the teach-back; 6.9 body and quiz-2 stem reworded to "no reward signal / reward-driven gradient". | DeepSeekMath (arXiv 2402.03300v3) eq. 3 objective with −β·D_KL, and eq. 20/21 gradient coefficient Â + β(π_ref/π_θ − 1). | fixed |
| pending | 7.7 | Teach-back no longer says traffic scales with inputs/outputs; caveat now separates O(N) extra memory from Θ(N²d²/M) HBM traffic, still quadratic in N, with a thinner margin at d = 256. | Dao et al. (arXiv 2205.14135v2) Theorem 1 (O(N) additional memory) and Theorem 2 (standard Θ(Nd + N²), FlashAttention Θ(N²d²M⁻¹)). | fixed |

## Quiz items

Change codes: **D** distractors rewritten, **T** correct option tightened (reason moved
to `explanation`, claim/number/conditions kept), **S** converted to a changed-scenario
item, **Q** stem reworded. Every changed item also has an `explanation` that names why
the tempting wrong answers fail, unless marked otherwise. Positions hold the same idea
in both locales. Reviewer: lane `tracks-5-7` (self); independent review not yet run.

| Lesson | Item | Change | Misconception each new distractor tests |
|---|---|---|---|
| 5.1 | 1 | D | MTP tokens are final without verification; extra heads see right-hand context; MTP lengthens the context |
| 5.1 | 2 | D, T | shift aligns RoPE angles; shift is needed to attend to the first token; the shift itself builds the causal mask |
| 5.1 | 3 | D | whole-word masking = span corruption; target is the whole input (BART-style); random-word replacement (BERT) |
| 5.2 | 1 | D, T | token count is on the card; cutoff = release date; code share readable from tokenizer merges |
| 5.2 | 2 | D, T | duplicates are merged automatically; repeated text gets ignored; gradient normalized per document |
| 5.2 | 3 | D | decontamination = toxicity filtering / licence review / dedup for diversity |
| 5.3 | 1 | D, T | 248,320 = mapped tokens, all rows trained; card states the TP reason; rows = IDs + specials, no padding |
| 5.3 | 2 | D, T | tokenizer sample leaks benchmarks; merge counts must match model loss; raw bytes unencodable before filtering |
| 5.3 | 3 | D | vocabulary size alone suffices; merge order without special tokens; data-loader seed |
| 5.4 | 1 | D, T | raw-loss ratio (0.058); loss difference as exponent (0.40); two points cannot fix an exponent |
| 5.4 | 2 | D, T (+F05 explanation) | count both matrices on N; vocabulary moves the floor; untied heads break power laws |
| 5.4 | 3 | D | train every candidate fully; exponent is universal; replace held-out evaluation |
| 5.5 | 2 | D, T | 20 tokens/param as a floor; log-log plotting as the error; holding compute fixed as the error |
| 5.5 | 3 | D | iso-compute holds parameters / tokens / serving cost fixed |
| 5.6 | 1 | D, T | 24 query heads alone give 24; bf16 vs fp32 as a factor of 4; query reads shrink the cache |
| 5.6 | 2 | D, T | loss stops improving past the point; longer training lowers the floor; more tokens always better |
| 5.6 | 3 | D | cluster FLOPs / LR schedule / vocabulary set the inference-aware optimum |
| 5.7 | 1 | D, T, Q | optimizer state on CPU (54 GB); forgetting optimizer state (108 GB); 540 GB double count of F07 |
| 5.7 | 2 | D, T | DeltaNet state recomputed so no activations; fixed state allows bf16 optimizer state |
| 5.7 | 3 | D (pt-BR also T) | FSDP gathers optimizer state / other ranks' gradients / saved activations |
| 5.8 | 1 | D, T | vocabulary or FFN stop dividing at 16/8; query heads (true at 16, but not first) |
| 5.8 | 2 | D, T | ZeRO-3 keeps full parameters; TP removes ZeRO gathers; FSDP requires a TP group |
| 5.8 | 3 | D | bubble = activation memory / transfer latency / microbatch padding |
| 5.9 | 1 | D, T | bf16 lacks exponent range; released checkpoint is fp32; AdamW needs fp32 weights by definition |
| 5.9 | 2 | D, T | per-rank scales then add; fp8 exponents remove the shared scale; scale matters only forward |
| 5.10 | 1 | D, T | weights/gradients saved per layer; fp32 storage of activations; training keeps a KV cache |
| 5.10 | 2 | D, T, Q (stem cited 9.3) | boundaries store moments in bf16; recomputation regenerates moments; only under ZeRO-3 |
| 5.10 | 3 | D, T | recompute reinitializes weights; data loader must replay order; loss scaling is random |
| 5.11 | 2 | D, T | halve LR because steps are slower; extend warmup in wall-clock; stretch decay to keep the end date |
| 5.11 | 3 | D, T | warmup = batch-size ramp / weight-decay ramp / data curriculum |
| 5.12 | 1 | D, T | mean follows the worst rank; midpoint of two values; one rank cannot move the mean |
| 5.12 | 2 | D, T | slow drift as optimizer re-adapts; delayed overflow from stale moments; data replay drift |
| 5.12 | 3 | D, T | NaN only from hardware; NaN does not propagate; a NaN halts the job so nothing to diagnose |
| 5.13 | 1 | D, T | constant should be 8; bf16 doubles FLOPs; input embedding lookup is a dense projection |
| 5.13 | 2 | D, T | resume spends no repeated FLOPs; utilization already includes failures; refiltering budget |
| 5.13 | 3 | D, T | peak counts fp8 vs fp32 training; per-node vs per-GPU; batch-size-one assumption |
| 6.1 | 1 | D, T | never saw instructions; attention is a recency rule; SFT adds missing knowledge |
| 6.1 | 2 | D, T | new gating layer for assistant tokens (kept: new role heads, lookup table) |
| 6.1 | 3 | S | (scenario: base model knows "chat" but writes another instruction) SFT adds vocabulary; adds a translation module; replaces next-token decoding |
| 6.2 | 1 | D, T | SFT uses a ranking loss; only last layers train; much higher LR overwrites |
| 6.2 | 2 | D, T | volume installs behaviour; reteach grammar first; maximize new skills per example |
| 6.2 | 3 | D, T | rows dilute the signal; set must fit the context window; overwrite in proportion to count |
| 6.3 | 1 | D (pt-BR also T) | base weights at lower rank; embedding/output rows only; biases and norms only (BitFit) |
| 6.3 | 2 | D (pt-BR also T) | rank too low to learn turn ends; quantization lost the stop token; merging before evaluation |
| 6.3 | 3 | D, T | adapters trained in 4-bit; integer-only backward; quantize after training then merge |
| 6.4 | 1 | D, T | pairs give absolute scores / annotator agreement / reasons |
| 6.4 | 2 | D, T | reward model fails to converge; noisy pairs cancel out; policy imitates rejected responses |
| 6.4 | 3 | D, T | annotator gaming; reward drift from retraining; LR schedule reacting to reward |
| 6.5 | 1 | D, T | KL averages rewards with the reference; KL freezes the reward model; KL as value baseline |
| 6.5 | 2 | D, T | rising reward means KL off; reward model cannot score new responses; higher reward = shorter |
| 6.5 | 3 | D, T | hard clamp of the ratio; clipping advantages; KL cap |
| 6.6 | 1 | D, T | reference generates rejected responses; reference acts as reward model; reference as distillation target |
| 6.6 | 2 | D, T (F08) | truncation drops answers; DPO length-normalizes (SimPO); rejected tokens discarded |
| 6.6 | 3 | D, T | DPO needs a reward model; DPO samples each step; DPO removes length bias |
| 6.7 | 2 | D, T | reference only rescaled the loss; SimPO becomes pointwise like KTO; chosen likelihood guaranteed to rise |
| 6.7 | 3 | D, T | DPO's summed log-ratio; ORPO's odds-ratio term; KTO's binary labels |
| 6.8 | 1 | D (pt-BR also T) | value model baseline (PPO); reference greedy reward; running average across prompts |
| 6.8 | 2 | T only (distractors kept) | — (reason "test suite is indifferent to prose" moved to explanation) |
| 6.9 | 1 | D, T | longer traces always help; temperature 0; no checker needed |
| 6.9 | 2 | D, T (stem reworded for 6.8 KL fix) | verifier rejects identical answers; advantage divides by zero; only first sample scored |
| 6.9 | 3 | D, T | greedy per step; probability averaging (ensembling); beam search |
| 6.10 | 1 | D (pt-BR also T) | formal guarantee; banned-word filter; human labels under a rubric |
| 6.10 | 2 | D, T | AI labels noisier everywhere; judges cannot compare pairs; reward model needs no rubric |
| 6.10 | 3 | D | AI-written reward function; retrieval-augmented learning; rejection sampling without RL |
| 6.11 | 1 | D (pt-BR also T) | hidden-state distillation; single confidence score; teacher gradients |
| 6.11 | 2 | D, T | quantized models cannot run on mobile; quantization always loses more quality; 4-bit has no logits |
| 6.11 | 3 | D, T | logit distillation; pruning; SFT on human answers with teacher as judge |
| 7.1 | 1 | D, T | prefill skips the mask; layers run in parallel; prefix cache is why prefill is parallel |
| 7.2 | 1 | D, T | all 64 layers cache (the 256 KiB wrong turn); DeltaNet state grows; only the last layer |
| 7.3 | 1 | D, T | prefill sets inter-token latency / streaming throughput / total reply time |
| 7.3 | 2 | D, T | layers skipped in decode; KV compressed harder; slower-growing cache = flat |
| 7.4 | 1 | D, T | logits from attention weights; from input-embedding rows (tied-head confusion); from KV cache |
| 7.4 | 2 | D, T | card proves self-correction; T=1.0 disables sampling; vendor rationale stated as fact |
| 7.5 | 1 | D | draft distribution corrected on average; greedy output; target top-1 then sampling |
| 7.5 | 2 | D, T | MTP tokens need no verification; longer context; faster prefill |
| 7.7 | 1 | D | avoids materializing K/V; attention output; query blocks |
| 7.7 | 2 | D, T | decode skips attention; decode uses linear attention; decode stores the full score matrix |
| 7.8 | 1 | D | block table = embedding lookup / scheduler slots / prefix-sharing index |
| 7.9 | 1 | D, T | fewer bytes drop high-order digits; dequantization adds fresh noise; calibration mismatch creates error |
| 7.9 | 2 | D, T | prefill runs fp32; decode reruns calibration; quantized kernels add arithmetic throughput |
| 7.10 | 2 | D, T | smaller groups need no calibration; more bits per weight; kernels skip outliers |
| 7.11 | 1 | S | (scenario: vendor 3,000 tok/s FP8 batch 64 vs own 1,200 bf16 batch 8) only GPU / only batch size / only precision must match |
| 7.11 | 2 | D, T | paged KV allocation or prefix caching as the admission mechanism |
| 7.12 | 1 | D, T | tokenizer adds 3.6 GB; GGUF stores tensors twice; byte padding (would give 27 GB) |
| 7.12 | 2 | D, T | tokenizer files load into VRAM; optimizer state kept at inference; file size = resident memory |
| 7.13 | 1 | D, T | byte padding then compression; tokenizer counted; KV cache counted |
| 7.13 | 2 | D, T | prefill skips FFN; quantized kernels only for decode; prompt weights read from disk |
| 7.13 | 3 | D, T | per-weight sensitivity; compressed weight copy used at inference (kept: IQ guarantee) |

Census of "correct option uniquely the longest" (same parser as `content:parity`):

| Track | EN before → after | pt-BR before → after |
|---|---|---|
| 5 | 36/39 → 1/39 | 35/39 → 0/39 |
| 6 | 31/33 → 0/33 | 31/33 → 0/33 |
| 7 | 21/27 → 0/27 | 21/27 → 0/27 |

Reverse-cue check after repair: the correct option is uniquely the *shortest* in 9/39,
8/33, 5/27 (EN) and 12/39, 7/33, 4/27 (pt-BR), close to the 25% a random position gives.

## Corrected-option claim changes

The correct options are protected text. Four changed what they claim, all under a
factual finding rather than for length: 6.6 q2 (F08: "summed token log-probability" →
"sums per-token log-ratios"), 5.7 q1 (F07: breakdown restated as 16 B/param), and the two
scenario conversions (6.1 q3, 7.11 q1), which keep the correct concept and index.

## Outside this lane (not fixed)

- AGENTS.md says the memory budget is derived "once in 9.3"; 9.3 owns the serving
  budget only, and 5.7 now owns the training-state breakdown. Wording is an owner call.
- 9.9 repeats the TP=4 ceiling (F33, track 9) and should adopt 5.8's replication-is-a-cost
  wording.
- 5.8's summary and closing sentence still frame the 4 KV heads as the divisor the
  architecture gives you; defensible with "clean", left as is.
- At the time of the gate run, `content:parity` failed for 4.15 pt-BR (math spans 30/31
  swapped) and for the length cue in tracks 4, 11, 12 and 13 (other lanes).

## Integrator corrections after independent review (Fable 5.1, 2026-10-18)

| Item | Problem | Fix |
|---|---|---|
| 5.13 quiz 1 | The repair moved the correct option to index 2 while `correctIndex` stayed 1, so the key marked the bf16 distractor correct | Options 1 and 2 swapped back in both locales |
| 7.11 quiz 1 | Three "Only X must match" distractors left the inclusive option as an all-of-the-above cue | Distractor 0 is now an inclusive-but-wrong set |
| 5.8 pt-BR quiz | "Shardear estado" | "Dividir o estado em shards" |
