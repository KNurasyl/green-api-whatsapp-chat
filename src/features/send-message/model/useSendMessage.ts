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
  const pending = useMutationState({
    filters: { mutationKey: key, status: 'pending' },
    select: (mutation) => mutation.state.variables,
  })
  const isForChat = (value: unknown) =>
    isRecord(value) &&
    (value.chatId === chat.id ||
      (typeof value.apiChatId === 'string' && chat.aliases.includes(value.apiChatId)))
  const mutation = useMutation({
    mutationKey: key,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
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
    const requests = client.getMutationCache().findAll({ mutationKey: key, status: 'pending' })
    if (requests.some((request) => isForChat(request.state.variables))) return

    mutation.mutate({ chatId: chat.id, apiChatId: chat.apiChatId, text: chat.draft })
  }

  return {
    send,
    isSending: pending.some(isForChat),
    error: mutation.error && isForChat(mutation.variables) ? getSendError(mutation.error) : null,
  }
}
