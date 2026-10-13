import { createStore } from 'zustand/vanilla'
import { findChat, mergeChat } from './chat'
import type { Chat, ChatInput, Message } from './types'

export type ChatState = {
  chats: Chat[]
  activeChatId: string | null
  openChat: (input: ChatInput, select?: boolean) => string
  selectChat: (id: string | null) => void
  setDraft: (id: string, text: string) => void
  addMessage: (id: string, message: Message) => void
}

export const createChatStore = () =>
  createStore<ChatState>()((set, get) => ({
    chats: [],
    activeChatId: null,
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
