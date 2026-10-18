import type { Pool } from 'pg'
import {
  effectiveBillingEnvironment,
  scopedBillingPool,
  type BillingEnvironment,
} from './billing-sql.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { billingAccessSource, type BillingAccessFacts } from './access-source.js'

type Row = {
  tier: 'basic' | 'advanced'
  origin: 'trial' | 'payment' | 'renewal'
  starts_at: Date
  ends_at: Date
  status: BillingAccessFacts['status']
  cancellation_ends_at: string | null
  access_revoked: boolean
}

/** Development Test Mode only; a ledger snapshot without a verified period grants nothing. */
export class PostgresVerifiedBillingAccess {
  private readonly pool: Pool
  constructor(
    pool: Pool,
    private readonly now = () => new Date(),
    environment?: BillingEnvironment,
  ) {
    this.pool = scopedBillingPool(pool, effectiveBillingEnvironment(environment))
  }

  async get(identity: AuthenticatedIdentity) {
    const client = await this.pool.connect()
    const now = this.now()
    try {
      await client.query('begin')
      const workspace = await client.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [identity.userId],
      )
      const id = workspace.rows[0]?.id
      if (!id) {
        await client.query('commit')
        return null
      }
      await client.query("select set_config('app.current_workspace_id',$1,true)", [id])
      const result = await client.query<Row>(
        `select p.tier,p.origin,p.starts_at,p.ends_at,
           s.resource#>>'{attributes,status}' status,
           s.resource#>>'{attributes,ends_at}' cancellation_ends_at,
           exists (
             select 1 from app_private.billing_refund_case decision
             join app_private.billing_refund_case_application applied
               on applied.case_id=decision.id and applied.workspace_id=decision.workspace_id
             where decision.environment=p.environment and decision.store_id=p.store_id
               and decision.workspace_id=p.workspace_id
               and decision.subscription_id=p.subscription_id
               and decision.period_key=p.period_key and decision.decision='revoke_current'
               and applied.access_revoked_at<=$2
           ) access_revoked
         from app_private.billing_verified_period p
         join app_private.billing_subscription_ledger s
           on s.environment=p.environment and s.store_id=p.store_id
           and s.provider_id=p.subscription_id and s.workspace_id=p.workspace_id
         where p.environment=@billing_environment and p.workspace_id=$1 and p.superseded_at is null
           and p.starts_at<=$2 and p.ends_at>$2
           and not exists (
             select 1 from app_private.billing_refund_case decision
             join app_private.billing_refund_case_application applied
               on applied.case_id=decision.id and applied.workspace_id=decision.workspace_id
             where decision.environment=p.environment and decision.store_id=p.store_id
               and decision.workspace_id=p.workspace_id
               and decision.subscription_id=p.subscription_id
               and decision.period_key=p.period_key and decision.decision='revoke_current'
               and applied.access_revoked_at<=$2
           )
         order by p.starts_at desc limit 2`,
        [id, now],
      )
      await client.query('commit')
      if (result.rows.length !== 1) return null
      const row = result.rows[0]!
      if (
        !['on_trial', 'active', 'cancelled', 'past_due', 'unpaid', 'expired', 'paused'].includes(
          row.status,
        )
      )
        return null
      return billingAccessSource(
        {
          status: row.status,
          period: {
            tier: row.tier,
            origin: row.origin,
            startsAt: row.starts_at,
            endsAt: row.ends_at,
          },
          cancellationEndsAt: row.cancellation_ends_at ? new Date(row.cancellation_ends_at) : null,
          accessRevoked: row.access_revoked,
        },
        now,
      )
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
