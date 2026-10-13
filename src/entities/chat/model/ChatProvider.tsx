import type { JSX } from 'react'
import { type PropsWithChildren, useState } from 'react'

import { ChatContext } from './context'
import { createChatStore } from './store'

export const ChatProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [store] = useState(createChatStore)

  return <ChatContext value={store}>{children}</ChatContext>
}
