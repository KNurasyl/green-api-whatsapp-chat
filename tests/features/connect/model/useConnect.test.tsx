import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { useSession } from '@/entities/session'
import { ConnectionForm } from '@/features/connect/ui/ConnectionForm'

const client = new QueryClient()
const Wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

const fillForm = (): void => {
  fireEvent.change(screen.getByLabelText('Адрес API'), {
    target: { value: 'https://test.api.greenapi.com' },
  })
  fireEvent.change(screen.getByLabelText('ID инстанса'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Токен инстанса'), { target: { value: 'private-token' } })
}

afterEach(() => {
  cleanup()
  useSession.getState().close()
  client.clear()
  vi.unstubAllGlobals()
})

it('checks settings, closes failed sessions and keeps credentials out of the query cache', async () => {
  let stateWebhook = 'no'
  const fetch = vi.fn<typeof globalThis.fetch>((url, options) => {
    if (url === '/api/config') return Promise.resolve(Response.json({ configured: false }))

    if (url === '/api/session' && options?.method === 'POST')
      return Promise.resolve(Response.json({ key: 'session-key' }))

    if (url === '/api/session') return Promise.resolve(Response.json({ result: true }))

    if (url === '/api/getStateInstance')
      return Promise.resolve(Response.json({ stateInstance: 'authorized' }))

    return Promise.resolve(Response.json({ webhookUrl: '', incomingWebhook: 'yes', stateWebhook }))
  })

  vi.stubGlobal('fetch', fetch)
  render(<ConnectionForm />, { wrapper: Wrapper })
  fillForm()
  fireEvent.click(screen.getByRole('button', { name: 'Подключиться' }))

  expect((await screen.findByRole('alert')).textContent).toContain('stateWebhook')
  expect(useSession.getState().session).toBeNull()
  expect(fetch).toHaveBeenCalledWith('/api/session', expect.objectContaining({ method: 'DELETE' }))
  expect(
    JSON.stringify(
      client
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.state.variables),
    ),
  ).not.toContain('private-token')
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ),
  ).not.toContain('session-key')

  stateWebhook = 'yes'
  fillForm()
  fireEvent.click(screen.getByRole('button', { name: 'Подключиться' }))

  await waitFor(() => expect(useSession.getState().session?.key).toBe('session-key'))
  expect(screen.getByLabelText('Токен инстанса').getAttribute('type')).toBe('password')
})

it('cancels an in-flight login without opening a session', async () => {
  let signal: AbortSignal | null | undefined
  const fetch = vi.fn<typeof globalThis.fetch>((url, options) => {
    if (url === '/api/config') return Promise.resolve(Response.json({ configured: false }))

    signal = options?.signal

    return new Promise((_, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
        once: true,
      })
    })
  })

  vi.stubGlobal('fetch', fetch)
  render(<ConnectionForm />, { wrapper: Wrapper })
  fillForm()
  fireEvent.click(screen.getByRole('button', { name: 'Подключиться' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Отменить' }))

  await waitFor(() => expect(signal?.aborted).toBe(true))
  expect(useSession.getState().session).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
})
