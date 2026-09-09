import { describe, expect, it, vi } from 'vitest'
import { M1LiveE2eError, runM1LiveE2e, type M1LiveE2eConfig } from './m1-live.js'

const config: M1LiveE2eConfig = {
  supabaseUrl: 'https://example.supabase.co/',
  supabasePublishableKey: 'publishable-key',
  apiBaseUrl: 'http://127.0.0.1:3000/',
  coachA: { email: 'a@example.com', password: 'password-a' },
  coachB: { email: 'b@example.com', password: 'password-b' },
}

describe('runM1LiveE2e', () => {
  it('proves authentication, workspace rejection, persistence, and tenant isolation', async () => {
    let privateNote = ''
    const fetchImplementation = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/auth/v1/token')) {
        const body = JSON.parse(String(init?.body)) as { email: string }
        return jsonResponse({ access_token: body.email.startsWith('a@') ? 'token-a' : 'token-b' })
      }

      const authorization = readHeader(init?.headers, 'authorization')
      if (!authorization) return jsonResponse({ error: 'unauthorized' }, 401)
      if (init?.method === 'POST' && String(init.body).includes('workspaceId')) {
        return jsonResponse({ error: 'invalid_request' }, 400)
      }
      if (init?.method === 'POST') {
        privateNote = (JSON.parse(String(init.body)) as { privateNote: string }).privateNote
        return jsonResponse({ student: { id: 'student-a' } }, 201)
      }
      if (authorization === 'Bearer token-a') {
        return jsonResponse({ students: [{ id: 'student-a', privateNote }] })
      }
      return jsonResponse({ students: [] })
    }) as typeof fetch

    const result = await runM1LiveE2e(config, fetchImplementation)

    expect(result.studentId).toBe('student-a')
    expect(result.checks).toHaveLength(5)
    expect(fetchImplementation).toHaveBeenCalledTimes(7)
  })

  it('does not include an authentication response body in errors', async () => {
    const fetchImplementation = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { email: string }
        return body.email.startsWith('a@')
          ? jsonResponse({ access_token: 'must-not-leak' }, 401)
          : jsonResponse({ access_token: 'token-b' })
      },
    ) as typeof fetch

    await expect(runM1LiveE2e(config, fetchImplementation)).rejects.toMatchObject({
      message: 'coach-a sign-in: received HTTP 401',
      status: 401,
    } satisfies Partial<M1LiveE2eError>)
  })
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  return new Headers(headers).get(name)
}
