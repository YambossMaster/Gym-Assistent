import { describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { WorkspaceVersionConflictError } from './workspace-repository.js'
import { WorkspaceModule } from './workspace-module.js'

const coach: AuthenticatedIdentity = { userId: '00000000-0000-4000-8000-000000000001' }

describe('WorkspaceModule', () => {
  it('uses the authenticated email account name for a new Workspace display name', async () => {
    const workspace = new WorkspaceModule({ repository: new MemoryStudentRepository() })

    await expect(
      workspace.getSettings({ ...coach, email: 'alpha.coach@example.com' }),
    ).resolves.toMatchObject({ displayName: 'alpha.coach' })
  })

  it('uses a neutral guest name when a new identity has no email', async () => {
    const workspace = new WorkspaceModule({ repository: new MemoryStudentRepository() })

    await expect(workspace.getSettings(coach)).resolves.toMatchObject({ displayName: '訪客' })
  })

  it('updates only the authenticated coach workspace and rejects stale writes', async () => {
    const workspace = new WorkspaceModule({
      repository: new MemoryStudentRepository(),
      now: () => new Date('2026-09-09T16:00:00.000Z'),
    })

    const initial = await workspace.getSettings(coach)
    const updated = await workspace.updateSettings(coach, {
      displayName: 'FORM Taipei',
      timeZone: 'Asia/Taipei',
      defaultCurrency: 'USD',
      calendarStartHour: 7,
      calendarEndHour: 23,
      calendarWeekStart: 0,
      defaultSessionMinutes: 90,
      version: initial.version,
    })

    expect(updated).toEqual({
      displayName: 'FORM Taipei',
      timeZone: 'Asia/Taipei',
      defaultCurrency: 'USD',
      calendarStartHour: 7,
      calendarEndHour: 23,
      calendarWeekStart: 0,
      defaultSessionMinutes: 90,
      version: 2,
      updatedAt: '2026-09-09T16:00:00.000Z',
    })
    await expect(
      workspace.updateSettings(coach, {
        displayName: 'Stale update',
        timeZone: 'Asia/Tokyo',
        version: initial.version,
      }),
    ).rejects.toBeInstanceOf(WorkspaceVersionConflictError)
  })

  it('rejects invalid IANA time zones before repository access', async () => {
    const workspace = new WorkspaceModule({ repository: new MemoryStudentRepository() })

    await expect(
      workspace.updateSettings(coach, {
        displayName: 'FORM Taipei',
        timeZone: 'Mars/Olympus',
        version: 1,
      }),
    ).rejects.toThrow('valid IANA')
  })

  it('rejects inverted calendar hours and unsupported lesson durations', async () => {
    const workspace = new WorkspaceModule({ repository: new MemoryStudentRepository() })
    const initial = await workspace.getSettings(coach)
    await expect(
      workspace.updateSettings(coach, {
        displayName: initial.displayName,
        timeZone: initial.timeZone,
        version: initial.version,
        calendarStartHour: 20,
        calendarEndHour: 8,
      }),
    ).rejects.toThrow('calendarEndHour')
    await expect(
      workspace.updateSettings(coach, {
        displayName: initial.displayName,
        timeZone: initial.timeZone,
        version: initial.version,
        defaultSessionMinutes: 75 as 60,
      }),
    ).rejects.toThrow()
  })
})
