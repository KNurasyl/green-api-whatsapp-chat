import { apiError } from './error'
import type { Connection } from './types'

export const parseConnection = (input: Connection): Connection => {
  let url: URL

  try {
    url = new URL(input.apiUrl.trim())
  } catch {
    throw apiError('validation', 'Укажите apiUrl из кабинета GREEN-API.')
  }

  const isHostAllowed = ['api.green-api.com', 'api.greenapi.com'].some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  )

  if (
    url.protocol !== 'https:' ||
    !isHostAllowed ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw apiError('validation', 'Укажите HTTPS-адрес apiUrl из кабинета без пути и параметров.')
  }

  const idInstance = input.idInstance.trim()
  const apiTokenInstance = input.apiTokenInstance.trim()

  if (!/^\d+$/.test(idInstance)) throw apiError('validation', 'ID инстанса должен содержать цифры.')

  if (!/^[a-zA-Z0-9_-]+$/.test(apiTokenInstance)) {
    throw apiError('validation', 'Укажите токен инстанса без пробелов.')
  }

  return { apiUrl: url.origin, idInstance, apiTokenInstance }
}
