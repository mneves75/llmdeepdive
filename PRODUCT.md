# Product

<!-- impeccable:product-schema 1 -->

> Product facts below are inferred from the repository and current public copy.
> Visual decisions belong in `DESIGN.md`, not here.

## Platform

Web.

## Users and purpose

llmdeepdive serves independent English- and Brazilian Portuguese-speaking
learners who want to understand large language models from first principles.
It must remain approachable for curious beginners while reaching the
mathematical, implementation, training, inference, and systems depth useful to
technical practitioners.

Success means a learner can move from intuition to mechanism, inspect or
compute it in a practical lab, explain it in their own words, and answer a quiz
correctly before treating a lesson as complete.

## Positioning

The course does not stop at analogy and does not hide uncertainty. It combines
a concept → analogy → lab → teach-back → quiz loop with citations, real
calculations, and explicit caveats where public evidence does not reconcile.
The interactive transformer anatomy also acts as course wayfinding.

## Capabilities and constraints

- 158 lessons across eight ordered tracks, with English/pt-BR parity enforced
  at build time.
- Static, byte-identical course HTML served by Cloudflare Workers Static Assets.
- Immediate progress and teach-back prose stay local. Only constrained,
  anonymous progress signals may synchronize; prose never leaves the browser.
- Search uses Pagefind on demand. Three.js is lazy, WebGL-guarded, and outside
  the critical rendering path.
- Existing content, URLs, semantics, canonical metadata, accessibility,
  privacy, performance budgets, and completion behavior are product contracts.

## Brand commitments

The durable name is `llmdeepdive`. The voice is rigorous, plain-spoken,
curious, and honest about evidence. The product is free, open source under MIT,
bilingual, account-free, paywall-free, and tracking-free.

## Product principles

1. Understanding is demonstrated, not merely consumed.
2. Evidence and uncertainty remain visible together.
3. Depth stays approachable without flattening the mechanism.
4. Bilingual parity and privacy are structural properties.
5. The interface orients the learner without becoming the subject.

## Accessibility and inclusion

Preserve semantic structure, keyboard operation, visible focus, reduced-motion
behavior, readable long-form measure, accessible contrast, and equivalent
English and Brazilian Portuguese access on desktop and mobile.
