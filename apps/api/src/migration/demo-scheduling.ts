import { createHash } from 'node:crypto'
import { z } from 'zod'

const instant = z.iso.datetime({ offset: true })
const windowSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})
const sourceSchema = z
  .object({
    sessions: z
      .array(
        z.object({
          id: z.string(),
          studentId: z.string(),
          seriesId: z.string().optional(),
          startsAt: instant,
          endsAt: instant,
          status: z.enum(['scheduled', 'completed', 'cancelled']),
          completedAt: instant.optional(),
          location: z.string(),
        }),
      )
      .default([]),
    series: z
      .array(
        z.object({
          id: z.string(),
          studentId: z.string(),
          weekday: z.number().int().min(0).max(6),
          localStartTime: z.string(),
          durationMinutes: z.number().int().positive(),
          intervalWeeks: z.number().int(),
          active: z.boolean(),
        }),
      )
      .default([]),
    availability: z
      .array(
        z.object({
          id: z.string(),
          weekday: z.number().int().min(0).max(6),
          startTime: z.string(),
          endTime: z.string(),
          active: z.boolean(),
        }),
      )
      .default([]),
    availabilityOverrides: z
      .array(z.object({ id: z.string(), date: z.string(), windows: z.array(windowSchema) }))
      .default([]),
    blocks: z
      .array(
        z.object({
          id: z.string(),
          recurrenceId: z.string().optional(),
          startsAt: instant,
          endsAt: instant,
          note: z.string(),
        }),
      )
      .default([]),
  })
  .passthrough()

export function previewDemoScheduling(raw: unknown) {
  const parsed = sourceSchema.safeParse(raw)
  if (!parsed.success)
    return {
      counts: emptyCounts(),
      legacy: { preservedByMigration: true },
      conflicts: [],
      rejected: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        reason: issue.message,
      })),
      checksums: {},
    }
  const source = parsed.data
  const rejected: Array<{ entity: string; id: string; reason: string }> = []
  const temporalSessions = source.sessions.filter((item) => {
    const valid = Date.parse(item.endsAt) > Date.parse(item.startsAt)
    if (!valid) rejected.push({ entity: 'session', id: item.id, reason: 'end_not_after_start' })
    return valid
  })
  const temporalBlocks = source.blocks.filter((item) => {
    const valid = Date.parse(item.endsAt) > Date.parse(item.startsAt)
    if (!valid) rejected.push({ entity: 'block', id: item.id, reason: 'end_not_after_start' })
    return valid
  })
  const conflicts: Array<{ leftId: string; rightId: string; kind: string }> = []
  for (let left = 0; left < temporalSessions.length; left++)
    for (let right = left + 1; right < temporalSessions.length; right++) {
      const a = temporalSessions[left]!,
        b = temporalSessions[right]!
      if (
        a.status !== 'cancelled' &&
        b.status !== 'cancelled' &&
        Date.parse(a.startsAt) < Date.parse(b.endsAt) &&
        Date.parse(a.endsAt) > Date.parse(b.startsAt)
      )
        conflicts.push({ leftId: a.id, rightId: b.id, kind: 'session_overlap' })
    }
  for (const session of temporalSessions)
    for (const block of temporalBlocks)
      if (
        session.status !== 'cancelled' &&
        Date.parse(session.startsAt) < Date.parse(block.endsAt) &&
        Date.parse(session.endsAt) > Date.parse(block.startsAt)
      )
        conflicts.push({ leftId: session.id, rightId: block.id, kind: 'calendar_block' })
  const entities = {
    sessions: temporalSessions,
    series: source.series,
    availability: source.availability,
    availabilityOverrides: source.availabilityOverrides,
    blocks: temporalBlocks,
  }
  return {
    counts: Object.fromEntries(Object.entries(entities).map(([key, value]) => [key, value.length])),
    status: Object.fromEntries(
      ['scheduled', 'completed', 'cancelled'].map((status) => [
        status,
        temporalSessions.filter((item) => item.status === status).length,
      ]),
    ),
    legacy: { preservedByMigration: true },
    conflicts: conflicts.sort((a, b) =>
      `${a.leftId}:${a.rightId}`.localeCompare(`${b.leftId}:${b.rightId}`),
    ),
    rejected,
    checksums: Object.fromEntries(
      Object.entries(entities).map(([key, value]) => [key, checksum(value)]),
    ),
  }
}

function checksum(value: unknown[]) {
  return createHash('sha256')
    .update(
      JSON.stringify([...value].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)))),
    )
    .digest('hex')
}
function emptyCounts() {
  return { sessions: 0, series: 0, availability: 0, availabilityOverrides: 0, blocks: 0 }
}
