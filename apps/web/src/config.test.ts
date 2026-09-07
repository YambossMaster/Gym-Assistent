import { describe, expect, it } from 'vitest'
import { loadWebConfig } from './config'

describe('loadWebConfig', () => {
  it('requires both public Supabase settings', () => {
    expect(() => loadWebConfig({})).toThrow()
  })

  it('returns browser-safe Supabase settings', () => {
    expect(
      loadWebConfig({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example'
      })
    ).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: 'sb_publishable_example'
    })
  })
})
