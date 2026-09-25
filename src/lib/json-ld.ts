/** A JSON-LD node. Only Google-supported types are emitted; see AGENTS.md, Search metadata. */
export type LdNode = Record<string, unknown>

/**
 * One `@graph` per page, for a `<script type="application/ld+json">` element.
 *
 * Every `<` becomes the JSON escape `\u003c`, which parses back to the same
 * string, so no value (a lesson title, a citation) can close the element
 * (`</script>`) or open an HTML comment inside it (`<!--`). Kept free of
 * imports so a test can load it directly with hostile input.
 */
export function serializeJsonLd(nodes: LdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replaceAll('<', '\\u003c')
}
