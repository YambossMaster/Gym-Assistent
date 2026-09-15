import { createHash } from 'node:crypto'
import { z } from 'zod'

const id = z.string().min(1).max(200)
const instant = z.iso.datetime({ offset: true })
const metric = z.enum(['weight', 'reps'])
const unit = z.enum(['kg', 'lb'])
const window = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})
const sourceSchema = z
  .object({
    settings: z.object({
      displayName: z.string().trim().min(1).max(120),
      timezone: z.string().trim().min(1).max(64),
      defaultWeightUnit: unit,
      reminderHoursBefore: z.number().optional(),
      conflictScanEnabled: z.boolean().optional(),
      calendarStartHour: z.number().optional(),
      calendarEndHour: z.number().optional(),
    }),
    students: z
      .array(
        z.object({
          id,
          name: z.string().trim().min(1).max(120),
          phone: z.string().max(40).default(''),
          goal: z.string().max(1000).default(''),
          privateNote: z.string().max(4000).default(''),
          active: z.boolean().default(true),
          lineLinked: z.boolean().default(false),
          createdAt: instant,
        }),
      )
      .max(10_000),
    purchases: z
      .array(
        z.object({
          id,
          studentId: id,
          purchasedAt: instant,
          amount: z.number().int().min(0).max(999_999_999_999),
          lessonCount: z.number().int().positive().max(10_000),
          note: z.string().max(4000).default(''),
        }),
      )
      .max(50_000),
    series: z
      .array(
        z.object({
          id,
          studentId: id,
          weekday: z.number().int().min(0).max(6),
          localStartTime: z.string().regex(/^\d{2}:\d{2}$/),
          durationMinutes: z.number().int().min(15).max(1440),
          intervalWeeks: z.union([z.literal(1), z.literal(2)]),
          active: z.boolean(),
        }),
      )
      .max(10_000),
    sessions: z
      .array(
        z.object({
          id,
          studentId: id,
          seriesId: id.optional(),
          startsAt: instant,
          endsAt: instant,
          status: z.enum(['scheduled', 'completed', 'cancelled']),
          completedAt: instant.optional(),
          location: z.string().trim().min(1).max(160),
        }),
      )
      .max(50_000),
    records: z
      .array(
        z.object({
          sessionId: id,
          privateNote: z.string().max(5000).default(''),
          updatedAt: instant,
          exercises: z
            .array(
              z.object({
                id,
                definitionId: id.optional(),
                name: z.string().trim().min(1).max(120),
                region: z.string().trim().min(1).max(40),
                performanceMetric: metric,
                sets: z
                  .array(
                    z.object({
                      id,
                      plannedWeight: z.number().min(0).max(10_000).optional(),
                      plannedReps: z.number().int().min(0).max(10_000).optional(),
                      actualReps: z.number().int().min(0).max(10_000).optional(),
                      result: z.enum(['completed', 'incomplete']).optional(),
                      unit,
                      rpe: z.number().min(1).max(10).multipleOf(0.5).optional(),
                    }),
                  )
                  .max(100),
              }),
            )
            .max(100),
        }),
      )
      .max(50_000),
    blocks: z
      .array(
        z.object({
          id,
          recurrenceId: id.optional(),
          startsAt: instant,
          endsAt: instant,
          note: z.string().max(1000).default(''),
        }),
      )
      .max(50_000),
    links: z
      .array(
        z.object({
          token: z.string().min(1),
          sessionId: id,
          capability: z.enum(['reschedule_session', 'read_training_session']),
          expiresAt: instant,
          usedAt: instant.optional(),
          includeNote: z.boolean().optional(),
        }),
      )
      .max(50_000),
    availability: z
      .array(
        z.object({
          id,
          weekday: z.number().int().min(0).max(6),
          startTime: window.shape.startTime,
          endTime: window.shape.endTime,
          active: z.boolean(),
        }),
      )
      .max(1000),
    availabilityOverrides: z
      .array(z.object({ id, date: z.iso.date(), windows: z.array(window).max(24) }))
      .max(10_000),
    exercises: z
      .array(
        z.object({
          id,
          name: z.string().trim().min(1).max(120),
          equipment: z.string().trim().min(1).max(120),
          bodyParts: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
          movementType: z.enum(['系統動作', '局部動作']),
          performanceMetric: metric,
          isSystem: z.boolean(),
          favorite: z.boolean(),
        }),
      )
      .max(10_000),
  })
  .passthrough()

export type DemoSource = z.infer<typeof sourceSchema>
export type DemoImportRejection = {
  phase: DemoImportPhase
  entity: string
  sourceId: string
  reason: string
}
export type DemoImportWarning = {
  phase: DemoImportPhase
  entity: string
  sourceId: string
  reason: string
}
export type DemoImportPhase =
  | 'foundation'
  | 'purchases'
  | 'training'
  | 'scheduling'
  | 'capability_links'
export const demoImportPhases: DemoImportPhase[] = [
  'foundation',
  'purchases',
  'training',
  'scheduling',
  'capability_links',
]
export type CatalogDefinition = { id: string; name: string }

export type DemoImportPlan = ReturnType<typeof prepareDemoImport>

export function prepareDemoImport(
  raw: unknown,
  workspaceId: string,
  catalog: CatalogDefinition[] = [],
) {
  const source = sourceSchema.parse(raw)
  assertIanaTimeZone(source.settings.timezone)
  const rejections: DemoImportRejection[] = []
  const warnings: DemoImportWarning[] = []
  const duplicateKinds: Array<[string, Array<{ id: string }>]> = [
    ['student', source.students],
    ['purchase', source.purchases],
    ['series', source.series],
    ['session', source.sessions],
    ['block', source.blocks],
    ['availability', source.availability],
    ['availability_override', source.availabilityOverrides],
    ['exercise_definition', source.exercises],
  ]
  for (const [kind, values] of duplicateKinds)
    rejectDuplicates(values, kind, phaseFor(kind), rejections)

  const students = unique(source.students)
  const studentIds = new Set(students.map((item) => item.id))
  const sessions = unique(source.sessions).filter((item) => {
    if (!studentIds.has(item.studentId))
      return reject(rejections, 'scheduling', 'session', item.id, 'student_missing')
    if (Date.parse(item.endsAt) <= Date.parse(item.startsAt))
      return reject(rejections, 'scheduling', 'session', item.id, 'end_not_after_start')
    if (item.status === 'completed' && !item.completedAt)
      return reject(rejections, 'scheduling', 'session', item.id, 'completed_at_missing')
    return true
  })
  const sessionIds = new Set(sessions.map((item) => item.id))
  const series = unique(source.series).filter((item) => {
    if (!studentIds.has(item.studentId))
      return reject(rejections, 'scheduling', 'series', item.id, 'student_missing')
    if (!sessions.some((session) => session.seriesId === item.id))
      return reject(rejections, 'scheduling', 'series', item.id, 'anchor_session_missing')
    return true
  })
  const seriesIds = new Set(series.map((item) => item.id))
  for (const item of sessions)
    if (item.seriesId && !seriesIds.has(item.seriesId)) {
      warnings.push({
        phase: 'scheduling',
        entity: 'session',
        sourceId: item.id,
        reason: 'series_missing_unlinked',
      })
      delete item.seriesId
    }

  const catalogByName = new Map<string, CatalogDefinition[]>()
  for (const definition of catalog)
    catalogByName.set(normalizeName(definition.name), [
      ...(catalogByName.get(normalizeName(definition.name)) ?? []),
      definition,
    ])
  const definitions = unique(source.exercises).map((item) => {
    const matches = item.isSystem ? (catalogByName.get(normalizeName(item.name)) ?? []) : []
    if (item.isSystem && matches.length !== 1)
      warnings.push({
        phase: 'foundation',
        entity: 'exercise_definition',
        sourceId: item.id,
        reason: matches.length
          ? 'system_name_ambiguous_created_custom'
          : 'system_name_missing_created_custom',
      })
    return {
      ...item,
      targetId:
        matches.length === 1
          ? matches[0]!.id
          : stableUuid(workspaceId, 'exercise_definition', item.id),
      matchedSystem: matches.length === 1,
    }
  })
  const definitionBySource = new Map(definitions.map((item) => [item.id, item]))
  const definitionByName = new Map<string, typeof definitions>()
  for (const item of definitions)
    definitionByName.set(normalizeName(item.name), [
      ...(definitionByName.get(normalizeName(item.name)) ?? []),
      item,
    ])

  const records = uniqueBy(source.records, (item) => item.sessionId)
    .filter((record) => {
      if (!sessionIds.has(record.sessionId))
        return reject(
          rejections,
          'training',
          'training_record',
          record.sessionId,
          'session_missing',
        )
      return true
    })
    .map((record) => ({
      ...record,
      targetId: stableUuid(workspaceId, 'training_record', record.sessionId),
      exercises: record.exercises.map((exercise, position) => {
        const direct = exercise.definitionId
          ? definitionBySource.get(exercise.definitionId)
          : undefined
        const named = definitionByName.get(normalizeName(exercise.name)) ?? []
        const definition = direct ?? (named.length === 1 ? named[0] : undefined)
        const targetDefinitionId =
          definition?.targetId ??
          stableUuid(workspaceId, 'orphan_definition', exercise.definitionId ?? exercise.name)
        if (!definition)
          warnings.push({
            phase: 'training',
            entity: 'training_exercise',
            sourceId: exercise.id,
            reason: 'definition_missing_created_custom',
          })
        return {
          ...exercise,
          position,
          targetId: stableUuid(workspaceId, 'training_exercise', exercise.id),
          targetDefinitionId,
          orphanDefinition: definition
            ? null
            : {
                id: targetDefinitionId,
                name: exercise.name,
                performanceMetric: exercise.performanceMetric,
                bodyParts: [exercise.region],
              },
          sets: exercise.sets.map((set, setPosition) => ({
            ...set,
            position: setPosition,
            targetId: stableUuid(workspaceId, 'training_set', set.id),
          })),
        }
      }),
    }))

  const purchases = unique(source.purchases).filter((item) => {
    if (!studentIds.has(item.studentId))
      return reject(rejections, 'purchases', 'purchase', item.id, 'student_missing')
    return true
  })
  for (const student of students)
    if (student.lineLinked)
      warnings.push({
        phase: 'foundation',
        entity: 'student',
        sourceId: student.id,
        reason: 'line_link_not_imported',
      })
  for (const field of [
    'reminderHoursBefore',
    'conflictScanEnabled',
    'calendarStartHour',
    'calendarEndHour',
  ] as const)
    if (source.settings[field] !== undefined)
      warnings.push({
        phase: 'foundation',
        entity: 'settings',
        sourceId: field,
        reason: 'unsupported_setting_not_imported',
      })
  for (const link of source.links)
    rejections.push({
      phase: 'capability_links',
      entity: 'capability_link',
      sourceId: link.sessionId,
      reason: 'legacy_secret_not_transferable',
    })

  const normalized = {
    settings: {
      displayName: source.settings.displayName,
      timeZone: source.settings.timezone,
      defaultWeightUnit: source.settings.defaultWeightUnit,
    },
    definitions,
    students: students.map((item) => ({
      ...item,
      targetId: stableUuid(workspaceId, 'student', item.id),
    })),
    purchases: purchases.map((item) => ({
      ...item,
      targetId: stableUuid(workspaceId, 'purchase', item.id),
      targetStudentId: stableUuid(workspaceId, 'student', item.studentId),
    })),
    records,
    series: series.map((item) => ({
      ...item,
      targetId: stableUuid(workspaceId, 'series', item.id),
      targetStudentId: stableUuid(workspaceId, 'student', item.studentId),
    })),
    sessions: sessions.map((item) => ({
      ...item,
      targetId: stableUuid(workspaceId, 'session', item.id),
      targetStudentId: stableUuid(workspaceId, 'student', item.studentId),
      targetSeriesId: item.seriesId ? stableUuid(workspaceId, 'series', item.seriesId) : null,
    })),
    availability: unique(source.availability)
      .filter(validAvailability)
      .map((item) => ({
        ...item,
        targetId: stableUuid(workspaceId, 'availability', item.id),
        weekday: item.weekday + 1,
      })),
    availabilityOverrides: unique(source.availabilityOverrides)
      .filter((item) => item.windows.every(validWindow))
      .map((item) => ({
        ...item,
        targetId: stableUuid(workspaceId, 'availability_override', item.id),
      })),
    blocks: unique(source.blocks)
      .filter((item) => Date.parse(item.endsAt) > Date.parse(item.startsAt))
      .map((item) => ({
        ...item,
        targetId: stableUuid(workspaceId, 'block', item.id),
        targetRecurrenceId: item.recurrenceId
          ? stableUuid(workspaceId, 'block_recurrence', item.recurrenceId)
          : null,
      })),
  }
  const counts = {
    foundation: normalized.definitions.length + normalized.students.length + 2,
    purchases: normalized.purchases.length,
    training: normalized.records.length,
    scheduling:
      normalized.series.length +
      normalized.sessions.length +
      normalized.availability.length +
      normalized.availabilityOverrides.length +
      normalized.blocks.length,
    capability_links: 0,
  }
  const manifestChecksum = checksum({ normalized, rejections, warnings })
  return { sourceHash: checksum(raw), manifestChecksum, counts, rejections, warnings, normalized }
}

export function safeDemoImportPreview(plan: DemoImportPlan) {
  return {
    sourceHash: plan.sourceHash,
    manifestChecksum: plan.manifestChecksum,
    phases: demoImportPhases.map((phase) => ({
      phase,
      create: plan.counts[phase],
      rejected: plan.rejections.filter((item) => item.phase === phase).length,
      warnings: plan.warnings.filter((item) => item.phase === phase).length,
    })),
    rejections: plan.rejections,
    warnings: plan.warnings,
    settings: plan.normalized.settings,
  }
}

function unique<T extends { id: string }>(values: T[]) {
  return uniqueBy(values, (item) => item.id)
}
function uniqueBy<T>(values: T[], key: (item: T) => string) {
  const seen = new Set<string>()
  return values.filter((item) => {
    const value = key(item)
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}
function rejectDuplicates(
  values: Array<{ id: string }>,
  entity: string,
  phase: DemoImportPhase,
  target: DemoImportRejection[],
) {
  const seen = new Set<string>()
  for (const item of values) {
    if (seen.has(item.id))
      target.push({ phase, entity, sourceId: item.id, reason: 'duplicate_source_id' })
    seen.add(item.id)
  }
}
function reject(
  target: DemoImportRejection[],
  phase: DemoImportPhase,
  entity: string,
  sourceId: string,
  reason: string,
) {
  target.push({ phase, entity, sourceId, reason })
  return false
}
function phaseFor(kind: string): DemoImportPhase {
  if (kind === 'student' || kind === 'exercise_definition') return 'foundation'
  if (kind === 'purchase') return 'purchases'
  return 'scheduling'
}
function validWindow(value: { startTime: string; endTime: string }) {
  return value.endTime > value.startTime
}
function validAvailability(value: { startTime: string; endTime: string; active: boolean }) {
  return value.active && validWindow(value)
}
function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('zh-TW').replace(/\s+/g, ' ')
}
function checksum(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
function stableUuid(workspaceId: string, kind: string, sourceId: string) {
  const hex = createHash('sha256')
    .update(`gym-assistant:m7:${workspaceId}:${kind}:${sourceId}`)
    .digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
function assertIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
  } catch {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['settings', 'timezone'],
        message: 'Invalid IANA time zone',
        input: value,
      },
    ])
  }
}
