import { apiError, isRecord, request, type Connection } from '@/shared/api'
import { parseNotification } from './notification'

export type QueueInput = { connection: Connection; signal: AbortSignal }

export const receiveNotification = async ({ connection, signal }: QueueInput) => {
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
}: QueueInput & { receiptId: number }) => {
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
