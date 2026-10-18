export interface WebConfig {
  supabaseUrl: string
  supabasePublishableKey: string
}

export interface WebEnvironment {
  readonly VITE_LOCAL_BILLING?: string
  readonly VITE_BILLING_LIVE?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_INTERNAL_ALPHA?: string
}

// The Live build switch is public and cannot grant access; the API has a separate server-only gate.
export const billingLiveBuildEnabled =
  import.meta.env.PROD && import.meta.env.VITE_BILLING_LIVE === 'true'
export const localBillingEnabled = import.meta.env.DEV || billingLiveBuildEnabled
export const localBillingServiceEnabled =
  billingLiveBuildEnabled || (import.meta.env.DEV && import.meta.env.VITE_LOCAL_BILLING === 'true')

export function isInternalAlpha(environment: WebEnvironment = import.meta.env): boolean {
  return environment.VITE_INTERNAL_ALPHA === 'true'
}

export function loadWebConfig(environment: WebEnvironment = import.meta.env): WebConfig {
  const supabaseUrl = environment.VITE_SUPABASE_URL
  const supabasePublishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  return { supabaseUrl, supabasePublishableKey }
}
