import { randomBytes } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { PlanAccessModule } from '../plan-access/plan-access.js'
import { PlanAccessError } from '../plan-access/plan-access.js'
import { zonedMidnight } from '../today/today.js'
import {
  addDateDays,
  localDate,
  reportDates,
  validateReportRange,
  coachFilename,
} from '../exports/report-common.js'
import { ExportError } from '../exports/export-module.js'
import {
  CalendarError,
  calendarFile,
  expiredCalendarFile,
  defaultSharing,
  eventUid,
  reconcileEvents,
  sharingSchema,
  tokenHash,
  type CalendarEvent,
  type CalendarState,
  type PublishedEvent,
  type Sharing,
} from './calendar.js'

const mutation = z
  .object({
    action: z.enum(['create', 'reset', 'update', 'disable']),
    version: z.number().int().nonnegative(),
    sharing: sharingSchema.optional(),
  })
  .strict()
const download = sharingSchema.extend(reportDates).strict()
const stateColumns = 'version, token_hash, revoked_at, include_blocks, show_names, show_location'
type StateRow = {
  version: number
  token_hash: string | null
  revoked_at: Date | null
  include_blocks: boolean
  show_names: boolean
  show_location: boolean
}
function state(row?: StateRow): CalendarState {
  return row
    ? {
        version: row.version,
        active: Boolean(row.token_hash && !row.revoked_at),
        ...(row.token_hash && row.revoked_at ? { expired: true } : {}),
        includeBlocks: row.include_blocks,
        showNames: row.show_names,
        showLocation: row.show_location,
      }
    : { ...defaultSharing, version: 0, active: false }
}
export class PostgresCalendarIntegration {
  constructor(
    private readonly pool: Pool,
    private readonly resolve: (identity: AuthenticatedIdentity) => Promise<string>,
    private readonly plans: PlanAccessModule,
    private readonly now = () => new Date(),
  ) {}
  private async transaction<T>(work: (c: PoolClient) => Promise<T>) {
    const c = await this.pool.connect()
    try {
      await c.query('begin')
      await c.query("set local statement_timeout = '25000ms'")
      const result = await work(c)
      await c.query('commit')
      return result
    } catch (e) {
      await c.query('rollback')
      throw e
    } finally {
      c.release()
    }
  }
  private async scope(c: PoolClient, id: string) {
    await c.query("select set_config('app.current_workspace_id',$1,true)", [id])
  }
  async get(identity: AuthenticatedIdentity) {
    const id = await this.resolve(identity)
    return this.transaction(async (c) => {
      await this.scope(c, id)
      return state(
        (
          await c.query<StateRow>(
            `select ${stateColumns} from app_private.calendar_subscription where workspace_id=$1`,
            [id],
          )
        ).rows[0],
      )
    })
  }
  async change(identity: AuthenticatedIdentity, raw: unknown) {
    const input = mutation.parse(raw)
    if (input.action !== 'disable' && (await this.plans.get(identity)).tier !== 'advanced')
      throw new PlanAccessError('plan_required')
    if (input.action !== 'disable' && !input.sharing)
      throw new CalendarError(409, 'sharing_required')
    const id = await this.resolve(identity)
    return this.transaction(async (c) => {
      await this.scope(c, id)
      const owner = (
        await c.query(
          'select deletion_requested_at from app_private.workspace where id=$1 for update',
          [id],
        )
      ).rows[0]
      if (!owner || (owner.deletion_requested_at && input.action !== 'disable'))
        throw new CalendarError(404, 'not_found')
      const current = state(
        (
          await c.query<StateRow>(
            `select ${stateColumns} from app_private.calendar_subscription where workspace_id=$1 for update`,
            [id],
          )
        ).rows[0],
      )
      if (current.version !== input.version) throw new CalendarError(409, 'version_conflict')
      if (
        (input.action === 'create' && current.active) ||
        (['update', 'reset'].includes(input.action) && !current.active)
      )
        throw new CalendarError(409, 'version_conflict')
      const sharing = input.sharing ?? current
      const token = ['create', 'reset'].includes(input.action)
        ? randomBytes(32).toString('base64url')
        : undefined
      if (token) {
        await c.query(
          `insert into app_private.calendar_subscription (workspace_id,token_hash,version,include_blocks,show_names,show_location) values ($1,$2,$3,$4,$5,$6)
          on conflict (workspace_id) do update set token_hash=excluded.token_hash,version=excluded.version,include_blocks=excluded.include_blocks,show_names=excluded.show_names,show_location=excluded.show_location,revoked_at=null,updated_at=now()`,
          [
            id,
            tokenHash(token),
            current.version + 1,
            sharing.includeBlocks,
            sharing.showNames,
            sharing.showLocation,
          ],
        )
        await c.query('delete from app_private.calendar_published_event where workspace_id=$1', [
          id,
        ])
      } else if (input.action === 'disable') {
        await c.query(
          'update app_private.calendar_subscription set token_hash=null,revoked_at=now(),version=version+1,updated_at=now() where workspace_id=$1',
          [id],
        )
        await c.query('delete from app_private.calendar_published_event where workspace_id=$1', [
          id,
        ])
      } else {
        await c.query(
          'update app_private.calendar_subscription set include_blocks=$2,show_names=$3,show_location=$4,version=version+1,updated_at=now() where workspace_id=$1',
          [id, sharing.includeBlocks, sharing.showNames, sharing.showLocation],
        )
      }
      const updated = state(
        (
          await c.query<StateRow>(
            `select ${stateColumns} from app_private.calendar_subscription where workspace_id=$1`,
            [id],
          )
        ).rows[0],
      )
      return { ...updated, ...(token ? { token } : {}) }
    })
  }
  private async events(
    c: PoolClient,
    id: string,
    start: string,
    afterEnd: string,
    zone: string,
    sharing: Sharing,
  ): Promise<CalendarEvent[]> {
    const from = zonedMidnight(start, zone),
      to = zonedMidnight(afterEnd, zone)
    const sessions = (
      await c.query(
        `select s.id,s.starts_at,s.ends_at,s.status,
      case when $4 then st.name else '' end student_name,case when $5 then s.location else '' end location
      from app_private.course_session s join app_private.student st on st.workspace_id=s.workspace_id and st.id=s.student_id
      where s.workspace_id=$1 and s.starts_at < $3 and s.ends_at > $2 order by s.starts_at,s.id limit 10001`,
        [id, from, to, sharing.showNames, sharing.showLocation],
      )
    ).rows
    const result: CalendarEvent[] = sessions.map((s) => ({
      uid: eventUid('session', s.id),
      startsAt: s.starts_at.toISOString(),
      endsAt: s.ends_at.toISOString(),
      summary:
        s.status === 'cancelled'
          ? '已取消的行程'
          : `${s.status === 'completed' ? '已完成 · ' : ''}教練課程${sharing.showNames ? ` · ${s.student_name}` : ''}`,
      location: s.status === 'cancelled' ? '' : (s.location ?? ''),
      cancelled: s.status === 'cancelled',
    }))
    if (sharing.includeBlocks) {
      const blocks = (
        await c.query(
          'select id,starts_at,ends_at from app_private.calendar_block where workspace_id=$1 and starts_at < $3 and ends_at > $2 order by starts_at,id limit 10001',
          [id, from, to],
        )
      ).rows
      result.push(
        ...blocks.map((b) => ({
          uid: eventUid('block', b.id),
          startsAt: b.starts_at.toISOString(),
          endsAt: b.ends_at.toISOString(),
          summary: '已保留時段',
          location: '',
          cancelled: false,
        })),
      )
    }
    if (result.length > 10000) throw new ExportError(413, 'export_too_large')
    return result
  }
  async download(identity: AuthenticatedIdentity, raw: unknown) {
    const input = download.parse(raw)
    validateReportRange(input.start, input.end)
    if ((await this.plans.get(identity)).tier !== 'advanced')
      throw new PlanAccessError('plan_required')
    const id = await this.resolve(identity),
      now = this.now()
    return this.transaction(async (c) => {
      await this.scope(c, id)
      const w = (
        await c.query(
          'select display_name,time_zone,deletion_requested_at from app_private.workspace where id=$1',
          [id],
        )
      ).rows[0]
      if (!w || w.deletion_requested_at) throw new CalendarError(404, 'not_found')
      const events = (
        await this.events(c, id, input.start, addDateDays(input.end, 1), w.time_zone, input)
      ).filter((e) => !e.cancelled)
      if (!events.length) throw new ExportError(404, 'export_empty')
      return {
        body: calendarFile(
          events.map((e) => ({ ...e, sequence: 0, revisedAt: now.toISOString() })),
        ),
        filename: coachFilename(
          w.display_name,
          '行程',
          input.start,
          input.end,
          now,
          w.time_zone,
          'ics',
        ),
        contentType: 'text/calendar; charset=utf-8',
      }
    })
  }
  async feed(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new CalendarError(404, 'not_found')
    const now = this.now()
    const result = await this.transaction(async (c) => {
      await c.query("select set_config('app.calendar_token_hash',$1,true)", [tokenHash(token)])
      const lookup = (
        await c.query(
          'select workspace_id from app_private.calendar_subscription where token_hash=$1',
          [tokenHash(token)],
        )
      ).rows[0]
      if (!lookup) return null
      const id = lookup.workspace_id as string
      await this.scope(c, id)
      const raw = (
        await c.query<StateRow>(
          `select ${stateColumns} from app_private.calendar_subscription where workspace_id=$1 for update`,
          [id],
        )
      ).rows[0]
      if (!raw || raw.token_hash !== tokenHash(token)) return null
      const w = (
        await c.query(
          'select owner_user_id,time_zone,deletion_requested_at from app_private.workspace where id=$1',
          [id],
        )
      ).rows[0]
      if (!w || w.deletion_requested_at) {
        await c.query(
          'update app_private.calendar_subscription set token_hash=null,revoked_at=now(),version=version+1 where workspace_id=$1',
          [id],
        )
        return null
      }
      // Keep only a notice-reading capability after expiry; never resurrect it on renewal.
      if (raw.revoked_at) return expiredCalendarFile(raw.token_hash!, raw.revoked_at)
      const prime = async () =>
        (await this.plans.get({ userId: w.owner_user_id })).tier === 'advanced'
      const expire = async () => {
        const expiredAt = this.now()
        await c.query(
          'update app_private.calendar_subscription set revoked_at=$2,version=version+1,updated_at=$2 where workspace_id=$1',
          [id, expiredAt],
        )
        await c.query('delete from app_private.calendar_published_event where workspace_id=$1', [
          id,
        ])
        return expiredCalendarFile(raw.token_hash!, expiredAt)
      }
      if (!(await prime())) return expire()
      const today = localDate(now, w.time_zone)
      const events = await this.events(
        c,
        id,
        addDateDays(today, -30),
        addDateDays(today, 181),
        w.time_zone,
        state(raw),
      )
      const previousRows = (
        await c.query(
          'select uid,fingerprint,sequence,starts_at,ends_at,revised_at,cancelled_at from app_private.calendar_published_event where workspace_id=$1 order by uid limit 10001',
          [id],
        )
      ).rows
      if (previousRows.length > 10000) throw new ExportError(413, 'export_too_large')
      const previous: PublishedEvent[] = previousRows.map((e) => ({
        uid: e.uid,
        fingerprint: e.fingerprint,
        sequence: e.sequence,
        startsAt: e.starts_at.toISOString(),
        endsAt: e.ends_at.toISOString(),
        revisedAt: e.revised_at.toISOString(),
        cancelledAt: e.cancelled_at?.toISOString() ?? null,
      }))
      const reconciled = reconcileEvents(events, previous, now)
      if (!(await prime())) return expire()
      const body = calendarFile(reconciled)
      await c.query('delete from app_private.calendar_published_event where workspace_id=$1', [id])
      if (reconciled.length)
        await c.query(
          `insert into app_private.calendar_published_event (workspace_id,uid,fingerprint,sequence,starts_at,ends_at,revised_at,cancelled_at)
        select $1,e.uid,e.fingerprint,e.sequence,e."startsAt",e."endsAt",e."revisedAt",e."cancelledAt"
        from jsonb_to_recordset($2::jsonb) as e(uid text,fingerprint text,sequence integer,"startsAt" timestamptz,"endsAt" timestamptz,"revisedAt" timestamptz,"cancelledAt" timestamptz)`,
          [
            id,
            JSON.stringify(
              reconciled.map(
                ({ uid, fingerprint, sequence, startsAt, endsAt, revisedAt, cancelledAt }) => ({
                  uid,
                  fingerprint,
                  sequence,
                  startsAt,
                  endsAt,
                  revisedAt,
                  cancelledAt,
                }),
              ),
            ),
          ],
        )
      return body
    })
    if (!result) throw new CalendarError(404, 'not_found')
    return result
  }
}
