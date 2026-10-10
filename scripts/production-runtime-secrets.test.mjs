import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { inspectProductionRuntimeSecrets } from './production-runtime-secrets.mjs'

const contract = {
  required: ['DATABASE_URL', 'SUPABASE_URL'],
  featureRequired: [
    {
      name: 'CALENDAR_SUBSCRIPTION_SECRET',
      unavailableWithout: 'calendar link creation, reset, and recovery',
    },
  ],
  recommended: [
    {
      name: 'CAPABILITY_RATE_LIMIT_SECRET',
      reason: 'keeps rate limiting independently rotatable',
    },
  ],
}

test('fails without printing values when a startup-required Fly secret is missing', () => {
  assert.throws(
    () =>
      inspectProductionRuntimeSecrets([{ Name: 'DATABASE_URL', Digest: 'hidden-value' }], contract),
    /Missing required Production runtime secrets: SUPABASE_URL/,
  )
})

test('accepts Fly JSON field casing and reports missing feature secrets without failing startup', () => {
  const result = inspectProductionRuntimeSecrets(
    [{ name: 'DATABASE_URL' }, { Name: 'SUPABASE_URL' }],
    contract,
  )

  assert.deepEqual(result.required, ['DATABASE_URL', 'SUPABASE_URL'])
  assert.deepEqual(result.missingFeatures, [
    'CALENDAR_SUBSCRIPTION_SECRET: calendar link creation, reset, and recovery',
  ])
  assert.deepEqual(result.missingRecommended, [
    'CAPABILITY_RATE_LIMIT_SECRET: keeps rate limiting independently rotatable',
  ])
})

test('rejects malformed Fly secret inventory instead of treating it as an empty list', () => {
  assert.throws(() => inspectProductionRuntimeSecrets({}), /invalid Fly secret inventory/i)
})
