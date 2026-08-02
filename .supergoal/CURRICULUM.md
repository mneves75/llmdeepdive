# llmdeepdive.com — Curriculum Architecture

Draft v1 · 2026-08-02. Reconciled against the user's shared Claude conversation once provided.

## Shape

11 tracks · ~104 lessons · absolute-beginner → frontier research.
Each lesson: 8–20 min read, one core idea, at least one visual, a "check yourself" quiz,
and an explicit *prerequisites* + *unlocks* edge so the graph is navigable.

Every lesson exists in **EN** and **pt-BR**. EN is the source of truth; pt-BR is a real
translation, not machine slop — technical terms keep their English form where that is the
industry norm in Brazil (*embedding*, *attention*, *fine-tuning*), prose is native pt-BR.

Difficulty ladder, surfaced as a badge on every lesson:
`foundations` → `core` → `advanced` → `frontier`

---

## Track 0 — Orientation & Foundations (`foundations`)

Goal: someone who has never trained a model can follow everything that comes after.

| # | Lesson | Visual |
|---|---|---|
| 0.1 | What is a language model, really? | Animated next-token prediction |
| 0.2 | A 60-second history: n-grams → GPT-5 era | Interactive timeline |
| 0.3 | Probability you actually need | Distribution playground |
| 0.4 | Vectors, matrices, dot products | **3D vector explorer (Three.js)** |
| 0.5 | Matrix multiplication as transformation | **3D linear-transform morph (Three.js)** |
| 0.6 | Derivatives & gradients, geometrically | 2D slope + 3D gradient field |
| 0.7 | Python, NumPy & PyTorch in 20 minutes | Runnable code blocks |
| 0.8 | How to read an ML paper | Annotated paper walkthrough |

## Track 1 — From Text to Tensors (`foundations`)

| # | Lesson | Visual |
|---|---|---|
| 1.1 | Why computers can't read | — |
| 1.2 | Tokenization I: characters, words, subwords | **Live tokenizer playground** |
| 1.3 | Tokenization II: BPE, step by step | **Animated BPE merge table** |
| 1.4 | Tokenization III: SentencePiece, byte-level, and why token counts bite | Cost calculator |
| 1.5 | Embeddings: meaning as geometry | **3D embedding space explorer (Three.js)** |
| 1.6 | word2vec, GloVe & the analogy trick | Analogy solver on the 3D map |
| 1.7 | Entropy, perplexity & what "good" means | Interactive perplexity meter |

## Track 2 — Neural Network Fundamentals (`foundations`)

| # | Lesson | Visual |
|---|---|---|
| 2.1 | The perceptron | Interactive decision boundary |
| 2.2 | Multilayer perceptrons & non-linearity | **In-browser MLP trainer** |
| 2.3 | Activation functions: ReLU, GELU, SwiGLU | Comparative plot |
| 2.4 | Loss functions & cross-entropy | Live loss calculator |
| 2.5 | Backpropagation, visualized | **Animated computational graph** |
| 2.6 | Gradient descent & the loss landscape | **3D loss-surface descent (Three.js)** |
| 2.7 | Optimizers: SGD → Momentum → Adam → AdamW | Race on the 3D surface |
| 2.8 | Initialization, normalization, residuals | LayerNorm vs RMSNorm diagram |
| 2.9 | Overfitting, regularization & the bitter lesson | Train/val curve explorer |

## Track 3 — Sequence Models (`core`)

| # | Lesson | Visual |
|---|---|---|
| 3.1 | Modelling sequences: the setup | — |
| 3.2 | RNNs and the vanishing gradient | Animated unrolled RNN |
| 3.3 | LSTM & GRU: gates that remember | Interactive gate inspector |
| 3.4 | Seq2seq, encoder–decoder & the bottleneck | Bottleneck visual |
| 3.5 | Bahdanau attention: the idea that changed everything | **Alignment matrix explorer** |

## Track 4 — The Transformer (`core`) — the centrepiece

| # | Lesson | Visual |
|---|---|---|
| 4.1 | "Attention Is All You Need" in context | — |
| 4.2 | Self-attention from first principles: Q, K, V | **Step-through attention calculator** |
| 4.3 | Scaled dot-product attention & the √d_k | Interactive softmax temperature |
| 4.4 | Causal masking & why order matters | Mask matrix toggle |
| 4.5 | Multi-head attention | **3D multi-head visualiser (Three.js)** |
| 4.6 | Positional encoding I: sinusoidal & learned | Encoding heatmap |
| 4.7 | Positional encoding II: RoPE | **3D rotation animation (Three.js)** |
| 4.8 | Positional encoding III: ALiBi & relative bias | Comparative plot |
| 4.9 | The feed-forward block & where knowledge lives | — |
| 4.10 | Residuals, pre-norm vs post-norm | Gradient-flow diagram |
| 4.11 | The full block, assembled | **3D transformer anatomy (Three.js)** |
| 4.12 | Encoder-only, decoder-only, encoder–decoder | Family tree |
| 4.13 | Build a GPT from scratch, annotated | Full runnable implementation |
| 4.14 | Reading real weights: what a trained model looks like | Weight-histogram explorer |

## Track 5 — Pretraining at Scale (`advanced`)

| # | Lesson | Visual |
|---|---|---|
| 5.1 | Objectives: causal LM, MLM, span corruption, FIM | Objective comparator |
| 5.2 | Data: sourcing, filtering, dedup, decontamination | Pipeline diagram |
| 5.3 | Training your own tokenizer | Runnable |
| 5.4 | Scaling laws I: Kaplan | **Interactive log-log explorer** |
| 5.5 | Scaling laws II: Chinchilla & compute-optimality | Same explorer, second curve |
| 5.6 | Scaling laws III: inference-aware & over-training | Cost-tradeoff sliders |
| 5.7 | Data parallelism, ZeRO & FSDP | **3D sharding animation (Three.js)** |
| 5.8 | Tensor, pipeline & sequence parallelism | Same 3D scene, other axes |
| 5.9 | Mixed precision: fp16, bf16, fp8 | Numeric-range visual |
| 5.10 | Gradient checkpointing & memory maths | Memory calculator |
| 5.11 | Learning-rate schedules & warmup | Schedule plotter |
| 5.12 | When training goes wrong: spikes, divergence, NaNs | Real loss-curve gallery |
| 5.13 | What a real pretraining run costs | Cost model |

## Track 6 — Post-training & Alignment (`advanced`)

| # | Lesson | Visual |
|---|---|---|
| 6.1 | Why base models aren't assistants | Base vs instruct side-by-side |
| 6.2 | Supervised fine-tuning & instruction data | — |
| 6.3 | LoRA, QLoRA & PEFT | **Low-rank decomposition visual** |
| 6.4 | Reward models & human preference data | Preference-pair explorer |
| 6.5 | RLHF with PPO | Policy-update animation |
| 6.6 | DPO: skipping the reward model | Loss comparison |
| 6.7 | ORPO, KTO, SimPO & the alignment zoo | Comparison table |
| 6.8 | GRPO & RL on verifiable rewards | — |
| 6.9 | Reasoning models: test-time compute & long CoT | **Reasoning-trace explorer** |
| 6.10 | Constitutional AI & RLAIF | — |
| 6.11 | Distillation: making small models punch up | — |

## Track 7 — Inference & Efficiency (`advanced`)

| # | Lesson | Visual |
|---|---|---|
| 7.1 | What actually happens when you hit "send" | Request-lifecycle animation |
| 7.2 | The KV cache | **Animated cache growth (Three.js)** |
| 7.3 | Prefill vs decode: two different machines | Roofline plot |
| 7.4 | Sampling: temperature, top-k, top-p, min-p | **Live sampling playground** |
| 7.5 | Beam search, speculative decoding & Medusa | Draft/verify animation |
| 7.6 | MQA, GQA & MLA | **3D head-sharing diagram** |
| 7.7 | FlashAttention & IO-awareness | Memory-hierarchy visual |
| 7.8 | PagedAttention & continuous batching | Block-allocation animation |
| 7.9 | Quantization I: int8, int4, the basics | Precision slider on real weights |
| 7.10 | Quantization II: GPTQ, AWQ, GGUF, QAT | Quality/size tradeoff plot |
| 7.11 | Serving stacks: vLLM, SGLang, TensorRT-LLM | Throughput/latency explorer |
| 7.12 | Running models locally | Hardware sizing calculator |

## Track 8 — Architectures Beyond the Vanilla Transformer (`advanced`)

| # | Lesson | Visual |
|---|---|---|
| 8.1 | Mixture of Experts: sparse capacity | **3D expert-routing animation (Three.js)** |
| 8.2 | MoE in practice: load balancing & routing collapse | Router-histogram explorer |
| 8.3 | State space models & Mamba | Recurrence vs attention visual |
| 8.4 | Hybrid & linear-attention architectures | Complexity plot |
| 8.5 | Long context I: windows, sinks & sparse patterns | **Attention-pattern gallery** |
| 8.6 | Long context II: RoPE scaling, YaRN, context extension | Interactive extension demo |
| 8.7 | Long context III: does it actually work? Needle tests | Needle-in-haystack heatmap |
| 8.8 | Vision transformers & CLIP | Patch-embedding visual |
| 8.9 | Multimodal LLMs: images, audio, video | Modality-fusion diagram |
| 8.10 | Diffusion language models | Denoising animation |

## Track 9 — Building With LLMs (`core` → `advanced`)

| # | Lesson | Visual |
|---|---|---|
| 9.1 | Prompting, without the folklore | A/B prompt tester |
| 9.2 | Few-shot, CoT & when they stop helping | — |
| 9.3 | Structured output & constrained decoding | **Grammar-constrained demo** |
| 9.4 | Tool / function calling | Call-trace visual |
| 9.5 | Context engineering & the context window budget | Budget visualiser |
| 9.6 | RAG I: chunking & embedding | **Chunk-strategy comparator** |
| 9.7 | RAG II: vector search, HNSW & ANN | **3D ANN-graph traversal (Three.js)** |
| 9.8 | RAG III: hybrid search, BM25 & RRF | Ranking-fusion explorer |
| 9.9 | RAG IV: reranking & evaluation | — |
| 9.10 | Agents I: ReAct, planning & loops | Agent-trace explorer |
| 9.11 | Agents II: memory, multi-agent & failure modes | — |
| 9.12 | Model Context Protocol (MCP) | Protocol diagram |
| 9.13 | Evaluation I: benchmarks & their limits | Contamination visual |
| 9.14 | Evaluation II: LLM-as-judge & building your own evals | Eval designer |
| 9.15 | Cost, latency & routing in production | Cost/latency calculator |

## Track 10 — Interpretability, Safety & the Frontier (`frontier`)

| # | Lesson | Visual |
|---|---|---|
| 10.1 | What's actually inside? Probing & the residual stream | **Residual-stream 3D flow (Three.js)** |
| 10.2 | Induction heads & circuits | Circuit diagram explorer |
| 10.3 | Superposition & sparse autoencoders | **Feature-space visual (Three.js)** |
| 10.4 | Steering, ablation & model editing | Interactive steering demo |
| 10.5 | Why models hallucinate | Calibration plot |
| 10.6 | Prompt injection & jailbreaks | Attack-taxonomy explorer |
| 10.7 | Red teaming & evaluation for harm | — |
| 10.8 | Bias, memorization & privacy | — |
| 10.9 | Governance: EU AI Act & the regulatory map | Timeline |
| 10.10 | Open questions & where this goes next | — |

## Capstones (`advanced`)

| # | Project |
|---|---|
| C.1 | Train a character-level transformer end-to-end |
| C.2 | Fine-tune a small model with LoRA on your own data |
| C.3 | Build a production RAG pipeline with evals |
| C.4 | Build an agent with tools, memory and a test suite |
| C.5 | Quantize and serve a model locally under a latency budget |

---

## Cross-cutting content rules

- **Every claim that is empirical gets a citation** to the primary paper, with year. No
  hand-wavy "studies show".
- **Every number gets a date.** Model capabilities and prices move; anything time-sensitive
  is rendered from a single dated data file, not hardcoded in prose.
- **No lesson depends on a paid API to be understood.** Interactive demos run in-browser on
  precomputed data or tiny local models; nothing calls a paid endpoint.
- **Code blocks are real and runnable**, tested where feasible, never pseudo-code pretending
  to be code.

## The 12 Three.js visualizations (perf-budgeted)

Only these twelve are true WebGL. Everything else is SVG/Canvas2D, which is cheaper.

1. 3D vector explorer (0.4) · 2. Linear-transform morph (0.5) · 3. Embedding space (1.5)
4. Loss landscape (2.6) · 5. Multi-head attention (4.5) · 6. RoPE rotation (4.7)
7. Transformer anatomy (4.11) · 8. Sharding animation (5.7) · 9. KV cache (7.2)
10. MoE routing (8.1) · 11. ANN graph traversal (9.7) · 12. Residual stream / SAE features (10.1, 10.3)

**Hard rules** (these are what keep the perf gate reachable):
- Never in the initial bundle. Dynamic `import()` behind an `IntersectionObserver`.
- One shared WebGL context/renderer, checked out per visualization — never N contexts.
- `rAF` runs only while the canvas is on-screen **and** the tab is visible; paused otherwise.
- Full `dispose()` of geometries/materials/textures on unmount.
- A static poster image renders first; WebGL replaces it after load. Zero layout shift.
- `prefers-reduced-motion` → poster only, with a manual "animate" opt-in.
- Each visualization has its own KB budget, asserted in CI.
