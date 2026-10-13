import { describe, expect, it } from 'vitest'
import { parseNotification } from './notification'

const body = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1700000000,
  idMessage: 'incoming-1',
  senderData: { chatId: '123456789@lid', senderName: 'Тестовый контакт' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: '<b>Привет</b>' } },
}

describe('notifications', () => {
  it('reads a personal text message and converts seconds to milliseconds', () => {
    expect(parseNotification({ receiptId: 123, body })).toEqual({
      receiptId: 123,
      event: {
        type: 'message',
        chatId: '123456789@lid',
        name: 'Тестовый контакт',
        message: {
          id: 'incoming-1',
          timestamp: 1700000000000,
          text: '<b>Привет</b>',
          direction: 'incoming',
        },
      },
    })
  })

  it.each(['extendedTextMessage', 'quotedMessage'])('reads the main text of %s', (typeMessage) => {
    const data = {
      receiptId: 1,
      body: { ...body, messageData: { typeMessage, extendedTextMessageData: { text: 'Ответ' } } },
    }
    expect(parseNotification(data)?.event).toMatchObject({ message: { text: 'Ответ' } })
  })

  it('skips groups, files and outgoing echoes', () => {
    const cases = [
      { ...body, senderData: { chatId: '123@g.us' } },
      {
        ...body,
        messageData: { typeMessage: 'imageMessage', extendedTextMessageData: { text: 'Не текст' } },
      },
      { typeWebhook: 'outgoingAPIMessageReceived' },
    ]
    for (const item of cases) {
      expect(parseNotification({ receiptId: 1, body: item })?.event).toEqual({ type: 'skip' })
    }
  })

  it.each([0, -1, 1.5, '123', Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid receipt: %s',
    (receiptId) => {
      expect(() => parseNotification({ receiptId, body })).toThrow('оставлено в очереди')
    },
  )

  it('rejects a broken supported event instead of acknowledging it', () => {
    expect(() =>
      parseNotification({
        receiptId: 1,
        body: { ...body, messageData: { typeMessage: 'textMessage' } },
      }),
    ).toThrow()
    expect(() =>
      parseNotification({ receiptId: 1, body: { ...body, timestamp: Infinity } }),
    ).toThrow()
  })

  it('accepts an empty queue and replaces service errors with safe text', () => {
    expect(parseNotification(null)).toBeNull()
    const data = {
      receiptId: 1,
      body: {
        ...body,
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: '{{SWE001}}' } },
      },
    }
    const event = parseNotification(data)?.event
    if (event?.type !== 'message') throw new Error('Expected a message')
    expect(event.message.text).toContain('Посмотрите его на телефоне')
  })
})
