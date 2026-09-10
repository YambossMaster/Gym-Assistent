import { describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { WorkspaceVersionConflictError } from './workspace-repository.js'
import { WorkspaceModule } from './workspace-module.js'

const coach: AuthenticatedIdentity = { userId: '00000000-0000-4000-8000-000000000001' }

describe('WorkspaceModule', () => {
  it('updates only the authenticated coach workspace and rejects stale writes', async () => {
    const workspace = new WorkspaceModule({
      repository: new MemoryStudentRepository(),
      now: () => new Date('2026-09-09T16:00:00.000Z'),
    })

    const initial = await workspace.getSettings(coach)
    const updated = await workspace.updateSettings(coach, {
      displayName: 'FORM Taipei',
      timeZone: 'Asia/Taipei',
      version: initial.version,
    })

    expect(updated).toEqual({
      displayName: 'FORM Taipei',
      timeZone: 'Asia/Taipei',
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
})
