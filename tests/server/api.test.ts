import { createServer, request as httpRequest } from 'node:http'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { parseNotification } from '@/features/receive-messages/api/notification'

import { createApi } from '../../server/api.ts'
import type { Environment } from '../../server/env.ts'
import { isRecord, sendJson } from '../../server/http.ts'

const browserFetch = globalThis.fetch
const headers: Record<string, string> = { 'X-Chat-Client': 'web' }
const env = {
  GREEN_API_URL: 'https://test.api.greenapi.com',
  GREEN_API_INSTANCE_ID: '123',
  GREEN_API_TOKEN: 'server-only-token',
}
const upstream = vi.fn<typeof fetch>()

const withServer = async (
  run: (origin: string) => Promise<void>,
  environment: Environment = env,
): Promise<void> => {
  const first = createApi({
    SESSION_SECRET: 'a-secure-test-password-with-more-than-32-characters',
    ...environment,
  })
  const second = createApi({
    SESSION_SECRET: 'a-secure-test-password-with-more-than-32-characters',
    ...environment,
  })
  let calls = 0
  const server = createServer((request, response) => {
    void (calls++ % 2 ? first : second)(request, response).then((handled) => {
      if (!handled) sendJson(response, 404, null)
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

  const address = server.address()

  if (!address || typeof address === 'string') throw new Error('Missing test server address')

  try {
    const origin = `http://127.0.0.1:${address.port}`

    delete headers['X-Chat-Session']
    delete headers.Cookie
    if (environment.GREEN_API_TOKEN) {
      const response = await browserFetch(origin + '/api/session', {
        method: 'POST',
        headers: { 'X-Chat-Client': 'web', 'Content-Type': 'application/json' },
        body: JSON.stringify({ useEnv: true }),
      })
      const data: unknown = await response.json()

      if (!isRecord(data) || typeof data.key !== 'string') throw new Error('Missing session key')

      headers['X-Chat-Session'] = data.key
      headers.Cookie = response.headers.getSetCookie()[0]?.split(';')[0] ?? ''
    }

    await run(origin)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  upstream.mockReset()
  upstream.mockRejectedValue(new Error('Unexpected upstream request'))
  vi.stubGlobal('fetch', upstream)
})

afterEach(() => vi.unstubAllGlobals())

it('keeps credentials on the server and returns only the requested state', async () => {
  upstream.mockResolvedValue(
    Response.json({
      stateInstance: 'authorized',
      apiTokenInstance: env.GREEN_API_TOKEN,
    }),
  )

  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/getStateInstance', { headers })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stateInstance: 'authorized' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  expect(upstream).toHaveBeenCalledWith(
    new URL(env.GREEN_API_URL + '/waInstance123/getStateInstance/server-only-token'),
    expect.objectContaining({ method: 'GET', redirect: 'error', credentials: 'omit' }),
  )
})

it('excludes credentials and unrelated account settings', async () => {
  upstream.mockResolvedValue(
    Response.json({
      webhookUrl: '',
      incomingWebhook: 'yes',
      stateWebhook: 'yes',
      apiTokenInstance: env.GREEN_API_TOKEN,
      webhookUrlToken: 'webhook-secret',
      proxy: { password: 'proxy-secret' },
    }),
  )

  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/getSettings', { headers })

    expect(await response.json()).toEqual({
      webhookUrl: '',
      incomingWebhook: 'yes',
      stateWebhook: 'yes',
    })
  })
})

it('forwards a message once and keeps spaces and line breaks', async () => {
  upstream.mockResolvedValue(Response.json({ idMessage: 'sent-1' }))

  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/sendMessage', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: '12345@lid',
        message: ' Привет\nМир ',
        apiUrl: 'https://evil.example',
        apiTokenInstance: 'browser-token',
      }),
    })

    expect(await response.json()).toEqual({ idMessage: 'sent-1' })
  })

  expect(upstream).toHaveBeenCalledTimes(1)
  expect(upstream).toHaveBeenCalledWith(
    new URL(env.GREEN_API_URL + '/waInstance123/sendMessage/server-only-token'),
    expect.objectContaining({
      body: JSON.stringify({ chatId: '12345@lid', message: ' Привет\nМир ' }),
    }),
  )
})

it.each([
  ['/api/logout', 'GET'],
  ['/api/sendMessage', 'GET'],
  ['/api/getSettings?apiUrl=https://evil.example', 'GET'],
  ['/api/deleteNotification/0', 'DELETE'],
  ['/api/deleteNotification/9007199254740992', 'DELETE'],
  ['/api/getStateInstance/extra', 'GET'],
])('rejects unsupported requests: %s', async (path, method) => {
  await withServer(async (origin) => {
    const response = await browserFetch(origin + path, { headers, method })

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(upstream).not.toHaveBeenCalled()
  })
})

it.each([{}, { ...headers, Origin: 'https://evil.example' }])(
  'rejects requests from another site or without the client header',
  async (requestHeaders) => {
    await withServer(async (origin) => {
      const response = await browserFetch(origin + '/api/getStateInstance', {
        headers: requestHeaders,
      })

      expect(response.status).toBe(403)
      expect(upstream).not.toHaveBeenCalled()
    })
  },
)

it('rejects API calls without a session before contacting GREEN-API', async () => {
  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/getStateInstance', { headers })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'request' })
    expect(upstream).not.toHaveBeenCalled()
  }, {})
})

it.each([
  '{}',
  '{"chatId":"79990000000@c.us","message":" "}',
  '{"chatId":"123@g.us","message":"Привет"}',
  'not json',
])('rejects invalid message bodies', async (body) => {
  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/sendMessage', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body,
    })

    expect(response.status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
  })
})

it('limits request size without forwarding oversized content', async () => {
  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/sendMessage', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: '123@lid', message: 'a'.repeat(130_000) }),
    })

    expect(response.status).toBe(413)
    expect(upstream).not.toHaveBeenCalled()
  })
})

it('does not reveal or retry an upstream error', async () => {
  upstream.mockResolvedValue(
    new Response(env.GREEN_API_TOKEN, {
      status: 429,
      headers: { 'Retry-After': '3' },
    }),
  )

  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/getStateInstance', { headers })

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('3')
    expect(await response.text()).not.toContain(env.GREEN_API_TOKEN)
  })

  expect(upstream).toHaveBeenCalledTimes(1)
})

it('does not retry a failed send or leak its URL', async () => {
  upstream.mockRejectedValue(new Error(env.GREEN_API_TOKEN))

  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/sendMessage', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: '123@lid', message: 'Привет' }),
    })

    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain(env.GREEN_API_TOKEN)
  })

  expect(upstream).toHaveBeenCalledTimes(1)
})

it('keeps long polling and acknowledgment sequential and preserves receipt IDs', async () => {
  upstream
    .mockResolvedValueOnce(new Response(''))
    .mockResolvedValueOnce(Response.json({ result: true }))

  await withServer(async (origin) => {
    const received = await browserFetch(origin + '/api/receiveNotification', { headers })

    expect(await received.json()).toBeNull()

    const confirmed = await browserFetch(origin + '/api/deleteNotification/123', {
      headers,
      method: 'DELETE',
    })

    expect(await confirmed.json()).toEqual({ result: true })
  })

  expect(upstream).toHaveBeenNthCalledWith(
    1,
    new URL(
      env.GREEN_API_URL + '/waInstance123/receiveNotification/server-only-token?receiveTimeout=30',
    ),
    expect.objectContaining({ method: 'GET' }),
  )
  expect(upstream).toHaveBeenNthCalledWith(
    2,
    new URL(env.GREEN_API_URL + '/waInstance123/deleteNotification/server-only-token/123'),
    expect.objectContaining({ method: 'DELETE' }),
  )
})

it('cancels the upstream long poll when the browser disconnects', async () => {
  let aborted = false

  upstream.mockImplementation(
    (_url, options) =>
      new Promise((_, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => {
            aborted = true
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
      }),
  )

  await withServer(async (origin) => {
    const controller = new AbortController()
    const pending = browserFetch(origin + '/api/receiveNotification', {
      headers,
      signal: controller.signal,
    })
    const result = expect(pending).rejects.toMatchObject({ name: 'AbortError' })

    await vi.waitFor(() => expect(upstream).toHaveBeenCalledTimes(1))
    controller.abort()
    await result
    await vi.waitFor(() => expect(aborted).toBe(true))
  })
})

it('rejects an untrusted Host header', async () => {
  await withServer(async (origin) => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(
        origin + '/api/getStateInstance',
        {
          headers: { ...headers, Host: 'evil.example' },
        },
        (response) => {
          response.resume()
          response.on('end', () => resolve(response.statusCode))
        },
      )

      request.on('error', reject)
      request.end()
    })

    expect(status).toBe(403)
    expect(upstream).not.toHaveBeenCalled()
  })
})

it.each(['textMessage', 'extendedTextMessage', 'quotedMessage'])(
  'preserves %s notifications without exposing account data',
  async (typeMessage) => {
    upstream.mockResolvedValue(
      Response.json({
        receiptId: 321,
        apiTokenInstance: env.GREEN_API_TOKEN,
        body: {
          typeWebhook: 'incomingMessageReceived',
          timestamp: 1_700_000_000,
          idMessage: 'received-1',
          instanceData: { apiTokenInstance: env.GREEN_API_TOKEN },
          senderData: { chatId: '12345@lid', senderName: 'Тест', privateField: 'private' },
          messageData: {
            typeMessage,
            textMessageData: { textMessage: 'Привет', privateField: 'private' },
            extendedTextMessageData: { text: 'Привет', privateField: 'private' },
          },
        },
      }),
    )

    await withServer(async (origin) => {
      const response = await browserFetch(origin + '/api/receiveNotification', { headers })
      const data: unknown = await response.json()

      expect(JSON.stringify(data)).not.toContain(env.GREEN_API_TOKEN)
      expect(JSON.stringify(data)).not.toContain('private')
      expect(parseNotification(data)).toMatchObject({
        receiptId: 321,
        event: {
          type: 'message',
          chatId: '12345@lid',
          name: 'Тест',
          message: { id: 'received-1', text: 'Привет', direction: 'incoming' },
        },
      })
    })
  },
)

it('rejects malformed successful responses without leaking their content', async () => {
  upstream.mockResolvedValue(Response.json(env.GREEN_API_TOKEN))

  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/getSettings', { headers })

    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain(env.GREEN_API_TOKEN)
  })
})

it('accepts form credentials across server instances and deletes the cookie on logout', async () => {
  upstream.mockResolvedValue(Response.json({ stateInstance: 'authorized' }))

  await withServer(async (origin) => {
    const login = await browserFetch(origin + '/api/session', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl: env.GREEN_API_URL,
        idInstance: '456',
        apiTokenInstance: 'form-token',
      }),
    })
    const data: unknown = await login.json()

    if (!isRecord(data) || typeof data.key !== 'string') throw new Error('Missing session key')

    const sessionHeaders = {
      ...headers,
      'X-Chat-Session': data.key,
      Cookie: login.headers.getSetCookie()[0]?.split(';')[0] ?? '',
    }
    const state = await browserFetch(origin + '/api/getStateInstance', { headers: sessionHeaders })

    expect(state.status).toBe(200)
    expect(JSON.stringify(data)).not.toContain('form-token')
    expect(upstream).toHaveBeenCalledWith(
      new URL(env.GREEN_API_URL + '/waInstance456/getStateInstance/form-token'),
      expect.anything(),
    )

    const logout = await browserFetch(origin + '/api/session', {
      method: 'DELETE',
      headers: sessionHeaders,
    })

    expect(logout.headers.getSetCookie()[0]).toContain('Max-Age=0')
    sessionHeaders.Cookie = logout.headers.getSetCookie()[0]?.split(';')[0] ?? ''
    const afterLogout = await browserFetch(origin + '/api/getStateInstance', {
      headers: sessionHeaders,
    })

    expect(afterLogout.status).toBe(401)
  }, {})
})

it('rejects credentials pointing outside GREEN-API without making a request', async () => {
  await withServer(async (origin) => {
    const response = await browserFetch(origin + '/api/session', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl: 'https://evil.example',
        idInstance: '123',
        apiTokenInstance: 'secret',
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.text()).not.toContain('secret')
    expect(upstream).not.toHaveBeenCalled()
  }, {})
})

it('requires both the encrypted cookie and its session key', async () => {
  await withServer(async (origin) => {
    const withoutCookie = await browserFetch(origin + '/api/getStateInstance', {
      headers: { 'X-Chat-Client': 'web', 'X-Chat-Session': headers['X-Chat-Session'] ?? '' },
    })
    const wrongKey = await browserFetch(origin + '/api/getStateInstance', {
      headers: { ...headers, 'X-Chat-Session': 'another-session' },
    })
    const cookie = headers.Cookie ?? ''
    const middle = Math.floor(cookie.length / 2)
    const changed =
      cookie.slice(0, middle) + (cookie[middle] === 'a' ? 'b' : 'a') + cookie.slice(middle + 1)
    const tampered = await browserFetch(origin + '/api/getStateInstance', {
      headers: { ...headers, Cookie: changed },
    })

    expect([withoutCookie.status, wrongKey.status, tampered.status]).toEqual([401, 401, 401])
    expect(upstream).not.toHaveBeenCalled()
    expect(headers.Cookie).not.toContain(env.GREEN_API_TOKEN)
  })
})
