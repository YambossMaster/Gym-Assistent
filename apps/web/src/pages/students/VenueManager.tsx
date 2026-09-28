import { ApiError, listStudents } from '../../api'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, MapPin, ChevronRight, Pencil, X } from 'lucide-react'
import { SchedulingDialog } from '../calendar/SchedulingDialog'
import { SeriesDatePicker } from './SeriesDatePicker'
import { FormSelect } from '../../shared/FormSelect'
import { TimeSelect } from '../../shared/TimeSelect'
import { numericInputKeyDown } from '../../shared/numeric-input'
import { Confirmation } from '../../shared/primitives'
import {
  financeMoney,
  financeReturnPath,
  moneyFactor,
  ruleLabels,
  useFinanceMutation,
  useVenues,
  venueKey,
  type Credit,
  type Rule,
  type Venue,
  type VenueData
} from './finance-api'
import { getDefaultFinanceCurrency, PurchaseMoneyFields } from './PurchaseMoneyFields'
import { VenueCourseRecords } from './VenueCourseRecords'
import { workspaceInstant, workspaceWallTime } from './workspace-time'
import { queryKeys } from '../../query-keys'

type Editor =
  | { kind: 'create' }
  | {
      kind:
        | 'venue'
        | 'rename'
        | 'rule'
        | 'history'
        | 'rule-history'
        | 'course-records'
        | 'coach-supplied'
        | 'credit'
        | 'salary'
      venue: Venue
      credit?: Credit
    }
function ruleSetting(rule: Rule) {
  if (rule.kind === 'commission')
    return rule.rate !== null
      ? `固定抽成 ${rule.rate}%`
      : `場地供客 ${rule.venueRate}%／自帶客 ${rule.coachRate}%`
  if (rule.kind === 'rent' && rule.amountMinor !== null && rule.currency)
    return `單次計費 ${financeMoney(rule.amountMinor, rule.currency)}`
  if (rule.kind === 'prepaid') return '每完成 1 堂課，扣除 1 堂預購場地額度'
  if (rule.kind === 'free') return '免費使用場地；已知場地費為 0'
  return '不計算或記錄場地費'
}
function ruleChange(rule: Rule, previous?: Rule) {
  if (!previous) return `開始使用：${ruleSetting(rule)}`
  if (previous.kind !== rule.kind)
    return `場地支出類型變更：${ruleLabels[previous.kind]} → ${ruleLabels[rule.kind]}`
  if (rule.kind === 'commission' && previous.kind === 'commission') {
    if ((rule.rate === null) !== (previous.rate === null))
      return `抽成方式 ${ruleSetting(previous)} → ${ruleSetting(rule)}`
    if (rule.rate !== null && previous.rate !== null && rule.rate !== previous.rate)
      return `固定抽成 ${previous.rate}% → ${rule.rate}%`
    if (
      rule.rate === null &&
      previous.rate === null &&
      (rule.venueRate !== previous.venueRate || rule.coachRate !== previous.coachRate)
    )
      return `場地供客 ${previous.venueRate}% → ${rule.venueRate}%；自帶客 ${previous.coachRate}% → ${rule.coachRate}%`
  }
  if (
    rule.kind === 'rent' &&
    previous.kind === 'rent' &&
    rule.currency &&
    previous.currency &&
    rule.amountMinor !== null &&
    previous.amountMinor !== null &&
    (rule.amountMinor !== previous.amountMinor || rule.currency !== previous.currency)
  )
    return `單次計費 ${financeMoney(previous.amountMinor, previous.currency)} → ${financeMoney(rule.amountMinor, rule.currency)}`
  if (rule.collectionMode !== previous.collectionMode)
    return `收款方式變更：${previous.collectionMode === 'coach' ? '教練收款' : '場地收款'} → ${rule.collectionMode === 'coach' ? '教練收款' : '場地收款'}`
  return `支出設定未變（重新設定生效時間）`
}
function sameVenueView(a: Venue, b: Venue) {
  return (
    a.id === b.id &&
    a.version === b.version &&
    a.name === b.name &&
    a.address === b.address &&
    a.active === b.active &&
    a.canDelete === b.canDelete &&
    a.remaining === b.remaining &&
    a.currentRule?.id === b.currentRule?.id
  )
}
export function VenueManager({ session }: { session: Session }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const query = useVenues(session),
    [editor, setEditor] = useState<Editor | null>(null),
    [editorStack, setEditorStack] = useState<Editor[]>([]),
    [archived, setArchived] = useState(false)
  const venues = query.data?.venues ?? []
  const activeCount = venues.filter((venue) => venue.active).length
  const archivedCount = venues.length - activeCount
  const visibleVenues = venues.filter((venue) => venue.active !== archived)
  const venueId = params.get('venue'),
    creditId = params.get('credit'),
    courseId = params.get('course')
  useEffect(() => {
    if (!venueId || !query.data) return
    const venue = query.data.venues.find((v) => v.id === venueId)
    if (!venue) return
    const credit = query.data.credits.find((p) => p.id === creditId && p.venueId === venueId)
    setEditor((current) => {
      if (courseId)
        return current?.kind === 'course-records' && current.venue.id === venueId
          ? current
          : { kind: 'course-records', venue }
      if (
        current &&
        'venue' in current &&
        current.venue.id === venueId &&
        current.kind !== 'venue' &&
        !(creditId && current.kind === 'credit' && current.credit?.id === creditId)
      )
        return current
      if (credit)
        return current?.kind === 'credit' && current.credit?.version === credit.version
          ? current
          : { kind: 'credit', venue, credit }
      return current?.kind === 'venue' && sameVenueView(current.venue, venue)
        ? current
        : { kind: 'venue', venue }
    })
  }, [venueId, creditId, courseId, query.data])
  useEffect(() => {
    if (venueId || !query.data) return
    setEditor((current) => {
      if (current?.kind !== 'venue') return current
      const latest = query.data!.venues.find((venue) => venue.id === current.venue.id)
      return latest && !sameVenueView(latest, current.venue)
        ? { kind: 'venue', venue: latest }
        : current
    })
  }, [venueId, query.data])
  const closeEditor = () => {
    const previous = editorStack.at(-1)
    if (previous) {
      const venue =
        'venue' in previous
          ? query.data?.venues.find((item) => item.id === previous.venue.id)
          : undefined
      setEditor(venue && 'venue' in previous ? { ...previous, venue } : previous)
      setEditorStack((stack) => stack.slice(0, -1))
      return
    }
    if (params.get('from') === 'finances') {
      navigate(financeReturnPath(params))
      return
    }
    setEditor(null)
    if (venueId) {
      const next = new URLSearchParams(params)
      for (const key of ['venue', 'credit']) next.delete(key)
      setParams(next, { replace: true })
    }
  }
  const navigateEditor = (next: Editor) => {
    if (editor) setEditorStack((stack) => [...stack, editor])
    setEditor(next)
  }
  return (
    <section id="venue-management" className="venue-management finance-section-card">
      <header>
        <div>
          <span className="eyebrow dark">場地</span>
          <h2>場地與支出</h2>
        </div>
        <button
          className="secondary-button venue-add-button ui-action-add"
          onClick={() => setEditor({ kind: 'create' })}
        >
          <Plus size={16} aria-hidden="true" />
          <span>新增場地</span>
        </button>
      </header>
      {query.isPending ? (
        <p>正在讀取場地…</p>
      ) : query.isError && !query.data ? (
        <p className="notice error" role="alert">
          暫時無法讀取場地。<button onClick={() => void query.refetch()}>重試</button>
        </p>
      ) : (
        <>
          {query.isError && (
            <p className="notice error" role="alert">
              更新失敗，目前顯示先前場地。<button onClick={() => void query.refetch()}>重試</button>
            </p>
          )}
          <div className="venue-status-toolbar">
            <div className="student-view-switch" role="group" aria-label="場地狀態">
              <button type="button" onClick={() => setArchived(false)} aria-pressed={!archived}>
                進行中 <span>{activeCount}</span>
              </button>
              <button type="button" onClick={() => setArchived(true)} aria-pressed={archived}>
                已封存 <span>{archivedCount}</span>
              </button>
            </div>
          </div>
          <div className="venue-list" aria-live="polite">
            {visibleVenues.map((v) => (
              <article className="venue-card" key={v.id}>
                <button
                  className="venue-card-heading"
                  onClick={() => setEditor({ kind: 'venue', venue: v })}
                >
                  <MapPin size={20} />
                  <div>
                    <strong>{v.name}</strong>
                    <span
                      className={v.currentRule?.kind === 'prepaid' && v.remaining <= 1 ? 'low' : ''}
                    >
                      {ruleLabels[v.currentRule?.kind ?? 'untracked']}
                      {v.currentRule?.kind === 'prepaid' &&
                        `（剩餘可用堂數 ${v.remaining} 堂 · 未扣堂數 ${v.pendingLessons ?? 0} 堂）`}
                    </span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </article>
            ))}
          </div>
          {visibleVenues.length === 0 && (
            <p className="finance-context">
              {venues.length === 0 ? '新增常用場地，也可以先只記錄名稱。' : '這個分類尚無場地。'}
            </p>
          )}
        </>
      )}
      {editor && (
        <VenueEditor
          key={`${editor.kind}:${'venue' in editor ? editor.venue.id : ''}:${'credit' in editor ? editor.credit?.id : ''}`}
          session={session}
          editor={editor}
          data={query.data}
          onClose={closeEditor}
          onNavigate={navigateEditor}
          highlightSessionId={courseId ?? undefined}
        />
      )}
    </section>
  )
}
function VenueEditor({
  session,
  editor,
  data,
  onClose,
  onNavigate,
  highlightSessionId
}: {
  session: Session
  editor: Editor
  data: VenueData | undefined
  onClose: () => void
  onNavigate: (e: Editor) => void
  highlightSessionId?: string
}) {
  const mutation = useFinanceMutation(session),
    venue = 'venue' in editor ? editor.venue : null
  const studentQuery = useQuery({
    queryKey: queryKeys.students(session.user.id),
    queryFn: () => listStudents(session.access_token),
    enabled:
      (editor.kind === 'venue' || editor.kind === 'coach-supplied') &&
      venue?.currentRule?.kind === 'commission' &&
      venue.currentRule.rate === null
  })
  const queryClient = useQueryClient()
  const [version, setVersion] = useState(
    'credit' in editor && editor.credit ? editor.credit.version : (venue?.version ?? 1)
  )
  const [name, setName] = useState(venue?.name ?? ''),
    [address, setAddress] = useState(venue?.address ?? ''),
    [date, setDate] = useState(
      'credit' in editor && editor.credit
        ? editor.credit.purchasedOn
        : (data?.today ?? new Intl.DateTimeFormat('en-CA').format(new Date()))
    )
  const [deductDate, setDeductDate] = useState(
    'credit' in editor && editor.credit?.startsDeductingAt
      ? workspaceWallTime(editor.credit.startsDeductingAt, data?.timeZone ?? 'Asia/Taipei').slice(
          0,
          10
        )
      : (data?.today ?? new Intl.DateTimeFormat('en-CA').format(new Date()))
  )
  const [kind, setKind] = useState<Rule['kind']>(venue?.currentRule?.kind ?? 'untracked'),
    [dual, setDual] = useState(
      venue?.currentRule?.kind === 'commission' && venue.currentRule.rate === null
    )
  const [salaryEnabled, setSalaryEnabled] = useState(
    (data?.salaryRules ?? [])
      .filter((rule) => rule.venueId === venue?.id)
      .slice()
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.enabled ?? false
  )
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [preview, setPreview] = useState<any>(null),
    [deleting, setDeleting] = useState(false),
    [pendingBody, setPendingBody] = useState<any>(null),
    [selected, setSelected] = useState<Record<string, boolean>>({})
  const preferredCurrency = getDefaultFinanceCurrency()
  const creditCurrency = ('credit' in editor ? editor.credit?.currency : null) ?? preferredCurrency
  const venueRules = venue ? (data?.rules.filter((rule) => rule.venueId === venue.id) ?? []) : []
  const venueCredits = venue
    ? (data?.credits.filter((credit) => credit.venueId === venue.id) ?? [])
    : []
  const salaryRules = venue
    ? (data?.salaryRules ?? []).filter((rule) => rule.venueId === venue.id)
    : []
  const currentSalary = salaryRules
    .slice()
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
  const commissionSummary =
    venue?.currentRule?.kind === 'commission'
      ? venue.currentRule.rate !== null
        ? `${venue.currentRule.rate}%`
        : venue.currentRule.venueRate !== null && venue.currentRule.coachRate !== null
          ? `場地供客 ${venue.currentRule.venueRate}% / 自帶客 ${venue.currentRule.coachRate}%`
          : null
      : null
  const rentSummary =
    venue?.currentRule?.kind === 'rent' &&
    venue.currentRule.amountMinor !== null &&
    venue.currentRule.currency
      ? financeMoney(venue.currentRule.amountMinor, venue.currentRule.currency)
      : null
  const orderedRules = venueRules
    .slice()
    .sort((a, b) =>
      (a.effectiveAt ?? a.effectiveFrom).localeCompare(b.effectiveAt ?? b.effectiveFrom)
    )
  const historicalRules = orderedRules.filter((rule, index) => {
    if (rule.effectiveFrom === '0001-01-01') return false
    const previous = orderedRules[index - 1]
    if (!previous) return true
    return (
      rule.kind !== previous.kind ||
      rule.collectionMode !== previous.collectionMode ||
      (rule.kind === 'commission' &&
        (rule.rate !== previous.rate ||
          rule.coachRate !== previous.coachRate ||
          rule.venueRate !== previous.venueRate)) ||
      (rule.kind === 'rent' &&
        (rule.amountMinor !== previous.amountMinor || rule.currency !== previous.currency))
    )
  })
  const hasRuleHistory = historicalRules.length > 0
  const hasPrepaidSection = venue?.currentRule?.kind === 'prepaid' || venueCredits.length > 0
  const hasCoachSection =
    venue?.currentRule?.kind === 'commission' && venue.currentRule.rate === null
  const coachSuppliedIds = new Set(
    (data?.coachSuppliedStudents ?? [])
      .filter((item) => item.venueId === venue?.id)
      .map((item) => item.studentId)
  )
  const hasHistoryCandidates =
    !!venue &&
    !!data &&
    (data.sessions.some((session) => !session.venueId && session.location?.trim() === venue.name) ||
      data.series.some((series) => !series.venueId && series.location.trim() === venue.name))
  const title =
    editor.kind === 'create'
      ? '新增場地'
      : editor.kind === 'venue'
        ? venue!.name
        : editor.kind === 'rename'
          ? '編輯場地名稱'
          : editor.kind === 'rule'
            ? '變更場地支出'
            : editor.kind === 'salary'
              ? '設定場地底薪'
              : editor.kind === 'credit'
                ? editor.credit
                  ? '編輯場地預購'
                  : '登錄場地預購'
                : editor.kind === 'rule-history'
                  ? '過往支出類型'
                  : editor.kind === 'course-records'
                    ? '場地課程紀錄'
                    : editor.kind === 'coach-supplied'
                      ? '加入自帶客'
                      : '關聯歷史課程'
  const save = (path: string, body: unknown, method = 'POST', close = true) =>
    mutation.mutate(
      { path, body, method },
      {
        onSuccess: (r) => {
          if (close) onClose()
          else setPreview(r)
        }
      }
    )
  if (deleting && editor.kind === 'credit' && editor.credit)
    return (
      <Confirmation
        title="刪除這筆場地預購？"
        text="刪除後無法復原。場地剩餘堂數與購買月份的支出將重新計算；已完成課程仍會保留。"
        confirmLabel="刪除預購紀錄"
        disabled={mutation.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={() =>
          mutation.mutate(
            {
              path: `/venues/${venue!.id}/credit-purchases/${editor.credit!.id}`,
              method: 'DELETE',
              body: { version }
            },
            { onSuccess: onClose, onError: () => setDeleting(false) }
          )
        }
      />
    )
  if (deleting)
    return (
      <Confirmation
        title={`永久刪除「${venue!.name}」？`}
        text="刪除後無法復原。已有課程或收支紀錄的場地會保留原資料。"
        confirmLabel="刪除場地"
        disabled={mutation.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={() =>
          mutation.mutate(
            { path: `/venues/${venue!.id}`, method: 'DELETE', body: { version } },
            { onSuccess: onClose, onError: () => setDeleting(false) }
          )
        }
      />
    )
  if (editor.kind === 'course-records')
    return (
      <VenueCourseRecords
        session={session}
        venue={venue!}
        credits={data?.credits ?? []}
        timeZone={data?.timeZone ?? 'Asia/Taipei'}
        onClose={onClose}
        onRuleHistory={() => onNavigate({ kind: 'rule-history', venue: venue! })}
        highlightSessionId={highlightSessionId}
      />
    )
  return (
    <SchedulingDialog
      title={title}
      description={editor.kind === 'venue' ? venue?.address?.trim() || '\u00a0' : undefined}
      eyebrow="FORM / VENUE"
      variant="profile"
      titleAction={
        editor.kind === 'venue' ? (
          <button
            type="button"
            className="finance-text-button venue-rename-action"
            onClick={() => onNavigate({ kind: 'rename', venue: venue! })}
          >
            <Pencil size={13} aria-hidden="true" />
            編輯名稱
          </button>
        ) : undefined
      }
      onClose={onClose}
      onDelete={
        (editor.kind === 'venue' && venue?.canDelete) || (editor.kind === 'credit' && editor.credit)
          ? () => setDeleting(true)
          : undefined
      }
    >
      <div className={`finance-editor${editor.kind === 'venue' ? ' venue-detail-editor' : ''}`}>
        {editor.kind === 'venue' ? (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                onClose()
              }}
              className="venue-detail-submit"
            />
            <button
              className="venue-setting-link"
              onClick={() => onNavigate({ kind: 'rule', venue: venue! })}
            >
              <span>
                場地支出類型{' '}
                <small>
                  {ruleLabels[venue!.currentRule?.kind ?? 'untracked']}
                  {commissionSummary ? `（${commissionSummary}）` : ''}
                  {rentSummary ? `（${rentSummary}／堂）` : ''}
                </small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              className="venue-setting-link"
              onClick={() => onNavigate({ kind: 'salary', venue: venue! })}
            >
              <span>
                底薪與否？{' '}
                <small>
                  {currentSalary?.enabled
                    ? `${financeMoney(currentSalary.amountMinor ?? 0, currentSalary.currency ?? preferredCurrency)} · 每月 ${currentSalary.payDay} 日發薪`
                    : '無底薪'}
                </small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            {hasCoachSection && (
              <section className="venue-detail-section venue-coach-section">
                <div className="venue-detail-section-heading">
                  <h3>教練自帶客</h3>
                  <small className="venue-coach-meta">
                    （未標記的學生依場地供客計算） 共 {coachSuppliedIds.size} 名
                  </small>
                  <button
                    className="finance-text-button"
                    onClick={() => onNavigate({ kind: 'coach-supplied', venue: venue! })}
                  >
                    <Plus size={15} aria-hidden="true" />
                    加入自帶客
                  </button>
                </div>
                <div className="venue-coach-chips">
                  {studentQuery.data
                    ?.filter((student) => coachSuppliedIds.has(student.id))
                    .map((student) => (
                      <span className="venue-coach-chip" key={student.id}>
                        {student.name}
                        <button
                          type="button"
                          aria-label={`移除自帶客 ${student.name}`}
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate(
                              {
                                path: `/venues/${venue!.id}/coach-supplied-students`,
                                body: { version, studentId: student.id, coachSupplied: false }
                              },
                              { onSuccess: () => setVersion((value) => value + 1) }
                            )
                          }
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                </div>
              </section>
            )}
            {hasPrepaidSection && (
              <section className="venue-detail-section venue-prepaid-section">
                <div className="venue-detail-section-heading">
                  <h3>
                    場地堂數 <small>（剩餘 {venue!.remaining} 堂）</small>
                  </h3>
                  {venue!.active && venue!.currentRule?.kind === 'prepaid' && (
                    <button
                      className="finance-text-button"
                      onClick={() => onNavigate({ kind: 'credit', venue: venue! })}
                    >
                      <Plus size={15} aria-hidden="true" />
                      登錄預購
                    </button>
                  )}
                </div>
                <div className="venue-credit-list">
                  {venueCredits
                    .slice()
                    .sort(
                      (a, b) =>
                        b.purchasedOn.localeCompare(a.purchasedOn) || b.id.localeCompare(a.id)
                    )
                    .map((p) => (
                      <button
                        className="venue-record"
                        key={p.id}
                        onClick={() => onNavigate({ kind: 'credit', venue: venue!, credit: p })}
                      >
                        <span>
                          {p.purchasedOn} · {p.lessonCount} 堂{' '}
                          <small>（剩餘 {p.remainingLessons} 堂）</small>
                        </span>
                        <span>
                          {financeMoney(p.amountMinor, p.currency)}
                          <small>
                            （每堂{' '}
                            {financeMoney(Math.round(p.amountMinor / p.lessonCount), p.currency)}）
                          </small>
                          <ChevronRight size={16} />
                        </span>
                      </button>
                    ))}
                </div>
              </section>
            )}
            <button
              className="venue-setting-link"
              onClick={() => onNavigate({ kind: 'course-records', venue: venue! })}
            >
              <span>場地課程紀錄</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            {hasHistoryCandidates && (
              <button
                className="finance-text-button venue-history-link"
                onClick={() => onNavigate({ kind: 'history', venue: venue! })}
              >
                關聯既有課程
              </button>
            )}
            <div
              className={`venue-detail-footer${hasCoachSection || hasPrepaidSection || hasRuleHistory || hasHistoryCandidates ? ' has-sections' : ''}`}
            >
              {!venue!.active && (
                <button
                  className="secondary-button ui-action-general"
                  disabled={mutation.isPending}
                  onClick={() =>
                    save(
                      `/venues/${venue!.id}`,
                      { version, name: venue!.name, active: true },
                      'PATCH'
                    )
                  }
                >
                  恢復場地
                </button>
              )}
              {venue!.active && !venue!.canDelete && (
                <button
                  className="secondary-button ui-action-general"
                  disabled={mutation.isPending}
                  onClick={() =>
                    save(
                      `/venues/${venue!.id}`,
                      { version, name: venue!.name, active: false },
                      'PATCH'
                    )
                  }
                >
                  封存場地
                </button>
              )}
              {venue!.canDelete && (
                <button
                  type="button"
                  className="danger-outline-button ui-action-delete"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset()
                    setDeleting(true)
                  }}
                >
                  刪除場地
                </button>
              )}
              <span className="venue-detail-footer-actions">
                <button
                  type="button"
                  className="secondary-button ui-action-cancel"
                  onClick={onClose}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="primary-button compact ui-action-save"
                  onClick={onClose}
                >
                  儲存
                </button>
              </span>
            </div>
          </>
        ) : (
          <form
            className={
              editor.kind === 'credit'
                ? 'venue-credit-form'
                : editor.kind === 'create' && kind === 'prepaid'
                  ? 'venue-prepaid-form'
                  : undefined
            }
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
              if (event.target instanceof HTMLInputElement && event.target.type === 'text') {
                event.preventDefault()
                event.stopPropagation()
                event.currentTarget.requestSubmit()
              }
            }}
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget),
                base = venue ? `/venues/${venue.id}` : '/venues'
              if (editor.kind === 'create') {
                const rule =
                  kind === 'untracked'
                    ? undefined
                    : {
                        effectiveFrom: date,
                        effectiveAt: workspaceInstant(
                          `${date}T${String(f.get('ruleTime') ?? '00:00')}`,
                          data?.timeZone ?? 'Asia/Taipei'
                        ),
                        kind,
                        rate: kind === 'commission' && !dual ? Number(f.get('rate')) : null,
                        coachRate:
                          kind === 'commission' && dual ? Number(f.get('coachRate')) : null,
                        venueRate:
                          kind === 'commission' && dual ? Number(f.get('venueRate')) : null,
                        amountMinor:
                          kind === 'rent'
                            ? Math.round(Number(f.get('rent')) * moneyFactor(preferredCurrency))
                            : null,
                        currency: kind === 'rent' ? preferredCurrency : null
                      }
                const salary = salaryEnabled
                  ? {
                      effectiveFrom: date,
                      enabled: true,
                      amountMinor: Math.round(
                        Number(f.get('salaryAmount')) * moneyFactor(preferredCurrency)
                      ),
                      currency: preferredCurrency,
                      payDay: Number(f.get('payDay'))
                    }
                  : undefined
                const credit =
                  kind === 'prepaid'
                    ? {
                        purchasedOn: date,
                        startsDeductingAt: workspaceInstant(
                          `${deductDate}T${String(f.get('deductTime') ?? '00:00')}`,
                          data?.timeZone ?? 'Asia/Taipei'
                        ),
                        lessonCount: Number(f.get('lessonCount')),
                        amountMinor: Number(f.get('amountMinor')),
                        currency: preferredCurrency,
                        privateNote: String(f.get('privateNote') ?? '').trim()
                      }
                    : undefined
                save(base, {
                  name: name.trim(),
                  ...(address.trim() ? { address: address.trim() } : {}),
                  ...(rule ? { rule } : {}),
                  ...(salary ? { salary } : {}),
                  ...(credit ? { credit } : {})
                })
                return
              }
              if (editor.kind === 'rename') {
                save(
                  base,
                  {
                    version,
                    name: name.trim(),
                    address: address.trim() || null,
                    active: venue!.active
                  },
                  'PATCH'
                )
                return
              }
              if (editor.kind === 'coach-supplied') {
                if (!selectedStudentId) return
                save(`${base}/coach-supplied-students`, {
                  version,
                  studentId: selectedStudentId,
                  coachSupplied: true
                })
                return
              }
              if (editor.kind === 'rule') {
                const body = {
                  version,
                  effectiveFrom: date,
                  effectiveAt: workspaceInstant(
                    `${date}T${String(f.get('ruleTime') ?? '00:00')}`,
                    data?.timeZone ?? 'Asia/Taipei'
                  ),
                  kind,
                  rate: kind === 'commission' && !dual ? Number(f.get('rate')) : null,
                  coachRate: kind === 'commission' && dual ? Number(f.get('coachRate')) : null,
                  venueRate: kind === 'commission' && dual ? Number(f.get('venueRate')) : null,
                  amountMinor:
                    kind === 'rent'
                      ? Math.round(Number(f.get('rent')) * moneyFactor(preferredCurrency))
                      : null,
                  currency: kind === 'rent' ? preferredCurrency : null
                }
                setPendingBody(body)
                save(`${base}/fee-rules/preview`, body, 'POST', false)
                return
              }
              if (editor.kind === 'salary') {
                const salaryCurrency = currentSalary?.currency ?? preferredCurrency
                save(`${base}/salary-rules`, {
                  version,
                  effectiveFrom: date,
                  enabled: salaryEnabled,
                  amountMinor: salaryEnabled
                    ? Math.round(Number(f.get('salaryAmount')) * moneyFactor(salaryCurrency))
                    : null,
                  currency: salaryEnabled ? salaryCurrency : null,
                  payDay: salaryEnabled ? Number(f.get('payDay')) : null
                })
                return
              }
              if (editor.kind === 'credit') {
                const body = {
                  purchasedOn: date,
                  startsDeductingAt: workspaceInstant(
                    `${deductDate}T${String(f.get('deductTime') ?? '00:00')}`,
                    data?.timeZone ?? 'Asia/Taipei'
                  ),
                  lessonCount: Number(f.get('lessonCount')),
                  amountMinor: Number(f.get('amountMinor')),
                  currency: creditCurrency,
                  privateNote: String(f.get('privateNote') ?? '').trim(),
                  ...(editor.credit ? { version } : {})
                }
                save(
                  `${base}/credit-purchases${editor.credit ? `/${editor.credit.id}` : ''}`,
                  body,
                  editor.credit ? 'PATCH' : 'POST'
                )
                return
              }
              const body = {
                version,
                sessions: data!.sessions
                  .filter((s) => selected[s.id])
                  .map((s) => ({
                    id: s.id,
                    version: s.version,
                    customerSource: null
                  })),
                series: (data!.series ?? [])
                  .filter((s) => selected['series:' + s.id])
                  .map((s) => ({
                    id: s.id,
                    version: s.version,
                    customerSource: null
                  }))
              }
              setPendingBody(body)
              save(`${base}/history/preview`, body, 'POST', false)
            }}
            onChange={() => {
              setPreview(null)
              setPendingBody(null)
            }}
          >
            <fieldset disabled={!!preview || mutation.isPending} className="finance-form-fields">
              {(editor.kind === 'create' || editor.kind === 'rename') && (
                <>
                  <label>
                    場地名稱
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={160}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    場地位置或地址（選填）
                    <input
                      type="text"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      maxLength={500}
                      autoComplete="off"
                    />
                  </label>
                </>
              )}
              {editor.kind === 'coach-supplied' && (
                <label>
                  選擇學生
                  <FormSelect
                    label="選擇學生"
                    value={selectedStudentId}
                    onChange={setSelectedStudentId}
                    options={[
                      { value: '', label: '選擇自帶客學生' },
                      ...(studentQuery.data
                        ?.filter((student) => !coachSuppliedIds.has(student.id))
                        .map((student) => ({ value: student.id, label: student.name })) ?? [])
                    ]}
                  />
                </label>
              )}
              {['rule', 'credit', 'salary'].includes(editor.kind) ||
              (editor.kind === 'create' && (kind !== 'untracked' || salaryEnabled)) ? (
                <div
                  className={
                    editor.kind === 'rule' || (editor.kind === 'create' && kind !== 'untracked')
                      ? 'venue-date-time-row'
                      : 'venue-date-time-single'
                  }
                >
                  <SeriesDatePicker
                    label={editor.kind === 'credit' ? '購買日期' : '生效日期'}
                    value={date}
                    onChange={(v) => {
                      setDate(v)
                      setPreview(null)
                    }}
                  />
                  {(editor.kind === 'rule' ||
                    (editor.kind === 'create' && kind !== 'untracked')) && (
                    <div className="field-control">
                      <span>生效時間</span>
                      <TimeSelect
                        label="生效時間"
                        name="ruleTime"
                        defaultValue={
                          editor.kind === 'rule' && venue?.currentRule?.effectiveAt
                            ? workspaceWallTime(
                                venue.currentRule.effectiveAt,
                                data?.timeZone ?? 'Asia/Taipei'
                              ).slice(11)
                            : workspaceWallTime(
                                new Date().toISOString(),
                                data?.timeZone ?? 'Asia/Taipei'
                              ).slice(11)
                        }
                      />
                    </div>
                  )}
                </div>
              ) : null}
              {(editor.kind === 'rule' || editor.kind === 'create') && (
                <>
                  <label>
                    場地支出類型
                    <FormSelect
                      label="場地支出類型"
                      value={kind}
                      onChange={(v) => {
                        setKind(v as Rule['kind'])
                        setPreview(null)
                      }}
                      options={Object.entries(ruleLabels).map(([value, label]) => ({
                        value,
                        label
                      }))}
                    />
                  </label>
                </>
              )}
              {(editor.kind === 'credit' || (editor.kind === 'create' && kind === 'prepaid')) && (
                <div className="venue-date-time-row">
                  <SeriesDatePicker
                    label="開始扣堂日期"
                    value={deductDate}
                    onChange={setDeductDate}
                  />
                  <div className="field-control">
                    <span>開始扣堂時間</span>
                    <TimeSelect
                      label="開始扣堂時間"
                      name="deductTime"
                      defaultValue={
                        editor.kind === 'credit' && editor.credit?.startsDeductingAt
                          ? workspaceWallTime(
                              editor.credit.startsDeductingAt,
                              data?.timeZone ?? 'Asia/Taipei'
                            ).slice(11)
                          : '00:00'
                      }
                    />
                  </div>
                </div>
              )}
              {(editor.kind === 'rule' || editor.kind === 'create') && (
                <>
                  {kind === 'commission' && (
                    <>
                      <label>
                        抽成方式
                        <FormSelect
                          label="抽成方式"
                          value={dual ? 'source' : 'uniform'}
                          onChange={(v) => {
                            setDual(v === 'source')
                            setPreview(null)
                          }}
                          options={[
                            { value: 'uniform', label: '統一比例' },
                            { value: 'source', label: '依客源設定' }
                          ]}
                        />
                      </label>
                      <div className={dual ? 'venue-commission-rates' : 'venue-commission-rate'}>
                        {(dual ? ['venueRate', 'coachRate'] : ['rate']).map((key) => (
                          <label key={key}>
                            {key === 'coachRate'
                              ? '教練自帶客源'
                              : key === 'venueRate'
                                ? '場地供客'
                                : '抽成比例'}
                            （%）
                            <input
                              name={key}
                              type="number"
                              onKeyDown={numericInputKeyDown}
                              min="0"
                              max="100"
                              step="0.01"
                              defaultValue={venue?.currentRule?.[key as 'rate'] ?? 0}
                              required
                            />
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  {kind === 'rent' && (
                    <>
                      <label>
                        單次計費（{preferredCurrency}）
                        <input
                          name="rent"
                          type="number"
                          onKeyDown={numericInputKeyDown}
                          min="0"
                          step="0.01"
                          required
                          defaultValue={
                            venue?.currentRule?.currency === preferredCurrency
                              ? (venue.currentRule.amountMinor ?? 0) /
                                moneyFactor(preferredCurrency)
                              : undefined
                          }
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {editor.kind === 'credit' && (
                <PurchaseMoneyFields
                  count={editor.credit?.lessonCount}
                  amount={editor.credit?.amountMinor}
                  currency={creditCurrency}
                  showSummary={!editor.credit}
                  totalLabel="總金額"
                />
              )}
              {editor.kind === 'create' && kind === 'prepaid' && (
                <PurchaseMoneyFields currency={preferredCurrency} totalLabel="總金額" />
              )}
              {(editor.kind === 'salary' || editor.kind === 'create') && (
                <>
                  <label className="student-series-toggle">
                    底薪與否？
                    <span>
                      <span className="venue-salary-state">
                        {salaryEnabled ? '有底薪' : '無底薪'}
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="底薪與否？"
                        checked={salaryEnabled}
                        onChange={(event) => setSalaryEnabled(event.target.checked)}
                      />
                    </span>
                  </label>
                  {salaryEnabled && (
                    <div className="venue-salary-fields">
                      <label>
                        每月底薪（{currentSalary?.currency ?? preferredCurrency}）
                        <input
                          name="salaryAmount"
                          type="number"
                          onKeyDown={numericInputKeyDown}
                          min="0"
                          step={1 / moneyFactor(currentSalary?.currency ?? preferredCurrency)}
                          required
                          defaultValue={
                            currentSalary?.amountMinor != null
                              ? currentSalary.amountMinor /
                                moneyFactor(currentSalary.currency ?? preferredCurrency)
                              : undefined
                          }
                        />
                      </label>
                      <label>
                        每月發薪日
                        <input
                          name="payDay"
                          type="number"
                          onKeyDown={numericInputKeyDown}
                          min="1"
                          max="31"
                          step="1"
                          required
                          defaultValue={currentSalary?.payDay ?? 1}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}
              {(editor.kind === 'credit' || (editor.kind === 'create' && kind === 'prepaid')) && (
                <label className="venue-credit-note">
                  教練備註
                  <textarea
                    name="privateNote"
                    maxLength={4000}
                    defaultValue={
                      editor.kind === 'credit' ? (editor.credit?.privateNote ?? '') : ''
                    }
                  />
                </label>
              )}
              {editor.kind === 'history' && (
                <div className="venue-history-selection">
                  {data?.sessions
                    .filter((s) => s.date && s.version)
                    .map((s) => (
                      <div key={s.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={!!selected[s.id]}
                            onChange={(e) => {
                              setSelected({ ...selected, [s.id]: e.target.checked })
                              setPreview(null)
                            }}
                          />
                          <span>
                            {s.date} · {s.studentName}
                            <small>
                              {s.location ?? '未設定地點'} ·{' '}
                              {s.status === 'completed' ? '已完成' : '未完成'}
                            </small>
                          </span>
                        </label>
                      </div>
                    ))}
                </div>
              )}
              {editor.kind === 'history' && data?.series?.length ? (
                <div className="venue-history-selection">
                  <h3>固定課表</h3>
                  {data.series.map((s) => (
                    <div key={s.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!selected['series:' + s.id]}
                          onChange={(e) =>
                            setSelected({ ...selected, ['series:' + s.id]: e.target.checked })
                          }
                        />
                        <span>
                          {s.studentName}
                          <small>{s.location}</small>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}
            </fieldset>
            {editor.kind === 'rule-history' && (
              <div className="venue-rule-history-list">
                {historicalRules
                  .slice()
                  .reverse()
                  .map((rule) => {
                    const index = orderedRules.findIndex((item) => item.id === rule.id)
                    const previous = index > 0 ? orderedRules[index - 1] : undefined
                    return (
                      <details key={rule.id} className="venue-rule-history-entry">
                        <summary>
                          <span className="venue-rule-history-date">
                            {rule.effectiveAt
                              ? workspaceWallTime(rule.effectiveAt, data?.timeZone ?? 'Asia/Taipei')
                                  .replace('T', ' ')
                                  .replaceAll('-', '/')
                              : rule.effectiveFrom.replaceAll('-', '/')}
                          </span>
                          <span>
                            <strong>{ruleChange(rule, previous)}</strong>
                            <small>{ruleLabels[rule.kind]}</small>
                          </span>
                          <ChevronRight size={18} aria-hidden="true" />
                        </summary>
                        <div className="venue-rule-history-detail">
                          <p>此版設定：{ruleSetting(rule)}</p>
                          <p>課堂依結束時間選用當時已生效的版本。</p>
                          {rule.kind === 'commission' && (
                            <p>
                              指定場地購課時先記整包抽成；其後的課堂只記相對於購課時比例的差額。
                            </p>
                          )}
                          {rule.kind === 'prepaid' && (
                            <p>
                              預購批次另有購買日、開始扣堂時間、堂數及金額；每堂只配對符合起扣時間的批次。
                            </p>
                          )}
                          {rule.kind === 'prepaid' && venue && venueCredits.length > 0 && (
                            <button
                              type="button"
                              className="finance-text-button"
                              onClick={() => onNavigate({ kind: 'venue', venue })}
                            >
                              查看 {venueCredits.length} 筆場地預購批次
                            </button>
                          )}
                        </div>
                      </details>
                    )
                  })}
              </div>
            )}
            {preview && (editor.kind === 'history' || editor.kind === 'rule') && (
              <section className="finance-preview">
                <h3>{editor.kind === 'rule' ? '確認場地規則影響' : '確認歷史課程關聯'}</h3>
                <button type="button" onClick={() => setPreview(null)}>
                  返回
                </button>
                {editor.kind === 'rule' && (
                  <>
                    <p>
                      將影響 {preview.completedChangedCount} 堂已完成課程及 {preview.scheduledCount}{' '}
                      堂已排課程。
                    </p>
                    {preview.completed?.map(
                      (item: { sessionId: string; studentName: string; endsAt: string }) => (
                        <p key={item.sessionId}>
                          {item.studentName} ·{' '}
                          {workspaceWallTime(item.endsAt, data?.timeZone ?? 'Asia/Taipei')}
                        </p>
                      )
                    )}
                  </>
                )}
                {editor.kind === 'history' && (
                  <p>
                    將關聯 {preview.matches?.length} 堂課程、{preview.seriesCount} 組固定課表。
                  </p>
                )}
                {preview.months?.map((m: any) => (
                  <div key={m.month}>
                    <strong>{m.month}</strong>
                    {[
                      ...new Set<string>([...m.before, ...m.after].map((t: any) => t.currency))
                    ].map((currency) => {
                      const before = m.before.find((t: any) => t.currency === currency)
                      const after = m.after.find((t: any) => t.currency === currency)
                      return (
                        <div key={currency} className="finance-preview-currency">
                          <strong>{currency}</strong>
                          {(
                            [
                              ['incomeMinor', '學生購課總額'],
                              ['expenseMinor', '支出'],
                              ['differenceMinor', '試算差額']
                            ] as const
                          ).map(([key, label]) => (
                            <p key={key}>
                              {label} {financeMoney(before?.[key] ?? 0, currency)} →{' '}
                              {financeMoney(after?.[key] ?? 0, currency)}
                            </p>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </section>
            )}
            {mutation.error instanceof Error && (
              <p className="form-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <footer>
              {editor.kind === 'credit' && editor.credit && (
                <button
                  type="button"
                  className="danger-outline-button venue-credit-delete ui-action-delete"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset()
                    setDeleting(true)
                  }}
                >
                  刪除預購紀錄
                </button>
              )}
              <button type="button" className="secondary-button ui-action-cancel" onClick={onClose}>
                取消
              </button>
              {editor.kind === 'rule-history' ? null : preview ? (
                <button
                  type="button"
                  className="primary-button ui-action-save"
                  disabled={mutation.isPending}
                  onClick={() =>
                    save(
                      editor.kind === 'rule'
                        ? `/venues/${venue!.id}/fee-rules`
                        : `/venues/${venue!.id}/history`,
                      pendingBody,
                      'POST'
                    )
                  }
                >
                  {mutation.isPending ? '處理中…' : '確認套用'}
                </button>
              ) : (
                <button
                  className={
                    editor.kind === 'history' || editor.kind === 'rule'
                      ? 'secondary-button ui-action-general'
                      : editor.kind === 'coach-supplied' ||
                          (editor.kind === 'credit' && !editor.credit)
                        ? 'primary-button ui-action-add'
                        : 'primary-button ui-action-save'
                  }
                  disabled={
                    mutation.isPending ||
                    (editor.kind === 'history' && !Object.values(selected).some(Boolean)) ||
                    (editor.kind === 'coach-supplied' && !selectedStudentId)
                  }
                >
                  {!mutation.isPending &&
                  (editor.kind === 'coach-supplied' ||
                    (editor.kind === 'credit' && !editor.credit)) ? (
                    <Plus aria-hidden="true" />
                  ) : null}
                  {mutation.isPending
                    ? '處理中…'
                    : editor.kind === 'history' || editor.kind === 'rule'
                      ? '預覽變更'
                      : editor.kind === 'credit'
                        ? editor.credit
                          ? '變更'
                          : '登錄預購'
                        : editor.kind === 'coach-supplied'
                          ? '加入自帶客'
                          : '儲存'}
                </button>
              )}
            </footer>
          </form>
        )}
        {editor.kind === 'venue' && mutation.error instanceof Error && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        {mutation.error instanceof ApiError &&
          mutation.error.status === 409 &&
          editor.kind !== 'create' &&
          (mutation.error.details as { current?: { id: string; version: number } }).current?.id ===
            venue?.id && (
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                const current = (mutation.error as ApiError).details.current as {
                  id: string
                  version: number
                }
                const editedId = 'credit' in editor && editor.credit ? editor.credit.id : venue?.id
                if (current.id === editedId) setVersion(current.version)
                await queryClient.refetchQueries({ queryKey: venueKey(session.user.id) })
                setPreview(null)
                mutation.reset()
              }}
            >
              載入最新版本，保留輸入
            </button>
          )}
      </div>
    </SchedulingDialog>
  )
}
