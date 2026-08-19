import pkg from '../../package.json'

export const SITE = 'https://llmdeepdive.com'

export const REPO = 'https://github.com/mneves75/llmdeepdive'

// Read at build time from the single source of truth, so the footer can never
// claim a version the package does not have. Vite inlines the JSON during
// prerender; nothing about this reaches the browser beyond the literal string.
export const VERSION: string = pkg.version
