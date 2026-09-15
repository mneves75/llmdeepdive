import { renderToString } from 'katex'

export type ModelAnswerPart =
  | { kind: 'text'; value: string }
  | { kind: 'math'; html: string }

const INLINE_MATH = /(\$[^$\n]+\$)/gu

/**
 * Render the small inline-math subset allowed in teach-back frontmatter.
 * Unpaired delimiters stay ordinary text, and only KaTeX output becomes HTML.
 */
export function renderModelAnswer(answer: string): ModelAnswerPart[] {
  // split() with a capturing group puts every delimited match at an odd index.
  // Testing the text for `$` instead would turn a lone `$` fragment of `$$` into
  // an empty formula.
  return answer.split(INLINE_MATH).flatMap((part, index): ModelAnswerPart[] => {
    if (part.length === 0) return []
    if (index % 2 === 0) return [{ kind: 'text', value: part }]
    return [{
      kind: 'math',
      // A broken formula fails the build, as it does in the Markdown pipeline,
      // instead of shipping KaTeX's red error span.
      html: renderToString(part.slice(1, -1), {
        output: 'mathml',
        strict: 'ignore',
        throwOnError: true,
        trust: false,
      }),
    }]
  })
}
