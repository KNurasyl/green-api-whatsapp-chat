import { apiError, type ApiSession, isRecord, request } from '@/shared/api'

import { type Notification, parseNotification } from './notification'

export type QueueInput = ApiSession

export const receiveNotification = async (session: QueueInput): Promise<Notification | null> => {
  const data = await request('receiveNotification', {
    ...session,

    timeout: 40_000,
    allowEmpty: true,
  })

  return parseNotification(data)
}

export const deleteNotification = async ({
  signal,
  key,
  receiptId,
}: QueueInput & { receiptId: number }): Promise<void> => {
  const data = await request('deleteNotification', {
    signal,
    key,
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
