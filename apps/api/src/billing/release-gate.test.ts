import { expect, it, vi } from 'vitest'
import { billingDevelopmentEnabled } from './release-gate.js'

it('keeps the release closed despite leftover development/provider flags', () => {
  vi.stubEnv('BILLING_LOCAL_CHECKOUT', 'true')
  vi.stubEnv('BILLING_LOCAL_LIFECYCLE', 'true')
  vi.stubEnv('BILLING_PROVIDER_TESTS_APPROVED', 'true')
  try {
    expect(billingDevelopmentEnabled()).toBe(false)
  } finally {
    vi.unstubAllEnvs()
  }
})
