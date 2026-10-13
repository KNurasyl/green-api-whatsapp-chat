import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query'

import { type Chat, findChat, useChatStoreApi } from '@/entities/chat'
import { useSession } from '@/entities/session'
import { apiError, isRecord } from '@/shared/api'

import { sendMessage } from '../api/sendMessage'
import { getSendError } from '../lib/message'

type SendInput = { chatId: string; apiChatId: string; text: string }

type SendMessage = {
  send: () => void
  isSending: boolean
  error: string | null
}

const belongsToChat = (value: unknown, chat: Chat): boolean =>
  isRecord(value) &&
  (value.chatId === chat.id ||
    (typeof value.apiChatId === 'string' && chat.aliases.includes(value.apiChatId)))

export const useSendMessage = (chat: Chat): SendMessage => {
  const session = useSession((state) => state.session)
  const store = useChatStoreApi()
  const client = useQueryClient()
  const key = ['send', session?.id]
  const attempts = useMutationState({ filters: { mutationKey: key } })

  const mutation = useMutation({
    mutationKey: key,
    retry: false,
    networkMode: 'always',
    gcTime: Infinity,
    mutationFn: async (input: SendInput): Promise<void> => {
      if (!session) throw apiError('validation', 'Сначала подключите WhatsApp.')

      const timestamp = Date.now()
      const order = store.getState().reserveOrder()
      const id = await sendMessage(input.apiChatId, input.text, {
        signal: session.controller.signal,
        key: session.key,
      })

      session.controller.signal.throwIfAborted()
      const state = store.getState()
      const target = findChat(state.chats, input.chatId) ?? findChat(state.chats, input.apiChatId)

      if (!target) return

      state.confirmSend(
        target.id,
        { id, text: input.text, timestamp, direction: 'outgoing' },
        order,
      )
    },
  })

  const send = (): void => {
    const cache = client.getMutationCache()
    const requests = cache.findAll({
      mutationKey: key,
      predicate: (request) => belongsToChat(request.state.variables, chat),
    })

    if (requests.some((request) => request.state.status === 'pending')) return

    for (const request of requests) cache.remove(request)

    mutation.mutate({ chatId: chat.id, apiChatId: chat.apiChatId, text: chat.draft })
  }

  const requests = attempts.filter((attempt) => belongsToChat(attempt.variables, chat))
  const error = requests.find((request) => request.status === 'error')?.error

  return {
    send,
    isSending: requests.some((request) => request.status === 'pending'),
    error: error ? getSendError(error) : null,
  }
}
