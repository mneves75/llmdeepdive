/**
 * Wraps every markdown table in a scrollable, keyboard-reachable container.
 *
 * Comparison tables are how tracks 8 and 9 put stacks and accelerators side by
 * side, and a table wide enough to be useful is wider than a 375px viewport.
 * Without a wrapper the page itself scrolls horizontally, which breaks the
 * layout contract; `overflow-x: auto` on the table element alone is not an
 * option either, since blockifying a <table> drops its column alignment.
 *
 * The wrapper carries tabindex="0" and a label so a keyboard or screen-reader
 * user can reach and scroll the overflowing region — an unlabelled scrollable
 * div is a known WCAG 2.1 failure (a scrollable region must be focusable).
 */
import { visit } from 'unist-util-visit'

const LABEL = { en: 'Table, scrollable', 'pt-br': 'Tabela, rolável' }

export function rehypeTableScroll() {
  return (tree, file) => {
    const path = String(file?.path ?? '')
    const locale = path.includes(`${'/'}pt-br${'/'}`) ? 'pt-br' : 'en'

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === null) return
      // Already wrapped on a previous pass.
      if (parent.type === 'element' && parent.properties?.className?.includes?.('table-scroll')) return

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          tabindex: '0',
          role: 'region',
          'aria-label': LABEL[locale],
        },
        children: [node],
      }
      // Skip re-visiting the table we just moved inside the new wrapper.
      return [visit.SKIP]
    })
  }
}
