export interface Student {
  id: string
  name: string
  phone: string
  goal: string
  privateNote: string
  active: boolean
  lineLinked: boolean
  version: number
  createdAt: string
  updatedAt: string
  lessonSummary?: { purchased: number; completed: number; remaining: number }
}

export interface LessonPurchase {
  id: string
  purchasedAt: string
  lessonCount: number
  amountMinor: number
  currency: string
  privateNote: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface StudentDetail {
  student: Student
  purchases: LessonPurchase[]
  lessonSummary: { purchased: number; completed: number; remaining: number }
  schedule?: {
    nearestFuture: CalendarSession | null
    history: CalendarSession[]
  }
}

export interface LessonIncomeSummary {
  currency: string
  amountMinor: number
}

export interface TodayProjection {
  date: string
  timeZone: string
  summary: {
    activeStudents: number
    incomePeriod: { startsOn: string; endsOn: string }
    incomeByCurrency: LessonIncomeSummary[]
    attentionCount: number
  }
  attention: Array<{
    kind: 'low_lesson_balance'
    student: { id: string; name: string }
    lessonSummary: { purchased: number; completed: number; remaining: number }
    targetRoute: string
  }>
  schedule?: TodaySchedule
}

export interface CalendarSession {
  id: string
  studentId: string
  studentName: string
  seriesId: string | null
  startsAt: string | null
  endsAt: string | null
  location: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  completedAt: string | null
  version: number | null
  isLegacy: boolean
}
export interface CalendarProjection {
  timeZone: string
  range: { start: string; end: string }
  sessions: Array<{ session: CalendarSession; conflicts: Array<{ kind: string; id: string }> }>
  blocks: CalendarBlock[]
  availabilityByDate: Record<string, Array<{ startTime: string; endTime: string }>>
  availabilityVersionsByDate: Record<string, number>
  availabilityRulesByWeekday: Record<
    string,
    { windows: Array<{ startTime: string; endTime: string }>; version: number }
  >
}

export interface CalendarBlock {
  id: string
  recurrenceId: string | null
  startsAt: string
  endsAt: string
  note: string
  version: number
}

export interface ScheduleSeries {
  id: string
  studentId: string
  anchorStartsAt: string
  localWeekday: number
  localStartTime: string
  durationMinutes: number
  intervalWeeks: 1 | 2
  autoScheduleHorizon: 'NONE' | '1_WEEK' | '2_WEEKS' | 'MAX_WINDOW'
  location: string
  active: boolean
  version: number
}

export interface TodaySchedule {
  date: string
  timeZone: string
  sessions: CalendarProjection['sessions']
  counts: { scheduled: number; completed: number }
  conflictAttention: CalendarProjection['sessions']
  isEmpty: boolean
}

export type SessionTimingInput = {
  startsAt: string
  endsAt: string
  location: string
}

export interface CreateStudentInput {
  name: string
  phone?: string
  goal?: string
  privateNote?: string
}

export interface WorkspaceSettings {
  displayName: string
  timeZone: string
  version: number
  updatedAt: string
}

export interface UpdateWorkspaceSettingsInput {
  displayName: string
  timeZone: string
  version: number
}

export interface AccountLifecycle {
  deletionDueAt: string | null
}

export async function isRegistrationEmailTaken(email: string): Promise<boolean> {
  const response = await requestPublic<{ exists: boolean }>('/api/v1/account-registration-check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: email.trim() })
  })
  return response.exists
}

interface StudentsResponse {
  students: Student[]
}

interface StudentResponse {
  student: Student
}

interface StudentDetailResponse {
  detail: StudentDetail
}
interface LessonPurchaseResponse {
  purchase: LessonPurchase
}

interface WorkspaceSettingsResponse {
  settings: WorkspaceSettings
}

interface AccountLifecycleResponse {
  lifecycle: AccountLifecycle
}

interface ErrorResponse {
  message?: string
  currentPurchase?: LessonPurchase
  current?: CalendarSession | CalendarBlock | ScheduleSeries
}

export class ApiError extends Error {
  readonly status: number
  readonly details: ErrorResponse

  constructor(status: number, message: string, details: ErrorResponse = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function listStudents(accessToken: string): Promise<Student[]> {
  const response = await request<StudentsResponse>('/api/v1/students', accessToken)
  return response.students
}

export async function createStudent(
  accessToken: string,
  input: CreateStudentInput
): Promise<Student> {
  const response = await request<StudentResponse>('/api/v1/students', accessToken, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  return response.student
}

export async function getStudentDetail(
  accessToken: string,
  studentId: string
): Promise<StudentDetail> {
  const response = await request<StudentDetailResponse>(
    `/api/v1/students/${studentId}`,
    accessToken
  )
  return response.detail
}

export async function updateStudent(
  accessToken: string,
  studentId: string,
  input: CreateStudentInput & { active: boolean; lineLinked: boolean; version: number }
): Promise<Student> {
  const response = await request<StudentResponse>(`/api/v1/students/${studentId}`, accessToken, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  return response.student
}

export async function createLessonPurchase(
  accessToken: string,
  studentId: string,
  input: {
    purchasedAt: string
    lessonCount: number
    amountMinor: number
    currency: string
    privateNote?: string
  }
): Promise<LessonPurchase> {
  const response = await request<LessonPurchaseResponse>(
    `/api/v1/students/${studentId}/lesson-purchases`,
    accessToken,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }
  )
  return response.purchase
}

export async function updateLessonPurchase(
  accessToken: string,
  studentId: string,
  purchaseId: string,
  input: {
    purchasedAt: string
    lessonCount: number
    amountMinor: number
    currency: string
    privateNote?: string
    version: number
  }
): Promise<LessonPurchase> {
  const response = await request<LessonPurchaseResponse>(
    `/api/v1/students/${studentId}/lesson-purchases/${purchaseId}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  return response.purchase
}

export async function deleteLessonPurchase(
  accessToken: string,
  studentId: string,
  purchaseId: string,
  version: number
): Promise<void> {
  await request<undefined>(
    `/api/v1/students/${studentId}/lesson-purchases/${purchaseId}`,
    accessToken,
    {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE', version })
    }
  )
}

export async function getLessonPurchaseIncome(accessToken: string): Promise<LessonIncomeSummary[]> {
  const response = await request<{ income: LessonIncomeSummary[] }>(
    '/api/v1/lesson-purchase-income',
    accessToken
  )
  return response.income
}

export async function getToday(accessToken: string): Promise<TodayProjection> {
  const response = await request<{ today: TodayProjection }>('/api/v1/today', accessToken)
  return response.today
}

export async function getCalendar(
  accessToken: string,
  range: { start: string; end: string }
): Promise<CalendarProjection> {
  const params = new URLSearchParams(range)
  const response = await request<{ calendar: CalendarProjection }>(
    `/api/v1/calendar?${params.toString()}`,
    accessToken
  )
  return response.calendar
}

export async function getSession(accessToken: string, sessionId: string) {
  return request<{
    session: CalendarProjection['sessions'][number]['session']
    lessonSummary: StudentDetail['lessonSummary'] | null
    conflicts: CalendarProjection['sessions'][number]['conflicts']
  }>(`/api/v1/sessions/${sessionId}`, accessToken)
}

export async function createSession(
  accessToken: string,
  input: SessionTimingInput & { studentId: string }
) {
  return request<CalendarProjection['sessions'][number]>('/api/v1/sessions', accessToken, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export async function updateSession(
  accessToken: string,
  sessionId: string,
  input: SessionTimingInput & { version: number }
) {
  return request<CalendarProjection['sessions'][number]>(
    `/api/v1/sessions/${sessionId}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
}

export async function transitionSession(
  accessToken: string,
  sessionId: string,
  input: { action: 'complete' | 'reopen' | 'cancel'; version: number }
) {
  return request<CalendarProjection['sessions'][number]>(
    `/api/v1/sessions/${sessionId}/transition`,
    accessToken,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
}

export async function deleteSession(accessToken: string, sessionId: string, version: number) {
  await request<undefined>(`/api/v1/sessions/${sessionId}`, accessToken, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE', version })
  })
}

export async function listScheduleSeries(accessToken: string, studentId: string) {
  const response = await request<{ series: ScheduleSeries[] }>(
    `/api/v1/students/${studentId}/schedule-series`,
    accessToken
  )
  return response.series
}

export async function createScheduleSeries(
  accessToken: string,
  studentId: string,
  input: SessionTimingInput & {
    intervalWeeks: 1 | 2
    autoScheduleHorizon?: ScheduleSeries['autoScheduleHorizon']
  }
) {
  return request<{ series: ScheduleSeries; anchor: CalendarSession; generatedIds: string[] }>(
    `/api/v1/students/${studentId}/schedule-series`,
    accessToken,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
}

export async function updateScheduleSeries(
  accessToken: string,
  seriesId: string,
  input: SessionTimingInput & {
    intervalWeeks: 1 | 2
    autoScheduleHorizon?: ScheduleSeries['autoScheduleHorizon']
    active: boolean
    effective_from_session_id?: string
    version: number
  }
) {
  const response = await request<{ series: ScheduleSeries; generatedIds: string[] }>(
    `/api/v1/schedule-series/${seriesId}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  return response
}

export async function reconcileScheduleSeries(accessToken: string, studentId: string) {
  return request<{
    generatedIds: string[]
    sessions: CalendarProjection['sessions'][number]['session'][]
  }>(`/api/v1/students/${studentId}/schedule-series/reconcile`, accessToken, { method: 'POST' })
}

export async function createCalendarBlock(
  accessToken: string,
  input: { startsAt: string; endsAt: string; note?: string; repeatCount?: number }
) {
  const response = await request<{ blocks: CalendarBlock[] }>(
    '/api/v1/calendar-blocks',
    accessToken,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  return response.blocks
}

export async function updateCalendarBlock(
  accessToken: string,
  blockId: string,
  input: {
    startsAt: string
    endsAt: string
    note: string
    version: number
    scope: 'single' | 'future' | 'all'
  }
) {
  const response = await request<{ blocks: CalendarBlock[] }>(
    `/api/v1/calendar-blocks/${blockId}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  return response.blocks
}

export async function deleteCalendarBlock(
  accessToken: string,
  blockId: string,
  input: { version: number; scope: 'single' | 'future' | 'all' }
) {
  await request<undefined>(`/api/v1/calendar-blocks/${blockId}`, accessToken, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE', ...input })
  })
}

export async function replaceAvailability(
  accessToken: string,
  target: { kind: 'rule'; weekday: number } | { kind: 'override'; date: string },
  input: { windows: Array<{ startTime: string; endTime: string }>; version: number }
) {
  const path =
    target.kind === 'rule'
      ? `/api/v1/availability/rules/${target.weekday}`
      : `/api/v1/availability/overrides/${target.date}`
  return request<{
    availability: {
      kind: 'rule' | 'override'
      target: string | number
      windows: Array<{ startTime: string; endTime: string }>
      version: number
    }
  }>(path, accessToken, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export async function deleteStudent(
  accessToken: string,
  studentId: string,
  version: number
): Promise<void> {
  await request<undefined>(`/api/v1/students/${studentId}`, accessToken, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE', version })
  })
}

export async function getWorkspaceSettings(accessToken: string): Promise<WorkspaceSettings> {
  const response = await request<WorkspaceSettingsResponse>(
    '/api/v1/workspace-settings',
    accessToken
  )
  return response.settings
}

export async function updateWorkspaceSettings(
  accessToken: string,
  input: UpdateWorkspaceSettingsInput
): Promise<WorkspaceSettings> {
  const response = await request<WorkspaceSettingsResponse>(
    '/api/v1/workspace-settings',
    accessToken,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  return response.settings
}

export async function getAccountLifecycle(accessToken: string): Promise<AccountLifecycle> {
  const response = await request<AccountLifecycleResponse>('/api/v1/account-lifecycle', accessToken)
  return response.lifecycle
}

export async function requestAccountDeletion(accessToken: string): Promise<AccountLifecycle> {
  const response = await request<AccountLifecycleResponse>(
    '/api/v1/account-deletion-request',
    accessToken,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' })
    }
  )
  return response.lifecycle
}

export async function cancelAccountDeletion(accessToken: string): Promise<AccountLifecycle> {
  const response = await request<AccountLifecycleResponse>(
    '/api/v1/account-deletion-request',
    accessToken,
    {
      method: 'DELETE'
    }
  )
  return response.lifecycle
}

export async function deleteAccountImmediately(accessToken: string): Promise<void> {
  await request<undefined>('/api/v1/account', accessToken, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE' })
  })
}

async function request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse
    throw new ApiError(response.status, error.message || '雲端服務暫時無法完成要求', error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function requestPublic<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse
    throw new ApiError(response.status, error.message || '雲端服務暫時無法完成要求', error)
  }
  return (await response.json()) as T
}
