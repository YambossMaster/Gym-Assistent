import { createHmac } from 'node:crypto'
import { expect, it } from 'vitest'
import { lemonCheckoutPayload, verifyLemonSignature } from './provider-boundary.js'

it('checks the exact signed bytes and rejects missing, malformed or tampered signatures', () => {
  const body = Buffer.from('{ "event": "refund" }')
  const secret = 'isolated-test-secret'
  const signature = createHmac('sha256', secret).update(body).digest('hex')
  expect(verifyLemonSignature(body, signature, secret)).toBe(true)
  expect(verifyLemonSignature(Buffer.from('{"event":"refund"}'), signature, secret)).toBe(false)
  for (const value of [undefined, '', 'zz'.repeat(32), signature.slice(1)])
    expect(verifyLemonSignature(body, value, secret)).toBe(false)
  expect(verifyLemonSignature(body, signature, '')).toBe(false)
})

it('restricts checkout to the chosen variant and lets Lemon handle discounts', () => {
  const input = {
    storeId: '1',
    variantId: '23',
    intentId: 'opaque-intent',
    email: 'test@example.invalid',
    skipTrial: false,
    testMode: true,
    returnUrl: 'http://127.0.0.1:4177/settings/billing/return',
    expiresAt: '2026-10-14T04:20:00Z',
  }
  const payload = lemonCheckoutPayload(input)
  expect(payload.data.attributes.checkout_options).toEqual({
    embed: true,
    skip_trial: false,
    discount: true,
    locale: 'zh-CN',
    background_color: '#f7f8f5',
    headings_color: '#18211d',
    primary_text_color: '#18211d',
    secondary_text_color: '#52645a',
    button_color: '#18211d',
    button_text_color: '#ffffff',
  })
  expect(payload.data.attributes.product_options.enabled_variants).toEqual([23])
  expect(payload.data.attributes.checkout_data.custom).toEqual({ intent_id: 'opaque-intent' })
  expect(() => lemonCheckoutPayload({ ...input, testMode: false })).toThrow('invalid_return_url')
  expect(() => lemonCheckoutPayload({ ...input, returnUrl: 'javascript:alert(1)' })).toThrow(
    'invalid_return_url',
  )
})
