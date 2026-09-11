import { z } from 'zod'

export const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).default(''),
  goal: z.string().trim().max(1000).default(''),
  privateNote: z.string().trim().max(4000).default(''),
  active: z.boolean().default(true),
  lineLinked: z.boolean().default(false),
})

export const updateStudentSchema = createStudentSchema.extend({
  version: z.number().int().positive(),
})

export const createLessonPurchaseSchema = z.object({
  purchasedAt: z.iso.datetime({ offset: true }),
  lessonCount: z.number().int().min(1).max(10_000),
  amountMinor: z.number().int().min(0).max(999_999_999_999),
  currency: z.string().regex(/^[A-Z]{3}$/),
  privateNote: z.string().trim().max(4000).default(''),
})

export type CreateStudentInput = z.input<typeof createStudentSchema>
export type UpdateStudentInput = z.input<typeof updateStudentSchema>
export type CreateLessonPurchaseInput = z.input<typeof createLessonPurchaseSchema>

export interface Student {
  id: string
  name: string
  phone: string
  goal: string
  privateNote: string
  active: boolean
  lineLinked: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface LessonPurchase {
  id: string
  purchasedAt: string
  lessonCount: number
  amountMinor: number
  currency: string
  privateNote: string
  createdAt: string
  updatedAt: string
}

export interface LessonSummary {
  purchased: number
  completed: number
  remaining: number
}

export interface LessonIncomeSummary {
  currency: string
  amountMinor: number
}

export interface StudentDetail {
  student: Student
  purchases: LessonPurchase[]
  lessonSummary: LessonSummary
}
