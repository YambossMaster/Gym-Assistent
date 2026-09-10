import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createStudent,
  deleteAccountImmediately,
  getWorkspaceSettings,
  isRegistrationEmailTaken,
  listStudents,
  requestAccountDeletion,
  updateWorkspaceSettings
} from './api'

afterEach(() => vi.restoreAllMocks())

describe('student API client', () => {
  it('checks a registration email without sending a browser credential', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ exists: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )

    await expect(isRegistrationEmailTaken(' coach@example.com ')).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/account-registration-check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'coach@example.com' })
    })
  })

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

  it('uses the narrow workspace settings contract without a workspace id', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            settings: { displayName: 'FORM', timeZone: 'Asia/Taipei', version: 1 }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            settings: { displayName: 'FORM Taipei', timeZone: 'Asia/Taipei', version: 2 }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )

    await getWorkspaceSettings('verified-token')
    await updateWorkspaceSettings('verified-token', {
      displayName: 'FORM Taipei',
      timeZone: 'Asia/Taipei',
      version: 1
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/workspace-settings',
      expect.objectContaining({ headers: { authorization: 'Bearer verified-token' } })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspace-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ displayName: 'FORM Taipei', timeZone: 'Asia/Taipei', version: 1 })
      })
    )
  })

  it('requests account deletion through the authenticated API with explicit confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ lifecycle: { deletionDueAt: '2026-09-24T00:00:00.000Z' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )

    await requestAccountDeletion('verified-token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account-deletion-request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE' }),
        headers: expect.objectContaining({ authorization: 'Bearer verified-token' })
      })
    )
  })

  it('accepts the empty successful response from immediate account deletion', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteAccountImmediately('verified-token')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE' }),
        headers: expect.objectContaining({ authorization: 'Bearer verified-token' })
      })
    )
  })
})
