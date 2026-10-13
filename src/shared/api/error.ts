import type { ErrorKind } from './types'

export const apiError = (kind: ErrorKind, message: string, status?: number, retryAfter?: number) =>
  Object.assign(new Error(message), { name: 'ApiError', kind, status, retryAfter })

export const isApiError = (error: unknown): error is ReturnType<typeof apiError> =>
  error instanceof Error && error.name === 'ApiError' && 'kind' in error

export const isAborted = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

export const getErrorMessage = (error: unknown) =>
  isApiError(error) ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.'

export const httpError = (status: number, retryAfter?: number) => {
  const messages: Record<number, string> = {
    400: 'GREEN-API отклонил запрос. Проверьте данные и настройки инстанса.',
    401: 'Не удалось подключиться. Проверьте ID инстанса и токен.',
    403: 'Доступ запрещён. Проверьте адрес API и реквизиты инстанса.',
    404: 'Инстанс или метод не найден. Проверьте адрес API и ID инстанса.',
    429: 'Слишком много запросов. Попробуйте немного позже.',
    466: 'Достигнут лимит тарифа GREEN-API.',
  }

  return apiError('http', messages[status] ?? 'GREEN-API временно недоступен.', status, retryAfter)
}
