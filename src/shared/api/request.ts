import { parseConnection } from './connection'
import { apiError, httpError, isApiError } from './error'
import type { Connection } from './types'

type RequestOptions = {
  signal?: AbortSignal
  method?: 'GET' | 'POST' | 'DELETE'
  body?: Record<string, unknown>
  timeout?: number
  query?: Record<string, string>
  suffix?: number
  allowEmpty?: boolean
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readRetryAfter = (value: string | null) => {
  if (!value) return undefined

  const seconds = Number(value)
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now()

  return Number.isFinite(delay) ? Math.max(0, delay) : undefined
}

export const request = async (
  input: Connection,
  method: string,
  options: RequestOptions = {},
): Promise<unknown> => {
  const connection = parseConnection(input)
  const controller = new AbortController()
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 15_000)
  const url = new URL(
    `${connection.apiUrl}/waInstance${connection.idInstance}/${method}/${connection.apiTokenInstance}`,
  )
  if (options.suffix !== undefined) url.pathname += `/${options.suffix}`
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value)

  try {
    signal.throwIfAborted()

    const response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
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
      'Не удалось связаться с GREEN-API. Проверьте подключение к интернету.',
    )
  } finally {
    clearTimeout(timeout)
  }
}
