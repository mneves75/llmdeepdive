# Writing lessons

How lesson prose is written here, in both languages. AGENTS.md owns the
mechanical rules (numbers, notation, pins, figures, dates); this file owns the
voice. Read both before writing or revising a lesson.

## The reader

Write for a junior developer. They can read code, they know what an array, a
loop, a function and a hash map are, and they remember a little school
algebra. They have never studied machine learning, and they get lost the
moment a sentence leans on a word nobody has explained yet.

The course also serves practitioners, so explaining better never means
cutting the mechanism, the maths or the numbers. A lesson gets easier to
*follow*, never shallower. Research on worked examples backs both halves:
novices learn a procedure faster from a solved case than from the general
rule, and experts are slowed by explanation they no longer need. So the
general rule still follows the example, in full, under a heading an
experienced reader can jump to.

## The Feynman test

Before a passage ships, ask: could the reader explain this to a colleague
tomorrow, in their own words, without the page in front of them? When the
answer is no, one of these tools usually fixes it. They are tools, not a
template: use the ones the passage needs, and a lesson that already passes
keeps its prose.

- **Say why first.** Open with the question the lesson answers and why a
  developer would care, in plain words, before any notation.
- **Define a new term where it first appears.** "Softmax, a function that
  turns a list of scores into positive weights that add up to 1, ..." A term
  an earlier lesson defined gets a few words of reminder and a link to that
  lesson, not a second definition. Spell out an acronym on its first use in
  each lesson, unless that first use already links the lesson that defines it.
- **Concrete before abstract.** Show a small worked case with numbers, then
  the general formula. After a formula that is not self-evident, say what it
  does and when it holds, not each symbol in turn.
- **One claim per sentence, without cutting the reasoning.** Split a
  sentence that carries two separate claims. Keep "because" and "so"
  together when splitting would hide the cause.
- **One topic per paragraph,** opened by a sentence that says what the
  paragraph is about. A paragraph over about 150 words is usually two.
- **Use what the reader already knows** (arrays, lookups, caches, loops,
  sorting) when a mechanism really works like it, and say where the
  comparison stops. Systems ideas the reader may not know yet (batching,
  bandwidth, latency) get defined like any other term.
- **Headings follow the ideas.** In a long lesson, `##` headings name what
  each part answers, so readers can navigate and experts can skip ahead. The
  lesson's step list shows six at most. Never number them.
- **Keep caveats and conditions.** An assumption ("if the components are
  independent"), a limit or a caveat is part of the claim. Plainer wording
  keeps it.

## Words to avoid

- Expert shorthand nobody defined: "fails quietly", "load-bearing", "the
  regime", "falls out of", "for free", "trivially", "obviously", "simply".
- Hype and filler: "crucial", "powerful", "game-changing", "it is worth
  noting", "in essence".
- AI-sounding patterns: "it's not X, it's Y" reveals, "no X, no Y, no Z"
  lists, sentences that trail into one comma clause after another, and a
  closing recap that only repeats the lesson.
- "This" or "it" opening a sentence when the previous sentence held two
  candidates.

## What a rewrite keeps

A rewrite changes how a lesson explains, never what it claims.

- Every number, unit and model fact stays, and so does the lesson that owns
  it (AGENTS.md, "Content"). A new worked example uses small made-up numbers
  or points to the owning lesson; it never re-derives an owned number and
  never states a Qwen3.8-27B fact the model card does not.
- Every formula (`$…$`, `$$…$$`) stays byte for byte unless it is wrong, and
  a new formula appears identically in both locales.
- Every `<Figure id="…" />`, code block, link and lesson reference stays.
  Tracks 11–13 add no command or flag that was not read at the pinned tag.
  A lab lesson's worked numbers keep matching the lab's defaults.
- Frontmatter keeps `id`, `track`, `order`, `title`, `tier`,
  `prerequisites`, `unlocks`, `lab`, `citations`, and every quiz's `options`
  and `correctIndex`. The summary, analogy, teach-back, and quiz questions
  and explanations may be reworded. A summary never contains " — and " or
  " — e " (`tests/seo.test.mjs`).

A fact that looks wrong is reported with its primary source, not silently
rewritten. `updated` moves to the date of the commit that changes the lesson.

## Portuguese

pt-BR is written, not translated word by word: the same explanation, examples
and figures, in natural Brazilian Portuguese with correct accents. Field terms
stay in English (*embedding*, *attention*, *fine-tuning*) and get a short
Portuguese gloss at first use. Course structure uses the interface's words:
*trilha* and *aula*, never *track* or *lição* (`content:parity` fails both;
Sutton's essay keeps its Portuguese name, *a lição amarga*).
Numbers follow AGENTS.md: `262.144`, `1,5 MiB` in prose; notation is never
localised.
