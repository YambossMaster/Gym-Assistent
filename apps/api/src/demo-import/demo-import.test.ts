import { describe, expect, it, vi } from 'vitest'
import { DemoImportModule, type DemoImportRepository, type ImportRun } from './demo-import.js'

const identity = { userId: 'coach-a' }
function repository(): DemoImportRepository {
  return {
    resolveWorkspace: vi.fn(async () => '00000000-0000-4000-8000-000000000001'),
    listCatalog: vi.fn(async () => []),
    baselineFingerprint: vi.fn(async () => 'a'.repeat(64)),
    savePreview: vi.fn(
      async (_workspace, plan) =>
        ({ ...plan, id: '10000000-0000-4000-8000-000000000001', expiresAt: new Date() }) as any,
    ),
    createRun: vi.fn(
      async (): Promise<ImportRun> => ({
        id: 'run',
        status: 'ready',
        nextPhase: 0,
        completedPhases: [],
        failure: null,
        rollbackExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    getRun: vi.fn(async () => null),
    continueRun: vi.fn(async () => null),
    rollbackRun: vi.fn(async () => null),
  }
}
const emptySource = {
  settings: { displayName: 'Coach', timezone: 'Asia/Taipei', defaultWeightUnit: 'kg' },
  students: [],
  purchases: [],
  series: [],
  sessions: [],
  records: [],
  blocks: [],
  links: [],
  availability: [],
  availabilityOverrides: [],
  exercises: [],
}

describe('DemoImportModule', () => {
  it('derives Workspace, prepares a safe plan, and freezes the current baseline', async () => {
    const repo = repository()
    const preview = await new DemoImportModule(repo).preview(identity, emptySource)
    expect(preview.id).toBeTruthy()
    expect(repo.savePreview).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      expect.objectContaining({ manifestChecksum: expect.any(String) }),
      'a'.repeat(64),
    )
  })

  it('requires literal confirmation and current versions before creating a run', async () => {
    const repo = repository()
    const module = new DemoImportModule(repo)
    await expect(
      module.create(identity, {
        previewId: crypto.randomUUID(),
        manifestChecksum: 'a'.repeat(64),
        workspaceVersion: 1,
        preferenceVersion: 1,
        confirmation: 'NO',
      }),
    ).rejects.toThrow()
    await module.create(identity, {
      previewId: crypto.randomUUID(),
      manifestChecksum: 'a'.repeat(64),
      workspaceVersion: 1,
      preferenceVersion: 1,
      confirmation: 'IMPORT',
    })
    expect(repo.createRun).toHaveBeenCalledOnce()
  })

  it('requires explicit rollback confirmation', async () => {
    const repo = repository()
    const module = new DemoImportModule(repo)
    await expect(
      module.rollback(identity, crypto.randomUUID(), { confirmation: 'DELETE' }),
    ).rejects.toThrow()
    expect(repo.rollbackRun).not.toHaveBeenCalled()
  })
})
