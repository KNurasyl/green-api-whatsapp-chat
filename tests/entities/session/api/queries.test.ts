import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { settingsQuery, stateQuery } from '@/entities/session/api/queries'

afterEach(() => vi.unstubAllGlobals())

it('separates sessions without putting credentials in keys', () => {
  const first = stateQuery({ id: 'first', key: 'test-key' })
  const second = stateQuery({ id: 'second', key: 'test-key' })

  expect(first.queryKey).not.toEqual(second.queryKey)
  expect(first.queryKey).toEqual(['session', 'first', 'state'])
})

it('rejects a state response without a state', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: true })))
  const client = new QueryClient()

  await expect(
    client.fetchQuery(stateQuery({ id: 'test', key: 'test-key' })),
  ).rejects.toMatchObject({
    kind: 'response',
  })
  client.clear()
})

it('reads WhatsApp settings without requiring typeInstance', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        webhookUrl: '',
        incomingWebhook: 'yes',
        stateWebhook: 'yes',
        outgoingWebhook: 'yes',
        outgoingAPIMessageWebhook: 'yes',
        outgoingMessageWebhook: 'yes',
      }),
    ),
  )
  const client = new QueryClient()

  await expect(client.fetchQuery(settingsQuery({ id: 'test', key: 'test-key' }))).resolves.toEqual({
    webhookUrl: '',
    incoming: true,
    stateChanges: true,
    statuses: true,
  })
  client.clear()
})

it('rejects incomplete settings', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ webhookUrl: '' })))
  const client = new QueryClient()

  await expect(
    client.fetchQuery(settingsQuery({ id: 'test', key: 'test-key' })),
  ).rejects.toMatchObject({
    kind: 'response',
  })
  client.clear()
})

it.each([undefined, 'unknown'])(
  'rejects an invalid stateWebhook setting: %s',
  async (stateWebhook) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ webhookUrl: '', incomingWebhook: 'yes', stateWebhook })),
    )
    const client = new QueryClient()

    await expect(
      client.fetchQuery(settingsQuery({ id: 'test', key: 'test-key' })),
    ).rejects.toMatchObject({
      kind: 'response',
    })
    client.clear()
  },
)
