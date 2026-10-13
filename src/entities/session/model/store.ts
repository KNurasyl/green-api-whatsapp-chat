import { create } from 'zustand'

import type { Connection } from '@/shared/api'

export type Session = {
  id: string
  connection: Connection
  controller: AbortController
}

type SessionState = {
  session: Session | null
  open: (connection: Connection, id: string) => void
  close: () => void
}

export const useSession = create<SessionState>()((set, get) => ({
  session: null,
  open: (connection, id) => {
    get().session?.controller.abort()
    set({ session: { id, connection, controller: new AbortController() } })
  },
  close: () => {
    get().session?.controller.abort()
    set({ session: null })
  },
}))
