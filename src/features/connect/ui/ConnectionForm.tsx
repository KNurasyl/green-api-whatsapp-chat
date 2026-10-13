import type { FormEvent, JSX } from 'react'

import { Button } from '@/shared/ui/button'

import { useConnect } from '../model/useConnect'

import styles from './ConnectionForm.module.css'

export const ConnectionForm = (): JSX.Element => {
  const { connect, isPending, error, cancel } = useConnect()

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (isPending) return

    connect()
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={isPending}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Подключаемся…' : 'Подключиться'}
      </Button>

      {isPending && (
        <Button variant="ghost" onClick={cancel}>
          Отменить
        </Button>
      )}

      <p className={styles.note}>Реквизиты подключения хранятся на сервере.</p>
    </form>
  )
}
