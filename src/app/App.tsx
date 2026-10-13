import { useQueryClient } from '@tanstack/react-query'
import { ChatPage } from '@/pages/chat'
import { ConnectPage } from '@/pages/connect'
import { useSession } from '@/entities/session'

export const App = () => {
  const session = useSession((state) => state.session)
  const close = useSession((state) => state.close)
  const client = useQueryClient()

  const signOut = () => {
    session?.controller.abort()
    void client.cancelQueries()
    client.clear()
    close()
  }

  return session ? <ChatPage key={session.id} onSignOut={signOut} /> : <ConnectPage />
}
