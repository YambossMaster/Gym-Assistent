import { createHash } from 'node:crypto'
import { z } from 'zod'

const studentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(40),
  goal: z.string().max(1000),
  privateNote: z.string().max(4000),
  active: z.boolean(),
  lineLinked: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
})
const purchaseSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
  purchasedAt: z.iso.datetime({ offset: true }),
  amount: z.number().int().min(0).max(999_999_999_999),
  lessonCount: z.number().int().positive().max(10_000),
  note: z.string().max(4000),
})
const sourceSchema = z.object({
  students: z.array(studentSchema),
  purchases: z.array(purchaseSchema),
})

export interface DemoStudentEntitlementPreview {
  source: { students: number; purchases: number }
  mapped: { students: Array<DemoStudentMapping>; purchases: Array<DemoPurchaseMapping> }
  rejected: Array<{ source: 'student' | 'purchase'; id: string; reason: string }>
  warnings: Array<{ purchaseId: string; message: string }>
  checksum: string
}
export interface DemoStudentMapping {
  sourceId: string
  targetId: string
  name: string
  phone: string
  goal: string
  privateNote: string
  active: boolean
  lineLinked: boolean
  createdAt: string
}
export interface DemoPurchaseMapping {
  sourceId: string
  targetId: string
  studentSourceId: string
  studentTargetId: string
  purchasedAt: string
  lessonCount: number
  amountMinor: number
  currency: string
  privateNote: string
}

export function previewDemoStudentEntitlement(raw: unknown): DemoStudentEntitlementPreview {
  const source = sourceSchema.parse(raw)
  const mappedStudents = new Map<string, DemoStudentMapping>()
  const rejected: DemoStudentEntitlementPreview['rejected'] = []
  for (const student of source.students) {
    if (mappedStudents.has(student.id)) {
      rejected.push({ source: 'student', id: student.id, reason: 'duplicate source id' })
      continue
    }
    mappedStudents.set(student.id, {
      sourceId: student.id,
      targetId: stableUuid(`student:${student.id}`),
      name: student.name,
      phone: student.phone,
      goal: student.goal,
      privateNote: student.privateNote,
      active: student.active,
      lineLinked: student.lineLinked,
      createdAt: student.createdAt,
    })
  }
  const purchases: DemoPurchaseMapping[] = []
  const warnings: DemoStudentEntitlementPreview['warnings'] = []
  const purchaseIds = new Set<string>()
  for (const purchase of source.purchases) {
    if (purchaseIds.has(purchase.id)) {
      rejected.push({ source: 'purchase', id: purchase.id, reason: 'duplicate source id' })
      continue
    }
    purchaseIds.add(purchase.id)
    const student = mappedStudents.get(purchase.studentId)
    if (!student) {
      rejected.push({
        source: 'purchase',
        id: purchase.id,
        reason: 'student is absent from source mapping',
      })
      continue
    }
    purchases.push({
      sourceId: purchase.id,
      targetId: stableUuid(`purchase:${purchase.id}`),
      studentSourceId: purchase.studentId,
      studentTargetId: student.targetId,
      purchasedAt: purchase.purchasedAt,
      lessonCount: purchase.lessonCount,
      amountMinor: purchase.amount,
      currency: 'TWD',
      privateNote: purchase.note,
    })
  }
  const mapped = {
    students: [...mappedStudents.values()].sort(bySourceId),
    purchases: purchases.sort(bySourceId),
  }
  const checksum = createHash('sha256')
    .update(JSON.stringify({ mapped, rejected, warnings }))
    .digest('hex')
  return {
    source: { students: source.students.length, purchases: source.purchases.length },
    mapped,
    rejected,
    warnings,
    checksum,
  }
}

function stableUuid(value: string) {
  const hex = createHash('sha256').update(`gym-assistant:m3:${value}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
function bySourceId<T extends { sourceId: string }>(a: T, b: T) {
  return a.sourceId.localeCompare(b.sourceId)
}
