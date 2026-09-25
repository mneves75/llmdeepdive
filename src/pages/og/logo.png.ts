import type { APIRoute } from 'astro'
import { renderLogo } from '~/lib/og-render'

/** The Organization logo named in every page's JSON-LD. */
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderLogo()), { headers: { 'Content-Type': 'image/png' } })
