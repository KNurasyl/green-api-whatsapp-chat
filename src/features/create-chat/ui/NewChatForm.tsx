import { useState, type FormEvent } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useCreateChat } from '../model/useCreateChat'
import styles from './NewChatForm.module.css'

type Props = { onClose: () => void; disabled?: boolean }

export const NewChatForm = ({ onClose, disabled = false }: Props) => {
  const [phone, setPhone] = useState('')
  const { createChat, isPending, error } = useCreateChat(onClose)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || isPending) return
    createChat(phone)
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={isPending}>
      <Input
        label="Номер WhatsApp"
        placeholder="+7 000 000 00 00"
        type="tel"
        autoComplete="off"
        value={phone}
        required
        disabled={isPending}
        onChange={(event) => setPhone(event.target.value)}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={disabled || isPending}>
          {isPending ? 'Проверяем…' : 'Открыть чат'}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
