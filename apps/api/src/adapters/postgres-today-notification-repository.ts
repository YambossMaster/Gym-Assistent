import type { Pool, PoolClient } from 'pg'
import type {
  ConflictSource,
  RescheduleSource,
  TodayNotificationRepository,
} from '../today/today-notifications.js'

export class PostgresTodayNotificationRepository implements TodayNotificationRepository {
  constructor(private readonly pool: Pool) {}

  async sourceTimes(
    workspaceId: string,
    studentIds: string[],
    conflictSources: ConflictSource[],
    since: Date,
  ) {
    return this.scoped(workspaceId, async (client) => {
      const balances = studentIds.length
        ? await client.query<{ id: string; changed_at: Date }>(
            `select s.id, greatest(s.created_at,
                coalesce((select max(lp.updated_at) from app_private.lesson_purchase lp
                  where lp.workspace_id=s.workspace_id and lp.student_id=s.id),s.created_at),
                coalesce((select max(cs.completed_at) from app_private.course_session cs
                  where cs.workspace_id=s.workspace_id and cs.student_id=s.id
                    and cs.status='completed'),s.created_at)) changed_at
             from app_private.student s where s.workspace_id=$1 and s.id=any($2::uuid[])`,
            [workspaceId, studentIds],
          )
        : { rows: [] }
      const sessionIds = [
        ...new Set(
          conflictSources.flatMap(({ sessionId, relatedSessionIds }) => [
            sessionId,
            ...relatedSessionIds,
          ]),
        ),
      ]
      const blockIds = [...new Set(conflictSources.flatMap(({ blockIds }) => blockIds))]
      const sessions = sessionIds.length
        ? await client.query<{ id: string; changed_at: Date }>(
            `select id,updated_at changed_at from app_private.course_session
             where workspace_id=$1 and id=any($2::uuid[]) and not is_legacy`,
            [workspaceId, sessionIds],
          )
        : { rows: [] }
      const blocks = blockIds.length
        ? await client.query<{ id: string; changed_at: Date }>(
            `select id,updated_at changed_at from app_private.calendar_block
             where workspace_id=$1 and id=any($2::uuid[])`,
            [workspaceId, blockIds],
          )
        : { rows: [] }
      const sessionTimes = new Map(sessions.rows.map((row) => [row.id, row.changed_at.getTime()]))
      const blockTimes = new Map(blocks.rows.map((row) => [row.id, row.changed_at.getTime()]))
      const reschedules = await client.query<{
        id: string
        session_id: string
        student_name: string
        used_at: Date
        redeemed_starts_at: Date
        original_starts_at: Date | null
      }>(
        `select cl.id,cl.session_id,s.name student_name,cl.used_at,cl.redeemed_starts_at,
          cl.original_starts_at
         from app_private.capability_link cl
         join app_private.course_session cs on cs.workspace_id=cl.workspace_id and cs.id=cl.session_id
         join app_private.student s on s.workspace_id=cs.workspace_id and s.id=cs.student_id
         where cl.workspace_id=$1 and cl.purpose='reschedule_session'
           and cl.used_at >= $2 and cl.redeemed_starts_at is not null
         order by cl.used_at desc,cl.id`,
        [workspaceId, since],
      )
      return {
        balances: Object.fromEntries(
          balances.rows.map((row) => [row.id, row.changed_at.toISOString()]),
        ),
        conflicts: Object.fromEntries(
          conflictSources.flatMap(({ sessionId, relatedSessionIds, blockIds }) => {
            const own = sessionTimes.get(sessionId)
            if (own === undefined) return []
            const changedAt = Math.max(
              own,
              ...relatedSessionIds.map((id) => sessionTimes.get(id) ?? 0),
              ...blockIds.map((id) => blockTimes.get(id) ?? 0),
            )
            return [[sessionId, new Date(changedAt).toISOString()]]
          }),
        ),
        reschedules: reschedules.rows.map(
          (row): RescheduleSource => ({
            id: row.id,
            sessionId: row.session_id,
            studentName: row.student_name,
            usedAt: row.used_at.toISOString(),
            redeemedStartsAt: row.redeemed_starts_at.toISOString(),
            originalStartsAt: row.original_starts_at?.toISOString() ?? null,
          }),
        ),
      }
    })
  }

  async states(workspaceId: string, ids: string[]) {
    if (!ids.length) return {}
    return this.scoped(workspaceId, async (client) => {
      const result = await client.query<{
        notification_id: string
        read_at: Date | null
        dismissed_at: Date | null
      }>(
        `select notification_id,read_at,dismissed_at from app_private.today_notification_read
         where workspace_id=$1 and notification_id=any($2::text[])`,
        [workspaceId, ids],
      )
      return Object.fromEntries(
        result.rows.map((row) => [
          row.notification_id,
          {
            readAt: row.read_at?.toISOString() ?? null,
            dismissedAt: row.dismissed_at?.toISOString() ?? null,
          },
        ]),
      )
    })
  }

  async markRead(workspaceId: string, id: string, now: Date) {
    return this.scoped(workspaceId, async (client) => {
      const result = await client.query<{ read_at: Date }>(
        `insert into app_private.today_notification_read(workspace_id,notification_id,read_at)
         values($1,$2,$3) on conflict (workspace_id,notification_id)
         do update set read_at=coalesce(app_private.today_notification_read.read_at,excluded.read_at)
         returning read_at`,
        [workspaceId, id, now],
      )
      return result.rows[0]!.read_at.toISOString()
    })
  }

  async dismiss(workspaceId: string, id: string, now: Date) {
    await this.scoped(workspaceId, async (client) => {
      await client.query(
        `insert into app_private.today_notification_read(workspace_id,notification_id,dismissed_at)
         values($1,$2,$3) on conflict (workspace_id,notification_id)
         do update set dismissed_at=coalesce(app_private.today_notification_read.dismissed_at,excluded.dismissed_at)`,
        [workspaceId, id, now],
      )
    })
  }

  private async scoped<T>(workspaceId: string, work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query(`select set_config('app.current_workspace_id',$1,true)`, [workspaceId])
      const result = await work(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
