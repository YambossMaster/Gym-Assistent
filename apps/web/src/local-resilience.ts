export const LOCAL_DATABASE = 'form-coach-local-v1'
export const LOCAL_SCHEMA_VERSION = 1
export const PRIVATE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const PREFERENCE_TTL_MS = 180 * 24 * 60 * 60 * 1000
export const IMPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type LocalScope = { environment: string; coachId: string }
export type LocalRecord = LocalScope & {
  key: string
  schemaVersion: number
  savedAt: number
  expiresAt: number
}
export type LocalDraft = LocalRecord & {
  kind:
    | 'training'
    | 'student'
    | 'purchase'
    | 'session'
    | 'block'
    | 'availability'
    | 'exercise'
    | 'workspace'
  route: string
  entityId?: string
  tabId: string
  value: unknown
}
export type QueuedOperation = LocalRecord & {
  operationId: string
  target: string
  payloadHash: string
  payload: unknown
  state: 'pending' | 'sending' | 'conflict' | 'failed'
  attempts: number
  nextAttemptAt: number
  error?: string
}
export type LocalPreference = LocalRecord & { name: string; value: unknown }
export type LocalImport = LocalRecord & {
  previewId?: string
  importId?: string
  sourceHash: string
  manifestChecksum?: string
  status: string
}
export type StoreName = 'drafts' | 'operations' | 'preferences' | 'imports'

export interface LocalPersistence {
  put<T extends LocalRecord>(store: StoreName, value: T): Promise<void>
  delete(store: StoreName, key: string): Promise<void>
  list<T extends LocalRecord>(store: StoreName): Promise<T[]>
}

export function scopedKey(scope: LocalScope, ...parts: string[]) {
  return [scope.environment, scope.coachId, ...parts].join(':')
}

export function localRecord<T extends object>(
  scope: LocalScope,
  key: string,
  value: T,
  ttl = PRIVATE_TTL_MS,
  now = Date.now()
): LocalRecord & T {
  return {
    ...value,
    ...scope,
    key,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    savedAt: now,
    expiresAt: now + ttl
  }
}

export async function payloadFingerprint(value: unknown) {
  const bytes = new TextEncoder().encode(stableJson(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

export class BrowserLocalPersistence implements LocalPersistence {
  constructor(private readonly open = openDatabase) {}
  async put<T extends LocalRecord>(store: StoreName, value: T) {
    const db = await this.open()
    await transaction(db, store, 'readwrite', (objectStore) => objectStore.put(value))
    db.close()
  }
  async delete(store: StoreName, key: string) {
    const db = await this.open()
    await transaction(db, store, 'readwrite', (objectStore) => objectStore.delete(key))
    db.close()
  }
  async list<T extends LocalRecord>(store: StoreName) {
    const db = await this.open()
    const values = await transaction<T[]>(db, store, 'readonly', (objectStore) =>
      objectStore.getAll()
    )
    db.close()
    return values
  }
}

export class CoachLocalStore {
  constructor(private readonly persistence: LocalPersistence = new BrowserLocalPersistence()) {}
  async list<T extends LocalRecord>(store: StoreName, scope: LocalScope, now = Date.now()) {
    const all = await this.persistence.list<T>(store)
    const expired = all.filter(
      (item) => item.expiresAt <= now || item.schemaVersion !== LOCAL_SCHEMA_VERSION
    )
    await Promise.all(expired.map((item) => this.persistence.delete(store, item.key)))
    return all
      .filter(
        (item) =>
          item.environment === scope.environment &&
          item.coachId === scope.coachId &&
          item.expiresAt > now &&
          item.schemaVersion === LOCAL_SCHEMA_VERSION
      )
      .sort((a, b) => a.savedAt - b.savedAt || a.key.localeCompare(b.key))
  }
  put<T extends LocalRecord>(store: StoreName, value: T) {
    return this.persistence.put(store, value)
  }
  delete(store: StoreName, key: string) {
    return this.persistence.delete(store, key)
  }
  async clearCoach(scope: LocalScope) {
    for (const store of ['drafts', 'operations', 'preferences', 'imports'] as const) {
      const records = await this.persistence.list<LocalRecord>(store)
      await Promise.all(
        records
          .filter(
            (item) => item.environment === scope.environment && item.coachId === scope.coachId
          )
          .map((item) => this.persistence.delete(store, item.key))
      )
    }
  }
}

export type ReplayResult =
  | { kind: 'accepted' }
  | { kind: 'retry'; message?: string }
  | { kind: 'conflict'; message?: string }
  | { kind: 'failed'; message?: string }

export class OperationQueue {
  private running: Promise<void> | null = null
  constructor(
    private readonly store: CoachLocalStore,
    private readonly scope: LocalScope,
    private readonly send: (operation: QueuedOperation) => Promise<ReplayResult>,
    private readonly now = () => Date.now()
  ) {}
  enqueue(operation: QueuedOperation) {
    return this.store.put('operations', operation)
  }
  replay() {
    if (this.running) return this.running
    this.running = this.run().finally(() => (this.running = null))
    return this.running
  }
  private async run() {
    const operations = await this.store.list<QueuedOperation>('operations', this.scope, this.now())
    for (const operation of operations) {
      if (
        operation.state === 'conflict' ||
        operation.state === 'failed' ||
        operation.nextAttemptAt > this.now()
      )
        continue
      await this.store.put('operations', { ...operation, state: 'sending', savedAt: this.now() })
      let result: ReplayResult
      try {
        result = await this.send(operation)
      } catch (error) {
        result = {
          kind: 'retry',
          message: error instanceof Error ? error.message : 'network_error'
        }
      }
      if (result.kind === 'accepted') {
        await this.store.delete('operations', operation.key)
        continue
      }
      const attempts = operation.attempts + 1
      const retryDelay = Math.min(60_000, 1_000 * 2 ** Math.min(attempts - 1, 6))
      await this.store.put('operations', {
        ...operation,
        state: result.kind === 'retry' ? 'pending' : result.kind,
        attempts,
        nextAttemptAt: result.kind === 'retry' ? this.now() + retryDelay : operation.nextAttemptAt,
        savedAt: this.now(),
        error: result.message
      })
      if (result.kind === 'retry') break
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATABASE, LOCAL_SCHEMA_VERSION)
    request.onupgradeneeded = () => {
      for (const store of ['drafts', 'operations', 'preferences', 'imports'] as const)
        if (!request.result.objectStoreNames.contains(store))
          request.result.createObjectStore(store, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transaction<T = void>(
  db: IDBDatabase,
  store: StoreName,
  mode: IDBTransactionMode,
  action: (objectStore: IDBObjectStore) => IDBRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const request = action(tx.objectStore(store))
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => resolve(request.result as T)
    tx.onerror = () => reject(tx.error)
  })
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
