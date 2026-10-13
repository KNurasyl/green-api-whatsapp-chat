import { afterEach, expect, it, vi } from 'vitest'

import { createSessions } from '../../server/sessions.ts'

const config = {
  apiUrl: 'https://test.api.greenapi.com',
  idInstance: '123',
  apiTokenInstance: 'secret',
}

afterEach(() => vi.useRealTimers())

it('isolates credentials and cancels requests when a session closes', () => {
  const sessions = createSessions()
  const first = sessions.create(config)
  const second = sessions.create({ ...config, apiTokenInstance: 'another-secret' })
  const signal = sessions.get(first).controller.signal

  sessions.remove(first)

  expect(signal.aborted).toBe(true)
  expect(() => sessions.get(first)).toThrow()
  expect(sessions.get(second).config.apiTokenInstance).toBe('another-secret')
  sessions.remove(second)
})

it('expires inactive credentials and extends a session only while it is used', async () => {
  vi.useFakeTimers()

  const sessions = createSessions(1000)
  const key = sessions.create(config)

  await vi.advanceTimersByTimeAsync(900)
  const signal = sessions.get(key).controller.signal

  await vi.advanceTimersByTimeAsync(900)
  expect(signal.aborted).toBe(false)
  await vi.advanceTimersByTimeAsync(100)
  expect(signal.aborted).toBe(true)
  expect(() => sessions.get(key)).toThrow()
})
