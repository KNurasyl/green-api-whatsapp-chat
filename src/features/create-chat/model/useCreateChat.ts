import { useMutation, useQueryClient } from '@tanstack/react-query'

import { findChat, useChatStoreApi } from '@/entities/chat'
import { useSession } from '@/entities/session'
import { apiError, getErrorMessage } from '@/shared/api'

import { checkWhatsapp } from '../api/checkWhatsapp'
import { normalizePhone } from '../lib/phone'

type CreateChat = {
  createChat: (phone: string) => void
  isPending: boolean
  error: string | null
}

export const useCreateChat = (onCreated: () => void): CreateChat => {
  const session = useSession((state) => state.session)
  const store = useChatStoreApi()
  const client = useQueryClient()
  const key = ['create-chat', session?.id]
  const mutation = useMutation({
    mutationKey: key,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async (value: string): Promise<void> => {
      if (!session) throw apiError('validation', 'Сначала подключите WhatsApp.')

      const phone = normalizePhone(value)
      const alias = `${phone}@c.us`
      const existing = findChat(store.getState().chats, alias)

      if (existing?.phone === phone) {
        store.getState().selectChat(existing.id)

        return
      }

      const apiChatId = await checkWhatsapp(session.connection, phone, session.controller.signal)

      session.controller.signal.throwIfAborted()
      store.getState().openChat({ apiChatId, phone, aliases: [alias] })
    },
    onSuccess: onCreated,
  })

  const createChat = (phone: string): void => {
    if (client.isMutating({ mutationKey: key })) return

    mutation.mutate(phone)
  }

  return {
    createChat,
    isPending: mutation.isPending,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
  }
}
