import { useQueryClient } from '@tanstack/react-query'
import type { JSX } from 'react'

import { ChatProvider } from '@/entities/chat'
import { useSession } from '@/entities/session'
import { ChatPage } from '@/pages/chat'
import { ConnectPage } from '@/pages/connect'

export const App = (): JSX.Element => {
  const session = useSession((state) => state.session)
  const close = useSession((state) => state.close)
  const client = useQueryClient()

  const signOut = (): void => {
    session?.controller.abort()
    void client.cancelQueries()
    client.clear()
    close()
  }

  return session ? (
    <ChatProvider key={session.id}>
      <ChatPage onSignOut={signOut} />
    </ChatProvider>
  ) : (
    <ConnectPage />
  )
}
