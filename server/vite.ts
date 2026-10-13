import { type Connect, loadEnv, type Plugin } from 'vite'

import { createApi } from './api.ts'

export const greenApi = (mode: string): Plugin => {
  const env = loadEnv(mode, process.cwd(), ['GREEN_API_', 'SESSION_SECRET', 'APP_ORIGIN'])
  const api = createApi(env)

  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    void api(request, response).then((handled) => {
      if (!handled) next()
    })
  }

  return {
    name: 'green-api',
    configureServer: (server) => {
      server.middlewares.use(middleware)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware)
    },
  }
}
