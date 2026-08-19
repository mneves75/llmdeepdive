/**
 * Turns remark-directive container syntax into semantic callout markup.
 *
 *   :::insight
 *   The one idea to take away.
 *   :::
 *
 * becomes an <aside class="callout callout--insight"> with a labelled heading,
 * so callouts are announced to screen readers rather than being anonymous
 * coloured boxes.
 *
 * The four kinds are deliberate and map to the course's register:
 *   note     — context worth knowing
 *   insight  — the load-bearing idea of the lesson
 *   warning  — a place learners commonly go wrong
 *   caveat   — an honest limitation of the claim being made
 */
import { visit } from 'unist-util-visit'

const KINDS = {
  note: { en: 'Note', 'pt-br': 'Nota' },
  insight: { en: 'Key idea', 'pt-br': 'Ideia central' },
  warning: { en: 'Watch out', 'pt-br': 'Atenção' },
  caveat: { en: 'Caveat', 'pt-br': 'Ressalva' },
}

export function remarkCallouts() {
  return (tree, file) => {
    // Locale is derived from the file path so a pt-BR lesson gets a pt-BR label.
    const path = String(file?.path ?? '')
    const locale = path.includes(`${'/'}pt-br${'/'}`) ? 'pt-br' : 'en'

    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return
      const kind = KINDS[node.name]
      if (!kind) return

      const label = kind[locale]
      node.data = node.data ?? {}
      node.data.hName = 'aside'
      node.data.hProperties = {
        className: ['callout', `callout--${node.name}`],
        role: 'note',
        'aria-label': label,
      }

      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: ['callout__label'] } },
        children: [{ type: 'text', value: label }],
      })
    })
  }
}
