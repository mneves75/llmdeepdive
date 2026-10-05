// @ts-check
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import pagefind from 'astro-pagefind'
import { unified } from '@astrojs/markdown-remark'
import remarkMath from 'remark-math'
import remarkDirective from 'remark-directive'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { remarkCallouts } from './src/lib/markdown/callouts.mjs'
import { rehypeDropTexAnnotation } from './src/lib/markdown/math-annotation.mjs'
import { rehypeMathScroll } from './src/lib/markdown/math-scroll.mjs'
import { rehypeTableScroll } from './src/lib/markdown/tables.mjs'
import { lastmodByPath } from './scripts/sitemap-lastmod.mjs'

export const SITE = 'https://llmdeepdive.com'
const LASTMOD = lastmodByPath()

export default defineConfig({
  site: SITE,
  // Static output. No @astrojs/cloudflare adapter: that adapter exists for
  // on-demand rendering. Serving `dist/` straight from Workers Static Assets
  // means an HTML request never starts an isolate. See AGENTS.md, Static-only architecture.
  output: 'static',
  trailingSlash: 'always',
  // Scope component CSS with a class (`.astro-xxxx`) rather than an attribute
  // (`[data-astro-cid-xxxx]`): identical specificity, ten fewer characters on
  // every scoped selector and element. It kept lesson routes under the 72 KB
  // render-blocking CSS budget (scripts/bundle-budget.mjs) after the 0.9 redesign.
  scopedStyleStrategy: 'class',
  build: {
    format: 'directory',
    // Every component stylesheet is linked, never inlined: each distinct inline
    // <style> costs ~110 characters of the 2,000-character CSP line (AGENTS.md
    // invariant 6), while a linked file costs nothing and is cached immutable.
    inlineStylesheets: 'never',
  },

  i18n: {
    locales: ['en', 'pt-br'],
    defaultLocale: 'en',
    routing: {
      // EN unprefixed at /, pt-BR at /pt-br/.
      prefixDefaultLocale: false,
    },
    // `fallback` is deliberately NOT set. Astro's fallbackType:'rewrite' would
    // silently serve English at a pt-BR URL when a translation is missing,
    // turning a loud build error into an invisible quality regression.
    // scripts/content-parity.mjs is the gate instead.
  },

  markdown: {
    // Pinned to the unified (remark/rehype) pipeline rather than Astro 7's new
    // Sätteri default. Evidence and rationale: docs/adr/0001.
    // Plugins go INSIDE unified({...}); the top-level `remarkPlugins` /
    // `rehypePlugins` keys are deprecated in Astro 7.
    processor: unified({
      remarkPlugins: [remarkMath, remarkDirective, remarkCallouts],
      rehypePlugins: [
        // MathML only, deliberately — NOT KaTeX's default `htmlAndMathml`.
        //
        // The default emits both a .katex-mathml tree and a .katex-html tree and
        // relies on katex.min.css to hide one of them. That stylesheet was never
        // imported here, so every formula on the site rendered TWICE: once as
        // raw MathML text and once as unstyled spans. `bytes ≈ 2LTH_kv DB`
        // appeared followed by `bytes ≈ 2 L T Hkv D B`, and inline `$L$` read as
        // "LL". 340 display blocks and 817 inline spans across 91 lessons.
        //
        // Importing katex.min.css would fix the duplication but costs ~23 KB of
        // render-blocking CSS (the per-route budget is 72 KB against ~67 KB
        // used in 0.9) plus its KaTeX font files, all on the critical path of
        // every lesson for something the browser already draws. MathML Core is
        // native in every current browser, needs no stylesheet and no font
        // download, and is what a screen reader wants to read anyway.
        [rehypeKatex, { output: 'mathml' }],
        rehypeDropTexAnnotation,
        rehypeMathScroll,
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: 'heading-anchor' } }],
        rehypeTableScroll,
      ],
    }),
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-default' },
      // Both themes as custom properties and no inline colour: prose.css picks
      // the edition with light-dark(), which an inline declaration would beat.
      defaultColor: false,
      wrap: false,
    },
  },

  integrations: [mdx(), sitemap({
    i18n: { defaultLocale: 'en', locales: { en: 'en', 'pt-br': 'pt-BR' } },
    serialize(item) {
      const lastmod = LASTMOD.get(new URL(item.url).pathname)
      return lastmod ? { ...item, lastmod } : item
    },
  }), pagefind({
    indexConfig: {
      // Index what a lesson teaches, not the page chrome around it. Without a
      // root, every excerpt began with the skip link ("…cachecontent Advanced")
      // and carried quiz answers and dates. (The TeX source of each formula
      // never reaches the HTML: math-annotation.mjs drops it.)
      rootSelector: 'main',
      excludeSelectors: [
        // Course-player chrome: navigation, progress, answers and status lines
        // are not teaching content and would leak into every excerpt.
        '[data-syllabus]',
        '[data-lesson-steps]',
        '[data-here-chart]',
        '[data-reading-minutes]',
        '[data-course-progress]',
        '[data-continue]',
        '.lesson-head__crumb',
        '.lesson-head__meta',
        '.prerequisites',
        '[data-teach-back]',
        '[data-lesson-quiz]',
        '.completion',
        '.lesson-nav',
        '.listing__minutes',
        '.listing__done',
        '.track__back',
        '.track__next',
      ],
    },
  })],

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Surfaces accidental fat chunks; the real gate is scripts/bundle-budget.mjs.
      chunkSizeWarningLimit: 200,
      // Processed component scripts are emitted as files, never inlined. Vite's
      // default (4 KB) inlined every small <script> as a distinct module block,
      // one CSP hash each; a file costs no hash and is cached immutable.
      assetsInlineLimit: 0,
    },
  },
})
