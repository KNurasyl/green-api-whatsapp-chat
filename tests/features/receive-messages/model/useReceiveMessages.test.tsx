import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { ChatProvider } from '@/entities/chat'
import { useSession } from '@/entities/session'
import { receiveNotification } from '@/features/receive-messages/api/queue'
import { useReceiveMessages } from '@/features/receive-messages/model/useReceiveMessages'
import { apiError } from '@/shared/api'

vi.mock('@/features/receive-messages/api/queue', () => ({
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn(),
}))

const client = new QueryClient()
const Wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>
    <ChatProvider>{children}</ChatProvider>
  </QueryClientProvider>
)

afterEach(() => {
  cleanup()
  useSession.getState().close()
  client.clear()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it('keeps receiving paused until authorization events are enabled again', async () => {
  useSession.getState().open('test-session', 'test-key')
  vi.mocked(receiveNotification)
    .mockRejectedValueOnce(apiError('response', 'Получение приостановлено'))
    .mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            {
              once: true,
            },
          )
        }),
    )
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ stateInstance: 'authorized' }))
      .mockResolvedValueOnce(
        Response.json({ webhookUrl: '', incomingWebhook: 'yes', stateWebhook: 'no' }),
      )
      .mockResolvedValueOnce(Response.json({ stateInstance: 'authorized' }))
      .mockResolvedValueOnce(
        Response.json({ webhookUrl: '', incomingWebhook: 'yes', stateWebhook: 'yes' }),
      ),
  )
  const { result } = renderHook(useReceiveMessages, { wrapper: Wrapper })

  await waitFor(() => expect(result.current.status).toBe('paused'))

  act(() => result.current.resume())
  await waitFor(() => expect(result.current.error).toContain('stateWebhook'))
  expect(result.current.status).toBe('paused')
  expect(receiveNotification).toHaveBeenCalledTimes(1)

  act(() => result.current.resume())
  await waitFor(() => expect(result.current.status).toBe('connected'), { timeout: 3000 })
  expect(receiveNotification).toHaveBeenCalledTimes(2)
})
