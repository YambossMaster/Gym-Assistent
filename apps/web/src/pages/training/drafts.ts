import type { TrainingDraftPayload } from '../../api'

export const DRAFT_SCHEMA_VERSION = 1
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export type StoredTrainingDraft = {
  key: string
  schemaVersion: number
  environment: string
  coachId: string
  sessionId: string
  tabId: string
  revision: number
  savedAt: number
  payload: TrainingDraftPayload
}

export function draftKey(environment: string, coachId: string, sessionId: string, tabId: string) {
  return [environment, coachId, sessionId, tabId].join(':')
}

export class TrainingDraftStore {
  constructor(private readonly open = openDatabase) {}
  async put(draft: StoredTrainingDraft) {
    const db = await this.open()
    await transaction(db, 'readwrite', (store) => store.put(draft))
    db.close()
  }
  async delete(key: string) {
    const db = await this.open()
    await transaction(db, 'readwrite', (store) => store.delete(key))
    db.close()
  }
  async list(coachId: string, sessionId?: string, now = Date.now()) {
    const db = await this.open()
    const values = await transaction<StoredTrainingDraft[]>(db, 'readonly', (store) =>
      store.getAll()
    )
    db.close()
    const expired = values.filter((x) => now - x.savedAt > DRAFT_TTL_MS)
    await Promise.all(expired.map((x) => this.delete(x.key)))
    return values.filter(
      (x) =>
        x.coachId === coachId &&
        (!sessionId || x.sessionId === sessionId) &&
        now - x.savedAt <= DRAFT_TTL_MS
    )
  }
  async clearCoach(coachId: string) {
    for (const draft of await this.list(coachId)) await this.delete(draft.key)
  }
}

export class AutosaveCoordinator<T> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private inFlight: Promise<void> | null = null
  private latest: { revision: number; value: T } | null = null
  private acknowledged = 0
  constructor(
    private readonly send: (value: T, revision: number) => Promise<void>,
    private readonly delay = 650,
    private readonly onState?: (state: 'pending' | 'saving' | 'saved' | 'error') => void
  ) {}
  change(value: T, revision: number) {
    this.latest = { value, revision }
    this.onState?.('pending')
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.delay)
  }
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.inFlight) return this.inFlight
    if (!this.latest || this.latest.revision <= this.acknowledged) return
    const sent = this.latest
    this.onState?.('saving')
    let accepted = false
    this.inFlight = this.send(sent.value, sent.revision)
      .then(() => {
        accepted = true
        this.acknowledged = Math.max(this.acknowledged, sent.revision)
        this.onState?.(this.latest?.revision === this.acknowledged ? 'saved' : 'pending')
      })
      .catch((error) => {
        this.onState?.('error')
        throw error
      })
      .finally(() => {
        this.inFlight = null
        if (accepted && this.latest && this.latest.revision > this.acknowledged) void this.flush()
      })
    return this.inFlight
  }
  get pending() {
    return Boolean(this.latest && this.latest.revision > this.acknowledged)
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('form-training-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function transaction<T = void>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', mode)
    const request = action(tx.objectStore('drafts'))
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => resolve(request.result as T)
    tx.onerror = () => reject(tx.error)
  })
}
