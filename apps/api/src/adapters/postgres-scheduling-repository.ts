import type { Pool, PoolClient } from 'pg'
import { randomUUID } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { LessonSummary } from '../students/student.js'
import {
  monthlyOccurrence,
  planSeriesReconciliation,
  rebaseSeriesAnchor,
} from '../scheduling/series-reconciliation.js'
import type {
  AvailabilityWindow,
  CalendarBlock,
  CourseSession,
  ScheduleSeries,
} from '../scheduling/scheduling.js'
import {
  SchedulingVersionConflictError,
  type ChangedSession,
  type NewBlock,
  type NewScheduleSeries,
  type NewSession,
  type SchedulingRepository,
  type SchedulingWorkspaceId,
} from '../scheduling/scheduling-repository.js'

export class PostgresSchedulingRepository implements SchedulingRepository {
  constructor(private readonly pool: Pool) {}
  async resolveWorkspace(identity: AuthenticatedIdentity): Promise<SchedulingWorkspaceId> {
    const row = await this.pool.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id = $1',
      [identity.userId],
    )
    if (!row.rows[0]) throw new Error('Workspace was not found.')
    return row.rows[0].id
  }
  async getTimeZone(workspaceId: string) {
    const row = await this.pool.query<{ time_zone: string }>(
      'select time_zone from app_private.workspace where id = $1',
      [workspaceId],
    )
    return row.rows[0]?.time_zone ?? 'Asia/Taipei'
  }
  async hasStudent(workspaceId: string, studentId: string) {
    return (
      ((
        await this.pool.query('select 1 from app_private.student where workspace_id=$1 and id=$2', [
          workspaceId,
          studentId,
        ])
      ).rowCount ?? 0) > 0
    )
  }
  async lessonSummary(workspaceId: string, studentId: string): Promise<LessonSummary | null> {
    const row = await this.pool.query<{
      purchased: number
      completed: number
      manual_used: number
    }>(
      `select coalesce((select sum(lesson_count)::int from app_private.lesson_purchase where workspace_id=$1 and student_id=$2 and source_kind='manual'),0) purchased, coalesce((select count(*)::int from app_private.course_session where workspace_id=$1 and student_id=$2 and status='completed'),0) completed, coalesce((select count(*)::int from app_private.session_lesson_source a join app_private.course_session s on s.workspace_id=a.workspace_id and s.id=a.session_id where a.workspace_id=$1 and a.student_id=$2 and a.kind in ('manual','legacy_unallocated') and s.status='completed'),0) manual_used`,
      [workspaceId, studentId],
    )
    const value = row.rows[0]
    return value
      ? {
          purchased: value.purchased,
          completed: value.completed,
          remaining: value.purchased - value.manual_used,
        }
      : null
  }
  async listSessions(workspaceId: string, start: Date, end: Date) {
    const rows = await this.pool.query(
      `select s.id,s.student_id,"student".name student_name,s.series_id,s.starts_at,s.ends_at,s.venue_id,s.customer_source,s.fee_rule_id,s.location,s.status,s.completed_at,s.version,s.is_legacy from app_private.course_session s join app_private.student "student" on "student".id=s.student_id and "student".workspace_id=s.workspace_id where s.workspace_id=$1 and not s.is_legacy and s.starts_at < $3 and s.ends_at > $2 order by s.starts_at,s.id`,
      [workspaceId, start, end],
    )
    return rows.rows.map(mapSession)
  }
  async getSession(workspaceId: string, sessionId: string) {
    const rows = await this.pool.query(
      `select s.id,s.student_id,"student".name student_name,s.series_id,s.starts_at,s.ends_at,s.venue_id,s.customer_source,s.fee_rule_id,s.location,s.status,s.completed_at,s.version,s.is_legacy from app_private.course_session s join app_private.student "student" on "student".id=s.student_id and "student".workspace_id=s.workspace_id where s.workspace_id=$1 and s.id=$2`,
      [workspaceId, sessionId],
    )
    return rows.rows[0] ? mapSession(rows.rows[0]) : null
  }
  async createSession(workspaceId: string, input: NewSession) {
    const row = await this.pool.query(
      `insert into app_private.course_session (id,workspace_id,student_id,series_id,starts_at,ends_at,location,status,is_legacy,version,created_at,updated_at,venue_id,customer_source) values ($1,$2,$3,$4,$5,$6,$7,'scheduled',false,1,$8,$8,$9,$10) returning id,student_id,(select name from app_private.student where workspace_id=$2 and id=$3) student_name,series_id,starts_at,ends_at,venue_id,customer_source,fee_rule_id,location,status,completed_at,version,is_legacy`,
      [
        input.id,
        workspaceId,
        input.studentId,
        input.seriesId ?? null,
        input.startsAt,
        input.endsAt,
        input.location,
        input.now,
        input.venueId ?? null,
        input.customerSource ?? null,
      ],
    )
    return mapSession(row.rows[0])
  }
  async updateSession(workspaceId: string, id: string, input: ChangedSession) {
    const row = await this.pool.query(
      `update app_private.course_session set starts_at=$4,ends_at=$5,location=$6,version=version+1,updated_at=$7,student_id=coalesce($8::uuid,student_id),venue_id=case when $9 then $10::uuid else venue_id end,customer_source=case when $9 then $11 else customer_source end where workspace_id=$1 and id=$2 and version=$3 and status='scheduled' and not is_legacy returning id,student_id,(select name from app_private.student where workspace_id=$1 and id=student_id) student_name,series_id,starts_at,ends_at,venue_id,customer_source,fee_rule_id,location,status,completed_at,version,is_legacy`,
      [
        workspaceId,
        id,
        input.expectedVersion,
        input.startsAt,
        input.endsAt,
        input.location,
        input.now,
        input.studentId ?? null,
        input.venueId !== undefined,
        input.venueId ?? null,
        input.customerSource ?? null,
      ],
    )
    if (row.rows[0]) return mapSession(row.rows[0])
    const current = await this.getSession(workspaceId, id)
    if (current) throw new SchedulingVersionConflictError(current)
    return null
  }
  async transitionSession(
    workspaceId: string,
    id: string,
    action: 'complete' | 'reopen' | 'cancel',
    version: number,
    now: Date,
  ) {
    const next =
      action === 'complete' ? 'completed' : action === 'reopen' ? 'scheduled' : 'cancelled'
    const completed = action === 'complete' ? now : null
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      const candidate = await client.query<{ student_id: string }>(
        'select student_id from app_private.course_session where workspace_id=$1 and id=$2',
        [workspaceId, id],
      )
      if (!candidate.rows[0]) {
        await client.query('rollback')
        return null
      }
      await client.query(
        'select id from app_private.student where workspace_id=$1 and id=$2 for update',
        [workspaceId, candidate.rows[0].student_id],
      )
      const locked = await client.query<{
        student_id: string
        version: number
        status: string
        venue_id: string | null
        ends_at: Date | null
        is_legacy: boolean
      }>(
        'select student_id,version,status,venue_id,ends_at,is_legacy from app_private.course_session where workspace_id=$1 and id=$2 for update',
        [workspaceId, id],
      )
      const current = locked.rows[0]
      if (
        !current ||
        current.student_id !== candidate.rows[0].student_id ||
        current.version !== version ||
        current.is_legacy ||
        (action === 'reopen' ? current.status !== 'completed' : current.status !== 'scheduled')
      ) {
        await client.query('rollback')
        const latest = await this.getSession(workspaceId, id)
        if (latest) throw new SchedulingVersionConflictError(latest)
        return null
      }
      if (action === 'reopen') await removeSessionLessonSource(client, workspaceId, id)
      if (action === 'complete') {
        const localDate = await client.query<{ day: string }>(
          'select ($2::timestamptz at time zone time_zone)::date::text day from app_private.workspace where id=$1',
          [workspaceId, current.ends_at],
        )
        const chosen = await client.query<{ id: string }>(
          `select p.id from app_private.lesson_purchase p
           where p.workspace_id=$1 and p.student_id=$2 and p.source_kind='manual'
             and (p.entitlement_venue_id is null or p.entitlement_venue_id=$3)
             and (p.purchased_at at time zone (select time_zone from app_private.workspace where id=$1))::date <= $4::date
             and (select count(*) from app_private.session_lesson_source a
                  where a.workspace_id=$1 and a.kind='manual' and a.purchase_id=p.id) < p.lesson_count
           order by (p.entitlement_venue_id is not null) desc,p.purchased_at,p.id limit 1`,
          [workspaceId, current.student_id, current.venue_id, localDate.rows[0]?.day],
        )
        if (chosen.rows[0]) {
          await client.query(
            "insert into app_private.session_lesson_source(workspace_id,session_id,student_id,kind,purchase_id,decided_at) values($1,$2,$3,'manual',$4,$5)",
            [workspaceId, id, current.student_id, chosen.rows[0].id, now],
          )
        } else {
          const price = await client.query<{
            single_lesson_amount_minor: string | null
            single_lesson_currency: string | null
          }>(
            'select single_lesson_amount_minor,single_lesson_currency from app_private.student where workspace_id=$1 and id=$2',
            [workspaceId, current.student_id],
          )
          const value = price.rows[0]
          if (value && value.single_lesson_amount_minor !== null && value.single_lesson_currency) {
            const purchaseId = randomUUID()
            await client.query(
              `insert into app_private.lesson_purchase
               (id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency,private_note,created_at,updated_at,collection_mode,entitlement_venue_id,source_kind,source_session_id)
               values($1,$2,$3,$4,1,$5,$6,'',$7,$7,'coach',null,'generated_single',$8)`,
              [
                purchaseId,
                workspaceId,
                current.student_id,
                current.ends_at,
                value.single_lesson_amount_minor,
                value.single_lesson_currency,
                now,
                id,
              ],
            )
            await client.query(
              "insert into app_private.session_lesson_source(workspace_id,session_id,student_id,kind,purchase_id,decided_at) values($1,$2,$3,'generated_single',$4,$5)",
              [workspaceId, id, current.student_id, purchaseId, now],
            )
          } else {
            await client.query(
              "insert into app_private.session_lesson_source(workspace_id,session_id,student_id,kind,decided_at) values($1,$2,$3,'pending',$4)",
              [workspaceId, id, current.student_id, now],
            )
          }
        }
      }
      const row = await client.query(
        `update app_private.course_session set status=$4,completed_at=$5,version=version+1,updated_at=$6 where workspace_id=$1 and id=$2 and version=$3 returning id,student_id,(select name from app_private.student where workspace_id=$1 and id=student_id) student_name,series_id,starts_at,ends_at,venue_id,customer_source,fee_rule_id,location,status,completed_at,version,is_legacy`,
        [workspaceId, id, version, next, completed, now],
      )
      await client.query('commit')
      return mapSession(row.rows[0])
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async deleteSession(workspaceId: string, id: string, version: number) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      const candidate = await client.query<{ student_id: string }>(
        'select student_id from app_private.course_session where workspace_id=$1 and id=$2',
        [workspaceId, id],
      )
      if (!candidate.rows[0]) {
        await client.query('rollback')
        return false
      }
      await client.query(
        'select id from app_private.student where workspace_id=$1 and id=$2 for update',
        [workspaceId, candidate.rows[0].student_id],
      )
      const locked = await client.query<{
        student_id: string
        status: string
        version: number
        is_legacy: boolean
        series_id: string | null
      }>(
        'select student_id,status,version,is_legacy,series_id from app_private.course_session where workspace_id=$1 and id=$2 for update',
        [workspaceId, id],
      )
      const current = locked.rows[0]
      if (
        !current ||
        current.student_id !== candidate.rows[0].student_id ||
        current.version !== version ||
        current.is_legacy ||
        !['scheduled', 'completed'].includes(current.status) ||
        (current.status !== 'completed' && current.series_id !== null)
      ) {
        await client.query('rollback')
        const latest = await this.getSession(workspaceId, id)
        if (latest) throw new SchedulingVersionConflictError(latest)
        return false
      }
      if (current.status === 'completed') await removeSessionLessonSource(client, workspaceId, id)
      await client.query('delete from app_private.course_session where workspace_id=$1 and id=$2', [
        workspaceId,
        id,
      ])
      await client.query('commit')
      return true
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async listSeries(workspaceId: string, studentId: string) {
    const rows = await this.pool.query(
      `select id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,
        interval_weeks,auto_schedule_horizon,venue_id,customer_source,location,active,version from app_private.schedule_series
       where workspace_id=$1 and student_id=$2 order by anchor_starts_at,id`,
      [workspaceId, studentId],
    )
    return rows.rows.map(mapSeries)
  }
  async createSeriesAndAnchor(workspaceId: string, series: NewScheduleSeries, anchor: NewSession) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const seriesRow = await client.query(
        `insert into app_private.schedule_series
          (id,workspace_id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,interval_weeks,auto_schedule_horizon,location,active,version,created_at,updated_at,venue_id,customer_source)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,1,$11,$11,$12,$13)
         returning id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,interval_weeks,auto_schedule_horizon,venue_id,customer_source,location,active,version`,
        [
          series.id,
          workspaceId,
          series.studentId,
          series.anchorStartsAt,
          series.localWeekday,
          series.localStartTime,
          series.durationMinutes,
          series.intervalWeeks,
          series.autoScheduleHorizon,
          series.location,
          series.now,
          series.venueId ?? null,
          series.customerSource ?? null,
        ],
      )
      const anchorRow = await client.query(
        `insert into app_private.course_session
          (id,workspace_id,student_id,series_id,starts_at,ends_at,location,status,is_legacy,version,created_at,updated_at,venue_id,customer_source)
         values ($1,$2,$3,$4,$5,$6,$7,'scheduled',false,1,$8,$8,$9,$10)
         returning id,student_id,(select name from app_private.student where workspace_id=$2 and id=$3) student_name,series_id,starts_at,ends_at,venue_id,customer_source,fee_rule_id,location,status,completed_at,version,is_legacy`,
        [
          anchor.id,
          workspaceId,
          anchor.studentId,
          series.id,
          anchor.startsAt,
          anchor.endsAt,
          anchor.location,
          anchor.now,
          anchor.venueId ?? null,
          anchor.customerSource ?? null,
        ],
      )
      await client.query('commit')
      return { series: mapSeries(seriesRow.rows[0]), anchor: mapSession(anchorRow.rows[0]) }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async deleteSeries(workspaceId: string, seriesId: string, expectedVersion: number) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const current = await client.query(
        `select id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,
          interval_weeks,auto_schedule_horizon,venue_id,customer_source,location,active,version
         from app_private.schedule_series where workspace_id=$1 and id=$2 for update`,
        [workspaceId, seriesId],
      )
      if (!current.rows[0]) {
        await client.query('rollback')
        return null
      }
      const existing = mapSeries(current.rows[0])
      if (existing.version !== expectedVersion) throw new SchedulingVersionConflictError(existing)
      await client.query(
        'delete from app_private.schedule_series where workspace_id=$1 and id=$2',
        [workspaceId, seriesId],
      )
      await client.query('commit')
      return { studentId: existing.studentId }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async updateSeries(
    workspaceId: string,
    seriesId: string,
    input: Omit<NewScheduleSeries, 'id' | 'studentId' | 'now'> & {
      active: boolean
      effectiveFromSessionId?: string
      expectedVersion: number
      now: Date
    },
  ) {
    const timeZone = await this.getTimeZone(workspaceId)
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const current = await client.query(
        `select id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,
          interval_weeks,auto_schedule_horizon,venue_id,customer_source,location,active,version
         from app_private.schedule_series where workspace_id=$1 and id=$2 for update`,
        [workspaceId, seriesId],
      )
      if (!current.rows[0]) return null
      const existing = mapSeries(current.rows[0])
      if (existing.version !== input.expectedVersion)
        throw new SchedulingVersionConflictError(existing)
      const pivot = await client.query(
        `select starts_at from app_private.course_session
         where workspace_id=$1 and series_id=$2 and status='scheduled' and not is_legacy
           and starts_at > $3 ${input.effectiveFromSessionId ? 'and id=$4' : ''}
         order by starts_at,id limit 1`,
        input.effectiveFromSessionId
          ? [workspaceId, seriesId, input.now, input.effectiveFromSessionId]
          : [workspaceId, seriesId, input.now],
      )
      if (input.effectiveFromSessionId && !pivot.rows[0]) return null
      const effectiveAnchor = pivot.rows[0]
        ? rebaseSeriesAnchor(
            input.anchorStartsAt,
            existing.anchorStartsAt,
            new Date(pivot.rows[0].starts_at),
            timeZone,
          )
        : input.anchorStartsAt
      const updated = await client.query(
        `update app_private.schedule_series set local_weekday=$4,local_start_time=$5,
          duration_minutes=$6,interval_weeks=$7,auto_schedule_horizon=$8,location=$9,active=$10,
          version=version+1,updated_at=$11,anchor_starts_at=$12,venue_id=case when $13 then $14::uuid else venue_id end,customer_source=case when $13 then $15 else customer_source end where workspace_id=$1 and id=$2 and version=$3
         returning id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,
          interval_weeks,auto_schedule_horizon,venue_id,customer_source,location,active,version`,
        [
          workspaceId,
          seriesId,
          input.expectedVersion,
          input.localWeekday,
          input.localStartTime,
          input.durationMinutes,
          input.intervalWeeks,
          input.autoScheduleHorizon,
          input.location,
          input.active,
          input.now,
          effectiveAnchor,
          input.venueId !== undefined,
          input.venueId ?? null,
          input.customerSource ?? null,
        ],
      )
      if (pivot.rows[0]) {
        const originalStart = new Date(pivot.rows[0].starts_at)
        const affected = await client.query(
          `select id,starts_at from app_private.course_session where workspace_id=$1 and series_id=$2
            and status='scheduled' and not is_legacy and starts_at >= $3 order by starts_at,id for update`,
          [workspaceId, seriesId, originalStart],
        )
        for (const [index, occurrence] of affected.rows.entries()) {
          const offsetWeeks = Math.round(
            (new Date(occurrence.starts_at).getTime() - originalStart.getTime()) / 604_800_000,
          )
          const startsAt =
            input.intervalWeeks === 0
              ? monthlyOccurrence(effectiveAnchor, index, timeZone)
              : new Date(effectiveAnchor)
          if (input.intervalWeeks !== 0)
            startsAt.setUTCDate(startsAt.getUTCDate() + offsetWeeks * 7)
          const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000)
          await client.query(
            `update app_private.course_session set starts_at=$4,ends_at=$5,location=$6,
              version=version+1,updated_at=$7,venue_id=case when $8 then $9::uuid else venue_id end,customer_source=case when $8 then $10 else customer_source end where workspace_id=$1 and id=$2 and series_id=$3`,
            [
              workspaceId,
              occurrence.id,
              seriesId,
              startsAt,
              endsAt,
              input.location,
              input.now,
              input.venueId !== undefined,
              input.venueId ?? null,
              input.customerSource ?? null,
            ],
          )
        }
      }
      await client.query('commit')
      return mapSeries(updated.rows[0])
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async reconcileSeries(workspaceId: string, studentId: string, now: Date) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [
        `schedule-series:${workspaceId}:${studentId}`,
      ])
      const [seriesRows, sessionRows] = await Promise.all([
        client.query(
          `select id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,
            interval_weeks,auto_schedule_horizon,venue_id,customer_source,location,active,version from app_private.schedule_series
           where workspace_id=$1 and student_id=$2 and active order by anchor_starts_at,id`,
          [workspaceId, studentId],
        ),
        client.query(
          `select s.id,s.student_id,"student".name student_name,s.series_id,s.starts_at,s.ends_at,s.venue_id,s.customer_source,s.fee_rule_id,s.location,s.status,s.completed_at,s.version,s.is_legacy
           from app_private.course_session s join app_private.student "student" on "student".id=s.student_id and "student".workspace_id=s.workspace_id
           where s.workspace_id=$1 and s.student_id=$2 and not s.is_legacy`,
          [workspaceId, studentId],
        ),
      ])
      const timeZone = await this.getTimeZone(workspaceId)
      const sessions = sessionRows.rows.map(mapSession)
      const generated: CourseSession[] = []
      for (const seriesRow of seriesRows.rows) {
        const series = mapSeries(seriesRow)
        const starts = planSeriesReconciliation({
          series,
          sessions,
          now,
          timeZone,
        })
        for (const startsAt of starts) {
          const endsAt = new Date(startsAt.getTime() + series.durationMinutes * 60_000)
          const id = randomUUID()
          const row = await client.query(
            `insert into app_private.course_session
              (id,workspace_id,student_id,series_id,starts_at,ends_at,location,status,is_legacy,version,created_at,updated_at,venue_id,customer_source)
             values ($1,$2,$3,$4,$5,$6,$7,'scheduled',false,1,$8,$8,$9,$10)
             returning id,student_id,(select name from app_private.student where workspace_id=$2 and id=$3) student_name,series_id,starts_at,ends_at,venue_id,customer_source,fee_rule_id,location,status,completed_at,version,is_legacy`,
            [
              id,
              workspaceId,
              studentId,
              series.id,
              startsAt,
              endsAt,
              series.location,
              now,
              series.venueId ?? null,
              series.customerSource ?? null,
            ],
          )
          const created = mapSession(row.rows[0])
          generated.push(created)
          sessions.push(created)
        }
      }
      await client.query('commit')
      return generated
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async listBlocks(workspaceId: string, start: Date, end: Date) {
    const rows = await this.pool.query(
      `select id,recurrence_id,starts_at,ends_at,note,version from app_private.calendar_block where workspace_id=$1 and starts_at<$3 and ends_at>$2 order by starts_at,id`,
      [workspaceId, start, end],
    )
    return rows.rows.map(mapBlock)
  }
  async createBlocks(workspaceId: string, blocks: NewBlock[]) {
    if (!blocks.length) return []
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const result: CalendarBlock[] = []
      for (const block of blocks) {
        const row = await client.query(
          `insert into app_private.calendar_block (id,workspace_id,recurrence_id,starts_at,ends_at,note,version,created_at,updated_at) values($1,$2,$3,$4,$5,$6,1,$7,$7) returning id,recurrence_id,starts_at,ends_at,note,version`,
          [
            block.id,
            workspaceId,
            block.recurrenceId,
            block.startsAt,
            block.endsAt,
            block.note,
            block.now,
          ],
        )
        result.push(mapBlock(row.rows[0]))
      }
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  async updateBlock(
    workspaceId: string,
    id: string,
    input: {
      startsAt: Date
      endsAt: Date
      note: string
      version: number
      scope: 'single' | 'future' | 'all'
      now: Date
    },
  ) {
    const original = (
      await this.pool.query(
        `select id,recurrence_id,starts_at,ends_at,note,version from app_private.calendar_block where workspace_id=$1 and id=$2`,
        [workspaceId, id],
      )
    ).rows[0]
    if (!original) return null
    if (original.version !== input.version)
      throw new SchedulingVersionConflictError(mapBlock(original))
    if (input.scope === 'single' || !original.recurrence_id) {
      const rows = await this.pool.query(
        `update app_private.calendar_block set starts_at=$3,ends_at=$4,note=$5,version=version+1,updated_at=$6 where workspace_id=$1 and id=$2 returning id,recurrence_id,starts_at,ends_at,note,version`,
        [workspaceId, id, input.startsAt, input.endsAt, input.note, input.now],
      )
      return rows.rows.map(mapBlock)
    }
    const shiftMilliseconds = input.startsAt.getTime() - original.starts_at.getTime()
    const durationMilliseconds = input.endsAt.getTime() - input.startsAt.getTime()
    const futureOnly = input.scope === 'future'
    const rows = await this.pool.query(
      `update app_private.calendar_block
       set starts_at=starts_at + ($${futureOnly ? 4 : 3}::double precision * interval '1 millisecond'),
           ends_at=starts_at + ($${futureOnly ? 4 : 3}::double precision * interval '1 millisecond') + ($${futureOnly ? 5 : 4}::double precision * interval '1 millisecond'),
           note=$${futureOnly ? 6 : 5},version=version+1,updated_at=$${futureOnly ? 7 : 6}
       where workspace_id=$1 and recurrence_id=$2${futureOnly ? ' and starts_at >= $3' : ''}
       returning id,recurrence_id,starts_at,ends_at,note,version`,
      futureOnly
        ? [
            workspaceId,
            original.recurrence_id,
            original.starts_at,
            shiftMilliseconds,
            durationMilliseconds,
            input.note,
            input.now,
          ]
        : [
            workspaceId,
            original.recurrence_id,
            shiftMilliseconds,
            durationMilliseconds,
            input.note,
            input.now,
          ],
    )
    return rows.rows.map(mapBlock)
  }
  async deleteBlock(
    workspaceId: string,
    id: string,
    input: { version: number; scope: 'single' | 'future' | 'all' },
  ) {
    const original = (
      await this.pool.query(
        'select id,recurrence_id,starts_at,ends_at,note,version from app_private.calendar_block where workspace_id=$1 and id=$2',
        [workspaceId, id],
      )
    ).rows[0]
    if (!original) return null
    if (original.version !== input.version)
      throw new SchedulingVersionConflictError(mapBlock(original))
    const result =
      input.scope === 'single' || !original.recurrence_id
        ? await this.pool.query(
            'delete from app_private.calendar_block where workspace_id=$1 and id=$2',
            [workspaceId, id],
          )
        : input.scope === 'future'
          ? await this.pool.query(
              'delete from app_private.calendar_block where workspace_id=$1 and recurrence_id=$2 and starts_at >= $3',
              [workspaceId, original.recurrence_id, original.starts_at],
            )
          : await this.pool.query(
              'delete from app_private.calendar_block where workspace_id=$1 and recurrence_id=$2',
              [workspaceId, original.recurrence_id],
            )
    return (result.rowCount ?? 0) > 0
  }
  async listAvailability(workspaceId: string) {
    const rows = await this.pool.query(
      `select weekday,max(version)::integer version,coalesce(jsonb_agg(jsonb_build_object('startTime',to_char(start_time,'HH24:MI'),'endTime',to_char(end_time,'HH24:MI')) order by start_time) filter (where active),'[]'::jsonb) windows from app_private.availability_rule where workspace_id=$1 group by weekday`,
      [workspaceId],
    )
    return rows.rows.map(
      (row: { weekday: number; windows: AvailabilityWindow[]; version: number }) => row,
    )
  }
  async getAvailabilityOverride(workspaceId: string, date: string) {
    const rows = await this.pool.query(
      `select windows,version from app_private.availability_override where workspace_id=$1 and local_date=$2`,
      [workspaceId, date],
    )
    return rows.rows[0] ?? null
  }
  async replaceAvailability(
    workspaceId: string,
    kind: 'rule' | 'override',
    target: string | number,
    windows: AvailabilityWindow[],
    version: number,
    now: Date,
  ) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      if (kind === 'rule') {
        const weekday = Number(target)
        if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)
          throw new Error('Weekday must be between 1 and 7.')
        const current = await client.query<{
          version: number
          start_time: string
          end_time: string
          active: boolean
        }>(
          'select version,start_time,end_time,active from app_private.availability_rule where workspace_id=$1 and weekday=$2 order by start_time',
          [workspaceId, weekday],
        )
        const currentVersion = Math.max(...current.rows.map((row) => row.version), 1)
        if (current.rows.length && currentVersion !== version)
          throw new SchedulingVersionConflictError({
            kind: 'rule',
            target: weekday,
            version: currentVersion,
            windows: current.rows
              .filter((row) => row.active)
              .map((row) => ({
                startTime: String(row.start_time).slice(0, 5),
                endTime: String(row.end_time).slice(0, 5),
              })),
          })
        await client.query(
          'delete from app_private.availability_rule where workspace_id=$1 and weekday=$2',
          [workspaceId, weekday],
        )
        for (const window of windows)
          await client.query(
            'insert into app_private.availability_rule (id,workspace_id,weekday,start_time,end_time,active,version,created_at,updated_at) values($1,$2,$3,$4,$5,true,$6,$7,$7)',
            [
              randomUUID(),
              workspaceId,
              weekday,
              window.startTime,
              window.endTime,
              currentVersion + 1,
              now,
            ],
          )
        if (!windows.length)
          await client.query(
            'insert into app_private.availability_rule (id,workspace_id,weekday,start_time,end_time,active,version,created_at,updated_at) values($1,$2,$3,$4,$5,false,$6,$7,$7)',
            [randomUUID(), workspaceId, weekday, '00:00', '00:01', currentVersion + 1, now],
          )
        await client.query('commit')
        return { kind, target: weekday, windows, version: currentVersion + 1 }
      } else {
        const current = await client.query<{ version: number; windows: AvailabilityWindow[] }>(
          'select version,windows from app_private.availability_override where workspace_id=$1 and local_date=$2',
          [workspaceId, target],
        )
        if (current.rows[0] && current.rows[0].version !== version)
          throw new SchedulingVersionConflictError({
            kind: 'override',
            target,
            windows: current.rows[0].windows,
            version: current.rows[0].version,
          })
        const nextVersion = (current.rows[0]?.version ?? 0) + 1
        await client.query(
          `insert into app_private.availability_override (id,workspace_id,local_date,windows,version,created_at,updated_at)
           values($1,$2,$3,$4,$5,$6,$6)
           on conflict (workspace_id,local_date) do update set windows=excluded.windows,version=app_private.availability_override.version+1,updated_at=excluded.updated_at`,
          [randomUUID(), workspaceId, target, JSON.stringify(windows), nextVersion, now],
        )
        await client.query('commit')
        return { kind, target, windows, version: nextVersion }
      }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
async function removeSessionLessonSource(
  client: PoolClient,
  workspaceId: string,
  sessionId: string,
) {
  const source = await client.query<{ kind: string; purchase_id: string | null }>(
    'select kind,purchase_id from app_private.session_lesson_source where workspace_id=$1 and session_id=$2 for update',
    [workspaceId, sessionId],
  )
  await client.query(
    'delete from app_private.session_lesson_source where workspace_id=$1 and session_id=$2',
    [workspaceId, sessionId],
  )
  if (source.rows[0]?.kind === 'generated_single' && source.rows[0].purchase_id) {
    await client.query(
      'delete from app_private.lesson_purchase where workspace_id=$1 and id=$2 and source_session_id=$3',
      [workspaceId, source.rows[0].purchase_id, sessionId],
    )
  }
}

function mapSession(row: any): CourseSession {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    seriesId: row.series_id,
    startsAt: row.starts_at?.toISOString() ?? null,
    endsAt: row.ends_at?.toISOString() ?? null,
    venueId: row.venue_id ?? null,
    customerSource: row.customer_source ?? null,
    location: row.location,
    status: row.status,
    completedAt: row.completed_at?.toISOString() ?? null,
    version: row.version ?? null,
    isLegacy: row.is_legacy,
  }
}
function mapBlock(row: any): CalendarBlock {
  return {
    id: row.id,
    recurrenceId: row.recurrence_id,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    note: row.note,
    version: row.version,
  }
}
function mapSeries(row: any): ScheduleSeries {
  return {
    id: row.id,
    studentId: row.student_id,
    anchorStartsAt: row.anchor_starts_at.toISOString(),
    localWeekday: row.local_weekday,
    localStartTime: String(row.local_start_time).slice(0, 5),
    durationMinutes: row.duration_minutes,
    intervalWeeks: row.interval_weeks,
    autoScheduleHorizon: row.auto_schedule_horizon,
    venueId: row.venue_id ?? null,
    customerSource: row.customer_source ?? null,
    location: row.location,
    active: row.active,
    version: row.version,
  }
}
