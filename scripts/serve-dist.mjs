/**
 * Serves the built `dist/` tree on an ephemeral port, 404 page included, for
 * checks that drive real engines: `render:check` and `learning-state-check`.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { DIST_ROOT } from './content-utils.mjs'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm',
  '.pf_meta': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pf_fragment': 'application/octet-stream',
}

export function serveDist() {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname)
    let file = normalize(join(DIST_ROOT, path))
    if (!file.startsWith(DIST_ROOT + sep) && file !== DIST_ROOT) {
      response.writeHead(403).end()
      return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    const found = existsSync(file) && statSync(file).isFile()
    if (!found) file = join(DIST_ROOT, '404.html')
    response.writeHead(found ? 200 : 404, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}
