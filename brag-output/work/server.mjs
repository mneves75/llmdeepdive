// One origin for the real build (/) and the video composition (/__brag/), so
// the composition can script the site's pages inside same-origin iframes.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const SITE = new URL('../../dist/', import.meta.url).pathname
const BRAG = new URL('./', import.meta.url).pathname
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.wasm': 'application/wasm', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' }

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const [root, rel] = path.startsWith('/__brag/') ? [BRAG, path.slice('/__brag/'.length)] : [SITE, path.slice(1)]
  let file = normalize(join(root, rel))
  if (!file.startsWith(root)) return res.writeHead(403).end()
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
  }
}).listen(4417, '127.0.0.1')
