import type { JSX } from 'react'

import { ConnectionForm } from '@/features/connect'

import styles from './ConnectPage.module.css'

export const ConnectPage = (): JSX.Element => (
  <main className={styles.page}>
    <div className={styles.brand}>
      <span className={styles.mark}>G</span> GREEN-API <span> / чат</span>
    </div>
    <section className={styles.content}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>WHATSAPP · ЛИЧНЫЕ СООБЩЕНИЯ</span>
        <h1>
          Ближе.
          <br />
          Даже на расстоянии.
        </h1>
        <p>
          Простой чат для ваших разговоров. Подключите WhatsApp, выберите собеседника и начните
          общение.
        </p>
        <ol className={styles.steps}>
          <li>
            <span>01</span> Подключите свой инстанс
          </li>
          <li>
            <span>02</span> Добавьте номер собеседника
          </li>
          <li>
            <span>03</span> Отправьте первое сообщение
          </li>
        </ol>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <h2>Подключение</h2>
          <p>Введите реквизиты своего инстанса GREEN-API</p>
        </div>
        <ConnectionForm />
        <a
          className={styles.link}
          href="https://console.green-api.com/instanceList"
          target="_blank"
          rel="noreferrer"
        >
          Открыть кабинет GREEN-API ↗
        </a>
      </div>
    </section>
    <p className={styles.footer}>Переписка доступна в текущей сессии и очищается при выходе.</p>
  </main>
)
