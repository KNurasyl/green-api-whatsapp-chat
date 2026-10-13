import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { useChatStoreApi } from '@/entities/chat'
import { settingsQuery, useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api'

import { deleteNotification, receiveNotification } from '../api/queue'
import { applyEvent } from './applyEvent'
import { checkAuthorization, checkConnection } from './connection'
import { pollNotifications } from './poll'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'paused'

type ReceiveMessages = {
  error: string | null
  notice: string | null
  status: ConnectionStatus
  resume: () => void
}

export const useReceiveMessages = (): ReceiveMessages => {
  const session = useSession((state) => state.session)
  const store = useChatStoreApi()
  const client = useQueryClient()

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [attempt, setAttempt] = useState(0)
  const running = useRef(Promise.resolve())

  const { mutateAsync: receive } = useMutation({
    mutationKey: ['receive', session?.id],
    mutationFn: receiveNotification,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  })

  const { mutateAsync: acknowledge } = useMutation({
    mutationKey: ['acknowledge', session?.id],
    mutationFn: deleteNotification,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  })

  useEffect(() => {
    if (!session) return

    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, session.controller.signal])
    const input = { signal }

    const run = async (): Promise<void> => {
      if (signal.aborted) return

      setError(null)
      setStatus('connecting')

      try {
        if (attempt > 0) await checkConnection(client, session, signal)

        const query = settingsQuery(session.id)
        const settings = client.getQueryData(query.queryKey)

        if (settings?.statuses === false) {
          setNotice('Статусы доставки отключены в настройках инстанса.')
        }

        setStatus('connected')

        await pollNotifications({
          signal,
          receive: () => receive(input),
          acknowledge: (receiptId) => acknowledge({ ...input, receiptId }),

          onConnection: (next) => {
            if (!signal.aborted) setStatus(next)
          },

          apply: (event) => {
            const message = applyEvent(store, event)

            if (message) setNotice(message)
          },

          afterEvent: async (event) => {
            if (event.type !== 'state' || event.state === 'authorized') return

            await checkAuthorization(client, session, signal)
          },
        })
      } catch (reason) {
        if (signal.aborted) return

        setError(getErrorMessage(reason))
        setStatus('paused')
      }
    }

    running.current = running.current.then(run)

    return () => controller.abort()
  }, [session, store, client, receive, acknowledge, attempt])

  const resume = (): void => {
    setNotice(null)
    setAttempt((value) => value + 1)
  }

  return { error, notice, resume, status }
}
