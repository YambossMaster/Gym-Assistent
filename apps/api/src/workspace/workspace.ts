import { z } from 'zod'

export interface WorkspaceSettings {
  displayName: string
  timeZone: string
  version: number
  updatedAt: string
}

export const updateWorkspaceSettingsSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(isSupportedTimeZone, 'timeZone must be a valid IANA time zone'),
  version: z.number().int().positive(),
})

export type UpdateWorkspaceSettingsInput = z.input<typeof updateWorkspaceSettingsSchema>

function isSupportedTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}
