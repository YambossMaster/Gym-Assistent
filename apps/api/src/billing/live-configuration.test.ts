import { expect, it } from 'vitest'
import { liveBillingConfiguration } from './live-configuration.js'

const ref = 'abcdefghijklmnopqrst'
const production = {
  BILLING_LIVE_ENABLED: 'true',
  NODE_ENV: 'production',
  DEPLOYMENT_TARGET: 'production',
  EXPECTED_SUPABASE_PROJECT_REF: ref,
  SUPABASE_URL: `https://${ref}.supabase.co`,
  DATABASE_URL: `postgresql://api@db.${ref}.supabase.co:5432/postgres`,
  BILLING_WORKER_DATABASE_URL: `postgresql://gym_billing_worker_login@db.${ref}.supabase.co:5432/postgres`,
  LEMON_LIVE_API_KEY: 'opaque-live-key',
  LEMON_LIVE_STORE_ID: '11',
  BILLING_LIVE_RETURN_URL: 'https://formcoachdesk.example/settings/checkout/status',
  LEMON_LIVE_WEBHOOK_SECRET: 'opaque-live-secret',
  LEMON_LIVE_PRO_MONTH_VARIANT: '21',
  LEMON_LIVE_PRO_YEAR_VARIANT: '22',
  LEMON_LIVE_PRIME_MONTH_VARIANT: '23',
  LEMON_LIVE_PRIME_YEAR_VARIANT: '24',
  LEMON_LIVE_PRIME_MONTH_60_DAY_VARIANT: '25',
  LEMON_LIVE_PRIME_YEAR_60_DAY_VARIANT: '26',
}

it('keeps Production billing off without its explicit switch', () => {
  expect(liveBillingConfiguration({ ...production, BILLING_LIVE_ENABLED: 'false' })).toBeNull()
  expect(liveBillingConfiguration({})).toBeNull()
})

it('binds Live mode, store, provider values and both database connections', () => {
  const config = liveBillingConfiguration(production)
  expect(config).toMatchObject({
    environment: 'live',
    checkout: { environment: 'live', storeId: '11', variants: { basic_month: '21' } },
  })
  expect(new URL(config!.workerDatabaseUrl).searchParams.get('sslmode')).toBe('verify-full')
  for (const change of [
    { NODE_ENV: 'development' },
    { DATABASE_URL: 'postgresql://api@db.yvhijxhtelujfsaplzpi.supabase.co:5432/postgres' },
    { BILLING_WORKER_DATABASE_URL: 'postgresql://worker@db.other.supabase.co:5432/postgres' },
    { BILLING_WORKER_DATABASE_URL: `postgresql://postgres@db.${ref}.supabase.co:5432/postgres` },
    { SUPABASE_URL: 'https://other.supabase.co' },
    { BILLING_LOCAL_CHECKOUT: 'true' },
  ]) {
    expect(() => liveBillingConfiguration({ ...production, ...change })).toThrow(
      'live_billing_environment_mismatch',
    )
  }
  expect(() => liveBillingConfiguration({ ...production, LEMON_LIVE_API_KEY: undefined })).toThrow(
    'live_billing_configuration_incomplete',
  )
  expect(() =>
    liveBillingConfiguration({ ...production, LEMON_LIVE_PRIME_YEAR_VARIANT: '21' }),
  ).toThrow('duplicate_live_variant')
  expect(() => liveBillingConfiguration({ ...production, LEMON_SQUEEZY_STORE_ID: '11' })).toThrow(
    'live_test_billing_credential_overlap',
  )
})
