import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError } from '@/shared/api'
import { delay } from '@/shared/lib/delay'
import { canRetry, retryDelay } from '@/features/receive-messages/lib/retry'
import type { Notification } from '@/features/receive-messages/api/notification'
import { pollNotifications } from '@/features/receive-messages/model/poll'

afterEach(() => vi.useRealTimers())

describe('recovery', () => {
  it('retries only temporary failures and respects Retry-After', () => {
    expect(canRetry(apiError('http', '', 401))).toBe(false)
    expect(canRetry(apiError('response', ''))).toBe(false)
    expect(canRetry(apiError('http', '', 503))).toBe(true)
    expect([0, 1, 2, 3, 4, 10].map((attempt) => retryDelay(null, attempt))).toEqual([
      1000, 2000, 4000, 8000, 15000, 15000,
    ])
    expect(retryDelay(apiError('http', '', 429, 30_000), 0)).toBe(30_000)
  })

  it('cancels a waiting retry immediately', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const result = expect(delay(15_000, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    controller.abort()
    await result
    expect(vi.getTimerCount()).toBe(0)
  })

  it('backs off reads without creating a second receive loop', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const receive = vi
      .fn<() => Promise<Notification | null>>()
      .mockRejectedValueOnce(apiError('network', 'offline'))
      .mockRejectedValueOnce(apiError('http', '', 429, 3000))
      .mockImplementation(() => {
        controller.abort()
        return Promise.resolve(null)
      })
    const result = expect(
      pollNotifications({
        signal: controller.signal,
        receive,
        acknowledge: () => Promise.resolve(),
        apply: () => {},
        afterEvent: () => Promise.resolve(),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(999)
    expect(receive).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(receive).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2999)
    expect(receive).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await result
    expect(receive).toHaveBeenCalledTimes(3)
  })

  it('tries the same receipt three times before pausing', async () => {
    vi.useFakeTimers()
    const receive = vi
      .fn<() => Promise<Notification | null>>()
      .mockResolvedValue({ receiptId: 321, event: { type: 'skip' } })
    const acknowledge = vi
      .fn<(id: number) => Promise<void>>()
      .mockRejectedValue(apiError('network', 'offline'))
    const apply = vi.fn()
    const result = expect(
      pollNotifications({
        signal: new AbortController().signal,
        receive,
        acknowledge,
        apply,
        afterEvent: () => Promise.resolve(),
      }),
    ).rejects.toThrow('Получение приостановлено')
    await vi.advanceTimersByTimeAsync(3000)
    await result
    expect(receive).toHaveBeenCalledTimes(1)
    expect(acknowledge.mock.calls).toEqual([[321], [321], [321]])
    expect(apply).toHaveBeenCalledTimes(1)
  })
})
