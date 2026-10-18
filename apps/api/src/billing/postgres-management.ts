import type { Pool, PoolClient } from 'pg'
import {
  effectiveBillingEnvironment,
  scopedBillingPool,
  type BillingEnvironment,
} from './billing-sql.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { BillingError } from './checkout.js'
import { billingTransaction } from './postgres-inbox.js'
import { resourceUpdate, type InvoiceResource, type SubscriptionResource } from './resources.js'
import type { BillingManagementRepository, CancellationClaim } from './management.js'

export class PostgresBillingManagement implements BillingManagementRepository {
  private readonly pool: Pool
  constructor(pool: Pool, environment?: BillingEnvironment) {
    this.pool = scopedBillingPool(pool, effectiveBillingEnvironment(environment))
  }
  private async owned<T>(
    identity: AuthenticatedIdentity,
    work: (c: PoolClient, workspace: string) => Promise<T>,
  ) {
    return billingTransaction(this.pool, async (c) => {
      const result = await c.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [identity.userId],
      )
      const workspace = result.rows[0]?.id
      if (!workspace) throw new BillingError(404, 'workspace_not_found')
      await c.query("select set_config('app.current_workspace_id',$1,true)", [workspace])
      return work(c, workspace)
    })
  }
  read(identity: AuthenticatedIdentity) {
    return this.owned(identity, async (c, workspace) => {
      // A command completes only after the worker records the matching paid period.
      await c.query(
        `update app_private.billing_paid_change cmd set status='confirmed',confirmed_at=now()
         where cmd.environment=@billing_environment and cmd.workspace_id=$1 and cmd.status='dispatching'
           and exists (
             select 1 from app_private.billing_verified_period p
             join app_private.billing_subscription_ledger s
               on s.environment=p.environment and s.store_id=p.store_id
              and s.provider_id=p.subscription_id and s.workspace_id=p.workspace_id
             where p.environment=@billing_environment and p.workspace_id=cmd.workspace_id
               and p.store_id=cmd.store_id and p.subscription_id=cmd.subscription_id
               and p.superseded_at is null and p.ends_at>now()
               and p.tier=cmd.target_tier and p.billing_interval=cmd.target_interval
               and p.subscription_version>cmd.subscription_version
               and s.resource#>>'{attributes,variant_id}'=cmd.target_variant_id
           )`,
        [workspace],
      )
      const subscriptions = await c.query<{ resource: SubscriptionResource }>(
        `select resource from app_private.billing_subscription_ledger
        where environment=@billing_environment and workspace_id=$1 order by resource->'attributes'->>'created_at' desc`,
        [workspace],
      )
      const invoices = await c.query<{ resource: InvoiceResource }>(
        `select resource from app_private.billing_invoice_ledger
        where environment=@billing_environment and workspace_id=$1 order by resource->'attributes'->>'created_at' desc limit 100`,
        [workspace],
      )
      const pending = await c.query(
        `select 1 from app_private.billing_cancellation where environment=@billing_environment and workspace_id=$1 and status='pending' limit 1`,
        [workspace],
      )
      const checkout = await c.query(
        `select 1 from app_private.billing_checkout_intent where environment=@billing_environment and workspace_id=$1
         and status in ('creating','open','pending') limit 1`,
        [workspace],
      )
      const paidChange = await c.query(
        `select 1 from app_private.billing_paid_change
         where environment=@billing_environment and workspace_id=$1 and status='dispatching' limit 1`,
        [workspace],
      )
      const periods = await c.query<{
        subscription_id: string
        tier: 'basic' | 'advanced'
        billing_interval: 'month' | 'year'
        ends_at: Date
      }>(
        `select subscription_id,tier,billing_interval,ends_at from app_private.billing_verified_period
         where environment=@billing_environment and workspace_id=$1 and superseded_at is null
           and starts_at<=now() and ends_at>now()
           and not exists (
             select 1 from app_private.billing_refund_case decision
             join app_private.billing_refund_case_application applied
               on applied.case_id=decision.id and applied.workspace_id=decision.workspace_id
             where decision.environment=billing_verified_period.environment
               and decision.store_id=billing_verified_period.store_id
               and decision.workspace_id=billing_verified_period.workspace_id
               and decision.subscription_id=billing_verified_period.subscription_id
               and decision.period_key=billing_verified_period.period_key
               and decision.decision='revoke_current' and applied.access_revoked_at<=now()
           )
         order by starts_at desc limit 2`,
        [workspace],
      )
      const confirmed = await c.query<{ confirmation: SubscriptionResource }>(
        `select confirmation from app_private.billing_cancellation
        where environment=@billing_environment and workspace_id=$1 and status='confirmed' and confirmation is not null
        order by confirmation->'attributes'->>'updated_at' desc`,
        [workspace],
      )
      const scheduledChange = await c.query<{
        target_tier: 'basic' | 'advanced'
        target_interval: 'month' | 'year'
        trial_ends_at: Date
      }>(
        `select target_tier,target_interval,trial_ends_at
         from app_private.billing_trial_change
         where environment=@billing_environment and workspace_id=$1 and status='confirmed'
           and subscription_id=$2
           and old_tier='advanced' and target_tier='basic' and trial_ends_at>now()
         order by confirmed_at desc,id desc limit 1`,
        [workspace, periods.rows[0]?.subscription_id ?? ''],
      )
      const current = subscriptions.rows.map(({ resource }) => {
        const result = confirmed.rows.find(
          (r) =>
            r.confirmation.id === resource.id &&
            r.confirmation.attributes.store_id === resource.attributes.store_id,
        )?.confirmation
        return result &&
          Date.parse(result.attributes.updated_at) > Date.parse(resource.attributes.updated_at)
          ? result
          : resource
      })
      return {
        subscriptions: current,
        invoices: invoices.rows.map((r) => r.resource),
        pendingCancellation: Boolean(pending.rowCount),
        pendingCheckout: Boolean(checkout.rowCount),
        pendingPaidChange: Boolean(paidChange.rowCount),
        scheduledChange: scheduledChange.rows[0]
          ? {
              tier: scheduledChange.rows[0].target_tier,
              interval: scheduledChange.rows[0].target_interval,
              effectiveAt: scheduledChange.rows[0].trial_ends_at,
            }
          : null,
        verifiedPeriod: periods.rows.length === 1 ? periods.rows[0]! : null,
      }
    })
  }
  invoice(identity: AuthenticatedIdentity, id: string) {
    return this.owned(identity, async (c, workspace) => {
      const result = await c.query<{ resource: InvoiceResource }>(
        `select resource from app_private.billing_invoice_ledger
         where environment=@billing_environment and workspace_id=$1 and provider_id=$2`,
        [workspace, id],
      )
      return result.rows[0]?.resource ?? null
    })
  }
  claimCancellation(identity: AuthenticatedIdentity): Promise<CancellationClaim> {
    return this.owned(identity, async (c, workspace) => {
      // The API role only reads the worker ledger; serialize its commands without UPDATE grants.
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `billing-subscription-command:${workspace}`,
      ])
      const rows = await c.query<{ resource: SubscriptionResource }>(
        `select s.resource from app_private.billing_subscription_ledger s
        where s.environment=@billing_environment and s.workspace_id=$1
          and s.resource->'attributes'->>'status'<>'expired'
          and exists (
            select 1 from app_private.billing_verified_period p
            where p.environment=s.environment and p.store_id=s.store_id
              and p.workspace_id=s.workspace_id and p.subscription_id=s.provider_id
              and p.superseded_at is null and p.starts_at<=now() and p.ends_at>now()
              and not exists (
                select 1 from app_private.billing_refund_case decision
                join app_private.billing_refund_case_application applied
                  on applied.case_id=decision.id and applied.workspace_id=decision.workspace_id
                where decision.environment=p.environment and decision.store_id=p.store_id
                  and decision.workspace_id=p.workspace_id
                  and decision.subscription_id=p.subscription_id and decision.period_key=p.period_key
                  and decision.decision='revoke_current' and applied.access_revoked_at<=now()
              )
          )
        order by s.resource->'attributes'->>'created_at' desc`,
        [workspace],
      )
      if (rows.rows.length !== 1)
        throw new BillingError(409, rows.rowCount ? 'subscription_conflict' : 'no_subscription')
      const resource = rows.rows[0]!.resource
      const paidChange = await c.query(
        `select 1 from app_private.billing_paid_change
         where environment=@billing_environment and workspace_id=$1 and subscription_id=$2
           and status='dispatching' limit 1`,
        [workspace, resource.id],
      )
      if (paidChange.rowCount) throw new BillingError(409, 'paid_change_pending')
      const scope = [workspace, resource.attributes.store_id, resource.id]
      const prior = (
        await c.query<{ id: string; status: string; confirmation: SubscriptionResource | null }>(
          `select id,status,confirmation from app_private.billing_cancellation where environment=@billing_environment
         and workspace_id=$1 and store_id=$2 and subscription_id=$3 order by created_at desc,id desc limit 1`,
          scope,
        )
      ).rows[0]
      if (
        prior &&
        (prior.status === 'pending' ||
          resource.attributes.cancelled ||
          (prior.confirmation &&
            Date.parse(prior.confirmation.attributes.updated_at) >=
              Date.parse(resource.attributes.updated_at)))
      ) {
        return {
          id: prior.id,
          subscriptionId: resource.id,
          storeId: resource.attributes.store_id,
          customerId: resource.attributes.customer_id,
          dispatch: false,
          confirmed: prior.status === 'confirmed',
        }
      }
      const inserted = await c.query<{
        id: string
        status: string
        confirmation: SubscriptionResource | null
      }>(
        `insert into app_private.billing_cancellation(environment,workspace_id,store_id,subscription_id,request_version)
        values(@billing_environment,$1,$2,$3,$4) returning id,status,confirmation`,
        [...scope, resource.attributes.updated_at],
      )
      const existing = inserted.rows[0]!
      return {
        id: existing.id,
        subscriptionId: resource.id,
        storeId: resource.attributes.store_id,
        customerId: resource.attributes.customer_id,
        dispatch: Boolean(inserted.rowCount),
        confirmed: existing.status === 'confirmed',
      }
    })
  }
  confirmCancellation(
    identity: AuthenticatedIdentity,
    claim: CancellationClaim,
    resource: SubscriptionResource,
  ) {
    return this.owned(identity, async (c, workspace) => {
      const prior = await c.query<{ resource: SubscriptionResource }>(
        `select resource from app_private.billing_subscription_ledger
        where environment=@billing_environment and workspace_id=$1 and store_id=$2 and provider_id=$3`,
        [workspace, claim.storeId, claim.subscriptionId],
      )
      if (!prior.rows[0]) throw new BillingError(404, 'not_found')
      const decision = resourceUpdate(prior.rows[0].resource, resource)
      if (
        decision === 'ignore' &&
        !prior.rows[0].resource.attributes.cancelled &&
        prior.rows[0].resource.attributes.status !== 'expired'
      ) {
        throw new BillingError(409, 'subscription_changed')
      }
      // Preserve the verified response in the owning command while the event ledger catches up.
      await c.query(
        `update app_private.billing_cancellation set status='confirmed',confirmed_at=now(),confirmation=$5
        where id=$1 and environment=@billing_environment and workspace_id=$2 and store_id=$3 and subscription_id=$4`,
        [claim.id, workspace, claim.storeId, claim.subscriptionId, JSON.stringify(resource)],
      )
    })
  }
}
