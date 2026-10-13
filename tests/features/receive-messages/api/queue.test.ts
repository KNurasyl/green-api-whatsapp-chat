import { afterEach, expect, it, vi } from 'vitest'

import { deleteNotification, receiveNotification } from '@/features/receive-messages/api/queue'

const input = {
  signal: new AbortController().signal,
}

afterEach(() => vi.unstubAllGlobals())

it('accepts an empty long poll response', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(''))

  vi.stubGlobal('fetch', fetchMock)
  await expect(receiveNotification(input)).resolves.toBeNull()
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/receiveNotification',
    expect.objectContaining({ method: 'GET' }),
  )
})

it('acknowledges the exact receipt and rejects a false result', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: false }))

  vi.stubGlobal('fetch', fetchMock)
  await expect(deleteNotification({ ...input, receiptId: 321 })).rejects.toThrow('не подтверждено')
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/deleteNotification/321',
    expect.objectContaining({ method: 'DELETE' }),
  )
})
