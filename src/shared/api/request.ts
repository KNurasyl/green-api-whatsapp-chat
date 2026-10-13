import { apiError, httpError, isApiError } from './error'
import type { ApiMethod } from './types'

type RequestOptions = {
  signal?: AbortSignal
  key?: string
  method?: 'GET' | 'POST' | 'DELETE'
  body?: Record<string, unknown>
  timeout?: number
  suffix?: number
  allowEmpty?: boolean
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined

  const seconds = Number(value)
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now()

  return Number.isFinite(delay) ? Math.max(0, delay) : undefined
}

export const request = async (
  method: ApiMethod,
  options: RequestOptions = {},
): Promise<unknown> => {
  const controller = new AbortController()
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 15_000)
  const suffix = options.suffix === undefined ? '' : `/${options.suffix}`
  const url = `/api/${method}${suffix}`

  try {
    signal.throwIfAborted()

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'X-Chat-Client': 'web',
        ...(options.key ? { 'X-Chat-Session': options.key } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
      if (response.status === 503) {
        const data: unknown = await response.json().catch(() => null)

        if (isRecord(data) && data.error === 'configuration') {
          throw apiError(
            'validation',
            'Настройте GREEN-API в серверном .env и перезапустите приложение.',
          )
        }
      }

      throw httpError(response.status, readRetryAfter(response.headers.get('Retry-After')))
    }

    const text = await response.text()

    signal.throwIfAborted()
    if (!text.trim() && options.allowEmpty) return null

    try {
      const data: unknown = JSON.parse(text)

      return data
    } catch {
      throw apiError('response', 'GREEN-API вернул некорректный ответ.')
    }
  } catch (error) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    if (controller.signal.aborted) throw apiError('timeout', 'Время ожидания ответа истекло.')

    if (isApiError(error)) throw error

    throw apiError(
      'network',
      'Не удалось связаться с сервером чата. Проверьте, запущено ли приложение.',
    )
  } finally {
    clearTimeout(timeout)
  }
}
