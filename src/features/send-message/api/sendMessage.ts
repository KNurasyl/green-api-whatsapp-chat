import { apiError, type ApiSession, isRecord, request } from '@/shared/api'

import { getMessageError } from '../lib/message'

export const sendMessage = async (
  chatId: string,
  text: string,
  session: ApiSession,
): Promise<string> => {
  const error = getMessageError(text)

  if (error) throw apiError('validation', error)

  const data = await request('sendMessage', {
    method: 'POST',
    body: { chatId, message: text },
    ...session,
  })

  if (!isRecord(data) || typeof data.idMessage !== 'string' || !data.idMessage.trim()) {
    throw apiError('response', 'GREEN-API не вернул идентификатор сообщения.')
  }

  return data.idMessage
}
