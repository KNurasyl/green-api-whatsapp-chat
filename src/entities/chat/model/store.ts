import { createStore } from 'zustand/vanilla'
import { findChat, mergeChat } from './chat'
import type { Chat, ChatInput, Message } from './types'
import { mergeDelivery, type Delivery } from './status'

export type ChatState = {
  chats: Chat[]
  activeChatId: string | null
  openChat: (input: ChatInput, select?: boolean) => string
  selectChat: (id: string | null) => void
  setDraft: (id: string, text: string) => void
  addMessage: (id: string, message: Message) => void
  confirmSend: (id: string, message: Message) => void
  setMessageStatus: (id: string, messageId: string, delivery: Delivery) => void
}

export const createChatStore = () =>
  createStore<ChatState>()((set, get) => ({
    chats: [],
    activeChatId: null,
    setMessageStatus: (id, messageId, delivery) =>
      set((state) => {
        const chat = findChat(state.chats, id)
        if (!chat) return state
        const current = chat.statuses.get(messageId)
        const next = mergeDelivery(current, delivery)
        if (current === next) return state
        const statuses = new Map(chat.statuses).set(messageId, next)
        return {
          chats: state.chats.map((item) => (item.id === chat.id ? { ...item, statuses } : item)),
        }
      }),
    confirmSend: (id, message) => {
      get().addMessage(id, message)
      const chat = findChat(get().chats, id)
      if (chat?.draft === message.text) get().setDraft(id, '')
    },
    openChat: (input, select = true) => {
      const state = get()
      const result = mergeChat(state.chats, input, state.activeChatId)
      set({ chats: result.chats, activeChatId: select ? result.chat.id : result.activeChatId })
      return result.chat.id
    },
    selectChat: (id) => set({ activeChatId: id }),
    setDraft: (id, text) =>
      set((state) => {
        const chat = findChat(state.chats, id)
        if (!chat || chat.draft === text) return state

        return {
          chats: state.chats.map((item) => (item.id === chat.id ? { ...item, draft: text } : item)),
        }
      }),
    addMessage: (id, message) =>
      set((state) => {
        const chat = findChat(state.chats, id)
        if (!chat || chat.messages.some((item) => item.id === message.id)) return state

        const messages = [...chat.messages, message].sort(
          (first, second) => first.timestamp - second.timestamp,
        )
        return {
          chats: state.chats.map((item) => (item.id === chat.id ? { ...item, messages } : item)),
        }
      }),
  }))
