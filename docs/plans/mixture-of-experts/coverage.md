# Handbook coverage ledger

Every chapter of *The Ultimate MoE Training Handbook* (Space revision `ef70726`,
read 2026-11-06) mapped to where the course uses it, and why the rest is left out.
"Kind" is the evidence class the lesson attributes: **A** arithmetic on a
published config, **M** the handbook's own cluster measurement, **X** one lab's
ablation, **C** a model's published configuration or report setting.

| Handbook | Topic | Kind | Destination |
|---|---|---|---|
| 1 | 18 of 20 top open models are MoE; stored versus active parameters | M | 4.18 §1 |
| 1 | Three new burdens: router, balance, token exchange | — | 4.18 §1, 5.14 §1, 5.16 §1 |
| 1 | Symptom-first debugging map | — | folded into the "what to watch" tables |
| 2.0 | Slurm / Enroot / Pyxis / HF Jobs cluster setup | — | **dropped**: environment-specific; track 12 owns DGX and CUDA |
| 2.1 | DCGM readiness, nccl-tests all-to-all, baselines per node count | M | 5.16 §3 (the 90%-of-baseline policy and the socket fallback) |
| 2.2 | NGC image, EFA libraries, `NCCL_NET_PLUGIN` | M | 5.16 §3, one paragraph |
| 2.3 | FineWeb-Edu + Llama 3.2 tokenizer via Datatrove | — | **dropped**: track 5.2–5.3 own data and tokenisation |
| 2.4 | Dense baseline: 1.22B, 16 layers, 2048 hidden, 8192 FFN | M | 5.15 §2 (comparison rule only) |
| 2.5 | First MoE: 64 experts, top-8, 1024 wide, EP8, aux 1e-3 | A | 4.18 §1 (recomputed on Qwen), 5.14 §2 |
| 2.5 | 1-expert parity within 0.00087 over 15 steps | M | 5.15 §1 (why upcycling is a controlled change) |
| 3.0 | Monitoring flags; routing trace; activation dumps | — | **dropped** as recipes; the signals appear in 5.14/5.15 |
| 3.1 | Gating function, renormalisation, output scale, sharpness, precision | C+A | 4.18 §2–4 (the three-gate worked case) |
| 3.1 | Router table of ten open MoEs | C | 4.18 §2, one sentence naming the spread; no table |
| 3.2 | Token choice vs expert choice; future-token leakage | X | 4.18 §2, short |
| 3.2 | Hash layers and Engram | C | 4.18 §2, one paragraph, DeepSeek-V4 only |
| 3.3 | Cost of imbalance; 1.5× at init; forced-even as control | M | 5.14 §1 |
| 3.3 | MaxVio definition and the `[2,2,4,0]` example | A | 5.14 §1, worked |
| 3.3 | Aux loss, the flat-probability trap, coefficient trade-off | A+X | 5.14 §2, worked exactly |
| 3.3 | Scope: micro-batch, sequence, global batch | X | 5.14 §3 |
| 3.3 | Loss-free bias: sign, linear, AdamW; centering; 128-expert limit | X | 5.14 §4 |
| 3.3 | Quantile balancing, EMA, global-versus-local gap | X+M | 5.14 §5 |
| 3.4 | Count and size, the 128-expert ablation, granularity | X | 4.18 §5 |
| 3.4 | Latent MoE and the `d/ℓ` trade | X+C | 4.18 §5 |
| 3.4 | Shared experts and the `1/(1+scale)` share | A+C | 4.18 §5 |
| 3.4 | Variable compute (identity experts, mixed widths) | C | 4.18 §5, two sentences |
| 3.4 | Activation clipping and SiTU-GLU | X+C | 4.18 §5, one paragraph |
| 3.5 | Dense layers, all-MoE, alternating | C+X | 4.18 §6 |
| 3.5 | Parallel block and shortcut-connected MoE | X+M | 5.16 §4 |
| 3.6 | Upcycling, slices, the head start and when it is repaid | X | 5.15 §1–2 |
| 3.6 | AdamW vs Muon for rarely routed experts; router optimizer | X | 5.15 §3 |
| 3.6 | MTP cost and pipeline placement | M+C | 5.15 §4 |
| 3.6 | Stability: NaN rerun, spiky loss, collapse, dead/rogue experts | M | 5.15 §5 |
| 3.7 | Profiling a step; half the step in all-to-all | M | 5.16 §1 |
| 3.7 | Interconnect, EP inside a node, the socket fallback | M | 5.16 §2–3 |
| 3.7 | Overlap: interleaved micro-batches, +35% | M | 5.16 §4 |
| 3.7 | Memory: recompute versus offload | M | 5.16 §4, one paragraph |
| 3.7 | Group-limited routing and the dispatcher condition | X | 5.16 §5 |
| 3.7 | Capacity factor, drops, replicas | X+M | 5.16 §6 |
| 3.7 | FP8, blockwise scales, NVFP4, router in fp32 | M+C | 5.16 §7 |
| 4 | Serving k and the denominator | X | 7.14 §2 |
| 4 | Low-bit experts; gpt-oss-20b 39.0 → 12.8 GiB | C | 7.14 §3 |
| 4 | EP at serving: prefill narrow, decode wide | M | 7.14 §4 |
| 4 | Attention–FFN disaggregation and its equal-budget caveat | X | 7.14 §5 |
| 4 | RL routing mismatch and replay | X | 7.14 §6 |
| 5 | Recommended flags, gathered | — | **dropped** as a list; flags appear only where a mechanism needs one |
| A.1 | Capture commands and readers | — | **dropped**: Megatron internals, not course material |
| A.2 | Reverse debugging index | — | **folded** into each lesson's "what to watch" table |

Deliberately not covered: expert-choice routing as a production option (taught as
a contrast only), every flag the handbook lists, and the cluster recipes. The
course says where it stops rather than implying completeness.
