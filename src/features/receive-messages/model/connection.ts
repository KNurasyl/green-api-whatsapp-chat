import type { QueryClient, QueryKey } from '@tanstack/react-query'

import { checkSettings, type Session, settingsQuery, stateQuery } from '@/entities/session'
import { apiError } from '@/shared/api'
import { delay } from '@/shared/lib/delay'

const waitForQuery = async (
  client: QueryClient,
  key: QueryKey,
  signal: AbortSignal,
): Promise<void> => {
  const cached = client.getQueryState(key)
  const updatedAt = Math.max(cached?.dataUpdatedAt ?? 0, cached?.errorUpdatedAt ?? 0)
  const remaining = Math.max(0, 1000 - (Date.now() - updatedAt))

  await delay(remaining, signal)
}

export const checkAuthorization = async (
  client: QueryClient,
  session: Session,
  signal: AbortSignal,
): Promise<void> => {
  const query = stateQuery(session.id)

  await waitForQuery(client, query.queryKey, signal)

  const state = await client.fetchQuery(query)

  signal.throwIfAborted()

  if (state !== 'authorized') {
    throw apiError('validation', 'WhatsApp отключён. Проверьте авторизацию в кабинете GREEN-API.')
  }
}

export const checkConnection = async (
  client: QueryClient,
  session: Session,
  signal: AbortSignal,
): Promise<void> => {
  await checkAuthorization(client, session, signal)

  const query = settingsQuery(session.id)

  await waitForQuery(client, query.queryKey, signal)

  const settings = await client.fetchQuery(query)

  signal.throwIfAborted()
  checkSettings(settings)
}
