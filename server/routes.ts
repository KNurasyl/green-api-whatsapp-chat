import { httpError, isRecord } from './http.ts'

const methods = {
  getStateInstance: 'GET',
  getSettings: 'GET',
  checkWhatsapp: 'POST',
  sendMessage: 'POST',
  receiveNotification: 'GET',
  deleteNotification: 'DELETE',
} as const

export type GreenMethod = keyof typeof methods

export type Route = {
  name: GreenMethod
  method: 'GET' | 'POST' | 'DELETE'
  receiptId?: string
}

const isMethod = (value: string): value is GreenMethod => Object.hasOwn(methods, value)

export const readRoute = (path: string, method: string | undefined): Route => {
  const url = new URL(path, 'http://localhost')
  const [, prefix, name = '', receiptId, ...extra] = url.pathname.split('/')

  if (prefix !== 'api' || !isMethod(name) || extra.length || url.search) {
    throw httpError(404, 'Метод не найден.')
  }

  if (methods[name] !== method) throw httpError(405, 'Метод запроса не поддерживается.')

  if (name === 'deleteNotification') {
    const id = Number(receiptId)

    if (!receiptId || !/^\d+$/.test(receiptId) || !Number.isSafeInteger(id) || id <= 0) {
      throw httpError(400, 'Некорректный идентификатор уведомления.')
    }
  } else if (receiptId !== undefined) {
    throw httpError(404, 'Метод не найден.')
  }

  return { name, method: methods[name], receiptId }
}

export const readBody = (method: GreenMethod, data: unknown): Record<string, string> => {
  if (!isRecord(data) || typeof data.chatId !== 'string') {
    throw httpError(400, 'Укажите адрес чата.')
  }

  if (method === 'checkWhatsapp') {
    if (!/^[1-9]\d{10,15}@c\.us$/.test(data.chatId)) throw httpError(400, 'Некорректный номер.')

    return { chatId: data.chatId }
  }

  if (
    !/^\d+@(c\.us|lid)$/.test(data.chatId) ||
    typeof data.message !== 'string' ||
    !data.message.trim() ||
    data.message.length > 20_000
  ) {
    throw httpError(400, 'Проверьте адрес чата и текст сообщения.')
  }

  return { chatId: data.chatId, message: data.message }
}
