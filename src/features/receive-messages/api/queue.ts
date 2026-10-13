import { apiError, isRecord, request } from '@/shared/api'

import { type Notification, parseNotification } from './notification'

export type QueueInput = { signal: AbortSignal }

export const receiveNotification = async ({ signal }: QueueInput): Promise<Notification | null> => {
  const data = await request('receiveNotification', {
    signal,

    timeout: 40_000,
    allowEmpty: true,
  })

  return parseNotification(data)
}

export const deleteNotification = async ({
  signal,
  receiptId,
}: QueueInput & { receiptId: number }): Promise<void> => {
  const data = await request('deleteNotification', {
    signal,
    method: 'DELETE',
    suffix: receiptId,
  })

  if (!isRecord(data) || data.result !== true) {
    throw apiError(
      'response',
      'Уведомление не подтверждено. Проверьте инстанс и возобновите получение.',
    )
  }
}
