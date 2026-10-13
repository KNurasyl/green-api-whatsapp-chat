import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query'
import { findChat, useChatStoreApi, type Chat } from '@/entities/chat'
import { useSession } from '@/entities/session'
import { apiError, isRecord } from '@/shared/api'
import { sendMessage } from '../api/sendMessage'
import { getSendError } from '../lib/message'

type SendInput = { chatId: string; apiChatId: string; text: string }

export const useSendMessage = (chat: Chat) => {
  const session = useSession((state) => state.session)
  const store = useChatStoreApi()
  const client = useQueryClient()
  const key = ['send', session?.id]
  const attempts = useMutationState({ filters: { mutationKey: key } })
  const isForChat = (value: unknown) =>
    isRecord(value) &&
    (value.chatId === chat.id ||
      (typeof value.apiChatId === 'string' && chat.aliases.includes(value.apiChatId)))
  const mutation = useMutation({
    mutationKey: key,
    retry: false,
    networkMode: 'always',
    gcTime: Infinity,
    mutationFn: async (input: SendInput) => {
      if (!session) throw apiError('validation', 'Сначала подключите WhatsApp.')

      const timestamp = Date.now()
      const id = await sendMessage(
        session.connection,
        input.apiChatId,
        input.text,
        session.controller.signal,
      )
      session.controller.signal.throwIfAborted()
      const target =
        findChat(store.getState().chats, input.chatId) ??
        findChat(store.getState().chats, input.apiChatId)
      if (!target) return

      store
        .getState()
        .confirmSend(target.id, { id, text: input.text, timestamp, direction: 'outgoing' })
    },
  })

  const send = () => {
    const cache = client.getMutationCache()
    const requests = cache.findAll({
      mutationKey: key,
      predicate: (request) => isForChat(request.state.variables),
    })
    if (requests.some((request) => request.state.status === 'pending')) return

    for (const request of requests) cache.remove(request)

    mutation.mutate({ chatId: chat.id, apiChatId: chat.apiChatId, text: chat.draft })
  }

  const requests = attempts.filter((attempt) => isForChat(attempt.variables))
  const error = requests.find((request) => request.status === 'error')?.error

  return {
    send,
    isSending: requests.some((request) => request.status === 'pending'),
    error: error ? getSendError(error) : null,
  }
}
