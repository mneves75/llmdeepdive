# AI Engineering Roadmap (Part 3): Source Review, First-Principles Plan & Inventory

Status: active implementation on `feat/ai-engineering-roadmap` (branched from `origin/main` `d81474b`, v0.16.0).

## 1. Source Audit & Copyright Boundary

Target source reviewed in full (all 26 routes extracted on 2026-11-20):
- `https://ai-engineer-roadmap-2026.vercel.app/` (CampusX — 16 levels, 165 modules, 286 sessions, 13 level capstones)
- `https://ai-engineer-roadmap-2026.vercel.app/100-days/` + 8 subpages (100-Day Accelerated Roadmap, 12 portfolio projects, 100 interview questions)

**Copyright & quality boundary:**
The target site is a commercial syllabus with no open-source license and contains outlines rather than written teaching prose. Nothing from it is reproduced. Every topic in its 16-level scope and 100-day path is mapped against our existing 26-track / 190-lesson corpus, and every gap is taught from scratch in `llmdeepdive.com`'s own voice (`docs/WRITING.md`): Feynman loop (concept -> analogy -> optional lab -> teach-back -> quiz), primary-source citations verified against arXiv and official specifications, derived arithmetic from one pure TypeScript module (`src/lib/engineering-math.ts`), and zero-JavaScript bilingual figures.

## 2. Sharpen Analysis (Deeper, Not Bigger)

1. **What a top AI-engineering educator does here beyond a checklist:**
   - Audits existing coverage so we never duplicate Tracks 0–13 (LLM internals, fine-tuning, inference, serving, hardware) or Tracks 14–25 (agent state, MCP, security, sandboxes, GUI, memory, HITL, self-correction, multi-agent, evals, resilience, capstone).
   - Builds **Part 3 — AI Engineering in Production (`engineering`)**: 8 focused tracks (Tracks 26–33, 40 new lessons per locale = 80 MDX files) closing every real engineering gap: LLM APIs/streaming/structured outputs/prompt hierarchy, retrieval & hybrid search (BM25 + HNSW + RRF), production RAG (reranking, query transforms, grounding, GraphRAG), LLM & RAG evaluations (error analysis, Recall@k/MRR/NDCG@k, Cohen's kappa, contamination), RAG security/privacy/governance (ACLs, PoisonedRAG, PII/ZDR, OWASP/NIST/EU AI Act), AI system design & multi-layer caching, LLMOps & managed cloud economics, and multimodal audio/voice/visual RAG + applied engineering defense.
   - Adds a first-class bilingual **Study Roadmap (`/roadmap/` and `/pt-br/roadmap/`)** linking every level of the 16-level progression and every phase of the 100-Day Accelerated Path directly to real, build-verified lessons across all 34 tracks (230 lessons), with device-local progress tracking (`ldd:complete:<locale>:<id>`), portfolio proof standards, and production defense scenarios.
2. **Rawest primary material (verified on 2026-11-20 against arXiv API & official standards):**
   - Lewis et al. (2020) `arxiv.org/abs/2005.11401` — RAG
   - Robertson & Zaragoza (2009) *The Probabilistic Relevance Framework: BM25 and Beyond* (Foundations & Trends in IR)
   - Cormack, Clarke & Büttcher (2009) *Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods* (SIGIR 2009)
   - Malkov & Yashunin (2016) `arxiv.org/abs/1603.09320` — HNSW
   - Khattab & Zaharia (2020) `arxiv.org/abs/2004.12832` — ColBERT
   - Kusupati et al. (2022) `arxiv.org/abs/2205.13147` — Matryoshka Representation Learning
   - Gao et al. (2022) `arxiv.org/abs/2212.10496` — HyDE
   - Liu et al. (2023) `arxiv.org/abs/2307.03172` — Lost in the Middle
   - Willard & Louf (2023) `arxiv.org/abs/2307.09702` — Efficient Guided Generation (FSM constrained decoding)
   - Wallace et al. (2024) `arxiv.org/abs/2404.13208` — The Instruction Hierarchy
   - Asai et al. (2023) `arxiv.org/abs/2310.11511` — Self-RAG
   - Yan et al. (2024) `arxiv.org/abs/2401.15884` — Corrective RAG
   - Edge et al. (2024) `arxiv.org/abs/2404.16130` — GraphRAG
   - Zheng et al. (2023) `arxiv.org/abs/2306.05685` — Judging LLM-as-a-Judge
   - Cohen (1960) *A Coefficient of Agreement for Nominal Scales* (Educational and Psychological Measurement)
   - Rein et al. (2023) `arxiv.org/abs/2311.12022` — GPQA
   - Phan et al. (2025) `arxiv.org/abs/2501.14249` — Humanity's Last Exam
   - Zou et al. (2024) `arxiv.org/abs/2402.07867` — PoisonedRAG
   - OWASP Top 10 for LLM Applications (`genai.owasp.org/llm-top-10/`)
   - NIST AI 600-1 Generative AI Profile (`csrc.nist.gov/pubs/nist/ai/600-1/final`)
   - Regulation (EU) 2024/1689 EU AI Act (`eur-lex.europa.eu/eli/reg/2024/1689/oj`)
   - Chen et al. (2023) `arxiv.org/abs/2305.05176` — FrugalGPT
   - Ong et al. (2024) `arxiv.org/abs/2406.18665` — RouteLLM
   - OpenTelemetry GenAI Semantic Conventions (`github.com/open-telemetry/semantic-conventions-genai`)
   - Faysse et al. (2024) `arxiv.org/abs/2407.01449` — ColPali
   - Radford et al. (2021) `arxiv.org/abs/2103.00020` — CLIP
   - Zhai et al. (2023) `arxiv.org/abs/2303.15343` — SigLIP
   - Ho et al. (2020) `arxiv.org/abs/2006.11239` — DDPM
   - Lipman et al. (2022) `arxiv.org/abs/2210.02747` — Flow Matching
   - Radford et al. (2022) `arxiv.org/abs/2212.04356` — Whisper
   - Défossez et al. (2022) `arxiv.org/abs/2210.13438` — EnCodec
   - Sheng et al. (2023) `arxiv.org/abs/2311.03285` — S-LoRA
3. **Methods & tools:**
   - Pure arithmetic module (`src/lib/engineering-math.ts`) built before prose, verified with `cccc --no-cache --min 0` (unit tests written strictly for functions with cognitive complexity > 5 or containing regexes).
   - Two new zero-regression interactive labs (`RagEvalLab.astro` on 29.2, `AiSystemBudgetLab.astro` on 31.1), server-rendering exact worked defaults.
   - Eight track figure files (`src/lib/figures/26-*.ts` .. `33-*.ts`), zero JavaScript, HTML strings + SVG geometry.
   - Modern Web Guidance (2026+) frontend polish: native `<details>` + `::details-content` + `interpolate-size: allow-keywords` progressive enhancement, `flex-wrap: balance`, `scrollbar-gutter: stable`, `overscroll-behavior: contain`, 3-band Star Atlas sky chart, and `/roadmap/` interactive local-progress study guide.
4. **Independent proof outside this session:**
   - All 16+ repo gates green (`build`, `typecheck`, `lint`, `test`, `content:parity`, `content:stubs`, `content:graph`, `content:citations`, `content:assets`, `content:figures`, `content:excerpts`, `a11y:contrast`, `budget`, `privacy`, `audit`, 3-engine `render:check`).
   - `tests/engineering-content.test.mjs` pinning derived numbers across both locales.
   - Independent cross-model adversarial review + `mneves-prune-tests` + `mneves-verify` + `mneves-security` deploy gate.
   - Live staging + production deploy with `pnpm verify:live --target production` and staging turned off afterwards.

## 3. Red-Team Pre-Mortem (6 Months Out)

1. **3-Band Sky Chart framing/layout:** Tested upfront via `src/lib/three/scenes/sky.ts` for `1000 × 1800`; `SkyChart.astro` key updated from 2 bands to N bands cleanly.
2. **Parallel content drift (quiz cues, heading counts, derived numbers):** Prevented by frozen `inventory.json`, explicit `correctIndexPattern` per lesson, exact derived constants from `engineering-math.ts`, and `tests/engineering-content.test.mjs`.
3. **Framework rot (5-year retrospective):** Every lesson teaches the durable mathematical/systems mechanism first and dates 2026 tools/platforms explicitly as examples.

## 4. Corpus Scale After This Release (v0.17.0)

- **34 tracks** across **3 parts** (`models`: 0–13, `agents`: 14–25, `engineering`: 26–33)
- **230 lessons per locale** (460 MDX files total)
- **10 interactive labs** (8 existing + `rag-eval` + `ai-system-budget`)
- **Bilingual Study Roadmap** (`/roadmap/` and `/pt-br/roadmap/`) covering the full 16-level path, 100-day accelerated schedule, portfolio proof rubric, and engineering defense scenarios.
