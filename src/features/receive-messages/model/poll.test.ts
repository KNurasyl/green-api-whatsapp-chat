import { describe, expect, it, vi } from 'vitest'
import type { Notification } from '../api/notification'
import { pollNotifications } from './poll'

const notification: Notification = { receiptId: 123, event: { type: 'skip' } }

describe('notification queue', () => {
  it('applies an event before acknowledging it and waits before reading again', async () => {
    const controller = new AbortController()
    const order: string[] = []
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const receive = vi.fn<() => Promise<Notification | null>>().mockResolvedValue(notification)
    const task = pollNotifications({
      signal: controller.signal,
      receive,
      apply: () => {
        order.push('apply')
      },
      acknowledge: async (id) => {
        order.push(`ack ${id}`)
        await gate
      },
      afterEvent: () => {
        order.push('after')
        controller.abort()
        return Promise.resolve()
      },
    })
    const done = expect(task).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(order).toEqual(['apply', 'ack 123']))
    expect(receive).toHaveBeenCalledTimes(1)
    release()
    await done
    expect(order).toEqual(['apply', 'ack 123', 'after'])
  })

  it('stops on a failed acknowledgement without advancing the queue', async () => {
    const receive = vi.fn<() => Promise<Notification | null>>().mockResolvedValue(notification)
    const acknowledge = vi
      .fn<(id: number) => Promise<void>>()
      .mockRejectedValue(new Error('ack failed'))
    await expect(
      pollNotifications({
        signal: new AbortController().signal,
        receive,
        acknowledge,
        apply: () => {},
        afterEvent: async () => {},
      }),
    ).rejects.toThrow('ack failed')
    expect(receive).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledWith(123)
  })

  it('does not apply or delete an event received after logout', async () => {
    const controller = new AbortController()
    const apply = vi.fn()
    const acknowledge = vi.fn<(id: number) => Promise<void>>()
    await expect(
      pollNotifications({
        signal: controller.signal,
        receive: () => {
          controller.abort()
          return Promise.resolve(notification)
        },
        acknowledge,
        apply,
        afterEvent: async () => {},
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(apply).not.toHaveBeenCalled()
    expect(acknowledge).not.toHaveBeenCalled()
  })
})
