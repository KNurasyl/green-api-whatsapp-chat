import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMessageError, getSendError } from '../lib/message'
import { sendMessage } from './sendMessage'

const connection = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

afterEach(() => vi.unstubAllGlobals())

describe('send message', () => {
  it('validates blank and oversized text without trimming the message', () => {
    expect(getMessageError(' \n ')).toBe('Введите сообщение')
    expect(getMessageError('a'.repeat(20_001))).toBe('Сообщение слишком длинное')
    expect(getMessageError('a'.repeat(20_000))).toBeNull()
  })

  it('sends the confirmed address and preserves spaces and line breaks', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ idMessage: 'message-1' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      sendMessage(connection, '12345@lid', ' Привет\nМир ', new AbortController().signal),
    ).resolves.toBe('message-1')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ chatId: '12345@lid', message: ' Привет\nМир ' }),
      }),
    )
  })

  it('does not retry an unknown outcome and explains the risk of sending again', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Network error with test-token'))
    vi.stubGlobal('fetch', fetchMock)
    const error = await sendMessage(
      connection,
      '12345@lid',
      'Привет',
      new AbortController().signal,
    ).catch((value: unknown) => value)

    expect(getSendError(error)).toContain('Сообщение могло уйти')
    expect(getSendError(error)).not.toContain('test-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats a missing message id as an uncertain result', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: true })))
    const error = await sendMessage(
      connection,
      '12345@lid',
      'Привет',
      new AbortController().signal,
    ).catch((value: unknown) => value)
    expect(getSendError(error)).toContain('Сообщение могло уйти')
  })
})
