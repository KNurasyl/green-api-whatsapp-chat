import { apiError } from '@/shared/api'

export const normalizePhone = (value: string) => {
  const text = value.trim()

  if (!/^\+?[\d\s()-]+$/.test(text)) throw apiError('validation', 'Введите номер с кодом страны.')

  const phone = text.replace(/^\+/, '').replace(/[\s()-]/g, '')

  if (!/^[1-9]\d{10,15}$/.test(phone)) {
    throw apiError('validation', 'Номер должен содержать от 11 до 16 цифр с кодом страны.')
  }

  return phone
}
