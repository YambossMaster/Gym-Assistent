import { z } from 'zod'

export const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).default(''),
  goal: z.string().trim().max(1000).default(''),
  privateNote: z.string().trim().max(4000).default(''),
  active: z.boolean().default(true),
  lineLinked: z.boolean().default(false),
})

export type CreateStudentInput = z.input<typeof createStudentSchema>

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
