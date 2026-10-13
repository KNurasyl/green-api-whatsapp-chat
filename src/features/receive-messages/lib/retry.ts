import { isApiError } from '@/shared/api'

export const canRetry = (error: unknown): boolean =>
  isApiError(error) &&
  (error.kind === 'network' ||
    error.kind === 'timeout' ||
    error.status === 429 ||
    (error.status !== undefined && error.status >= 500))

export const retryDelay = (error: unknown, attempt: number): number => {
  const delay = Math.min(1000 * 2 ** Math.min(attempt, 4), 15_000)

  return isApiError(error) ? Math.max(delay, error.retryAfter ?? 0) : delay
}
