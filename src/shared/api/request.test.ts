import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseConnection } from './connection'
import { request } from './request'

const connection = {
  apiUrl: 'https://test.api.greenapi.com',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('connection', () => {
  it('accepts the console address and trims fields', () => {
    expect(
      parseConnection({ ...connection, apiUrl: `${connection.apiUrl}/`, idInstance: ' 123 ' }),
    ).toEqual(connection)
  })

  it.each([
    'http://api.green-api.com',
    'https://api.green-api.com.evil.example',
    'https://fakeapi.green-api.com',
    'https://user:secret@api.green-api.com',
    'https://api.green-api.com/path',
    'https://api.green-api.com?token=value',
    'https://api.green-api.com:444',
  ])('rejects an unsafe address: %s', (apiUrl) => {
    expect(() => parseConnection({ ...connection, apiUrl })).toThrow()
  })
})

describe('request', () => {
  it('uses the supplied address and omits JSON headers on GET', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ stateInstance: 'authorized' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request(connection, 'getStateInstance')).resolves.toEqual({
      stateInstance: 'authorized',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.api.greenapi.com/waInstance123/getStateInstance/test-token',
      expect.objectContaining({ credentials: 'omit', headers: undefined, method: 'GET' }),
    )
  })

  it('keeps raw server errors and tokens out of the displayed error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('test-token', { status: 403 })),
    )
    await expect(request(connection, 'getStateInstance')).rejects.toMatchObject({
      kind: 'http',
      status: 403,
      message: 'Доступ запрещён. Проверьте адрес API и реквизиты инстанса.',
    })
  })

  it('exposes Retry-After as a delay', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '3' } })),
    )
    await expect(request(connection, 'getStateInstance')).rejects.toMatchObject({
      retryAfter: 3000,
    })
  })

  it('rejects malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>error</html>')),
    )
    await expect(request(connection, 'getSettings')).rejects.toMatchObject({ kind: 'response' })
  })

  it('does not make a request after cancellation', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    controller.abort()

    await expect(
      request(connection, 'getSettings', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cancels a timed out request without retrying', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = expect(
      request(connection, 'getStateInstance', { timeout: 1000 }),
    ).rejects.toMatchObject({ kind: 'timeout' })

    await vi.advanceTimersByTimeAsync(1000)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
