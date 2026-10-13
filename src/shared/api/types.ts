export type Connection = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type ErrorKind = 'validation' | 'http' | 'network' | 'timeout' | 'response'
