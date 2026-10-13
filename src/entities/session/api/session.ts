import { apiError, isRecord, request } from '@/shared/api'

export type Credentials = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export const createSession = async (
  credentials: Credentials | undefined,
  signal: AbortSignal,
): Promise<string> => {
  const data = await request('session', {
    method: 'POST',
    body: credentials ?? { useEnv: true },
    signal,
  })

  if (!isRecord(data) || typeof data.key !== 'string' || !data.key) {
    throw apiError('response', 'Не удалось создать подключение.')
  }

  return data.key
}

export const closeSession = async (key: string): Promise<void> => {
  await request('session', { method: 'DELETE', key })
}
