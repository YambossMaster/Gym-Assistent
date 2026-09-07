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
}

export interface CreateStudentInput {
  name: string
  phone?: string
  goal?: string
  privateNote?: string
}

interface StudentsResponse {
  students: Student[]
}

interface StudentResponse {
  student: Student
}

interface ErrorResponse {
  message?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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
    throw new ApiError(response.status, error.message || '雲端服務暫時無法完成要求')
  }

  return (await response.json()) as T
}
