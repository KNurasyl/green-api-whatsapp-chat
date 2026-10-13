import type { GreenConfig } from './env.ts'
import { httpError, isHttpError } from './http.ts'
import { readResponse } from './response.ts'
import type { Route } from './routes.ts'

type GreenRequest = {
  config: GreenConfig
  route: Route
  body?: Record<string, string>
  signal: AbortSignal
}

type GreenResponse = {
  status: number
  data: unknown
  retryAfter: string | null
}

export const requestGreenApi = async ({
  config,
  route,
  body,
  signal,
}: GreenRequest): Promise<GreenResponse> => {
  const { apiUrl, idInstance, apiTokenInstance } = config
  const url = new URL(`${apiUrl}/waInstance${idInstance}/${route.name}/${apiTokenInstance}`)
  const timeout = AbortSignal.timeout(route.name === 'receiveNotification' ? 40_000 : 15_000)

  if (route.receiptId) url.pathname += `/${route.receiptId}`

  if (route.name === 'receiveNotification') url.searchParams.set('receiveTimeout', '30')

  try {
    const response = await fetch(url, {
      method: route.method,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.any([signal, timeout]),
    })

    if (!response.ok) {
      await response.body?.cancel()

      return {
        status: response.status,
        data: null,
        retryAfter: response.headers.get('Retry-After'),
      }
    }

    const text = await response.text()

    if (!text.trim() && route.name === 'receiveNotification') {
      return { status: 200, data: null, retryAfter: null }
    }

    let data: unknown

    try {
      data = JSON.parse(text)
    } catch {
      throw httpError(502, 'GREEN-API вернул некорректный ответ.')
    }

    return { status: 200, data: readResponse(route.name, data), retryAfter: null }
  } catch (error) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    if (timeout.aborted) throw httpError(504, 'Время ожидания ответа GREEN-API истекло.')

    if (isHttpError(error)) throw error

    throw httpError(502, 'Не удалось связаться с GREEN-API.')
  }
}
