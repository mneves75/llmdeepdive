import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { rehypeMathScroll } from '../src/lib/markdown/math-scroll.mjs'

const formula = (display) => ({
  type: 'element',
  tagName: 'span',
  properties: { className: ['katex'] },
  children: [
    {
      type: 'element',
      tagName: 'math',
      properties: display ? { display: 'block' } : {},
      children: [],
    },
  ],
})

test('the real markdown pipeline makes display MathML a localised keyboard scroll region', async () => {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { output: 'mathml' }], rehypeMathScroll],
    syntaxHighlight: false,
    gfm: false,
    smartypants: false,
  })
  const markdown = 'Inline $x$.\n\n$$\n\\underbrace{24 \\times 256}_{\\text{GQA}} = 24 \\text{ KiB}\n$$'
  const english = await processor.render(markdown, {
    fileURL: new URL('file:///content/lessons/en/7/example.mdx'),
  })
  const portuguese = await processor.render(markdown, {
    fileURL: new URL('file:///content/lessons/pt-br/7/example.mdx'),
  })

  assert.match(
    english.code,
    /<span class="katex math-scroll" tabindex="0" role="region" aria-label="Mathematical formula, scrollable"><math[^>]+display="block">/u,
  )
  assert.match(portuguese.code, /aria-label="Fórmula matemática, rolável"/u)
  assert.match(english.code, /Inline <span class="katex"><math/u)
})

test('inline MathML stays inline and out of the keyboard tab order', () => {
  const inline = formula(false)
  rehypeMathScroll()(
    { type: 'root', children: [inline] },
    { path: '/content/lessons/en/7/example.mdx' },
  )

  assert.deepEqual(inline.properties, { className: ['katex'] })
})

test('the display-math transform is idempotent', () => {
  const display = formula(true)
  const transform = rehypeMathScroll()
  const tree = { type: 'root', children: [display] }

  transform(tree, { path: '/content/lessons/en/7/example.mdx' })
  transform(tree, { path: '/content/lessons/en/7/example.mdx' })

  assert.deepEqual(display.properties.className, ['katex', 'math-scroll'])
})
