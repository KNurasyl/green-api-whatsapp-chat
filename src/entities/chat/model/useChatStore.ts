import { useContext } from 'react'
import { useStore } from 'zustand'

import { ChatContext } from './context'
import type { ChatState, ChatStore } from './store'

export const useChatStoreApi = (): ChatStore => {
  const store = useContext(ChatContext)

  if (!store) throw new Error('ChatProvider is missing')

  return store
}

export const useChatStore = <T>(selector: (state: ChatState) => T): T =>
  useStore(useChatStoreApi(), selector)
