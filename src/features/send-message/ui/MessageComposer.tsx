import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useChatStore, type Chat } from '@/entities/chat'
import { Button } from '@/shared/ui/button'
import { useSendMessage } from '../model/useSendMessage'
import styles from './MessageComposer.module.css'

type Props = { chat: Chat; disabled?: boolean }

export const MessageComposer = ({ chat, disabled = false }: Props) => {
  const setDraft = useChatStore((state) => state.setDraft)
  const { send, isSending, error } = useSendMessage(chat)
  const hintId = useId()
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [chat.id])

  useLayoutEffect(() => {
    const element = input.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [chat.draft])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || isSending) return
    send()
  }

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
