import { queryOptions } from '@tanstack/react-query'
import { apiError, isRecord, request, type Connection } from '@/shared/api'

const defaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
}

export const stateQuery = (connection: Connection, sessionId: string) =>
  queryOptions({
    ...defaults,
    queryKey: ['session', sessionId, 'state'],
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      const data = await request(connection, 'getStateInstance', { signal })

      if (!isRecord(data) || typeof data.stateInstance !== 'string' || !data.stateInstance) {
        throw apiError('response', 'Не удалось определить состояние инстанса.')
      }

      return data.stateInstance
    },
  })

export const settingsQuery = (connection: Connection, sessionId: string) =>
  queryOptions({
    ...defaults,
    queryKey: ['session', sessionId, 'settings'],
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      const data = await request(connection, 'getSettings', { signal })

      if (
        !isRecord(data) ||
        typeof data.webhookUrl !== 'string' ||
        (data.incomingWebhook !== 'yes' && data.incomingWebhook !== 'no')
      ) {
        throw apiError('response', 'Не удалось прочитать настройки инстанса.')
      }

      return {
        webhookUrl: data.webhookUrl,
        incoming: data.incomingWebhook === 'yes',
        statuses:
          data.outgoingWebhook === 'yes' &&
          data.outgoingAPIMessageWebhook === 'yes' &&
          data.outgoingMessageWebhook === 'yes',
      }
    },
  })
