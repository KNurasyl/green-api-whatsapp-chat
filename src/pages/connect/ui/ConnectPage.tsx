import type { JSX } from 'react'

import { ConnectionForm } from '@/features/connect'

import styles from './ConnectPage.module.css'

export const ConnectPage = (): JSX.Element => (
  <main className={styles.page}>
    <section className={styles.card} aria-labelledby="connect-title">
      <div className={styles.mark} aria-hidden="true">
        G
      </div>
      <h1 id="connect-title">Войти в чат</h1>
      <p className={styles.description}>
        WhatsApp через GREEN-API. Введите реквизиты своего инстанса.
      </p>
      <ConnectionForm />
      <a
        className={styles.link}
        href="https://console.green-api.com/instanceList"
        target="_blank"
        rel="noreferrer"
      >
        Открыть кабинет GREEN-API
      </a>
    </section>
    <p className={styles.footer}>Сообщения доступны в текущей сессии и очищаются при выходе.</p>
  </main>
)
