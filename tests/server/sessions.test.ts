import { expect, it } from 'vitest'

import { sessionOptions } from '../../server/sessions.ts'

it('requires a stable secret in Vercel and sets secure cookie boundaries', () => {
  expect(() => sessionOptions({ VERCEL: '1' })).toThrow('SESSION_SECRET')
  expect(() => sessionOptions({ SESSION_SECRET: 'short' })).toThrow('SESSION_SECRET')

  const options = sessionOptions({
    VERCEL: '1',
    SESSION_SECRET: 'a-secure-test-password-with-more-than-32-characters',
  })

  expect(options.cookieOptions).toEqual({
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api',
  })
  expect(options.ttl).toBe(3600)
})

it('uses a temporary secret only for local development', () => {
  const first = sessionOptions({})
  const second = sessionOptions({})

  expect(first.password).not.toBe(second.password)
  expect(first.cookieOptions?.secure).toBe(false)
})
