export type ApiMethod =
  | 'getStateInstance'
  | 'getSettings'
  | 'checkWhatsapp'
  | 'sendMessage'
  | 'receiveNotification'
  | 'deleteNotification'

export type ErrorKind = 'validation' | 'http' | 'network' | 'timeout' | 'response'

export type ApiError = Error & {
  kind: ErrorKind
  status: number | undefined
  retryAfter: number | undefined
}
