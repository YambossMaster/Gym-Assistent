export const queryKeys = {
  students: (coachId: string) => ['students', coachId] as const,
  income: (coachId: string) => ['lesson-purchase-income', coachId] as const,
  today: (coachId: string) => ['today', coachId] as const,
  calendar: (coachId: string, start: string, end: string) =>
    ['calendar', coachId, start, end] as const,
  session: (coachId: string, sessionId: string) => ['session', coachId, sessionId] as const,
  capabilityLinks: (coachId: string, sessionId: string) =>
    ['capability-links', coachId, sessionId] as const,
  scheduleSeries: (coachId: string, studentId: string) =>
    ['schedule-series', coachId, studentId] as const,
  student: (coachId: string, studentId: string) => ['student', coachId, studentId] as const,
  settings: (coachId: string) => ['workspace-settings', coachId] as const,
  lifecycle: (coachId: string) => ['account-lifecycle', coachId] as const,
  exerciseLibrary: (coachId: string) => ['exercise-library', coachId] as const,
  trainingPreference: (coachId: string) => ['training-preference', coachId] as const,
  sessionTraining: (coachId: string, sessionId: string) =>
    ['session-training', coachId, sessionId] as const,
  trainingDefaults: (coachId: string, sessionId: string, definitionId: string, metric: string) =>
    ['training-defaults', coachId, sessionId, definitionId, metric] as const,
  studentPerformance: (coachId: string, studentId: string) =>
    ['student-performance', coachId, studentId] as const,
  studentTrend: (coachId: string, studentId: string, definitionId: string, metric: string) =>
    ['student-trend', coachId, studentId, definitionId, metric] as const
}
