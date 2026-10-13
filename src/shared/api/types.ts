export type Connection = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type ErrorKind = 'validation' | 'http' | 'network' | 'timeout' | 'response'

export type ApiError = Error & {
  kind: ErrorKind
  status: number | undefined
  retryAfter: number | undefined
}
