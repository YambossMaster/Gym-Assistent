import { z } from 'zod'

export interface WorkspaceSettings {
  displayName: string
  timeZone: string
  defaultCurrency: 'TWD' | 'USD' | 'JPY' | 'EUR' | 'HKD'
  calendarStartHour: number
  calendarEndHour: number
  calendarWeekStart: 0 | 1
  defaultSessionMinutes: 30 | 45 | 60 | 90 | 120
  version: number
  updatedAt: string
}

export const updateWorkspaceSettingsSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    timeZone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine(isSupportedTimeZone, 'timeZone must be a valid IANA time zone'),
    defaultCurrency: z.enum(['TWD', 'USD', 'JPY', 'EUR', 'HKD']).optional(),
    calendarStartHour: z.number().int().min(0).max(23).optional(),
    calendarEndHour: z.number().int().min(1).max(24).optional(),
    calendarWeekStart: z.union([z.literal(0), z.literal(1)]).optional(),
    defaultSessionMinutes: z
      .union([z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)])
      .optional(),
    version: z.number().int().positive(),
  })
  .refine(
    ({ calendarStartHour, calendarEndHour }) =>
      calendarStartHour === undefined ||
      calendarEndHour === undefined ||
      calendarEndHour > calendarStartHour,
    { message: 'calendarEndHour must be later than calendarStartHour', path: ['calendarEndHour'] },
  )

export type UpdateWorkspaceSettingsInput = z.input<typeof updateWorkspaceSettingsSchema>

function isSupportedTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}
