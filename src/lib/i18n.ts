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

/** UI strings. Lesson content lives in MDX; this is chrome only. */
export const ui = {
  en: {
    theme: 'Theme',
    themeLight: 'Light',
    themeAuto: 'Auto',
    themeDark: 'Dark',
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
    explore: 'Explorar',
    lessons: 'Aulas',
    tracks: 'Trilhas',
    notes: 'Anotações',
    search: 'Buscar',
  },
} as const satisfies Record<Locale, Record<string, string>>
