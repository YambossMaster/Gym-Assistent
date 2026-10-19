import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyLemonSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}

/** Only a trusted server quote may select the preconfigured variant. */
export function lemonCheckoutPayload(input: {
  storeId: string
  variantId: string
  intentId: string
  email: string
  skipTrial: boolean
  testMode: boolean
  returnUrl: string
  expiresAt: string
}) {
  if (
    ![input.storeId, input.variantId].every(
      (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)),
    ) ||
    !input.intentId
  )
    throw new Error('invalid_checkout_configuration')
  const returnUrl = new URL(input.returnUrl)
  if (
    returnUrl.protocol !== 'https:' &&
    !(
      input.testMode &&
      returnUrl.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(returnUrl.hostname)
    )
  )
    throw new Error('invalid_return_url')
  if (!Number.isFinite(Date.parse(input.expiresAt))) throw new Error('invalid_checkout_expiry')
  return {
    data: {
      type: 'checkouts',
      attributes: {
        test_mode: input.testMode,
        expires_at: input.expiresAt,
        checkout_options: {
          embed: true,
          skip_trial: input.skipTrial,
          discount: false,
          locale: 'zh-CN',
          background_color: '#f7f8f5',
          headings_color: '#18211d',
          primary_text_color: '#18211d',
          secondary_text_color: '#52645a',
          button_color: '#18211d',
          button_text_color: '#ffffff',
        },
        checkout_data: {
          email: input.email,
          custom: {
            intent_id: input.intentId,
          },
        },
        product_options: {
          enabled_variants: [Number(input.variantId)],
          redirect_url: input.returnUrl,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: input.storeId } },
        variant: { data: { type: 'variants', id: input.variantId } },
      },
    },
  }
}
