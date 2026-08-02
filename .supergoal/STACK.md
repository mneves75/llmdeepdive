# STACK — verified decisions (2026-08-02)

Every version here was confirmed against `npm view` or primary docs today. Supersedes the
initial assumptions in THINKING.md.

## Framework

| Choice | Version | Note |
|---|---|---|
| Astro | **7.1.6** | *Not* 5.x as first assumed. Requires Node ≥ 22.12 (have 26.5.0). Bundles Vite 8, Zod 4, Shiki 4. |
| `@astrojs/cloudflare` | **not used** | Adapter is only for on-demand rendering. Static output + `dist/` as the assets directory is correct and strictly faster. |
| `@astrojs/mdx` | 7.0.5 | Pulls `@astrojs/markdown-remark` as a hard dep regardless of processor — build-time only, zero shipped bytes. |
| Tailwind | **4.3.3 via `@tailwindcss/vite`** | `@astrojs/tailwind` is dead: its peer range stops at Astro 5 / Tailwind 3 and it hasn't shipped since 2025-09-18. |
| Three.js | **0.185.1**, `WebGLRenderer` via bare `'three'` | *Not* `three/webgpu`: 425 KB gzip vs 130 KB — 3.3× larger, and WebGPURenderer is still self-described as experimental. Addons imported individually from `three/addons/…`, never the barrel (defeats tree-shaking). |
| Search | **Pagefind 1.5.2** + `astro-pagefind` 2.0.1 | Post-processes `dist/`. Per-language indexes keyed off `<html lang>` automatically. Fetched on first keystroke — zero bytes on initial load, zero Worker invocations. |

### ⚠ Open decision that blocks content: Sätteri vs unified

Astro 7 changed the default Markdown processor to **Sätteri**; `@astrojs/markdown-remark` is no
longer installed by default. Opting back in is one config line:

```js
import { unified } from '@astrojs/markdown-remark'
export default defineConfig({ markdown: { processor: unified() } })
```

This course needs KaTeX math, autolinked headings, and callout/admonition syntax across ~218
lesson files. **Whether equivalent Sätteri plugins exist is unverified** — it is the single
highest-impact unknown in the whole plan, because porting after the content is written is
per-plugin, per-file work.

**Resolution: Phase 1 must spike both pipelines against one real lesson containing math, a
callout, a code block and a heading anchor, then record the decision in an ADR.** Content
phases are blocked until that ADR exists. Default if the spike is inconclusive: `unified()`,
the known-good path.

## Cloudflare

**One Worker, assets-first routing.** The decisive perf fact: static assets are matched
*before* the Worker by default, so with `run_worker_first` scoped to `/api/*`, an HTML request
**never starts an isolate**. Nothing written in the Worker can affect HTML TTFB.

```jsonc
"assets": {
  "directory": "./dist",
  "binding": "ASSETS",
  "html_handling": "auto-trailing-slash",
  "not_found_handling": "404-page",
  "run_worker_first": ["/api/*"]   // array form — NOT `true`
}
```

`run_worker_first: true` would invoke the Worker for every CSS/JS/font request — billable and
slower. The array form is the whole performance argument for this architecture.

Static asset requests are **free and unlimited** and are not billed as Worker requests. Limits
(20k files/version free, 25 MiB/file) are nowhere near binding for ~218 lessons.

### Caching

Cloudflare sets `public, max-age=0, must-revalidate` on static assets automatically — right for
HTML, wrong for hashed bundles. `_headers` **is** supported for Workers Static Assets, but only
applies to assets, never to Worker-generated responses (so `/api/*` sets its own headers).

Header rules **append** rather than override, so a sub-path must explicitly clear the inherited
value with `! Cache-Control` before setting its own.

```
/_astro/*
  ! Cache-Control
  Cache-Control: public, max-age=31556952, immutable
```

**Smart Placement: leave unset.** Static assets always serve from the nearest location, so it
cannot help page loads. Worse, it carries a trap for this exact shape: assets fetched through
the `ASSETS` binding serve from where the *Worker* runs, so a smart-placed Worker would serve
HTML from a distant datacenter.

**Workers Cache flag: leave off.** Assets are already free and edge-cached by a separate
mechanism; the flag would only cache `/api/*` JSON. Set explicit `Cache-Control` on genuinely
anonymous API responses instead.

## D1

- Reads use the **Sessions API** — `env.DB.withSession('first-unconstrained')`. Enabling read
  replication in the dashboard alone changes nothing; without a session every query still hits
  the primary.
- Always prepared statements with `.bind()`. `.batch()` for anything that would otherwise be
  two sequential awaits — it is one round trip *and* a transaction.
- Composite index on `(locale, slug)`. Verify with `EXPLAIN QUERY PLAN`, which must show
  `USING INDEX`. Log `meta.rows_read` and `meta.duration` — the only real perf signal.
- Cloudflare's published guideline is **< 1 ms SQL duration** for an indexed SELECT, but that
  is execution time only; end-to-end is dominated by distance to the primary. No credible
  end-to-end figure is published — measure, don't assume.
- D1 is single-threaded per database; throughput ≈ 1/query-duration.

### FTS5 is excluded from the main database — new, decisive reason

Beyond the latency argument, **D1 export does not support virtual tables**. Adding one FTS5
table means every automated D1→R2 backup either fails or needs a drop-and-recreate dance around
an export that blocks other requests. That breaks the house backup rule outright.

If server-side search is ever genuinely needed, it goes in a **separate D1 database**, so the
export limitation stays contained.

## i18n

```js
i18n: {
  locales: ['en', 'pt-br'],
  defaultLocale: 'en',
  routing: { prefixDefaultLocale: false },   // EN at /, pt-BR at /pt-br/
  // fallback intentionally NOT configured — see below
}
```

**Deliberately no `fallback`.** Astro's `fallbackType: 'rewrite'` would silently render English
at a pt-BR URL when a translation is missing. That is exactly the failure the parity gate
exists to catch — it would turn a loud build error into an invisible quality regression.
A missing translation must fail the build.

This revises the earlier `/en` + `/pt` plan: EN is unprefixed for clean canonical URLs, pt-BR
lives under `/pt-br/`. Both remain first-class; only the URL shape differs.

## Astro 7 breaking changes that affect authoring

- **Rust compiler is stricter**: unclosed tags are now errors, and semantically invalid HTML
  (e.g. a `<div>` inside a `<p>`) is passed through rather than auto-corrected. Hand-authored
  MDX is exactly where this hides — the build is now the linter.
- **`compressHTML` defaults to `'jsx'`**, stripping whitespace between inline elements. Can
  change rendered prose spacing.
- **`src/fetch.ts` is a reserved filename.** Do not use it.
- `astro/zod` is **Zod 4** — schema idioms differ from Zod 3.

## Carried-over unknowns

1. Sätteri plugin ecosystem (math, heading anchors, callouts, Mermaid) — **blocks content**,
   resolved by the Phase 1 spike.
2. Shiki configuration surface under Sätteri.
3. Exact per-page WebGL context cap — no primary source found. Irrelevant to the design, since
   the rule is "one shared context, dispose offscreen" regardless.
4. End-to-end D1 latency from a Worker — measure via `meta.duration` once deployed.
