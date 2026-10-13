import { delay } from '@/shared/lib/delay'
import type { ChatEvent, Notification } from '../api/notification'

type PollOptions = {
  signal: AbortSignal
  receive: () => Promise<Notification | null>
  acknowledge: (receiptId: number) => Promise<void>
  apply: (event: ChatEvent) => void
  afterEvent: (event: ChatEvent) => Promise<void>
}

export const pollNotifications = async ({
  signal,
  receive,
  acknowledge,
  apply,
  afterEvent,
}: PollOptions) => {
  while (!signal.aborted) {
    const started = Date.now()
    const notification = await receive()
    signal.throwIfAborted()
    if (notification) {
      apply(notification.event)
      await acknowledge(notification.receiptId)
      signal.throwIfAborted()
      await afterEvent(notification.event)
    }
    await delay(Math.max(0, 200 - (Date.now() - started)), signal)
  }
}
