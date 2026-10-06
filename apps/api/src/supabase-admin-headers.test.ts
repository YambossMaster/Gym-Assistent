import { describe, expect, it } from 'vitest'
import { supabaseAdminHeaders } from './supabase-admin-headers.js'

describe('supabaseAdminHeaders', () => {
  it('uses modern secret keys only as API keys because they are not JWTs', () => {
    expect(supabaseAdminHeaders('sb_secret_production')).toEqual({
      apikey: 'sb_secret_production',
    })
  })

  it('keeps the bearer header for legacy service-role JWT compatibility', () => {
    expect(supabaseAdminHeaders('legacy-service-role-jwt')).toEqual({
      apikey: 'legacy-service-role-jwt',
      authorization: 'Bearer legacy-service-role-jwt',
    })
  })
})
