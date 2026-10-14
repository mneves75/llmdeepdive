# Fact fixes in the 0.12.0 review

The review changed how lessons explain, not what they claim. Where a lesson
was wrong, or the rewrite first overstated something, the fix is listed here
with its source. Each track had an adversarial fact pass on another model
(gpt-6-astra, read-only, fresh context) comparing every changed lesson with
`main`; its findings were fixed in both locales before the track was
committed. Overstatements the rewrite introduced and the pass caught are
not listed one by one (they never reached `main`); errors that were already
on `main`, and every quiz option change, are.

"Primary source" is the source the fix rests on; "lesson" means the course's
own owning lesson.

## Already wrong on `main`

| Lesson | Was | Now | Source |
|---|---|---|---|
| 0.1, 0.2, 0.8, 3.2, 9.5 | Qwen3.8-27B "released in August 2026"; 0.8 said the card states it | Part of the Qwen3.8 family the Qwen team announced in August 2026 | Qwen3.8-27B model card: the only date is the August 2026 citation of the Qwen3.8 family announcement (huggingface.co/Qwen/Qwen3.8-27B) |
| 1.1 | Conclusion counted "six boundaries" but listed five | Normalization named as the sixth | The lesson's own body |
| 1.1 quiz 3 | Explanation's "respectively" order did not match the options | Each option named | The lesson's own options |
| 2.2 | Feed-forward block holds "most of its learned knowledge" | Holds most parameters; research finds many stored associations there | Geva et al. 2021, *Transformer Feed-Forward Layers Are Key-Value Memories* (arXiv 2012.14913) |
| 2.4 quiz | Softmax "lives in the loss rather than between layers" | Explanation keeps only the coupling argument | Lesson 4.3: attention applies softmax inside the network |
| 2.9 + quiz | No technical report, "so" training data unpublished | Neither the card nor any other published source gives it; quiz states that premise | Hugging Face model-card template allows training-data disclosure without a report |
| 3.3 quiz | Correct option: contents halve, long-range learning "never gets started" | Old contents fade within a few steps; long-range dependencies hard to learn at first | The LSTM cell equation in the lesson: only the old contribution is halved, new writes remain |
| 3.4 | Beam search chooses "the most probable overall" | Returns the highest-scoring complete candidate it found | Sutskever et al. 2014, §3.2 (decoder is approximate) |
| 4.1 | Causal attention: a token sees "only earlier tokens" | Itself and the tokens before it | Vaswani et al. 2017, §3.2.3; lesson 4.4's diagonal |
| 4.5 | "lawyer," eight tokens back | Eight words in between | Counting the example sentence |
| 4.11 (EN) | Attention looks at any earlier position "with exact, content-addressed precision" | How precisely it retrieves depends on the scores, the projections and learned behaviour (as pt-BR already said) | Lesson 4.2: the output is a softmax-weighted blend of values, not an exact lookup |
| 4.15 (EN) | Attention is the mixer that is "exact but expensive" | Direct per-position access whose cost grows with context (as pt-BR already said) | Same as 4.11 |
| 6.10 body | Volume "averages their mistakes out" | Averaging reduces random noise; shared bias remains (matching the corrected quiz) | Mean of errors with mean b is still b |
| 5.1 | A causal model sees "only the tokens before it" | Up to and including its position | The lesson's own formula, conditioned on x≤i |
| 5.7 | 16 super-blocks of "about 1.7 billion parameters", "perfectly balanced" | 16 decoder units of identical composition; embeddings, head and vision tower wrapped separately | (27 − 2.54) / 16 ≈ 1.53 B, using the lesson's own embedding and head sizes |
| 5.7 quiz (EN) | Distractor "About 16 GB, four-bit weights" | "About 17 GB, the pinned Q4_K_M text artifact", as pt-BR already said | Lesson 8.7: 17,106,773,984 bytes |
| 5.8 | Vocabulary padding chosen for parallelism; head count "chosen for serving economics" | Qwen publishes no reason; the head count keeps serving memory low | Model card and config give values, not intent |
| 5.9 | Citation URL `docs.pytorch.org/blog/…` | `pytorch.org/blog/efficient-large-scale-training-with-pytorch/` | Old URL returns 404; new one 200 (checked 2026-10-14) |
| 5.9 quiz + body | Ranks sharing a tensor must always agree on one fp8 scale | Under tensor-wide scaling; blockwise recipes avoid the synchronisation | NVIDIA Transformer Engine, FP8 blockwise scaling, distributed training |
| 5.10 quiz | Correct option named "324 GB of optimizer state"; a distractor said "master weights" (EN) | Both locales use pt-BR's wording: checkpointing changes saved activations, not persistent state | 324 GB is only the unsharded total (lesson 5.7) |
| 5.11 | Batch doubles "halfway through", yet the numbers assume doubled from the start; run "never entered the decay phase" | Doubles before the run starts; the run completes only the first half of the cosine | 10¹² / 4×10⁶ + 10¹² / 8×10⁶ = 375,000 steps would give p = 0.75, not the lesson's 0.5 |
| 5.12 | "three hundredths" | "just under four hundredths" | The lesson's own 1,024-rank arithmetic (0.037) |
| 6.8 quiz | Two defensible answers to "Which is a verifiable reward?" | Question asks for a reward that verifies a coding answer is correct | Counting adjectives is also programmatically checkable |
| 6.10 quiz | Annotator errors "wash out with volume" | Averaging reduces random noise; shared bias remains | Mean of errors with mean b is still b |
| 7.3 | "Essentially all" 54 GB read each decode step | 54 GB is a checkpoint-size planning approximation; text decode skips the vision tower | Lesson 9.1 |
| 7.5 + quiz | MTP learned "as part of pretraining", "from the start" | Only "trained with multi-token prediction", as the card says | Qwen3.8-27B model card, model overview |
| 7.13 quiz | Quantization does nothing for prompt processing, stated generally | Scoped to the measured Llama-3.1-8B benchmark | Lesson 7.13's own table; lesson 7.3 |
| 8.1 quiz | Eager PyTorch is "launch-bound" | Pays launch overhead on every operation | Lesson 8.3: batch-one bf16 decode is bandwidth-bound |
| 8.4 quiz | Correct option counted "the GB-versus-GiB gap" as memory overhead | Gap removed; activation peaks, graph pools, fragmentation remain | GB and GiB are units for the same bytes |
| 8.6 | Compiled stacks need "a plugin or kernel rather than a module" | Sentence removed | TensorRT-LLM docs: models are added as PyTorch modules (nvidia.github.io/TensorRT-LLM, adding a new model) |
| 8.7 | Body "16 GiB-class device", prompt "16 GB GPU" | 16 GB GPU throughout | Consistency |
| 8.10 quiz | Tokenization also a valid answer | Question asks about coordinating concurrent requests | Option wording |
| 9.5 + quiz option | "an all-reduce per layer" | Two all-reduces per layer, throughout | Lesson 9.9; lesson 9.5's own 128-per-token count |
| 9.7 | 16 GB / 3 GB ≈ 5.3× | 17.1 GB / 3 GB ≈ 5.7× | Lesson 8.7's pinned artifact size |
| 9.8, 9.10 | 9.10 called the end of the course | End of this track | AGENTS.md: the corpus is tracks 0–13 |
| 9.4 | 178.8 GiB presented as usable memory | An illustrative available-capacity assumption | 192e9 / 2³⁰ converts units; it does not measure a device |
| 11.2 | 60.8 GiB "on a 64 GB Mac" | On a Mac with 64 GiB installed | MLX v0.32.3 allocator works in bytes |
| 13.5 | 17.1 GB read "from local memory" per token | Read across all machines together, each its own share | llama.cpp b11380 RPC README, layer distribution |

## Quiz options changed for vocabulary only

pt-BR options in 8.6, 9.5, 11.5 and others: "lição" became "aula" (the
interface's word; `content:parity` now fails "lição"). pt-BR 9.8: a
distractor's "temperatura 1.0" became "1,0" (pt-BR prose decimals). No
answer position changed anywhere.
