import { createContext } from 'react'
import type { createChatStore } from './store'

export const ChatContext = createContext<ReturnType<typeof createChatStore> | null>(null)
