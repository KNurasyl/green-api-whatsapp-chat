import type { IncomingMessage, ServerResponse } from 'node:http'

export type HttpError = Error & { status: number }

export const httpError = (status: number, message: string): HttpError =>
  Object.assign(new Error(message), { status })

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof Error && 'status' in error && typeof error.status === 'number'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const sendJson = (response: ServerResponse, status: number, data: unknown): void => {
  if (response.destroyed || response.writableEnded) return

  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

export const readJson = async (request: IncomingMessage): Promise<unknown> => {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
    throw httpError(415, 'Ожидается JSON.')
  }

  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    if (!Buffer.isBuffer(chunk)) throw httpError(400, 'Не удалось прочитать запрос.')

    size += chunk.length

    if (size > 128_000) {
      request.resume()

      throw httpError(413, 'Запрос слишком большой.')
    }

    chunks.push(chunk)
  }

  try {
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))

    return data
  } catch {
    throw httpError(400, 'Некорректный JSON.')
  }
}
