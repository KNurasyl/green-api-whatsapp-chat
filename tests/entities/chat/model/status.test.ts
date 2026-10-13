import { describe, expect, it } from 'vitest'

import { mergeDelivery } from '@/entities/chat/model/status'
import { createChatStore } from '@/entities/chat/model/store'

describe('delivery status', () => {
  it('never downgrades delivery progress because an older event arrives late', () => {
    expect(
      mergeDelivery({ status: 'read', timestamp: 1000 }, { status: 'sent', timestamp: 2000 })
        .status,
    ).toBe('read')
    expect(
      mergeDelivery({ status: 'delivered', timestamp: 2000 }, { status: 'read', timestamp: 1000 })
        .status,
    ).toBe('read')
    expect(
      mergeDelivery({ status: 'read', timestamp: 1000 }, { status: 'failed', timestamp: 2000 })
        .status,
    ).toBe('read')
  })

  it('shows failures before delivery and accepts later confirmed delivery', () => {
    expect(
      mergeDelivery({ status: 'sent', timestamp: 1000 }, { status: 'failed', timestamp: 2000 })
        .status,
    ).toBe('failed')
    expect(
      mergeDelivery({ status: 'failed', timestamp: 2000 }, { status: 'delivered', timestamp: 3000 })
        .status,
    ).toBe('delivered')
  })

  it('keeps a status that arrives before the message and merges aliases without regression', () => {
    const store = createChatStore()
    const phone = '79990000000@c.us'
    const lid = '123456789@lid'

    store.getState().openChat({ apiChatId: phone })
    store.getState().setMessageStatus(phone, 'message-1', { status: 'read', timestamp: 1000 })
    store.getState().openChat({ apiChatId: lid })
    store.getState().setMessageStatus(lid, 'message-1', { status: 'sent', timestamp: 2000 })
    store.getState().openChat({ apiChatId: lid, aliases: [phone] })
    store
      .getState()
      .confirmSend(lid, { id: 'message-1', text: 'Привет', direction: 'outgoing', timestamp: 1000 })

    expect(store.getState().chats).toHaveLength(1)
    expect(store.getState().chats[0]?.statuses.get('message-1')?.status).toBe('read')
    expect(store.getState().chats[0]?.messages).toHaveLength(1)
  })
})
