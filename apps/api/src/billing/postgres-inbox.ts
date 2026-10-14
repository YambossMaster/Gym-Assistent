import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { BillingInboxRepository, BillingJob, BillingNotification } from './event-inbox.js'
import {
  ReconciliationError,
  resourceUpdate,
  type BillingResource,
  type SubscriptionResource,
} from './resources.js'

export async function billingTransaction<T>(pool: Pool, work: (c: PoolClient) => Promise<T>) {
  const c = await pool.connect()
  try {
    await c.query('begin')
    await c.query("set local lock_timeout='5s'")
    await c.query("set local statement_timeout='10s'")
    const result = await work(c)
    await c.query('commit')
    return result
  } catch (error) {
    await c.query('rollback')
    throw error
  } finally {
    c.release()
  }
}

/** Requires a server worker connection; never exposed as a browser-selected tenant operation. */
export class PostgresBillingInbox implements BillingInboxRepository {
  constructor(
    private readonly pool: Pool,
    private readonly variants: Record<string, string>,
  ) {}
  async receive(notification: BillingNotification) {
    await this.pool.query(
      `insert into app_private.billing_event_inbox(digest,notification)
      values($1,$2) on conflict(environment,digest) do nothing`,
      [notification.digest, JSON.stringify(notification)],
    )
  }
  async claim(now: Date): Promise<BillingJob | null> {
    await this.pool.query(
      `update app_private.billing_event_inbox set status='dead',error_code='attempts_exhausted',
      lease_token=null,lease_until=null where environment='test' and status='processing' and attempts>=8 and lease_until<=$1`,
      [now],
    )
    const lease = randomUUID()
    const result = await this.pool.query<{
      id: string
      notification: BillingNotification
      attempts: number
    }>(
      `with candidate as (
        select id from app_private.billing_event_inbox where environment='test' and attempts<8 and
        ((status='queued' and next_attempt_at<=$1) or (status='processing' and lease_until<=$1))
        order by created_at for update skip locked limit 1
      ) update app_private.billing_event_inbox e set status='processing',lease_token=$2,
        lease_until=$1::timestamptz+interval '60 seconds',attempts=e.attempts+1
        from candidate c where e.id=c.id returning e.id,e.notification,e.attempts`,
      [now, lease],
    )
    const row = result.rows[0]
    return row ? { ...row.notification, id: row.id, lease, attempts: row.attempts } : null
  }
  async commit(job: BillingJob, resource: BillingResource, now: Date) {
    await billingTransaction(this.pool, async (c) => {
      const held = await c.query(
        `select id from app_private.billing_event_inbox where id=$1 and
        environment='test' and status='processing' and lease_token=$2 and lease_until>$3 for update`,
        [job.id, job.lease, now],
      )
      if (!held.rowCount) throw new ReconciliationError('lease_lost')
      const subscriptionId =
        resource.type === 'subscriptions' ? resource.id : resource.attributes.subscription_id
      // Serialize first binding too, when the row does not exist yet.
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `billing:test:${job.storeId}:${subscriptionId}`,
      ])
      const binding = await c.query<{
        workspace_id: string
        customer_id: string
        resource: BillingResource
      }>(
        `select workspace_id,customer_id,resource from app_private.billing_subscription_ledger
         where environment='test' and store_id=$1 and provider_id=$2 for update`,
        [job.storeId, subscriptionId],
      )
      const owner = binding.rows[0]
      let currentSubscription: SubscriptionResource | null =
        resource.type === 'subscriptions' ? resource : null
      if (!owner) {
        if (resource.type !== 'subscriptions' || !job.intentId)
          throw new ReconciliationError('binding_not_ready', true)
        const intent = await c.query<{
          workspace_id: string
          variant_key: string
          created_at: Date
          expires_at: string
        }>(
          `select i.workspace_id,(q.quote->>'tier')||'_'||(q.quote->>'interval') variant_key,
          i.created_at,i.intent->>'expiresAt' expires_at
          from app_private.billing_checkout_intent i join app_private.billing_checkout_quote q on q.id=i.quote_id
          where i.id=$1 and i.environment='test' and q.environment='test' and q.workspace_id=i.workspace_id`,
          [job.intentId],
        )
        const source = intent.rows[0]
        const created = Date.parse(resource.attributes.created_at)
        if (!source) throw new ReconciliationError('binding_not_ready', true)
        if (
          this.variants[source.variant_key] !== resource.attributes.variant_id ||
          created < source.created_at.getTime() - 5000 ||
          created > Date.parse(source.expires_at) + 5000
        ) {
          throw new ReconciliationError('checkout_binding_mismatch')
        }
        await c.query(
          `insert into app_private.billing_subscription_ledger
          (store_id,provider_id,workspace_id,intent_id,customer_id,resource,reconciled_at)
          values($1,$2,$3,$4,$5,$6,$7)`,
          [
            job.storeId,
            resource.id,
            source.workspace_id,
            job.intentId,
            resource.attributes.customer_id,
            JSON.stringify(resource),
            now,
          ],
        )
      } else {
        if (owner.customer_id !== resource.attributes.customer_id)
          throw new ReconciliationError('customer_mismatch')
        if (resource.type === 'subscriptions') {
          if (resourceUpdate(owner.resource, resource) === 'apply') {
            await c.query(
              `update app_private.billing_subscription_ledger set resource=$3,reconciled_at=$4
              where environment='test' and store_id=$1 and provider_id=$2`,
              [job.storeId, resource.id, JSON.stringify(resource), now],
            )
          } else currentSubscription = owner.resource as SubscriptionResource
        } else {
          const prior = await c.query<{ resource: BillingResource }>(
            `select resource from app_private.billing_invoice_ledger
            where environment='test' and store_id=$1 and provider_id=$2 for update`,
            [job.storeId, resource.id],
          )
          if (resourceUpdate(prior.rows[0]?.resource ?? null, resource) === 'apply') {
            await c.query(
              `insert into app_private.billing_invoice_ledger
              (store_id,provider_id,subscription_id,workspace_id,resource,reconciled_at) values($1,$2,$3,$4,$5,$6)
              on conflict(environment,store_id,provider_id) do update set resource=excluded.resource,reconciled_at=excluded.reconciled_at
              where billing_invoice_ledger.workspace_id=excluded.workspace_id and billing_invoice_ledger.subscription_id=excluded.subscription_id`,
              [
                job.storeId,
                resource.id,
                subscriptionId,
                owner.workspace_id,
                JSON.stringify(resource),
                now,
              ],
            )
          }
        }
      }
      if (
        currentSubscription &&
        (currentSubscription.attributes.cancelled ||
          currentSubscription.attributes.status === 'expired') &&
        currentSubscription.attributes.ends_at
      ) {
        await c.query(
          `update app_private.billing_cancellation set status='confirmed',confirmed_at=$3,confirmation=$4
          where environment='test' and store_id=$1 and subscription_id=$2 and status='pending'`,
          [job.storeId, subscriptionId, now, JSON.stringify(currentSubscription)],
        )
      }
      await c.query(
        `update app_private.billing_event_inbox set status='done',lease_token=null,lease_until=null,error_code=null where id=$1`,
        [job.id],
      )
    })
  }
  async fail(job: BillingJob, code: string, retryAt: Date | null) {
    await this.pool.query(
      `update app_private.billing_event_inbox set status=$3,next_attempt_at=coalesce($4,next_attempt_at),
      error_code=$5,lease_token=null,lease_until=null where id=$1 and environment='test' and status='processing' and lease_token=$2`,
      [job.id, job.lease, retryAt ? 'queued' : 'dead', retryAt, code],
    )
  }
}
