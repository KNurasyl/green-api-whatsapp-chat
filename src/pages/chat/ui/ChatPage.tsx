import { Button } from '@/shared/ui/button'
import styles from './ChatPage.module.css'

type Props = { onSignOut: () => void }

export const ChatPage = ({ onSignOut }: Props) => (
  <main className={styles.empty}>
    <h1>Ваши чаты</h1>
    <p>WhatsApp подключён. Здесь появятся ваши разговоры.</p>
    <Button variant="ghost" onClick={onSignOut}>
      Выйти
    </Button>
  </main>
)
