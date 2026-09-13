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
  return answer.split(INLINE_MATH).filter((part) => part.length > 0).map((part): ModelAnswerPart => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return {
        kind: 'math',
        html: renderToString(part.slice(1, -1), {
          output: 'mathml',
          strict: 'ignore',
          throwOnError: false,
          trust: false,
        }),
      }
    }
    return { kind: 'text', value: part }
  })
}
