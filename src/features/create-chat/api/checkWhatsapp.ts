import { isDirectChat } from '@/entities/chat'
import { apiError, type ApiSession, isRecord, request } from '@/shared/api'

export const checkWhatsapp = async (phone: string, session: ApiSession): Promise<string> => {
  const data = await request('checkWhatsapp', {
    method: 'POST',
    body: { chatId: `${phone}@c.us` },
    ...session,
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
