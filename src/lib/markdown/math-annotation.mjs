/**
 * Drops the TeX source KaTeX attaches to every formula.
 *
 * KaTeX's MathML wraps each formula as `<semantics>` holding the rendered
 * tree plus an `<annotation encoding="application/x-tex">` with the source.
 * Browsers never render the annotation and screen readers read the MathML,
 * but search engines index it as page text: Google's snippet for lesson 4.3
 * read "d k \sqrt{d_k}". KaTeX has no option to omit it, so it is removed
 * here, after rehype-katex runs.
 */
import { visit } from 'unist-util-visit'

const isTexAnnotation = (node) => node.type === 'element' && node.tagName === 'annotation'

export function rehypeDropTexAnnotation() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'semantics') node.children = node.children.filter((child) => !isTexAnnotation(child))
    })
  }
}
