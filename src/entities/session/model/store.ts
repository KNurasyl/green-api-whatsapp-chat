import { create } from 'zustand'

export type Session = {
  id: string
  controller: AbortController
}

type SessionState = {
  session: Session | null
  open: (id: string) => void
  close: () => void
}

export const useSession = create<SessionState>()((set, get) => ({
  session: null,
  open: (id) => {
    get().session?.controller.abort()
    set({ session: { id, controller: new AbortController() } })
  },
  close: () => {
    get().session?.controller.abort()
    set({ session: null })
  },
}))
