import type { Pool, PoolClient } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  BillingError,
  type CheckoutRepository,
  type CheckoutTransaction,
  type StoredIntent,
  type StoredQuote,
} from './checkout.js'

/** Server-only Test Mode store. All queries carry both owner scope and payment environment. */
export class PostgresCheckoutRepository implements CheckoutRepository {
  constructor(private readonly pool: Pool) {}
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
        "insert into app_private.billing_checkout_account(workspace_id,environment) values($1,'test') on conflict do nothing",
        [id],
      )
      await c.query(
        "select workspace_id from app_private.billing_checkout_account where workspace_id=$1 and environment='test' for update",
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
      }>(
        `select a.first_subscribed_at,a.version,g.kind,
          coalesce(g.kind='promotional' and g.ends_at>now(),false) active_offer
         from app_private.billing_checkout_account a left join app_private.beta_grant g on g.workspace_id=a.workspace_id
         where a.workspace_id=$1 and a.environment='test'`,
        scope,
      )
      const row = result.rows[0]!
      const pending = await c.query(
        "select 1 from app_private.billing_checkout_intent where workspace_id=$1 and environment='test' and status in ('creating','open','pending') limit 1",
        scope,
      )
      return {
        hasEverSubscribed: Boolean(row.first_subscribed_at),
        hasCurrentSubscription: false,
        hasUnresolvedCheckout: pending.rowCount !== 0,
        hasPermanentAccess: row.kind === 'permanent',
        hasLegacyOffer: row.active_offer,
        eligibilityVersion: row.version,
      }
    },
    async quote(id) {
      const result = await c.query<{ quote: StoredQuote }>(
        "select quote from app_private.billing_checkout_quote where workspace_id=$1 and environment='test' and id=$2",
        [...scope, id],
      )
      return result.rows[0]?.quote ?? null
    },
    async saveQuote(quote) {
      // Keep consumed quotes for consent evidence; bound unused quote accumulation.
      await c.query(
        `delete from app_private.billing_checkout_quote q where q.workspace_id=$1 and q.environment='test'
        and not exists(select 1 from app_private.billing_checkout_intent i where i.quote_id=q.id)
        and (q.expires_at<now() or q.id in (select id from app_private.billing_checkout_quote
          where workspace_id=$1 and environment='test' order by created_at desc offset 9))`,
        scope,
      )
      await c.query(
        "insert into app_private.billing_checkout_quote(id,workspace_id,environment,quote,expires_at) values($1,$2,'test',$3,$4)",
        [quote.id, workspaceId, JSON.stringify(quote), quote.expiresAt],
      )
    },
    async unresolved() {
      const result = await c.query<{ intent: StoredIntent }>(
        "select intent from app_private.billing_checkout_intent where workspace_id=$1 and environment='test' and status in ('creating','open','pending') order by created_at desc limit 1",
        scope,
      )
      return result.rows[0]?.intent ?? null
    },
    async intent(id) {
      const result = await c.query<{ intent: StoredIntent }>(
        "select intent from app_private.billing_checkout_intent where workspace_id=$1 and environment='test' and id=$2",
        [...scope, id],
      )
      return result.rows[0]?.intent ?? null
    },
    async saveIntent(intent) {
      await c.query(
        `insert into app_private.billing_checkout_intent(id,workspace_id,environment,quote_id,status,intent,created_at)
        values($1,$2,'test',$3,$4,$5,$6) on conflict (id) do update set status=excluded.status,intent=excluded.intent
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
  }
}
