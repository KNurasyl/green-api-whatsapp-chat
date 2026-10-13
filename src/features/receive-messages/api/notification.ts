import { isDirectChat, type Message } from '@/entities/chat'
import { apiError, isRecord } from '@/shared/api'

export type ChatEvent =
  | { type: 'message'; chatId: string; name?: string; message: Message }
  | { type: 'state'; state: string }
  | { type: 'quota' }
  | { type: 'skip' }

export type Notification = { receiptId: number; event: ChatEvent }

const invalid = () =>
  apiError('response', 'Не удалось прочитать уведомление GREEN-API. Оно оставлено в очереди.')

const serviceText = (text: string) => {
  if (/^\{\{SWE00[12359]\}\}$/.test(text) || text === '{{SWE999}}') {
    return 'WhatsApp не смог загрузить это сообщение. Посмотрите его на телефоне.'
  }
  return text
}

const parseMessage = (body: Record<string, unknown>): ChatEvent => {
  const sender = body.senderData
  if (!isRecord(sender) || typeof sender.chatId !== 'string') throw invalid()
  if (!isDirectChat(sender.chatId)) return { type: 'skip' }

  const data = body.messageData
  if (!isRecord(data) || typeof data.typeMessage !== 'string') throw invalid()
  if (!['textMessage', 'extendedTextMessage', 'quotedMessage'].includes(data.typeMessage)) {
    return { type: 'skip' }
  }

  let text: unknown
  if (data.typeMessage === 'textMessage' && isRecord(data.textMessageData)) {
    text = data.textMessageData.textMessage
  }
  if (data.typeMessage !== 'textMessage' && isRecord(data.extendedTextMessageData)) {
    text = data.extendedTextMessageData.text
  }
  if (
    typeof text !== 'string' ||
    typeof body.idMessage !== 'string' ||
    !body.idMessage.trim() ||
    typeof body.timestamp !== 'number' ||
    !Number.isFinite(body.timestamp) ||
    body.timestamp <= 0 ||
    body.timestamp > 8_640_000_000_000
  ) {
    throw invalid()
  }

  const name = [sender.senderContactName, sender.senderName, sender.chatName].find(
    (value): value is string => typeof value === 'string' && Boolean(value.trim()),
  )

  return {
    type: 'message',
    chatId: sender.chatId,
    name,
    message: {
      id: body.idMessage,
      text: serviceText(text),
      direction: 'incoming',
      timestamp: body.timestamp * 1000,
    },
  }
}

const parseEvent = (body: Record<string, unknown>): ChatEvent => {
  if (typeof body.typeWebhook !== 'string' || !body.typeWebhook) throw invalid()
  if (body.typeWebhook === 'incomingMessageReceived') return parseMessage(body)
  if (body.typeWebhook === 'quotaExceeded') return { type: 'quota' }
  if (body.typeWebhook === 'stateInstanceChanged') {
    if (typeof body.stateInstance !== 'string' || !body.stateInstance) throw invalid()
    return { type: 'state', state: body.stateInstance }
  }

  return { type: 'skip' }
}

export const parseNotification = (data: unknown): Notification | null => {
  if (data === null) return null
  if (
    !isRecord(data) ||
    typeof data.receiptId !== 'number' ||
    !Number.isSafeInteger(data.receiptId) ||
    data.receiptId <= 0 ||
    !isRecord(data.body)
  ) {
    throw invalid()
  }

  return { receiptId: data.receiptId, event: parseEvent(data.body) }
}
