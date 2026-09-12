import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createStudent,
  createLessonPurchase,
  deleteAccountImmediately,
  deleteLessonPurchase,
  getWorkspaceSettings,
  isRegistrationEmailTaken,
  listStudents,
  requestAccountDeletion,
  updateLessonPurchase,
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

  it('records a lesson purchase through the authenticated student route without a workspace id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ purchase: { id: 'purchase-1', lessonCount: 10 } }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      })
    )

    await createLessonPurchase('verified-token', 'student-1', {
      purchasedAt: '2026-09-10T00:00:00.000Z',
      lessonCount: 10,
      amountMinor: 16000,
      currency: 'TWD'
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/students/student-1/lesson-purchases',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          purchasedAt: '2026-09-10T00:00:00.000Z',
          lessonCount: 10,
          amountMinor: 16000,
          currency: 'TWD'
        }),
        headers: expect.objectContaining({ authorization: 'Bearer verified-token' })
      })
    )
  })

  it('updates and deletes a Lesson Purchase with its version token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ purchase: { id: 'purchase-1', version: 3 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await updateLessonPurchase('verified-token', 'student-1', 'purchase-1', {
      purchasedAt: '2026-09-10T00:00:00.000Z',
      lessonCount: 8,
      amountMinor: 12000,
      currency: 'TWD',
      privateNote: '更正',
      version: 2
    })
    await deleteLessonPurchase('verified-token', 'student-1', 'purchase-1', 3)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/students/student-1/lesson-purchases/purchase-1',
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"version":2') })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/students/student-1/lesson-purchases/purchase-1',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE', version: 3 })
      })
    )
  })

  it('retains the authorized current Purchase on a version conflict', async () => {
    const currentPurchase = { id: 'purchase-1', lessonCount: 8, version: 3 }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'changed', currentPurchase }), {
        status: 409,
        headers: { 'content-type': 'application/json' }
      })
    )

    await expect(
      updateLessonPurchase('verified-token', 'student-1', 'purchase-1', {
        purchasedAt: '2026-09-10T00:00:00.000Z',
        lessonCount: 10,
        amountMinor: 16000,
        currency: 'TWD',
        version: 2
      })
    ).rejects.toMatchObject({ status: 409, details: { currentPurchase } })
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
