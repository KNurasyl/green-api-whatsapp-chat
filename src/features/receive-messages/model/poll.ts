import { apiError } from '@/shared/api'
import { delay } from '@/shared/lib/delay'
import type { ChatEvent, Notification } from '../api/notification'
import { canRetry, retryDelay } from '../lib/retry'

type PollOptions = {
  signal: AbortSignal
  receive: () => Promise<Notification | null>
  acknowledge: (receiptId: number) => Promise<void>
  apply: (event: ChatEvent) => void
  afterEvent: (event: ChatEvent) => Promise<void>
  onConnection?: (status: 'connected' | 'reconnecting') => void
}

export const pollNotifications = async ({
  signal,
  receive,
  acknowledge,
  apply,
  afterEvent,
  onConnection,
}: PollOptions) => {
  let failures = 0
  while (!signal.aborted) {
    const started = Date.now()
    let notification: Notification | null
    try {
      notification = await receive()
      failures = 0
    } catch (error) {
      signal.throwIfAborted()
      if (!canRetry(error)) throw error
      onConnection?.('reconnecting')
      await delay(retryDelay(error, failures), signal)
      failures += 1
      continue
    }
    signal.throwIfAborted()
    onConnection?.('connected')
    if (notification) {
      apply(notification.event)
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await acknowledge(notification.receiptId)
          onConnection?.('connected')
          break
        } catch (error) {
          signal.throwIfAborted()
          if (!canRetry(error)) throw error
          if (attempt === 2) {
            throw apiError(
              'response',
              'Не удалось подтвердить уведомление. Получение приостановлено; переписка сохранена.',
            )
          }
          onConnection?.('reconnecting')
          await delay(retryDelay(error, attempt), signal)
        }
      }
      signal.throwIfAborted()
      await afterEvent(notification.event)
    }
    await delay(Math.max(0, 200 - (Date.now() - started)), signal)
  }
}
