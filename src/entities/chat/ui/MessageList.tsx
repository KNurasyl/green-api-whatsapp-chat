import { useLayoutEffect, useRef } from 'react'
import type { Chat } from '../model/types'
import { statusLabels } from '../model/status'
import styles from './MessageList.module.css'

type Props = { chat: Chat }
const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

export const MessageList = ({ chat }: Props) => {
  const { messages, statuses } = chat
  const list = useRef<HTMLDivElement>(null)
  const followsLatest = useRef(true)
  const last = messages.at(-1)

  useLayoutEffect(() => {
    const element = list.current
    if (!element || (!followsLatest.current && last?.direction !== 'outgoing')) return
    element.scrollTop = element.scrollHeight
  }, [last?.id, last?.direction])

  return (
    <div
      className={styles.scroll}
      ref={list}
      onScroll={(event) => {
        const element = event.currentTarget
        followsLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
      }}
    >
      {!messages.length && (
        <p className={styles.empty}>Начните разговор. Отправьте первое сообщение.</p>
      )}
      <ol
        className={styles.list}
        aria-label="Сообщения"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message) => {
          const status = statuses.get(message.id)?.status
          return (
            <li key={message.id} className={styles.message} data-direction={message.direction}>
              <p>{message.text}</p>
              <div className={styles.meta}>
                <time dateTime={new Date(message.timestamp).toISOString()}>
                  {time.format(message.timestamp)}
                </time>
                {message.direction === 'outgoing' && (
                  <span data-status={status}>{status ? statusLabels[status] : 'Принято API'}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
