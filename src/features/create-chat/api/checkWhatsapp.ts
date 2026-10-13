import { isDirectChat } from '@/entities/chat'
import { apiError, isRecord, request, type Connection } from '@/shared/api'

export const checkWhatsapp = async (connection: Connection, phone: string, signal: AbortSignal) => {
  const data = await request(connection, 'checkWhatsapp', {
    method: 'POST',
    body: { chatId: `${phone}@c.us` },
    signal,
  })

  if (!isRecord(data) || typeof data.existsWhatsapp !== 'boolean') {
    throw apiError('response', 'Не удалось проверить номер WhatsApp.')
  }

  if (!data.existsWhatsapp)
    throw apiError('validation', 'Этот номер не зарегистрирован в WhatsApp.')

  if (typeof data.chatId !== 'string' || !isDirectChat(data.chatId)) {
    throw apiError('response', 'GREEN-API не вернул адрес личного чата.')
  }

  return data.chatId
}
