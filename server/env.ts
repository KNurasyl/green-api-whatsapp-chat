export type Environment = Record<string, string | undefined>

export type GreenConfig = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export const readCredentials = (data: unknown): GreenConfig => {
  if (typeof data !== 'object' || data === null) throw new Error('Укажите реквизиты GREEN-API.')

  const apiUrl = 'apiUrl' in data && typeof data.apiUrl === 'string' ? data.apiUrl.trim() : ''
  const idInstance =
    'idInstance' in data && typeof data.idInstance === 'string' ? data.idInstance.trim() : ''
  const apiTokenInstance =
    'apiTokenInstance' in data && typeof data.apiTokenInstance === 'string'
      ? data.apiTokenInstance.trim()
      : ''

  if (!apiUrl || !idInstance || !apiTokenInstance) {
    throw new Error('Заполните адрес API, ID и токен инстанса.')
  }

  let url: URL

  try {
    url = new URL(apiUrl)
  } catch {
    throw new Error('Проверьте адрес API.')
  }

  const allowedHost = ['api.green-api.com', 'api.greenapi.com'].some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  )

  if (
    url.protocol !== 'https:' ||
    !allowedHost ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Укажите HTTPS-адрес GREEN-API из кабинета без пути и параметров.')
  }

  if (!/^\d+$/.test(idInstance) || !/^[a-zA-Z0-9_-]+$/.test(apiTokenInstance)) {
    throw new Error('Проверьте ID и токен инстанса.')
  }

  return { apiUrl: url.origin, idInstance, apiTokenInstance }
}

export const readEnv = (env: Environment): GreenConfig =>
  readCredentials({
    apiUrl: env.GREEN_API_URL,
    idInstance: env.GREEN_API_INSTANCE_ID,
    apiTokenInstance: env.GREEN_API_TOKEN,
  })
