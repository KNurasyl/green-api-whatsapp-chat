import { httpError, isRecord } from './http.ts'
import type { GreenMethod } from './routes.ts'

const pickRecord = (data: Record<string, unknown>, fields: string[]): Record<string, unknown> =>
  Object.fromEntries(fields.filter((key) => key in data).map((key) => [key, data[key]]))

const pick = (data: unknown, fields: string[]): unknown => {
  if (!isRecord(data)) return undefined

  return pickRecord(data, fields)
}

const readNotification = (data: Record<string, unknown>): unknown => {
  const body = data.body

  if (!isRecord(body)) return { receiptId: data.receiptId }

  const message = body.messageData

  return {
    receiptId: data.receiptId,
    body: {
      ...pickRecord(body, [
        'typeWebhook',
        'timestamp',
        'idMessage',
        'chatId',
        'status',
        'stateInstance',
      ]),
      senderData: pick(body.senderData, ['chatId', 'senderContactName', 'senderName', 'chatName']),
      messageData: isRecord(message)
        ? {
            typeMessage: message.typeMessage,
            textMessageData: pick(message.textMessageData, ['textMessage']),
            extendedTextMessageData: pick(message.extendedTextMessageData, ['text']),
          }
        : undefined,
    },
  }
}

export const readResponse = (method: GreenMethod, data: unknown): unknown => {
  if (data === null && method === 'receiveNotification') return null

  if (!isRecord(data)) throw httpError(502, 'GREEN-API вернул некорректный ответ.')

  if (method === 'receiveNotification') return readNotification(data)

  const fields: Record<Exclude<GreenMethod, 'receiveNotification'>, string[]> = {
    getStateInstance: ['stateInstance'],
    getSettings: [
      'webhookUrl',
      'incomingWebhook',
      'stateWebhook',
      'outgoingWebhook',
      'outgoingAPIMessageWebhook',
      'outgoingMessageWebhook',
    ],
    checkWhatsapp: ['existsWhatsapp', 'chatId'],
    sendMessage: ['idMessage'],
    deleteNotification: ['result'],
  }

  return pickRecord(data, fields[method])
}
