# llmdeepdive, explained from the inside

Think of the site as two machines bolted together: a publishing system and a
learning instrument.

Astro is the publishing press. It reads bilingual lesson and track files from
`src/content/`, checks that English and pt-BR stay in lockstep, then prints 238
static pages. Those pages are deliberately identical for every visitor: no
account data or learner prose is baked into HTML. `src/pages/` chooses a route,
`src/layouts/` supplies the shared frame, and `src/components/` supplies the
interactive pieces.

The learning instrument runs inside the browser. Search downloads Pagefind only
when opened. Theme and lesson progress use local storage. A teach-back is like a
private notebook locked in the learner’s desk: the text never leaves the device.
The quiz stores only whether the answer set was correct. That split—static course
outside, private practice inside—is the most important ownership boundary.

## The visual map

`src/styles/tokens.css` is the legend for the whole atlas: chart paper, abyssal
navy, Survey Cyan, Sonar Yellow, Coral Red, and Kelp Green. `global.css` establishes
reading and focus behavior. `DESIGN.md` explains when each token earns its place.

The home page is a cross-section of the full curriculum. Track pages turn the
same idea into a continuous descent. Lesson pages narrow back to a readable
`70ch` column and add a depth rail, so a learner always knows where they are.
The Anatomy Explorer is the literal core sample: a server-rendered component
selector and evidence drawer wrapped around an optional Three.js Signal
Observatory.

## Why the explorer has two layers

WebGL is impressive but unreliable as a prerequisite. Some browsers expose no
GPU context; some fail a dynamic chunk; motion preferences vary. So the explorer
ships a real SVG poster, component facts, five analysis lenses, and keyboard-safe
controls in HTML first. Only when its canvas approaches the viewport and WebGL
passes detection does `src/lib/explorer-client.ts` import the Three.js stage.

One subtle bug came from measuring marker size while that canvas was still
hidden. A hidden canvas is zero pixels tall; pretending it was one pixel made a
32-pixel marker enormous enough to cover the whole specimen. The fix is pleasingly
strict: zero means “not measured,” so markers stay hidden until `ResizeObserver`
reports a real size. `tests/marker-scale.test.mjs` locks that rule down.

The mature specimen is still procedural rather than a heavy downloaded model.
The second-generation art direction is translated into native geometry at
runtime rather than shipped as an asset. A graphite frame holds smoked-glass
decks, ceramic token tiles and etched cyan signal paths around one amber FFN
core. Side routes make residual additions legible, particles trace input to
output, and a bilingual instrument key names each major layer. Every one of the
12 library components owns a numbered port; components such as the KV cache or
quantization isolate the physical mechanism they modify instead of pretending
to be separate slabs.
`tests/transformer-scene.test.mjs` locks that coverage and material hierarchy
down.

A later attempt to reconstruct the specimen *from* that reference image, scored
by silhouette overlap, is the most instructive failure in this repo. The score
refused to improve, and the reason was not the model: the reference is drawn as
a near-parallel column while the scoring harness rendered through a 35° lens, so
the render tapered with depth and the two could never agree. Three rounds of
real geometry edits chased a broken ruler. Worse, one of those edits added a
*third* residual bypass because the picture looked better with it — a decoder
block has exactly two, so an illustration briefly taught an architecture that
does not exist. And because every round was scored in a bespoke harness with its
own camera and no floor, nobody noticed that the re-proportioned model had grown
past the stage envelope and was sinking through the ground at `/explore/`.

Three rules came out of it. A concept render is intent, not a contract. When a
picture and the architecture disagree in a teaching product, the architecture
wins. And the thing you verify has to be the thing you ship: `envelope.ts` now
publishes the box the fixed camera and floor are tuned for, and a test fails if
the instrument outgrows it.

Browser QA also caught an accessibility trap in the annotation live region: a
list element was being replaced with raw text, producing invalid list markup.
The text equivalent now uses a neutral live-region container, and the rendered
HTML regression test prevents the old structure from returning.

## One model, all the way down

The course used to explain mechanisms in the abstract: *a* transformer, *a* KV
cache. It now explains all of them through one real, downloadable model,
Qwen3.8-27B, and the choice was not cosmetic. That model is interesting
precisely because it is *not* the textbook picture. Its 64 layers are arranged
as sixteen repeats of "three Gated DeltaNet layers, then one attention layer",
so only sixteen layers build a KV cache at all.

That single fact carries the spine of the whole course. At the model's native
262,144-token context, those sixteen attention layers hold about 16 GiB of cache
for a *single* conversation, while all forty-eight DeltaNet layers together hold
roughly 72 MiB — and that 72 MiB does not grow no matter how long the
conversation gets. Two orders of magnitude, in the opposite direction from
everyone's intuition, which says the forty-eight recurrent layers must be where
the memory went. The course walks you into that wrong guess deliberately, then
corrects it.

Two tracks were added past inference, because "how does it work" stops being the
interesting question once you have to run the thing. Track 8 covers the software
that serves it — PyTorch, Transformers, vLLM, SGLang, TensorRT-LLM, llama.cpp,
Ollama, MLX, Modular MAX — and ends in a bake-off. Track 9 covers the silicon
underneath, from NVIDIA and AMD to Apple, Qualcomm and Cerebras, and ends by
pricing the same workload three ways.

The discipline that made 210 documents agree with each other is worth copying: a
single fact sheet, verified against the model's own `config.json`, and a rule
that no lesson may state a number that is not on it. The model has no published
technical report, so the course never claims a training-token count, a data mix
or a knowledge cutoff — and says plainly that those are not public. Where a
number *is* derived, exactly one lesson owns the derivation: 7.2 owns the
KV arithmetic, 9.3 owns the memory budget, and everyone else cites them. That
rule exists because four writers working in parallel once produced three
different memory budgets for the same 80 GB card.

## Labs, and a gate that was lying by omission

The home page had advertised "Lab — real numbers, computed live" as one of the
five steps of a lesson since launch. The schema existed, the depth rail counted
a lab section, the no-JavaScript fallback copy existed — and not one lesson had
a lab. The product was promising something it did not ship.

Two now exist. Lesson 9.3 has a memory-budget calculator, and its defaults
reproduce the lesson's own worked example exactly, so the page cannot contradict
itself. Push the context to 262,144 and concurrent sequences fall from eleven to
one; switch the weights to 4-bit hoping to fix it and you only reach three,
because the cache — not the weights — is what binds. Lesson 9.10 has the cost
capstone, where the break-even between renting GPUs and paying per token moves
under your hands. Both render their answers on the server, so a reader with
JavaScript disabled gets a worked example rather than an apology.

Building them exposed something uncomfortable. The bundle-budget gate measured
only scripts loaded with `src`, and Astro inlines small ones straight into the
HTML — so every inline script on the site had been invisible to the budget it
was supposed to be governed by. Fixing it moved the worst route from 20.9 KB to
26.4 KB: the same pages, finally measured honestly. The same gate matched routes
by substring, and `lessons/x` sits inside `pt-br/lessons/x`, so each lab was
charged twice. A gate you have never watched fail is not a gate; both failure
modes were forced before the fix was trusted.

## Pitfalls worth remembering

- Do not personalize the generated HTML. All learner state belongs in the
  browser; there is no server-side learner state.
- Do not import Three.js eagerly. The static reading experience is the product;
  3D is enhancement.
- Do not let the two languages drift. The build intentionally fails instead of
  silently falling back to English.
- After switching branches, an old Astro dev server can serve stale scoped CSS.
  A fresh production build and preview is the trustworthy visual check.
- A correct `main` branch does not update Cloudflare by itself. Staging once
  kept serving an older explorer whose CTA still linked to `/lessons/`; verify
  the deployed version and click through to the lesson after every publish.
- CI is part of the artifact: actions and build tools are pinned, secrets are
  scanned across full history, and the generated CSP is checked against every
  inline script and style. A check mentioned only in prose protects nothing.
- Cartographic decoration must explain a relationship. If a contour, marker, or
  layer carries no information, remove it.
- A bare `$` before a digit is not a dollar sign to the Markdown pipeline. It
  opens an inline formula, and `$0.45 … $3.20` was quietly swallowed into
  garbled maths. Prices are written `USD 0.45`. Only the rendered HTML showed
  it; no gate did.
- Green gates prove format, not truth. Every content check passed while one
  lesson printed an equation that did not typecheck dimensionally and three
  lessons disagreed about the same GPU's memory. Facts need a reader with fresh
  context, not another script.
- A link checker cannot tell a dead link from a bot-block. Publisher DOIs return
  403 to scripts and open fine in a browser; re-check before "fixing" a citation.
- Never ship a control that cannot work. Both labs briefly had a
  no-JavaScript "Recompute" button, on prerendered pages that never read a query
  string — it would have reloaded the same numbers forever.

## External systems reference

The 2.8-trillion-parameter Kimi K3 example points to
[Colibrì](https://github.com/JustVugg/colibri), a separate pure-C inference
engine that streams routed experts from the model's native MXFP4 checkpoint.
The site does not bundle that engine or model. Treat its resource and throughput
figures as revision- and hardware-specific measurements, not timeless product
claims.
