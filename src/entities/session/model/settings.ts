import { apiError } from '@/shared/api'

export type Settings = {
  webhookUrl: string
  incoming: boolean
  stateChanges: boolean
  statuses: boolean
}

export const checkSettings = (settings: Settings) => {
  if (settings.webhookUrl || !settings.incoming) {
    throw apiError(
      'validation',
      'В кабинете включите входящие уведомления и очистите адрес отправки уведомлений (webhookUrl).',
    )
  }

  if (!settings.stateChanges) {
    throw apiError(
      'validation',
      'В кабинете GREEN-API включите уведомления об изменении состояния авторизации (stateWebhook).',
    )
  }
}
