# THINKING — llmdeepdive.com

## Goals

Ship a free, bilingual (EN + pt-BR), visually distinctive interactive course that takes a
reader from "what is a language model" to frontier research topics, hosted entirely on
Cloudflare, where **every page's p95 server response is under 50 ms** and every feature is
browser-verified to work as designed.

## Confirmed decisions

| Decision | Value | Source |
|---|---|---|
| Domain | `llmdeepdive.com` | user correction; registered 2026-08-02 16:35 UTC via Cloudflare, NS `frida/nitin.ns.cloudflare.com` |
| Languages | EN + pt-BR, both first-class | user |
| Backend scope | Static + light dynamic (D1 progress, quizzes, search) | user |
| Monetization | Free and open, no paywall, no accounts required | user |
| Graphics | Interactive, Three.js | user |
| Host | Cloudflare Workers Static Assets + one Worker for `/api/*` + D1 | house pattern |
| Package manager | pnpm (repo rule) | `~/dev/CLAUDE.md` |

`llmdeepdive.online` is a separate parked Hostinger domain expiring 2026-08-04. Out of scope.

## The keystone architectural decision

**No HTML is ever personalized.** Every page is byte-identical for every visitor. Learner
progress lives in `localStorage` and is *optionally* mirrored to D1 under an anonymous,
client-generated token; it is hydrated client-side after paint and never affects the HTML.

This one constraint buys almost everything else:

- Every HTML response is `public, max-age=…` and fully edge-cacheable → sub-10 ms TTFB is
  physically achievable, which is what makes the 50 ms gate realistic rather than aspirational.
- The `Cache-Control` cookie-auth footgun from `CLOUDFLARE_BEST_PRACTICES_2026.md` §13.1
  cannot occur, because there is no session cookie and no per-user HTML.
- "Free and open" is enforced structurally, not by policy: there is nothing to gate.

Corollary rule for the build: **any change that makes an HTML response vary per visitor is a
design regression** and must be rejected in review, not optimized around.

## Constraints

1. **p95 < 50 ms per route.** Measured server-side (TTFB) over the deployed edge, not
   localhost, with a fixed iteration count and idle machine. Reported as p50/p95 with n.
2. **Three.js must never enter the critical path.** Twelve WebGL scenes total; all lazy,
   poster-first, single shared context, rAF paused offscreen. Client budget tracked
   separately from the server gate and reported honestly.
3. **Bilingual parity is a gate, not a goal.** A lesson that exists in EN but not pt-BR fails
   the content check. No machine-translated placeholder text ships.
4. **No paid API calls from the site.** Interactive demos use precomputed data or tiny
   in-browser models. Keeps it free, fast and abuse-proof.
5. **Wrangler and Vite run under Node, never Bun** (guidelines §2.1, anti-patterns §11).
6. **Soft delete only** (`deleted_at`), no `any` types, `pnpm` — repo core rules.

## Risks (top 3) & mitigations

**R1 — The 50 ms gate is measured wrong and gives a false green.**
This has bitten this codebase repeatedly: benchmark markers matching an RSC payload or a
global footer (memory: ai-arquetipo), `ITER=6` making the "p95" column actually the maximum
of 5 samples (Berlin), measuring `loadEventEnd` instead of content, and ±5% run-to-run noise
between *identical* builds on a loaded machine.
→ *Mitigation:* the bench harness is written and validated in Phase 1, before any
optimization work exists to flatter. It (a) asserts a **per-page unique content marker**, not
a shared layout string; (b) requires `ITER ≥ 16` and computes a real percentile; (c) records
machine load average alongside every run; (d) is proven to go RED against a deliberately
slowed route before it is trusted to go green. Treat any improvement under ~5% as noise.

**R2 — Content volume is the actual project.** ~104 lessons × 2 languages of genuinely deep
technical writing dwarfs the engineering. Underestimating it produces a beautiful shell with
three real lessons and 200 stubs.
→ *Mitigation:* content is split across three phases with **countable** acceptance criteria
(lesson count, word-count floor, citation count, EN/pt-BR parity, zero TODO markers). A
lesson is "done" only when both languages, its visual, and its quiz exist. Stub detection is
automated, so a partially-written track cannot be self-reported as complete.

**R3 — Twelve WebGL scenes quietly destroy the client experience** even while the server gate
stays green, because the gate only measures TTFB. Prior incident in this codebase: an
infinite `rAF` turned into 57 s of total blocking time.
→ *Mitigation:* a separate client budget with its own automated check — bundle size per
route, main-thread blocking time, and an explicit "no rAF running while offscreen or hidden"
assertion tested in a real browser. Poster-first rendering means a WebGL failure degrades to
a static image rather than a blank box.

## Non-obvious dependencies

- The bench harness (Phase 1) must exist **before** the performance campaign, and must be
  proven able to fail. A gate never seen red is not a gate.
- The i18n content schema (Phase 3) blocks all three content phases; getting the frontmatter
  contract wrong means rewriting ~200 files.
- The shared WebGL renderer harness (Phase 7) blocks every visualization; building
  visualizations first would produce twelve independent contexts to unpick later.
- D1 schema (Phase 9) is only needed by progress/quiz/search — deliberately *late*, so the
  static site is shippable and fast without it.
- Custom domain attachment can happen early (zone already on Cloudflare) and should, so
  every perf measurement runs against the real edge from Phase 1 onward.

## Lessons applied from memory

| Memory | Applied as |
|---|---|
| Berlin `ITER=6` p95 was really max-of-5 | bench requires `ITER ≥ 16`, real percentile |
| ai-arquetipo benchmark false-pass via RSC payload / global footer | per-page unique content marker assertion |
| "measure content, not `loadEventEnd`" | client metric is content paint, not load event |
| A/B of *identical* builds drifted ±5% (outlier 12.9%) | <5% deltas reported as noise, not wins |
| vestou infinite `rAF` → TBT 57 s | offscreen/hidden rAF pause is an asserted invariant |
| WebGL Lighthouse needs a visual gate | screenshot evidence required per visualization |
| Wrangler/Vite hang under Bun | all tooling invoked via `node …/wrangler.js` |
| Wrangler deploy exits 0 silently in non-TTY | deploys verified via `versions list` + live smoke |
| Named CF envs don't inherit bindings/vars | every `env.*` redeclares assets + bindings |
| D1 FTS5 contentless needs delete-trigger for idempotent reingest | baked into search migration if FTS5 is chosen |
| CF deploy "Success" precedes edge availability | smoke-poll the edge before asserting a deploy |

## Open assumptions (correctable at plan review)

1. **Astro 5** as the framework — matches sibling `MEUS_SITES` projects, static-first with
   islands, first-class i18n and MDX. *(Pending confirmation from the stack research pass.)*
2. **Dark-first visual identity** with a single accent — appropriate for a technical audience
   and it makes WebGL scenes sit naturally in the page. Light theme still supported.
3. EN is the authoring source; pt-BR translated from it.
4. Content is authored by this build (not supplied by the user).
5. Search is client-side static-index first (Pagefind-class), with D1 FTS5 only if the index
   size becomes a problem — the static path costs zero Worker latency.
6. Analytics is Cloudflare Web Analytics (cookieless) or none — no third-party trackers.

## Still outstanding

The user's shared Claude conversation (`claude.ai/share/72080e40-…`) is behind Cloudflare's
bot interstitial and was **not** read. The user opted to paste it. Until then, this plan is
derived from the prompt + house conventions; it must be reconciled with that conversation
before content phases begin.
