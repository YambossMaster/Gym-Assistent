import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { localBillingConfiguration } from './lemon-checkout.js'

// Changes only the existing Development/Test Mode hook. Save the prior URL for cleanup.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:5173/settings/payment-status',
})
assert.ok(config)
const hookId = process.env.BILLING_TEST_WEBHOOK_ID
assert.match(hookId ?? '', /^[1-9]\d*$/)
const restore = process.argv[2] === '--restore'
const recordPath = resolve(process.cwd(), '../../output/billing-test-mode/webhook-repoint.json')
const record = restore
  ? (JSON.parse(readFileSync(recordPath, 'utf8')) as {
      hookId: string
      previousUrl: string
      currentUrl: string
    })
  : null
if (record) assert.equal(record.hookId, hookId)
const next = new URL(record?.previousUrl ?? process.argv[2] ?? '')
assert.equal(next.protocol, 'https:')
assert.match(next.hostname, /^[a-z0-9-]+\.trycloudflare\.com$/)
assert.equal(next.pathname, '/hooks/lemonsqueezy')
assert.equal(next.search, '')
const endpoint = `https://api.lemonsqueezy.com/v1/webhooks/${hookId}`
const headers = {
  Authorization: `Bearer ${config.key}`,
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
}
async function read() {
  const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200)
  const body = (await response.json()) as {
    data: {
      id: string
      attributes: { store_id: number; test_mode: boolean; url: string; events: string[] }
    }
  }
  assert.equal(body.data.id, hookId)
  assert.equal(String(body.data.attributes.store_id), config!.storeId)
  assert.equal(body.data.attributes.test_mode, true)
  return body.data.attributes
}
const before = await read()
assert.equal(
  before.url,
  record?.currentUrl ?? `${process.env.BILLING_TEST_TUNNEL_URL}/hooks/lemonsqueezy`,
  'expected existing Test Mode hook',
)
assert.ok(before.events.includes('subscription_updated'))
const response = await fetch(endpoint, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    data: {
      type: 'webhooks',
      id: hookId,
      attributes: { url: next.href },
    },
  }),
  signal: AbortSignal.timeout(15000),
})
assert.equal(response.status, 200, 'update existing Test Mode webhook URL')
const after = await read()
assert.equal(after.url, next.href)
assert.deepEqual(after.events, before.events)
if (!restore)
  writeFileSync(
    recordPath,
    JSON.stringify(
      {
        hookId,
        previousUrl: before.url,
        currentUrl: after.url,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { flag: 'w', mode: 0o600 },
  )
console.log(
  JSON.stringify({
    hookId,
    endpoint: after.url,
    testMode: after.test_mode,
    events: after.events.length,
  }),
)
