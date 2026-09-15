import type { AuthenticatedIdentity } from '../identity/identity.js'
import type {
  CapabilityLinkMetadata,
  CapabilityPurpose,
  PublicReschedule,
  PublicTrainingResult,
  PublicUsedReschedule,
} from './public-access.js'

export interface PublicAccessRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<string>
  listLinks(
    workspaceId: string,
    sessionId: string,
    now: Date,
  ): Promise<CapabilityLinkMetadata[] | null>
  issue(
    workspaceId: string,
    sessionId: string,
    input: { purpose: CapabilityPurpose; includeTrainingNote: boolean; tokenHash: string },
    now: Date,
  ): Promise<CapabilityLinkMetadata | null>
  reissue(
    workspaceId: string,
    linkId: string,
    input: { version: number; includeTrainingNote: boolean; tokenHash: string },
    now: Date,
  ): Promise<CapabilityLinkMetadata | null>
  revoke(
    workspaceId: string,
    linkId: string,
    version: number,
    now: Date,
  ): Promise<CapabilityLinkMetadata | null>
  readTraining(tokenHash: string, now: Date): Promise<PublicTrainingResult>
  readReschedule(tokenHash: string, now: Date): Promise<PublicReschedule>
  redeem(
    tokenHash: string,
    startsAt: Date,
    now: Date,
  ): Promise<{ reschedule: PublicReschedule; used: PublicUsedReschedule }>
  consumeRateLimit(
    operation: 'projection' | 'redemption',
    keyHash: string,
    limit: number,
    now: Date,
  ): Promise<{ allowed: boolean; retryAfter: number }>
}
