import type { Session } from '@supabase/supabase-js'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, ChevronRight, Plus, Wrench } from 'lucide-react'
import { SchedulingDialog } from '../calendar/SchedulingDialog'
import { TimeSelect } from '../../shared/TimeSelect'
import { SeriesDatePicker } from './SeriesDatePicker'
import { getDefaultFinanceCurrency } from './PurchaseMoneyFields'
import { ApiError, request } from '../../api'
import { numericInputKeyDown } from '../../shared/numeric-input'
import {
  financeKey,
  financeMoney,
  moneyFactor,
  useFinanceMutation,
  type MonthlyFinance
} from './finance-api'
import { workspaceInstant, workspaceWallTime } from './workspace-time'

type Row = MonthlyFinance['rows'][number]

const expenseText = (amount: number, currency: string) =>
  `${amount < 0 ? '+' : '−'}${financeMoney(Math.abs(amount), currency)}`
const incomeText = (amount: number, currency: string) =>
  `${amount < 0 ? '−' : '+'}${financeMoney(Math.abs(amount), currency)}`
const sourceDetail = (row: Row) =>
  row.detail ??
  {
    purchase: '學生購課收入',
    commission: '場地抽成，詳見來源',
    rent: '場地租用，詳見課堂',
    prepaid: '場地預購支出，詳見批次',
    salary: '場地底薪收入',
    manual: row.direction === 'income' ? '自行新增收入' : '自行新增支出'
  }[row.kind] ??
  '查看來源明細'
export const sourceExplanation = (row: Row) => {
  const [topic, ...details] = sourceDetail(row).split(' · ')
  const normalizedDetails = details.map((detail) =>
    detail.replace(/(.+?) (\d+(?:\.\d+)?%) → \1 /u, '$1 $2 → ')
  )
  const summary =
    normalizedDetails.length === 2 && normalizedDetails[1].includes('／堂')
      ? `${topic}：${normalizedDetails[0]} (${normalizedDetails[1]})`
      : normalizedDetails.length
        ? `${topic}：${normalizedDetails.join('；')}`
        : topic
  return [
    summary,
    `來源金額：${financeMoney(row.originalAmountMinor ?? row.amountMinor, row.currency)}`,
    `來源日期：${row.originalDate ?? row.date}`,
    ...(row.sourceChanged ? ['來源狀態：已變動'] : [])
  ].join('\n')
}
export function modifiedFinanceFields(row: Row, timeZone: string) {
  const modified = row.status === 'modified'
  const wallTime = (instant: string | null | undefined) =>
    instant ? workspaceWallTime(instant, timeZone).slice(11) : ''
  return {
    date: modified && row.originalDate !== undefined && row.date !== row.originalDate,
    time:
      modified &&
      row.originalOccurredAt !== undefined &&
      wallTime(row.occurredAt) !== wallTime(row.originalOccurredAt),
    label: modified && row.originalLabel !== undefined && row.label !== row.originalLabel,
    amount:
      modified &&
      row.originalAmountMinor !== undefined &&
      row.amountMinor !== row.originalAmountMinor
  }
}
function ModifiedFieldMark() {
  return <span className="finance-ledger-field-modified">（已修改）</span>
}
export function financeSourceRoute(row: Row, params: URLSearchParams) {
  if (row.id.startsWith('session:') && row.venueId) {
    const next = new URLSearchParams({
      venue: row.venueId,
      course: row.id.slice('session:'.length),
      from: 'finances',
      entry: row.id
    })
    const month = params.get('month')
    if (month) next.set('month', month)
    return `/students/venues?${next}`
  }
  const [path, search = ''] = row.targetRoute.split('?')
  if (row.kind !== 'purchase' && !path.startsWith('/students/venues')) return row.targetRoute
  const next = new URLSearchParams(search)
  next.set('from', 'finances')
  next.set('entry', row.id)
  const month = params.get('month')
  if (month) next.set('month', month)
  return `${path}?${next}${row.kind === 'purchase' ? '#purchase-history' : ''}`
}
export function FinanceLedger({ session, data }: { session: Session; data: MonthlyFinance }) {
  const [params, setParams] = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const ascending = (a: Row, b: Row) =>
    `${a.date}T${a.occurredAt ? workspaceWallTime(a.occurredAt, data.timeZone).slice(11) : '00:00'}`.localeCompare(
      `${b.date}T${b.occurredAt ? workspaceWallTime(b.occurredAt, data.timeZone).slice(11) : '00:00'}`
    ) || a.id.localeCompare(b.id)
  const mutation = useFinanceMutation(session)
  const [editor, setEditor] = useState<Row | 'new' | null>(null)
  const modifiedFields =
    editor && editor !== 'new' ? modifiedFinanceFields(editor, data.timeZone) : null
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [when, setWhen] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TWD')
  const [direction, setDirection] = useState<'income' | 'expense'>('expense')
  const [note, setNote] = useState('')
  const [entryId, setEntryId] = useState(() => crypto.randomUUID())
  const [confirm, setConfirm] = useState<'delete' | 'restore' | 'reset' | 'clone' | null>(null)
  const deleted = useInfiniteQuery({
    queryKey: [...financeKey(session.user.id), 'deleted', data.month],
    enabled: deletedOpen,
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) =>
      request<{ rows: Row[]; nextCursor: string | null }>(
        `/api/v1/finances/deleted?month=${data.month}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        session.access_token
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined
  })
  const open = (row: Row | 'new', syncUrl = true) => {
    if (row !== 'new' && syncUrl) {
      const next = new URLSearchParams(params)
      next.set('entry', row.id)
      setParams(next, { replace: true })
    }
    setEditor(row)
    setConfirm(null)
    setLabel(row === 'new' ? '' : row.label)
    setWhen(
      row === 'new'
        ? workspaceWallTime(new Date().toISOString(), data.timeZone)
        : row.occurredAt
          ? workspaceWallTime(row.occurredAt, data.timeZone)
          : `${row.date}T00:00`
    )
    setAmount(row === 'new' ? '' : String(row.amountMinor / moneyFactor(row.currency)))
    setCurrency(row === 'new' ? getDefaultFinanceCurrency() : row.currency)
    setDirection(row === 'new' ? 'expense' : (row.direction as 'income' | 'expense'))
    setNote('')
  }
  const requestedEntry = params.get('entry')
  useEffect(() => {
    if (!requestedEntry) return
    const row = data.rows.find((item) => item.id === requestedEntry)
    if (row) open(row, false)
    // Restore a detail dialog after returning from its source record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedEntry, data.month])
  const close = () => {
    setEditor(null)
    setConfirm(null)
    mutation.reset()
    if (requestedEntry) {
      const next = new URLSearchParams(params)
      next.delete('entry')
      setParams(next, { replace: true })
    }
  }
  const send = (path: string, method: string, body: unknown) =>
    mutation.mutate(
      { path, method, body },
      {
        onSuccess: () => {
          close()
          void deleted.refetch()
          setEntryId(crypto.randomUUID())
        }
      }
    )
  const save = () => {
    if (!editor) return
    const amountMinor = Math.round(Number(amount) * moneyFactor(currency))
    if (
      !Number.isSafeInteger(amountMinor) ||
      (amountMinor < 0 && (editor === 'new' || editor.kind !== 'commission'))
    )
      return
    if (editor === 'new')
      send('/finances/entries', 'POST', {
        id: entryId,
        occurredAt: workspaceInstant(when, data.timeZone),
        label,
        direction,
        amountMinor,
        currency,
        privateNote: note
      })
    else {
      const displayedWhen = editor.occurredAt
        ? workspaceWallTime(editor.occurredAt, data.timeZone)
        : `${editor.date}T00:00`
      send(`/finances/entries/${encodeURIComponent(editor.id)}`, 'PATCH', {
        version: editor.version ?? 0,
        ...(when !== displayedWhen ? { occurredAt: workspaceInstant(when, data.timeZone) } : {}),
        label,
        amountMinor
      })
    }
  }
  const act = () => {
    if (!editor || editor === 'new' || !confirm) return
    if (confirm === 'clone') {
      send('/finances/entries', 'POST', {
        id: entryId,
        occurredAt: editor.occurredAt ?? workspaceInstant(`${editor.date}T00:00`, data.timeZone),
        label: editor.label,
        direction: editor.direction,
        amountMinor: editor.amountMinor,
        currency: editor.currency,
        privateNote: ''
      })
      return
    }
    const suffix = confirm === 'restore' ? '/restore' : confirm === 'reset' ? '/adjustment' : ''
    send(
      `/finances/entries/${encodeURIComponent(editor.id)}${suffix}`,
      confirm === 'restore' ? 'POST' : 'DELETE',
      { version: editor.version ?? 0 }
    )
  }
  const rowView = (row: Row) => (
    <button
      type="button"
      className="finance-ledger-row"
      key={row.id}
      onClick={() => open(row)}
      aria-label={`查看並管理 ${row.label}${row.status === 'modified' ? '，已修改' : ''}，${sourceDetail(row)}，${row.direction === 'income' ? '收入' : '支出'} ${financeMoney(Math.abs(row.amountMinor), row.currency)}`}
    >
      <time>
        {row.date.replaceAll('-', '/')}
        {row.occurredAt ? ` · ${workspaceWallTime(row.occurredAt, data.timeZone).slice(11)}` : ''}
      </time>
      <span className="finance-ledger-description">
        <span className="finance-ledger-title">
          <strong>{row.label}</strong>
          {row.status === 'modified' && (
            <span className="finance-ledger-modified">
              <Wrench aria-hidden="true" />
              已修改
            </span>
          )}
        </span>
        <small className="finance-ledger-detail">{sourceDetail(row)}</small>
        <small className="finance-ledger-state">
          {[
            row.status === 'manual' ? '自行新增' : '',
            row.sourceChanged ? '來源已變動' : '',
            row.sourceRemoved ? '來源已移除' : ''
          ]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </span>
      <span className="finance-ledger-expense">
        {row.direction === 'expense' && (
          <span className="expense-amount">
            {expenseText(row.amountMinor, row.currency)}
            {row.amountMinor < 0 && <small>沖減支出</small>}
          </span>
        )}
      </span>
      <span className="finance-ledger-income">
        {row.direction === 'income' && (
          <span className="income-amount">{incomeText(row.amountMinor, row.currency)}</span>
        )}
      </span>
      <ChevronRight className="finance-ledger-chevron" aria-hidden="true" />
    </button>
  )
  return (
    <section
      className={`finance-ledger finance-section-card${(data.deletedCount ?? 0) > 0 ? '' : ' no-deleted'}`}
    >
      <header>
        <div className="finance-ledger-heading">
          <span className="eyebrow dark">FINANCE / LEDGER</span>
          <div className="finance-ledger-title-line">
            <h2>收支明細</h2>
            <span className="finance-ledger-mobile-count">共 {data.rows.length} 筆</span>
          </div>
        </div>
        <span className="finance-ledger-desktop-count">共 {data.rows.length} 筆</span>
        <button type="button" className="primary-button ui-action-add" onClick={() => open('new')}>
          <Plus size={18} aria-hidden="true" />
          <span className="finance-add-desktop">新增明細</span>
          <span className="finance-add-mobile">新增</span>
        </button>
      </header>
      <div className="finance-ledger-rows">
        {data.rows.length ? (
          <>
            <div className="finance-ledger-columns" aria-hidden="true">
              <span>日期</span>
              <span>明細與計算依據</span>
              <span>支出</span>
              <span>收入</span>
              <span />
            </div>
            {[...data.rows].sort(ascending).map(rowView)}
            {data.totals.map((total) => (
              <div className="finance-ledger-total" key={total.currency}>
                <span />
                <strong>合計</strong>
                <span className="expense-amount">
                  {expenseText(total.expenseMinor, total.currency)}
                </span>
                <span className="income-amount">
                  {incomeText(total.incomeMinor, total.currency)}
                </span>
                <span className="finance-ledger-mobile-total">
                  <span>支出 {expenseText(total.expenseMinor, total.currency)}</span>
                  <span>收入 {incomeText(total.incomeMinor, total.currency)}</span>
                </span>
                <span />
              </div>
            ))}
          </>
        ) : (
          <p className="finance-context">這個月尚無明細。</p>
        )}
        {deletedOpen && (data.deletedCount ?? 0) > 0 && (
          <section className="finance-ledger-deleted" aria-label="已刪除明細">
            <h3>已刪除明細</h3>
            {deleted.isPending ? (
              <p className="finance-context">正在讀取已刪除明細…</p>
            ) : deleted.isError ? (
              <p role="alert" className="notice error">
                暫時無法讀取已刪除明細。
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void deleted.refetch()}
                >
                  重試
                </button>
              </p>
            ) : (
              <>
                {deleted.data.pages
                  .flatMap((p) => p.rows)
                  .sort(ascending)
                  .map(rowView)}
                {deleted.hasNextPage && (
                  <button
                    type="button"
                    className="secondary-button finance-ledger-more"
                    disabled={deleted.isFetchingNextPage}
                    onClick={() => void deleted.fetchNextPage()}
                  >
                    載入更多
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </div>
      {(data.deletedCount ?? 0) > 0 && (
        <button
          type="button"
          className="finance-text-button"
          onClick={() => setDeletedOpen(!deletedOpen)}
        >
          已刪除明細（{data.deletedCount}）{deletedOpen ? ' · 收起' : ' · 展開'}
        </button>
      )}
      {editor && (
        <SchedulingDialog
          title={editor === 'new' ? '新增明細' : '管理明細'}
          eyebrow="FORM / FINANCE"
          variant="profile"
          onClose={confirm ? () => setConfirm(null) : close}
          onDelete={
            editor !== 'new' &&
            data.rows.some((r) => r.id === editor.id) &&
            !confirm &&
            !mutation.isPending
              ? () => setConfirm('delete')
              : undefined
          }
        >
          <div
            className="finance-editor finance-ledger-editor"
            onKeyDownCapture={(event) => {
              const target = event.target
              const otherControl =
                target instanceof HTMLElement &&
                target.closest('button:not(.primary-button), a, input, textarea, select')
              if (
                confirm &&
                event.key === 'Enter' &&
                !event.repeat &&
                !mutation.isPending &&
                (event.ctrlKey || event.metaKey || !otherControl)
              ) {
                event.preventDefault()
                event.stopPropagation()
                act()
              }
            }}
          >
            {confirm ? (
              <>
                <p>
                  {confirm === 'delete'
                    ? editor !== 'new' && editor.status === 'manual'
                      ? '這筆自行新增明細將直接移除。'
                      : '這筆系統明細將移至已刪除明細，來源紀錄仍保留。'
                    : confirm === 'restore'
                      ? `恢復後將以 ${editor !== 'new' ? financeMoney(editor.amountMinor, editor.currency) : ''} 計入月份。`
                      : confirm === 'reset'
                        ? `取消修改後將顯示來源最新金額 ${editor !== 'new' ? financeMoney(editor.originalAmountMinor ?? editor.amountMinor, editor.currency) : ''}。`
                        : '來源已移除。將以目前明細數字另存為自行新增。'}
                </p>
                <div className="finance-actions finance-ledger-confirm-actions">
                  <button
                    type="button"
                    className="secondary-button ui-action-cancel"
                    onClick={() => setConfirm(null)}
                    aria-keyshortcuts="Escape"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="primary-button compact ui-action-save"
                    disabled={mutation.isPending}
                    onClick={act}
                    aria-keyshortcuts="Enter Control+Enter Meta+Enter"
                    autoFocus
                  >
                    {mutation.isPending ? '處理中…' : '確認'}
                  </button>
                </div>
              </>
            ) : (
              <form
                ref={formRef}
                autoComplete="off"
                onKeyDownCapture={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.repeat) {
                    event.preventDefault()
                    event.stopPropagation()
                    formRef.current?.requestSubmit()
                  }
                }}
                onSubmit={(event) => {
                  event.preventDefault()
                  save()
                }}
              >
                <div className="finance-ledger-datetime">
                  <SeriesDatePicker
                    label="日期"
                    labelSuffix={modifiedFields?.date ? <ModifiedFieldMark /> : null}
                    value={when.slice(0, 10)}
                    onChange={(date) => setWhen(`${date}T${when.slice(11) || '00:00'}`)}
                  />
                  <div className="scheduling-time-field">
                    <span>
                      時間
                      {modifiedFields?.time ? <ModifiedFieldMark /> : null}
                    </span>
                    <TimeSelect
                      label="時間"
                      value={when.slice(11)}
                      onChange={(time) => setWhen(`${when.slice(0, 10)}T${time}`)}
                    />
                  </div>
                </div>
                <label>
                  <span className="finance-ledger-field-title">
                    名稱{modifiedFields?.label && <ModifiedFieldMark />}
                  </span>
                  <input
                    required
                    maxLength={160}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </label>
                <div className={editor === 'new' ? 'finance-ledger-amount-row' : undefined}>
                  {editor === 'new' && (
                    <div className="finance-ledger-direction" role="group" aria-label="方向">
                      <span>方向</span>
                      <div className="scheduling-segmented">
                        <button
                          type="button"
                          aria-pressed={direction === 'income'}
                          onClick={() => setDirection('income')}
                        >
                          收入
                        </button>
                        <button
                          type="button"
                          aria-pressed={direction === 'expense'}
                          onClick={() => setDirection('expense')}
                        >
                          支出
                        </button>
                      </div>
                    </div>
                  )}
                  <label>
                    <span className="finance-ledger-field-title">
                      金額{editor === 'new' && `（${currency}）`}
                      {modifiedFields?.amount && <ModifiedFieldMark />}
                    </span>
                    <input
                      type="number"
                      onKeyDown={numericInputKeyDown}
                      data-allow-negative={editor !== 'new' && editor.kind === 'commission'}
                      min={editor !== 'new' && editor.kind === 'commission' ? undefined : 0}
                      step={1 / moneyFactor(currency)}
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </label>
                </div>
                {editor === 'new' && (
                  <label>
                    說明（選填）
                    <textarea
                      maxLength={4000}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>
                )}
                {editor !== 'new' && editor.status !== 'manual' && (
                  <section className="finance-ledger-source" aria-labelledby="finance-source-title">
                    <h3 id="finance-source-title">來源說明</h3>
                    <pre className="finance-ledger-source-display">{sourceExplanation(editor)}</pre>
                    {editor.targetRoute && (
                      <Link
                        className="finance-ledger-source-link ui-action-general"
                        to={financeSourceRoute(editor, params)}
                      >
                        前往來源紀錄 <ArrowUpRight aria-hidden="true" />
                      </Link>
                    )}
                  </section>
                )}
                <div className="finance-actions finance-ledger-footer">
                  {editor !== 'new' && !data.rows.some((r) => r.id === editor.id) && (
                    <button
                      type="button"
                      className="secondary-button finance-ledger-restore ui-action-general"
                      onClick={() => setConfirm(editor.sourceRemoved ? 'clone' : 'restore')}
                    >
                      {editor.sourceRemoved ? '另存為自行新增' : '恢復明細'}
                    </button>
                  )}
                  {editor !== 'new' && data.rows.some((r) => r.id === editor.id) && (
                    <button
                      type="button"
                      className="danger-outline-button ui-action-delete"
                      onClick={() => setConfirm('delete')}
                    >
                      刪除
                    </button>
                  )}
                  {editor !== 'new' && editor.status === 'modified' && !editor.sourceRemoved && (
                    <button
                      type="button"
                      className="secondary-button finance-ledger-reset ui-action-general"
                      onClick={() => setConfirm('reset')}
                    >
                      取消修改
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary-button finance-ledger-cancel ui-action-cancel"
                    onClick={close}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="primary-button compact finance-ledger-save ui-action-save"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? '處理中…' : '儲存'}
                  </button>
                </div>
              </form>
            )}
            {mutation.isError && (
              <div role="alert" className="notice error">
                {mutation.error.message}
                {editor !== 'new' &&
                  mutation.error instanceof ApiError &&
                  mutation.error.status === 409 &&
                  (mutation.error.details as unknown as { current?: Row }).current && (
                    <>
                      <p>
                        目前伺服器值：
                        {financeMoney(
                          (mutation.error.details as unknown as { current: Row }).current
                            .amountMinor,
                          editor.currency
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditor({
                            ...editor,
                            version: (
                              (mutation.error as ApiError).details as unknown as { current?: Row }
                            ).current?.version
                          })
                          setConfirm(null)
                          mutation.reset()
                        }}
                      >
                        載入最新版本，保留輸入
                      </button>
                    </>
                  )}
              </div>
            )}
          </div>
        </SchedulingDialog>
      )}
    </section>
  )
}
