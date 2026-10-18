import type { LemonTestConfiguration } from './lemon-checkout.js'
import type { BillingLifecycleConfiguration } from './local-lifecycle.js'

function matchesProject(databaseUrl: string | undefined, projectRef: string): boolean {
  if (!databaseUrl) return false
  try {
    const url = new URL(databaseUrl)
    return (
      url.hostname === `db.${projectRef}.supabase.co` ||
      (url.hostname.endsWith('.pooler.supabase.com') &&
        decodeURIComponent(url.username).endsWith(`.${projectRef}`))
    )
  } catch {
    return false
  }
}

function isBillingWorker(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false
  try {
    const name = decodeURIComponent(new URL(databaseUrl).username)
    return name === 'gym_billing_worker_login' || name.startsWith('gym_billing_worker_login.')
  } catch {
    return false
  }
}

/** Construct only after an explicit Production switch; an incomplete or crossed setup fails closed. */
export function liveBillingConfiguration(
  env: NodeJS.ProcessEnv,
): BillingLifecycleConfiguration | null {
  if (env.BILLING_LIVE_ENABLED !== 'true') return null
  const ref = env.EXPECTED_SUPABASE_PROJECT_REF
  if (
    env.NODE_ENV !== 'production' ||
    env.DEPLOYMENT_TARGET !== 'production' ||
    !ref ||
    !/^[a-z0-9]{20}$/.test(ref) ||
    ref === 'yvhijxhtelujfsaplzpi' ||
    env.SUPABASE_URL !== `https://${ref}.supabase.co` ||
    !matchesProject(env.DATABASE_URL, ref) ||
    !matchesProject(env.BILLING_WORKER_DATABASE_URL, ref) ||
    !isBillingWorker(env.BILLING_WORKER_DATABASE_URL) ||
    env.BILLING_LOCAL_CHECKOUT === 'true' ||
    env.BILLING_LOCAL_LIFECYCLE === 'true'
  )
    throw new Error('live_billing_environment_mismatch')

  const keys = [
    env.LEMON_LIVE_API_KEY,
    env.LEMON_LIVE_STORE_ID,
    env.BILLING_LIVE_RETURN_URL,
    env.LEMON_LIVE_WEBHOOK_SECRET,
    env.BILLING_WORKER_DATABASE_URL,
    env.LEMON_LIVE_PRO_MONTH_VARIANT,
    env.LEMON_LIVE_PRO_YEAR_VARIANT,
    env.LEMON_LIVE_PRIME_MONTH_VARIANT,
    env.LEMON_LIVE_PRIME_YEAR_VARIANT,
  ]
  if (keys.some((value) => !value)) throw new Error('live_billing_configuration_incomplete')
  const [key, storeId, returnUrl, secret, workerDatabaseUrl, ...variantIds] = keys as string[]
  if (
    (env.LEMON_SQUEEZY_STORE_ID && env.LEMON_SQUEEZY_STORE_ID === storeId) ||
    (env.LEMON_SQUEEZY_API_KEY && env.LEMON_SQUEEZY_API_KEY === key) ||
    (env.LEMON_SQUEEZY_WEBHOOK_SECRET && env.LEMON_SQUEEZY_WEBHOOK_SECRET === secret)
  )
    throw new Error('live_test_billing_credential_overlap')
  const ids = [storeId!, ...variantIds]
  if (ids.some((value) => !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))))
    throw new Error('invalid_live_billing_ids')
  if (new Set(variantIds).size !== variantIds.length) throw new Error('duplicate_live_variant')
  const url = new URL(returnUrl!)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/settings/checkout/status'
  )
    throw new Error('invalid_live_billing_return_url')
  const checkout: LemonTestConfiguration = {
    environment: 'live',
    key: key!,
    storeId: storeId!,
    returnUrl: url.href,
    variants: {
      basic_month: variantIds[0]!,
      basic_year: variantIds[1]!,
      advanced_month: variantIds[2]!,
      advanced_year: variantIds[3]!,
    },
  }
  const workerUrl = new URL(workerDatabaseUrl!)
  workerUrl.searchParams.set('sslmode', 'verify-full')
  return { environment: 'live', checkout, secret: secret!, workerDatabaseUrl: workerUrl.href }
}
