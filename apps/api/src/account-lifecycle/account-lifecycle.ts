import { z } from 'zod'

export const deletionRequestSchema = z.object({
  confirmation: z.literal('DELETE'),
})

export type DeletionRequestInput = z.infer<typeof deletionRequestSchema>

export interface AccountLifecycleStatus {
  deletionDueAt: string | null
}

export interface AccountDeletionExecutor {
  deleteCoach(userId: string): Promise<void>
}
