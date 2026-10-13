export const statusLabels = {
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  noAccount: 'Нет аккаунта WhatsApp',
  suspended: 'Отправка ограничена',
  yellowCard: 'Отправка ограничена',
}

export type MessageStatus = keyof typeof statusLabels
export type Delivery = { status: MessageStatus; timestamp: number }

export const isMessageStatus = (value: unknown): value is MessageStatus =>
  typeof value === 'string' && Object.hasOwn(statusLabels, value)

export const mergeDelivery = (current: Delivery | undefined, next: Delivery): Delivery => {
  if (!current) return next

  const ranks: Partial<Record<MessageStatus, number>> = { sent: 1, delivered: 2, read: 3 }
  const before = ranks[current.status] ?? 0
  const after = ranks[next.status] ?? 0

  if (after > before && after >= 2) return next

  if (before >= 2 || (before && after && before > after)) return current

  return next.timestamp >= current.timestamp ? next : current
}
