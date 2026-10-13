import type { FormEvent, JSX } from 'react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

import { useConnect } from '../model/useConnect'

import styles from './ConnectionForm.module.css'

export const ConnectionForm = (): JSX.Element => {
  const { connect, isPending, hasEnv, error, cancel } = useConnect()

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (isPending) return

    const form = event.currentTarget
    const data = new FormData(form)
    const apiUrl = data.get('apiUrl')
    const idInstance = data.get('idInstance')
    const apiTokenInstance = data.get('apiTokenInstance')

    if (
      typeof apiUrl !== 'string' ||
      typeof idInstance !== 'string' ||
      typeof apiTokenInstance !== 'string'
    )
      return

    connect({
      apiUrl,
      idInstance,
      apiTokenInstance,
    })
    const token = form.elements.namedItem('apiTokenInstance')

    if (token instanceof HTMLInputElement) token.value = ''
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={isPending}>
      <Input
        label="Адрес API"
        name="apiUrl"
        type="url"
        placeholder="https://…api.greenapi.com"
        hint="Скопируйте apiUrl из кабинета GREEN-API"
        autoComplete="off"
        required
        disabled={isPending}
      />
      <Input
        label="ID инстанса"
        name="idInstance"
        inputMode="numeric"
        pattern="[0-9]+"
        autoComplete="off"
        required
        disabled={isPending}
      />
      <Input
        label="Токен инстанса"
        name="apiTokenInstance"
        type="password"
        autoComplete="off"
        required
        disabled={isPending}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Подключаемся…' : 'Подключиться'}
      </Button>

      {hasEnv && (
        <Button variant="ghost" disabled={isPending} onClick={() => connect()}>
          Использовать локальный .env
        </Button>
      )}

      {isPending && (
        <Button variant="ghost" onClick={cancel}>
          Отменить
        </Button>
      )}

      <p className={styles.note}>Подключение действует один час. При выходе сессия удаляется.</p>
    </form>
  )
}
