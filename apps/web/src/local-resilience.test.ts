import { describe, expect, it, vi } from 'vitest'
import {
  CoachLocalStore,
  LOCAL_SCHEMA_VERSION,
  OperationQueue,
  localRecord,
  scopedKey,
  type LocalPersistence,
  type LocalRecord,
  type QueuedOperation,
  type StoreName
} from './local-resilience'

class MemoryPersistence implements LocalPersistence {
  stores = new Map<StoreName, Map<string, LocalRecord>>()
  async put<T extends LocalRecord>(store: StoreName, value: T) {
    const map = this.stores.get(store) ?? new Map()
    map.set(value.key, structuredClone(value))
    this.stores.set(store, map)
  }
  async delete(store: StoreName, key: string) {
    this.stores.get(store)?.delete(key)
  }
  async list<T extends LocalRecord>(store: StoreName) {
    return [...(this.stores.get(store)?.values() ?? [])].map((value) =>
      structuredClone(value)
    ) as T[]
  }
}

const scope = { environment: 'development', coachId: 'coach-a' }
function operation(id: string, savedAt = 1): QueuedOperation {
  return localRecord(
    scope,
    scopedKey(scope, 'operation', id),
    {
      operationId: id,
      target: 'training:session-a',
      payloadHash: `hash-${id}`,
      payload: { operationId: id },
      state: 'pending' as const,
      attempts: 0,
      nextAttemptAt: 0
    },
    10_000,
    savedAt
  )
}

describe('M7 local resilience', () => {
  it('isolates records by environment and Coach and removes expired/schema-stale values', async () => {
    const persistence = new MemoryPersistence()
    const store = new CoachLocalStore(persistence)
    await persistence.put(
      'drafts',
      localRecord(scope, scopedKey(scope, 'draft', 'a'), { value: 'a' }, 10, 10)
    )
    await persistence.put(
      'drafts',
      localRecord({ ...scope, coachId: 'coach-b' }, 'b', { value: 'b' }, 100, 10)
    )
    await persistence.put('drafts', {
      ...localRecord(scope, 'old', { value: 'old' }, 100, 10),
      schemaVersion: LOCAL_SCHEMA_VERSION + 1
    })
    expect((await store.list('drafts', scope, 21)).map((item) => item.key)).toEqual([])
    expect((await persistence.list('drafts')).map((item) => item.key)).toEqual(['b'])
  })

  it('replays FIFO once, removes accepted work, and keeps a network failure pending', async () => {
    const persistence = new MemoryPersistence()
    const store = new CoachLocalStore(persistence)
    await store.put('operations', operation('second', 2))
    await store.put('operations', operation('first', 1))
    const send = vi.fn(async (item: QueuedOperation) =>
      item.operationId === 'first'
        ? ({ kind: 'accepted' } as const)
        : ({ kind: 'retry', message: 'offline' } as const)
    )
    const queue = new OperationQueue(store, scope, send, () => 100)
    await Promise.all([queue.replay(), queue.replay()])
    expect(send.mock.calls.map(([item]) => item.operationId)).toEqual(['first', 'second'])
    const left = await store.list<QueuedOperation>('operations', scope, 100)
    expect(left).toMatchObject([
      { operationId: 'second', state: 'pending', attempts: 1, error: 'offline' }
    ])
  })

  it('marks stale conflicts terminal and never sends later work out of order', async () => {
    const persistence = new MemoryPersistence()
    const store = new CoachLocalStore(persistence)
    await store.put('operations', operation('first', 1))
    await store.put('operations', operation('second', 2))
    const send = vi
      .fn()
      .mockResolvedValueOnce({ kind: 'conflict', message: 'stale' })
      .mockResolvedValue({ kind: 'accepted' })
    await new OperationQueue(store, scope, send, () => 100).replay()
    expect(send).toHaveBeenCalledTimes(2)
    expect(await store.list<QueuedOperation>('operations', scope, 100)).toMatchObject([
      { operationId: 'first', state: 'conflict', error: 'stale' }
    ])
  })

  it('clears only the departing Coach across every local store', async () => {
    const persistence = new MemoryPersistence()
    const store = new CoachLocalStore(persistence)
    for (const name of ['drafts', 'operations', 'preferences', 'imports'] as const) {
      await persistence.put(name, localRecord(scope, `${name}-a`, { value: true }, 100, 1))
      await persistence.put(
        name,
        localRecord({ ...scope, coachId: 'coach-b' }, `${name}-b`, { value: true }, 100, 1)
      )
    }
    await store.clearCoach(scope)
    for (const name of ['drafts', 'operations', 'preferences', 'imports'] as const)
      expect((await persistence.list(name)).map((item) => item.key)).toEqual([`${name}-b`])
  })
})
