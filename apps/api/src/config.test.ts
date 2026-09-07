import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('requires a Supabase project URL', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost/gym_assistant',
      }),
    ).toThrow()
  })

  it('uses the Supabase authenticated audience by default', () => {
    expect(
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost/gym_assistant',
        SUPABASE_URL: 'https://example.supabase.co',
      }).SUPABASE_JWT_AUDIENCE,
    ).toBe('authenticated')
  })
})
