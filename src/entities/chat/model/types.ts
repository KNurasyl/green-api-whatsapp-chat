export type Message = {
  id: string
  text: string
  direction: 'incoming' | 'outgoing'
  timestamp: number
}

export type Chat = {
  id: string
  apiChatId: string
  aliases: string[]
  phone?: string
  name?: string
  messages: Message[]
  draft: string
}

export type ChatInput = {
  apiChatId: string
  aliases?: string[]
  phone?: string
  name?: string
}
