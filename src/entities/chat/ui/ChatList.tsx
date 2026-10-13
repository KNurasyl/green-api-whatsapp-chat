import type { JSX } from 'react'

import { getChatName } from '../model/chat'
import { useChatStore } from '../model/useChatStore'

import styles from './ChatList.module.css'

export const ChatList = (): JSX.Element => {
  const chats = useChatStore((state) => state.chats)
  const activeId = useChatStore((state) => state.activeChatId)
  const selectChat = useChatStore((state) => state.selectChat)

  if (!chats.length) {
    return (
      <p className={styles.empty}>
        Пока нет чатов.
        <br />
        Добавьте номер собеседника.
      </p>
    )
  }

  return (
    <ul className={styles.list} aria-label="Чаты">
      {chats.map((chat) => (
        <li key={chat.id}>
          <button
            className={styles.chat}
            onClick={() => selectChat(chat.id)}
            aria-current={chat.id === activeId ? 'true' : undefined}
          >
            <span className={styles.avatar} aria-hidden="true">
              {chat.phone?.slice(-2) ?? getChatName(chat).slice(0, 1)}
            </span>
            <span className={styles.content}>
              <span className={styles.name}>{getChatName(chat)}</span>
              <span className={styles.preview}>
                {chat.draft
                  ? `Черновик: ${chat.draft}`
                  : chat.messages.at(-1)?.text || 'Начните разговор'}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
