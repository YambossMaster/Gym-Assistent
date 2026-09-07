export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'
export type ExercisePerformanceMetric = 'weight' | 'reps'

export interface Student {
  id: string
  name: string
  phone: string
  goal: string
  privateNote: string
  active: boolean
  lineLinked: boolean
  createdAt: string
}

export interface Purchase {
  id: string
  studentId: string
  purchasedAt: string
  amount: number
  lessonCount: number
  note: string
}

export interface ScheduleSeries {
  id: string
  studentId: string
  weekday: number
  localStartTime: string
  durationMinutes: number
  intervalWeeks: number
  active: boolean
}

export interface AvailabilityRule {
  id: string
  weekday: number
  startTime: string
  endTime: string
  active: boolean
}

export interface AvailabilityWindow {
  startTime: string
  endTime: string
}

export interface AvailabilityOverride {
  id: string
  date: string
  windows: AvailabilityWindow[]
}

export interface CourseSession {
  id: string
  studentId: string
  seriesId?: string
  startsAt: string
  endsAt: string
  status: SessionStatus
  completedAt?: string
  location: string
}

export interface TrainingSet {
  id: string
  plannedWeight?: number
  plannedReps?: number
  actualReps?: number
  result?: 'completed' | 'incomplete'
  unit: 'kg' | 'lb'
  rpe?: number
}

export interface TrainingExercise {
  id: string
  definitionId?: string
  name: string
  region: string
  performanceMetric: ExercisePerformanceMetric
  sets: TrainingSet[]
}

export interface TrainingRecord {
  sessionId: string
  privateNote: string
  exercises: TrainingExercise[]
  updatedAt: string
}

export interface CalendarBlock {
  id: string
  recurrenceId?: string
  startsAt: string
  endsAt: string
  note: string
}

export interface CapabilityLink {
  token: string
  sessionId: string
  capability: 'reschedule_session' | 'read_training_session'
  expiresAt: string
  usedAt?: string
  includeNote?: boolean
}

export interface ExerciseDefinition {
  id: string
  name: string
  equipment: string
  bodyParts: string[]
  movementType: '系統動作' | '局部動作'
  performanceMetric: ExercisePerformanceMetric
  isSystem: boolean
  favorite: boolean
}

export interface CoachSettings {
  displayName: string
  timezone: string
  defaultDurationMinutes: number
  defaultWeightUnit: 'kg' | 'lb'
  reminderHoursBefore: number
  conflictScanEnabled: boolean
  calendarStartHour: number
  calendarEndHour: number
}

export interface AppData {
  students: Student[]
  purchases: Purchase[]
  series: ScheduleSeries[]
  sessions: CourseSession[]
  records: TrainingRecord[]
  blocks: CalendarBlock[]
  links: CapabilityLink[]
  availability: AvailabilityRule[]
  availabilityOverrides: AvailabilityOverride[]
  exercises: ExerciseDefinition[]
  settings: CoachSettings
}
