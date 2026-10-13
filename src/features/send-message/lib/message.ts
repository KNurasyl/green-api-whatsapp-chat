import { getErrorMessage, isApiError } from '@/shared/api'

export const getMessageError = (text: string): string | null => {
  if (!text.trim()) return 'Введите сообщение'
  if (text.length > 20_000) return 'Сообщение слишком длинное'

  return null
}

export const getSendError = (error: unknown) => {
  if (
    isApiError(error) &&
    (error.kind === 'network' ||
      error.kind === 'timeout' ||
      error.kind === 'response' ||
      (error.status !== undefined && error.status >= 500))
  ) {
    return 'Ответ не получен. Сообщение могло уйти — проверьте WhatsApp перед повторной отправкой. Текст сохранён.'
  }

  return getErrorMessage(error)
}
