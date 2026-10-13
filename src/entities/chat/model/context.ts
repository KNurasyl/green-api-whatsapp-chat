import { createContext } from 'react'

import type { ChatStore } from './store'

export const ChatContext = createContext<ChatStore | null>(null)
