import { createClient } from '@supabase/supabase-js'
import { loadWebConfig } from './config'

const config = loadWebConfig()

// Capture the recovery marker before Supabase consumes the callback URL.
// The token itself is never kept here.
const authRedirectParams =
  typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.hash.slice(1))
const authRedirectQuery =
  typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search)
export const initialRecoveryRedirect =
  authRedirectParams.get('type') === 'recovery' || authRedirectQuery.get('type') === 'recovery'
const recoveryPendingKey = 'form-coach-recovery-pending'
export function setRecoveryPending(pending: boolean): void {
  if (typeof window === 'undefined') return
  if (pending) window.localStorage.setItem(recoveryPendingKey, '1')
  else window.localStorage.removeItem(recoveryPendingKey)
}
export const initialRecoveryPending =
  typeof window !== 'undefined' &&
  (initialRecoveryRedirect || window.localStorage.getItem(recoveryPendingKey) === '1')
if (initialRecoveryRedirect) setRecoveryPending(true)
export const initialAuthRedirectError =
  authRedirectParams.has('error') ||
  authRedirectParams.has('error_code') ||
  authRedirectQuery.has('error') ||
  authRedirectQuery.has('error_code')

export const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
