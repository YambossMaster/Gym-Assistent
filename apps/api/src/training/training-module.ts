import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  createDefinitionSchema,
  deleteDefinitionSchema,
  favoriteDefinitionSchema,
  metricSchema,
  preferenceSchema,
  saveTrainingSchema,
  updateDefinitionSchema,
} from './training.js'
import type { TrainingRepository } from './training-repository.js'

export class TrainingModule {
  constructor(private readonly repository: TrainingRepository) {}
  private async workspace(identity: AuthenticatedIdentity) {
    const id = await this.repository.resolveWorkspace(identity)
    await this.repository.bootstrapCatalog(id)
    return id
  }
  async listDefinitions(
    identity: AuthenticatedIdentity,
    filters: {
      q?: string
      equipment?: string
      bodyParts?: string[]
      movementType?: string
      view?: string
    },
  ) {
    return this.repository.listDefinitions(await this.workspace(identity), filters)
  }
  async createDefinition(identity: AuthenticatedIdentity, raw: unknown) {
    return this.repository.createDefinition(
      await this.workspace(identity),
      createDefinitionSchema.parse(raw),
    )
  }
  async updateDefinition(identity: AuthenticatedIdentity, id: string, raw: unknown) {
    return this.repository.updateDefinition(
      await this.workspace(identity),
      id,
      updateDefinitionSchema.parse(raw),
    )
  }
  async favoriteDefinition(identity: AuthenticatedIdentity, id: string, raw: unknown) {
    return this.repository.favoriteDefinition(
      await this.workspace(identity),
      id,
      favoriteDefinitionSchema.parse(raw),
    )
  }
  async deleteDefinition(identity: AuthenticatedIdentity, id: string, raw: unknown) {
    const input = deleteDefinitionSchema.parse(raw)
    return this.repository.deleteDefinition(await this.workspace(identity), id, input)
  }
  async getPreference(identity: AuthenticatedIdentity) {
    return this.repository.getPreference(await this.workspace(identity))
  }
  async setPreference(identity: AuthenticatedIdentity, raw: unknown) {
    return this.repository.setPreference(
      await this.workspace(identity),
      preferenceSchema.parse(raw),
    )
  }
  async getSessionTraining(identity: AuthenticatedIdentity, sessionId: string) {
    return this.repository.getSessionTraining(await this.workspace(identity), sessionId)
  }
  async saveSessionTraining(
    identity: AuthenticatedIdentity,
    sessionId: string,
    raw: unknown,
    complete = false,
  ) {
    return this.repository.saveSessionTraining(
      await this.workspace(identity),
      sessionId,
      saveTrainingSchema.parse(raw),
      complete,
    )
  }
  async getDefaults(
    identity: AuthenticatedIdentity,
    sessionId: string,
    definitionId: string,
    metric: string,
  ) {
    return this.repository.getDefaults(
      await this.workspace(identity),
      sessionId,
      definitionId,
      metricSchema.parse(metric),
    )
  }
  async getStudentPerformance(identity: AuthenticatedIdentity, studentId: string) {
    return this.repository.getStudentPerformance(await this.workspace(identity), studentId)
  }
  async getStudentTrend(
    identity: AuthenticatedIdentity,
    studentId: string,
    definitionId: string,
    metric: string,
  ) {
    return this.repository.getStudentTrend(
      await this.workspace(identity),
      studentId,
      definitionId,
      metricSchema.parse(metric),
    )
  }
}
