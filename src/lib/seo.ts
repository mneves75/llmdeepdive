import { REPO, SITE } from './site'
import { bcp47, localePath, localeUrl, positionOf, tierLabels, ui, type Locale } from './i18n'
import type { Tier } from './content'
import type { LdNode } from './json-ld'

/**
 * Search and share metadata for every route: titles, social-card data and
 * JSON-LD. Pages and the card endpoint build from these same functions, and
 * `tests/seo.test.mjs` checks every announced card exists.
 */

export const BRAND = 'llmdeepdive'

/**
 * Roughly what fits a desktop result line (~600px) before Google truncates.
 * Lesson titles use it to decide whether the track is worth adding; every
 * other title is written to fit it.
 */
const TITLE_BUDGET = 60

export const brandTitle = (text: string): string => `${text} — ${BRAND}`

/**
 * "MLX" or "The KV cache" says nothing about where the lesson sits, so the
 * track name is added when the whole title still fits. A long title already
 * carries its subject, and appending the track would only push the brand past
 * the cut.
 */
export function lessonTitle({ lesson, track }: { lesson: string; track: string }): string {
  const withTrack = brandTitle(`${lesson} · ${track}`)
  return withTrack.length <= TITLE_BUDGET ? withTrack : brandTitle(lesson)
}

/** `/lessons/x/y/` → `lessons/x/y`; the root is `index`. One rule for both ends. */
export const ogSlug = (fullPath: string): string => fullPath.replace(/^\/|\/$/gu, '') || 'index'

export const ogImageUrl = (fullPath: string): string => new URL(`/og/${ogSlug(fullPath)}.png`, SITE).href

export const OG_IMAGE = { width: 1200, height: 630 } as const

// ── Social cards ────────────────────────────────────────────────────────────

export interface Card {
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
    homeHeadline: 'Como os LLMs realmente funcionam',
    tracksHeadline: 'Trilhas de aprendizagem',
    exploreHeadline: 'Anatomia de um LLM',
    exploreKicker: 'Explorador 3D interativo',
    track: (n: string) => `Trilha ${n}`,
    lesson: (n: string) => `Aula ${n}`,
    count: (tracks: number, lessons: number) => `${tracks} trilhas · ${lessons} aulas`,
    lessons: (n: number) => `${n} aulas`,
  },
} as const satisfies Record<Locale, unknown>

const card = (fields: Omit<Card, 'alt'>): Card => ({
  ...fields,
  alt: `${fields.headline} — ${fields.kicker}. ${BRAND}`,
})

interface CourseSize {
  tracks: number
  lessons: number
}

/** What a card needs from a lesson or track entry. */
interface CardSubject {
  id: string
  title: string
  tier: Tier
}

export function homeCard(locale: Locale, size: CourseSize): Card {
  const copy = cardCopy[locale]
  return card({ kicker: copy.count(size.tracks, size.lessons), headline: copy.homeHeadline, footer: ui[locale].tagline })
}

export function tracksCard(locale: Locale, size: CourseSize): Card {
  const copy = cardCopy[locale]
  return card({ kicker: copy.count(size.tracks, size.lessons), headline: copy.tracksHeadline, footer: ui[locale].tagline })
}

export function trackCard(locale: Locale, { track, lessons }: { track: CardSubject; lessons: number }): Card {
  const copy = cardCopy[locale]
  const kicker = `${copy.track(positionOf(track.id))} · ${copy.lessons(lessons)} · ${tierLabels[locale][track.tier]}`
  return card({ kicker, headline: track.title, footer: ui[locale].tagline, tier: track.tier })
}

export function lessonCard(locale: Locale, { lesson, track }: { lesson: CardSubject; track: CardSubject }): Card {
  const copy = cardCopy[locale]
  const kicker = `${copy.track(positionOf(track.id))} · ${copy.lesson(positionOf(lesson.id))} · ${tierLabels[locale][lesson.tier]}`
  return card({ kicker, headline: lesson.title, footer: track.title, tier: lesson.tier })
}

export function exploreCard(locale: Locale): Card {
  const copy = cardCopy[locale]
  return card({ kicker: copy.exploreKicker, headline: copy.exploreHeadline, footer: ui[locale].tagline })
}

// ── Structured data ─────────────────────────────────────────────────────────

const ORGANIZATION_ID = `${SITE}/#organization`
const WEBSITE_ID = `${SITE}/#website`
export const LOGO = { path: '/og/logo.png', size: 512 } as const

/**
 * How an Article names the site as author and publisher: Google "strongly
 * recommends" `@type` and `url` on the author itself, and the `@id` ties it to
 * the full node below.
 */
const organizationRef = { '@type': 'Organization', '@id': ORGANIZATION_ID, name: BRAND, url: `${SITE}/` } as const

/** On every page; the Article's author and publisher point at it by `@id`. */
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

/** `crumbs` are locale-independent paths; the site root is always the first step. */
export function breadcrumbNode(locale: Locale, crumbs: Array<{ name: string; path: string }>): LdNode {
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

/**
 * The lesson as an Article. There is deliberately no `datePublished` (the
 * corpus records only when a lesson was last updated, and an invented date
 * would be false) and no `image`: Google wants images "relevant to the article,
 * rather than logos or captions", which the social card is, and lessons carry
 * no raster figure. The card stays the page's `og:image`.
 */
export function articleNode(input: {
  locale: Locale
  /** Locale-independent path, e.g. `/lessons/4-transformer/4.3-…/`. */
  path: string
  title: string
  description: string
  modified: Date
  section: string
  tier: Tier
  citations?: Array<{ title: string; year: number; url: string }>
}): LdNode {
  const url = new URL(localePath(input.locale, input.path), SITE).href
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    dateModified: input.modified.toISOString(),
    inLanguage: bcp47[input.locale],
    articleSection: input.section,
    author: organizationRef,
    publisher: organizationRef,
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
