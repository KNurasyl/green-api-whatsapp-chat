import type { JSX } from 'react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

import { useConnect } from '../model/useConnect'

import styles from './ConnectionForm.module.css'

const configuredUrl: unknown = import.meta.env.VITE_GREEN_API_URL

export const ConnectionForm = (): JSX.Element => {
  const [apiUrl, setApiUrl] = useState(typeof configuredUrl === 'string' ? configuredUrl : '')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setToken] = useState('')
  const { connect, isPending, error, cancel } = useConnect()

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (isPending) return

    connect({ apiUrl, idInstance, apiTokenInstance })
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={isPending}>
      <Input
        label="Адрес API"
        placeholder="https://…api.greenapi.com"
        type="url"
        autoComplete="off"
        required
        value={apiUrl}
        disabled={isPending}
        hint="Поле apiUrl в настройках вашего инстанса"
        onChange={(event) => setApiUrl(event.target.value)}
      />
      <Input
        label="ID инстанса"
        placeholder="Например, 1100000000"
        inputMode="numeric"
        autoComplete="off"
        required
        value={idInstance}
        disabled={isPending}
        onChange={(event) => setIdInstance(event.target.value)}
      />
      <Input
        label="Токен инстанса"
        placeholder="apiTokenInstance"
        type="password"
        autoComplete="off"
        required
        value={apiTokenInstance}
        disabled={isPending}
        onChange={(event) => setToken(event.target.value)}
      />
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
      <p className={styles.note}>Реквизиты хранятся только в памяти этой вкладки.</p>
    </form>
  )
}
