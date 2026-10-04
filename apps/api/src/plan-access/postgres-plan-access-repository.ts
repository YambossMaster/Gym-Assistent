import type { Pool } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { PlanAccessRepository } from './plan-access.js'

interface PlanRow {
  kind: 'promotional' | 'permanent' | null
  ends_at: Date | null
  active_students: number
  active_venues: number
}

export class PostgresPlanAccessRepository implements PlanAccessRepository {
  constructor(private readonly pool: Pool) {}

  async get(identity: AuthenticatedIdentity) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const workspace = await client.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [identity.userId],
      )
      const workspaceId = workspace.rows[0]?.id
      if (!workspaceId) {
        await client.query('commit')
        return { grant: null, activeStudents: 0, activeVenues: 0 }
      }
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      const result = await client.query<PlanRow>(
        `select g.kind,g.ends_at,
           (select count(*)::int from app_private.student s
            where s.workspace_id=$1 and s.active) as active_students,
           (select count(*)::int from app_private.venue v
            where v.workspace_id=$1 and v.active) as active_venues
         from app_private.workspace w
         left join app_private.beta_grant g on g.workspace_id=w.id
         where w.id=$1`,
        [workspaceId],
      )
      await client.query('commit')
      const row = result.rows[0]
      return {
        grant: row?.kind ? { kind: row.kind, endsAt: row.ends_at } : null,
        activeStudents: row?.active_students ?? 0,
        activeVenues: row?.active_venues ?? 0,
      }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
