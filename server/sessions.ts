import { randomBytes } from 'node:crypto'

import type { GreenConfig } from './env.ts'
import { httpError } from './http.ts'

type Session = {
  config: GreenConfig
  controller: AbortController
  timer: ReturnType<typeof setTimeout>
}

export const createSessions = (lifetime = 30 * 60_000) => {
  const sessions = new Map<string, Session>()

  const remove = (key: string): void => {
    const session = sessions.get(key)

    if (!session) return

    clearTimeout(session.timer)
    session.controller.abort()
    sessions.delete(key)
  }

  const create = (config: GreenConfig): string => {
    if (sessions.size >= 100) throw httpError(503, 'Слишком много подключений.')

    const key = randomBytes(32).toString('base64url')
    const timer = setTimeout(() => remove(key), lifetime)

    timer.unref()
    sessions.set(key, { config, controller: new AbortController(), timer })

    return key
  }

  const get = (key: string): Session => {
    const session = sessions.get(key)

    if (!session) throw httpError(401, 'Сессия завершена. Подключитесь снова.')

    session.timer.refresh()

    return session
  }

  return { create, get, remove }
}
