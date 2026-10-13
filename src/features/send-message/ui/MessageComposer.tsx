import type { JSX } from 'react'
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef } from 'react'

import { type Chat, useChatStore } from '@/entities/chat'
import { Button } from '@/shared/ui/button'

import { useSendMessage } from '../model/useSendMessage'

import styles from './MessageComposer.module.css'

type MessageComposerProps = { chat: Chat; disabled?: boolean }

export const MessageComposer = ({ chat, disabled = false }: MessageComposerProps): JSX.Element => {
  const setDraft = useChatStore((state) => state.setDraft)
  const { send, isSending, error } = useSendMessage(chat)
  const hintId = useId()
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [chat.id])

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (disabled || isSending) return

    send()
  }

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

    event.preventDefault()
    if (disabled || isSending) return

    send()
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={isSending}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.row}>
        <textarea
          className={styles.input}
          ref={input}
          aria-label="Сообщение"
          aria-describedby={hintId}
          placeholder="Напишите сообщение…"
          rows={2}
          value={chat.draft}
          onChange={(event) => setDraft(chat.id, event.target.value)}
          onKeyDown={keyDown}
        />
        <Button type="submit" disabled={disabled || isSending || !chat.draft.trim()}>
          {isSending ? 'Отправляем…' : 'Отправить'}
        </Button>
      </div>
      <p className={styles.hint} id={hintId}>
        Enter — отправить · Shift + Enter — новая строка
      </p>
    </form>
  )
}
