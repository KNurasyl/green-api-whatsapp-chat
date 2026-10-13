import { type Delivery, isDirectChat, isMessageStatus, type Message } from '@/entities/chat'
import { apiError, isRecord } from '@/shared/api'

export type ChatEvent =
  | { type: 'message'; chatId: string; name?: string; message: Message }
  | { type: 'state'; state: string }
  | { type: 'status'; chatId: string; messageId: string; delivery: Delivery }
  | { type: 'quota' }
  | { type: 'skip' }

export type Notification = { receiptId: number; event: ChatEvent }

const invalid = () =>
  apiError('response', 'Не удалось прочитать уведомление GREEN-API. Оно оставлено в очереди.')

const readId = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw invalid()

  return value
}

const readTime = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 8_640_000_000_000
  ) {
    throw invalid()
  }

  return value * 1000
}

const serviceText = (text: string): string => {
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

  if (typeof text !== 'string') throw invalid()

  const name = [sender.senderContactName, sender.senderName, sender.chatName].find(
    (value): value is string => typeof value === 'string' && Boolean(value.trim()),
  )

  return {
    type: 'message',
    chatId: sender.chatId,
    name,
    message: {
      id: readId(body.idMessage),
      text: serviceText(text),
      direction: 'incoming',
      timestamp: readTime(body.timestamp),
    },
  }
}

const parseEvent = (body: Record<string, unknown>): ChatEvent => {
  if (typeof body.typeWebhook !== 'string' || !body.typeWebhook) throw invalid()

  if (body.typeWebhook === 'incomingMessageReceived') return parseMessage(body)

  if (body.typeWebhook === 'quotaExceeded') return { type: 'quota' }

  if (body.typeWebhook === 'outgoingMessageStatus') {
    if (typeof body.chatId !== 'string' || typeof body.status !== 'string') throw invalid()

    if (!isDirectChat(body.chatId) || !isMessageStatus(body.status)) return { type: 'skip' }

    return {
      type: 'status',
      chatId: body.chatId,
      messageId: readId(body.idMessage),
      delivery: { status: body.status, timestamp: readTime(body.timestamp) },
    }
  }

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
