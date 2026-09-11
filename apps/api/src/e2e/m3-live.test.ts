import { describe, expect, it, vi } from 'vitest'
import { runM3LiveE2e, type M3LiveE2eConfig } from './m3-live.js'

const config: M3LiveE2eConfig = {
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'publishable-key',
  apiBaseUrl: 'http://127.0.0.1:3000',
  coachA: { email: 'a@example.com', password: 'password-a' },
  coachB: { email: 'b@example.com', password: 'password-b' },
}

describe('runM3LiveE2e', () => {
  it('proves the owner entitlement flow, isolation, archive transition, and cleanup', async () => {
    let archived = false
    let marker = ''
    const fetchImplementation = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/auth/v1/token'))
        return jsonResponse({
          access_token: String(init?.body).includes('a@') ? 'token-a' : 'token-b',
        })
      const owner = new Headers(init?.headers).get('authorization') === 'Bearer token-a'
      if (url.endsWith('/v1/students') && init?.method === 'POST') {
        marker = (JSON.parse(String(init.body)) as { privateNote: string }).privateNote
        return jsonResponse({ student: { id: 'student-a', version: 1 } }, 201)
      }
      if (url.endsWith('/lesson-purchases')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ amountMinor: 6000, currency: 'TWD' })
        return jsonResponse({ purchase: { id: 'purchase-a' } }, 201)
      }
      if (url.endsWith('/v1/students/student-a') && !owner) return jsonResponse({}, 404)
      if (url.endsWith('/v1/students/student-a') && init?.method === 'PATCH') {
        archived = true
        return jsonResponse({ student: { id: 'student-a', active: false, version: 2 } })
      }
      if (url.endsWith('/v1/students/student-a') && init?.method === 'DELETE')
        return new Response(null, { status: 204 })
      return jsonResponse({
        detail: {
          student: { id: 'student-a', privateNote: marker, version: archived ? 2 : 1 },
          lessonSummary: { purchased: 3, completed: 0, remaining: 3 },
          purchases: [{ lessonCount: 3, amountMinor: 6000, currency: 'TWD', privateNote: marker }],
        },
      })
    }) as typeof fetch

    const result = await runM3LiveE2e(config, fetchImplementation)

    expect(result.studentId).toBe('student-a')
    expect(result.checks).toHaveLength(5)
    expect(fetchImplementation).toHaveBeenCalledWith(
      expect.stringContaining('/v1/students/student-a'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
