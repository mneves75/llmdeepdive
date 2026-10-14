# Ledger: pilot lessons from tracks 4 and 7

Rows for the pilot lessons only; the track 4 and track 7 writers record the rest in their own ledgers. pt-BR says "aula" for a lesson.

| Lesson | Verdict | Main obstacle a junior hit | What changed |
| --- | --- | --- | --- |
| 4.3-scaled-dot-product-attention | restructure | Variance and standard deviation assumed; "saturation" used without definition; shorthand ("fails quietly", "the trainable regime", "load-bearing") | Q/K/d_k recalled in one sentence; variance, standard deviation and saturation defined where first used; banned shorthand replaced; max-subtraction tied to 0.3's shift invariance; five headings |
| 4.16-hybrid-layouts | restructure | Paragraphs of 150–250 words packing four claims per sentence; mixer, decode, content-addressed, induction undefined; floor numbers silently zero-indexed | Split into six headed sections with bullet contrasts; terms glossed; stated that floors count from 0 as layer indices do (matches 4.14 and quiz 3); all numbers kept and still pointed to 7.2 |
| 7.11-serving-stacks-vllm-sglang-tensorrt-llm | restructure | One 250-word paragraph covering five engines; goodput, TTFT, FP8, sharding, chat template undefined; shorthand ("earns its place", "has real teeth", "secretly begins") | One paragraph per engine; serving engine, bf16, KV pool, sharding, RadixAttention, FP8, goodput, chat template, time to first token defined; correctness order as a numbered list; 9.3 and 7.2 numbers left as references; four headings |
