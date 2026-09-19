import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient, QueryResult } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  linkStatus,
  PublicCapabilityError,
  type CapabilityLinkMetadata,
  type CapabilityPurpose,
  type PublicReschedule,
  type PublicTrainingResult,
  type PublicUsedReschedule,
} from '../public-access/public-access.js'
import type { PublicAccessRepository } from '../public-access/public-access-repository.js'

type Queryable = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>
}

type LinkRow = {
  id: string
  workspace_id: string
  session_id: string
  purpose: CapabilityPurpose
  expires_at: string | Date
  revoked_at: string | Date | null
  used_at: string | Date | null
  redeemed_starts_at: string | Date | null
  include_training_note: boolean
  resource_version: number
  version: number
  created_at: string | Date
}

export class PostgresPublicAccessRepository implements PublicAccessRepository {
  constructor(private readonly pool: Pool) {}

  async resolveWorkspace(identity: AuthenticatedIdentity) {
    const row = await this.pool.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [identity.userId],
    )
    if (!row.rows[0]) throw new Error('Workspace was not found.')
    return row.rows[0].id
  }

  async listLinks(workspaceId: string, sessionId: string, now: Date) {
    return this.scoped(workspaceId, async (client) => {
      const session = await client.query(
        'select 1 from app_private.course_session where workspace_id=$1 and id=$2',
        [workspaceId, sessionId],
      )
      if (!session.rowCount) return null
      const result = await client.query<LinkRow>(
        `select id,workspace_id,session_id,purpose,expires_at,revoked_at,used_at,
          redeemed_starts_at,include_training_note,resource_version,version,created_at
         from app_private.capability_link where workspace_id=$1 and session_id=$2
         order by created_at desc,id desc`,
        [workspaceId, sessionId],
      )
      const latest = new Map<CapabilityPurpose, LinkRow>()
      for (const row of result.rows) if (!latest.has(row.purpose)) latest.set(row.purpose, row)
      return [...latest.values()].map((row) => mapMetadata(row, now))
    })
  }

  async issue(
    workspaceId: string,
    sessionId: string,
    input: { purpose: CapabilityPurpose; includeTrainingNote: boolean; tokenHash: string },
    now: Date,
  ) {
    return this.scoped(workspaceId, async (client) => {
      const context = await this.lockIssueContext(client, workspaceId, sessionId, input.purpose)
      if (!context) return null
      const resourceVersion = eligibilityVersion(context, input.purpose, now)
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [
        `capability:${workspaceId}:${sessionId}:${input.purpose}`,
      ])
      const active = await client.query<LinkRow>(
        `select * from app_private.capability_link where workspace_id=$1 and session_id=$2
          and purpose=$3 and revoked_at is null and used_at is null and expires_at>$4
         order by created_at desc,id desc limit 1 for update`,
        [workspaceId, sessionId, input.purpose, now],
      )
      if (active.rows[0])
        throw new PublicCapabilityError('active_link_exists', 409, mapMetadata(active.rows[0], now))
      const row = await client.query<LinkRow>(
        `insert into app_private.capability_link
          (id,workspace_id,session_id,purpose,token_hash,expires_at,include_training_note,resource_version,created_at,updated_at)
         values($1,$2,$3,$4,decode($5,'hex'),$6,$7,$8,$9,$9)
         returning *`,
        [
          randomUUID(),
          workspaceId,
          sessionId,
          input.purpose,
          input.tokenHash,
          new Date(now.getTime() + 86_400_000),
          input.purpose === 'training_result' && input.includeTrainingNote,
          resourceVersion,
          now,
        ],
      )
      return mapMetadata(row.rows[0]!, now)
    })
  }

  async reissue(
    workspaceId: string,
    linkId: string,
    input: { version: number; includeTrainingNote: boolean; tokenHash: string },
    now: Date,
  ) {
    return this.scoped(workspaceId, async (client) => {
      const candidate = await client.query<LinkRow>(
        'select * from app_private.capability_link where workspace_id=$1 and id=$2',
        [workspaceId, linkId],
      )
      if (!candidate.rows[0]) return null
      const original = candidate.rows[0]
      const context = await this.lockIssueContext(
        client,
        workspaceId,
        original.session_id,
        original.purpose,
      )
      if (!context) return null
      const resourceVersion = eligibilityVersion(context, original.purpose, now)
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [
        `capability:${workspaceId}:${original.session_id}:${original.purpose}`,
      ])
      const locked = await client.query<LinkRow>(
        'select * from app_private.capability_link where workspace_id=$1 and id=$2 for update',
        [workspaceId, linkId],
      )
      if (!locked.rows[0]) return null
      if (Number(locked.rows[0].version) !== input.version)
        throw new PublicCapabilityError('version_conflict', 409, mapMetadata(locked.rows[0], now))
      await client.query(
        `update app_private.capability_link set revoked_at=coalesce(revoked_at,$4),
          version=case when revoked_at is null then version+1 else version end,
          updated_at=case when revoked_at is null then $4 else updated_at end
         where workspace_id=$1 and session_id=$2 and purpose=$3 and revoked_at is null`,
        [workspaceId, original.session_id, original.purpose, now],
      )
      const row = await client.query<LinkRow>(
        `insert into app_private.capability_link
          (id,workspace_id,session_id,purpose,token_hash,expires_at,include_training_note,resource_version,created_at,updated_at)
         values($1,$2,$3,$4,decode($5,'hex'),$6,$7,$8,$9,$9) returning *`,
        [
          randomUUID(),
          workspaceId,
          original.session_id,
          original.purpose,
          input.tokenHash,
          new Date(now.getTime() + 86_400_000),
          original.purpose === 'training_result' && input.includeTrainingNote,
          resourceVersion,
          now,
        ],
      )
      return mapMetadata(row.rows[0]!, now)
    })
  }

  async revoke(workspaceId: string, linkId: string, version: number, now: Date) {
    return this.scoped(workspaceId, async (client) => {
      const candidate = await client.query<LinkRow>(
        'select * from app_private.capability_link where workspace_id=$1 and id=$2',
        [workspaceId, linkId],
      )
      if (!candidate.rows[0]) return null
      await client.query(
        'select id from app_private.course_session where workspace_id=$1 and id=$2 for update',
        [workspaceId, candidate.rows[0].session_id],
      )
      const row = await client.query<LinkRow>(
        'select * from app_private.capability_link where workspace_id=$1 and id=$2 for update',
        [workspaceId, linkId],
      )
      if (!row.rows[0]) return null
      if (Number(row.rows[0].version) !== version)
        throw new PublicCapabilityError('version_conflict', 409, mapMetadata(row.rows[0], now))
      if (linkStatus(normalizeDates(row.rows[0]), now) !== 'active')
        return mapMetadata(row.rows[0], now)
      const updated = await client.query<LinkRow>(
        `update app_private.capability_link set revoked_at=$3,version=version+1,updated_at=$3
         where workspace_id=$1 and id=$2 returning *`,
        [workspaceId, linkId, now],
      )
      return mapMetadata(updated.rows[0]!, now)
    })
  }

  async readTraining(tokenHash: string, now: Date) {
    return this.tokenScoped(tokenHash, async (client, link) => {
      requirePurposeAndState(link, 'training_result', now)
      await setWorkspace(client, link.workspace_id)
      const context = await client.query(
        `select w.display_name coach_name,w.time_zone,s.starts_at,s.ends_at,s.status,
          st.name student_name,tr.id record_id,tr.version record_version,tr.private_note
         from app_private.course_session s
         join app_private.workspace w on w.id=s.workspace_id
         join app_private.student st on st.workspace_id=s.workspace_id and st.id=s.student_id
         join app_private.training_record tr on tr.workspace_id=s.workspace_id and tr.session_id=s.id
         where s.workspace_id=$1 and s.id=$2 and not s.is_legacy`,
        [link.workspace_id, link.session_id],
      )
      const row = context.rows[0]
      if (
        !row ||
        row.status !== 'completed' ||
        Number(row.record_version) !== link.resource_version
      )
        throw new PublicCapabilityError('revoked_link', 410)
      const exercises = await client.query(
        `select te.id,te.position,te.definition_name from app_private.training_exercise te
         where te.workspace_id=$1 and te.record_id=$2 order by te.position,te.id`,
        [link.workspace_id, row.record_id],
      )
      const sets = await client.query(
        `select ts.exercise_id,ts.position,ts.planned_weight,ts.actual_reps,ts.unit,ts.rpe,ts.result
         from app_private.training_set ts join app_private.training_exercise te
           on te.workspace_id=ts.workspace_id and te.id=ts.exercise_id
         where te.workspace_id=$1 and te.record_id=$2 order by te.position,ts.position,ts.id`,
        [link.workspace_id, row.record_id],
      )
      const startsAt = new Date(String(row.starts_at))
      const endsAt = new Date(String(row.ends_at))
      const result: PublicTrainingResult = {
        coachDisplayName: String(row.coach_name),
        studentDisplayName: String(row.student_name),
        session: {
          startsAt,
          endsAt,
          timeZone: String(row.time_zone),
          durationMinutes: Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
        },
        exercises: exercises.rows.map((exercise) => ({
          position: Number(exercise.position),
          definitionName: String(exercise.definition_name),
          sets: sets.rows
            .filter((set) => String(set.exercise_id) === String(exercise.id))
            .map((set) => ({
              position: Number(set.position),
              plannedWeight: set.planned_weight === null ? null : Number(set.planned_weight),
              actualReps: set.actual_reps === null ? null : Number(set.actual_reps),
              unit: set.unit as 'kg' | 'lb',
              rpe: set.rpe === null ? null : Number(set.rpe),
              result: set.result as 'completed' | 'incomplete' | null,
            })),
        })),
      }
      if (link.include_training_note) result.trainingNote = String(row.private_note)
      return result
    })
  }

  async readReschedule(tokenHash: string, now: Date) {
    return this.tokenScoped(tokenHash, async (client, link) => {
      if (link.purpose !== 'reschedule_session')
        throw new PublicCapabilityError('invalid_link', 404)
      await setWorkspace(client, link.workspace_id)
      if (linkStatus(normalizeDates(link), now) === 'used')
        throw new PublicCapabilityError('used_link', 410, await usedSummary(client, link))
      requirePurposeAndState(link, 'reschedule_session', now)
      return this.rescheduleProjection(client, link, now)
    })
  }

  async redeem(tokenHash: string, startsAt: Date, now: Date) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.redeemOnce(tokenHash, startsAt, now)
      } catch (error) {
        if (!isSerializationFailure(error) || attempt === 1) throw error
      }
    }
    throw new Error('Unreachable redemption retry state.')
  }

  private async redeemOnce(tokenHash: string, startsAt: Date, now: Date) {
    const client = await this.pool.connect()
    try {
      await client.query('begin isolation level serializable')
      await client.query(`select set_config('app.current_capability_hash',$1,true)`, [tokenHash])
      const candidate = await client.query<LinkRow>(
        `select * from app_private.capability_link where token_hash=decode($1,'hex')`,
        [tokenHash],
      )
      if (!candidate.rows[0]) throw new PublicCapabilityError('invalid_link', 404)
      const initial = candidate.rows[0]
      if (initial.purpose !== 'reschedule_session')
        throw new PublicCapabilityError('invalid_link', 404)
      await setWorkspace(client, initial.workspace_id)
      await client.query(
        'select id from app_private.course_session where workspace_id=$1 and id=$2 for update',
        [initial.workspace_id, initial.session_id],
      )
      const locked = await client.query<LinkRow>(
        `select * from app_private.capability_link where token_hash=decode($1,'hex') for update`,
        [tokenHash],
      )
      const link = locked.rows[0]
      if (!link) throw new PublicCapabilityError('invalid_link', 404)
      if (linkStatus(normalizeDates(link), now) === 'used')
        throw new PublicCapabilityError('used_link', 409, await usedSummary(client, link))
      requirePurposeAndState(link, 'reschedule_session', now)
      const projection = await this.rescheduleProjection(client, link, now)
      const selected = projection.slots.find(
        (slot) => slot.startsAt.getTime() === startsAt.getTime(),
      )
      if (!selected)
        throw new PublicCapabilityError('slot_unavailable', 409, { reschedule: projection })
      await client.query(
        `update app_private.capability_link set used_at=$2,redeemed_starts_at=$3,
          original_starts_at=$4,
          version=version+1,updated_at=$2 where token_hash=decode($1,'hex')`,
        [tokenHash, now, selected.startsAt, projection.originalSession.startsAt],
      )
      await client.query(
        `update app_private.course_session set starts_at=$3,ends_at=$4,version=version+1,updated_at=$5
         where workspace_id=$1 and id=$2`,
        [link.workspace_id, link.session_id, selected.startsAt, selected.endsAt, now],
      )
      const used: PublicUsedReschedule = {
        coachDisplayName: projection.coachDisplayName,
        timeZone: projection.timeZone,
        redeemedStartsAt: selected.startsAt,
      }
      await client.query('commit')
      return { reschedule: projection, used }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async consumeRateLimit(
    operation: 'projection' | 'redemption',
    keyHash: string,
    limit: number,
    now: Date,
  ) {
    const client = await this.pool.connect()
    const bucket = new Date(Math.floor(now.getTime() / 300_000) * 300_000)
    try {
      await client.query('begin')
      await client.query(`select set_config('app.current_rate_limit_key',$1,true)`, [keyHash])
      const result = await client.query<{ request_count: number }>(
        `insert into app_private.public_rate_limit_bucket
          (operation,key_hash,bucket_started_at,request_count,updated_at)
         values($1,decode($2,'hex'),$3,1,$4)
         on conflict(operation,key_hash,bucket_started_at) do update
           set request_count=app_private.public_rate_limit_bucket.request_count+1,updated_at=$4
         returning request_count`,
        [operation, keyHash, bucket, now],
      )
      await client.query(
        `delete from app_private.public_rate_limit_bucket
         where key_hash=decode($1,'hex') and updated_at <= $2::timestamptz - interval '24 hours'`,
        [keyHash, now],
      )
      await client.query('commit')
      const count = Number(result.rows[0]!.request_count)
      return {
        allowed: count <= limit,
        retryAfter: Math.max(1, Math.ceil((bucket.getTime() + 300_000 - now.getTime()) / 1000)),
      }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  private async lockIssueContext(
    client: PoolClient,
    workspaceId: string,
    sessionId: string,
    purpose: CapabilityPurpose,
  ) {
    const session = await client.query(
      `select s.id,s.starts_at,s.ends_at,s.status,s.version,s.is_legacy,
        tr.id record_id,tr.version record_version
       from app_private.course_session s
       left join app_private.training_record tr
         on tr.workspace_id=s.workspace_id and tr.session_id=s.id
       where s.workspace_id=$1 and s.id=$2 for update of s`,
      [workspaceId, sessionId],
    )
    const row = session.rows[0]
    if (row && purpose === 'training_result' && row.record_id)
      await client.query(
        'select id from app_private.training_record where workspace_id=$1 and id=$2 for update',
        [workspaceId, row.record_id],
      )
    return row
  }

  private async tokenScoped<T>(
    tokenHash: string,
    work: (client: PoolClient, link: LinkRow) => Promise<T>,
  ) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query(`select set_config('app.current_capability_hash',$1,true)`, [tokenHash])
      const result = await client.query<LinkRow>(
        `select * from app_private.capability_link where token_hash=decode($1,'hex')`,
        [tokenHash],
      )
      if (!result.rows[0]) throw new PublicCapabilityError('invalid_link', 404)
      const value = await work(client, result.rows[0])
      await client.query('commit')
      return value
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  private async rescheduleProjection(
    client: PoolClient,
    link: LinkRow,
    now: Date,
  ): Promise<PublicReschedule> {
    const context = await client.query(
      `select w.display_name coach_name,w.time_zone,s.starts_at,s.ends_at,s.status,s.version,
        st.name student_name
       from app_private.course_session s
       join app_private.workspace w on w.id=s.workspace_id
       join app_private.student st on st.workspace_id=s.workspace_id and st.id=s.student_id
       where s.workspace_id=$1 and s.id=$2 and not s.is_legacy`,
      [link.workspace_id, link.session_id],
    )
    const row = context.rows[0]
    if (!row) throw new PublicCapabilityError('invalid_link', 404)
    const originalStart = new Date(String(row.starts_at))
    const originalEnd = new Date(String(row.ends_at))
    if (row.status !== 'scheduled' || Number(row.version) !== Number(link.resource_version))
      throw new PublicCapabilityError('expired_link', 410)
    const timeZone = String(row.time_zone)
    return {
      coachDisplayName: String(row.coach_name),
      studentDisplayName: String(row.student_name),
      timeZone,
      expiresAt: new Date(link.expires_at),
      originalSession: {
        startsAt: originalStart,
        endsAt: originalEnd,
        durationMinutes: Math.round((originalEnd.getTime() - originalStart.getTime()) / 60_000),
      },
      slots: await availableSlots(
        client,
        link.workspace_id,
        link.session_id,
        originalStart,
        originalEnd,
        timeZone,
        now,
      ),
    }
  }

  private async scoped<T>(workspaceId: string, work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await setWorkspace(client, workspaceId)
      const value = await work(client)
      await client.query('commit')
      return value
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}

function isSerializationFailure(error: unknown): error is { code: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '40001')
}

function eligibilityVersion(row: Record<string, unknown>, purpose: CapabilityPurpose, now: Date) {
  if (row.is_legacy) throw new PublicCapabilityError('not_eligible', 400)
  if (purpose === 'training_result') {
    if (row.status !== 'completed' || !row.record_id)
      throw new PublicCapabilityError('not_eligible', 400)
    return Number(row.record_version)
  }
  if (row.status !== 'scheduled') throw new PublicCapabilityError('not_eligible', 400)
  return Number(row.version)
}

function requirePurposeAndState(link: LinkRow, purpose: CapabilityPurpose, now: Date) {
  if (link.purpose !== purpose) throw new PublicCapabilityError('invalid_link', 404)
  const status = linkStatus(normalizeDates(link), now)
  if (status === 'revoked') throw new PublicCapabilityError('revoked_link', 410)
  if (status === 'expired') throw new PublicCapabilityError('expired_link', 410)
  if (status === 'used') throw new PublicCapabilityError('used_link', 410)
}

function mapMetadata(row: LinkRow, now: Date): CapabilityLinkMetadata {
  const status = linkStatus(normalizeDates(row), now)
  return {
    id: String(row.id),
    purpose: row.purpose,
    status,
    expiresAt: new Date(row.expires_at),
    includeTrainingNote: Boolean(row.include_training_note),
    createdAt: new Date(row.created_at),
    version: Number(row.version),
    allowedActions: { canReissue: true, canRevoke: status === 'active' },
  }
}

function normalizeDates(row: LinkRow) {
  return {
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    usedAt: row.used_at ? new Date(row.used_at) : null,
  }
}

async function setWorkspace(client: Queryable, workspaceId: string) {
  await client.query(`select set_config('app.current_workspace_id',$1,true)`, [workspaceId])
}

async function usedSummary(client: Queryable, link: LinkRow): Promise<PublicUsedReschedule> {
  const row = await client.query<{ display_name: string; time_zone: string }>(
    'select display_name,time_zone from app_private.workspace where id=$1',
    [link.workspace_id],
  )
  return {
    coachDisplayName: String(row.rows[0]?.display_name ?? '教練'),
    timeZone: String(row.rows[0]?.time_zone ?? 'Asia/Taipei'),
    redeemedStartsAt: new Date(link.redeemed_starts_at!),
  }
}

async function availableSlots(
  client: Queryable,
  workspaceId: string,
  sessionId: string,
  originalStart: Date,
  originalEnd: Date,
  timeZone: string,
  now: Date,
) {
  const dates = rescheduleCandidateDates(originalStart, timeZone, now)
  const rangeStart = localToInstant(dates[0]!, '00:00', timeZone)
  const rangeEnd = localToInstant(addLocalDays(dates.at(-1)!, 1), '00:00', timeZone)
  const [rules, overrides, sessions, blocks] = await Promise.all([
    client.query(
      `select weekday,start_time,end_time from app_private.availability_rule
       where workspace_id=$1 and active order by weekday,start_time`,
      [workspaceId],
    ),
    client.query<{
      local_date: string | Date
      windows: Array<{ startTime: string; endTime: string }>
    }>(
      `select local_date,windows from app_private.availability_override
       where workspace_id=$1 and local_date between $2 and $3`,
      [workspaceId, dates[0], dates.at(-1)],
    ),
    client.query(
      `select id,starts_at,ends_at from app_private.course_session
       where workspace_id=$1 and id<>$2 and status<>'cancelled' and not is_legacy
         and starts_at<$4 and ends_at>$3`,
      [workspaceId, sessionId, rangeStart, rangeEnd],
    ),
    client.query(
      `select starts_at,ends_at from app_private.calendar_block
       where workspace_id=$1 and starts_at<$3 and ends_at>$2`,
      [workspaceId, rangeStart, rangeEnd],
    ),
  ])
  const baseline = new Map<number, Array<{ startTime: string; endTime: string }>>()
  for (const rule of rules.rows) {
    const weekday = Number(rule.weekday)
    const list = baseline.get(weekday) ?? []
    list.push({
      startTime: String(rule.start_time).slice(0, 5),
      endTime: String(rule.end_time).slice(0, 5),
    })
    baseline.set(weekday, list)
  }
  const overrideMap = new Map(
    overrides.rows.map((row) => [dateOnly(row.local_date), normalizeWindows(row.windows)]),
  )
  const busy = [...sessions.rows, ...blocks.rows].map((row) => ({
    startsAt: new Date(String(row.starts_at)),
    endsAt: new Date(String(row.ends_at)),
  }))
  const duration = originalEnd.getTime() - originalStart.getTime()
  const result: Array<{ startsAt: Date; endsAt: Date }> = []
  for (const date of dates) {
    const windows = overrideMap.get(date) ?? baseline.get(isoWeekday(date)) ?? []
    for (const window of windows) {
      for (
        let minute = clockMinutes(window.startTime);
        minute < clockMinutes(window.endTime);
        minute += 30
      ) {
        const time = minuteClock(minute)
        let startsAt: Date
        try {
          startsAt = localToInstant(date, time, timeZone)
        } catch {
          continue
        }
        const endsAt = new Date(startsAt.getTime() + duration)
        const localEnd = localParts(endsAt, timeZone)
        if (localEnd.date !== date || localEnd.time > window.endTime) continue
        if (startsAt <= now || startsAt.getTime() === originalStart.getTime()) continue
        if (busy.some((item) => startsAt < item.endsAt && endsAt > item.startsAt)) continue
        result.push({ startsAt, endsAt })
      }
    }
  }
  return result.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
}

function localToInstant(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const desired = Date.UTC(year!, month! - 1, day!, hour!, minute!)
  let guess = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localParts(new Date(guess), timeZone)
    const represented = Date.parse(`${actual.date}T${actual.time}:00.000Z`)
    guess -= represented - desired
  }
  const value = new Date(guess)
  const actual = localParts(value, timeZone)
  if (actual.date !== date || actual.time !== time) throw new Error('Nonexistent local time')
  return value
}

function localParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

function addLocalDays(date: string, count: number) {
  const value = new Date(`${date}T12:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + count)
  return value.toISOString().slice(0, 10)
}

export function rescheduleCandidateDates(originalStart: Date, timeZone: string, now: Date) {
  const originalDate = localParts(originalStart, timeZone).date
  const overdue = originalStart <= now
  const anchorDate = overdue ? localParts(now, timeZone).date : originalDate
  return Array.from({ length: 7 }, (_, index) =>
    addLocalDays(anchorDate, overdue ? index : index - 3),
  )
}

function isoWeekday(date: string) {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

function clockMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour! * 60 + minute!
}

function minuteClock(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function dateOnly(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function normalizeWindows(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const startTime = String(row.startTime ?? row.start_time ?? '').slice(0, 5)
    const endTime = String(row.endTime ?? row.end_time ?? '').slice(0, 5)
    return startTime && endTime ? [{ startTime, endTime }] : []
  })
}
