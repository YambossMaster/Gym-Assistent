import type { Session } from '@supabase/supabase-js'
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileJson,
  RotateCcw,
  Trash2,
  UploadCloud
} from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  ApiError,
  continueDemoImport,
  createDemoImport,
  getDemoImport,
  previewDemoImport,
  rollbackDemoImport,
  type DemoImportPreview,
  type DemoImportRun
} from '../../api'
import {
  CoachLocalStore,
  IMPORT_TTL_MS,
  localRecord,
  scopedKey,
  type LocalImport
} from '../../local-resilience'
import { Confirmation, SettingsPanelHeading } from '../../shared/primitives'
import { DEMO_STORAGE_KEY, downloadDemoBackup, phaseLabels, readDemoSource } from './demo-import'

export function DemoImportPanel({
  session,
  workspaceVersion,
  preferenceVersion,
  onImported
}: {
  session: Session
  workspaceVersion: number
  preferenceVersion: number
  onImported: () => void
}) {
  const [sourceText, setSourceText] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const [preview, setPreview] = useState<DemoImportPreview | null>(null)
  const [run, setRun] = useState<DemoImportRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [clearOpen, setClearOpen] = useState(false)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const localStore = useMemo(() => new CoachLocalStore(), [])
  const scope = useMemo(
    () => ({ environment: import.meta.env.MODE, coachId: session.user.id }),
    [session.user.id]
  )
  const browserDemo =
    typeof localStorage === 'undefined' ? null : localStorage.getItem(DEMO_STORAGE_KEY)

  const remember = (next: {
    previewId?: string
    importId?: string
    sourceHash: string
    manifestChecksum?: string
    status: string
  }) =>
    localStore.put<LocalImport>(
      'imports',
      localRecord(
        scope,
        scopedKey(scope, 'import', next.importId ?? next.previewId ?? next.sourceHash),
        next,
        IMPORT_TTL_MS
      )
    )

  useEffect(() => {
    let active = true
    void localStore
      .list<LocalImport>('imports', scope)
      .then(async (records) => {
        const pending = [...records]
          .reverse()
          .find(
            (record) => record.importId && !['completed', 'rolled_back'].includes(record.status)
          )
        if (!pending?.importId) return
        const restored = await getDemoImport(session.access_token, pending.importId)
        if (active) setRun(restored)
        await remember({ ...pending, status: restored.status })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [localStore, scope, session.access_token])

  const choose = (text: string, name: string) => {
    setSourceText(text)
    setSourceName(name)
    setBackupConfirmed(false)
    setPreview(null)
    setRun(null)
    setError('')
  }
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      choose(await file.text(), file.name)
    } catch {
      setError('目前無法讀取這個檔案。')
    }
  }
  const inspect = async () => {
    setBusy(true)
    setError('')
    try {
      const next = await previewDemoImport(session.access_token, readDemoSource(sourceText))
      setPreview(next)
      await remember({
        previewId: next.id,
        sourceHash: next.sourceHash,
        manifestChecksum: next.manifestChecksum,
        status: 'preview'
      })
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setBusy(false)
    }
  }
  const continueAll = async (initial: DemoImportRun, source = preview) => {
    let current = initial
    while (current.status !== 'completed') {
      current = await continueDemoImport(session.access_token, current.id)
      setRun(current)
      await remember({
        previewId: source?.id,
        importId: current.id,
        sourceHash: source?.sourceHash ?? current.id,
        manifestChecksum: source?.manifestChecksum,
        status: current.status
      })
    }
    onImported()
  }
  const start = async () => {
    if (!preview || !backupConfirmed) return
    setBusy(true)
    setError('')
    try {
      const created = await createDemoImport(session.access_token, {
        previewId: preview.id,
        manifestChecksum: preview.manifestChecksum,
        workspaceVersion,
        preferenceVersion,
        confirmation: 'IMPORT'
      })
      setRun(created)
      await remember({
        previewId: preview.id,
        importId: created.id,
        sourceHash: preview.sourceHash,
        manifestChecksum: preview.manifestChecksum,
        status: created.status
      })
      await continueAll(created)
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setBusy(false)
    }
  }
  const retry = async () => {
    if (!run) return
    setBusy(true)
    setError('')
    try {
      await continueAll(run)
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-panel demo-import-panel">
      <SettingsPanelHeading eyebrow="DATA & RECOVERY" title="資料移轉與裝置復原" />
      <p>暫存內容只留在這台裝置，正式資料仍以雲端為準。</p>
      <p className="settings-guidance">請只在信任的個人裝置保留草稿與待送變更。</p>

      <ol className="import-steps" aria-label="Demo 資料匯入步驟">
        <li className={sourceText ? 'complete' : 'current'}>
          <strong>下載備份</strong>
          <span>選擇 Demo 資料後，先保存完全相同的 JSON。</span>
        </li>
        <li className={preview ? 'complete' : sourceText ? 'current' : ''}>
          <strong>檢查結果</strong>
          <span>確認每一階段的建立、警告與拒絕項目。</span>
        </li>
        <li className={run?.status === 'completed' ? 'complete' : preview ? 'current' : ''}>
          <strong>開始匯入</strong>
          <span>分階段送入雲端；中斷後可安全接續。</span>
        </li>
      </ol>

      <div className="import-source-actions">
        <label className="secondary-button file-button">
          <FileJson /> 選擇 Demo JSON
          <input type="file" accept="application/json,.json" onChange={selectFile} />
        </label>
        {browserDemo && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => choose(browserDemo, '這個瀏覽器的 Demo 資料')}
          >
            <DatabaseBackup /> 使用這個瀏覽器的 Demo 資料
          </button>
        )}
      </div>
      {sourceText && (
        <div className="import-source-card">
          <div>
            <strong>{sourceName}</strong>
            <span>{new TextEncoder().encode(sourceText).byteLength.toLocaleString()} bytes</span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => downloadDemoBackup(sourceText)}
          >
            <Download /> 下載完整備份
          </button>
          <label className="confirmation-check">
            <input
              type="checkbox"
              checked={backupConfirmed}
              onChange={(event) => setBackupConfirmed(event.target.checked)}
            />
            我已確認備份下載完成
          </label>
          <button
            className="primary-button compact"
            type="button"
            disabled={!backupConfirmed || busy}
            onClick={() => void inspect()}
          >
            <UploadCloud /> {busy && !preview ? '檢查中…' : '檢查匯入內容'}
          </button>
        </div>
      )}

      {preview && (
        <section className="import-preview" aria-labelledby="import-preview-title">
          <div className="import-preview-heading">
            <div>
              <span className="eyebrow">IMPORT PREVIEW</span>
              <h3 id="import-preview-title">匯入檢查結果</h3>
            </div>
            <code title={preview.manifestChecksum}>{preview.manifestChecksum.slice(0, 12)}</code>
          </div>
          <p>匯入只會在你確認後開始，Demo 原始資料與備份不會被刪除。</p>
          <ul className="import-phase-list">
            {preview.phases.map((phase) => (
              <li key={phase.phase}>
                <strong>{phaseLabels[phase.phase]}</strong>
                <span>建立 {phase.create}</span>
                <span>警告 {phase.warnings}</span>
                <span>略過 {phase.rejected}</span>
              </li>
            ))}
          </ul>
          {(preview.warnings.length > 0 || preview.rejections.length > 0) && (
            <details>
              <summary>查看 {preview.warnings.length + preview.rejections.length} 項提醒</summary>
              <ul className="import-issue-list">
                {[...preview.warnings, ...preview.rejections].map((issue, index) => (
                  <li key={`${issue.phase}:${issue.entity}:${issue.sourceId}:${index}`}>
                    <strong>{phaseLabels[issue.phase]}</strong>
                    <span>
                      {issue.reason === 'legacy_secret_not_transferable'
                        ? '舊分享連結無法安全轉移；匯入後請重新建立。'
                        : `${issue.entity} · ${issue.sourceId} · ${issue.reason}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {!run && (
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void start()}
            >
              開始匯入
            </button>
          )}
        </section>
      )}

      {run && (
        <section className={`import-run import-run-${run.status}`} aria-live="polite">
          <div>
            {run.status === 'completed' ? <CheckCircle2 /> : <RotateCcw />}
            <div>
              <strong>
                {run.status === 'completed'
                  ? 'Demo 資料已匯入'
                  : `已完成 ${run.completedPhases.length} 個階段`}
              </strong>
              <p>
                {run.status === 'completed'
                  ? '原始備份仍保留在你的裝置。'
                  : '尚未完成的資料仍可重試或回復。'}
              </p>
            </div>
          </div>
          {run.status !== 'completed' && run.status !== 'rolled_back' && (
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => void retry()}
            >
              重試未完成階段
            </button>
          )}
          {run.status !== 'rolled_back' && (
            <button
              className="danger-outline-button"
              type="button"
              disabled={busy}
              onClick={() => setRollbackOpen(true)}
            >
              回復這次匯入
            </button>
          )}
        </section>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="text-button clear-device-button"
        type="button"
        onClick={() => setClearOpen(true)}
      >
        <Trash2 /> 清除此裝置的暫存資料
      </button>

      {clearOpen && (
        <Confirmation
          title="清除這台裝置的暫存資料？"
          text="草稿、待送變更與介面偏好會從這台裝置移除，雲端正式資料不受影響。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => {
            setClearOpen(false)
            setConfirmation('')
          }}
          onConfirm={() =>
            void localStore
              .clearCoach({ environment: import.meta.env.MODE, coachId: session.user.id })
              .then(() => {
                setClearOpen(false)
                setConfirmation('')
                setError('')
              })
              .catch(() => setError('目前無法清除裝置暫存。'))
          }
          disabled={false}
          requiredWord="CLEAR"
          confirmLabel="清除裝置暫存"
        />
      )}
      {rollbackOpen && run && (
        <Confirmation
          title="回復這次匯入？"
          text="只會移除這次匯入且尚未修改的資料。若資料已被使用，系統會停止而不刪除任何內容。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => {
            setRollbackOpen(false)
            setConfirmation('')
          }}
          onConfirm={() =>
            void rollbackDemoImport(session.access_token, run.id)
              .then((next) => {
                setRun(next)
                void remember({
                  previewId: preview?.id,
                  importId: next.id,
                  sourceHash: preview?.sourceHash ?? next.id,
                  manifestChecksum: preview?.manifestChecksum,
                  status: next.status
                })
                setRollbackOpen(false)
                setConfirmation('')
                onImported()
              })
              .catch((reason) => setError(readError(reason)))
          }
          disabled={busy}
          requiredWord="ROLLBACK"
          confirmLabel="回復匯入"
        />
      )}
    </section>
  )
}

function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 409)
    return error.details.error === 'preview_stale'
      ? '資料已變更，請重新檢查後再匯入。'
      : error.message
  return error instanceof Error ? error.message : '目前無法完成 Demo 資料移轉。'
}
