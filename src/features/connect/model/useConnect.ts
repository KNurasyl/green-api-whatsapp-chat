import { isCancelledError, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import {
  checkSettings,
  closeSession,
  createSession,
  type Credentials,
  settingsQuery,
  stateQuery,
  useSession,
} from '@/entities/session'
import { apiError, getErrorMessage, isAborted, isRecord, request } from '@/shared/api'

type Attempt = { id: string; controller: AbortController }

type Connect = {
  connect: (credentials?: Credentials) => void
  cancel: () => void
  isPending: boolean
  hasEnv: boolean
  error: string | null
}

export const useConnect = (): Connect => {
  const client = useQueryClient()
  const attempt = useRef<Attempt | null>(null)
  const input = useRef<Credentials | undefined>(undefined)
  const open = useSession((state) => state.open)
  const config = useQuery({
    queryKey: ['config'],
    retry: false,
    queryFn: async ({ signal }): Promise<boolean> => {
      const data = await request('config', { signal })

      return isRecord(data) && data.configured === true
    },
  })

  const mutation = useMutation({
    mutationKey: ['connect'],
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async (): Promise<void> => {
      const current = attempt.current
      const credentials = input.current

      input.current = undefined
      if (!current) throw new DOMException('Aborted', 'AbortError')

      const { id, controller } = current
      let key: string | undefined

      try {
        key = await createSession(credentials, controller.signal)
        controller.signal.throwIfAborted()

        const session = { id, key }
        const state = await client.fetchQuery(stateQuery(session))

        controller.signal.throwIfAborted()

        if (state !== 'authorized') {
          throw apiError('validation', 'Сначала привяжите WhatsApp в кабинете GREEN-API.')
        }

        const settings = await client.fetchQuery(settingsQuery(session))

        controller.signal.throwIfAborted()
        checkSettings(settings)
        open(id, key)
      } finally {
        if (attempt.current === current) attempt.current = null

        if (useSession.getState().session?.id !== id) {
          client.removeQueries({ queryKey: ['session', id] })
          if (key) await closeSession(key).catch(() => undefined)
        }
      }
    },
  })

  useEffect(
    () => () => {
      const current = attempt.current

      attempt.current = null
      input.current = undefined
      current?.controller.abort()
      if (current) void client.cancelQueries({ queryKey: ['session', current.id] })
    },
    [client],
  )

  const cancel = (): void => {
    const current = attempt.current

    attempt.current = null
    input.current = undefined
    current?.controller.abort()
    if (current) void client.cancelQueries({ queryKey: ['session', current.id] })

    mutation.reset()
  }

  const connect = (credentials?: Credentials): void => {
    if (client.isMutating({ mutationKey: ['connect'] })) return

    input.current = credentials
    attempt.current = { id: crypto.randomUUID(), controller: new AbortController() }
    mutation.mutate()
  }

  const error = mutation.error
  const message =
    error && !isAborted(error) && !isCancelledError(error) ? getErrorMessage(error) : null

  return {
    connect,
    isPending: mutation.isPending,
    hasEnv: config.data === true,
    error: message,
    cancel,
  }
}
