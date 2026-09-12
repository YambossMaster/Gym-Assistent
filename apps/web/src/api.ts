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
}

export interface LessonIncomeSummary {
  currency: string
  amountMinor: number
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
