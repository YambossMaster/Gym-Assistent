import type { TrainingDraftPayload } from '../../api'
import {
  CoachLocalStore,
  LOCAL_SCHEMA_VERSION,
  PRIVATE_TTL_MS,
  type LocalRecord
} from '../../local-resilience'

export const DRAFT_SCHEMA_VERSION = LOCAL_SCHEMA_VERSION
export const DRAFT_TTL_MS = PRIVATE_TTL_MS
export type StoredTrainingDraft = LocalRecord & {
  sessionId: string
  tabId: string
  revision: number
  payload: TrainingDraftPayload
}

export function draftKey(environment: string, coachId: string, sessionId: string, tabId: string) {
  return [environment, coachId, sessionId, tabId].join(':')
}

export class TrainingDraftStore {
  private legacyChecked = false
  constructor(private readonly store = new CoachLocalStore()) {}
  async put(draft: StoredTrainingDraft) {
    await this.store.put('drafts', draft)
  }
  async delete(key: string) {
    await this.store.delete('drafts', key)
  }
  async list(coachId: string, sessionId?: string, now = Date.now()) {
    if (!this.legacyChecked) {
      this.legacyChecked = true
      await migrateLegacyDrafts(this.store, now)
    }
    const environment = import.meta.env.MODE
    const values = await this.store.list<StoredTrainingDraft>(
      'drafts',
      { environment, coachId },
      now
    )
    return values.filter((item) => !sessionId || item.sessionId === sessionId)
  }
  async clearCoach(coachId: string) {
    await this.store.clearCoach({ environment: import.meta.env.MODE, coachId })
  }
}

async function migrateLegacyDrafts(store: CoachLocalStore, now: number) {
  if (typeof indexedDB === 'undefined') return
  const legacy = await readLegacyDrafts().catch(() => [])
  for (const item of legacy) {
    if (
      item.schemaVersion !== DRAFT_SCHEMA_VERSION ||
      !item.environment ||
      !item.coachId ||
      now - item.savedAt > DRAFT_TTL_MS
    )
      continue
    await store.put('drafts', { ...item, expiresAt: item.savedAt + DRAFT_TTL_MS })
  }
  if (legacy.length) indexedDB.deleteDatabase('form-training-drafts')
}

function readLegacyDrafts(): Promise<Array<Omit<StoredTrainingDraft, 'expiresAt'>>> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('form-training-drafts')
    request.onupgradeneeded = () => {
      request.transaction?.abort()
      resolve([])
    }
    request.onerror = () => {
      if (request.error?.name === 'AbortError') return
      reject(request.error)
    }
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('drafts')) {
        db.close()
        resolve([])
        return
      }
      const tx = db.transaction('drafts', 'readonly')
      const all = tx.objectStore('drafts').getAll()
      all.onerror = () => reject(all.error)
      tx.oncomplete = () => {
        db.close()
        resolve(all.result as Array<Omit<StoredTrainingDraft, 'expiresAt'>>)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
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
