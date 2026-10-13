import { afterEach, describe, expect, it, vi } from 'vitest'

import { request } from '@/shared/api/request'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('uses the local API without credentials or JSON headers on GET', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ stateInstance: 'authorized' }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(request('getStateInstance')).resolves.toEqual({
      stateInstance: 'authorized',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/getStateInstance',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: { 'X-Chat-Client': 'web' },
        method: 'GET',
      }),
    )
  })

  it('keeps raw server errors and tokens out of the displayed error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('test-token', { status: 403 })),
    )
    await expect(request('getStateInstance')).rejects.toMatchObject({
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
    await expect(request('getStateInstance')).rejects.toMatchObject({
      retryAfter: 3000,
    })
  })

  it('rejects malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>error</html>')),
    )
    await expect(request('getSettings')).rejects.toMatchObject({ kind: 'response' })
  })

  it('does not make a request after cancellation', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn<typeof fetch>()

    vi.stubGlobal('fetch', fetchMock)
    controller.abort()

    await expect(request('getSettings', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
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
    const result = expect(request('getStateInstance', { timeout: 1000 })).rejects.toMatchObject({
      kind: 'timeout',
    })

    await vi.advanceTimersByTimeAsync(1000)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
it('explains a missing server configuration without echoing response data', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ error: 'configuration', secret: 'test-token' }, { status: 503 }),
      ),
  )

  await expect(request('getStateInstance')).rejects.toMatchObject({
    kind: 'validation',
    message: 'Настройте GREEN-API в серверном .env и перезапустите приложение.',
  })
})
