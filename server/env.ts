export type Environment = Record<string, string | undefined>

export type GreenConfig = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export const readEnv = (env: Environment): GreenConfig => {
  const apiUrl = env.GREEN_API_URL?.trim()
  const idInstance = env.GREEN_API_INSTANCE_ID?.trim()
  const apiTokenInstance = env.GREEN_API_TOKEN?.trim()

  if (!apiUrl || !idInstance || !apiTokenInstance) {
    throw new Error('Заполните GREEN_API_URL, GREEN_API_INSTANCE_ID и GREEN_API_TOKEN в .env.')
  }

  let url: URL

  try {
    url = new URL(apiUrl)
  } catch {
    throw new Error('Проверьте GREEN_API_URL в .env.')
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
    throw new Error('GREEN_API_URL должен содержать HTTPS-адрес из кабинета без пути и параметров.')
  }

  if (!/^\d+$/.test(idInstance) || !/^[a-zA-Z0-9_-]+$/.test(apiTokenInstance)) {
    throw new Error('Проверьте GREEN_API_INSTANCE_ID и GREEN_API_TOKEN в .env.')
  }

  return { apiUrl: url.origin, idInstance, apiTokenInstance }
}
