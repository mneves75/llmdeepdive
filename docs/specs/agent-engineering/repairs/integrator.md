# Integrator repairs outside the lanes

Changes the integrator made to existing code and lessons, with the finding
each answers (`docs/plans/agent-engineering/lesson-review.md`).

| Finding | File | Old | New | Reason |
|---|---|---|---|---|
| F37 | `src/components/labs/KvBudgetLab.astro` | precision option "4-bit (0.5 B)" / "4 bits (0,5 B)"; note without artifact caveat | "4-bit ideal (0.5 B)" / "4 bits ideal (0,5 B)"; note says the option counts packed codes only and points to 7.10's 17.1 GB artifact against the 13.5 GB floor | The lab presented ideal packed-code sizing as if it were a measured deployment fit |
| F38 | `src/components/labs/CostPerTokenLab.astro` | note ended at "substitute your own numbers" | adds that throughput holds only for the input/output mix it was measured on | Varying input billing with a fixed output throughput does not establish capacity |
| — | `src/content/lessons/*/7-inference-and-efficiency/7.11-*.mdx` | TensorRT-LLM engine backend "removed in August 2026" | "removed in July 2026, from v1.3.0rc21; the stable 1.2 releases still include it" | Lane 8–13 verified the removal commit and tags; 7.11 belonged to another lane |
| — | `src/content/lessons/*/8-building-and-serving-stacks/8.11-*.mdx` | "grew its context window from 700 to 3,000 tokens" | "grew the input it sends with each request from 700 to 3,000 tokens" | Ambiguous next to the worked example's 1,200-token input |
| — | `src/content/lessons/*/4-transformer/4.16-*.mdx` | "Qwen3.8-27B was trained as this architecture" | the checkpoint is this architecture; its training is not published | Training-history claim the model card does not support |
