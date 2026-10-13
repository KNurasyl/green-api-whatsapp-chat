import { create } from 'zustand'

export type Session = {
  id: string
  key: string
  controller: AbortController
}

type SessionState = {
  session: Session | null
  open: (id: string, key: string) => void
  close: () => void
}

export const useSession = create<SessionState>()((set, get) => ({
  session: null,
  open: (id, key) => {
    get().session?.controller.abort()
    set({ session: { id, key, controller: new AbortController() } })
  },
  close: () => {
    get().session?.controller.abort()
    set({ session: null })
  },
}))
