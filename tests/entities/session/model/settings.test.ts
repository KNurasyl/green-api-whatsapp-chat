import { expect, it } from 'vitest'
import { checkSettings } from '@/entities/session/model/settings'

const settings = { webhookUrl: '', incoming: true, stateChanges: true, statuses: false }

it('allows a connection without delivery events but requires authorization events', () => {
  expect(() => checkSettings(settings)).not.toThrow()
  expect(() => checkSettings({ ...settings, stateChanges: false })).toThrow('stateWebhook')
})

it('requires incoming events and an empty webhook URL', () => {
  expect(() => checkSettings({ ...settings, incoming: false })).toThrow('входящие уведомления')
  expect(() => checkSettings({ ...settings, webhookUrl: 'https://example.com' })).toThrow(
    'webhookUrl',
  )
})
