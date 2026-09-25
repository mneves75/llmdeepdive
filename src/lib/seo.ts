import { REPO, SITE } from './site'
import { bcp47, localeUrl, positionOf, tierLabels, type Locale } from './i18n'
import type { Tier } from './content'

/**
 * Search and share metadata for every route: titles, social-card data and
 * JSON-LD. Pages and the card endpoint both build from here, so the image a
 * page announces and the image the endpoint draws cannot describe different
 * things.
 */

export const BRAND = 'llmdeepdive'

/**
 * Roughly what fits a desktop result line (~600px) before Google truncates.
 * A title may exceed it; the budget only decides whether optional context is
 * worth adding.
 */
const TITLE_BUDGET = 60

export const brandTitle = (text: string): string => `${text} — ${BRAND}`

/**
 * "MLX" or "The KV cache" says nothing about where the lesson sits, so the
 * track name is added when the whole title still fits. A long title already
 * carries its subject, and appending the track would only push the brand past
 * the cut.
 */
export function lessonTitle(lesson: string, track: string): string {
  const withTrack = brandTitle(`${lesson} · ${track}`)
  return withTrack.length <= TITLE_BUDGET ? withTrack : brandTitle(lesson)
}

/** `/lessons/x/y/` → `lessons/x/y`; the root is `index`. One rule for both ends. */
export const ogSlug = (fullPath: string): string => fullPath.replace(/^\/|\/$/gu, '') || 'index'

export const ogImageUrl = (fullPath: string): string => new URL(`/og/${ogSlug(fullPath)}.png`, SITE).href

export const OG_IMAGE = { width: 1200, height: 630 } as const

// ── Social cards ────────────────────────────────────────────────────────────

export interface Card {
  locale: Locale
  /** Where the page sits, e.g. "Track 7 · Lesson 7.2". */
  kicker: string
  headline: string
  footer: string
  /** Highlights one of the four strata; omitted for pages that span all. */
  tier?: Tier
  alt: string
}

const cardCopy = {
  en: {
    tagline: 'Free, bilingual, and open source.',
    homeHeadline: 'How LLMs actually work',
    tracksHeadline: 'Learning tracks',
    exploreHeadline: 'Anatomy of an LLM',
    exploreKicker: 'Interactive 3D explorer',
    track: (n: string) => `Track ${n}`,
    lesson: (n: string) => `Lesson ${n}`,
    count: (tracks: number, lessons: number) => `${tracks} tracks · ${lessons} lessons`,
    lessons: (n: number) => `${n} lessons`,
  },
  'pt-br': {
    tagline: 'Curso livre, bilíngue e de código aberto.',
    homeHeadline: 'Como os LLMs realmente funcionam',
    tracksHeadline: 'Trilhas de aprendizagem',
    exploreHeadline: 'Anatomia de um LLM',
    exploreKicker: 'Explorador 3D interativo',
    track: (n: string) => `Trilha ${n}`,
    lesson: (n: string) => `Aula ${n}`,
    count: (tracks: number, lessons: number) => `${tracks} trilhas · ${lessons} aulas`,
    lessons: (n: number) => `${n} aulas`,
  },
} as const

const card = (fields: Omit<Card, 'alt'>): Card => ({
  ...fields,
  alt: `${fields.headline} — ${fields.kicker}. ${BRAND}`,
})

interface CourseSize {
  tracks: number
  lessons: number
}

interface Named {
  id: string
  title: string
  tier: Tier
}

export function homeCard(locale: Locale, size: CourseSize): Card {
  const copy = cardCopy[locale]
  return card({ locale, kicker: copy.count(size.tracks, size.lessons), headline: copy.homeHeadline, footer: copy.tagline })
}

export function tracksCard(locale: Locale, size: CourseSize): Card {
  const copy = cardCopy[locale]
  return card({ locale, kicker: copy.count(size.tracks, size.lessons), headline: copy.tracksHeadline, footer: copy.tagline })
}

export function trackCard(locale: Locale, { track, lessons }: { track: Named; lessons: number }): Card {
  const copy = cardCopy[locale]
  const kicker = `${copy.track(positionOf(track.id))} · ${copy.lessons(lessons)} · ${tierLabels[locale][track.tier]}`
  return card({ locale, kicker, headline: track.title, footer: copy.tagline, tier: track.tier })
}

export function lessonCard(locale: Locale, { lesson, track }: { lesson: Named; track: Named }): Card {
  const copy = cardCopy[locale]
  const kicker = `${copy.track(positionOf(track.id))} · ${copy.lesson(positionOf(lesson.id))} · ${tierLabels[locale][lesson.tier]}`
  return card({ locale, kicker, headline: lesson.title, footer: track.title, tier: lesson.tier })
}

export function exploreCard(locale: Locale): Card {
  const copy = cardCopy[locale]
  return card({ locale, kicker: copy.exploreKicker, headline: copy.exploreHeadline, footer: copy.tagline })
}

// ── Structured data ─────────────────────────────────────────────────────────

/** A JSON-LD node. Only Google-supported types are emitted; see AGENTS.md. */
export type LdNode = Record<string, unknown>

const ORGANIZATION_ID = `${SITE}/#organization`
const WEBSITE_ID = `${SITE}/#website`
export const LOGO = { path: '/og/logo.png', size: 512 } as const

export const organizationNode: LdNode = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: BRAND,
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: new URL(LOGO.path, SITE).href, width: LOGO.size, height: LOGO.size },
  sameAs: [REPO],
}

/** Google reads the site name from WebSite markup on the domain's home page. */
export const websiteNode: LdNode = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: BRAND,
  alternateName: ['llmdeepdive.com'],
  url: `${SITE}/`,
  inLanguage: [bcp47.en, bcp47['pt-br']],
  publisher: { '@id': ORGANIZATION_ID },
}

export interface Crumb {
  name: string
  /** Locale-independent path, e.g. `/tracks/`. */
  path: string
}

export function breadcrumbNode(locale: Locale, crumbs: Crumb[]): LdNode {
  const trail = [{ name: BRAND, path: '/' }, ...crumbs]
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: localeUrl(locale, crumb.path),
    })),
  }
}

export interface ArticleInput {
  locale: Locale
  path: string
  title: string
  description: string
  modified: Date
  section: string
  tier: Tier
  citations?: Array<{ title: string; year: number; url: string }>
}

export function articleNode(input: ArticleInput): LdNode {
  const url = localeUrl(input.locale, input.path)
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    image: [ogImageUrl(new URL(url).pathname)],
    dateModified: input.modified.toISOString(),
    inLanguage: bcp47[input.locale],
    articleSection: input.section,
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    isAccessibleForFree: true,
    license: `${REPO}/blob/main/LICENSE`,
    learningResourceType: 'lesson',
    educationalLevel: tierLabels[input.locale][input.tier],
    ...(input.citations && {
      citation: input.citations.map((source) => ({
        '@type': 'CreativeWork',
        name: source.title,
        url: source.url,
        datePublished: String(source.year),
      })),
    }),
  }
}

/**
 * One `@graph` per page. `<` is escaped so no value — a lesson title, a
 * citation — can close the script element or open a comment inside it.
 */
export function serializeJsonLd(nodes: LdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replaceAll('<', '\\u003c')
}
