import { afterEach, expect, it } from 'vitest'

import { useSession } from '@/entities/session/model/store'

afterEach(() => useSession.getState().close())

it('cancels the old session before opening a new one', () => {
  useSession.getState().open('first', 'test-key')
  const first = useSession.getState().session

  useSession.getState().open('second', 'test-key')

  expect(first?.controller.signal.aborted).toBe(true)
  expect(useSession.getState().session?.id).toBe('second')
  expect(useSession.getState().session?.controller.signal.aborted).toBe(false)
})

it('clears the session and cancels requests on exit', () => {
  useSession.getState().open('first', 'test-key')
  const session = useSession.getState().session

  useSession.getState().close()

  expect(session?.controller.signal.aborted).toBe(true)
  expect(useSession.getState().session).toBeNull()
})
