import type { Session } from '@supabase/supabase-js'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ApiError, request } from '../../api'
import { SchedulingDialog } from '../calendar/SchedulingDialog'
import { FormSelect } from '../../shared/FormSelect'
import { workspaceWallTime } from './workspace-time'
import {
  financeMoney,
  ruleLabels,
  useFinanceMutation,
  type Credit,
  type Rule,
  type Venue
} from './finance-api'

type RecordRow = {
  sessionId: string
  sessionVersion: number
  recordVersion: number
  startsAt: string
  endsAt: string
  studentName: string
  customerSource: 'coach' | 'venue' | null
  rule: Rule | null
  status:
    | 'exempt'
    | 'allocated'
    | 'pending'
    | 'free'
    | 'untracked'
    | 'expense'
    | 'recorded-at-purchase'
    | 'missing'
  creditId: string | null
  credit: Credit | null
  remainingAfterDeduction: number | null
  purchaseId: string | null
  purchaseRoute: string | null
  purchase: {
    purchasedOn: string
    amountMinor: number
    lessonCount: number
    currency: string
  } | null
  calculation: {
    purchaseAmountMinor: number
    lessonCount: number
    currency: string
    originalCustomerSource: 'coach' | 'venue' | null
    originalRateMode: 'fixed' | 'by-source' | null
    originalRate: number | null
    appliedRate: number | null
  } | null
  expense: { amountMinor: number; currency: string } | null
  adjustment: { mode: string; amountMinor: number | null; rate: number | null } | null
  targetRoute: string
}
type Preview = {
  before: RecordRow
  after: RecordRow
  month: string
  totalsBefore: { currency: string; expenseMinor: number }[]
  totalsAfter: { currency: string; expenseMinor: number }[]
  credits: { id: string; purchasedOn: string; before: number; after: number; lessonCount: number }[]
}

export function formatVenueRecordDateTime(
  instant: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat('zh-TW', { timeZone, hourCycle: 'h23', ...options }).format(
    new Date(instant)
  )
}

export function VenueCourseRecords({
  session,
  venue,
  credits,
  timeZone,
  onClose,
  onRuleHistory,
  highlightSessionId
}: {
  session: Session
  venue: Venue
  credits: Credit[]
  timeZone: string
  onClose: () => void
  onRuleHistory: () => void
  highlightSessionId?: string
}) {
  const query = useInfiniteQuery({
    queryKey: ['venues', session.user.id, venue.id, 'course-records'],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) =>
      request<{ records: RecordRow[]; nextCursor: string | null }>(
        `/api/v1/venues/${venue.id}/course-records${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
        session.access_token
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined
  })
  const mutation = useFinanceMutation(session)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [mode, setMode] = useState<'auto' | 'exempt' | 'batch' | 'amount' | 'rate'>('auto')
  const [creditId, setCreditId] = useState('')
  const [value, setValue] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const highlightedRef = useRef<HTMLButtonElement>(null)
  const records = query.data?.pages.flatMap((page) => page.records) ?? []
  const highlightedLoaded = records.some((item) => item.sessionId === highlightSessionId)
  useEffect(() => {
    if (highlightSessionId && !highlightedLoaded && query.hasNextPage && !query.isFetchingNextPage)
      void query.fetchNextPage()
  }, [
    highlightSessionId,
    highlightedLoaded,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage
  ])
  useEffect(() => {
    if (highlightedLoaded) highlightedRef.current?.scrollIntoView({ block: 'center' })
  }, [highlightedLoaded])
  const record = records.find((item) => item.sessionId === selected)
  const purchaseSummary = record?.purchase
    ? `${record.purchase.purchasedOn} · ${record.purchase.lessonCount} 堂 · 整包 ${financeMoney(record.purchase.amountMinor, record.purchase.currency)}（每堂 ${record.purchase.amountMinor % record.purchase.lessonCount === 0 ? financeMoney(record.purchase.amountMinor / record.purchase.lessonCount, record.purchase.currency) : `${financeMoney(record.purchase.amountMinor, record.purchase.currency)} ÷ ${record.purchase.lessonCount}`}）`
    : '這堂課尚無可對應的學生購課紀錄'
  const displayTime = (instant: string, options: Intl.DateTimeFormatOptions) =>
    formatVenueRecordDateTime(instant, timeZone, options)
  const recordMonth = (instant: string) => workspaceWallTime(instant, timeZone).slice(0, 7)
  const recordWeekday = (instant: string) => displayTime(instant, { weekday: 'narrow' })
  const price = (row: RecordRow) => {
    const calc = row.calculation
    if (!calc) return ''
    return calc.purchaseAmountMinor % calc.lessonCount === 0
      ? `${financeMoney(calc.purchaseAmountMinor / calc.lessonCount, calc.currency)}／堂`
      : `${financeMoney(calc.purchaseAmountMinor, calc.currency)} ÷ ${calc.lessonCount} 堂`
  }
  const source = (value: 'coach' | 'venue' | null) =>
    value === 'coach' ? '自帶客' : value === 'venue' ? '場地供客' : '客源未記錄'
  const rate = (row: RecordRow, original = false) => {
    const calc = row.calculation
    if (!calc) return ''
    const value = original ? calc.originalRate : calc.appliedRate
    if (value === null) return '未記錄抽成'
    if (!original && row.adjustment?.mode === 'rate') return `本堂調整 ${value}%`
    const fixed = original ? calc.originalRateMode === 'fixed' : row.rule?.rate != null
    return fixed
      ? `固定抽成 ${value}%`
      : `${source(original ? calc.originalCustomerSource : row.customerSource)} ${value}%`
  }
  const rateTransition = (row: RecordRow) => {
    const original = rate(row, true)
    const applied = rate(row)
    const sameBasis =
      row.calculation?.originalRateMode === (row.rule?.rate != null ? 'fixed' : 'by-source') &&
      row.adjustment?.mode !== 'rate' &&
      (row.calculation?.originalRateMode === 'fixed' ||
        row.calculation?.originalCustomerSource === row.customerSource)
    return `${original} → ${sameBasis ? `${row.calculation?.appliedRate}%` : applied}`
  }
  const description = (row: RecordRow) => {
    if (row.status === 'allocated')
      return {
        title: '已扣 1 堂預購額度',
        detail: `${row.credit?.purchasedOn ?? '未知日期'} 批次 · 扣除當下剩餘 ${row.remainingAfterDeduction ?? '—'} / ${row.credit?.lessonCount ?? '—'} 堂`
      }
    if (row.status === 'pending') {
      const started = credits.some(
        (credit) =>
          credit.venueId === venue.id &&
          (credit.startsDeductingAt ?? `${credit.purchasedOn}T00:00:00`) <= row.endsAt
      )
      return {
        title: '未紀錄扣堂',
        detail: started
          ? '完課時可用的預購批次額度不足，待補批次或人工指定'
          : '課堂結束早於所有預購批次的起扣時間，未自動扣堂'
      }
    }
    if (row.status === 'exempt')
      return { title: '明確不扣堂／不計費', detail: '這堂課已設定為豁免場地費或預購扣堂' }
    if (row.status === 'recorded-at-purchase')
      return {
        title: '抽成已記入購課',
        detail: rate(row)
      }
    if (row.status === 'free') return { title: '免費場地', detail: '這堂課的場地費為 0' }
    if (row.status === 'untracked')
      return { title: '不記錄場地支出', detail: '這堂課沒有場地費計算' }
    if (row.status === 'missing')
      return { title: '待補計算資料', detail: '請查看購課價格、客源與適用規則' }
    if (row.expense && row.rule?.kind === 'rent')
      return {
        title: `場地租用 · ${financeMoney(row.expense.amountMinor, row.expense.currency)}`,
        detail: `單次計價${row.adjustment?.mode === 'amount' ? ' · 本堂金額已調整' : ''}`
      }
    if (row.expense && row.calculation)
      return {
        title: `${row.calculation.originalRate === null ? '逐堂抽成' : row.expense.amountMinor < 0 ? '沖減抽成差額' : '補扣抽成差額'} · ${financeMoney(Math.abs(row.expense.amountMinor), row.expense.currency)}`,
        detail: `${row.calculation.originalRate === null ? rate(row) : rateTransition(row)} · 購課 ${price(row)}`
      }
    return { title: '待補資料', detail: '請查看這堂課的來源與規則' }
  }
  const label = (row: RecordRow) => `${description(row).title} · ${description(row).detail}`
  const closeLayer = () => {
    if (editing) {
      setEditing(false)
      setPreview(null)
    } else if (selected) {
      setSelected(null)
      setPreview(null)
    } else onClose()
  }
  const body = record
    ? {
        sessionVersion: record.sessionVersion,
        recordVersion: record.recordVersion,
        mode,
        creditId: mode === 'batch' ? creditId || null : null,
        amountMinor: mode === 'amount' ? Number(value) : null,
        rate: mode === 'rate' ? Number(value) : null
      }
    : null
  return (
    <SchedulingDialog
      title={`場地課程紀錄 - ${venue.name}`}
      eyebrow="FORM / VENUE"
      variant="profile"
      onClose={closeLayer}
    >
      {!selected && (
        <div className="venue-course-records-toolbar">
          <p>已完成課堂 · 由新到舊</p>
          <button type="button" className="venue-rule-history-option" onClick={onRuleHistory}>
            <span>
              <strong>過往支出類型</strong>
              <small>查看費率與場地費的變更</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="finance-editor venue-course-records">
        {selected ? (
          record ? (
            <section className="venue-course-detail">
              <header className="venue-course-detail-heading">
                <h3>
                  {venue.name} - {record.studentName}
                </h3>
                <time>
                  {displayTime(record.startsAt, { dateStyle: 'medium', timeStyle: 'short' })} –{' '}
                  {displayTime(record.endsAt, { timeStyle: 'short' })}
                </time>
              </header>
              <details className="venue-course-rule">
                <summary>
                  <span>
                    <strong>{description(record).title}</strong>
                    <small>{description(record).detail}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </summary>
                <div className="venue-course-rule-detail">
                  <p>
                    適用規則：{ruleLabels[record.rule?.kind ?? 'untracked']}
                    {record.rule?.effectiveAt &&
                      ` · ${workspaceWallTime(record.rule.effectiveAt, timeZone).replace('T', ' ')} 起生效`}
                  </p>
                  {record.status === 'recorded-at-purchase' && (
                    <p>整包抽成已在購課月份記入；這堂課不另列支。</p>
                  )}
                  {record.credit && (
                    <p>
                      預購批次：{record.credit.purchasedOn} 購買 ·{' '}
                      {record.credit.startsDeductingAt
                        ? workspaceWallTime(record.credit.startsDeductingAt, timeZone).replace(
                            'T',
                            ' '
                          )
                        : record.credit.purchasedOn}{' '}
                      起扣 · 本堂扣 1 堂 · 目前此批剩餘 {record.credit.remainingLessons} 堂
                    </p>
                  )}
                  {record.calculation && (
                    <p>
                      購課時 {rate(record, true)}，這堂課 {rate(record)}；依購課 {price(record)}{' '}
                      計算。
                    </p>
                  )}
                </div>
              </details>
              {record.purchaseRoute ? (
                <Link
                  className="venue-course-purchase"
                  to={`${record.purchaseRoute}#purchase-history`}
                  aria-label={`查看${record.studentName}的購課來源：${purchaseSummary}`}
                >
                  <span>
                    <small>學生購課來源</small>
                    <span>{purchaseSummary}</span>
                  </span>
                  <ChevronRight size={19} aria-hidden="true" />
                </Link>
              ) : (
                <div className="venue-course-purchase" aria-disabled="true">
                  <span>
                    <small>學生購課來源</small>
                    <span>{purchaseSummary}</span>
                  </span>
                </div>
              )}
              {!editing ? (
                <div className="venue-course-detail-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setMode((record.adjustment?.mode as typeof mode) ?? 'auto')
                      setCreditId(record.creditId ?? '')
                      setValue(
                        String(record.adjustment?.amountMinor ?? record.adjustment?.rate ?? '')
                      )
                      setEditing(true)
                    }}
                  >
                    修改場地紀錄
                  </button>
                  <Link className="venue-course-session-link" to={record.targetRoute}>
                    查看課堂
                  </Link>
                </div>
              ) : (
                <form
                  ref={formRef}
                  onKeyDownCapture={(event) => {
                    if (
                      event.key === 'Enter' &&
                      (event.ctrlKey || event.metaKey) &&
                      !event.repeat
                    ) {
                      event.preventDefault()
                      event.stopPropagation()
                      formRef.current?.requestSubmit()
                    }
                  }}
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!body) return
                    if (!preview) {
                      mutation.mutate(
                        {
                          path: `/venues/${venue.id}/course-records/${record.sessionId}/preview`,
                          body
                        },
                        { onSuccess: (result) => setPreview(result as Preview) }
                      )
                      return
                    }
                    mutation.mutate(
                      {
                        path: `/venues/${venue.id}/course-records/${record.sessionId}`,
                        method: 'PATCH',
                        body
                      },
                      {
                        onSuccess: () => {
                          setEditing(false)
                          setPreview(null)
                          void query.refetch()
                        }
                      }
                    )
                  }}
                >
                  <label>
                    計算方式
                    <FormSelect
                      label="計算方式"
                      value={mode}
                      onChange={(next) => {
                        setMode(next as typeof mode)
                        setPreview(null)
                      }}
                      options={[
                        { value: 'auto', label: '自動計算' },
                        { value: 'exempt', label: '不扣堂／不計費' },
                        ...(record.rule?.kind === 'prepaid'
                          ? [{ value: 'batch', label: '指定預購批次' }]
                          : [
                              { value: 'amount', label: '調整該堂金額' },
                              { value: 'rate', label: '調整該堂費率' }
                            ])
                      ]}
                    />
                  </label>
                  {mode === 'batch' && (
                    <label>
                      預購批次
                      <FormSelect
                        label="預購批次"
                        required
                        value={creditId}
                        onChange={(next) => {
                          setCreditId(next)
                          setPreview(null)
                        }}
                        options={[
                          { value: '', label: '選擇批次' },
                          ...credits
                            .filter(
                              (c) =>
                                c.venueId === venue.id &&
                                (c.remainingLessons > 0 || c.id === record.creditId)
                            )
                            .map((c) => ({
                              value: c.id,
                              label: `${c.purchasedOn} · 起扣 ${c.startsDeductingAt ? workspaceWallTime(c.startsDeductingAt, timeZone).replace('T', ' ') : c.purchasedOn} · 剩餘 ${c.remainingLessons} 堂`
                            }))
                        ]}
                      />
                    </label>
                  )}
                  {(mode === 'amount' || mode === 'rate') && (
                    <label>
                      {mode === 'rate' ? '費率（%）' : '金額（最小貨幣單位）'}
                      <input
                        required
                        type="number"
                        min={mode === 'rate' ? 0 : -999999999999}
                        max={mode === 'rate' ? 100 : 999999999999}
                        step={mode === 'rate' ? 0.01 : 1}
                        value={value}
                        onChange={(event) => {
                          setValue(event.target.value)
                          setPreview(null)
                        }}
                      />
                    </label>
                  )}
                  {preview && (
                    <section className="finance-preview" aria-label="變更預覽">
                      <p>
                        這堂課：{label(preview.before)} → {label(preview.after)}
                      </p>
                      {preview.credits
                        .filter((credit) => credit.before !== credit.after)
                        .map((credit) => (
                          <p key={credit.id}>
                            {credit.purchasedOn} 批次剩餘：{credit.lessonCount - credit.before} →{' '}
                            {credit.lessonCount - credit.after} 堂
                          </p>
                        ))}
                      {preview.totalsBefore.map((total) => {
                        const next = preview.totalsAfter.find(
                          (item) => item.currency === total.currency
                        )
                        return (
                          <p key={total.currency}>
                            {preview.month} 支出（{total.currency}）：
                            {financeMoney(total.expenseMinor, total.currency)} →{' '}
                            {financeMoney(next?.expenseMinor ?? 0, total.currency)}
                          </p>
                        )
                      })}
                    </section>
                  )}
                  {mutation.isError && (
                    <div role="alert" className="notice error">
                      {mutation.error.message}
                      {mutation.error instanceof ApiError &&
                        mutation.error.status === 409 &&
                        (mutation.error.details as unknown as { current?: RecordRow }).current && (
                          <p>
                            目前伺服器紀錄：
                            {label(
                              (mutation.error.details as unknown as { current: RecordRow }).current
                            )}
                          </p>
                        )}
                      {mutation.error instanceof ApiError && mutation.error.status === 409 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreview(null)
                            mutation.reset()
                            void query.refetch()
                          }}
                        >
                          載入最新紀錄，保留輸入
                        </button>
                      )}
                    </div>
                  )}
                  <div className="finance-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setEditing(false)
                        setPreview(null)
                      }}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="primary-button compact"
                      disabled={mutation.isPending}
                      title="Ctrl/Cmd + Enter"
                    >
                      {preview ? '儲存' : '預覽變更'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : (
            <p>這堂課的資料已更新。關閉後可查看最新列表。</p>
          )
        ) : (
          <>
            {query.isPending ? (
              <p>正在讀取課程紀錄…</p>
            ) : query.isError ? (
              <p role="alert" className="notice error">
                暫時無法讀取課程紀錄。<button onClick={() => void query.refetch()}>重試</button>
              </p>
            ) : records.length === 0 ? (
              <p>這個場地尚無已完成課堂。</p>
            ) : (
              <>
                {highlightSessionId && !highlightedLoaded && !query.hasNextPage && (
                  <p role="status">找不到這筆場地課程紀錄。可返回收支明細確認來源。</p>
                )}
                {records.map((item, index) => {
                  const month = recordMonth(item.startsAt)
                  return (
                    <Fragment key={item.sessionId}>
                      {(index === 0 || month !== recordMonth(records[index - 1]!.startsAt)) && (
                        <div className="venue-record-month" role="heading" aria-level={3}>
                          {Number(month.slice(0, 4))} 年 {Number(month.slice(5, 7))} 月
                        </div>
                      )}
                      <button
                        type="button"
                        ref={item.sessionId === highlightSessionId ? highlightedRef : undefined}
                        className={`venue-record${item.sessionId === highlightSessionId ? ' is-source-highlight' : ''}`}
                        aria-current={item.sessionId === highlightSessionId ? 'true' : undefined}
                        onClick={() => setSelected(item.sessionId)}
                      >
                        <span>
                          {displayTime(item.startsAt, { dateStyle: 'short' })}（
                          {recordWeekday(item.startsAt)}）{' '}
                          {displayTime(item.startsAt, { timeStyle: 'short' })} –{' '}
                          {displayTime(item.endsAt, { timeStyle: 'short' })} · {item.studentName}
                        </span>
                        <span className="venue-record-summary">
                          <strong>{description(item).title}</strong>
                          <small>{description(item).detail}</small>
                        </span>
                      </button>
                    </Fragment>
                  )
                })}
              </>
            )}
            {query.hasNextPage && (
              <button
                type="button"
                className="secondary-button"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                載入更多課堂
              </button>
            )}
          </>
        )}
      </div>
    </SchedulingDialog>
  )
}
