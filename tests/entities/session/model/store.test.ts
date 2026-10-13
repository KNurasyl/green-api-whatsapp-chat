import { afterEach, expect, it } from 'vitest'
import { useSession } from '@/entities/session/model/store'

const connection = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

afterEach(() => useSession.getState().close())

it('cancels the old session before opening a new one', () => {
  useSession.getState().open(connection, 'first')
  const first = useSession.getState().session
  useSession.getState().open(connection, 'second')

  expect(first?.controller.signal.aborted).toBe(true)
  expect(useSession.getState().session?.id).toBe('second')
  expect(useSession.getState().session?.controller.signal.aborted).toBe(false)
})

it('drops credentials and cancels requests on exit', () => {
  useSession.getState().open(connection, 'first')
  const session = useSession.getState().session
  useSession.getState().close()

  expect(session?.controller.signal.aborted).toBe(true)
  expect(useSession.getState().session).toBeNull()
})
