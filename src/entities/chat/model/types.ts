import type { Delivery } from './status'

export type Message = {
  id: string
  text: string
  direction: 'incoming' | 'outgoing'
  timestamp: number
}

export type ChatMessage = Message & {
  order: number
}

export type Chat = {
  id: string
  apiChatId: string
  aliases: string[]
  phone?: string
  name?: string
  messages: ChatMessage[]
  draft: string
  statuses: Map<string, Delivery>
}

export type ChatInput = {
  apiChatId: string
  aliases?: string[]
  phone?: string
  name?: string
}
