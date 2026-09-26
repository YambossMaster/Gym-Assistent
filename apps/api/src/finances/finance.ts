import { z } from 'zod'

export const dateSchema = z.iso.date()
export const instantSchema = z.iso.datetime({ offset: true })
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const money = z.number().int().min(0).max(999_999_999_999)
const currency = z.string().regex(/^[A-Z]{3}$/)
export const manualEntrySchema = z
  .object({
    id: z.uuid().optional(),
    occurredAt: instantSchema,
    label: z.string().trim().min(1).max(160),
    direction: z.enum(['income', 'expense']),
    amountMinor: money,
    currency,
    privateNote: z.string().trim().max(4000).default(''),
  })
  .strict()
export const editEntrySchema = z
  .object({
    version: z.number().int().nonnegative(),
    amountMinor: z.number().int().min(-999_999_999_999).max(999_999_999_999).optional(),
    occurredAt: instantSchema.optional(),
    label: z.string().trim().min(1).max(160).optional(),
  })
  .strict()
export const entryVersionSchema = z.object({ version: z.number().int().nonnegative() }).strict()
export const venueSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    address: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
export const editVenueSchema = venueSchema.extend({
  version: z.number().int().positive(),
  active: z.boolean(),
})
export const ruleSchema = z
  .object({
    version: z.number().int().positive(),
    effectiveFrom: dateSchema,
    effectiveAt: instantSchema.optional(),
    kind: z.enum(['untracked', 'free', 'commission', 'rent', 'prepaid']),
    collectionMode: z.enum(['coach', 'venue']).default('coach'),
    rate: z.number().min(0).max(100).multipleOf(0.01).nullable().default(null),
    coachRate: z.number().min(0).max(100).multipleOf(0.01).nullable().default(null),
    venueRate: z.number().min(0).max(100).multipleOf(0.01).nullable().default(null),
    amountMinor: money.nullable().default(null),
    currency: currency.nullable().default(null),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.collectionMode !== 'coach')
      ctx.addIssue({ code: 'custom', message: '不再區分收款方。', path: ['collectionMode'] })
    if (
      v.kind === 'commission' &&
      !(
        (v.rate !== null && v.coachRate === null && v.venueRate === null) ||
        (v.rate === null && v.coachRate !== null && v.venueRate !== null)
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: '請輸入統一抽成，或分別輸入兩種來源的抽成。',
        path: ['rate'],
      })
    if (v.kind === 'rent' && (v.amountMinor === null || v.currency === null))
      ctx.addIssue({ code: 'custom', message: '請輸入單次計費金額與幣別。', path: ['amountMinor'] })
  })
export const creditSchema = z
  .object({
    purchasedOn: dateSchema,
    startsDeductingAt: instantSchema.optional(),
    lessonCount: z.number().int().positive().max(10000),
    amountMinor: money,
    currency,
    privateNote: z.string().trim().max(4000).default(''),
  })
  .strict()
export const salarySchema = z
  .object({
    version: z.number().int().positive(),
    effectiveFrom: dateSchema,
    enabled: z.boolean(),
    amountMinor: money.nullable(),
    currency: currency.nullable(),
    payDay: z.number().int().min(1).max(31).nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.enabled &&
      (value.amountMinor === null || value.currency === null || value.payDay === null)
    )
      ctx.addIssue({ code: 'custom', message: '請輸入底薪金額、幣別與每月發薪日。' })
  })
export const createVenueSchema = venueSchema.extend({
  rule: z.object(ruleSchema.shape).omit({ version: true }).optional(),
  salary: z.object(salarySchema.shape).omit({ version: true }).optional(),
  credit: creditSchema.optional(),
})
export const coachSuppliedStudentSchema = z
  .object({
    version: z.number().int().positive(),
    studentId: z.uuid(),
    coachSupplied: z.boolean(),
  })
  .strict()
export const payoutSchema = z
  .object({
    receivedOn: dateSchema,
    amountMinor: money,
    currency,
    purchaseId: z.uuid().nullable().default(null),
    sessionId: z.uuid().nullable().default(null),
  })
  .strict()
  .refine((v) => Boolean(v.purchaseId) !== Boolean(v.sessionId), '請選擇一筆購課或已完成課程。')
export const historySchema = z
  .object({
    version: z.number().int().positive(),
    sessions: z
      .array(
        z.object({
          id: z.uuid(),
          version: z.number().int().positive(),
          customerSource: z.enum(['coach', 'venue']).nullable().default(null),
        }),
      )
      .max(1000),
    series: z
      .array(
        z.object({
          id: z.uuid(),
          version: z.number().int().positive(),
          customerSource: z.enum(['coach', 'venue']).nullable().default(null),
        }),
      )
      .max(1000),
  })
  .strict()
export type FeeRule = Omit<z.output<typeof ruleSchema>, 'version'> & { id: string; venueId: string }
export type Venue = {
  id: string
  name: string
  address?: string | null
  active: boolean
  canDelete?: boolean
  version: number
  lowOccurrence: string | null
  lowOccurredAt: string | null
}
export type FinancePurchase = {
  purchasedAt?: string
  id: string
  studentId: string
  studentName: string
  purchasedOn: string
  lessonCount: number
  amountMinor: number
  currency: string
  collectionMode: 'coach' | 'venue'
  venueId: string | null
  customerSource?: 'coach' | 'venue' | null
}
export type VenueSalaryRule = {
  id: string
  venueId: string
  effectiveFrom: string
  enabled: boolean
  amountMinor: number | null
  currency: string | null
  payDay: number | null
}
export type FinanceSession = {
  startsAt?: string | null
  endsAt?: string | null
  id: string
  studentId: string
  studentName: string
  date: string | null
  status: string
  venueId: string | null
  feeRuleId: string | null
  customerSource: 'coach' | 'venue' | null
  location: string | null
  version: number | null
}
export type CreditPurchase = z.output<typeof creditSchema> & {
  id: string
  venueId: string
  version: number
}
export type Payout = z.output<typeof payoutSchema> & {
  id: string
  venueId: string
  version: number
}
export type FinanceSnapshot = {
  sessionAdjustments?: SessionAdjustment[]
  entryStates?: EntryState[]
  manualEntries?: ManualEntry[]
  series?: {
    id: string
    version: number
    location: string
    venueId: string | null
    customerSource: string | null
    studentName: string
  }[]
  timeZone: string
  venues: Venue[]
  rules: FeeRule[]
  purchases: FinancePurchase[]
  sessions: FinanceSession[]
  credits: CreditPurchase[]
  payouts: Payout[]
  salaryRules?: VenueSalaryRule[]
  coachSuppliedStudents?: { venueId: string; studentId: string }[]
}
export type FinanceRow = {
  id: string
  date: string
  kind: 'purchase' | 'payout' | 'prepaid' | 'rent' | 'commission' | 'salary' | 'manual'
  label: string
  detail?: string
  amountMinor: number
  currency: string
  direction: 'income' | 'expense' | 'reference'
  targetRoute: string
  venueId: string | null
  occurredAt?: string | null
  effectiveAt?: string | null
  originalAmountMinor?: number
  originalDate?: string
  originalOccurredAt?: string | null
  originalLabel?: string
  version?: number
  status?: 'original' | 'modified' | 'manual'
  sourceChanged?: boolean
  sourceRemoved?: boolean
  sourceFingerprint?: string
}
export type SessionAdjustment = {
  sessionId: string
  venueId: string
  mode: 'auto' | 'exempt' | 'batch' | 'amount' | 'rate'
  creditId: string | null
  amountMinor: number | null
  rate: number | null
  version: number
}
export type EntryState = {
  entryId: string
  version: number
  hidden: boolean
  manualAmountMinor: number | null
  manualAt: string | null
  manualLabel: string | null
  sourceFingerprint: string | null
  sourceSnapshot: FinanceRow | null
}
export type ManualEntry = {
  id: string
  occurredAt: string
  label: string
  direction: 'income' | 'expense'
  amountMinor: number
  currency: string
  privateNote: string
  version: number
}
export class FinanceError extends Error {
  constructor(
    readonly statusCode: 400 | 404 | 409,
    message: string,
    readonly current?: unknown,
  ) {
    super(message)
  }
}
export function applicableRule(rules: FeeRule[], venueId: string, date: string) {
  return rules
    .filter(
      (r) =>
        r.venueId === venueId &&
        (date.length === 10 ? r.effectiveFrom <= date : (r.effectiveAt ?? r.effectiveFrom) <= date),
    )
    .sort(
      (a, b) =>
        (b.effectiveAt ?? b.effectiveFrom).localeCompare(a.effectiveAt ?? a.effectiveFrom) ||
        b.id.localeCompare(a.id),
    )[0]
}
export function localDate(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
export function venueAllocations(snapshot: FinanceSnapshot) {
  const assignments = new Map<string, string | null>()
  const used = new Map<string, number>()
  const instant = (s: FinanceSession) => s.endsAt ?? s.startsAt ?? s.date ?? ''
  const completed = snapshot.sessions
    .filter(
      (s) =>
        s.status === 'completed' &&
        s.venueId &&
        instant(s) &&
        applicableRule(snapshot.rules, s.venueId, instant(s))?.kind === 'prepaid',
    )
    .sort((a, b) => instant(a).localeCompare(instant(b)) || a.id.localeCompare(b.id))
  const credits = [...snapshot.credits].sort(
    (a, b) =>
      (a.startsDeductingAt ?? a.purchasedOn).localeCompare(b.startsDeductingAt ?? b.purchasedOn) ||
      a.purchasedOn.localeCompare(b.purchasedOn) ||
      a.id.localeCompare(b.id),
  )
  const adjustment = (id: string) => snapshot.sessionAdjustments?.find((a) => a.sessionId === id)
  // Explicit selections reserve capacity before automatic allocation.
  for (const s of completed) {
    const a = adjustment(s.id)
    if (a?.mode === 'exempt') assignments.set(s.id, null)
    if ((a?.mode === 'batch' || a?.mode === 'auto') && a.creditId) {
      const batch = credits.find((c) => c.id === a.creditId && c.venueId === s.venueId)
      if (batch && (used.get(batch.id) ?? 0) < batch.lessonCount) {
        assignments.set(s.id, batch.id)
        used.set(batch.id, (used.get(batch.id) ?? 0) + 1)
      } else if (a.mode === 'batch') assignments.set(s.id, null)
    }
  }
  for (const s of completed) {
    if (assignments.has(s.id)) continue
    const batch = credits.find(
      (c) =>
        c.venueId === s.venueId &&
        (c.startsDeductingAt ?? c.purchasedOn) <= instant(s) &&
        (used.get(c.id) ?? 0) < c.lessonCount,
    )
    assignments.set(s.id, batch?.id ?? null)
    if (batch) used.set(batch.id, (used.get(batch.id) ?? 0) + 1)
  }
  return {
    assignments,
    used,
    pending: completed
      .filter((s) => !assignments.get(s.id))
      .filter((s) => adjustment(s.id)?.mode !== 'exempt'),
  }
}
export function venueCreditBalances(snapshot: FinanceSnapshot) {
  const { used } = venueAllocations(snapshot)
  return [...snapshot.credits]
    .sort((a, b) => a.purchasedOn.localeCompare(b.purchasedOn) || a.id.localeCompare(b.id))
    .map((credit) => ({
      ...credit,
      remainingLessons: credit.lessonCount - (used.get(credit.id) ?? 0),
    }))
}
// Round a rational amount once, in integer minor units; avoid floating-point money accumulation.
export function allocatedCommission(total: number, count: number, rate: number) {
  const numerator = BigInt(total) * BigInt(Math.round(rate * 100))
  const denominator = BigInt(count) * 10000n
  return Number((numerator + denominator / 2n) / denominator)
}
function financeAmount(amountMinor: number, currency: string) {
  const formatter = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined,
  })
  const factor =
    currency === 'TWD' ? 1 : 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 0)
  return formatter.format(amountMinor / factor)
}
function lessonPrice(purchase: FinancePurchase) {
  return purchase.amountMinor % purchase.lessonCount === 0
    ? `${financeAmount(purchase.amountMinor / purchase.lessonCount, purchase.currency)}／堂`
    : `${financeAmount(purchase.amountMinor, purchase.currency)} ÷ ${purchase.lessonCount} 堂`
}
function commissionRate(
  rule: FeeRule,
  source: 'coach' | 'venue' | null | undefined,
  override?: number,
) {
  if (override !== undefined) return `本堂調整 ${override}%`
  if (rule.rate !== null) return `固定抽成 ${rule.rate}%`
  return `${source === 'coach' ? '自帶客' : '場地供客'} ${source === 'coach' ? rule.coachRate : rule.venueRate}%`
}
function purchaseAssignments(snapshot: FinanceSnapshot) {
  const orderedPurchases = [...snapshot.purchases].sort(
    (a, b) =>
      (a.purchasedAt ?? a.purchasedOn).localeCompare(b.purchasedAt ?? b.purchasedOn) ||
      a.id.localeCompare(b.id),
  )
  const completed = snapshot.sessions
    .filter((s) => s.status === 'completed')
    .sort(
      (a, b) =>
        (a.endsAt ?? a.startsAt ?? a.date ?? '').localeCompare(
          b.endsAt ?? b.startsAt ?? b.date ?? '',
        ) || a.id.localeCompare(b.id),
    )
  const used = new Map<string, number>()
  const assigned = new Map<string, FinancePurchase>()
  for (const session of completed) {
    const eligible = orderedPurchases
      .filter(
        (purchase) =>
          purchase.studentId === session.studentId &&
          (!session.date || purchase.purchasedOn <= session.date) &&
          (purchase.venueId === null || purchase.venueId === session.venueId),
      )
      .sort((a, b) => Number(b.venueId === session.venueId) - Number(a.venueId === session.venueId))
    const purchase =
      eligible.find((candidate) => (used.get(candidate.id) ?? 0) < candidate.lessonCount) ??
      eligible[0]
    if (purchase) {
      assigned.set(session.id, purchase)
      used.set(purchase.id, (used.get(purchase.id) ?? 0) + 1)
    }
  }
  return { completed, assigned, used }
}
export function deriveFinance(snapshot: FinanceSnapshot, today: string) {
  const rows: FinanceRow[] = []
  const missing: {
    sessionId: string
    date: string | null
    reason: 'price' | 'source' | 'rule'
    label: string
  }[] = []
  const venueName = (id: string) => snapshot.venues.find((v) => v.id === id)?.name ?? '場地'
  for (const p of snapshot.purchases)
    rows.push({
      id: `purchase:${p.id}`,
      date: p.purchasedOn,
      occurredAt: p.purchasedAt ?? null,
      kind: 'purchase',
      label: `${p.studentName} · 購課`,
      detail: `購課收入 · +${p.lessonCount} 堂 · ${lessonPrice(p)} · ${p.venueId ? `限 ${venueName(p.venueId)}` : '不限場地'}`,
      amountMinor: p.amountMinor,
      currency: p.currency,
      direction: 'income',
      targetRoute: `/students/${p.studentId}`,
      venueId: p.venueId,
    })
  for (const p of snapshot.purchases) {
    if (!p.venueId) continue
    const rule = applicableRule(snapshot.rules, p.venueId, p.purchasedAt ?? p.purchasedOn)
    if (rule?.kind !== 'commission') continue
    const rate = rule.rate ?? (p.customerSource === 'coach' ? rule.coachRate : rule.venueRate)
    if (rate === null) continue
    rows.push({
      id: `purchase-commission:${p.id}`,
      date: p.purchasedOn,
      occurredAt: p.purchasedAt ?? null,
      kind: 'commission',
      label: `${venueName(p.venueId)} · ${p.studentName} 購課抽成`,
      detail: `場地購課抽成 · ${commissionRate(rule, p.customerSource)} · 以整包 ${financeAmount(p.amountMinor, p.currency)} 計算`,
      amountMinor: allocatedCommission(p.amountMinor, 1, rate),
      currency: p.currency,
      direction: 'expense',
      targetRoute: `/students/${p.studentId}`,
      venueId: p.venueId,
    })
  }
  const salaryRules = snapshot.salaryRules ?? []
  if (salaryRules.length) {
    const firstMonth = salaryRules.reduce(
      (first, r) => (r.effectiveFrom.slice(0, 7) < first ? r.effectiveFrom.slice(0, 7) : first),
      salaryRules[0]!.effectiveFrom.slice(0, 7),
    )
    const currentMonth = today.slice(0, 7)
    let [year, month] = firstMonth.split('-').map(Number) as [number, number]
    while (`${year}-${String(month).padStart(2, '0')}` <= currentMonth) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      for (const venue of snapshot.venues) {
        const candidates = salaryRules
          .filter((r) => r.venueId === venue.id && r.effectiveFrom.slice(0, 7) <= monthKey)
          .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
        const payable = candidates
          .filter(
            (r) => r.enabled && r.payDay !== null && r.amountMinor !== null && r.currency !== null,
          )
          .map((rule) => ({
            rule,
            date: `${monthKey}-${String(Math.min(rule.payDay!, lastDay)).padStart(2, '0')}`,
          }))
          .filter(
            ({ rule, date }) =>
              date <= today &&
              rule.effectiveFrom <= date &&
              candidates.find((candidate) => candidate.effectiveFrom <= date)?.id === rule.id,
          )
          .sort((a, b) => a.date.localeCompare(b.date))[0]
        if (!payable) continue
        rows.push({
          id: `salary:${venue.id}:${monthKey}`,
          date: payable.date,
          kind: 'salary',
          label: `${venue.name} · 底薪`,
          detail: `底薪收入 · 每月 ${payable.rule.payDay} 日發放`,
          amountMinor: payable.rule.amountMinor!,
          currency: payable.rule.currency!,
          direction: 'income',
          targetRoute: `/students/venues?venue=${venue.id}`,
          venueId: venue.id,
        })
      }
      month += 1
      if (month === 13) {
        year += 1
        month = 1
      }
    }
  }
  for (const p of snapshot.credits)
    rows.push({
      id: `prepaid:${p.id}`,
      date: p.purchasedOn,
      effectiveAt: p.startsDeductingAt ?? null,
      kind: 'prepaid',
      label: `${venueName(p.venueId)} · 預購 ${p.lessonCount} 堂`,
      detail: `場地預購支出 · ${p.amountMinor % p.lessonCount === 0 ? `${financeAmount(p.amountMinor / p.lessonCount, p.currency)}／堂` : `${financeAmount(p.amountMinor, p.currency)} ÷ ${p.lessonCount} 堂`} · ${p.startsDeductingAt ? `自 ${new Intl.DateTimeFormat('zh-TW', { timeZone: snapshot.timeZone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(p.startsDeductingAt))} 起扣` : '購買日起扣'}`,
      amountMinor: p.amountMinor,
      currency: p.currency,
      direction: 'expense',
      targetRoute: `/students/venues?venue=${p.venueId}&credit=${p.id}`,
      venueId: p.venueId,
    })
  const allocations = venueAllocations(snapshot)
  const { completed, assigned, used } = purchaseAssignments(snapshot)
  for (const s of completed) {
    // Even a legacy completion consumes entitlement, without inventing a teaching date.
    const p = assigned.get(s.id)
    if (!s.venueId) continue
    const end = s.endsAt ?? s.startsAt ?? s.date
    const date = s.endsAt ? localDate(s.endsAt, snapshot.timeZone) : s.date
    const rule = end ? applicableRule(snapshot.rules, s.venueId, end) : undefined
    if (!rule) {
      missing.push({ sessionId: s.id, date, reason: 'rule', label: s.studentName })
      continue
    }
    if (!date || !['rent', 'commission'].includes(rule.kind)) continue
    let amountMinor = rule.amountMinor ?? 0
    let currency = rule.currency ?? ''
    let purchaseOriginalRate: number | null = null
    let originalCommissionRule: FeeRule | undefined
    let appliedRate: number | null = null
    if (rule.kind === 'commission') {
      if (!p) {
        missing.push({ sessionId: s.id, date, reason: 'price', label: s.studentName })
        continue
      }
      const rate = rule.rate ?? (s.customerSource === 'coach' ? rule.coachRate : rule.venueRate)
      if (rate === null) {
        missing.push({ sessionId: s.id, date, reason: 'source', label: s.studentName })
        continue
      }
      const originalRule =
        p.venueId === s.venueId
          ? applicableRule(snapshot.rules, s.venueId, p.purchasedAt ?? p.purchasedOn)
          : undefined
      const originalRate =
        originalRule?.kind === 'commission'
          ? (originalRule.rate ??
            (p.customerSource === 'coach' ? originalRule.coachRate : originalRule.venueRate))
          : null
      purchaseOriginalRate = originalRate
      originalCommissionRule = originalRule
      appliedRate = rate
      amountMinor =
        allocatedCommission(p.amountMinor, p.lessonCount, rate) -
        (originalRate === null
          ? 0
          : allocatedCommission(p.amountMinor, p.lessonCount, originalRate))
      currency = p.currency
    }
    const adjustment = snapshot.sessionAdjustments?.find((a) => a.sessionId === s.id)
    if (adjustment?.mode === 'exempt') continue
    if (adjustment?.mode === 'amount' && adjustment.amountMinor !== null)
      amountMinor = adjustment.amountMinor
    if (adjustment?.mode === 'rate' && adjustment.rate !== null && p)
      amountMinor =
        allocatedCommission(p.amountMinor, p.lessonCount, adjustment.rate) -
        (purchaseOriginalRate === null
          ? 0
          : allocatedCommission(p.amountMinor, p.lessonCount, purchaseOriginalRate))
    if (adjustment?.mode === 'rate' && adjustment.rate !== null) appliedRate = adjustment.rate
    if (amountMinor === 0 && purchaseOriginalRate !== null && adjustment?.mode !== 'amount')
      continue
    rows.push({
      id: `session:${s.id}`,
      date,
      occurredAt: s.endsAt ?? null,
      kind: rule.kind as 'rent' | 'commission',
      label: `${venueName(s.venueId)} · ${s.studentName}`,
      detail:
        rule.kind === 'rent'
          ? `場地租用 · 單次計價 ${financeAmount(rule.amountMinor ?? 0, rule.currency ?? currency)}／次${adjustment?.mode === 'amount' ? ' · 本堂金額已調整' : ''}`
          : p && appliedRate !== null
            ? `${purchaseOriginalRate === null ? '逐堂抽成' : amountMinor < 0 ? '沖減抽成差額' : '補扣抽成差額'} · ${purchaseOriginalRate !== null && originalCommissionRule ? `${commissionRate(originalCommissionRule, p.customerSource)} → ` : ''}${commissionRate(rule, s.customerSource, adjustment?.mode === 'rate' ? appliedRate : undefined)} · ${lessonPrice(p)}`
            : '抽成支出 · 計算來源待確認',
      amountMinor,
      currency,
      direction: 'expense',
      targetRoute: `/sessions/${s.id}`,
      venueId: s.venueId,
    })
  }
  const venues = snapshot.venues.map((v) => ({
    ...v,
    currentRule: applicableRule(snapshot.rules, v.id, today) ?? null,
    remaining:
      snapshot.credits.filter((c) => c.venueId === v.id).reduce((n, c) => n + c.lessonCount, 0) -
      [...allocations.assignments.entries()].filter(
        ([sessionId, creditId]) =>
          creditId && snapshot.sessions.some((s) => s.id === sessionId && s.venueId === v.id),
      ).length,
    pendingLessons: allocations.pending.filter((s) => s.venueId === v.id).length,
    netRemaining:
      snapshot.credits.filter((c) => c.venueId === v.id).reduce((n, c) => n + c.lessonCount, 0) -
      [...allocations.assignments.entries()].filter(
        ([sessionId, creditId]) =>
          creditId && snapshot.sessions.some((s) => s.id === sessionId && s.venueId === v.id),
      ).length -
      allocations.pending.filter((s) => s.venueId === v.id).length,
  }))
  const tracked = venues.filter((v) => v.currentRule && v.currentRule.kind !== 'untracked').length
  const hasUntracked =
    venues.some((v) => !v.currentRule || v.currentRule.kind === 'untracked') ||
    snapshot.sessions.some((s) => !s.venueId && s.location)
  const balanceMap = new Map<
    string,
    {
      studentId: string
      venueId: string | null
      purchased: number
      completed: number
      remaining: number
    }
  >()
  for (const purchase of snapshot.purchases) {
    const key = `${purchase.studentId}:${purchase.venueId ?? 'general'}`
    const balance = balanceMap.get(key) ?? {
      studentId: purchase.studentId,
      venueId: purchase.venueId,
      purchased: 0,
      completed: 0,
      remaining: 0,
    }
    balance.purchased += purchase.lessonCount
    balance.completed += used.get(purchase.id) ?? 0
    balance.remaining = balance.purchased - balance.completed
    balanceMap.set(key, balance)
  }
  return {
    rows: rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    missing,
    venues,
    studentVenueBalances: [...balanceMap.values()],
    coverage:
      tracked === 0
        ? ('none' as const)
        : hasUntracked
          ? ('partial' as const)
          : ('complete' as const),
  }
}
export function financeLedger(snapshot: FinanceSnapshot, today: string) {
  const sourceRows = deriveFinance({ ...snapshot, entryStates: [], manualEntries: [] }, today).rows
  const current = new Map(sourceRows.map((row) => [row.id, row]))
  const rows: FinanceRow[] = []
  const deleted: FinanceRow[] = []
  for (const source of sourceRows) {
    const state = snapshot.entryStates?.find((s) => s.entryId === source.id)
    const fingerprint = JSON.stringify([
      source.date,
      source.occurredAt,
      source.label,
      source.amountMinor,
      source.currency,
    ])
    const row: FinanceRow = {
      ...source,
      originalAmountMinor: source.amountMinor,
      originalDate: source.date,
      originalOccurredAt: source.occurredAt ?? null,
      originalLabel: source.label,
      sourceFingerprint: fingerprint,
      amountMinor: state?.manualAmountMinor ?? source.amountMinor,
      occurredAt: state?.manualAt ?? source.occurredAt ?? null,
      date: state?.manualAt ? localDate(state.manualAt, snapshot.timeZone) : source.date,
      label: state?.manualLabel ?? source.label,
      version: state?.version ?? 0,
      status:
        state && (state.manualAmountMinor !== null || state.manualAt || state.manualLabel)
          ? 'modified'
          : 'original',
      sourceChanged: Boolean(state?.sourceFingerprint && state.sourceFingerprint !== fingerprint),
    }
    ;(state?.hidden ? deleted : rows).push(row)
  }
  for (const state of snapshot.entryStates ?? []) {
    if (!state.hidden || current.has(state.entryId) || !state.sourceSnapshot) continue
    deleted.push({
      ...state.sourceSnapshot,
      version: state.version,
      sourceRemoved: true,
      sourceChanged: true,
      status: 'modified',
    })
  }
  for (const entry of snapshot.manualEntries ?? [])
    rows.push({
      id: `manual:${entry.id}`,
      date: localDate(entry.occurredAt, snapshot.timeZone),
      occurredAt: entry.occurredAt,
      kind: 'manual',
      label: entry.label,
      detail: entry.direction === 'income' ? '自行新增收入' : '自行新增支出',
      direction: entry.direction,
      amountMinor: entry.amountMinor,
      currency: entry.currency,
      venueId: null,
      targetRoute: '',
      version: entry.version,
      status: 'manual',
    })
  const wallTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: snapshot.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const sortKey = (row: FinanceRow) =>
    `${row.date}T${row.occurredAt ? wallTime.format(new Date(row.occurredAt)) : '00:00:00'}`
  const sortRows = (a: FinanceRow, b: FinanceRow) =>
    sortKey(a).localeCompare(sortKey(b)) || a.id.localeCompare(b.id)
  return { rows: rows.sort(sortRows), deleted: deleted.sort(sortRows) }
}
export function venueCourseRecords(snapshot: FinanceSnapshot, venueId: string, today: string) {
  const allocations = venueAllocations(snapshot)
  const sourceRows = deriveFinance(snapshot, today).rows
  const purchaseBySession = purchaseAssignments(snapshot).assigned
  const creditBalances = venueCreditBalances(snapshot)
  const creditById = new Map(snapshot.credits.map((credit) => [credit.id, credit]))
  const deductedByCredit = new Map<string, number>()
  const remainingAfterDeduction = new Map<string, number>()
  for (const session of snapshot.sessions
    .filter((item) => allocations.assignments.get(item.id))
    .sort(
      (a, b) =>
        (a.endsAt ?? a.startsAt ?? a.date ?? '').localeCompare(
          b.endsAt ?? b.startsAt ?? b.date ?? '',
        ) || a.id.localeCompare(b.id),
    )) {
    const creditId = allocations.assignments.get(session.id)!
    const credit = creditById.get(creditId)
    if (!credit) continue
    const deducted = (deductedByCredit.get(creditId) ?? 0) + 1
    deductedByCredit.set(creditId, deducted)
    remainingAfterDeduction.set(session.id, credit.lessonCount - deducted)
  }
  return snapshot.sessions
    .filter((s) => s.venueId === venueId && s.status === 'completed' && s.endsAt)
    .map((s) => {
      const rule = applicableRule(snapshot.rules, venueId, s.endsAt!)
      const adjustment = snapshot.sessionAdjustments?.find((a) => a.sessionId === s.id)
      const expense = sourceRows.find((r) => r.id === `session:${s.id}`)
      const creditId = allocations.assignments.get(s.id) ?? null
      const purchase = purchaseBySession.get(s.id)
      const originalRule =
        purchase?.venueId === venueId
          ? applicableRule(snapshot.rules, venueId, purchase.purchasedAt ?? purchase.purchasedOn)
          : null
      const originalRate =
        originalRule?.kind === 'commission'
          ? (originalRule.rate ??
            (purchase?.customerSource === 'coach'
              ? originalRule.coachRate
              : originalRule.venueRate))
          : null
      const appliedRate =
        rule?.kind === 'commission'
          ? adjustment?.mode === 'rate'
            ? adjustment.rate
            : (rule.rate ?? (s.customerSource === 'coach' ? rule.coachRate : rule.venueRate))
          : null
      const upfront = Boolean(
        purchase && sourceRows.some((row) => row.id === `purchase-commission:${purchase.id}`),
      )
      return {
        sessionId: s.id,
        sessionVersion: s.version,
        recordVersion: adjustment?.version ?? 0,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        studentName: s.studentName,
        rule: rule ?? null,
        customerSource: s.customerSource,
        purchaseId: purchase?.id ?? null,
        purchaseRoute: purchase ? `/students/${s.studentId}` : null,
        calculation:
          purchase && rule?.kind === 'commission'
            ? {
                purchaseAmountMinor: purchase.amountMinor,
                lessonCount: purchase.lessonCount,
                currency: purchase.currency,
                originalCustomerSource: purchase.customerSource ?? null,
                originalRateMode:
                  originalRule?.kind === 'commission'
                    ? originalRule.rate === null
                      ? 'by-source'
                      : 'fixed'
                    : null,
                originalRate,
                appliedRate,
              }
            : null,
        creditId,
        credit: creditBalances.find((c) => c.id === creditId) ?? null,
        remainingAfterDeduction: remainingAfterDeduction.get(s.id) ?? null,
        purchase: purchase
          ? {
              purchasedOn: purchase.purchasedOn,
              amountMinor: purchase.amountMinor,
              lessonCount: purchase.lessonCount,
              currency: purchase.currency,
            }
          : null,
        status:
          rule?.kind === 'prepaid'
            ? adjustment?.mode === 'exempt'
              ? 'exempt'
              : creditId
                ? 'allocated'
                : 'pending'
            : rule?.kind === 'free'
              ? 'free'
              : rule?.kind === 'untracked' || !rule
                ? 'untracked'
                : adjustment?.mode === 'exempt'
                  ? 'exempt'
                  : expense
                    ? 'expense'
                    : upfront
                      ? 'recorded-at-purchase'
                      : 'missing',
        expense: expense ?? null,
        adjustment: adjustment ?? null,
        targetRoute: `/sessions/${s.id}`,
      }
    })
    .sort((a, b) => b.endsAt!.localeCompare(a.endsAt!) || b.sessionId.localeCompare(a.sessionId))
}
export function monthlyFinance(snapshot: FinanceSnapshot, month: string, today: string) {
  const derived = deriveFinance(snapshot, today)
  const ledger = financeLedger(snapshot, today)
  const rows = ledger.rows.filter((r) => r.date.slice(0, 7) === month)
  const totals = new Map<
    string,
    {
      currency: string
      purchaseMinor: number
      salaryMinor: number
      incomeMinor: number
      expenseMinor: number
      differenceMinor: number
    }
  >()
  for (const r of rows) {
    const total = totals.get(r.currency) ?? {
      currency: r.currency,
      purchaseMinor: 0,
      salaryMinor: 0,
      incomeMinor: 0,
      expenseMinor: 0,
      differenceMinor: 0,
    }
    if (r.kind === 'purchase') total.purchaseMinor += r.amountMinor
    if (r.kind === 'salary') total.salaryMinor += r.amountMinor
    if (r.direction === 'income') total.incomeMinor += r.amountMinor
    else if (r.direction === 'expense') total.expenseMinor += r.amountMinor
    total.differenceMinor = total.incomeMinor - total.expenseMinor
    totals.set(r.currency, total)
  }
  return {
    month,
    timeZone: snapshot.timeZone,
    coverage:
      derived.coverage === 'none' && rows.some((r) => r.direction !== 'income')
        ? ('partial' as const)
        : derived.coverage,
    totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    rows,
    deletedCount: ledger.deleted.filter((r) => r.date.slice(0, 7) === month).length,
    hasManualAdjustments:
      rows.some((r) => r.status !== 'original') ||
      ledger.deleted.some((r) => r.date.slice(0, 7) === month),
    missing: derived.missing.filter((m) => m.date?.slice(0, 7) === month),
    venues: derived.venues,
  }
}
