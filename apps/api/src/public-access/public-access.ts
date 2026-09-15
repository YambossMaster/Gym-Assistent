import { z } from 'zod'

export const capabilityPurposeSchema = z.enum(['training_result', 'reschedule_session'])
export type CapabilityPurpose = z.infer<typeof capabilityPurposeSchema>

export const issueCapabilitySchema = z
  .object({
    purpose: capabilityPurposeSchema,
    includeTrainingNote: z.boolean().default(false),
  })
  .refine((value) => value.purpose === 'training_result' || !value.includeTrainingNote, {
    path: ['includeTrainingNote'],
  })

export const reissueCapabilitySchema = z.object({
  version: z.number().int().positive(),
  includeTrainingNote: z.boolean().default(false),
})
export const revokeCapabilitySchema = z.object({ version: z.number().int().positive() })
export const redeemCapabilitySchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
})

export type CapabilityStatus = 'active' | 'invalid' | 'expired' | 'revoked' | 'used'
export type CapabilityLinkMetadata = {
  id: string
  purpose: CapabilityPurpose
  status: Exclude<CapabilityStatus, 'invalid'>
  expiresAt: Date
  includeTrainingNote: boolean
  createdAt: Date
  version: number
  allowedActions: { canReissue: boolean; canRevoke: boolean }
}

export type PublicTrainingResult = {
  coachDisplayName: string
  studentDisplayName: string
  session: { startsAt: Date; endsAt: Date; timeZone: string; durationMinutes: number }
  exercises: Array<{
    position: number
    definitionName: string
    sets: Array<{
      position: number
      plannedWeight: number | null
      actualReps: number | null
      unit: 'kg' | 'lb'
      rpe: number | null
      result: 'completed' | 'incomplete' | null
    }>
  }>
  trainingNote?: string
}

export type PublicReschedule = {
  coachDisplayName: string
  studentDisplayName: string
  timeZone: string
  expiresAt: Date
  originalSession: { startsAt: Date; endsAt: Date; durationMinutes: number }
  slots: Array<{ startsAt: Date; endsAt: Date }>
}

export type PublicUsedReschedule = {
  coachDisplayName: string
  timeZone: string
  redeemedStartsAt: Date
}

export type PublicCapabilityReason =
  | 'invalid_link'
  | 'expired_link'
  | 'revoked_link'
  | 'used_link'
  | 'slot_unavailable'
  | 'active_link_exists'
  | 'version_conflict'
  | 'not_eligible'

export class PublicCapabilityError extends Error {
  constructor(
    readonly reason: PublicCapabilityReason,
    readonly statusCode: number,
    readonly current?: unknown,
  ) {
    super(reason)
    this.name = 'PublicCapabilityError'
  }
}

export class PublicRateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super('rate_limited')
    this.name = 'PublicRateLimitError'
  }
}

export function linkStatus(
  link: { revokedAt: Date | null; usedAt: Date | null; expiresAt: Date },
  now: Date,
): Exclude<CapabilityStatus, 'invalid'> {
  if (link.revokedAt) return 'revoked'
  if (link.usedAt) return 'used'
  if (now >= link.expiresAt) return 'expired'
  return 'active'
}

export function tokenIsWellFormed(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}
