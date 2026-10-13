import { type ChatStore, findChat } from '@/entities/chat'

import type { ChatEvent } from '../api/notification'

export const applyEvent = (store: ChatStore, event: ChatEvent): string | null => {
  const state = store.getState()

  if (event.type === 'status') {
    state.setMessageStatus(event.chatId, event.messageId, event.delivery)

    return null
  }

  if (event.type === 'quota') {
    return 'Достигнут лимит тарифа. Проверьте ограничения в кабинете GREEN-API.'
  }

  if (event.type !== 'message') return null

  const chat = findChat(state.chats, event.chatId)
  const id = chat?.id ?? state.openChat({ apiChatId: event.chatId, name: event.name }, false)

  state.addMessage(id, event.message)

  return null
}
