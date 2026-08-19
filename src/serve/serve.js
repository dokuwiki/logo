#!/usr/bin/env node

/**
 * Serve the project directory on localhost, so the review pages can be opened
 * in a browser and driven by a headless one. Browsers block a page loading its
 * neighbours over file://, which is why this exists.
 *
 * Development only. It binds to the loopback address and never leaves the
 * project directory.
 */

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8731)

/**
 * What to send for each file extension.
 *
 * @type {Object<string, string>}
 */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
}

/**
 * Turn a request path into a file inside the project directory.
 *
 * @param {string} url Path from the request
 * @returns {string|null} The file to send, or null if it is not one we serve
 */
function fileFor(url) {
  const wanted = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const page = wanted === '/' ? '/src/serve/sizes.html' : wanted
  const path = resolve(ROOT, `.${normalize(page)}`)
  if (path !== ROOT && !path.startsWith(ROOT + sep)) return null
  try {
    return statSync(path).isFile() ? path : null
  } catch {
    return null
  }
}

createServer((request, response) => {
  const path = fileFor(request.url)
  if (!path) {
    response.writeHead(404, { 'content-type': 'text/plain' })
    response.end('not found\n')
    return
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(path).pipe(response)
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} at http://localhost:${PORT}/`)
})
