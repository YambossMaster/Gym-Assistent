/** An explicit local Test Mode opt-in; deployed and Production processes remain closed. */
export function billingDevelopmentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const developmentRef = 'yvhijxhtelujfsaplzpi'
  const databaseMatches = (value: string | undefined) => {
    if (!value) return false
    try {
      const url = new URL(value)
      return (
        url.hostname === `db.${developmentRef}.supabase.co` ||
        (url.hostname.endsWith('.pooler.supabase.com') &&
          decodeURIComponent(url.username).endsWith(`.${developmentRef}`))
      )
    } catch {
      return false
    }
  }
  return (
    env.NODE_ENV === 'development' &&
    env.DEPLOYMENT_TARGET === 'local' &&
    env.SUPABASE_URL === `https://${developmentRef}.supabase.co` &&
    databaseMatches(env.DATABASE_URL) &&
    databaseMatches(env.BILLING_WORKER_DATABASE_URL) &&
    env.BILLING_PROVIDER_TESTS_APPROVED === 'true' &&
    env.BILLING_LOCAL_CHECKOUT === 'true' &&
    env.BILLING_LOCAL_LIFECYCLE === 'true'
  )
}
