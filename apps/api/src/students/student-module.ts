import { randomUUID } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  createLessonPurchaseSchema,
  createStudentSchema,
  updateStudentSchema,
  type CreateLessonPurchaseInput,
  type CreateStudentInput,
  type LessonIncomeSummary,
  type StudentRosterItem,
  type Student,
  type StudentDetail,
  type UpdateStudentInput,
  type UpdateLessonPurchaseInput,
  updateLessonPurchaseSchema,
} from './student.js'
import type { StudentRepository } from './student-repository.js'

export interface StudentModuleDependencies {
  repository: StudentRepository
  createId?: () => string
  now?: () => Date
}

export class StudentModule {
  readonly #repository: StudentRepository
  readonly #createId: () => string
  readonly #now: () => Date

  constructor({
    repository,
    createId = randomUUID,
    now = () => new Date(),
  }: StudentModuleDependencies) {
    this.#repository = repository
    this.#createId = createId
    this.#now = now
  }

  async list(identity: AuthenticatedIdentity): Promise<StudentRosterItem[]> {
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.listStudents(workspaceId)
  }

  async create(identity: AuthenticatedIdentity, rawInput: CreateStudentInput): Promise<Student> {
    const input = createStudentSchema.parse(rawInput)
    const workspaceId = await this.#repository.resolveWorkspace(identity)

    return this.#repository.createStudent(workspaceId, {
      id: this.#createId(),
      ...input,
      now: this.#now(),
    })
  }

  async detail(identity: AuthenticatedIdentity, studentId: string): Promise<StudentDetail | null> {
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.getStudentDetail(workspaceId, studentId)
  }

  async incomeSummary(identity: AuthenticatedIdentity): Promise<LessonIncomeSummary[]> {
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.incomeSummary(workspaceId)
  }

  async update(
    identity: AuthenticatedIdentity,
    studentId: string,
    rawInput: UpdateStudentInput,
  ): Promise<Student | null> {
    const input = updateStudentSchema.parse(rawInput)
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.updateStudent(workspaceId, studentId, {
      ...input,
      now: this.#now(),
      expectedVersion: input.version,
    })
  }

  async delete(
    identity: AuthenticatedIdentity,
    studentId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.deleteStudent(workspaceId, studentId, expectedVersion)
  }

  async createLessonPurchase(
    identity: AuthenticatedIdentity,
    studentId: string,
    rawInput: CreateLessonPurchaseInput,
  ) {
    const input = createLessonPurchaseSchema.parse(rawInput)
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.createLessonPurchase(workspaceId, studentId, {
      id: this.#createId(),
      purchasedAt: new Date(input.purchasedAt),
      lessonCount: input.lessonCount,
      amountMinor: input.amountMinor,
      currency: input.currency,
      privateNote: input.privateNote,
      now: this.#now(),
    })
  }

  async updateLessonPurchase(
    identity: AuthenticatedIdentity,
    studentId: string,
    purchaseId: string,
    rawInput: UpdateLessonPurchaseInput,
  ) {
    const input = updateLessonPurchaseSchema.parse(rawInput)
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.updateLessonPurchase(workspaceId, studentId, purchaseId, {
      purchasedAt: new Date(input.purchasedAt),
      lessonCount: input.lessonCount,
      amountMinor: input.amountMinor,
      currency: input.currency,
      privateNote: input.privateNote,
      expectedVersion: input.version,
      now: this.#now(),
    })
  }

  async deleteLessonPurchase(
    identity: AuthenticatedIdentity,
    studentId: string,
    purchaseId: string,
    version: number,
  ): Promise<boolean> {
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.deleteLessonPurchase(workspaceId, studentId, purchaseId, version)
  }
}
