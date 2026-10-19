import type { Pool, PoolClient } from 'pg'
import {
  effectiveBillingEnvironment,
  scopedBillingPool,
  type BillingEnvironment,
} from './billing-sql.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  BillingError,
  type CheckoutRepository,
  type CheckoutTransaction,
  type StoredIntent,
  type StoredQuote,
} from './checkout.js'

/** Server-only store. All queries carry both owner scope and payment environment. */
export class PostgresCheckoutRepository implements CheckoutRepository {
  private readonly pool: Pool
  constructor(pool: Pool, environment?: BillingEnvironment) {
    this.pool = scopedBillingPool(pool, effectiveBillingEnvironment(environment))
  }
  async transaction<T>(
    identity: AuthenticatedIdentity,
    work: (tx: CheckoutTransaction) => Promise<T>,
  ): Promise<T> {
    const c = await this.pool.connect()
    try {
      await c.query('begin')
      await c.query("set local lock_timeout = '5s'")
      await c.query("set local statement_timeout = '10s'")
      const workspace = await c.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [identity.userId],
      )
      const id = workspace.rows[0]?.id
      if (!id) throw new BillingError(404, 'workspace_not_found')
      await c.query("select set_config('app.current_workspace_id',$1,true)", [id])
      await c.query(
        'insert into app_private.billing_checkout_account(workspace_id,environment) values($1,@billing_environment) on conflict do nothing',
        [id],
      )
      await c.query(
        'select workspace_id from app_private.billing_checkout_account where workspace_id=$1 and environment=@billing_environment for update',
        [id],
      )
      const value = await work(transaction(c, id))
      await c.query('commit')
      return value
    } catch (error) {
      await c.query('rollback')
      throw error
    } finally {
      c.release()
    }
  }
}
function transaction(c: PoolClient, workspaceId: string): CheckoutTransaction {
  const scope = [workspaceId]
  return {
    async facts() {
      const result = await c.query<{
        first_subscribed_at: Date | null
        version: number
        kind: string | null
        active_offer: boolean
        has_verified_subscription: boolean
        has_current_subscription: boolean
      }>(
        `select a.first_subscribed_at,a.version,g.kind,
          coalesce(g.kind='promotional' and g.ends_at>now(),false) active_offer,
          exists(select 1 from app_private.billing_subscription_ledger s
            where s.workspace_id=a.workspace_id and s.environment=@billing_environment) has_verified_subscription,
          exists(select 1 from app_private.billing_subscription_ledger s
            where s.workspace_id=a.workspace_id and s.environment=@billing_environment
              and coalesce(s.resource#>>'{attributes,status}','')<>'expired'
              and (s.resource#>>'{attributes,status}'<>'cancelled'
                or nullif(s.resource#>>'{attributes,ends_at}','') is null
                or (s.resource#>>'{attributes,ends_at}')::timestamptz>now())
              and not exists (
                select 1 from app_private.billing_verified_period p
                join app_private.billing_refund_case decision
                  on decision.environment=p.environment and decision.store_id=p.store_id
                  and decision.workspace_id=p.workspace_id
                  and decision.subscription_id=p.subscription_id and decision.period_key=p.period_key
                join app_private.billing_refund_case_application applied
                  on applied.case_id=decision.id and applied.workspace_id=decision.workspace_id
                join app_private.billing_invoice_ledger i
                  on i.environment=p.environment and i.store_id=p.store_id
                  and i.workspace_id=p.workspace_id and i.subscription_id=p.subscription_id
                  and i.provider_id=p.invoice_id
                where p.environment=s.environment and p.store_id=s.store_id
                  and p.workspace_id=s.workspace_id and p.subscription_id=s.provider_id
                  and p.superseded_at is null and p.starts_at<=now() and p.ends_at>now()
                  and decision.decision='revoke_current' and applied.access_revoked_at<=now()
                  and s.resource#>>'{attributes,status}'='cancelled'
                  and s.resource#>>'{attributes,cancelled}'='true'
                  and i.resource#>>'{attributes,status}'='refunded'
                  and (i.resource#>>'{attributes,total}')::integer>0
                  and (i.resource#>>'{attributes,refunded_amount}')::integer
                    >=(i.resource#>>'{attributes,total}')::integer
              )) has_current_subscription
         from app_private.billing_checkout_account a left join app_private.beta_grant g on g.workspace_id=a.workspace_id
         where a.workspace_id=$1 and a.environment=@billing_environment`,
        scope,
      )
      const row = result.rows[0]!
      const pending = await c.query(
        "select 1 from app_private.billing_checkout_intent where workspace_id=$1 and environment=@billing_environment and status in ('creating','open','pending','abandon_requested') limit 1",
        scope,
      )
      return {
        // A provider-fetched, intent-bound subscription is enough to block duplicate checkout and
        // another first trial. Paid access still requires separate verified-period evidence.
        hasEverSubscribed: Boolean(row.first_subscribed_at) || row.has_verified_subscription,
        hasCurrentSubscription: row.has_current_subscription,
        hasUnresolvedCheckout: pending.rowCount !== 0,
        hasPermanentAccess: row.kind === 'permanent',
        hasLegacyOffer: row.active_offer,
        eligibilityVersion: row.version,
      }
    },
    async quote(id) {
      const result = await c.query<{ quote: StoredQuote }>(
        'select quote from app_private.billing_checkout_quote where workspace_id=$1 and environment=@billing_environment and id=$2',
        [...scope, id],
      )
      return result.rows[0]?.quote ?? null
    },
    async saveQuote(quote) {
      // Keep consumed quotes for consent evidence; bound unused quote accumulation.
      await c.query(
        `delete from app_private.billing_checkout_quote q where q.workspace_id=$1 and q.environment=@billing_environment
        and not exists(select 1 from app_private.billing_checkout_intent i where i.quote_id=q.id)
        and (q.expires_at<now() or q.id in (select id from app_private.billing_checkout_quote
          where workspace_id=$1 and environment=@billing_environment order by created_at desc offset 9))`,
        scope,
      )
      await c.query(
        'insert into app_private.billing_checkout_quote(id,workspace_id,environment,quote,expires_at) values($1,$2,@billing_environment,$3,$4)',
        [quote.id, workspaceId, JSON.stringify(quote), quote.expiresAt],
      )
    },
    async unresolved() {
      const result = await c.query<{ intent: StoredIntent }>(
        "select intent from app_private.billing_checkout_intent where workspace_id=$1 and environment=@billing_environment and status in ('creating','open','pending','abandon_requested') order by created_at desc limit 1",
        scope,
      )
      return result.rows[0]?.intent ?? null
    },
    async intent(id) {
      const result = await c.query<{ intent: StoredIntent }>(
        'select intent from app_private.billing_checkout_intent where workspace_id=$1 and environment=@billing_environment and id=$2',
        [...scope, id],
      )
      return result.rows[0]?.intent ?? null
    },
    async saveIntent(intent) {
      await c.query(
        `insert into app_private.billing_checkout_intent(id,workspace_id,environment,quote_id,status,intent,created_at)
        values($1,$2,@billing_environment,$3,$4,$5,$6) on conflict (id) do update set status=excluded.status,intent=excluded.intent
        where billing_checkout_intent.workspace_id=excluded.workspace_id and billing_checkout_intent.environment=excluded.environment`,
        [
          intent.id,
          workspaceId,
          intent.quoteId,
          intent.status,
          JSON.stringify(intent),
          intent.createdAt,
        ],
      )
    },
    async abandonExpired(id, now) {
      const result = await c.query(
        `update app_private.billing_checkout_intent i
         set status='abandoned',
             intent=(i.intent-'url')||jsonb_build_object('status','abandoned','url',null)
         where i.id=$2 and i.workspace_id=$1 and i.environment=@billing_environment
           and i.status in ('open','pending','abandon_requested')
           and (i.intent->>'expiresAt')::timestamptz <= $3::timestamptz - interval '5 minutes'
           and not exists(select 1 from app_private.billing_subscription_ledger s
             where s.environment=i.environment and s.workspace_id=i.workspace_id and s.intent_id=i.id)
           and not exists(select 1 from app_private.billing_event_inbox e
             where e.environment=i.environment
               and e.notification->>'intentId'=i.id::text)
         returning i.id`,
        [workspaceId, id, now.toISOString()],
      )
      return result.rowCount === 1
    },
    async markSubmitted(id) {
      const result = await c.query(
        `update app_private.billing_checkout_intent i
         set status='pending',
             intent=(i.intent-'url')||jsonb_build_object('status','pending','url',null)
         where i.id=$2 and i.workspace_id=$1 and i.environment=@billing_environment
           and i.status='open'
         returning i.id`,
        [workspaceId, id],
      )
      return result.rowCount === 1
    },
    async requestAbandon(id) {
      const result = await c.query(
        `update app_private.billing_checkout_intent i
         set status='abandoned',
             intent=(i.intent-'url')||jsonb_build_object('status','abandoned','url',null)
         where i.id=$2 and i.workspace_id=$1 and i.environment=@billing_environment
           and i.status='open'
           and not exists(select 1 from app_private.billing_subscription_ledger s
             where s.environment=i.environment and s.workspace_id=i.workspace_id and s.intent_id=i.id)
           and not exists(select 1 from app_private.billing_event_inbox e
             where e.environment=i.environment and e.notification->>'intentId'=i.id::text)
         returning i.id`,
        [workspaceId, id],
      )
      return result.rowCount === 1
    },
  }
}
