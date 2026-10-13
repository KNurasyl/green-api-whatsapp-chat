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

afterEach(() => {
  cleanup()
  useSession.getState().close()
  client.clear()
  vi.unstubAllGlobals()
})

it('requires authorization events before opening a session', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({ stateInstance: 'authorized' }))
    .mockResolvedValueOnce(
      Response.json({ webhookUrl: '', incomingWebhook: 'yes', stateWebhook: 'no' }),
    )
    .mockResolvedValueOnce(Response.json({ stateInstance: 'authorized' }))
    .mockResolvedValueOnce(
      Response.json({ webhookUrl: '', incomingWebhook: 'yes', stateWebhook: 'yes' }),
    )

  vi.stubGlobal('fetch', fetch)
  render(<ConnectionForm />, { wrapper: Wrapper })
  expect(screen.queryByLabelText('Токен инстанса')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Подключиться' }))

  expect((await screen.findByRole('alert')).textContent).toContain('stateWebhook')
  expect(useSession.getState().session).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(2)

  fireEvent.click(screen.getByRole('button', { name: 'Подключиться' }))
  await waitFor(() => expect(useSession.getState().session).not.toBeNull())
  expect(fetch).toHaveBeenCalledTimes(4)
})
