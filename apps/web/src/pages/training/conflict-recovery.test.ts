import { describe, expect, it, vi } from 'vitest'
import type { ExerciseDefinition, SessionTraining, TrainingDraftPayload } from '../../api'
import { adoptTrainingDraft } from './conflict-recovery'

const draft = {
  privateNote: '保留這段輸入',
  exercises: [],
  recordVersion: 1,
  sessionVersion: 1,
  operationId: 'old-operation'
} as TrainingDraftPayload

function server(version: number): SessionTraining {
  return {
    record: { version, exercises: [] },
    session: { version: 4 }
  } as unknown as SessionTraining
}

describe('adopt current Training content', () => {
  it('fetches fresh versions and retries a concurrent version conflict with a new operation id', async () => {
    const refresh = vi.fn().mockResolvedValueOnce(server(7)).mockResolvedValueOnce(server(8))
    const save = vi.fn().mockRejectedValueOnce({ status: 409 }).mockResolvedValueOnce(server(9))
    const accepted = await adoptTrainingDraft({
      draft,
      refresh,
      getDefinitions: async () => [],
      save,
      isConflict: (error) => (error as { status?: number }).status === 409,
      operationId: vi.fn().mockReturnValueOnce('attempt-one').mockReturnValueOnce('attempt-two')
    })
    expect(accepted.record.version).toBe(9)
    expect(
      save.mock.calls.map(([payload]) => [payload.recordVersion, payload.operationId])
    ).toEqual([
      [7, 'attempt-one'],
      [8, 'attempt-two']
    ])
    expect(save.mock.calls[1]![0].privateNote).toBe('保留這段輸入')
  })

  it('does not discard a draft when refresh fails', async () => {
    await expect(
      adoptTrainingDraft({
        draft,
        refresh: async () => undefined,
        getDefinitions: async () => [],
        save: vi.fn(),
        isConflict: () => false
      })
    ).rejects.toThrow('training_refresh_unavailable')
    expect(draft.privateNote).toBe('保留這段輸入')
  })

  it('refreshes definition versions for occurrences missing from the latest record', async () => {
    const save = vi.fn().mockResolvedValue(server(10))
    await adoptTrainingDraft({
      draft: {
        ...draft,
        exercises: [{ id: 'draft-exercise', definitionId: 'squat', sets: [] }]
      },
      refresh: async () => server(9),
      getDefinitions: async () => [{ id: 'squat', version: 12 } as ExerciseDefinition],
      save,
      isConflict: () => false,
      operationId: () => 'new-operation'
    })
    expect(save.mock.calls[0]![0].exercises[0].definitionVersion).toBe(12)
  })
})
