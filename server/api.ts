import type { IncomingMessage, ServerResponse } from 'node:http'

import { type Environment, type GreenConfig, readCredentials, readEnv } from './env.ts'
import { requestGreenApi } from './greenApi.ts'
import { httpError, isHttpError, isRecord, readJson, sendJson } from './http.ts'
import { readBody, readRoute } from './routes.ts'
import { createSessions } from './sessions.ts'

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<boolean>

const checkClient = (request: IncomingMessage, env: Environment): void => {
  const host = request.headers.host ?? ''
  const origin = request.headers.origin

  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
  const allowed = env.APP_ORIGIN || (local ? `http://${host}` : '')

  if (!allowed || request.headers['x-chat-client'] !== 'web' || (origin && origin !== allowed)) {
    throw httpError(403, 'Запрос разрешён только из приложения.')
  }
}

export const createApi = (env: Environment): ApiHandler => {
  const sessions = createSessions()

  return async (request, response) => {
    if (!request.url?.startsWith('/api/')) return false

    const controller = new AbortController()
    const cancel = (): void => controller.abort()

    response.on('close', cancel)

    try {
      checkClient(request, env)

      const key = request.headers['x-chat-session']
      const sessionKey = typeof key === 'string' ? key : ''

      if (request.url === '/api/config' && request.method === 'GET') {
        let configured = false

        if (!env.APP_ORIGIN) {
          try {
            readEnv(env)
            configured = true
          } catch {
            configured = false
          }
        }

        sendJson(response, 200, { configured })

        return true
      }

      if (request.url === '/api/session' && request.method === 'POST') {
        const data = await readJson(request)

        if (!isRecord(data)) throw httpError(400, 'Укажите реквизиты подключения.')

        let config: GreenConfig

        try {
          if (data.useEnv && env.APP_ORIGIN) throw new Error('Недоступно')

          config = data.useEnv === true ? readEnv(env) : readCredentials(data)
        } catch {
          throw httpError(400, 'Проверьте реквизиты подключения.')
        }

        controller.signal.throwIfAborted()
        sendJson(response, 201, { key: sessions.create(config) })

        return true
      }

      if (request.url === '/api/session' && request.method === 'DELETE') {
        sessions.remove(sessionKey)
        sendJson(response, 200, { result: true })

        return true
      }

      const route = readRoute(request.url, request.method)
      const session = sessions.get(sessionKey)

      const body =
        route.method === 'POST' ? readBody(route.name, await readJson(request)) : undefined

      controller.signal.throwIfAborted()

      const result = await requestGreenApi({
        config: session.config,
        route,
        body,
        signal: AbortSignal.any([controller.signal, session.controller.signal]),
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
}
