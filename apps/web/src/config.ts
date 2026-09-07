export interface WebConfig {
  supabaseUrl: string
  supabasePublishableKey: string
}

export interface WebEnvironment {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

export function loadWebConfig(environment: WebEnvironment = import.meta.env): WebConfig {
  const supabaseUrl = environment.VITE_SUPABASE_URL
  const supabasePublishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  return { supabaseUrl, supabasePublishableKey }
}
