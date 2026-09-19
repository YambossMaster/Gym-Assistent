import { describe, expect, it, vi } from 'vitest'
import { CoachLocalStore, type LocalPersistence, type LocalRecord } from '../../local-resilience'
import {
  AutosaveCoordinator,
  DRAFT_SCHEMA_VERSION,
  DRAFT_TTL_MS,
  TrainingDraftStore,
  draftKey,
  sameTrainingContent,
  type StoredTrainingDraft
} from './drafts'

const payload = (privateNote: string, recordVersion = 1) => ({
  privateNote,
  exercises: [],
  recordVersion,
  sessionVersion: 1,
  operationId: `${privateNote}-operation`
})

describe('Training autosave coordinator', () => {
  it('does not save on a timer when nothing changed and stops after acknowledgement', async () => {
    vi.useFakeTimers()
    const send = vi.fn(async () => {})
    const autosave = new AutosaveCoordinator(send, 100)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).not.toHaveBeenCalled()
    autosave.change('a', 1)
    await vi.advanceTimersByTimeAsync(100)
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('waits for two seconds of editing inactivity before saving', async () => {
    vi.useFakeTimers()
    const send = vi.fn(async () => {})
    const autosave = new AutosaveCoordinator(send)
    autosave.change('a', 1)
    await vi.advanceTimersByTimeAsync(1999)
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledWith('a', 1)
    vi.useRealTimers()
  })
  it('coalesces a newer edit while one save is in flight', async () => {
    let release!: () => void
    const first = new Promise<void>((resolve) => {
      release = resolve
    })
    const send = vi.fn((_value: string, revision: number) =>
      revision === 1 ? first : Promise.resolve()
    )
    const autosave = new AutosaveCoordinator(send, 0)
    autosave.change('a', 1)
    const flushing = autosave.flush()
    autosave.change('b', 2)
    release()
    await flushing
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith('b', 2))
    expect(send).toHaveBeenCalledTimes(2)
  })
  it('prepares a queued edit with the latest accepted server version when it is sent', async () => {
    let release!: () => void
    let acceptedVersion = 10
    const first = new Promise<void>((resolve) => {
      release = () => {
        acceptedVersion = 11
        resolve()
      }
    })
    const send = vi.fn((_value: { content: string; recordVersion: number }, revision: number) =>
      revision === 1 ? first : Promise.resolve()
    )
    const autosave = new AutosaveCoordinator(
      send,
      0,
      undefined,
      (value: { content: string; recordVersion: number }) => ({
        ...value,
        recordVersion: acceptedVersion
      })
    )
    autosave.change({ content: 'a', recordVersion: 10 }, 1)
    const flushing = autosave.flush()
    autosave.change({ content: 'b', recordVersion: 10 }, 2)
    release()
    await flushing
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    expect(send).toHaveBeenLastCalledWith({ content: 'b', recordVersion: 11 }, 2)
  })
  it('keeps failed revisions pending for exact replay', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('lost')).mockResolvedValueOnce(undefined)
    const autosave = new AutosaveCoordinator<string>(send, 0)
    autosave.change('a', 1)
    await expect(autosave.flush()).rejects.toThrow('lost')
    expect(autosave.pending).toBe(true)
    await autosave.flush()
    expect(send).toHaveBeenCalledTimes(2)
    expect(autosave.pending).toBe(false)
  })
  it('replays the exact prepared request before sending a newer edit', async () => {
    let serverVersion = 10
    const send = vi.fn().mockRejectedValueOnce(new Error('lost')).mockResolvedValue(undefined)
    const autosave = new AutosaveCoordinator(send, 0, undefined, (value: { content: string }) => ({
      ...value,
      recordVersion: serverVersion
    }))
    autosave.change({ content: 'a' }, 1)
    await expect(autosave.flush()).rejects.toThrow('lost')
    serverVersion = 11
    autosave.change({ content: 'b' }, 2)
    await autosave.flush()
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3))
    expect(send.mock.calls).toEqual([
      [{ content: 'a', recordVersion: 10 }, 1],
      [{ content: 'a', recordVersion: 10 }, 1],
      [{ content: 'b', recordVersion: 11 }, 2]
    ])
  })
  it('retries temporary failures without requiring a user decision', async () => {
    vi.useFakeTimers()
    const states: string[] = []
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(undefined)
    const autosave = new AutosaveCoordinator<string, string>(
      send,
      0,
      (state) => states.push(state),
      (value) => value,
      () => true,
      () => 100
    )
    autosave.change('a', 1)
    await expect(autosave.flush()).rejects.toThrow('temporary')
    await vi.advanceTimersByTimeAsync(100)
    expect(send).toHaveBeenCalledTimes(2)
    expect(autosave.pending).toBe(false)
    expect(states).toContain('retrying')
    expect(states.at(-1)).toBe('saved')
    vi.useRealTimers()
  })
  it('uses one device-local draft slot per environment, subject and Session', () => {
    expect(draftKey('dev', 'coach-a', 'session-a', 'tab-a')).not.toBe(
      draftKey('dev', 'coach-b', 'session-a', 'tab-a')
    )
    expect(draftKey('dev', 'coach-a', 'session-a', 'tab-a')).toBe(
      draftKey('dev', 'coach-a', 'session-a', 'tab-b')
    )
    expect(DRAFT_TTL_MS).toBe(604800000)
  })
  it('treats a server-accepted local copy as the same content despite version metadata', () => {
    expect(sameTrainingContent(payload('note', 1), payload('note', 2))).toBe(true)
    expect(sameTrainingContent(payload('older', 1), payload('newer', 2))).toBe(false)
  })
  it('consolidates legacy per-tab drafts to the newest device-local Session draft', async () => {
    const persistence = new MemoryPersistence()
    const local = new CoachLocalStore(persistence)
    const store = new TrainingDraftStore(local)
    const base = {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      environment: 'test',
      coachId: 'coach-a',
      sessionId: 'session-a',
      expiresAt: 1000
    }
    await local.put('drafts', {
      ...base,
      key: 'test:coach-a:session-a:tab-a',
      tabId: 'tab-a',
      revision: 1,
      savedAt: 10,
      payload: payload('older')
    } satisfies StoredTrainingDraft)
    await local.put('drafts', {
      ...base,
      key: 'test:coach-a:session-a:tab-b',
      tabId: 'tab-b',
      revision: 2,
      savedAt: 20,
      payload: payload('newer')
    } satisfies StoredTrainingDraft)
    const drafts = await store.list('coach-a', 'session-a', 100)
    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.key).toBe(draftKey('test', 'coach-a', 'session-a'))
    expect(drafts[0]?.payload.privateNote).toBe('newer')
    expect(await persistence.list('drafts')).toEqual(drafts)
    await store.deleteSession('coach-a', 'session-a')
    expect(await persistence.list('drafts')).toEqual([])
  })
})

class MemoryPersistence implements LocalPersistence {
  private readonly values = new Map<string, LocalRecord>()
  async put<T extends LocalRecord>(_store: string, value: T) {
    this.values.set(value.key, value)
  }
  async delete(_store: string, key: string) {
    this.values.delete(key)
  }
  async list<T extends LocalRecord>(_store: string) {
    return [...this.values.values()] as T[]
  }
}
