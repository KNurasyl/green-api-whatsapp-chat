import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

import { createApi } from './api.ts'
import { serveStatic } from './static.ts'

const api = createApi(process.env)
const directory = fileURLToPath(new URL('../dist', import.meta.url))
const port = Number(process.env.PORT ?? 3000)

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT должен быть числом от 1 до 65535.')
}

const server = createServer((request, response) => {
  void api(request, response).then((handled) => {
    if (!handled) return serveStatic(request, response, directory)
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Чат запущен: http://127.0.0.1:${port}`)
})
