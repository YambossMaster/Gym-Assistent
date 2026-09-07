import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStudent, listStudents } from './api'

afterEach(() => vi.restoreAllMocks())

describe('student API client', () => {
  it('passes the access token without a workspace id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ students: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )

    await listStudents('verified-token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/students',
      expect.objectContaining({
        headers: { authorization: 'Bearer verified-token' }
      })
    )
  })

  it('creates a student with the narrow API contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ student: { id: 'student-1', name: '品妤' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      })
    )

    await createStudent('verified-token', {
      name: '品妤',
      privateNote: '教練備註'
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/students',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '品妤', privateNote: '教練備註' })
      })
    )
  })

  it('keeps the server status on API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      })
    )

    await expect(listStudents('expired-token')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 401,
        message: 'Invalid token'
      })
    )
  })
})
