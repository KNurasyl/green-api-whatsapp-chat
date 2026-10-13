import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkWhatsapp } from '@/features/create-chat/api/checkWhatsapp'
import { normalizePhone } from '@/features/create-chat/lib/phone'

afterEach(() => vi.unstubAllGlobals())

describe('new chat', () => {
  it('normalizes separators while keeping the phone a string', () => {
    expect(normalizePhone('+7 (999) 000-00-00')).toBe('79990000000')
  })

  it.each(['123', '09990000000', '79990000000@c.us', '7a9990000000', '12345678901234567'])(
    'rejects an invalid phone: %s',
    (phone) => {
      expect(() => normalizePhone(phone)).toThrow()
    },
  )

  it('uses the returned lid and sends only chatId to GREEN-API', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ existsWhatsapp: true, chatId: '12345@lid' }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      checkWhatsapp('79990000000', { signal: new AbortController().signal, key: 'test-key' }),
    ).resolves.toBe('12345@lid')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chatId: '79990000000@c.us' }),
      }),
    )
  })

  it.each([
    { existsWhatsapp: false },
    { existsWhatsapp: true },
    { existsWhatsapp: true, chatId: '123@g.us' },
  ])('rejects missing accounts or unusable chat addresses: %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(data)))
    await expect(
      checkWhatsapp('79990000000', { signal: new AbortController().signal, key: 'test-key' }),
    ).rejects.toThrow()
  })
})
