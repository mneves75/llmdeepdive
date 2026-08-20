# Product

> Product facts below are inferred from the repository and current public copy,
> pending direct user confirmation. No visual decisions belong in this file.

## Platform

web

## Users

Independent English- and Brazilian Portuguese-speaking learners who want to
understand large language models from first principles. The course must work for
curious beginners while continuing far enough for technical practitioners who
want mathematical, implementation, training, inference, and frontier-systems
depth. Learners study asynchronously on their own devices and need clear
wayfinding through a long, cumulative curriculum.

## Product Purpose

llmdeepdive is a free, open-source, bilingual course that makes the mechanisms
behind modern language models understandable and testable. Success means a
learner can move from intuition to the underlying mechanism, compute or inspect
it in a practical lab, explain it back in their own words, and answer a quiz
correctly before treating the lesson as complete.

## Positioning

The course does not stop at analogy and does not hide uncertainty. It combines
a Feynman-style concept → analogy → lab → teach-back → quiz loop with primary
citations, real calculations, explicit caveats where public numbers do not
reconcile, and an interactive transformer anatomy that doubles as course
wayfinding.

## Operating Context

Learners enter through the home page, browse ordered tracks, inspect the
transformer signal observatory through selectable components and evidence
lenses, search across the bilingual corpus, read long-form lessons, complete
local teach-backs and quizzes, and continue through previous/next lesson
navigation. Progress and learner-written prose remain on the device.
The interface supports light, dark, and operating-system themes.

## Capabilities and Constraints

- 106 current lessons in each of English and pt-BR across ten ordered tracks,
- two interactive labs (memory budget, cost per token) that server-render their
  defaults and stay usable without JavaScript,
  with parity enforced at build time.
- Static, byte-identical HTML for every visitor, served from Cloudflare Workers
  Static Assets; HTML must never become personalised.
- Progress is stored on the device and nowhere else. There is no account, no
  server and no database: teach-back prose and quiz results cannot leave the
  browser because there is nothing to send them to.
- Search uses Pagefind and loads on demand. Three.js is lazy, guarded by WebGL
  support, and must never enter the critical rendering path.
- Every translated route must remain available without fallback substitution.
- Existing content, URLs, semantics, canonical metadata, accessibility, privacy,
  performance budgets, and lesson-completion behavior are product contracts.

## Brand Commitments

The durable name is `llmdeepdive`. The voice is rigorous, plain-spoken,
curious, and honest about evidence and uncertainty. The product is free, open
source under MIT, bilingual, account-free, paywall-free, and tracking-free.

## Evidence on Hand

- The complete bilingual course corpus lives in `src/content/lessons/` and
  track metadata lives in `src/content/tracks/`.
- The real interactive anatomy implementation lives in
  `src/components/explorer/` and `src/lib/three/`.
- Product and technical claims are documented in `README.md`, `AGENTS.md`,
  `docs/adr/`, tests, content gates, and bundle/performance gates.
- There are no testimonials, customer logos, prices, enrolment counts, outcome
  statistics, or commercial claims available; future surfaces must not invent
  them.

## Product Principles

1. Understanding is demonstrated, not merely consumed.
2. Evidence and uncertainty stay visible together.
3. Depth remains approachable without flattening the underlying mechanism.
4. Bilingual parity and privacy are structural properties, not promises alone.
5. The interface helps learners orient themselves inside a large conceptual
   system without becoming the subject of attention.

## Accessibility & Inclusion

The experience must preserve semantic structure, keyboard operation, visible
focus, reduced-motion behavior, readable long-form measure, accessible contrast,
and equivalent access in English and Brazilian Portuguese across desktop and
mobile web.
