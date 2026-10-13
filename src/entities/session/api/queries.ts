import { queryOptions } from '@tanstack/react-query'

import { apiError, isRecord, request } from '@/shared/api'

import type { Settings } from '../model/settings'
import type { Session } from '../model/store'

const defaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
}

export const stateQuery = (session: Pick<Session, 'id' | 'key'>) =>
  queryOptions({
    ...defaults,
    queryKey: ['session', session.id, 'state'],
    networkMode: 'always',
    queryFn: async ({ signal }): Promise<string> => {
      const data = await request('getStateInstance', { signal, key: session.key })

      if (!isRecord(data) || typeof data.stateInstance !== 'string' || !data.stateInstance) {
        throw apiError('response', 'Не удалось определить состояние инстанса.')
      }

      return data.stateInstance
    },
  })

export const settingsQuery = (session: Pick<Session, 'id' | 'key'>) =>
  queryOptions({
    ...defaults,
    queryKey: ['session', session.id, 'settings'],
    networkMode: 'always',
    queryFn: async ({ signal }): Promise<Settings> => {
      const data = await request('getSettings', { signal, key: session.key })

      if (
        !isRecord(data) ||
        typeof data.webhookUrl !== 'string' ||
        (data.incomingWebhook !== 'yes' && data.incomingWebhook !== 'no') ||
        (data.stateWebhook !== 'yes' && data.stateWebhook !== 'no')
      ) {
        throw apiError('response', 'Не удалось прочитать настройки инстанса.')
      }

      return {
        webhookUrl: data.webhookUrl,
        incoming: data.incomingWebhook === 'yes',
        stateChanges: data.stateWebhook === 'yes',
        statuses:
          data.outgoingWebhook === 'yes' &&
          data.outgoingAPIMessageWebhook === 'yes' &&
          data.outgoingMessageWebhook === 'yes',
      }
    },
  })
