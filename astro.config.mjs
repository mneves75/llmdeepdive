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
import { rehypeTableScroll } from './src/lib/markdown/tables.mjs'

export const SITE = 'https://llmdeepdive.com'

export default defineConfig({
  site: SITE,
  // Static output. No @astrojs/cloudflare adapter: that adapter exists for
  // on-demand rendering. Serving `dist/` straight from Workers Static Assets
  // means an HTML request never starts an isolate. See docs/adr/0002.
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },

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
        // render-blocking CSS (the per-route budget is 72 KB against 58.9 KB
        // used) plus its self-hosted font files — and the design system's
        // zero-network-font rule exists precisely to avoid that. MathML Core is
        // native in every current browser, needs no stylesheet and no font
        // download, and is what a screen reader wants to read anyway.
        [rehypeKatex, { output: 'mathml' }],
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: 'heading-anchor' } }],
        rehypeTableScroll,
      ],
    }),
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },

  integrations: [mdx(), sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', 'pt-br': 'pt-BR' } } }), pagefind()],

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Surfaces accidental fat chunks; the real gate is scripts/bundle-budget.mjs.
      chunkSizeWarningLimit: 200,
    },
  },
})
