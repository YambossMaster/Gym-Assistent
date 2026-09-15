export const queryKeys = {
  students: (coachId: string) => ['students', coachId] as const,
  income: (coachId: string) => ['lesson-purchase-income', coachId] as const,
  today: (coachId: string) => ['today', coachId] as const,
  calendar: (coachId: string, start: string, end: string) =>
    ['calendar', coachId, start, end] as const,
  session: (coachId: string, sessionId: string) => ['session', coachId, sessionId] as const,
  scheduleSeries: (coachId: string, studentId: string) =>
    ['schedule-series', coachId, studentId] as const,
  student: (coachId: string, studentId: string) => ['student', coachId, studentId] as const,
  settings: (coachId: string) => ['workspace-settings', coachId] as const,
  lifecycle: (coachId: string) => ['account-lifecycle', coachId] as const
}
