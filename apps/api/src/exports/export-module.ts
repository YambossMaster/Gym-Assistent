import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { zonedMidnight } from '../today/today.js'
import type { WorkspaceModule } from '../workspace/workspace-module.js'
import type { StudentModule } from '../students/student-module.js'
import type { SchedulingModule } from '../scheduling/scheduling-module.js'
import type { TrainingModule } from '../training/training-module.js'
import type { FinanceModule } from '../finances/finance-module.js'
import type { SessionTraining } from '../training/training.js'

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const inputSchema = z
  .object({
    type: z.enum(['training', 'growth', 'calendar', 'finance']),
    format: z.enum(['csv', 'json', 'pdf']),
    start: localDate,
    end: localDate,
    studentId: z.uuid().optional(),
    definitionId: z.uuid().optional(),
    venueId: z.uuid().optional(),
    includeBlocks: z.boolean().optional(),
    income: z.boolean().optional(),
    expense: z.boolean().optional(),
    reference: z.boolean().optional(),
    includePrivateNotes: z.boolean().default(false),
  })
  .strict()

export type ExportInput = z.infer<typeof inputSchema>
export type ExportType = ExportInput['type']
export type ExportFormat = ExportInput['format']
export type ExportRow = Record<string, string | number | boolean | null>
export type ExportData = {
  type: ExportType
  format: ExportFormat
  start: string
  end: string
  timeZone: string
  generatedAt: string
  includePrivateNotes: boolean
  filters: Record<string, string | boolean | null>
  columns: string[]
  rows: ExportRow[]
  records: unknown[]
}

export class ExportError extends Error {
  constructor(
    readonly statusCode: 400 | 404 | 413 | 422,
    readonly code: string,
  ) {
    super(code)
  }
}

const baseTrainingColumns = [
  'sessionId',
  'studentId',
  'studentName',
  'sessionStartsAt',
  'sessionEndsAt',
  'sessionStatus',
  'location',
  'recordId',
  'recordUpdatedAt',
  'exerciseId',
  'definitionId',
  'exerciseName',
  'recordingType',
  'setId',
  'setNumber',
  'plannedWeight',
  'plannedReps',
  'actualReps',
  'rpe',
  'result',
  'weightUnit',
  'weight',
  'duration',
  'durationUnit',
  'distance',
  'distanceUnit',
  'rounds',
]
const columnsByType: Record<ExportType, string[]> = {
  training: baseTrainingColumns,
  growth: [
    'studentId',
    'studentName',
    'definitionId',
    'definitionName',
    'metric',
    'unit',
    'direction',
    'sessionId',
    'sessionStartsAt',
    'value',
  ],
  calendar: [
    'eventType',
    'eventId',
    'studentId',
    'studentName',
    'startsAt',
    'endsAt',
    'status',
    'venueId',
    'venueName',
    'location',
    'seriesId',
  ],
  finance: [
    'rowId',
    'date',
    'occurredAt',
    'kind',
    'direction',
    'label',
    'detail',
    'amountMinor',
    'currency',
    'venueId',
    'venueName',
    'status',
    'sourceChanged',
    'sourceRemoved',
  ],
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function checkedRange(input: ExportInput): string {
  const valid = (date: string) => {
    const parsed = new Date(`${date}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
  }
  if (
    !valid(input.start) ||
    !valid(input.end) ||
    input.start > input.end ||
    addDays(input.start, input.format === 'pdf' ? 6 : 30) < input.end
  )
    throw new ExportError(400, 'invalid_export_range')
  return addDays(input.end, 1)
}

function validateFilters(input: ExportInput) {
  if (
    (input.studentId && !['training', 'growth', 'calendar'].includes(input.type)) ||
    (input.definitionId && input.type !== 'growth') ||
    (input.venueId && input.type !== 'finance') ||
    (input.includeBlocks !== undefined && input.type !== 'calendar') ||
    ([input.income, input.expense, input.reference].some((v) => v !== undefined) &&
      input.type !== 'finance') ||
    (input.includePrivateNotes && input.type === 'growth')
  )
    throw new ExportError(400, 'invalid_export_filter')
}

function localInstant(value: string | Date | null | undefined, timeZone: string): string | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null
  return new Date(value).toISOString()
}

function limit(rows: ExportRow[], format: ExportFormat) {
  if (rows.length > (format === 'pdf' ? 500 : 2000)) throw new ExportError(413, 'export_too_large')
}

export class ExportModule {
  constructor(
    private readonly deps: {
      workspace: WorkspaceModule
      students: StudentModule
      scheduling: SchedulingModule
      training: TrainingModule
      finances: FinanceModule
      now?: () => Date
    },
  ) {}

  async select(identity: AuthenticatedIdentity, raw: unknown): Promise<ExportData> {
    const input = inputSchema.parse(raw)
    validateFilters(input)
    const afterEnd = checkedRange(input)
    const settings = await this.deps.workspace.getSettings(identity)
    const timeZone = settings.timeZone
    const students = await this.deps.students.list(identity)
    if (input.studentId && !students.some((student) => student.id === input.studentId))
      throw new ExportError(404, 'not_found')
    if (
      input.definitionId &&
      !(await this.deps.training.listDefinitions(identity, {})).definitions.some(
        (definition) => definition.id === input.definitionId,
      )
    )
      throw new ExportError(404, 'not_found')
    const startsAt = zonedMidnight(input.start, timeZone)
    const endsAt = zonedMidnight(afterEnd, timeZone)
    const now = (this.deps.now?.() ?? new Date()).toISOString()
    const columns = [...columnsByType[input.type]]
    if (input.type === 'training' && input.includePrivateNotes) columns.push('privateNote')
    if (input.type === 'calendar' && input.includePrivateNotes) columns.push('blockNote')
    if (input.type === 'finance' && input.includePrivateNotes) columns.push('privateNote')
    if (input.format === 'csv') columns.push('timeZone')

    let records: unknown[] = []
    let rows: ExportRow[] = []
    const pushRow = (row: ExportRow) => {
      rows.push(row)
      limit(rows, input.format)
    }
    const instant = (value: string | Date | null | undefined) =>
      input.format === 'json' ? iso(value) : localInstant(value, timeZone)

    if (input.type === 'finance') {
      const ledger = await this.deps.finances.exportVisibleRows(identity)
      if (input.venueId && !ledger.venues.some((venue) => venue.id === input.venueId))
        throw new ExportError(404, 'not_found')
      const names = new Map(ledger.venues.map(({ id, name }) => [id, name]))
      for (const row of ledger.rows) {
        if (
          row.date < input.start ||
          row.date > input.end ||
          (input.venueId && row.venueId !== input.venueId) ||
          (row.direction === 'income'
            ? input.income === false
            : row.direction === 'expense'
              ? input.expense === false
              : input.reference === false)
        )
          continue
        pushRow({
          rowId: row.id,
          date: row.date,
          occurredAt: instant(row.occurredAt),
          kind: row.kind,
          direction: row.direction,
          label: row.label,
          detail: row.detail ?? null,
          amountMinor: row.amountMinor,
          currency: row.currency,
          venueId: row.venueId,
          venueName: row.venueId ? (names.get(row.venueId) ?? null) : null,
          status: row.status ?? 'original',
          sourceChanged: row.sourceChanged ?? false,
          sourceRemoved: row.sourceRemoved ?? false,
          ...(input.includePrivateNotes
            ? { privateNote: ledger.manualNotes.get(row.id) ?? null }
            : {}),
        })
      }
      rows.sort(
        (a, b) =>
          String(a.date).localeCompare(String(b.date)) ||
          String(a.occurredAt).localeCompare(String(b.occurredAt)) ||
          String(a.rowId).localeCompare(String(b.rowId)),
      )
      records = rows
    } else {
      const calendar = await this.deps.scheduling.calendar(identity, {
        start: input.start,
        end: afterEnd,
      })
      const selectedSessions = calendar.sessions
        .map(({ session }) => session)
        .filter((session) => !input.studentId || session.studentId === input.studentId)
      if (input.type === 'calendar') {
        const names = new Map(
          (await this.deps.finances.exportVisibleRows(identity)).venues.map(({ id, name }) => [
            id,
            name,
          ]),
        )
        for (const session of selectedSessions)
          pushRow({
            eventType: 'session',
            eventId: session.id,
            studentId: session.studentId,
            studentName: session.studentName,
            startsAt: instant(session.startsAt),
            endsAt: instant(session.endsAt),
            status: session.status,
            venueId: session.venueId ?? null,
            venueName: session.venueId ? (names.get(session.venueId) ?? null) : null,
            location: session.location,
            seriesId: session.seriesId,
            ...(input.includePrivateNotes ? { blockNote: null } : {}),
          })
        if (input.includeBlocks)
          for (const block of calendar.blocks)
            pushRow({
              eventType: 'block',
              eventId: block.id,
              studentId: null,
              studentName: null,
              startsAt: instant(block.startsAt),
              endsAt: instant(block.endsAt),
              status: null,
              venueId: null,
              venueName: null,
              location: null,
              seriesId: null,
              ...(input.includePrivateNotes ? { blockNote: block.note } : {}),
            })
        rows.sort(
          (a, b) =>
            String(a.startsAt).localeCompare(String(b.startsAt)) ||
            String(a.eventId).localeCompare(String(b.eventId)),
        )
        records = rows
      } else if (input.type === 'training') {
        const sessions = selectedSessions.filter(
          (s) =>
            s.startsAt && s.startsAt >= startsAt.toISOString() && s.startsAt < endsAt.toISOString(),
        )
        sessions.sort(
          (a, b) =>
            String(a.startsAt).localeCompare(String(b.startsAt)) || a.id.localeCompare(b.id),
        )
        const selected: SessionTraining[] = []
        const cap = input.format === 'pdf' ? 500 : 2000
        for (let offset = 0; offset < sessions.length && rows.length <= cap; offset += 8) {
          const batch = await Promise.all(
            sessions
              .slice(offset, offset + 8)
              .map((session) => this.deps.training.getSessionTraining(identity, session.id)),
          )
          for (const record of batch) {
            if (
              !record?.record.id ||
              !(record.record.exercises.length || record.record.privateNote)
            )
              continue
            selected.push(record)
            const base = {
              sessionId: record.session.id,
              studentId: record.session.studentId,
              studentName: record.session.studentName,
              sessionStartsAt: instant(record.session.startsAt),
              sessionEndsAt: instant(record.session.endsAt),
              sessionStatus: record.session.status,
              location: record.session.location,
              recordId: record.record.id,
              recordUpdatedAt: instant(record.record.updatedAt),
              ...(input.includePrivateNotes ? { privateNote: record.record.privateNote } : {}),
            }
            if (!record.record.exercises.some((exercise) => exercise.sets.length))
              pushRow({ ...base, ...emptySetFields() })
            for (const exercise of record.record.exercises) {
              const exerciseFields = {
                exerciseId: exercise.id,
                definitionId: exercise.definitionId,
                exerciseName: exercise.definitionName,
                recordingType: exercise.recording?.type ?? null,
              }
              exercise.sets.forEach((set, index) =>
                pushRow({
                  ...base,
                  ...exerciseFields,
                  setId: set.id,
                  setNumber: index + 1,
                  plannedWeight: set.plannedWeight,
                  plannedReps: set.plannedReps,
                  actualReps: set.actualReps,
                  rpe: set.rpe,
                  result: set.result,
                  weightUnit: set.measurements?.weightUnit ?? set.unit,
                  weight: set.measurements?.weight ?? null,
                  duration: set.measurements?.duration ?? null,
                  durationUnit: set.measurements?.durationUnit ?? null,
                  distance: set.measurements?.distance ?? null,
                  distanceUnit: set.measurements?.distanceUnit ?? null,
                  rounds: set.measurements?.rounds ?? null,
                }),
              )
            }
          }
        }
        records = selected.map(({ session, record }) => ({
          sessionId: session.id,
          studentId: session.studentId,
          studentName: session.studentName,
          sessionStartsAt: iso(session.startsAt),
          sessionEndsAt: iso(session.endsAt),
          sessionStatus: session.status,
          location: session.location,
          recordId: record.id,
          recordUpdatedAt: iso(record.updatedAt),
          exercises: record.exercises.map((exercise) => ({
            exerciseId: exercise.id,
            definitionId: exercise.definitionId,
            exerciseName: exercise.definitionName,
            recordingType: exercise.recording?.type ?? null,
            sets: exercise.sets.map((set, index) => ({
              setId: set.id,
              setNumber: index + 1,
              plannedWeight: set.plannedWeight,
              plannedReps: set.plannedReps,
              actualReps: set.actualReps,
              rpe: set.rpe,
              result: set.result,
              weightUnit: set.measurements?.weightUnit ?? set.unit,
              weight: set.measurements?.weight ?? null,
              duration: set.measurements?.duration ?? null,
              durationUnit: set.measurements?.durationUnit ?? null,
              distance: set.measurements?.distance ?? null,
              distanceUnit: set.measurements?.distanceUnit ?? null,
              rounds: set.measurements?.rounds ?? null,
            })),
          })),
          ...(input.includePrivateNotes ? { privateNote: record.privateNote } : {}),
        }))
      } else {
        const selectedIds = [...new Set(selectedSessions.map((s) => s.studentId))]
        for (const studentId of selectedIds) {
          const directory = (await this.deps.training.getStudentPerformance(
            identity,
            studentId,
          )) as Array<Record<string, any>> | null
          if (!directory) continue
          for (const entry of directory) {
            if (input.definitionId && entry.definitionId !== input.definitionId) continue
            const series = Array.isArray(entry.series) ? entry.series : []
            for (const signal of series)
              for (const point of signal.points ?? []) {
                const date = iso(point.startsAt)
                if (!date || date < startsAt.toISOString() || date >= endsAt.toISOString()) continue
                pushRow({
                  studentId,
                  studentName: students.find((s) => s.id === studentId)?.name ?? '',
                  definitionId: entry.definitionId,
                  definitionName: entry.name,
                  metric: signal.metric,
                  unit: signal.unit ?? null,
                  direction: signal.direction,
                  sessionId: point.sessionId,
                  sessionStartsAt: instant(point.startsAt),
                  value: point.value,
                })
              }
            if (!series.length) {
              const trend = (await this.deps.training.getStudentTrend(
                identity,
                studentId,
                entry.definitionId,
                entry.metric,
              )) as {
                points?: Array<{
                  sessionId: string
                  startsAt: string
                  value: number
                  unit?: string
                }>
              } | null
              for (const point of trend?.points ?? []) {
                const date = iso(point.startsAt)
                if (!date || date < startsAt.toISOString() || date >= endsAt.toISOString()) continue
                pushRow({
                  studentId,
                  studentName: students.find((s) => s.id === studentId)?.name ?? '',
                  definitionId: entry.definitionId,
                  definitionName: entry.name,
                  metric: entry.metric,
                  unit: point.unit ?? entry.unit ?? null,
                  direction: 'higher',
                  sessionId: point.sessionId,
                  sessionStartsAt: instant(point.startsAt),
                  value: point.value,
                })
              }
            }
            if (rows.length > (input.format === 'pdf' ? 500 : 2000)) break
          }
          if (rows.length > (input.format === 'pdf' ? 500 : 2000)) break
        }
        rows.sort(
          (a, b) =>
            String(a.sessionStartsAt).localeCompare(String(b.sessionStartsAt)) ||
            String(a.sessionId).localeCompare(String(b.sessionId)) ||
            String(a.studentId).localeCompare(String(b.studentId)) ||
            String(a.definitionId).localeCompare(String(b.definitionId)) ||
            String(a.metric).localeCompare(String(b.metric)) ||
            String(a.unit).localeCompare(String(b.unit)),
        )
        records = rows
      }
    }
    limit(rows, input.format)
    if (!rows.length) throw new ExportError(404, 'export_empty')
    if (input.format === 'csv') rows = rows.map((row) => ({ ...row, timeZone }))
    return {
      type: input.type,
      format: input.format,
      start: input.start,
      end: input.end,
      timeZone,
      generatedAt: now,
      includePrivateNotes: input.includePrivateNotes,
      filters: {
        studentId: input.studentId ?? null,
        definitionId: input.definitionId ?? null,
        venueId: input.venueId ?? null,
        includeBlocks: input.includeBlocks ?? false,
        income: input.income ?? true,
        expense: input.expense ?? true,
        reference: input.reference ?? true,
      },
      columns,
      rows,
      records,
    }
  }
}

function emptySetFields(): ExportRow {
  return {
    exerciseId: null,
    definitionId: null,
    exerciseName: null,
    recordingType: null,
    setId: null,
    setNumber: null,
    plannedWeight: null,
    plannedReps: null,
    actualReps: null,
    rpe: null,
    result: null,
    weightUnit: null,
    weight: null,
    duration: null,
    durationUnit: null,
    distance: null,
    distanceUnit: null,
    rounds: null,
  }
}
