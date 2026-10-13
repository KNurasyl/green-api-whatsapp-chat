import { useState } from 'react'
import { NewChatForm } from '@/features/create-chat'
import { MessageComposer } from '@/features/send-message'
import { useReceiveMessages } from '@/features/receive-messages'
import { ChatList, MessageList, getChatName, useChatStore } from '@/entities/chat'
import { Button } from '@/shared/ui/button'
import styles from './ChatPage.module.css'

type Props = { onSignOut: () => void }

export const ChatPage = ({ onSignOut }: Props) => {
  const [isCreating, setIsCreating] = useState(false)
  const chat = useChatStore((state) => state.chats.find((item) => item.id === state.activeChatId))
  const selectChat = useChatStore((state) => state.selectChat)
  const { error, notice, resume } = useReceiveMessages()

  return (
    <main className={styles.layout} data-chat-open={Boolean(chat)}>
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
          >
            + Новый чат
          </Button>
        </div>
        {isCreating && <NewChatForm onClose={() => setIsCreating(false)} />}
        <div className={styles.chatList}>
          <ChatList />
        </div>
        <div className={styles.connection}>
          <span data-paused={Boolean(error)} />{' '}
          {error ? 'Получение приостановлено' : 'WhatsApp подключён'}
        </div>
      </aside>
      <section className={styles.conversation} aria-label="Разговор">
        {(error || notice) && (
          <div className={styles.notice} role="status">
            <p>{error || notice}</p>
            {error && (
              <Button variant="ghost" onClick={resume}>
                Возобновить
              </Button>
            )}
          </div>
        )}
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
            <MessageComposer chat={chat} disabled={Boolean(error)} />
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
            <Button onClick={() => setIsCreating(true)}>Начать разговор</Button>
          </div>
        )}
      </section>
    </main>
  )
}
