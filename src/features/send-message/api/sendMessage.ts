import { apiError, isRecord, request, type Connection } from '@/shared/api'
import { getMessageError } from '../lib/message'

export const sendMessage = async (
  connection: Connection,
  chatId: string,
  text: string,
  signal: AbortSignal,
) => {
  const error = getMessageError(text)
  if (error) throw apiError('validation', error)

  const data = await request(connection, 'sendMessage', {
    method: 'POST',
    body: { chatId, message: text },
    signal,
  })
  if (!isRecord(data) || typeof data.idMessage !== 'string' || !data.idMessage.trim()) {
    throw apiError('response', 'GREEN-API не вернул идентификатор сообщения.')
  }

  return data.idMessage
}
