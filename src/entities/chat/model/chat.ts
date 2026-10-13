import type { Chat, ChatInput } from './types'
import { mergeDelivery, type Delivery } from './status'

export const isDirectChat = (id: string) => /^\d+@(c\.us|lid)$/.test(id)

export const findChat = (chats: Chat[], id: string) =>
  chats.find((chat) => chat.id === id || chat.aliases.includes(id))

export const getChatName = (chat: Chat) => {
  if (chat.name) return chat.name
  if (chat.phone) return `+${chat.phone}`
  if (chat.apiChatId.endsWith('@c.us')) return `+${chat.apiChatId.split('@')[0]}`

  return 'Контакт WhatsApp'
}

export const mergeChat = (chats: Chat[], input: ChatInput, activeId: string | null) => {
  const aliases = [...new Set([input.apiChatId, ...(input.aliases ?? [])])]
  const matches = chats.filter((chat) => chat.aliases.some((alias) => aliases.includes(alias)))
  const primary = matches.find((chat) => chat.id === activeId) ?? matches[0]

  if (!primary) {
    const chat: Chat = {
      ...input,
      id: crypto.randomUUID(),
      aliases,
      messages: [],
      draft: '',
      statuses: new Map(),
    }
    return { chats: [...chats, chat], chat, activeChatId: activeId }
  }

  const ordered = [primary, ...matches.filter((chat) => chat.id !== primary.id)]
  const messages = new Map(
    ordered.flatMap((chat) => chat.messages.map((message) => [message.id, message] as const)),
  )
  const drafts = [...new Set(ordered.map((chat) => chat.draft).filter(Boolean))]
  const statuses = new Map<string, Delivery>()
  for (const chat of ordered) {
    for (const [id, delivery] of chat.statuses) {
      statuses.set(id, mergeDelivery(statuses.get(id), delivery))
    }
  }
  const merged: Chat = {
    ...primary,
    apiChatId: input.apiChatId,
    aliases: [...new Set([...aliases, ...ordered.flatMap((chat) => chat.aliases)])],
    phone: input.phone ?? ordered.find((chat) => chat.phone)?.phone,
    name: input.name || ordered.find((chat) => chat.name)?.name,
    messages: [...messages.values()].sort((first, second) => first.timestamp - second.timestamp),
    draft: drafts.join('\n'),
    statuses,
  }
  const ids = new Set(matches.map((chat) => chat.id))

  return {
    chats: chats.flatMap((chat) => {
      if (chat.id === primary.id) return [merged]
      return ids.has(chat.id) ? [] : [chat]
    }),
    chat: merged,
    activeChatId: activeId && ids.has(activeId) ? primary.id : activeId,
  }
}
