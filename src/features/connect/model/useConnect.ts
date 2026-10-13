import { isCancelledError, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { checkSettings, settingsQuery, stateQuery, useSession } from '@/entities/session'
import {
  apiError,
  getErrorMessage,
  isAborted,
  parseConnection,
  type Connection,
} from '@/shared/api'

export const useConnect = () => {
  const client = useQueryClient()
  const attempt = useRef<string | null>(null)
  const open = useSession((state) => state.open)
  const mutation = useMutation({
    mutationKey: ['connect'],
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async (input: Connection) => {
      const connection = parseConnection(input)
      const id = crypto.randomUUID()
      attempt.current = id

      try {
        const state = await client.fetchQuery(stateQuery(connection, id))

        if (attempt.current !== id) throw new DOMException('Aborted', 'AbortError')

        if (state !== 'authorized') {
          throw apiError(
            'validation',
            'Сначала привяжите WhatsApp и дождитесь авторизации в кабинете GREEN-API.',
          )
        }

        const settings = await client.fetchQuery(settingsQuery(connection, id))

        if (attempt.current !== id) throw new DOMException('Aborted', 'AbortError')

        checkSettings(settings)
        open(connection, id)
      } finally {
        if (attempt.current === id) attempt.current = null
        if (useSession.getState().session?.id !== id) {
          client.removeQueries({ queryKey: ['session', id] })
        }
      }
    },
  })

  useEffect(
    () => () => {
      const id = attempt.current
      attempt.current = null
      if (id) void client.cancelQueries({ queryKey: ['session', id] })
    },
    [client],
  )

  const cancel = () => {
    const id = attempt.current
    attempt.current = null
    if (id) void client.cancelQueries({ queryKey: ['session', id] })
    mutation.reset()
  }

  const error = mutation.error
  const message =
    error && !isAborted(error) && !isCancelledError(error) ? getErrorMessage(error) : null

  const connect = (input: Connection) => {
    if (client.isMutating({ mutationKey: ['connect'] })) return
    mutation.mutate(input)
  }

  return { connect, isPending: mutation.isPending, error: message, cancel }
}
