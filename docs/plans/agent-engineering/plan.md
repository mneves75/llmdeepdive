# Agent engineering curriculum and existing-course improvement plan

Status: planning deliverable, not implementation authorization. Prepared 2026-10-18 against `3ebaaa71d8b8cf26554bc5d6f2e7cba60f0ea040` (package 0.12.0). Existing untracked `docs/handoffs/` is outside this task.

Companion deliverables: [existing lesson review and prioritized repairs](lesson-review.md) and [125-pair source coverage ledger](coverage.md).

## What the review changed

- Replace “know everything” with demonstrated competence: explain mechanisms, implement a bounded system, diagnose failures, evaluate evidence, and recognize when automation should stop. Reading completion cannot establish professional mastery.
- Keep all twelve requested topics, but teach security and isolation before browser actions, external writes, and multi-agent delegation.
- Teach a small single-agent baseline before a swarm; a swarm must earn its added cost and failure modes through a measured comparison.
- Replace exact golden-path grading with outcome assertions, authorization invariants, and permitted partial orders. Alternative valid trajectories must pass.
- Replace “strip malicious instructions” with an untrusted-data boundary and independently enforced authorization. Detection and sanitization are fallible supporting controls.
- Keep the website static, bilingual, and private. Exercises that need Postgres, Temporal, Slack, microVMs, credentials, or model calls run in learner-owned environments. No remote execution or API-key form is added to the course.
- Independent review added a concrete Linux/KVM target for the microVM project, separate executable-example CI, and an explicit distinction between fixture success and demonstrated live-model competence.
- Improve existing lessons with targeted, evidence-backed repairs; preserve the recent Feynman rewrite and its good explanations.

## Objective, assumptions, and scope

The audience remains a junior developer who knows arrays, functions, loops, and maps. The new material assumes neither distributed-systems experience nor prior agent-framework knowledge. HTTP requests, JSON, SQL transactions, asynchronous work, authentication versus authorization, and test fixtures receive worked introductions before use.

This plan proposes **12 new tracks, 60 lessons per locale**, appended as tracks 14–25. The resulting course would contain **26 tracks and 185 lessons per locale: 370 MDX files**. Five lessons per track is an initial editorial budget, not permission to compress several unexplained ideas into one page; split a lesson only after updating this inventory, prerequisites, estimates, and acceptance criteria.

Assumptions: Python is the main project language because the requested exercises use Pydantic and Python execution. TypeScript is used only where a browser/WebContainers comparison needs it. Postgres is the project database; the static site gains no database. LangGraph is the primary agent graph example; Temporal is the durable-workflow comparison and approval project, not a mandatory second orchestration layer inside every exercise. All external services have offline fixtures; cloud execution is an explicitly optional learner activity.

This is a substantial multi-session curriculum project. This task produces the plan and review only: no lesson rewrites, dependency installation, source changes, version bumps, commits, publication, or deployment.

## Alternatives and decision

| Approach | Benefit | Cost / rejection reason |
|---|---|---|
| Append twelve focused tracks, with one cumulative project | Covers every requested mechanism and produces comparable artifacts; reuses the course structure | Larger catalog needs a navigation/layout check; selected |
| Add one broad agent track of 12–18 lessons | Smaller initial release | Too compressed for junior developers to learn protocols, security, durability, and operations with meaningful practice |
| Keep the course about model internals and link to external agent courses | Challenges the premise that this site needs another discipline; lowest maintenance | Does not satisfy the requested integrated learning outcome; use external sources as references, not the curriculum |

Use progressive publication rather than one 120-file content batch. Preserve existing URLs and progress keys. Teach transferable mechanisms first, with pinned framework walkthroughs as concrete examples.

## Claims from the proposed outline that must change

| Proposed claim or exercise | Required correction |
|---|---|
| DAGs for a workflow that loops | A DAG is acyclic. Teach DAGs, general directed graphs, and finite-state transition systems separately. The **course prerequisite graph remains acyclic** even when an exercise's execution graph contains cycles. |
| Chat loops crash; state machines solve production | Syntax is not the reliability boundary. A bounded loop can be sound; persistence, replay semantics, idempotency, concurrency control, and recovery determine reliability. |
| Raw MCP server is the production pattern | Implement a deliberately bounded protocol subset for learning, with explicit unsupported features and conformance tests. Compare with a maintained SDK afterward. Do not hand-roll OAuth or cryptography. |
| 80% of enterprise software has no API | No primary evidence supplied or established here. Remove the number. A legacy UI without a usable API is sufficient motivation. |
| Infinite context causes hallucination and OOM | Context capacity, relevance, retrieval error, model quality, latency, and inference memory are distinct. Longer context is neither unlimited memory nor a guaranteed cause of hallucination. |
| Three memory tiers are universal | Working, episodic, and semantic memory are a useful teaching taxonomy, not a protocol or the only architecture. |
| Strict JSON handoffs prevent drift | Types validate structure. Provenance, meaning, permissions, and task intent still need validation. Text may be a typed, explicitly untrusted payload. |
| E2B, WebContainers, gVisor, Docker-in-Docker are equivalent sandboxes | Compare distinct trust boundaries and execution capabilities. A browser runtime is not a Python microVM; gVisor is not a microVM; privileged Docker and mounted host sockets defeat the desired boundary. |
| Sanitization strips away prompt injection | Do not claim a complete language filter. Test policy enforcement even when a detector misses the injection. |
| Wait three days for Slack approval | Use a durable wait, authenticated callbacks, operation-bound approval, expiry and revocation. Test with a simulated clock; retain a separate optional real elapsed-time exercise. |
| Self-debugging agents are digital employees | A bounded repair loop is a tool with failure modes. Require executable tests and escalation; remove the employment metaphor. |
| Block every deviation from a golden trajectory | Permit semantically equivalent paths; fail skipped safety steps, unauthorized effects, invalid arguments, and bad outcomes. Sequence distance is a diagnostic. |
| Automatically fall back to a browser on HTTP 404 | Classify the error first. Missing resource, wrong route, auth-masking, and retired endpoint are different. A fallback requires an approved equivalent action and cannot bypass authorization. |
| Top labs hire based on these artifacts | Avoid unsupported hiring guarantees. A reproducible portfolio demonstrates judgment without predicting employment. |

These corrections follow the distinction between workflows and agents in [Anthropic's architecture guidance](https://www.anthropic.com/engineering/building-effective-agents), the persistence contract in [LangGraph](https://docs.langchain.com/oss/python/langgraph/persistence), and the difference between transcript and environment outcome in [agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). The curriculum structure and scope are editorial recommendations, not claims made by these sources.

## The cumulative project

Build a fictional purchasing assistant over synthetic data. It reads a request and an untrusted supplier message, retrieves purchase records, gathers evidence from a local mock portal, proposes an invoice, and waits for authorization. It may generate a small report in an isolated Python environment. Nothing sends a real invoice or moves money.

Keep the Researcher–Coder–Reviewer exercise as a separable report-generation subsystem. A deterministic controller owns permissions, budgets, and final acceptance. The Reviewer agent cannot waive tests, approve payments, change policy, or acquire the Coder's capabilities.

Suggested project records: `RunState`, `ToolRequest`, `ToolResult`, `EvidenceRef`, `ApprovalRequest`, `ExecutionEvent`. Teach schema version, run/task ID, authenticated principal, operation ID, causal parent, timestamps, budget counters, and bounded error fields when they first become necessary. Identity and permissions come from the trusted runtime, never from model-authored JSON. Store artifact references/hashes instead of repeatedly copying large documents.

First run uses fixed model responses and synthetic tool fixtures. Later runs replace the model adapter with a real provider or local model for the applied mastery assessment; access to a paid service is not required. Recorded transcripts demonstrate the workflow but do not count as live-model success evidence. Readers can complete the conceptual course without model hardware or a paid API, but their project evidence must remain labeled `fixture-only` until fresh model calls have been demonstrated.

### Supported exercise environments

- Baseline project and deterministic CI: a pinned Python environment on Linux x86_64, with Postgres and Temporal local development services. Support macOS for the ordinary Python/browser exercises after a clean-machine check. Windows/WSL is unverified until tested; do not advertise it as supported by inference.
- MicroVM reference: Linux x86_64 with working `/dev/kvm`, using a pinned Firecracker release and a prebuilt guest image with its dependency/image manifest. This needs a KVM-capable host; macOS, ordinary containers and an arbitrary hosted CI runner are not substitutes. Read and verify the Firecracker setup/security contract during the pilot before publishing any command.
- Optional managed comparison: E2B in a learner-owned account, explicitly priced and consented to by the learner. The controller may contact the provider; the **untrusted guest workload** must have denied egress. Guest egress restriction does not mean the entire cloud control plane has no network.
- A learner without KVM or a managed sandbox can analyze provided traces and complete conceptual assessments, but cannot claim the microVM implementation milestone. The lesson must expose that requirement before asking the learner to begin.
- Model evidence may use a capable local model or an explicitly selected provider. Record the model artifact/revision and tool/schema support. Unsupported model behavior is reported, not hidden behind pre-recorded responses.

## Lesson format and mastery

Every lesson follows `docs/WRITING.md` and the existing concept → analogy → optional lab → teach-back → quiz sequence:

1. Open with a concrete question and a small worked failure or successful example.
2. Define terms at first use; show the trace or numbers before the general mechanism.
3. Explain the mechanism and the limits of its analogy.
4. Include a worked exercise, expected artifact, and at least one meaningful failure case. A project command belongs in the prose until a real browser calculator is implemented.
5. Ask a teach-back that transfers the mechanism to a changed scenario.
6. Use roughly three diagnostic quiz questions covering reasoning, a failure case, and a misconception. Plausible distractors explain why a tempting choice is wrong.

Each lesson has primary citations or a justified citation exception; framework behavior needs a tested release/tag and date. EN/pt-BR use identical examples, mathematical notation, figures, code, and assessment intent, with natural localized prose. Every revised existing lesson updates `updated`; factual repairs are recorded separately from editorial rewrites.

The existing completion rule (80 characters, 15 words, correct quiz) remains a **participation check**. The capstone rubric supplies the stronger competence evidence. Do not imply the browser verifies external project work, and do not silently change progress semantics to pretend it does.

Existing quiz-option changes are a separate **assessment repair**, not a voice-only rewrite. `docs/WRITING.md` currently requires prose rewrites to preserve `options` and `correctIndex`; retain that protection. In the implementation's documentation-first step, add a narrow assessment-repair procedure allowing reviewed distractor edits while preserving the intended correct concept, bilingual option ordering, and explicit change evidence. Do not silently waive the existing rule or shuffle indices merely to improve statistics.

## Curriculum sequence and prerequisite map

Existing foundations feed the new sequence: `0.1-what-is-a-language-model` for the model boundary, `0.8-how-to-read-ml-paper` for evaluating evidence, track 1 for tokens and embeddings, `6.4-reward-models-and-human-preference-data` and `6.10-constitutional-ai-and-rlaif` for preference/alignment limits, `7.2-the-kv-cache` for cache memory, 8.11/8.12 for serving choices, and `9.10-cost-per-token` for cost. Link to the owning lesson instead of repeating its model-specific arithmetic. Tracks 10–13 are optional specialization, not prerequisites for every agent learner.

The default order is 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25. Hard dependencies should name only concepts a lesson actually uses. Security, budget limits, and a small test harness begin in track 14; later tracks deepen them. Do not defer all evaluation until track 23.

### Track 14 — Agent architecture and durable state / Arquitetura de agentes e estado durável

Requested stage 1. Suggested slug: `14-agent-architecture-and-state`.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 14.1 When a workflow needs an agent | Compare a deterministic invoice parser, one model call, and an agent choosing tools; introduce JSON/HTTP envelopes and a task success assertion | Learner selects the least complex system for three tasks and runs one fixture-based test |
| 14.2 States, DAGs, branches, and loops | Draw `received → checked → needs_info/ready → completed`; add one bounded revision cycle and terminal states | Transition table rejects an illegal transition and stops at the step budget |
| 14.3 Checkpoints and serialization | Persist a versioned state record; distinguish in-memory snapshots from durable storage; introduce transactions and compare-and-swap | Kill/restart between nodes restores the last committed state; stale concurrent write is rejected |
| 14.4 Replay and side effects | Model-call nondeterminism, idempotency keys, outbox/reconciliation, delivery versus effect; crash after a write but before acknowledgement | A duplicated delivery produces one logical invoice; unknown write outcome enters reconciliation |
| 14.5 LangGraph and Temporal | Implement the small graph in LangGraph; contrast Temporal workflows/activities, deterministic replay, durable timers and history | Restart the durable example; explain which work may repeat and which record proves completion |

Analogy: a railway signal box records legal routes, but recording a departure is not proof a train arrived. Figure: transition graph plus crash timeline. Teach-back: explain why replaying a checkpoint can duplicate an external effect. Project gate: loop, branch, pause, restart, cancel, and bounded exhaustion all have tested states.

### Track 15 — Tool contracts and MCP / Contratos de ferramentas e MCP

Requested stage 2. Slug: `15-tool-contracts-and-mcp`. Depends on track 14.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 15.1 From model output to a tool request | JSON Schema and strict Pydantic, unknown fields, enums, numeric limits, semantic validation | Wrong types, extra fields, and a structurally valid unauthorized invoice ID are rejected |
| 15.2 JSON-RPC and protocol lifecycle | Request IDs, results, errors, notifications, initialization, capability/version negotiation | A hand-written dispatcher correlates responses and handles malformed or unsupported messages |
| 15.3 Tools, resources, prompts, discovery | MCP host/client/server roles; list/call tools, pagination, changing catalogs, untrusted descriptions | Client handles a catalog change without granting new capabilities automatically |
| 15.4 A raw local Postgres MCP server | Narrow read-only business tools, parameterized queries, restricted DB role, bounded rows/time, synthetic tenants | A second client interoperates; injection and cross-tenant requests fail with no forbidden SQL effect |
| 15.5 Transport and authorization boundaries | stdio process identity versus remote HTTP authorization, token audience/scopes, consent, cancellation and transport errors | Revoked/expired/wrong-audience credentials fail in the remote fixture; raw-server subset is documented |

Analogy: a typed order form does not authorize a warehouse shipment. Figure: host–client–server–database trust boundaries. Deliver both the raw educational implementation and a comparison to an official SDK; the raw exercise must not imply full MCP compliance or home-grown OAuth safety. Authentication libraries and a Postgres driver do not violate the “no wrapper SDK” protocol-learning constraint.

### Track 16 — Agent security and trust boundaries / Segurança de agentes e limites de confiança

Requested stage 7, moved earlier. Slug: `16-agent-security-and-guardrails`. Depends on 14–15.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 16.1 Threat-model the assistant | Assets, principals, attacker-controlled content, confused deputy, read/write capabilities | Diagram marks each boundary and assigns a policy owner outside the model |
| 16.2 Indirect prompt injection | Malicious supplier email, retrieved document, tool result and screenshot; instruction/data separation | Benign and attack inputs are both tested; detector misses do not grant a write |
| 16.3 Tool poisoning and delegation | Description changes, tool output poisoning, capability escalation and provenance | A changed tool catalog cannot silently widen an agent's permission set |
| 16.4 Enforce least privilege | Typed extraction, allowlisted actions, per-user/tenant checks, safe output rendering, credential broker | Email agent cannot call database-write tools even when it emits their exact schema |
| 16.5 Red-team the boundary | Obfuscated/multilingual attacks, exfiltration requests, unsafe links, audit trails | Plant a bypass in the policy gate and prove the suite catches it; report residual risk |

Analogy: mail is evidence submitted to an office, not a new company policy. Replace the proposed “strip malicious instructions” middleware with an extraction and policy boundary; retain detection as a fallible signal. No real email or credentials in fixtures. [MCP security guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices) supports explicit token, deputy, and local-server threat analysis.

### Track 17 — Sandboxed execution / Execução em ambientes isolados

Requested stage 6. Slug: `17-sandboxed-agent-execution`. Depends on track 16.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 17.1 What isolation protects | Processes, containers, userspace kernels, VMs/microVMs; control plane versus untrusted workload | Compare host filesystem, kernel, credentials, and network boundaries without treating all sandboxes as equivalent |
| 17.2 Resource and filesystem limits | CPU, memory, PIDs, disk, wall clock, readonly mounts, output limits | Infinite loop, memory growth, fork pressure and oversized output are bounded |
| 17.3 Network and secrets | Default-deny egress, DNS/IPv4/IPv6, metadata endpoints, no inherited secrets, prebuilt dependencies | Controlled probes and positive controls establish actual blocked application traffic |
| 17.4 A Python microVM interpreter | Provision the Linux/KVM Firecracker reference (or separately verified E2B route); upload synthetic CSV, execute, collect bounded artifacts, destroy | Expected CSV summary is returned; execution cannot reach prohibited destinations or host data |
| 17.5 Choose and test the boundary | Compare E2B, gVisor, WebContainers, unprivileged containers, and Docker-in-Docker; escape risks and cleanup | ADR explains the threat model, unsupported platforms, measured limits, and failure cleanup |

Analogy: a laboratory enclosure needs independent power and exhaust controls, not only a locked door. E2B documents internet access as enabled by default; the exercise must configure it explicitly and test application-level traffic, not just socket creation. [E2B network documentation](https://docs.e2b.dev/network/internet-access). gVisor's architecture is a separate isolation design, not a promise of zero vulnerabilities. [gVisor security introduction](https://gvisor.dev/docs/architecture_guide/intro/).

### Track 18 — Computer use and GUI automation / Uso de computadores e automação de interfaces

Requested stage 3. Slug: `18-computer-use-and-gui-automation`. Depends on 15–17.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 18.1 Observe before acting | DOM, accessibility tree, roles/names, stable locators; Playwright and Puppeteer comparison | Same fixture works after harmless DOM structure changes |
| 18.2 Pixels and coordinates | Vision-only mode, Set-of-Mark overlays, viewport versus screenshot coordinates, scale, scroll, stale frames | Coordinate transform tested at two viewports/device scales; ambiguous target triggers re-observation |
| 18.3 Login and session state | Synthetic credentials, secrets broker, MFA/human handoff, session expiry, domain restrictions | No credentials appear in traces; expired session pauses rather than retries blindly |
| 18.4 Download a CSV | Navigate local legacy portal via screenshot mode; validate URL, download completion, file type/schema, safe destination | Downloaded rows match the fixture, including a delayed download and misleading success banner |
| 18.5 Recover and verify | Screenshot diff masks for unstable regions, semantic assertions, modal/timeout recovery, bounded actions | Altered layout recovers or safely escalates; a wrong CSV fails despite a successful click |

Analogy: reading a map, following a street sign, and remembering yesterday's position are different observations. Prefer semantic locators when available; retain a deliberately screenshot-only exercise to teach the requested vision mechanism. No CAPTCHA or MFA bypass, no real enterprise portal. [Playwright locators](https://playwright.dev/docs/locators) are the source for the semantic route; pin the chosen vision provider's computer-use contract separately.

### Track 19 — Memory and context engineering / Memória e engenharia de contexto

Requested stage 4. Slug: `19-agent-memory-and-context`. Depends on 14–16; reuse token/context lessons.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 19.1 Working, episodic, semantic memory | Separate active run state, event history, extracted knowledge, retrieval, and model weights | Classify a request, an observation, and a durable fact; no transcript is silently treated as truth |
| 19.2 Ingestion and retrieval | Chunking, embeddings, lexical/hybrid retrieval, reranking, provenance, ACL filtering, freshness | A relevant authorized item is retrieved; a similar other-tenant item is excluded |
| 19.3 Token budgets and compression | Account for instructions, tools, retrieved text, reserved output; compress a 50-turn synthetic conversation | Summary stays within a stated token budget and preserves a scored set of commitments/negations |
| 19.4 Scoring, eviction, and forgetting | TTL, recency/relevance tradeoffs, vector-index deletion, contradiction/version handling, user deletion | Deleted source is absent from retrieval and derived summaries under the stated retention policy |
| 19.5 Evaluate memory | Compare no memory, raw window, summary, retrieval; query fixtures, recall and false-memory rate | Learner reports both saved tokens and lost facts; memory does not recover an attacker instruction as authority |

Analogy: a notebook, dated case records, and a reference shelf serve different purposes. Figure: budget allocation and source-to-summary lineage. The lab owns synthetic numbers; do not re-derive Qwen cache budgets owned by existing lessons.

### Track 20 — Human approval and durable pauses / Aprovação humana e pausas duráveis

Requested stage 8. Slug: `20-human-approval-and-durable-pauses`. Depends on 14–16.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 20.1 Decide when approval is needed | Risk, reversibility, preview, clear approver responsibility | A USD 10,000 draft requires approval; low-risk local reading does not |
| 20.2 Bind approval to an operation | Invoice ID/version, amount/currency, payee, content hash, principal, expiry and one-use status | Editing amount/payee invalidates approval; model cannot self-approve |
| 20.3 Durable waits and callbacks | Temporal signal/update concepts, callback routing, transaction boundaries, clock control | Simulated three-day wait survives worker restart without a sleeping worker |
| 20.4 Slack and Teams adapters | Verify signed callbacks, authenticated approver roles, acknowledge promptly, queue durable work | Forged, replayed, duplicate, late, and unauthorized callbacks are rejected or deduplicated |
| 20.5 Deny, expire, revoke, resume | Races, cancellation, time-of-check/time-of-use, reconciliation after uncertain effects | Approval and cancellation racing cause at most one permitted effect |

Analogy: a signature authorizes one specific document, not every later edit. Slack is the implemented mock adapter; Teams gets an equivalent design exercise with its own official authentication contract. Never claim Slack request signing applies to Teams. Durable wait semantics use [Temporal message passing](https://docs.temporal.io/encyclopedia/workflow-message-passing).

### Track 21 — Bounded self-correction / Autocorreção com limites

Requested stage 9. Slug: `21-bounded-agent-self-correction`. Depends on 17 and a basic test harness.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 21.1 What counts as corrective feedback | Compiler/type errors, test failures, runtime traces, environmental failures, critic opinions | A critic's approval cannot replace a failing executable test |
| 21.2 Read a failure | Parse a traceback, locate the relevant frame, redact secrets, treat log text as untrusted | Repair targets the actual failing assertion rather than obeying instructions embedded in a log |
| 21.3 Repair with a bounded context | Minimal patch, hypothesis, failing test, affected-file scope and clean starting snapshot | A planted bug fails before repair and passes afterward without weakened tests |
| 21.4 Budget the loop | At most three repair attempts, wall-time/token limits, repeated-failure detection | Third failed repair escalates; budget counters survive restart |
| 21.5 Evaluate correction | Held-out tests, overfitting, regression checks, independent evidence | Report original versus repaired success and regressions, including cases where no repair is safer |

Analogy: debugging from a measurement beats repeatedly changing parts until a warning disappears. Define “three attempts” precisely as three repair attempts after the initial failing run; count reruns consistently.

### Track 22 — Multi-agent systems and A2A / Sistemas multiagente e A2A

Requested stage 5. Slug: `22-multi-agent-systems-and-a2a`. Depends on security, state, and bounded correction.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 22.1 Decide whether to divide work | Single-agent baseline, decomposability, coordination/token overhead, parallel critical path | Compare one agent and three on identical tasks before claiming a win |
| 22.2 Typed handoffs | Task contract, evidence, artifacts, status/error unions, schema version, trusted identity | Unknown/missing fields fail; valid JSON with unsupported claims still fails evidence checks |
| 22.3 Supervisor and peer topologies | Ownership, fan-out/fan-in, shared-state races, deadlock, cancellation and partial failures | One failed child produces a defined partial/failure state and bounded cleanup |
| 22.4 A2A interoperability | Agent discovery/card, tasks, messages/parts, artifacts, streaming/push updates and auth; compare MCP's role | Two independently started components exchange a pinned protocol fixture and reject incompatible versions |
| 22.5 Researcher, Coder, Reviewer | Separate capabilities; consensus/voting limits under correlated errors; controller-owned acceptance | Typed artifact handoff completes a report; malicious researcher content cannot grant code execution or waive tests |

Analogy: a team needs explicit responsibility and evidence, not only a group chat. Natural-language evidence can occupy typed fields; “never raw text” means no unstructured control contract, not a ban on textual artifacts. Pin the [A2A specification](https://a2a-protocol.org/latest/specification/) and its transport bindings before authoring exact messages.

### Track 23 — Trajectory evaluation and CI / Avaliação de trajetórias e CI

Requested stage 10. Slug: `23-agent-evaluation-and-ci`. Builds on the minimal tests introduced in 14.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 23.1 Define success and capture traces | Final environment state, tool arguments, state transitions, redacted events, trace IDs | Success text with no downloaded file or DB effect fails |
| 23.2 Evaluate valid paths | Safety invariants, required-before relations, allowed branch graph, trajectory distance | Two safe alternative paths pass; missing approval fails even if output matches |
| 23.3 Build a 100-case corpus | Normal, failure, attack, recovery, long-wait and concurrency cases; dev/held-out split | Manifest records case ID, setup, oracle, seed, expected allowed effects and provenance |
| 23.4 Calibrate graders | Deterministic assertions first, LLM judge for semantic quality, human-labeled calibration, correlated judges | An intentionally wrong judge and a broken safety gate are detected by controls |
| 23.5 CI, replay, and live trials | Recorded deterministic replay versus fresh model execution, repeated trials, confidence intervals, cost | CI catches injected regressions and accepts valid alternatives; report sample size and uncertainty |

Proposed 100-case distribution: 30 ordinary tasks, 20 tool/schema/auth failures, 15 injection/exfiltration attempts, 15 crash/idempotency cases, 10 approval races/expiry cases, 10 browser/memory degradation cases. Freeze 20 as held-out cases (stratified across categories); use 80 while developing. Run the full suite on a release candidate and rotate held-out cases after exposure. These are coverage choices, not statistically sufficient evidence for every deployment.

### Track 24 — Resilience and graceful degradation / Resiliência e degradação controlada

Requested stage 11. Slug: `24-agent-resilience-and-fallbacks`. Depends on 18, 20 and 23.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 24.1 Classify failures | 404 versus auth failure, throttling, timeout, transient server failure, uncertain commit | Decision table chooses stop, retry, reconcile, or approved fallback correctly |
| 24.2 Retry and circuit breakers | Backoff/jitter, Retry-After, retry budgets, open/half-open/closed states | Simulated outage cannot create a retry storm |
| 24.3 API-to-browser fallback | Equivalent task scope, session identity, permissions, idempotency, confirmation boundary | Only a known retired read endpoint falls back; 401/403, forbidden task, or uncertain write does not |
| 24.4 Model cascades and budgets | Quality/cost/latency tradeoffs, aggregate spending reservations, deadlines, kill switch | Concurrent workers cannot overspend the budget by each independently checking stale totals |
| 24.5 Recovery drills | Provider outage, partial results, degraded labels, operator runbook, rollback/cancel | Chaos fixture demonstrates a useful bounded result or a clear escalation with no duplicate effects |

Analogy: a detour must still reach the permitted destination; it cannot cross a locked gate. No seamless-fallback claim unless identity, authorization, and postconditions remain equivalent.

### Track 25 — Capstone and public evidence / Projeto final e evidências públicas

Requested stage 12. Slug: `25-agent-capstone-and-portfolio`.

| Lesson | Mechanism and worked case | Observable evidence |
|---|---|---|
| 25.1 Architecture and threat-model review | Requirements, non-agent baseline, trust boundaries, state machine, ADR alternatives | Another learner can explain why each agent/framework exists |
| 25.2 Reproducible benchmark | Pinned environment/model, fixtures, repeated trials, cost per successful task, latency distribution | Report includes failures, retries, sandbox expense and human-wait time separately |
| 25.3 Failure analysis | Incident timeline, root cause, counterfactual, remaining risk, recovery evidence | At least one failed run is reconstructed from artifacts without secret/raw-user-data disclosure |
| 25.4 Write the teardown | Setup, methodology, results, limitations, logs/artifact manifest, licenses | A second person can reproduce the deterministic suite from a clean environment |
| 25.5 Defend and publish deliberately | Compare single versus multi-agent results; novel failure exercise; public/private redaction | Rubric passes; publication remains the learner's explicit choice, with an equivalent private submission |

No requirement to post externally to complete the course. Cost and performance are measurements with model/version/date/region/hardware; do not promise employment or generalize one project benchmark to all agent systems.

## Browser labs and static figures

Use existing figure primitives before new JavaScript: `flow`/`stack` for state and trust boundaries, `grid` for permission/transition matrices, `plot` for budget and evaluation curves. One bilingual registry per new track under `src/lib/figures/`; strings stay in HTML. Every figure must explain a mechanism, not decorate a page.

Start with four small optional calculators: context-budget allocation (19.3), retry/cost budget (21.4/24.4), approved partial-order trace checking (23.2), and cost per successful task (25.2). These are proposed additions, not existing features. Use `lab.kind: calculator`, pure functions in `src/lib/lab-math.ts`, locale-aware parsing in `lab-form.ts`, and explicit component wiring in `Lesson.astro`. Each server-renders a complete worked default and obeys its measured `budgetKb`.

Do not add a generic workflow editor, arbitrary Python runner, online grader, WebContainer embed, account system, or new backend to the site. Those would widen the product and privacy boundary. External project exercises remain useful with JavaScript disabled through source listings, fixtures, expected traces, and instructions.

## Repository impact and integration checklist

| Surface | Planned work / verification |
|---|---|
| `src/content/tracks/{en,pt-br}` | 24 paired track JSON files; meaningful titles and summaries; retain existing four tiers |
| `src/content/lessons/{en,pt-br}/14-*` … `25-*` | 120 paired MDX files; IDs, prerequisites, unlocks, dates, citations, exercises and localized assessments |
| Existing lessons, especially 0/4/6/7/8/9 | Targeted fact/pedagogy fixes and forward links; exact audit findings govern scope |
| `src/lib/figures/{track}.ts`, `index.ts` | Register only needed bilingual figures; preserve zero-JS interaction and content gate |
| `src/components/labs/*`, `src/lib/lab-math.ts`, `lab-form.ts`, `src/layouts/Lesson.astro` | Four optional calculators, defaults and script dispatch; add only after content-only pilot proves need |
| `src/content.config.ts`, `src/lib/content.ts` | Existing schema supports the content; no schema change for external exercises. Reading time is not project completion time |
| Home, TracksIndex, Syllabus, `sky.ts`, sky scene/layout tests | Prototype 26 tracks and 185 stars per locale before bulk content. Fixed 1000×560 sky and per-track cell width shrink as count rises; test label/hit-target collisions and fall back to an explicitly designed grouped presentation if required |
| `src/lib/seo.ts`, `src/pages/llms.txt.ts`, sitemap, social cards, search | Discover routes through content, correct bilingual metadata/counts, exclude solution/chrome from search where appropriate |
| `tests/`, `scripts/content-*`, budget/render gates | Extend outcome-based tests and fixtures; no weakening of existing invariants or budget ceilings |
| `.github/workflows/ci.yml` and project test configuration | Add a separate Python/project fixture job; website gates do not execute Python examples. Use a dedicated KVM-enabled lane for microVM checks and explicitly scoped optional provider jobs |
| `README.md`, `PRODUCT.md`, `FOR_YOU_KNOW.md`, `MEMORY.md`, `AGENTS.md`, changelog | Update shipped scope only as waves actually ship; keep proposed scope visibly separate |
| `docs/WRITING.md` | Document the narrow assessment-repair procedure separately from voice-only rewrites before changing existing quiz options |
| Learner project material | Proposed `examples/agent-engineering/` with README, dependency lock, synthetic fixtures, tests, tagged expected outputs. Exercise dependencies do not enter the website package manifest |

Before implementing project files, confirm clean-checkout execution on supported platforms and select a dependency manager consistent with repo policy. Website tooling remains pnpm. Proposed isolated Python project setup: a pinned `uv` toolchain with `pyproject.toml` and `uv.lock`; run `uv sync --frozen` and `uv run --frozen python -m unittest discover -s tests` from `examples/agent-engineering/`. These are future project commands, not commands already present or run. This planning task installs nothing.

The fixture CI job exercises protocol dispatch, schema/auth failures, state recovery, approval races, memory assertions, and allowed/forbidden trajectories with no API keys. A browser-project job runs against the synthetic portal. The KVM lane executes guest isolation/resource/egress checks on a controlled runner with no production secrets; unavailable virtualization is `BLOCKED`, not `PASS`. Paid-provider smoke tests require explicit environment setup and spending limits, never secrets exposed to forked PRs. Before a wave is published, every executable snippet advertised by that wave must be covered by one of these jobs or carry an explicit unverified label; the core project milestone cannot pass with its required job unverified.

## Implementation waves and acceptance

| Wave | Deliverable | Exit criterion |
|---|---|---|
| 0: baseline repair | Fix confirmed existing teaching defects; preserve factual/editorial distinction; resolve audit blockers | Paired examples agree, changed questions test the misconception, all affected content checks pass |
| 1: vertical pilot | Three paired lessons: 14.2, 15.4, 16.2; minimal project fixtures; prerequisite bridge drafts | A novice can follow the worked case, run the positive case, and explain the negative case; pilot learner feedback recorded |
| 2: durable and safe foundation | Complete 14–17 with protocol and isolation tests | Crash recovery, capability denial, raw-MCP interoperability and sandbox controls demonstrated |
| 3: practical single agent | Complete 18–21 | GUI CSV, memory compression, simulated 3-day approval, and three-attempt escalation all pass with failures injected |
| 4: coordination and evaluation | Complete 22–24; 100-case suite | Single/multi-agent comparison, calibrated graders, valid alternative paths, and policy-preserving fallback |
| 5: capstone and editorial integration | Track 25, all forward links, bilingual assessments, navigation, docs | Reproducible private/public-ready portfolio, all lesson acceptance rows complete, no unresolved critical factual/security claims |

The pilot may be reviewed as draft material before its prerequisites are published; never publish it with unresolved prerequisite IDs. Publish only complete, graph-valid waves in both languages.

Planning estimate, not a delivery promise: 2–4 author/reviewer days per paired, technically verified lesson gives 120–240 days for 60 pairs; shared project infrastructure, visuals, integrated QA and novice testing may add 30–60 days. Total **150–300 person-days** is a sizing envelope. Calibrate after the three-lesson pilot. Learner effort estimate: roughly 1–2 hours per lesson including local exercises plus 20–40 hours for the integrated capstone, or **80–160 hours** for the extension; validate with learners rather than derive practice time from word count.

## Definition of done

For each lesson pair: a new term map, worked case, preserved assumptions, primary-source claim ledger, meaningful teach-back, plausible quiz distractors, exact prerequisite IDs, bilingual semantic check, runnable or explicitly conceptual exercise, expected success, meaningful failure test, and documented limits. Code snippets claimed executable run against the pinned environment. Hardware/cloud claims retain vendor/measurement labels.

For each project milestone: clean environment setup; deterministic positive and negative tests; restart/replay where relevant; no real credentials/data; bounded resources; cleanup by exact owned path/resource; trace redaction; a reproducible result artifact. A simulator/fixture pass is not relabeled a real-service integration pass.

For the complete capstone, all critical safety invariants must pass; ordinary task performance is measured, not set to an invented universal percentage. Required artifacts: architecture diagram, state-transition table, threat model, version/fixture manifest, 100-case results with split and repeated-trial methodology, cost/latency report, three failure postmortems, and ADR comparing a simpler baseline. Passing quizzes alone is insufficient.

Applied mastery additionally requires fresh-model execution of at least ten stratified held-out scenarios with three trials each, using only synthetic data and inert or learner-controlled side effects. Include ordinary completion, tool failure, injection, memory loss, approval, cancellation, and recovery cases. Report all 30 outcomes, uncertainty and costs; this small sample is a teaching check, not a production reliability estimate. Each mandatory capability needs a demonstrated successful case and every observed safety violation blocks the project verdict. Keep four statuses separate: `source-reviewed`, `fixture-tested`, `live-model-tested`, and `environment/integration-tested`. The full 100-case deterministic suite, real microVM milestone, and live-model evidence are distinct requirements; none substitutes for another.

Site gates after each meaningful integrated change: `pnpm content:parity`, `content:stubs`, `content:graph`, `content:citations`, `content:assets`, `content:figures`, `typecheck`, `lint`, affected tests, then one coordinated `pnpm build`, full `pnpm test`, `pnpm budget`, `pnpm a11y:contrast`, `pnpm privacy`, and `pnpm render:check`. Verify desktop/mobile, both locales/editions, keyboard operation, reduced motion, no-JS defaults, 3D from multiple angles, and animation playback where changed. Audit new dependencies. Run the repository's security gate on the exact deployment candidate before any staging deployment; production still requires authorization. Live verification remains separate from local gates.

## Maintenance and the five-years-later review

The durable value is state, evidence, boundaries, evaluation and failure handling. Framework names, model endpoints, prices and protocol revisions will age. Keep conceptual lessons independent of vendor syntax; maintain a per-track pin/source manifest and a last-tested date for executable integrations. Quarterly, check broken references, protocol/security changes, deprecations and project fixtures; review immediately after a relevant advisory. Never silently rewrite historical benchmark results with a new price or model.

Independent acceptance: a fresh Astra adversarial review requested four bounded revisions—supported microVM target, live-model evidence, Python CI and the quiz-repair policy. All four were incorporated and the focused re-review approved them. This is approval of the plan's corrections, not proof that future exercises, deployments or educational outcomes work.

Pre-mortem: the likeliest failure is a large catalog of attractive prose whose external exercises no longer run. Counter it with the vertical pilot, a small shared project, locked dependencies, executable examples and limited supported platforms. The next likeliest failure is learners passing easy quizzes without operating a system; counter it with changed-scenario demonstrations and the capstone rubric. If maintenance cannot support all integrations, preserve the mechanisms and retire an outdated vendor walkthrough explicitly, with an equivalent tested exercise, rather than claiming current support.

## Primary-source reading map

URLs were consulted during planning; exact release pins and runnable snippets are implementation acceptance work, not established by browsing a `latest` page.

| Topic | Primary reference and use |
|---|---|
| Architecture | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents): complexity selection |
| State | [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence): durable versus in-memory state |
| Durable approvals | [Temporal message passing](https://docs.temporal.io/encyclopedia/workflow-message-passing): wait/resume concepts |
| MCP | [Specification](https://modelcontextprotocol.io/specification/latest) and [security practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices): protocol and authorization boundaries |
| Schemas | [Pydantic strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/): validation behavior |
| Browser automation | [Playwright locators](https://playwright.dev/docs/locators): semantic targeting |
| Isolation | [gVisor architecture](https://gvisor.dev/docs/architecture_guide/intro/) and [E2B network controls](https://docs.e2b.dev/network/internet-access): distinct mechanisms and actual egress behavior |
| Agent interoperability | [A2A specification](https://a2a-protocol.org/latest/specification/): versioned interoperability contract |
| Callback authenticity | [Slack request verification](https://api.slack.com/authentication/verifying-requests-from-slack): adapter security |
| Evaluation | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): outcomes, traces, graders, repeated trials |

Additional primary references located during research: [Set-of-Mark paper](https://arxiv.org/abs/2310.11441), [JSON-RPC 2.0](https://www.jsonrpc.org/specification), [WebContainers introduction](https://webcontainers.io/guides/introduction), and [PostgreSQL row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html). These support the reading map; search excerpts are not a completed implementation review. Before authoring, read their full relevant contracts and the selected Puppeteer, OAuth and Teams documentation. Inspect and test all version-specific examples against pinned releases.
