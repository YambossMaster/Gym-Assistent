import { randomUUID } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { createStudentSchema, type CreateStudentInput, type Student } from './student.js'
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

  async list(identity: AuthenticatedIdentity): Promise<Student[]> {
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
}
