import type { TrainingDraftPayload } from '../../api'
import {
  CoachLocalStore,
  LOCAL_SCHEMA_VERSION,
  PRIVATE_TTL_MS,
  type LocalRecord
} from '../../local-resilience'

export type AutosaveState = 'pending' | 'saving' | 'saved' | 'error' | 'retrying'

export const DRAFT_SCHEMA_VERSION = LOCAL_SCHEMA_VERSION
export const DRAFT_TTL_MS = PRIVATE_TTL_MS
export const TRAINING_AUTOSAVE_IDLE_MS = 2_000
export type StoredTrainingDraft = LocalRecord & {
  sessionId: string
  tabId: string
  revision: number
  payload: TrainingDraftPayload
}

export function sameTrainingContent(left: TrainingDraftPayload, right: TrainingDraftPayload) {
  const content = (value: TrainingDraftPayload) => ({
    privateNote: value.privateNote,
    exercises: value.exercises.map((exercise) => ({
      id: exercise.id,
      definitionId: exercise.definitionId,
      ...(exercise.formatVersion ? { formatVersion: exercise.formatVersion } : {}),
      sets: exercise.sets
    }))
  })
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
    if (value && typeof value === 'object')
      return (
        '{' +
        Object.entries(value)
          .filter(([, item]) => item !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item))
          .join(',') +
        '}'
      )
    return JSON.stringify(value)
  }
  return canonical(content(left)) === canonical(content(right))
}

export function draftKey(environment: string, coachId: string, sessionId: string, _tabId?: string) {
  return [environment, coachId, 'training', sessionId].join(':')
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
    const matching = values.filter((item) => !sessionId || item.sessionId === sessionId)
    const latestBySession = new Map<string, StoredTrainingDraft>()
    for (const item of matching) latestBySession.set(item.sessionId, item)
    const consolidated = [...latestBySession.values()]
    for (const item of consolidated) {
      const canonicalKey = draftKey(item.environment, item.coachId, item.sessionId)
      if (item.key !== canonicalKey) await this.store.put('drafts', { ...item, key: canonicalKey })
    }
    await Promise.all(
      matching
        .filter((item) => item.key !== draftKey(item.environment, item.coachId, item.sessionId))
        .map((item) => this.store.delete('drafts', item.key))
    )
    return consolidated.map((item) => ({
      ...item,
      key: draftKey(item.environment, item.coachId, item.sessionId)
    }))
  }
  async deleteSession(coachId: string, sessionId: string) {
    const values = await this.list(coachId, sessionId)
    await Promise.all(values.map((item) => this.store.delete('drafts', item.key)))
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

export class AutosaveCoordinator<T, Prepared = T> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private inFlight: Promise<void> | null = null
  private latest: { revision: number; value: T } | null = null
  private outstanding: { revision: number; value: Prepared } | null = null
  private acknowledged = 0
  private retryAttempt = 0
  constructor(
    private readonly send: (value: Prepared, revision: number) => Promise<void>,
    private readonly delay = TRAINING_AUTOSAVE_IDLE_MS,
    private readonly onState?: (state: AutosaveState) => void,
    private readonly prepare: (value: T, revision: number) => Prepared = (value: T) =>
      value as unknown as Prepared,
    private readonly shouldRetry: (error: unknown) => boolean = () => false,
    private readonly retryDelay: (attempt: number) => number = (attempt) =>
      Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 5))
  ) {}
  change(value: T, revision: number) {
    this.latest = { value, revision }
    this.onState?.('pending')
    if (this.timer) clearTimeout(this.timer)
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.timer = setTimeout(() => void this.flush().catch(() => undefined), this.delay)
  }
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.inFlight) return this.inFlight
    if (!this.outstanding && (!this.latest || this.latest.revision <= this.acknowledged)) return
    const sent =
      this.outstanding ??
      ({
        revision: this.latest!.revision,
        value: this.prepare(this.latest!.value, this.latest!.revision)
      } satisfies { revision: number; value: Prepared })
    this.outstanding = sent
    this.onState?.(this.retryAttempt > 0 ? 'retrying' : 'saving')
    let accepted = false
    this.inFlight = this.send(sent.value, sent.revision)
      .then(() => {
        accepted = true
        this.outstanding = null
        this.retryAttempt = 0
        this.acknowledged = Math.max(this.acknowledged, sent.revision)
        this.onState?.(this.latest?.revision === this.acknowledged ? 'saved' : 'pending')
      })
      .catch((error) => {
        this.onState?.('error')
        if (this.shouldRetry(error)) {
          const attempt = ++this.retryAttempt
          this.retryTimer = setTimeout(() => {
            this.retryTimer = null
            void this.flush().catch(() => undefined)
          }, this.retryDelay(attempt))
        }
        throw error
      })
      .finally(() => {
        this.inFlight = null
        if (accepted && this.latest && this.latest.revision > this.acknowledged)
          void this.flush().catch(() => undefined)
      })
    return this.inFlight
  }
  get pending() {
    return Boolean(this.outstanding || (this.latest && this.latest.revision > this.acknowledged))
  }
  abandonOutstanding() {
    this.outstanding = null
  }
}
