import { useState, type PropsWithChildren } from 'react'
import { ChatContext } from './context'
import { createChatStore } from './store'

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const [store] = useState(createChatStore)
  return <ChatContext value={store}>{children}</ChatContext>
}
