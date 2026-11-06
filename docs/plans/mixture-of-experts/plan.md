# Mixture of experts: source review, curriculum plan and implementation

Status: implementation authorised by the owner in this session (2026-11-06). Base
`0060c7f` (`origin/main`), branch `feat/mixture-of-experts`, isolated worktree
`.scratch/wt-moe`.

Sources reviewed in full:

- **HF handbook**, rendered: `https://huggingface.co/spaces/huggingface/moe-blogpost`
  (384,645 characters of extracted text, chapters 1–5 and appendices A.1–A.2).
- **HF handbook**, raw: six MDX chapter files under `app/src/content/chapters/` at
  Space revision `ef70726e6f8b99d74298a16a4894340f288a58c2`
  (last modified 2026-11-05). Read because the rendered extraction mangles text:
  "Step 3.5 Flash" was rendered as a link to section 3.5, and table cells and
  code blocks lose their structure.
- **Megatron-LM** at the pin the handbook targets, `d6316eb45bf1bfbb6f1f848c0b56e55166564d80`:
  `transformer_config.py`, `moe/moe_utils.py`, `gpt/gpt_layer_specs.py`. Flags
  quoted in the lessons were checked against these files, not paraphrased from
  the handbook.

Licence finding: the Space declares **no licence** (the HF API returns
`license: null`, and the repository has no `LICENSE` file). Nothing from it may be
reproduced as prose or figures. This plan uses it the way a source is used:
facts, measurements and citations, with the handbook named as the source, and
every sentence written here. The worked numbers in the lessons are derived from
Qwen3.8-27B's published config, not from the handbook.

## What the site covers today, measured

- 185 lessons per locale across 26 tracks; 370 MDX files.
- **Seven** of 185 English lessons mention mixture of experts at all
  (`4.9`, `4.12`, `4.13`, `7.6`, `7.12`, `12.2`, `13.1`), and the only mechanism
  is one paragraph in `4.9-feed-forward-block`: "Sparse mixture-of-experts models
  replace one dense FFN with a router and several expert FFNs, activating a subset
  per token."
- No lesson covers routing weights, load balancing, expert granularity, expert
  parallelism, all-to-all cost, or serving an MoE. Track 5 (pretraining) ends at
  data, scaling laws, parallelism, precision, checkpointing, schedules and
  instability; none of it is MoE-specific.
- The handbook's own opening claim is the gap: 18 of the 20 highest-scoring
  open-weights models on the Artificial Analysis index are MoE. A course about how
  a model works that stops at the dense FFN describes a minority of the frontier.

## The deeper version of this task

A summary of five chapters would be bigger than the course and shallower than the
source. What a practitioner would actually do, and what this plan does instead:

1. **Build the instrument before the prose.** Every MoE claim in the lessons is
   produced by one pure module, `src/lib/moe-math.ts`: mixture weights, MaxVio,
   the sign-update loop, parameters stored versus active, dispatch bytes. The
   lessons quote it, the lab calls it, and a test pins every quoted number. The
   site has been bitten three times by prose and code disagreeing (the 540 GB
   AdamW budget, the third residual bypass, the three KV budgets); a new topic
   gets the mechanism that prevents a fourth.
2. **Keep the evidence kinds apart.** The handbook mixes four kinds of claim and
   they do not merge: (a) arithmetic on a published config, (b) one cluster's
   measurement, (c) one lab's ablation, (d) a technical report's setting. Each
   lesson labels which it is using. "DeepSeek-V4.1-Flash renormalizes and scales
   by 1.5" is a config fact; "even routing ran 1.5× faster at init" is the
   handbook's single-cluster measurement; "finer experts stopped helping past 128"
   is one 18-layer ablation.
3. **Teach the mechanism, name the flag.** Megatron flags churn; the reason
   `--moe-router-dtype fp32` exists does not. Flags appear as dated examples
   ("in Megatron at `d6316eb4`, read 2026-11-06"), never as the spine of a lesson
   or the thing a reader is asked to remember.
4. **Refuse the tidy ending.** The handbook ends by saying most of its advice is
   one ablation in one lab. Each lesson carries a "what this does not establish"
   section, and the course does not turn an ablation into a rule.
5. **Prove it outside this session**: the repository's own gates (`content:parity`,
   `content:figures`, `content:citations`, `content:excerpts`, `quiz` length,
   `budget`, `render:check` in three engines, `verify:live`), a fresh-context
   review on a different model, and the deployed page.

## The rawest material, and what it changes

| Instead of | Start from | Effect on this plan |
|---|---|---|
| The rendered Space | The six chapter MDX files at revision `ef70726` | Exact tables and code; no extraction artefacts |
| A paraphrase of flags | Megatron source at `d6316eb45`, three files | Flags quoted with a pin and a date |
| The handbook's 6.86B toy model | Qwen3.8-27B's published `config.json`, already in `model-facts.ts` | Every number in the course's own worked example, and an identity a reader can check: 8 × 2,176 = 17,408 |
| The handbook's citation list as given | `arxiv.org/abs/<id>` fetched for all 27 ids used | All resolve; titles match the claims, including the 2026 ones |

## Decision

| Approach | Benefit | Cost / rejection |
|---|---|---|
| **Append five lessons inside tracks 4, 5 and 7** | Preserves every URL, lesson id, `ldd:complete:<locale>:<id>` progress key and the two-part sky chart; follows the precedent that added 4.15–4.17 and 11.4–11.5 | Track summaries and four published counts change; selected |
| A new track, "Mixture of experts" | One clean home for the topic | Inserting at order 13 renumbers tracks 13–25 and breaks every lesson URL and progress key; appending at 26 puts MoE after the agent capstone, outside the `models` part. Rejected |
| One long lesson in track 4 | Smallest diff | 384 KB of source in one page; the writing guide says split rather than compress. Rejected |
| A separate MoE mini-course outside the site | No risk to the published course | Splits the corpus, the search index and the sky chart, and the site's promise is one course. Rejected |

Numbering is append-only, which is why the new ids are 4.18, 5.14–5.16 and 7.14
rather than a tidy MoE block. Order is a contract here, not a layout.

## Curriculum: five lessons, one per handbook cluster

| Lesson | Title (EN) | Handbook | Core question it answers |
|---|---|---|---|
| `4.18-mixture-of-experts` | Mixture of experts: one token, eight FFNs | 3.1, 3.4, 3.5 | How does a token pick its experts, how much does each count, how wide are they, and where do the MoE layers sit? |
| `5.14-keeping-experts-busy` | Keeping every expert busy | 3.2, 3.3 | Why does uneven routing slow the step, and what do the three balancers actually change? |
| `5.15-upcycling-and-moe-stability` | Starting from dense, staying alive | 3.6 | Where do the weights start, which optimizer moves a rarely used expert, and how do quiet failures show? |
| `5.16-expert-parallelism` | The all-to-all tax | 3.7 | How many bytes leave the GPU, how do you place and cap them, and what does each fix cost? |
| `7.14-serving-an-moe` | Serving an MoE | 4 | Why is an MoE cheap in compute and expensive in memory, and what changes at serving time? |

Excluded, with reasons: the handbook's cluster setup, Slurm/Enroot/EFA recipes,
Datatrove tokenisation and Trackio (2.1–2.4) are environment-specific and belong
to track 12's existing DGX material; the appendix's capture scripts are Megatron
internals, not course material. Chapter 2's dense-baseline-vs-MoE methodology is
folded into 5.15 as the comparison rule, not reproduced as a recipe.

### 4.18 — Mixture of experts: one token, eight FFNs

Reader question: a dense layer makes every token pay for the whole FFN. What if
the model stored eight times more feed-forward capacity and each token still paid
for one?

Sections:

1. **Stored versus active.** Qwen3.8-27B's FFN: `3 × 5120 × 17,408 = 267.4M`
   parameters per layer, 64 layers, `17.11B` of the model's 27B. Replace it with
   64 experts 2,176 wide and top-8: `8 × 2,176 = 17,408`, so the token's active
   FFN is identical and each layer stores `64 × 3 × 5120 × 2,176 = 2.139B`.
   Whole model: `146.8B` stored, `27B` active, 5.4×. This is the identity the
   lesson turns on, and every number is a derived fact in `model-facts.ts`.
2. **The router in one equation.** `W_r` is `64 × 5120` per layer; logits, then a
   gate. Worked case with 8 experts and logits
   `[4.1, 3.2, 2.7, 2.1, 1.4, 0.2, -1.1, -2.4]`, top-2:
   softmax (over all experts, then top-2, renormalized) gives `0.711 / 0.289`;
   sigmoid gives `0.506 / 0.494`; `sqrt(softplus)` gives `0.530 / 0.470`.
   The point: the gate decides how much each chosen expert counts, and a
   saturated gate hands two experts nearly equal weight.
3. **The output scale.** With k uncorrelated experts of equal RMS and equal
   weights, the mixture's RMS is `1/√k` of one expert's; a routed scale near `√k`
   restores it. Why renormalizing matters (weights summing to less than 1 move the
   layer's output size token to token).
4. **Precision is not cosmetic.** bf16 rounds two close logits to the same value
   and top-k then breaks the tie in an unspecified order; fp32 routing is the one
   setting with a training-stability record (Switch, ST-MoE). z-loss bounds the
   logits' logsumexp.
5. **How many, how wide.** Granularity at fixed budget; the one ablation that
   gains up to 128 experts of d/4 and stops; shared experts (one always-on FFN;
   its share is `1/(1+scale)`), latent MoE (`d → ℓ` shrinks every copy on the wire
   and buys `d/ℓ` more experts).
6. **Where the layers sit.** All MoE, first three dense, alternate; each all-to-all
   is a synchronization point; the parallel and shortcut blocks exist to hide it.
7. **What this does not establish.**

Figures: `moe-stored-versus-active` (grid, from `model-facts`),
`moe-router-weights` (plot + table, the three gates on the same logits).

### 5.14 — Keeping every expert busy

Reader question: if the router sends most tokens to four of 64 experts, what
exactly slows down, and which fix moves what?

Sections:

1. **The cost of imbalance.** The busiest rank sets the step; the handbook measured
   1.5× at init with routing forced even. MaxVio `= max(c)/mean(c) − 1`, worked on
   `[2, 2, 4, 0]` → `1`; zero-count experts stay in the mean.
2. **The aux loss.** `α · E · Σ f_e · P_e`. The trap, worked exactly: 8 experts, a
   flat router (`P_e = 1/8`), load `[0.5, 0.5, 0, …]` gives `Σ f·P = 0.125`, so
   `aux = 1.0` — indistinguishable from balanced — while MaxVio is `3`. This is why
   balance is read from counts, not from the loss.
3. **Scope.** Micro-batch, sequence, global batch: what each makes possible
   (domain experts) and what it costs (uneven per-GPU load; 5.8% slower steps in
   the cited run).
4. **The loss-free bias.** A bias added only before selection; a fixed step per
   training step; sign, linear and AdamW update rules; why the mean drift does not
   change selection but does cost bf16 precision; the update rate's limit above
   128 experts.
5. **Quantile balancing.** Solve for the bias from the batch's own scores; the
   per-expert top-k cost; EMA; the global-versus-local gap (MaxVio 0.92 global,
   5.96 in the worst local micro-batch).
6. **Choosing.** Default `aux_loss` at `1e-3`; bias when no gradient may be pulled;
   quantile when the fixed step lags. Forced-even routing is a control run and
   never a training setting.
7. **What this does not establish.**

Figures: `moe-maxvio` (plot: MaxVio against update steps for the sign rule),
`moe-balancers` (stack: what each balancer touches).

Lab: `moe-balance` (calculator, 12 KB) — the sign-update loop on a frozen router.

### 5.15 — Starting from dense, staying alive

1. **Upcycling.** Slice the dense FFN and copy each slice into `E/k` experts. With
   Qwen's numbers: 17,408 cut into 8 slices of 2,176, each copied into 8 of the 64
   experts. The activation/weight rescaling Megatron applies, stated as a
   rescaling, not a derivation.
2. **What the head start is worth.** OLMoE: a from-scratch run caught up at 500B
   tokens, 25% of the dense model's 2T. Komatsuzaki: 120% of the dense compute. So
   upcycle short runs, not long ones.
3. **The optimizer sees a different problem.** AdamW shrinks an expert's step as
   its tokens fall; Muon's orthogonalized, shape-scaled step does not, so a rarely
   routed expert keeps moving; Moonlight's measured gap; router on Adam or Muon is
   a live disagreement (DeepSeek-V4 vs Qwen3.8-Next).
4. **Multi-token prediction.** One extra layer per extra predicted token; the cost
   concentrates on the stage that holds it (37% early-step cost on the handbook's
   runs, 7% in Mellum2); place it with a pipeline layout.
5. **Three quiet failures.** Collapse (MaxVio climbs), a dead expert (its output
   norm falls far below the layer's median), a rogue expert (far above; 5,700× the
   median in the cited layer). The loss can stay flat through all three.
6. **What this does not establish.**

Figures: `moe-upcycle-slices` (stack), `moe-failure-signals` (table).

### 5.16 — The all-to-all tax

1. **The bytes.** Per token per layer: `k × d × 2` = `8 × 5,120 × 2 = 80 KiB`; over
   64 layers, 5 MiB per token; a 2,048-token micro-batch moves 10 GiB per forward.
   NVLink inside a node, the fabric between nodes.
2. **Expert parallel size.** Consecutive ranks form the group, so an EP size that
   divides the node's GPUs keeps the exchange on NVLink; across nodes it does not
   (EP16 ran 59% below EP8 in the handbook's comparison).
3. **The quiet fallback.** NCCL falling back to TCP sockets: "Using network
   Socket" in the log, 25× slower on the handbook's proxy run.
4. **Overlapping it.** Parallel and shortcut blocks, micro-batch overlap (+35% on
   two nodes), and why recompute and overlap fight each other.
5. **Capping where tokens go.** Group-limited routing caps nodes per token; it only
   saves bytes when the dispatcher sends one copy per node (DeepEP), not one per
   expert; and its quality cost is small but real.
6. **Dropping or replicating.** Capacity factor versus dropless: 6–8% of tokens
   dropped at 1.5 in a 20B/718B pair; replicas bring the busiest rank to 1.01–1.03×
   the mean in UltraEP.
7. **Precision.** FP8 10–25% end to end with loss within 0.25%; NVFP4 on Blackwell;
   the router stays fp32.
8. **What this does not establish.**

Figures: `moe-all-to-all-bytes` (flow), `moe-exposed-communication` (stack).

### 7.14 — Serving an MoE

1. **Cheap in compute, expensive in memory.** The 146.8B stored / 27B active model
   is 293.6 GB in bf16 against the dense model's 54 GB, though a token touches a
   dense model's worth of weights.
2. **Serving a smaller k.** The denominator decides the gain: keep top-4 but
   divide by the top-16 mass; measured −0.35 MMLU against −4.65 renormalized over
   the four survivors (that paper's Qwen3.6-35B-A3B).
3. **Low-bit experts.** Only the routed experts in 4 bits: gpt-oss-20b 39.0 → 12.8
   GiB, while a decoded token's reads fall only 6.72 → 3.45 GiB, because attention
   is every token's cost.
4. **EP at serving.** Prefill at the smallest EP that fits, decode at the widest
   (EP2–8 vs EP64–128); 25% more tokens per GPU per second at 64 requests per GPU;
   the deployment floor is 128 GPUs.
5. **Attention–FFN disaggregation.** What it buys, and the equal-budget
   re-provisioning that turned 1.41× into 0.99×.
6. **RL routing.** ~10% of routers disagree across engines and 94% of tokens differ
   in at least one layer; replay, and the contested reward evidence.
7. **What this does not establish.**

Figures: `moe-serving-memory` (stack), `moe-serving-k` (table).

### Assessment

Each lesson: 3 quiz items (existing lessons carry 3), a teach-back that asks for a
number the reader must compute, and an analogy that survives scrutiny. The quiz
length gate applies: no answer uniquely longest in more than 20%, or uniquely
shortest in more than 35%, of a track's items. Because 5.14–5.16 add nine items to
track 5, the track's whole distribution is re-checked, not just the new items.

### Citations

Primary sources only, each fetched for this plan: Shazeer 2017 (`1701.06538`),
Switch (`2101.03961`), ST-MoE (`2202.08906`), Clark et al. (`2202.01169`),
Roller et al. (`2106.04426`), MegaBlocks (`2211.15841`), DeepSeekMoE
(`2401.06066`), DeepSeek-V2 (`2405.04434`), DeepSeek-V3 (`2412.19437`),
aux-loss-free balancing (`2408.15664`), OLMoE (`2409.02060`), Moonlight
(`2502.16982`), granularity (`2506.02890`), LongCat-Flash (`2509.01322`),
LatentMoE (`2601.18089`), Step 3.5 Flash (`2602.10604`), Megatron Core MoE report
(`2603.07685`), DeepSeek-V4 (`2606.19348`), Kimi K3 (`2607.24653`), served-k
(`2609.04575`), DeepSeek-V4.1-Flash (`2609.19969`), quantile balancing
(`2609.39137`), plus the handbook itself and Megatron at the pin. Claims the
handbook makes about a report are cited to the report only where the report's
abstract supports them; otherwise the citation is the handbook and the sentence
says "the handbook's measurement".

## The shared instrument

`src/lib/moe-math.ts`, pure and dependency-free:

| Function | Used by | Pinned by |
|---|---|---|
| `mixtureWeights(logits, k, opts)` | 4.18 prose, `moe-router-weights` figure | `tests/moe-math.test.mjs` |
| `moeParameterBudget(opts)` | 4.18, 7.14, `model-facts` derived facts | same |
| `maxVio(counts)` | 5.14, lab, `moe-maxvio` | same |
| `allocate(affinity, bias, tokens)` | 5.14, lab | same |
| `signUpdate(counts, bias, rate)` | lab | same |
| `dispatchBytes(opts)` | 5.16 | same |
| `auxLoss({counts, probs, coeff})` | 5.14 worked trap | same |

`model-facts.ts` gains a `MOE` block whose `note` carries the arithmetic, so the
"one owner per number" rule holds for the counterfactual too. `moe-math` does not
import `model-facts` (the lab must run without the corpus); `model-facts` imports
`moe-math`.

The lab's server-rendered defaults must equal the numbers printed in 5.14, and
`tests/moe-math.test.mjs` asserts both against the same call. That is the
prose-code contract, mechanised.

## Repository migrations

- Lesson counts: 185 → 190 per locale, 370 → 380 MDX files, 190 lesson pages.
  `tests/agent-engineering-acceptance.test.mjs` (two assertions), `README.md`,
  `AGENTS.md`, `PRODUCT.md` if it states a count, and the home page (which derives
  its count, so no edit).
- Track summaries: 4, 5 and 7 gain the new lessons in their `summary` only if the
  summary enumerates lessons; currently they describe scope, so verify before
  editing.
- `src/lib/figures/index.ts` gains `TRACK_5_FIGURES`; `5-pretraining-at-scale.ts`
  is a new file.
- Prerequisites/unlocks: new lessons only. `4.18.unlocks = [5.14]`,
  `5.14.unlocks = [5.15]`, `5.15.unlocks = [5.16]`, `5.16.unlocks = [7.14]`,
  `7.14.unlocks = []`; `5.14.prerequisites` also carries `5.7-data-parallelism-zero-fsdp`
  because scope is a batch concept, and `7.14.prerequisites` carries
  `7.11-serving-stacks-vllm-sglang-tensorrt-llm`.
- `docs/WRITING.md` needs no change; `AGENTS.md` gains a short MoE source-and-pin
  note in "External systems reference".
- `CHANGELOG.md`, `MEMORY.md`, version `0.15.1` → `0.16.0`.

## Gates and acceptance criteria

Every command runs in `.scratch/wt-moe`.

| Gate | Command | Pass condition |
|---|---|---|
| Types | `pnpm typecheck` | 0 errors |
| Lint | `pnpm lint` | 0 findings |
| Unit | `pnpm test` | all pass, including the new `moe-math` suite |
| Corpus | `pnpm content:parity`, `content:stubs`, `content:graph`, `content:citations`, `content:assets`, `content:figures`, `content:excerpts` | all pass with the new corpus |
| Quiz shape | inside `content:parity` | no track pushed past the 20/35% bounds |
| Colour | `pnpm a11y:contrast` | pass |
| Build | `pnpm build` | pass; `gen-headers.mjs` under 1,900 characters |
| Budget | `pnpm budget` | every route inside its lab budget; new lab ≤ 12 KB |
| Render | `pnpm render:check` | 3 engines; new lab default, invalid input, and no-JS state pass |
| Privacy | `pnpm privacy` | clean clone only (local `refs/t3/…` break the main checkout) |
| Live | `pnpm verify:live --target staging` then `production` | PASS both |
| Review | fresh-context reviewer, different model | no open finding of severity ≥ medium |
| Facts | every number in a lesson traced to `moe-math`, `model-facts`, or a citation | table in the PR description |

`render:check --self-test` must still catch its planted defects after the lab is
added; a gate never seen red is not a gate.

## Risks and what is not claimed

- **The handbook is one team's experience.** Its own conclusion says so. The
  lessons say "the handbook measured" and never "MoEs behave".
- **Frontier numbers move.** Every model-specific claim carries the pin or the
  fetch date. No lesson states a 2026 model's total parameter count as a
  timeless fact.
- **The Qwen counterfactual is a counterfactual.** The lesson says the model does
  not ship this way; the arithmetic is what the numbers would be if its FFN were
  split with the same active budget.
- **Not covered**: expert-choice routing as a production choice, hash layers beyond
  one paragraph, and every Megatron flag not named. The lessons say where the
  course stops.

## Sequencing

| Unit | Deliverable | Commit |
|---|---|---|
| T0 | This plan and the coverage ledger | `docs(moe): plan the MoE lessons and evidence policy` |
| T1 | `moe-math` + tests (red first) | `feat(moe): add the shared MoE arithmetic and pin it` |
| T2 | `MOE` derived facts in `model-facts` | folded into T1 |
| T3 | Lesson 4.18, EN + pt-BR, two figures | `feat(moe): teach the router and the expert budget` |
| T4 | Lesson 5.14, EN + pt-BR, lab, figures | `feat(moe): teach load balancing with a measured lab` |
| T5 | Lessons 5.15 and 5.16, EN + pt-BR, figures | `feat(moe): teach upcycling, stability and expert parallelism` |
| T6 | Lesson 7.14, EN + pt-BR, figures | `feat(moe): teach serving an MoE` |
| T7 | Counts, docs, CHANGELOG, version | `chore(release): 0.16.0 with MoE coverage` |
| T8 | Review fixes, then deploy staging → production | tag `v0.16.0` after `verify:live` on production |
