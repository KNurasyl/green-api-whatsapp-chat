import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'

import { sendJson } from './http.ts'

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

export const serveStatic = async (
  request: IncomingMessage,
  response: ServerResponse,
  directory: string,
): Promise<void> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, null)

    return
  }

  try {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const path = decodeURIComponent(url.pathname)
    const root = resolve(directory)
    const file = resolve(root, path === '/' ? 'index.html' : `.${path}`)

    if (!file.startsWith(root + sep) || !contentTypes[extname(file)]) {
      sendJson(response, 404, null)

      return
    }

    const content = await readFile(file)

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    })
    response.end(request.method === 'HEAD' ? undefined : content)
  } catch {
    sendJson(response, 404, null)
  }
}
