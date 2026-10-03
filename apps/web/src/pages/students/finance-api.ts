import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, request } from '../../api'
import { planAccessKey } from '../../beta-admission/usePlanAccess'

export type Rule = {
  id: string
  venueId: string
  effectiveFrom: string
  effectiveAt?: string
  kind: 'untracked' | 'free' | 'commission' | 'rent' | 'prepaid'
  collectionMode: 'coach' | 'venue'
  rate: number | null
  coachRate: number | null
  venueRate: number | null
  amountMinor: number | null
  currency: string | null
}
export type Venue = {
  id: string
  name: string
  address?: string | null
  active: boolean
  canDelete?: boolean
  version: number
  currentRule: Rule | null
  remaining: number
  pendingLessons?: number
}
export type Credit = {
  id: string
  venueId: string
  purchasedOn: string
  startsDeductingAt?: string
  lessonCount: number
  remainingLessons: number
  amountMinor: number
  currency: string
  privateNote: string
  version: number
}
export type FinanceSession = {
  id: string
  studentName: string
  date: string | null
  location: string | null
  venueId: string | null
  feeRuleId: string | null
  customerSource: 'coach' | 'venue' | null
  version: number | null
  status: string
}
export type VenueData = {
  today: string
  timeZone: string
  series: {
    id: string
    version: number
    location: string
    venueId: string | null
    customerSource: string | null
    studentName: string
  }[]
  venues: Venue[]
  rules: Rule[]
  credits: Credit[]
  sessions: FinanceSession[]
  purchases?: { studentId: string; venueId: string | null; lessonCount: number }[]
  salaryRules?: {
    id: string
    venueId: string
    effectiveFrom: string
    enabled: boolean
    amountMinor: number | null
    currency: string | null
    payDay: number | null
  }[]
  coachSuppliedStudents?: { venueId: string; studentId: string }[]
  studentVenueBalances?: {
    studentId: string
    venueId: string | null
    purchased: number
    completed: number
    remaining: number
  }[]
}
export function studentEligibleVenueIds(
  data: Pick<VenueData, 'purchases'> | undefined,
  studentId: string
): string[] | null {
  const purchases = (data?.purchases ?? []).filter((purchase) => purchase.studentId === studentId)
  if (purchases.some((purchase) => purchase.venueId === null)) return null
  return [
    ...new Set(
      purchases.map((purchase) => purchase.venueId).filter((id): id is string => Boolean(id))
    )
  ]
}
export function suggestedStudentVenue(
  data: Pick<VenueData, 'purchases' | 'venues'> | undefined,
  studentId: string
) {
  const allowed = studentEligibleVenueIds(data, studentId)
  if (!allowed?.length) return null
  return data?.venues.find((venue) => venue.active && allowed.includes(venue.id)) ?? null
}
export type MonthlyFinance = {
  month: string
  timeZone: string
  coverage: 'none' | 'partial' | 'complete'
  totals: {
    currency: string
    purchaseMinor?: number
    salaryMinor?: number
    incomeMinor: number
    expenseMinor: number
    differenceMinor: number
  }[]
  rows: {
    id: string
    date: string
    kind: string
    label: string
    detail?: string
    direction: 'income' | 'expense' | 'reference'
    amountMinor: number
    currency: string
    targetRoute: string
    venueId?: string | null
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
  }[]
  deletedCount?: number
  hasManualAdjustments?: boolean
  missing: { sessionId: string; reason: string; label: string }[]
  venues: Venue[]
}
export const financeKey = (coachId: string) => ['finances', coachId] as const
export function financeReturnPath(params: URLSearchParams) {
  const query = new URLSearchParams()
  const month = params.get('month')
  const entry = params.get('entry')
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) query.set('month', month)
  if (entry) query.set('entry', entry)
  return `/students/finances${query.size ? `?${query}` : ''}`
}
export const venueKey = (coachId: string) => ['venues', coachId] as const
export const financeReadRecovery = {
  // Only failed finance reads refetch when the Coach returns to this page.
  refetchOnWindowFocus: (query: { state: { status: string } }) => query.state.status === 'error',
  retry: (count: number, error: Error) =>
    (!(error instanceof ApiError) || error.status >= 500) && count < 4,
  retryDelay: (count: number) => Math.min(1000 * 2 ** count, 8000)
}
export function useVenues(session: Session) {
  return useQuery({
    queryKey: venueKey(session.user.id),
    queryFn: () => request<VenueData>('/api/v1/venues', session.access_token),
    ...financeReadRecovery
  })
}
export function useFinanceMutation(session: Session) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      path,
      body,
      method = 'POST'
    }: {
      path: string
      body: unknown
      method?: string
    }) =>
      request<any>(`/api/v1${path}`, session.access_token, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }),
    onSuccess: (_result, variables) => {
      if (variables.path.endsWith('/preview')) return
      void client.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      for (const name of [
        'finances',
        'venues',
        'today',
        'calendar',
        'student',
        'students',
        'session',
        'schedule-series',
        'lesson-purchase-income'
      ])
        void client.invalidateQueries({ queryKey: [name, session.user.id] })
    }
  })
}
export const ruleLabels: Record<Rule['kind'], string> = {
  untracked: '不記錄場地支出',
  free: '免費場地',
  commission: '抽成',
  rent: '單次計費',
  prepaid: '預購場地堂數'
}
export const moneyFactor = (currency: string) =>
  currency === 'TWD'
    ? 1
    : 10 **
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits!
export function financeMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined
  }).format(amount / moneyFactor(currency))
}
