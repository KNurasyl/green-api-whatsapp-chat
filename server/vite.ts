import { type Connect, loadEnv, type Plugin } from 'vite'

import { createApi } from './api.ts'

export const greenApi = (mode: string): Plugin => {
  const api = createApi(loadEnv(mode, process.cwd(), 'GREEN_API_'))

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
