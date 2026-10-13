import { createStore, type StoreApi } from 'zustand/vanilla'

import { findChat, mergeChat } from './chat'
import { type Delivery, mergeDelivery } from './status'
import type { Chat, ChatInput, Message } from './types'

export type ChatState = {
  chats: Chat[]
  activeChatId: string | null
  openChat: (input: ChatInput, select?: boolean) => string
  selectChat: (id: string | null) => void
  setDraft: (id: string, text: string) => void
  reserveOrder: () => number
  addMessage: (id: string, message: Message, order?: number) => void
  confirmSend: (id: string, message: Message, order?: number) => void
  setMessageStatus: (id: string, messageId: string, delivery: Delivery) => void
}

export type ChatStore = StoreApi<ChatState>

export const createChatStore = (): ChatStore => {
  let order = 0

  return createStore<ChatState>()((set, get) => ({
    chats: [],
    activeChatId: null,

    openChat: (input, select = true) => {
      const state = get()
      const result = mergeChat(state.chats, input, state.activeChatId)

      set({
        chats: result.chats,
        activeChatId: select ? result.chat.id : result.activeChatId,
      })

      return result.chat.id
    },

    selectChat: (id) => set({ activeChatId: id }),

    setDraft: (id, text) => {
      const chat = findChat(get().chats, id)

      if (!chat || chat.draft === text) return

      set((state) => ({
        chats: state.chats.map((item) => (item.id === chat.id ? { ...item, draft: text } : item)),
      }))
    },

    reserveOrder: () => order++,

    addMessage: (id, message, order) => {
      const chat = findChat(get().chats, id)

      if (!chat || chat.messages.some((item) => item.id === message.id)) return

      const entry = { ...message, order: order ?? get().reserveOrder() }
      const messages = [...chat.messages, entry].sort((first, second) => first.order - second.order)

      set((state) => ({
        chats: state.chats.map((item) => (item.id === chat.id ? { ...item, messages } : item)),
      }))
    },

    confirmSend: (id, message, order) => {
      const state = get()

      state.addMessage(id, message, order)

      const chat = findChat(get().chats, id)

      if (chat?.draft === message.text) state.setDraft(id, '')
    },

    setMessageStatus: (id, messageId, delivery) => {
      const chat = findChat(get().chats, id)

      if (!chat) return

      const current = chat.statuses.get(messageId)
      const next = mergeDelivery(current, delivery)

      if (current === next) return

      const statuses = new Map(chat.statuses).set(messageId, next)

      set((state) => ({
        chats: state.chats.map((item) => (item.id === chat.id ? { ...item, statuses } : item)),
      }))
    },
  }))
}
