import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { findChat, useChatStoreApi } from '@/entities/chat'
import { settingsQuery, stateQuery, useSession } from '@/entities/session'
import { apiError, getErrorMessage } from '@/shared/api'
import { delay } from '@/shared/lib/delay'
import { deleteNotification, receiveNotification } from '../api/queue'
import { pollNotifications } from './poll'

export const useReceiveMessages = () => {
  const session = useSession((state) => state.session)
  const store = useChatStoreApi()
  const client = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'paused'>(
    'connecting',
  )
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
    const input = { connection: session.connection, signal }
    const checkState = async () => {
      const query = stateQuery(session.connection, session.id)
      const cached = client.getQueryState(query.queryKey)
      const updatedAt = Math.max(cached?.dataUpdatedAt ?? 0, cached?.errorUpdatedAt ?? 0)
      await delay(Math.max(0, 1000 - (Date.now() - updatedAt)), signal)
      const state = await client.fetchQuery(query)
      signal.throwIfAborted()
      if (state !== 'authorized') {
        throw apiError(
          'validation',
          'WhatsApp отключён. Проверьте авторизацию в кабинете GREEN-API.',
        )
      }
    }
    running.current = running.current.then(async () => {
      if (signal.aborted) return
      setError(null)
      setStatus('connecting')
      try {
        const query = settingsQuery(session.connection, session.id)
        if (attempt > 0) {
          await checkState()
          const cached = client.getQueryState(query.queryKey)
          const updatedAt = Math.max(cached?.dataUpdatedAt ?? 0, cached?.errorUpdatedAt ?? 0)
          await delay(Math.max(0, 1000 - (Date.now() - updatedAt)), signal)
          const settings = await client.fetchQuery(query)
          signal.throwIfAborted()
          if (settings.webhookUrl || !settings.incoming) {
            throw apiError(
              'validation',
              'Очистите webhookUrl и включите входящие уведомления в кабинете GREEN-API.',
            )
          }
        }
        if (client.getQueryData(query.queryKey)?.statuses === false) {
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
            if (event.type === 'status') {
              store.getState().setMessageStatus(event.chatId, event.messageId, event.delivery)
            }
            if (event.type === 'quota') {
              setNotice('Достигнут лимит тарифа. Проверьте ограничения в кабинете GREEN-API.')
            }
            if (event.type !== 'message') return
            const state = store.getState()
            const chat = findChat(state.chats, event.chatId)
            const id =
              chat?.id ?? state.openChat({ apiChatId: event.chatId, name: event.name }, false)
            state.addMessage(id, event.message)
          },
          afterEvent: async (event) => {
            if (event.type !== 'state' || event.state === 'authorized') return
            await checkState()
          },
        })
      } catch (reason) {
        if (!signal.aborted) {
          setError(getErrorMessage(reason))
          setStatus('paused')
        }
      }
    })
    return () => controller.abort()
  }, [session, store, client, receive, acknowledge, attempt])

  const resume = () => {
    setNotice(null)
    setAttempt((value) => value + 1)
  }

  return { error, notice, resume, status }
}
