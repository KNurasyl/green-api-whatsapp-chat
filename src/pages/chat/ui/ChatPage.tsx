import type { JSX } from 'react'
import { useState } from 'react'

import { ChatList, getChatName, MessageList, useChatStore } from '@/entities/chat'
import { NewChatForm } from '@/features/create-chat'
import { useReceiveMessages } from '@/features/receive-messages'
import { MessageComposer } from '@/features/send-message'
import { Button } from '@/shared/ui/button'

import styles from './ChatPage.module.css'

type ChatPageProps = { onSignOut: () => void }

const connectionLabels = {
  connecting: 'Проверяем подключение…',
  connected: 'WhatsApp подключён',
  reconnecting: 'Восстанавливаем связь…',
  paused: 'Получение приостановлено',
}

export const ChatPage = ({ onSignOut }: ChatPageProps): JSX.Element => {
  const [isCreating, setIsCreating] = useState(false)
  const chat = useChatStore((state) => state.chats.find((item) => item.id === state.activeChatId))
  const selectChat = useChatStore((state) => state.selectChat)
  const { error, notice, resume, status } = useReceiveMessages()
  const noticeText =
    error ||
    notice ||
    (status === 'reconnecting'
      ? 'Связь прервалась. Подключаемся снова; сообщения и черновики сохранены.'
      : null)

  return (
    <main
      className={styles.layout}
      data-chat-open={Boolean(chat)}
      data-has-notice={Boolean(noticeText)}
    >
      {noticeText && (
        <div className={styles.notice} role="status">
          <p>{noticeText}</p>
          {error && (
            <Button variant="ghost" onClick={resume}>
              Возобновить
            </Button>
          )}
        </div>
      )}
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <span className={styles.mark}>G</span>
            <span>
              GREEN-API <small>WhatsApp Chat</small>
            </span>
          </div>
          <Button variant="ghost" onClick={onSignOut}>
            Выйти
          </Button>
        </header>
        <div className={styles.toolbar}>
          <h1>Сообщения</h1>
          <Button
            variant="ghost"
            onClick={() => setIsCreating((value) => !value)}
            aria-expanded={isCreating}
            disabled={status !== 'connected'}
          >
            + Новый чат
          </Button>
        </div>
        {isCreating && (
          <NewChatForm onClose={() => setIsCreating(false)} disabled={status !== 'connected'} />
        )}
        <div className={styles.chatList}>
          <ChatList />
        </div>
        <div className={styles.connection}>
          <span data-paused={status !== 'connected'} /> {connectionLabels[status]}
        </div>
      </aside>
      <section className={styles.conversation} aria-label="Разговор">
        {chat ? (
          <>
            <header className={styles.chatHeader}>
              <Button
                className={styles.back}
                variant="ghost"
                onClick={() => selectChat(null)}
                aria-label="Назад к чатам"
              >
                ←
              </Button>
              <div>
                <h2>{getChatName(chat)}</h2>
                <p>Личный чат · WhatsApp</p>
              </div>
            </header>
            <MessageList key={chat.id} chat={chat} />
            <MessageComposer chat={chat} disabled={status !== 'connected'} />
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.symbol} aria-hidden="true">
              ↗
            </span>
            <h2>Всё начинается с сообщения</h2>
            <p>
              Создайте новый чат или выберите
              <br />
              собеседника в списке слева.
            </p>
            <Button onClick={() => setIsCreating(true)} disabled={status !== 'connected'}>
              Начать разговор
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}
