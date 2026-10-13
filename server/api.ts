import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { getIronSession } from 'iron-session'

import { type Environment, type GreenConfig, readCredentials, readEnv } from './env.ts'
import { requestGreenApi } from './greenApi.ts'
import { httpError, isHttpError, isRecord, readJson, sendJson } from './http.ts'
import { readBody, readRoute } from './routes.ts'
import { type SessionData, sessionOptions } from './sessions.ts'

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<boolean>

const checkClient = (request: IncomingMessage, env: Environment): void => {
  const host = request.headers.host ?? ''
  const origin = request.headers.origin

  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
  const hosts = [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean)
  const deployed = env.VERCEL && hosts.includes(host)
  let allowed = env.APP_ORIGIN ?? ''

  if (!allowed && deployed) allowed = `https://${host}`

  if (!allowed && local) allowed = `http://${host}`

  if (!allowed || request.headers['x-chat-client'] !== 'web' || (origin && origin !== allowed)) {
    throw httpError(403, 'Запрос разрешён только из приложения.')
  }
}

export const createApi = (env: Environment): ApiHandler => {
  const options = sessionOptions(env)

  return async (request, response) => {
    if (!request.url?.startsWith('/api/')) return false

    const controller = new AbortController()
    const cancel = (): void => controller.abort()

    response.on('close', cancel)
    request.on('error', cancel)

    try {
      checkClient(request, env)

      const key = request.headers['x-chat-session']
      const sessionKey = typeof key === 'string' ? key : ''

      if (request.url === '/api/config' && request.method === 'GET') {
        let configured = false

        if (!env.APP_ORIGIN && !env.VERCEL) {
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

      const session = await getIronSession<SessionData>(request, response, options)

      if (request.url === '/api/session' && request.method === 'POST') {
        const data = await readJson(request)

        if (!isRecord(data)) throw httpError(400, 'Укажите реквизиты подключения.')

        let config: GreenConfig

        try {
          if (data.useEnv && (env.APP_ORIGIN || env.VERCEL)) throw new Error('Недоступно')

          config = data.useEnv === true ? readEnv(env) : readCredentials(data)
        } catch {
          throw httpError(400, 'Проверьте реквизиты подключения.')
        }

        controller.signal.throwIfAborted()
        session.key = randomBytes(32).toString('base64url')
        session.config = config
        await session.save()
        sendJson(response, 201, { key: session.key })

        return true
      }

      if (request.url === '/api/session' && request.method === 'DELETE') {
        if (session.key && session.key !== sessionKey) throw httpError(401, 'Другая сессия.')

        session.destroy()
        sendJson(response, 200, { result: true })

        return true
      }

      const route = readRoute(request.url, request.method)

      if (!session.config || !session.key || session.key !== sessionKey) {
        throw httpError(401, 'Сессия завершена.')
      }

      const body =
        route.method === 'POST' ? readBody(route.name, await readJson(request)) : undefined

      controller.signal.throwIfAborted()

      const result = await requestGreenApi({
        config: session.config,
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
      request.off('error', cancel)
    }

    return true
  }
}
