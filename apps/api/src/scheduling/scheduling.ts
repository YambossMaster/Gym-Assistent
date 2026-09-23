import { z } from 'zod'

const instant = z.iso.datetime({ offset: true })
const quarterHourInstant = instant.refine(
  (value) => new Date(value).getUTCMinutes() % 15 === 0 && new Date(value).getUTCSeconds() === 0,
  { message: 'Times must use 15-minute increments.' },
)
const version = z.number().int().positive()
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const sessionStatusSchema = z.enum(['scheduled', 'completed', 'cancelled'])
export const autoScheduleHorizonSchema = z.enum(['NONE', '1_WEEK', '2_WEEKS'])
export type AutoScheduleHorizon = z.infer<typeof autoScheduleHorizonSchema>
export const calendarRangeSchema = z.object({ start: localDate, end: localDate })
const sessionTimingSchema = z.object({
  startsAt: quarterHourInstant,
  endsAt: quarterHourInstant,
  location: z.string().trim().min(1).max(160),
})
const sessionTimingRangeSchema = sessionTimingSchema.refine(
  (value) => new Date(value.endsAt) > new Date(value.startsAt),
  { path: ['endsAt'] },
)
export const createSessionSchema = sessionTimingSchema
  .extend({ studentId: z.string().uuid() })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { path: ['endsAt'] })
export const updateSessionSchema = sessionTimingRangeSchema.extend({
  version,
  studentId: z.string().uuid().optional(),
})
export const transitionSessionSchema = z.object({
  action: z.enum(['complete', 'reopen', 'cancel']),
  version,
})
export const deleteSessionSchema = z.object({ confirmation: z.literal('DELETE'), version })
export const availabilityWindowSchema = z
  .object({ startTime: localTime, endTime: localTime })
  .refine((value) => value.endTime > value.startTime, { path: ['endTime'] })
export const replaceAvailabilitySchema = z.object({
  windows: z.array(availabilityWindowSchema),
  version,
})
export const createBlockSchema = z
  .object({
    startsAt: quarterHourInstant,
    endsAt: quarterHourInstant,
    note: z.string().trim().max(1000).default(''),
    repeatCount: z.number().int().min(1).max(52).default(1),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { path: ['endsAt'] })
export const updateBlockSchema = z
  .object({
    startsAt: quarterHourInstant,
    endsAt: quarterHourInstant,
    note: z.string().trim().max(1000),
    version,
    scope: z.enum(['single', 'future', 'all']).default('single'),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { path: ['endsAt'] })
const seriesSchema = z.object({
  startsAt: quarterHourInstant,
  endsAt: quarterHourInstant,
  location: z.string().trim().min(1).max(160),
  intervalWeeks: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  autoScheduleHorizon: autoScheduleHorizonSchema.default('NONE'),
})
export const createSeriesSchema = seriesSchema.refine(
  (value) => new Date(value.endsAt) > new Date(value.startsAt),
  { path: ['endsAt'] },
)
export const updateSeriesSchema = seriesSchema
  .extend({
    active: z.boolean(),
    effective_from_session_id: z.string().uuid().optional(),
    version,
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { path: ['endsAt'] })
export const deleteSeriesSchema = z.object({ confirmation: z.literal('DELETE'), version })
export const deleteBlockSchema = z.object({
  confirmation: z.literal('DELETE'),
  version,
  scope: z.enum(['single', 'future', 'all']).default('single'),
})

export type CourseSession = {
  id: string
  studentId: string
  studentName: string
  seriesId: string | null
  startsAt: string | null
  endsAt: string | null
  location: string | null
  status: z.infer<typeof sessionStatusSchema>
  completedAt: string | null
  version: number | null
  isLegacy: boolean
}
export type CalendarBlock = {
  id: string
  recurrenceId: string | null
  startsAt: string
  endsAt: string
  note: string
  version: number
}
export type ScheduleSeries = {
  id: string
  studentId: string
  anchorStartsAt: string
  localWeekday: number
  localStartTime: string
  durationMinutes: number
  intervalWeeks: 0 | 1 | 2
  autoScheduleHorizon: z.infer<typeof autoScheduleHorizonSchema>
  location: string
  active: boolean
  version: number
}
export type AvailabilityWindow = z.infer<typeof availabilityWindowSchema>
export type Conflict = {
  kind: 'session_overlap' | 'calendar_block' | 'outside_availability'
  id: string
  startsAt: string
  endsAt: string
  studentName?: string
}
export type SessionWithConflicts = { session: CourseSession; conflicts: Conflict[] }
export type CalendarProjection = {
  timeZone: string
  range: { start: string; end: string }
  sessions: SessionWithConflicts[]
  blocks: CalendarBlock[]
  availabilityByDate: Record<string, AvailabilityWindow[]>
  availabilityVersionsByDate: Record<string, number>
  availabilityRulesByWeekday: Record<string, { windows: AvailabilityWindow[]; version: number }>
}
export type TodaySchedule = {
  date: string
  timeZone: string
  sessions: SessionWithConflicts[]
  counts: { scheduled: number; completed: number }
  conflictAttention: SessionWithConflicts[]
  isEmpty: boolean
}
