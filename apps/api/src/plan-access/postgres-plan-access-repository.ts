import type { Pool } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { PlanAccessRepository } from './plan-access.js'
import {
  nextTestSubscription,
  PlanSelectionError,
  type PlanSubscription,
  type PlanSubscriptionAction,
} from './plan-subscription.js'

interface PlanRow {
  kind: 'promotional' | 'permanent' | 'tester' | null
  ends_at: Date | null
  active_students: number
  active_venues: number
  tier: 'basic' | 'advanced' | null
  billing_interval: 'month' | 'year' | null
  period_start: Date | null
  period_end: Date | null
  pending_tier: 'free' | 'basic' | 'advanced' | null
  pending_interval: 'month' | 'year' | null
  version: number | null
}

function subscriptionFrom(row: PlanRow | undefined): PlanSubscription | null {
  if (!row?.tier || !row.billing_interval || !row.period_start || !row.period_end || !row.version)
    return null
  return {
    tier: row.tier,
    interval: row.billing_interval,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    pendingTier: row.pending_tier,
    pendingInterval: row.pending_interval,
    version: row.version,
  }
}

export class PostgresPlanAccessRepository implements PlanAccessRepository {
  constructor(
    private readonly pool: Pool,
    private readonly resolveWorkspace?: (identity: AuthenticatedIdentity) => Promise<string>,
  ) {}

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
        `select g.kind,g.ends_at,p.tier,p.billing_interval,p.period_start,p.period_end,
           p.pending_tier,p.pending_interval,p.version,
           (select count(*)::int from app_private.student s
            where s.workspace_id=$1 and s.active) as active_students,
           (select count(*)::int from app_private.venue v
            where v.workspace_id=$1 and v.active) as active_venues
         from app_private.workspace w
         left join app_private.beta_grant g on g.workspace_id=w.id
         left join app_private.plan_subscription p on p.workspace_id=w.id
         where w.id=$1`,
        [workspaceId],
      )
      await client.query('commit')
      const row = result.rows[0]
      return {
        grant: row?.kind ? { kind: row.kind, endsAt: row.ends_at } : null,
        activeStudents: row?.active_students ?? 0,
        activeVenues: row?.active_venues ?? 0,
        subscription: subscriptionFrom(row),
        version: row?.version ?? 0,
      }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async change(identity: AuthenticatedIdentity, action: PlanSubscriptionAction, now: Date) {
    if (!this.resolveWorkspace) throw new Error('Workspace resolver unavailable')
    const workspaceId = await this.resolveWorkspace(identity)
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      await client.query('select id from app_private.workspace where id=$1 for update', [
        workspaceId,
      ])
      const result = await client.query<PlanRow>(
        `select g.kind,p.tier,p.billing_interval,p.period_start,p.period_end,
           p.pending_tier,p.pending_interval,p.version
         from app_private.workspace w
         left join app_private.beta_grant g on g.workspace_id=w.id
         left join app_private.plan_subscription p on p.workspace_id=w.id
         where w.id=$1`,
        [workspaceId],
      )
      const row = result.rows[0]
      if (row?.kind !== 'tester') throw new PlanSelectionError('plan_test_required')
      const next = nextTestSubscription(subscriptionFrom(row), action, now)
      if (!next) {
        await client.query('delete from app_private.plan_subscription where workspace_id=$1', [
          workspaceId,
        ])
        await client.query('commit')
        return
      }
      await client.query(
        `insert into app_private.plan_subscription
         (workspace_id,tier,billing_interval,period_start,period_end,pending_tier,
          pending_interval,version,amount_due_minor,amount_paid_minor,updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,0,0,$9)
         on conflict (workspace_id) do update set tier=excluded.tier,
           billing_interval=excluded.billing_interval,period_start=excluded.period_start,
           period_end=excluded.period_end,pending_tier=excluded.pending_tier,
           pending_interval=excluded.pending_interval,version=excluded.version,
           updated_at=excluded.updated_at`,
        [
          workspaceId,
          next.tier,
          next.interval,
          next.periodStart,
          next.periodEnd,
          next.pendingTier,
          next.pendingInterval,
          next.version,
          now,
        ],
      )
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
