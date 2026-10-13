import { describe, expect, it } from 'vitest'

import { readEnv } from '../../server/env.ts'

const env = {
  GREEN_API_URL: 'https://test.api.greenapi.com',
  GREEN_API_INSTANCE_ID: '123',
  GREEN_API_TOKEN: 'test-token',
}

describe('server environment', () => {
  it('uses the console address and trims credentials', () => {
    expect(
      readEnv({ ...env, GREEN_API_URL: env.GREEN_API_URL + '/', GREEN_API_INSTANCE_ID: ' 123 ' }),
    ).toEqual({ apiUrl: env.GREEN_API_URL, idInstance: '123', apiTokenInstance: 'test-token' })
  })

  it.each([
    'http://api.green-api.com',
    'https://api.green-api.com.evil.example',
    'https://fakeapi.green-api.com',
    'https://user:secret@api.green-api.com',
    'https://api.green-api.com/path',
    'https://api.green-api.com?token=value',
    'https://api.green-api.com:444',
  ])('rejects an unsafe address: %s', (apiUrl) => {
    expect(() => readEnv({ ...env, GREEN_API_URL: apiUrl })).toThrow()
  })

  it('requires server variables and ignores Vite variables', () => {
    expect(() => readEnv({ VITE_GREEN_API_TOKEN: 'test-token' })).toThrow('Заполните')
    expect(() => readEnv({ ...env, GREEN_API_TOKEN: '' })).toThrow('Заполните')
  })

  it('never includes invalid secret values in the error', () => {
    expect(() => readEnv({ ...env, GREEN_API_TOKEN: 'secret with spaces' })).toThrow(
      'Проверьте ID и токен инстанса.',
    )
  })
})
