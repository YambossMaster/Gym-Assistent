import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  prepareDemoImport,
  safeDemoImportPreview,
  type CatalogDefinition,
  type DemoImportPlan,
} from '../migration/demo-import.js'

export const createImportSchema = z.object({
  previewId: z.string().uuid(),
  manifestChecksum: z.string().regex(/^[0-9a-f]{64}$/),
  workspaceVersion: z.number().int().positive(),
  preferenceVersion: z.number().int().nonnegative(),
  confirmation: z.literal('IMPORT'),
})
export const rollbackImportSchema = z.object({ confirmation: z.literal('ROLLBACK') })

export type ImportRunStatus =
  | 'ready'
  | 'running'
  | 'partial'
  | 'completed'
  | 'rolling_back'
  | 'rolled_back'
  | 'rollback_blocked'
export type ImportRun = {
  id: string
  status: ImportRunStatus
  nextPhase: number
  completedPhases: string[]
  failure: { reason: string; entity?: string } | null
  rollbackExpiresAt: Date
  createdAt: Date
  updatedAt: Date
}
export type ImportPreview = ReturnType<typeof safeDemoImportPreview> & {
  id: string
  expiresAt: Date
}

export class DemoImportConflictError extends Error {
  constructor(
    readonly reason: 'preview_stale' | 'active_import' | 'rollback_blocked' | 'import_terminal',
  ) {
    super(reason)
    this.name = 'DemoImportConflictError'
  }
}

export interface DemoImportRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<string>
  listCatalog(workspaceId: string): Promise<CatalogDefinition[]>
  baselineFingerprint(workspaceId: string): Promise<string>
  savePreview(
    workspaceId: string,
    plan: DemoImportPlan,
    baselineFingerprint: string,
  ): Promise<ImportPreview>
  createRun(workspaceId: string, input: z.infer<typeof createImportSchema>): Promise<ImportRun>
  getRun(workspaceId: string, runId: string): Promise<ImportRun | null>
  continueRun(workspaceId: string, runId: string): Promise<ImportRun | null>
  rollbackRun(workspaceId: string, runId: string): Promise<ImportRun | null>
}

export class DemoImportModule {
  constructor(private readonly repository: DemoImportRepository) {}
  async preview(identity: AuthenticatedIdentity, raw: unknown) {
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const plan = prepareDemoImport(raw, workspaceId, await this.repository.listCatalog(workspaceId))
    return this.repository.savePreview(
      workspaceId,
      plan,
      await this.repository.baselineFingerprint(workspaceId),
    )
  }
  async create(identity: AuthenticatedIdentity, raw: unknown) {
    const input = createImportSchema.parse(raw)
    return this.repository.createRun(await this.repository.resolveWorkspace(identity), input)
  }
  async get(identity: AuthenticatedIdentity, runId: string) {
    return this.repository.getRun(await this.repository.resolveWorkspace(identity), runId)
  }
  async continue(identity: AuthenticatedIdentity, runId: string) {
    return this.repository.continueRun(await this.repository.resolveWorkspace(identity), runId)
  }
  async rollback(identity: AuthenticatedIdentity, runId: string, raw: unknown) {
    rollbackImportSchema.parse(raw)
    return this.repository.rollbackRun(await this.repository.resolveWorkspace(identity), runId)
  }
}
