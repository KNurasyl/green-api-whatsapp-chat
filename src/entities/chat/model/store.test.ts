import { describe, expect, it } from 'vitest'
import { getChatName } from './chat'
import { createChatStore } from './store'

const phone = '79990000000@c.us'
const lid = '123456789012345@lid'
const message = { id: 'message-1', text: 'Привет', direction: 'incoming' as const, timestamp: 1000 }

describe('chats', () => {
  it('keeps drafts separate when switching chats', () => {
    const store = createChatStore()
    const first = store.getState().openChat({ apiChatId: phone })
    store.getState().setDraft(first, 'Первый')
    const second = store.getState().openChat({ apiChatId: lid })
    store.getState().setDraft(second, 'Второй')
    store.getState().selectChat(first)

    expect(store.getState().activeChatId).toBe(first)
    expect(store.getState().chats.map((chat) => chat.draft)).toEqual(['Первый', 'Второй'])
  })

  it('joins confirmed aliases without losing the active chat, messages or drafts', () => {
    const store = createChatStore()
    const first = store.getState().openChat({ apiChatId: phone })
    store.getState().setDraft(first, 'Первый')
    store.getState().addMessage(phone, message)
    const second = store.getState().openChat({ apiChatId: lid })
    store.getState().setDraft(second, 'Второй')
    store.getState().addMessage(lid, message)
    store.getState().addMessage(lid, { ...message, id: 'message-2', timestamp: 2000 })
    const result = store
      .getState()
      .openChat({ apiChatId: lid, aliases: [phone], phone: '79990000000' })

    expect(result).toBe(second)
    expect(store.getState().chats).toHaveLength(1)
    expect(store.getState().chats[0]).toMatchObject({
      id: second,
      apiChatId: lid,
      aliases: [lid, phone],
      phone: '79990000000',
      draft: 'Второй\nПервый',
    })
    expect(store.getState().chats[0]?.messages.map((item) => item.id)).toEqual([
      'message-1',
      'message-2',
    ])
  })

  it('deduplicates messages within a chat and resolves old aliases after merging', () => {
    const store = createChatStore()
    store.getState().openChat({ apiChatId: lid, aliases: [phone] })
    store.getState().addMessage(phone, message)
    store.getState().addMessage(lid, message)
    store.getState().openChat({ apiChatId: '79991111111@c.us' }, false)
    store.getState().addMessage('79991111111@c.us', message)

    expect(store.getState().chats.map((chat) => chat.messages.length)).toEqual([1, 1])
  })

  it('does not switch the active chat when a new contact arrives', () => {
    const store = createChatStore()
    const active = store.getState().openChat({ apiChatId: phone })
    store.getState().openChat({ apiChatId: lid }, false)

    expect(store.getState().activeChatId).toBe(active)
  })

  it('does not treat a lid as a phone number or share state between sessions', () => {
    const store = createChatStore()
    store.getState().openChat({ apiChatId: lid })
    const chat = store.getState().chats[0]
    if (!chat) throw new Error('Missing test chat')

    expect(getChatName(chat)).toBe('Контакт WhatsApp')
    expect(createChatStore().getState().chats).toEqual([])
  })
})
