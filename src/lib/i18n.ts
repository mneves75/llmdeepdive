import { SITE } from './site'

export const LOCALES = ['en', 'pt-br'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** BCP-47 tag for the `lang` attribute and hreflang. */
export const bcp47: Record<Locale, string> = {
  en: 'en',
  'pt-br': 'pt-BR',
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Locale of a URL path. EN is unprefixed, pt-BR lives under /pt-br/.
 *
 * This exists so the same rule is not re-implemented per consumer: the remark
 * plugins sniff the *file* path and components sniff the *URL* path, and both
 * used to carry their own copy of the regex.
 */
export function localeFromPath(path: string): Locale {
  return path.startsWith('/pt-br/') || path === '/pt-br' ? 'pt-br' : DEFAULT_LOCALE
}

/**
 * Numbers inside prose are localised: pt-BR groups thousands with a period and
 * marks decimals with a comma (`262.144`, `1,5 MiB`). Notation inside `$…$` is
 * never localised, so this must not be used for math.
 *
 * Figure data is stored as a plain `number` and formatted here at render time —
 * a hand-written `262.144` in prose beside a bare `{n}` rendering `262144` in a
 * figure is a contradiction on the same page, and it has shipped before.
 */
export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale === 'pt-br' ? 'pt-BR' : 'en-US', options).format(value)
}

/**
 * Absolute URL for a locale-independent path.
 * EN is unprefixed (prefixDefaultLocale: false); pt-BR lives under /pt-br/.
 */
export function localeUrl(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return new URL(locale === DEFAULT_LOCALE ? clean : `/pt-br${clean}`, SITE).href
}

export function alternatesFor(path: string): Array<{ hreflang: string; href: string }> {
  return LOCALES.map((l) => ({ hreflang: bcp47[l], href: localeUrl(l, path) }))
}

/** Tier names, shared by every surface that labels a track or lesson depth. */
export const tierLabels = {
  en: { foundations: 'Foundations', core: 'Core', advanced: 'Advanced', frontier: 'Frontier' },
  'pt-br': { foundations: 'Fundamentos', core: 'Essencial', advanced: 'Avançado', frontier: 'Fronteira' },
} as const satisfies Record<Locale, Record<string, string>>

/**
 * The short position of a lesson or track, taken from its id ("1.3-bpe-…" →
 * "1.3", "4-transformer" → "4"). Ids already carry the course numbering, so no
 * surface computes its own and three numbering schemes cannot drift apart.
 */
export function positionOf(id: string): string {
  return id.split('-')[0] ?? id
}

/** UI strings. Lesson content lives in MDX; this is chrome only. */
export const ui = {
  en: {
    theme: 'Theme',
    themeLight: 'Light',
    themeAuto: 'Auto',
    themeDark: 'Dark',
    themeSaveError: 'This browser could not save the theme; it applies to this page only.',
    explore: 'Explore',
    lessons: 'Lessons',
    tracks: 'Tracks',
    notes: 'Notes',
    search: 'Search',
  },
  'pt-br': {
    theme: 'Tema',
    themeLight: 'Claro',
    themeAuto: 'Auto',
    themeDark: 'Escuro',
    themeSaveError: 'Este navegador não conseguiu salvar o tema; ele vale só para esta página.',
    explore: 'Explorar',
    lessons: 'Aulas',
    tracks: 'Trilhas',
    notes: 'Anotações',
    search: 'Buscar',
  },
} as const satisfies Record<Locale, Record<string, string>>
