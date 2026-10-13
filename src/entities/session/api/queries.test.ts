import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { settingsQuery, stateQuery } from './queries'

const connection = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

afterEach(() => vi.unstubAllGlobals())

it('separates sessions without putting credentials in keys', () => {
  const first = stateQuery(connection, 'first')
  const second = stateQuery(connection, 'second')

  expect(first.queryKey).not.toEqual(second.queryKey)
  expect(JSON.stringify(first.queryKey)).not.toContain(connection.apiTokenInstance)
})

it('rejects a state response without a state', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: true })))
  const client = new QueryClient()

  await expect(client.fetchQuery(stateQuery(connection, 'test'))).rejects.toMatchObject({
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
        outgoingWebhook: 'yes',
        outgoingAPIMessageWebhook: 'yes',
        outgoingMessageWebhook: 'yes',
      }),
    ),
  )
  const client = new QueryClient()

  await expect(client.fetchQuery(settingsQuery(connection, 'test'))).resolves.toEqual({
    webhookUrl: '',
    incoming: true,
    statuses: true,
  })
  client.clear()
})

it('rejects incomplete settings', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ webhookUrl: '' })))
  const client = new QueryClient()

  await expect(client.fetchQuery(settingsQuery(connection, 'test'))).rejects.toMatchObject({
    kind: 'response',
  })
  client.clear()
})
