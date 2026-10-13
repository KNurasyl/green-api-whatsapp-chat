import { randomBytes } from 'node:crypto'

import type { SessionOptions } from 'iron-session'

import type { Environment, GreenConfig } from './env.ts'

export type SessionData = { key: string; config: GreenConfig }

export const sessionOptions = (env: Environment): SessionOptions => {
  const password = env.SESSION_SECRET || randomBytes(32).toString('hex')

  if ((env.VERCEL && !env.SESSION_SECRET) || password.length < 32) {
    throw new Error('Задайте SESSION_SECRET длиной не менее 32 символов.')
  }

  return {
    password,
    cookieName: 'green-chat',
    ttl: 3600,
    cookieOptions: {
      httpOnly: true,
      secure: Boolean(env.VERCEL || env.APP_ORIGIN?.startsWith('https://')),
      sameSite: 'strict',
      path: '/api',
    },
  }
}
