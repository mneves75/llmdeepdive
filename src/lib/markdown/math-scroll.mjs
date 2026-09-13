/**
 * Makes display maths a bounded, keyboard-reachable scroll region.
 *
 * rehype-katex's MathML-only output is a `.katex` span containing a
 * `<math display="block">`. MathML keeps the equation semantically intact, but
 * a long expression also keeps its intrinsic width and can widen the entire
 * lesson on a narrow viewport. The existing span is the right overflow owner;
 * this plugin gives it the class and semantics that CSS alone cannot add.
 */
import { visit } from 'unist-util-visit'

const LABEL = {
  en: 'Mathematical formula, scrollable',
  'pt-br': 'Fórmula matemática, rolável',
}

const classesOf = (node) => {
  const value = node.properties?.className
  if (Array.isArray(value)) return value.map(String)
  return typeof value === 'string' ? value.split(/\s+/u).filter(Boolean) : []
}

const hasDisplayMath = (node) =>
  node.children.some(
    (child) =>
      child.type === 'element' &&
      child.tagName === 'math' &&
      child.properties?.display === 'block',
  )

export function rehypeMathScroll() {
  return (tree, file) => {
    const path = String(file?.path ?? '')
    const locale = path.includes(`${'/'}pt-br${'/'}`) ? 'pt-br' : 'en'

    visit(tree, 'element', (node) => {
      const className = classesOf(node)
      if (!className.includes('katex') || !hasDisplayMath(node)) return

      node.properties = {
        ...node.properties,
        className: className.includes('math-scroll')
          ? className
          : [...className, 'math-scroll'],
        tabindex: '0',
        role: 'region',
        'aria-label': LABEL[locale],
      }
    })
  }
}
