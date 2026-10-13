import { apiError, type Connection, isRecord, request } from '@/shared/api'

import { type Notification, parseNotification } from './notification'

export type QueueInput = { connection: Connection; signal: AbortSignal }

export const receiveNotification = async ({
  connection,
  signal,
}: QueueInput): Promise<Notification | null> => {
  const data = await request(connection, 'receiveNotification', {
    signal,
    query: { receiveTimeout: '30' },
    timeout: 40_000,
    allowEmpty: true,
  })

  return parseNotification(data)
}

export const deleteNotification = async ({
  connection,
  signal,
  receiptId,
}: QueueInput & { receiptId: number }): Promise<void> => {
  const data = await request(connection, 'deleteNotification', {
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
