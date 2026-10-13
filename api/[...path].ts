import type { IncomingMessage, ServerResponse } from 'node:http'

import { createApi } from '../server/api.ts'
import { sendJson } from '../server/http.ts'

const api = createApi(process.env)

export default async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const handled = await api(request, response)

  if (!handled) sendJson(response, 404, { error: 'not_found' })
}
