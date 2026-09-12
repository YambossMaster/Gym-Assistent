export const queryKeys = {
  students: (coachId: string) => ['students', coachId] as const,
  income: (coachId: string) => ['lesson-purchase-income', coachId] as const,
  student: (coachId: string, studentId: string) => ['student', coachId, studentId] as const,
  settings: (coachId: string) => ['workspace-settings', coachId] as const,
  lifecycle: (coachId: string) => ['account-lifecycle', coachId] as const
}
