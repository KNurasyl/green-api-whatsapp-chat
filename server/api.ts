import type { IncomingMessage, ServerResponse } from 'node:http'

import { type Environment, type GreenConfig, readEnv } from './env.ts'
import { requestGreenApi } from './greenApi.ts'
import { httpError, isHttpError, readJson, sendJson } from './http.ts'
import { readBody, readRoute } from './routes.ts'

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<boolean>

const checkClient = (request: IncomingMessage): void => {
  const host = request.headers.host ?? ''
  const origin = request.headers.origin

  if (
    !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
    request.headers['x-chat-client'] !== 'web' ||
    (origin && origin !== `http://${host}`)
  ) {
    throw httpError(403, 'Запрос разрешён только из локального приложения.')
  }
}

export const createApi =
  (env: Environment): ApiHandler =>
  async (request, response) => {
    if (!request.url?.startsWith('/api/')) return false

    const controller = new AbortController()
    const cancel = (): void => controller.abort()

    response.on('close', cancel)

    try {
      checkClient(request)

      const route = readRoute(request.url, request.method)
      let config: GreenConfig

      try {
        config = readEnv(env)
      } catch {
        sendJson(response, 503, { error: 'configuration' })

        return true
      }

      const body =
        route.method === 'POST' ? readBody(route.name, await readJson(request)) : undefined

      controller.signal.throwIfAborted()

      const result = await requestGreenApi({
        config,
        route,
        body,
        signal: controller.signal,
      })

      if (result.retryAfter) response.setHeader('Retry-After', result.retryAfter)

      sendJson(response, result.status, result.data)
    } catch (error) {
      if (!controller.signal.aborted) {
        const status = isHttpError(error) ? error.status : 500

        sendJson(response, status, { error: 'request' })
      }
    } finally {
      response.off('close', cancel)
    }

    return true
  }
