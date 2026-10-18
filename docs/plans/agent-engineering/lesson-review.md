# Existing lesson review and improvement backlog

Reviewed source: `3ebaaa71d8b8cf26554bc5d6f2e7cba60f0ea040`, 2026-10-18. This is a source/editorial review, not a new production certification. No existing lesson was modified.

## Overall assessment

Preserve the course's worked-example voice, bilingual structure, primary citations, transparent model-fact limits, and local-only learning state. The most valuable improvements are stronger assessments, repaired numerical/causal claims, executable entry exercises, and explicit bridges from model mechanics to application systems. A second blanket prose rewrite would create avoidable regression risk.

The previous 0.12.0 rewrite and its per-lesson ledger are historical context, not proof that the present corpus is error-free. Current automated gates pass while semantic defects remain.

## Evidence and boundaries

Fresh review is divided into disjoint source-reading tracks 0–4, 5–9, and 10–13. The final coverage record below distinguishes full source reading from automated corpus-wide checks. External hardware/software claims are not automatically false because a reviewer cannot verify them; pending source checks are listed separately.

Current mechanical checks:

| Check actually run | Result | What it does not prove |
|---|---|---|
| `pnpm content:parity` | PASS: 125 lessons and 14 tracks per locale | Equivalent pedagogy or factual truth |
| `pnpm content:stubs` | PASS: all 250 exceed the word floor and lack stub markers | Readability or useful practice |
| `pnpm content:graph` | PASS: 125 IDs, 181 directed edges, no cycles/unresolved IDs | Every prerequisite is pedagogically sufficient |
| `pnpm content:citations` | PASS: 250 valid citation policies | Each source supports each claim |
| `pnpm content:assets` | PASS: 278 content files scanned; zero local asset references | A screenshot or visual examination of figures |
| `pnpm content:figures` | PASS: 14 figure IDs resolve | A figure is scientifically accurate |
| Five focused Node test files | PASS: 15 tests | Full build, rendered pages, real training/serving runs |

The focused command was `node --experimental-strip-types --test tests/content-checkers.test.mjs tests/content-locale.test.mjs tests/content-pins.test.mjs tests/content-dates.test.mjs tests/content-quiz-distribution.test.mjs`. Git emitted three `unable to create temporary object directory` diagnostics during history-related checking; the test runner still reported 15 pass / 0 fail. Do not interpret that as an independently clean Git execution trace.

`codemap --importers docs/plans/agent-engineering/plan.md` reported that the new document was not indexed. That is not proof of zero importers. Only planning documents have been added.

The frontier reviewer executed the exact Python code block from lesson 11.4 **in memory**, replacing the HTTP stream and clock with fixtures; no real server or network was used:

| Fixture | Observed behavior |
|---|---|
| Two text chunks with usage | Succeeds, reported decode rate 1.0 token/s |
| One text chunk, one token | `ZeroDivisionError` |
| One text chunk containing two tokens | `ZeroDivisionError` |
| Two text chunks without usage | `TypeError` indexing `None` |
| No text chunks, zero-token usage | `TypeError` subtracting `None` values |

This establishes the function's edge-case behavior, not what each pinned server emits. The same lane verified the FP16→BF16 counterexample in F29 with standard-library arithmetic. The main session independently recomputed F04's 20.99% result and the quiz-option census.

## The highest-leverage assessment problem

A fresh Python census parsed every lesson's JSON `options` array and `correctIndex` from frontmatter and compared character lengths:

| Locale | Quiz items | Correct option uniquely longest | Fraction | Longest including ties |
|---|---:|---:|---:|---:|
| EN | 352 | 314 | 89.2% | 319 |
| pt-BR | 352 | 316 | 89.8% | 321 |

This is a strong answer-length cue, not a learner study. It does not prove that every long option is bad, but a learner choosing the uniquely longest answer could bypass much of the intended reasoning. Existing answer-position tests do not address it.

**Priority P1:** review all 352 paired quiz items, keeping the concept and correct answer while rewriting distractors to be plausible and comparable in detail. Do not mechanically pad wrong answers or impose a universal character ratio. Include at least one changed-scenario, trace-reading, or numerical-reasoning item per lesson where appropriate. Preserve the same misconception and answer ordering across languages. Add a review report for option-length cues rather than treating a length linter as proof of assessment quality.

This is an **assessment-repair workstream**, not a prose-only rewrite: `docs/WRITING.md` currently protects `options` and `correctIndex` during voice rewrites. Before implementing option changes, document a narrow reviewed assessment-repair procedure there, preserving the voice rule and requiring bilingual intent/order review. The current task does not change those protected fields.

The 80-character / 15-word teach-back threshold checks participation, not correctness. Add explicit comparison prompts and self-check criteria in prose, and distinguish lesson completion from capstone competence. Do not add remote grading or send learner prose off-device.

## Confirmed findings and repair acceptance

Priority P1 means a wrong mechanism, number, inference, or runnable behavior should be repaired before expanding the related material. P2 means an important explanation or source-boundary correction. These are curriculum priorities, not security incident severities. Unless noted, the finding appears in both locales. References below point to EN; the paired pt-BR file has the same basename and must be reviewed in the same change.

| ID | Priority | Evidence | Repair and acceptance |
|---|---|---|---|
| F01 | P1 | [0.2:62](../../../src/content/lessons/en/0-orientation-and-foundations/0.2-history-ngram-to-gpt.mdx#L62): claims different trigram lookup keys for “the cat sat on the” and “the dog sat on the” | Both have last-two-word context “on the”. Use this as the demonstration that earlier context is lost, or choose genuinely different final pairs. Quiz must distinguish full prefix from n-gram context. |
| F02 | P1 | [0.3:52](../../../src/content/lessons/en/0-orientation-and-foundations/0.3-probability-you-need.mdx#L52): calls Mercury a poor continuation after “the liquid metal is” | Mercury is a liquid metal. Replace with an unambiguous contrasting context and verify the Portuguese example independently. |
| F03 | P2 | [1.6](../../../src/content/lessons/en/1-text-to-tensors/1.6-word2vec-glove-analogy.mdx): asserts no separate word-vector pretraining in Qwen despite the course's unpublished-recipe boundary | Distinguish an inference architecture with no word2vec module from unknown embedding initialization/training history. Require a primary source for any historical claim. |
| F04 | P1 | [5.5:57–70](../../../src/content/lessons/en/5-pretraining-at-scale/5.5-chinchilla-compute-optimality.mdx#L57): with `D=20N`, reducing N from 27B to 24B allegedly reduces compute about 10% | Since `C=6ND=120N²`, the compute reduction is `1-(24/27)²≈20.99%`; token count falls about 11.11%. State what is held fixed and correct both languages. |
| F05 | P2 | [5.4:23](../../../src/content/lessons/en/5-pretraining-at-scale/5.4-kaplan-scaling-laws.mdx#L23) versus [5.13:72](../../../src/content/lessons/en/5-pretraining-at-scale/5.13-pretraining-costs.mdx#L72): output-head compute explanation drifts | An embedding lookup and an untied output-head dense projection have different compute costs. Align the fitting convention explanation with 5.13; do not imply the head is computationally negligible because a fit excludes it. |
| F06 | P1 | [5.8:71–85](../../../src/content/lessons/en/5-pretraining-at-scale/5.8-model-parallelism.mdx#L71): TP=8 shards FFN weights but later says duplicated KV provides “nothing” | KV-head sharding savings saturating at four is not a universal TP ceiling; other tensors still shard. Explain the measured memory/communication tradeoff and update teach-back/quiz if they repeat the overclaim. |
| F07 | P1 | [6.3:50–54](../../../src/content/lessons/en/6-post-training-and-alignment/6.3-lora-qlora-and-peft.mdx#L50), [6.5:102](../../../src/content/lessons/en/6-post-training-and-alignment/6.5-rlhf-with-ppo.mdx#L102), versus [5.9:77](../../../src/content/lessons/en/5-pretraining-at-scale/5.9-mixed-precision.mdx#L77) | The named Adam/master recipe is 12 bytes of optimizer/master state plus 2 weights + 2 gradients = 16 total. A 16-byte optimizer-only upper bound needs a separate explicit recipe; otherwise the 540 GB figure double-counts. Use one owned breakdown and reference it. |
| F08 | P1 | [6.6:57–72](../../../src/content/lessons/en/6-post-training-and-alignment/6.6-dpo-skipping-the-reward-model.mdx#L57): unequal lengths allegedly dominate DPO before quality | DPO uses policy/reference log-ratios. Equal policy and reference give zero margin irrespective of response length, a direct counterexample. Explain possible length effects conditionally; do not equate raw sequence likelihood with the DPO margin. |
| F09 | P1 | [6.9:75](../../../src/content/lessons/en/6-post-training-and-alignment/6.9-reasoning-models-test-time-compute-and-long-cot.mdx#L75) versus [7.4:42](../../../src/content/lessons/en/7-inference-and-efficiency/7.4-sampling.mdx#L42) | 6.9 turns thinking-mode versus instruct-mode settings into hotter reasoning-segment versus cooler final-answer settings and invents a vendor rationale. Reuse 7.4's explicit distinction between documented presets and unproven explanation. |
| F10 | P2 | [6.11:71](../../../src/content/lessons/en/6-post-training-and-alignment/6.11-distillation-making-small-models-punch-up.mdx#L71) versus [6.6:74](../../../src/content/lessons/en/6-post-training-and-alignment/6.6-dpo-skipping-the-reward-model.mdx#L74) | “Nobody validated” is not established by choosing an off-preset distribution. Presets are reproducible baselines; other settings require recorded evaluation. Include the full stated sampling configuration rather than silently omitting a penalty. |
| F11 | P1 | [7.11:58](../../../src/content/lessons/en/7-inference-and-efficiency/7.11-serving-stacks-vllm-sglang-tensorrt-llm.mdx#L58) versus [7.8:56](../../../src/content/lessons/en/7-inference-and-efficiency/7.8-pagedattention-and-continuous-batching.mdx#L56) | 7.11 says eleven 32K sessions from 23.3 GiB, ignoring the 144 MiB per-sequence DeltaNet matrix state that yields ten in 7.8. Reference the canonical runtime budget rather than recalculate a KV-only capacity. |
| F12 | P1 | [7.11:62](../../../src/content/lessons/en/7-inference-and-efficiency/7.11-serving-stacks-vllm-sglang-tensorrt-llm.mdx#L62) versus [7.10:96](../../../src/content/lessons/en/7-inference-and-efficiency/7.10-quantization-ii-gptq-awq-gguf-qat.mdx#L96) | Memory capacity constrains artifact precision/configuration, not a categorical local-runner versus serving-engine choice. Qualify support by the actual engine/model/quantization combination. |
| F13 | P1 | [7.13:102](../../../src/content/lessons/en/7-inference-and-efficiency/7.13-choosing-and-judging-a-community-quant.mdx#L102) | 71.9 tok/s is not slower than 69.8; 4.8944 bpw is not between 4.67 and 3.64. Rewrite the comparison from its table. Keep the useful lesson that smaller is not always faster. |
| F14 | P1 | [10.4:90–108](../../../src/content/lessons/en/10-video-and-world-models/10.4-vl-jepa-predicting-meaning.mdx#L90) | Claims only the objective changes while also describing a 0.5B sliced predictor versus full 1B baseline. Call it a matched-data/schedule comparison with architecture differences, not an objective-only causal ablation. |
| F15 | P1 | [11.4:110](../../../src/content/lessons/en/11-mac-studio-ultra-and-mlx/11.4-serving-from-a-mac-mlx-lm-server-and-mlx-serve.mdx#L110) | SSE timing snippet needs explicit empty/single-text-chunk and missing-usage handling. A chunk can contain several tokens; an observed first chunk is not necessarily the first model token. Return a qualified unavailable rate when it cannot be measured. |
| F16 | P1 | [12.2:85–102](../../../src/content/lessons/en/12-dgx-and-cuda/12.2-dgx-station-hbm-beside-a-big-pool.mdx#L85) | Peak-bandwidth quotients are idealized planning bounds, not a measured worst-case throughput guarantee. A max/sum overlap model does not bound real latency once compute and overhead are omitted. Label assumptions throughout, including quiz/model answer. |

## Improvements by track

Additional cross-lesson findings from the complete reading:

| ID | Priority | Evidence and repair |
|---|---|---|
| F17 | P2 | 2.4's insight reduces every capability claim to cross-entropy, while its warning at line 85 correctly distinguishes loss from usefulness, safety and truth. Scope the insight to the next-token objective; preserve the warning. |
| F18 | P2 | 2.8's RMSNorm worked case claims unit RMS despite a formula with learned gain. State `g=1` for that worked example or describe normalization before applying gain; preserve epsilon assumptions. |
| F19 | P1 | 7.11:14,72 presents TensorRT-LLM engine-build requirements while 8.6:52–56 says that backend was removed. The internal contradiction is confirmed; verify the pinned upstream release before choosing the factual replacement, then synchronize both summaries. |
| F20 | P1 | 8.8:48–52 calls the local HTTP server something llama.cpp deliberately lacks; 8.7:80–84 already teaches `llama-server`. Describe what the runner adds to lifecycle/distribution instead. |
| F21 | P1 | 8.8:70–82 suggests changing only temperature/top_p for thinking while retaining the instruct `presence_penalty: 1.5`, against 7.4's thinking preset of zero; the mode toggle is also separate. Provide the complete mode/template/sampling configuration and inspect the rendered prompt. |
| F22 | P1 | 8.9:14 and quiz at 16–19 use the GGUF Q4_K_M size to characterize an MLX artifact, although line 70 converts a separate format. Name and measure the actual MLX artifact or explicitly label the GGUF number as a comparison. |
| F23 | P2 | 8.1:44,85 requires identical greedy output as a correctness condition while acknowledging numerical rounding, and 8.3:107 acknowledges output changes after reordering. Use tolerance/near-tie analysis and task checks, not universal token identity. |
| F24 | P2 | 8.1:14,48,93 conflates eager execution with the absence of fused kernels, batching and paging. Explain these as distinct implementation choices; eager is not synonymous with every possible unoptimized behavior. |
| F25 | P1 | 8.2:112–119 reduces tool use to parsing/executing model output and dismisses a dedicated lesson. Add semantic argument validation, authorization, idempotency, failure handling and an explicit bridge to the proposed tool/security tracks. |
| F26 | P2 | 8.5:24–27,86–97 presents constrained generation as eliminating parsing errors without handling truncation, cancellation or unsupported schema features. Require successful completion and final schema validation before any tool execution. |
| F27 | P2 | 8.10:67 uses large-batch prefill as a bandwidth-saturation example while 7.3 explains its usual compute-bound character. Qualify by measured arithmetic intensity/workload; don't teach an unconditional reversal. |
| F28 | P2 | 8.11:74 calls 700→3,000 input tokens a tripling; it is approximately 4.29× with equal pricing/workload. Line 81 says “no capacity risk” directly after discussing rate/concurrency/region limits. Correct both statements. |
| F29 | P2 | 13.2:14,72 describes BF16 conversion as generally lossless. `1.0009765625` is exactly representable in FP16 but rounds to BF16 `1.0`; qualify losslessness by the source dtype and values. This counterexample does not establish loss in the specific Qwen checkpoint. |
| F30 | P1 | 9.10:18,83–89 compares the full rented-workload price with only the endpoint's output-token rate and calls the difference 14×. The lesson's own full bills are USD 1,825 and USD 218, a ratio of about 8.37×. Keep the later workload-mix break-even formula and compare like-for-like totals. |
| F31 | P1 | 9.7:11,23 has semantic translation drift: EN qualifies the limit by supported lower-bit formats and acknowledges sub-4-bit quantization; pt-BR replaces this with categorical “only” training/distillation language. Restore the same caveats. Both locales also overstate that edge deployment requires distillation, omitting selection of an already-small pretrained model. Scope conclusions to the stated 3 GB scenario. |
| F32 | P2 | 9.6:48,101 treats a 24 GB discrete GPU as a universal cannot-load boundary while 8.7:14,80,87 permits partial CPU offload. Qualify the statement as fully GPU-resident operation, distinguishing feasibility from interactive performance. |
| F33 | P2 | 9.9:6,14,118,125 repeats the TP=4 ceiling from F06. Repair the owning explanation and its downstream recommendation together; replication is a cost, not impossibility or absence of all other sharding benefits. |
| F34 | P2 | 9.5:88 concludes a single large GPU wins cost per token without prices or utilization, whereas 9.10 explains those inputs are essential. Its model answer says a TP pair “would beat” one GPU while the quiz says “can.” Retain a conditional benchmark question instead of a universal economic/performance verdict. |
| F35 | P2 | 9.4:61 repeats the TensorRT engine-builder framing that conflicts with 8.6; include it in F19's source-verified synchronization. |
| F36 | P2 | 9.1:102,9.2:89,9.8:89 scale batching throughput by weight reuse without carrying additional KV/state traffic and other costs. Label this explicitly as a weight-only simplified model. Remove 9.8's universal claim that nobody serves production GPU requests at batch one. |
| F37 | P2 | `KvBudgetLab.astro:66–67` / `lab-math.ts:32` offer a 4-bit ideal 0.5-byte-per-parameter estimate while 7.12 distinguishes that 13.5 GB value from the actual 17.1 GB artifact. Label ideal packed-code sizing or use an actual artifact-byte input; do not present it as a measured deployment fit. |
| F38 | P2 | `CostPerTokenLab.astro` / `lab-math.ts:59–69` vary input-token billing while capacity remains based on a fixed output throughput. State that throughput must be measured for the chosen input/output mix; the calculator does not establish achievable capacity for arbitrary changed prompts. |
| F39 | P2 | 8.12:96 infers one-card sufficiency from 36 resident sequences and 200 daily users. Capacity alone does not establish latency or throughput under burst arrivals. Require request-rate, input/output-length, service-time and latency-target assumptions before the deployment recommendation. |
| F40 | P1 | 2.2:14 uses row-vector equations `H=XW1+b1`, `Y=HW2+b2`, then collapses the weights as `W2W1`. In that convention the product is `W1W2`, with bias `b1W2+b2`. Correct both model answers and verify dimensions with a small non-square example. |
| F41 | P1 | 4.4:62 calls 248,320 the tokenizer vocabulary, losing the course's distinction between 248,077 mapped IDs and the padded 248,320 model rows. Use the owned model facts and preserve the distinction taught in track 1. |
| F42 | P2 | 4.7:84 says residual/value representations never see position, while its own model answer acknowledges position-dependent information from earlier computation. 4.9:96 similarly conflates a positionwise FFN with position-free inputs. Say these operations do not directly apply positional mixing, while their inputs can encode position. |
| F43 | P2 | 4.14:116 treats all-zero weights as a definitive missing-shard diagnosis. A statistic is a diagnostic clue, not a unique causal test. Check checkpoint manifest, expected keys/shapes, hashes and load errors before attributing corruption; apply the same caution to unusual norm scales. |
| F44 | P2 | 4.7:99 says increasing the RoPE base stretches every wavelength. In the lesson's frequency formula, the zero-index plane has exponent zero and is unchanged. Qualify the claim to the affected nonzero-index planes and retain the worked frequency relationship. |
| F45 | P2 | 4.14:14,16–19 treats differently named, same-shaped checkpoint tensors as proof of untied runtime parameters. Names/shapes alone do not establish parameter identity after loading. Ground the conclusion in the configuration and loader/weight-tying contract; ask learners what further evidence is needed. |

For these rows, lesson IDs resolve uniquely to the source paths listed in the coverage ledger. They are not blanket assessments of their tracks.

Recommendations below do not mean every existing explanation is defective. Preserve good material and add the smallest missing worked case or exercise.

| Track | Preserve | Improve / bridge to agents |
|---|---|---|
| 0 — Orientation | Model-output contract, source skepticism, math entry points | Repair F01/F02; make 0.7 a complete CPU-only executable tiny example with setup, defined variables and expected output; separate greedy decoding from runtime determinism |
| 1 — Text to tensors | Concrete token/embedding explanations and vocabulary caveats | Distinguish API JSON from actual chat-template tokens; natural pt-BR polysemy instead of “banco de rio”; qualify F03; connect tokenization to context budgeting |
| 2 — Neural foundations | Small numerical examples and mechanism-first sequence | Add a coherent tiny-network exercise with gradient/shape checks; keep training implementation elective for the agent path rather than making every agent learner train a model |
| 3 — Sequence models | Recurrence-to-attention conceptual progression | Make learned recurrent state versus application-persisted workflow state explicit; use a short trace to prevent “memory” meaning three unrelated things |
| 4 — Transformer | Hybrid-model specificity, real-shape reasoning, anatomy links | Keep transformer knowledge separate from agency/permissions; add a bridge explaining why valid generated JSON does not authorize an action. In 4.13, use the `validation_data` created at line 96 for a real held-out measurement; the current loop measures training only, and a repeated toy corpus cannot establish generalization. Reduce repeated projection counts across 4.2/4.5/4.11/4.14 with progressive exercises |
| 5 — Pretraining | Data/provenance, scaling caveats, pipeline intuition | Repair F04–F06; add reproducible small scaling-fit and memory exercises; reuse leakage and lifecycle-cost lessons in evals |
| 6 — Post-training | Distinction among SFT, preferences, RL and distillation | Repair F07–F10; do not frame alignment as an application authorization boundary; add numerical policy/reference examples |
| 7 — Inference | Prefill/decode, cache ownership, careful sampling discussion | Repair F11–F13; qualify FlashAttention I/O claims; turn quant assessment into a runnable multilingual/JSON/tool-call rubric |
| 8 — Stacks | Workload-driven engine choice and honest version caveats | Separate eager execution from scheduling/kernel features; replace “tool calling needs no lesson” with a bridge to contracts/auth/recovery; validate exported artifacts before loading them |
| 9 — Hardware | Byte units, roofline assumptions, cost arithmetic | Reuse the owned budget consistently; distinguish cost per token from cost per successful agent task, including retries and human waiting |
| 10 — Video/world models | Careful separation of research claims from the course model | Repair F14; use screenshot/perception lessons as optional browser-agent background, not proof of GUI reliability |
| 11 — Mac/MLX | Reproducible pins and explicit local-service security caveats | Repair F15; test code snippets with small recorded protocol fixtures; retain hardware support claims as dated vendor statements until revalidated |
| 12 — DGX/CUDA | Memory-tier and occupancy reasoning | Repair F16; distinguish lower-bound arithmetic from measured latency; keep hardware specialization optional |
| 13 — llama.cpp | Source-pinned runtime and benchmark detail | Connect schema-constrained generation to semantic validation and permission checks; retain real throughput provenance and clean environment steps |

## Pending primary-source checks, not confirmed errors

- 0.3 calibration wording: distinguish sampling temperature from post-hoc calibration and do not claim a dial guarantees truth.
- 2.7:14,74 AdamW ordering: specify which parameter value the decoupled decay uses; shrinking an already-updated value also scales the adaptive step. Verify the cited update equation before rewriting it.
- 4.6:107 absence of learned absolute position tables: scope the claim to the text stack unless the visual tower's weights have also been checked.
- 4.15:100 and 4.16:101 “no score matrix, even implicitly”: check the unrolled/chunkwise DeltaNet formulation. Distinguish avoiding a materialized conventional softmax score matrix during decode from a universal algebraic claim.
- 5.8 sequence parallelism: verify whether the stated DeltaNet split requires a state handoff/distributed scan; “only attention exchanges” needs support.
- 6.8 equal-reward groups: zero normalized reward advantage does not by itself prove zero total update if a KL regularizer contributes. Check the cited GRPO objective and implementation.
- 7.7 FlashAttention: distinguish linear extra memory from I/O complexity with fixed SRAM; verify the paper's actual bounds before changing formulas.
- Track 11–13 hardware figures, upstream flags and support matrix: current-source revalidation is a separate gate. A textual consistency review is not a successful hardware run.

Localized wording repairs include “banco de rio” in pt-BR 1.5:102 and “banco do rio” in 4.2. Choose a natural Portuguese ambiguity such as a park bench versus a financial institution, preserving the explanation of polysemy rather than translating the English river-bank example literally.

## Repair workflow

1. Fix high-impact numerical/causal errors first, as paired EN/pt-BR changes with source or mathematical counterexample.
2. Record factual repairs separately from wording improvements, preserving the repository's fact-fix convention.
3. Review all paired quiz items for answer cues and misconceptions. Pilot improved assessments with learners; automated statistics are navigation aids.
4. Introduce executable bridge exercises with positive controls and user-meaningful failures. Do not add tests that merely search for preferred prose.
5. Run affected gates and a single coordinated build; inspect rendered math, figures, assessments and responsive layouts after changes.
6. Re-review repaired claims independently; do not mark an unresolved upstream claim “fixed” by deleting its caveat.

## Review coverage record

All **250/250 MDX files** were read in full, including entire frontmatter and bodies. Truncated tool outputs were recovered with bounded rereads. Three disjoint audit lanes reported completion; the main session integrated the findings, checked selected source excerpts, recomputed key arithmetic and the assessment census, and ran the checks listed above.

| Reading lane | Lesson pairs | Files | Source lines |
|---|---:|---:|---:|
| Tracks 0–4 | 47 | 94 | 10,076 |
| Tracks 5–9 | 59 | 118 | 12,964 |
| Tracks 10–13 | 19 | 38 | 5,882 |
| Total | **125** | **250** | **28,922** |

The [coverage ledger](coverage.md) links every paired source and records specific findings or its retain/improve disposition. Every pair participates in the assessment review. A substantive EN/pt-BR semantic difference was found in 9.7; most confirmed technical issues are mirrored across languages.

Not performed: full-site build/render audit, live-site checks, all hardware/software exercises, model runs, or a fresh source-by-source validation of every external citation. Those remain explicit implementation/fact-verification gates. No course source, user content, progress data, dependency, Git history or deployment was changed. This task created only the three small planning/review documents; it started no persistent server and retained no temporary checkout or bulky artifact.
