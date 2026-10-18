# Repair log: tracks 0–4

Lane `tracks-0-4`, 2026-10-18. Scope: lessons 0.1–4.17 in `en` and `pt-br`
(47 pairs, 94 files, all with `updated: "2026-10-18"`). Brief:
existing-lesson repair brief; findings from
`docs/plans/agent-engineering/lesson-review.md`. No `id`, `track`, `order`,
`title`, `tier`, `prerequisites`, `unlocks`, `lab`, `citations` or
`correctIndex` changed. Reviewer: none yet (needs independent review).

## Findings

| ID | Lesson | What changed | Source / counterexample | Status |
|---|---|---|---|---|
| F01 | 0.2 | Prose was already fixed in wave 0 (both locales use the shared key *on the*). Added the quiz half: Q1 is now a scenario (*I ate a quantum peanut*) whose distractor "the common words *I ate a* are part of the context" tests full prefix vs trigram key. | Trigram context is the last two words; count(*quantum peanut*) = 0 gives 0/0. | fixed (quiz part completed) |
| F02 | 0.3 | Re-checked: both locales contrast *Mercury* after "closest planet to the Sun" with "largest planet". | No change needed. | checked, no change |
| F03 | 1.6 | "optimized end to end … no separate pre-training of word vectors" → no word2vec module; the table is a lookup feeding the decoder; initialization and any earlier word-vector stage are undocumented (no technical report). Closing clause no longer claims end-to-end learning. | Model card has no training recipe (AGENTS.md model-fact rule). | fixed |
| F17 | 2.4 | Insight scoped to the next-token objective: loss comparisons ask whether a change moves the mean NLL; capability needs more evidence (points to the existing warning). | Finding text; warning at line 85 kept. | fixed |
| F18 | 2.8 | Worked case states unit RMS for the normalized vector, takes `$g=1$`, and says a learned gain rescales features afterwards. Epsilon passage unchanged. | Formula on the same page multiplies by `g`. | fixed |
| F40 | 2.2 | Re-checked: `W=W_1W_2`, `b=b_1W_2+b_2` in body and model answer, both locales. Added the requested non-square check (X 1×2, W1 2×3, W2 3×1: `W_1W_2` is 2×1, `W_2W_1` is 3×3 and cannot multiply X). | Shape arithmetic. | fixed (dimension check added) |
| F41 | 4.4 | Re-checked: both locales say the tokenizer maps 248,077 ids and the output tensor has 248,320 rows. | No change needed. | checked, no change |
| F42 | 4.7, 4.9 | 4.7 warning: RoPE adds nothing to the stream and does not rotate values, though both can carry position from earlier layers. 4.9: the FFN never mixes positions or applies a positional operation; its input can encode position written by earlier mixers. | Finding text; 4.7 model answer already said this. | fixed |
| F43 | 4.14 | Zeros / wild norm / Q-K-V drift now "suggest" a cause; added: check the index's shard list, expected keys and shapes, hashes against published ones, and loader warnings before naming a cause. | A statistic is a clue, not a unique causal test. | fixed |
| F44 | 4.7 | Base change: with `$\theta_i=\theta^{-2i/d}$`, plane `$i=0$` has exponent zero and turns one radian per position whatever the base; every other plane slows. | Exponent-zero counterexample. | fixed |
| F45 | 4.14 | Prose, teach-back and Q1 now ground "untied" in `tie_word_embeddings: false` plus the loader contract; names/shapes alone prove two stored tensors only (a converter can save one matrix twice; the loader re-ties when the config asks). Q1 asks what the two facts together establish. | `config.json` at revision `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`: `tie_word_embeddings` false at top level and in `text_config`. transformers v4.57.1 docs, `PreTrainedModel.tie_embeddings_and_encoder_decoder`: "If set in the config, tie the weights between the input embeddings and the output embeddings". That a converter can save one matrix twice is stated from general knowledge, not checked against a converter. | fixed |
| check | 0.3 | Temperature passage: temperature 0 = greedy decoding, which is not a promise of identical text across runs (batching / float order); a hand-picked temperature does not calibrate, but a temperature fitted on held-out data (temperature scaling) can, and it reorders nothing, so it adds no truth. | Guo et al. 2017, arXiv 1706.04599 abstract ("temperature scaling … is surprisingly effective at calibrating predictions"); Thinking Machines, "Defeating Nondeterminism in LLM Inference" (1,000 greedy runs, 80 unique completions; batch-size-dependent numerics). | fixed |
| check | 2.7 | "apply it, then separately shrink" and "after the adaptive step" (teach-back) → both terms come from the pre-step value and are subtracted together; shrinking the already-updated value would also scale the step by `$1-\eta\lambda$`. Formula `$\eta\lambda\theta$` kept byte for byte. | AdamW paper arXiv 1711.05101v3, Algorithm 2 line 12: θ_t ← θ_{t−1} − η_t(α·m̂_t/(√v̂_t+ε) + λθ_{t−1}). | fixed |
| check | 4.6 | "no learned absolute position table exists in its weights" was false for the whole checkpoint. Scoped to the text decoder (`model.language_model.*`); names the vision tower's `model.visual.pos_embed.weight` and links 4.17. Teach-back scoped the same way. | `model.safetensors.index.json` at revision `1d4bf0f2…`: `model.visual.pos_embed.weight` present, no position table under `model.language_model`; `vision_config.num_position_embeddings` = 2304. | fixed |
| check | 4.15, 4.16 | "no score matrix … even implicitly" was wrong as a universal claim. Now: at decode no score matrix over the past is formed (the state replaces it); chunked training computes a masked C×C query–key matrix per chunk, no softmax, and older context reaches the output only through S. | Gated DeltaNet, arXiv 2412.06464v3: linear-attention parallel form O = (QKᵀ⊙M)V; chunkwise DeltaNet Eq. 9 O[t] = Q[t]Sᵀ[t] + (Q[t]K[t]ᵀ⊙M)(U[t]−W[t]Sᵀ[t]), and the gated variant. | fixed |
| wording | 1.5, 4.2 (pt-BR) | "banco de rio" / "banco do rio" → "sentou no banco da praça" vs "abriu uma conta no banco" (4.2: "sentei… / abri…"); polysemy explanation unchanged. | Natural pt-BR ambiguity (park bench vs bank). | fixed |
| track | 0.7 | The four-line training step (undefined `model`, `x`, `y`, `optimizer`) is now a complete CPU-only program with setup command, defined variables, and expected output. The four original lines and comments are kept inside the loop. | Ran both locale versions as extracted, `uv run --with numpy --with torch` (torch 2.14.1, NumPy 2.5.4, Python 3.13.11, CPU): `step 0: loss 6.2754`, `step 99: loss 0.0000`, `weight [2.0, -1.0, 0.5]`, `bias 0.1`. | fixed |
| track | 4.13 | Added `estimate_loss` (eval mode, `torch.no_grad`, 20 batches) and a validation print using the existing `validation_data`; new paragraph says the held-out slice repeats the same sentence, so low validation loss shows only reproduction, and generalization needs held-out text that differs. | Ran the exact lesson code (identical in both locales) on CPU, torch 2.14.1: step 300 train 0.0470, validation 0.0576. | fixed |

Not touched: the AutoConfig snippet in 0.7 (needs network and `transformers`; not run).

## Quiz repair

Census of tracks 0–4 (`correct option uniquely longest`, the gate's measure):

| Track | EN before | EN after | pt-BR before | pt-BR after |
|---|---:|---:|---:|---:|
| 0 | 20/24 | 6/24 | 21/24 | 5/24 |
| 1 | 14/21 | 3/21 | 15/21 | 3/21 |
| 2 | 26/27 | 5/27 | 26/27 | 4/27 |
| 3 | 18/18 | 4/18 | 18/18 | 4/18 |
| 4 | 42/51 | 12/51 | 42/51 | 12/51 |

A first pass removed the cue but left the correct option second-longest in
119/141 (EN) and 124/141 (pt-BR) items, a new cue no gate reports. A second
pass trimmed the long distractor on number- or condition-type items and turned
a second throwaway distractor into a reasoned misconception elsewhere. Rank
of the correct option by length (1 = longest, ties counted at the higher
rank), all 141 items:

| Locale | Before 1/2/3/4 | After 1/2/3/4 |
|---|---|---|
| EN | 121 / 13 / 3 / 4 | 37 / 59 / 41 / 4 |
| pt-BR | 124 / 10 / 3 / 4 | 30 / 62 / 45 / 4 |

Rules followed: same `correctIndex`, same option count, same idea in the same
position in both locales; a correct option was tightened only by moving its
"because" into `explanation`, keeping claim, number and conditions; every
explanation names why the long (most tempting) distractor fails; several
second-pass distractors added only for the rank mix have no clause of their
own. Unchanged items (EN
and pt-BR): 0.4 Q1, 0.6 Q1, 1.1 Q3, 1.3 Q1, 1.4 Q1, 1.5 Q1, 1.7 Q2, 2.1 Q2,
2.5 Q1 (trimmed back to its original), 4.2 Q1, 4.3 Q1–Q2, 4.4 Q1, 4.5 Q1,
4.7 Q3, 4.10 Q1, 4.11 Q3, 4.12 Q2. Changed in pt-BR only: 1.2 Q2, 1.6 Q2
(one option lengthened to match the EN balance, same idea).

Option numbers below are zero-based positions.

| Lesson | Item | Change | Misconception each new distractor tests |
|---|---|---|---|
| 0.1 | 1 | distractors 0,2 | 2: confusing tokenizer ids (248,077) with output scores |
| 0.1 | 2 | correct tightened; distractors 0,1 | 0: the model plans the paragraph ahead; 1: it retrieves stored paragraphs |
| 0.1 | 3 | correct tightened; distractors 0,1,2 | 0: training fact-checks claims; 1: probability = truth likelihood; 2: probability = retrieval frequency |
| 0.2 | 1 | converted to scenario; correct tightened; distractors 1,3 | 1: the full prefix is the context (F01); 3: unseen context defaults to uniform |
| 0.2 | 2 | correct tightened; distractors 0,3 | 0: RNNs output a hidden state, not a distribution; 3: Transformers output attention weights |
| 0.2 | 3 | correct tightened; distractors 0,1,3 | 0: faster recurrence = parallel; 1: per-position model copies (data parallelism); 3: teacher forcing alone gives parallelism |
| 0.3 | 1 | distractor 1 | lower temperature reruns the model |
| 0.3 | 2 | distractor 1 | negative logits stay negative after softmax |
| 0.3 | 3 | correct tightened; distractors 0,3 | 0: summing logs softens a zero; 3: epsilon clipping removes the problem |
| 0.4 | 2 | correct tightened; distractor 1 | high dimension inflates dot products by chance |
| 0.4 | 3 | correct tightened; distractors 2,3 | 2: logits must already sum to one; 3: only the argmax matters |
| 0.5 | 1 | numeric; distractors 0,2 | 0: one op per output; 2: one op per coordinate (5,120 + 17,408) |
| 0.5 | 2 | distractor 3 (pt-BR: correct tightened) | composition needs a nonlinearity |
| 0.5 | 3 | correct tightened; distractor 1 | rows vs columns in y = Wx |
| 0.6 | 2 | distractor 0 | the gradient points at the global minimum |
| 0.6 | 3 | correct tightened; distractors 0,1,3 | 0: gradients cannot cross a matrix product; 1: products always vanish; 3: both layers get the same gradient |
| 0.7 | 1 | correct tightened; distractors 0,1,2 | 0: vocab_size is context length; 1: vocab_size is the tokenizer's mapped ids; 2: one row per word |
| 0.7 | 2 | correct tightened; distractors 1,2 | 1: zero_grad resets momentum; 2: zero_grad frees the graph |
| 0.7 | 3 | correct tightened; distractors 0,2,3 | 0: autograd watches the loss trend; 2: divergence shows as NaN at once; 3: autograd errors when loss rises |
| 0.8 | 1 | correct tightened | (distractors already plausible) |
| 0.8 | 2 | correct tightened; distractor 1 | data mix carries over from the previous generation |
| 0.8 | 3 | correct tightened; distractors 1,2,3 | 1: config needs a report; 2: config values are vendor claims; 3: config is derived from weights |
| 1.1 | 1 | correct tightened; distractors 1,3 | 1: BPE merges fix the accent; 3: different bytes mean different ids |
| 1.1 | 2 | correct tightened; distractor 3 | higher id = longer, more specific piece |
| 1.2 | 1 | correct tightened; distractor 1 | 248,320 is the tokenizer's exact id count |
| 1.2 | 2 | pt-BR distractor 3 only | (length balance; same idea) |
| 1.2 | 3 | correct tightened; distractors 0,3 | 0: only the tokenizer table grows; 3: bigger vocabulary lengthens sequences |
| 1.3 | 2 | distractor 1 | unseen words add merges at inference |
| 1.3 | 3 | distractors 0,3 | 0: base alphabet learned from the corpus; 3: base is English letters |
| 1.4 | 2 | correct tightened; distractors 0,2 | 0: any tokenizer plus a margin; 2: the published English ratio |
| 1.4 | 3 | correct tightened; distractors 1,3 | 1: counts fixed by bytes alone; 3: Portuguese words are simply longer |
| 1.5 | 2 | distractor 0 | closeness follows spelling |
| 1.5 | 3 | correct tightened; distractors 0,2 | 0: pieces re-merge into words; 2: the table grows for extra pieces |
| 1.6 | 1 | correct tightened; distractor 1 | exclusion barely matters |
| 1.6 | 2 | pt-BR distractor 2 only | (length balance; same idea) |
| 1.6 | 3 | correct tightened; distractor 0 | GloVe as one shared table |
| 1.7 | 1 | correct tightened; distractor 1 | vocabulary size converts one pair's bits to another's |
| 1.7 | 3 | distractor 3 | parameter count and compute make perplexity reproducible |
| 2.1 | 1 | correct tightened; distractor 2 | perplexity from error rate |
| 2.1 | 3 | correct tightened; distractors 1,2 | 1: more epochs fix XOR; 2: the step's missing gradient is the limit |
| 2.2 | 1 | correct tightened; distractor 3 | stacking alone adds bends |
| 2.2 | 2 | correct tightened; distractors 0,3 | 0: the FFN mixes positions; 3: batch normalization plus width change |
| 2.2 | 3 | distractor 3 | width = context length |
| 2.3 | 1 | correct tightened; distractor 2 | the residual makes the block nonlinear |
| 2.3 | 2 | correct tightened; distractor 2 | ReLU has a leaky slope |
| 2.3 | 3 | correct tightened; distractor 2 | a gate adds no parameters |
| 2.4 | 1 | correct tightened; distractor 1 | softmax is elementwise exp |
| 2.4 | 2 | numeric; correct tightened; distractor 1 | bits vs nats (2² = 4) |
| 2.4 | 3 | correct tightened; distractor 1 | passing probabilities raises an error |
| 2.5 | 1 | converted to numeric (p = (0.7, 0.2, 0.1)); all distractors | 0: loss value as gradient; 2: only the correct class gets a gradient; 3: sign flipped (y − p) |
| 2.5 | 2 | correct tightened; distractor 1 | frameworks keep only the largest path |
| 2.5 | 3 | correct tightened; distractors 0,2 | 0: backward flips signs for the optimizer; 2: backward updates weights |
| 2.6 | 1 | correct tightened; distractor 1 | averaging backward passes refines derivatives |
| 2.6 | 2 | converted to numeric trace (w: 1, −2, 4); correct tightened; distractors 0,2,3 | 0: the gradient is wrong; 2: it is oscillating and will settle; 3: the surface has a maximum at zero |
| 2.6 | 3 | distractors 0,3 | 0: noise averages out within a step; 3: smaller batches are more exact |
| 2.7 | 1 | correct tightened; distractor 2 | per-coordinate rates tuned by hand |
| 2.7 | 2 | correct tightened; distractor 1 | AdamW = a larger L2 coefficient |
| 2.7 | 3 | correct tightened; distractors 0,2 | 0: optimizer keeps a model copy for its own pass; 2: moments store gradient history |
| 2.8 | 1 | correct tightened; distractor 3 | gains are too few to matter |
| 2.8 | 2 | correct tightened; distractor 1 | RMSNorm normalizes gradients |
| 2.8 | 3 | correct tightened; distractor 3 | the residual is a fallback switch |
| 2.9 | 1 | correct tightened; distractor 0 | normalization prevents memorization |
| 2.9 | 2 | correct tightened; distractors 0,1 | 0: a few test reuses are safe; 1: evaluation trains the model |
| 2.9 | 3 | correct tightened; distractor 2 | cutoff = release date minus a training run |
| 3.1 | 1 | correct tightened; distractor 2 | context window = usable memory |
| 3.1 | 2 | correct tightened; distractor 0 | vanishing gradient (optimization) mistaken for the capacity ceiling |
| 3.1 | 3 | distractors 1,3 | 1: causal = sequential processing; 3: causal = bigram |
| 3.2 | 1 | correct tightened; distractor 2 | RNN state grows slowly |
| 3.2 | 2 | correct tightened; distractor 1 | per-token losses multiply |
| 3.2 | 3 | converted to scenario (clip 1.0; norms 50 and 1e-8); all options | 0: clipping rescales small gradients up; 2: clipping averages steps (momentum); 3: clipping skips large steps |
| 3.3 | 1 | correct tightened; distractor 3 | the cell path has factor one |
| 3.3 | 2 | numeric; correct tightened; distractor 2 | 0.5 applies once, not per step |
| 3.3 | 3 | correct tightened; distractor 2 | GRU keeps a separate cell state |
| 3.4 | 1 | numeric; correct tightened; distractor 2 | the decoder starts from a fresh state |
| 3.4 | 2 | correct tightened; distractor 1 | the problem is overfitting |
| 3.4 | 3 | distractors 0,2 | 0: teacher forcing gives the first step the target; 2: attention-style context in classic seq2seq |
| 3.5 | 1 | correct tightened; distractor 2 | per-step rescaling instead of a direct edge |
| 3.5 | 2 | distractors 0,2 | 0: softmax over target steps (wrong-axis bug); 2: softmax over features |
| 3.5 | 3 | distractor 0 | hard selection of the best state |
| 3.6 | 1 | correct tightened; distractor 0 | linear-attention state grows like a cache |
| 3.6 | 2 | correct tightened; distractor 1 | delta rule evicts the oldest entry |
| 3.6 | 3 | converted to numeric (token 1,000 vs 2,000); all options | 0: linear attention still scans every key; 2: the state averages, so cost falls; 3: the KV cache makes softmax constant |
| 4.1 | 1 | distractor 2 | the title implies removing the FFN |
| 4.1 | 2 | distractors 0,3 | 0: RNN memory size blocks parallelism; 3: per-step weights differ |
| 4.1 | 3 | distractors 1,2 | 1: fewer heads everywhere; 2: sliding-window hybrid |
| 4.2 | 2 | correct tightened; distractor 0 | RoPE stores a second query copy |
| 4.2 | 3 | distractors 1,3 | 1: one position per word; 3: byte-level = one byte per position |
| 4.3 | 3 | distractors 0,2 | 0: large gaps flatten; 2: large gaps crash softmax |
| 4.4 | 2 | converted to numeric (scores 2.0, 1.0, −∞); all options | 0: normalizing by the raw sum; 2: −∞ makes the sum infinite; 3: masking flattens the rest |
| 4.4 | 3 | distractors 0,1 | 0: the mask applies only at inference; 1: per-position model copies |
| 4.5 | 2 | distractor 3 | masking after concatenation |
| 4.5 | 3 | distractor 0 | separate projections force separate roles |
| 4.6 | 1 | distractors 0,3 | 0: attention has a built-in distance bias; 3: identical tokens merge |
| 4.6 | 2 | correct tightened; distractor 2 | added position reaches only Q and K (RoPE confusion) |
| 4.6 | 3 | distractor 3 | learned tables extrapolate, formulas do not |
| 4.7 | 1 | numeric; distractor 1 | the factor counts pairs, not dimensions |
| 4.7 | 2 | correct tightened; distractor 1 | without position every key gets equal weight |
| 4.8 | 1 | distractor 2 | ALiBi adds a position vector to embeddings |
| 4.8 | 2 | correct tightened; distractors 0,3 | 0: RoPE = learned per-offset bias; 3: query scaled by position |
| 4.8 | 3 | converted to numeric (slopes 0.5 and 0.0625, offset 16); distractors 1,3 | 0: slopes are hard bands; 1: slope applied once, not times distance; 3: slopes are learned |
| 4.9 | 1 | numeric; correct tightened; distractor 0 | biases account for 89M |
| 4.9 | 2 | correct tightened; distractors 0,3 | 0: the FFN computes distances; 3: distance fed to the FFN input |
| 4.9 | 3 | correct tightened; distractor 1 | the gate is a max over features |
| 4.10 | 2 | correct tightened; distractor 0 | RMSNorm keeps the mean, drops the scale |
| 4.10 | 3 | question reworded as a shape trace; correct tightened; distractors 1,3 | 1: the stream widens to 17,408; 3: the normalized copy replaces the stream |
| 4.11 | 1 | correct tightened; distractor 0 | projections are square |
| 4.11 | 2 | correct tightened; distractor 2 | RMSNorm placement alternates by layer type |
| 4.12 | 1 | correct tightened; distractor 3 | 27B multimodal requires MoE |
| 4.12 | 3 | correct tightened; distractors 0,1 | 0: DeltaNet computes the same score matrix cheaply; 1: shared weights across layers |
| 4.13 | 1 | distractor 0 | the mask should be trainable |
| 4.13 | 2 | correct tightened; distractors 0,1 | 0: the toy is hybrid like Qwen; 1: the toy is MoE |
| 4.13 | 3 | numeric; distractor 0 | the vocabulary matrices dominate |
| 4.14 | 1 | question reworded (F45); correct tightened; distractors 0,1,3 | 0: two copies = corruption; 1: loaders ignore the tie flag; 3: duplicated for speed, loader keeps one |
| 4.14 | 2 | distractors 0,1 | 0: token vs position embeddings; 1: final_norm and head |
| 4.14 | 3 | correct tightened; distractor 1 | 12288 rows = 48 heads, config wrong |
| 4.15 | 1 | numeric; correct tightened; distractor 0 | write strength one averages |
| 4.15 | 2 | correct tightened | (distractor 1 trimmed back to its original) |
| 4.15 | 3 | correct tightened; distractor 0 | the short convolution is windowed attention |
| 4.16 | 1 | numeric; distractors 2,3 | 2: the 3:1 ratio reversed; 3: one attention layer per sixteen |
| 4.16 | 2 | correct tightened; distractor 0 | DeltaNet state accumulates |
| 4.16 | 3 | correct tightened; distractor 0 | layers talk only to their own mixer type |
| 4.17 | 1 | correct tightened; distractor 0 | images become vocabulary tokens |
| 4.17 | 2 | correct tightened; distractors 0,1 | 0: sections per color channel; 1: sections are frequency bands |
| 4.17 | 3 | correct tightened; distractor 2 | 4608 exceeds 5120, so the merger shrinks |

Recognition-only lessons not converted (no natural index-preserving scenario
found in this pass): 4.1, 4.17; 2.8, 3.5 and 4.6 still lean on recognition
items.

## Out of scope, noticed

- 4.16:101 "Qwen3.8-27B was trained as this architecture" is a training-history claim the model card does not document; not checked or changed.
- 0.3 now links Guo et al. 2017 inline; adding it to `citations` needs a citations change outside this brief.
- Track-table items not in this lane's dispatch remain open: 1 (API JSON vs chat-template tokens; tokenization to context budgeting), 2 (tiny-network exercise), 3 (learned recurrent state vs application-persisted state), 4 (valid JSON does not authorize an action; projection-count repetition across 4.2/4.5/4.11/4.14).
