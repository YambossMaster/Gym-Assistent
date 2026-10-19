import type { Pool, PoolClient } from 'pg'
import {
  effectiveBillingEnvironment,
  scopedBillingPool,
  type BillingEnvironment,
} from './billing-sql.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { BillingError } from './checkout.js'
import { billingTransaction } from './postgres-inbox.js'
import type { BillingSelection } from './policy.js'
import { upgradeSettlementReference } from './subscription-policy.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'
import type { PaidChangeClaim, PaidChangePreview, PaidChangeRepository } from './paid-change.js'

type Period = {
  store_id: string
  subscription_id: string
  period_key: string
  tier: 'basic' | 'advanced'
  billing_interval: 'month' | 'year'
  starts_at: Date
  ends_at: Date
  invoice_id: string
  resource: SubscriptionResource
}
type Command = {
  id: string
  store_id: string
  subscription_id: string
  from_variant_id: string
  target_variant_id: string
  subscription_version: Date
  period_key: string
  period_ends_at: Date
  status: 'previewed' | 'dispatching' | 'confirmed'
  expires_at: Date
}

/** All reads and command writes are owner scoped; the browser supplies only a target or preview ID. */
export class PostgresPaidChange implements PaidChangeRepository {
  private readonly pool: Pool
  constructor(
    pool: Pool,
    private readonly variants: Record<string, string>,
    environment?: BillingEnvironment,
  ) {
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
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `billing-subscription-command:${workspace}`,
      ])
      const permanent = await c.query(
        "select 1 from app_private.beta_grant where workspace_id=$1 and kind='permanent'",
        [workspace],
      )
      if (permanent.rowCount) throw new BillingError(409, 'permanent_access')
      return work(c, workspace)
    })
  }

  private async resolve(c: PoolClient, workspace: string) {
    // Only the worker's invoice-backed verified period can close a charge command.
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
  }

  private async active(c: PoolClient, workspace: string): Promise<Period> {
    const periods = await c.query<Period>(
      `select p.store_id,p.subscription_id,p.period_key,p.tier,p.billing_interval,
              p.starts_at,p.ends_at,p.invoice_id,s.resource
       from app_private.billing_verified_period p
       join app_private.billing_subscription_ledger s
         on s.environment=p.environment and s.store_id=p.store_id
        and s.provider_id=p.subscription_id and s.workspace_id=p.workspace_id
       where p.environment=@billing_environment and p.workspace_id=$1 and p.origin in ('payment','renewal')
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
       order by p.starts_at desc limit 2`,
      [workspace],
    )
    if (periods.rows.length !== 1) throw new BillingError(409, 'paid_period_unavailable')
    const row = periods.rows[0]!
    if (
      row.resource.attributes.status !== 'active' ||
      row.resource.attributes.cancelled ||
      row.resource.attributes.payment_processor !== 'stripe' ||
      row.resource.attributes.trial_ends_at !== null ||
      row.resource.attributes.variant_id !== this.variants[`${row.tier}_${row.billing_interval}`] ||
      !row.invoice_id
    )
      throw new BillingError(409, 'subscription_changed')
    return row
  }

  async preview(
    identity: AuthenticatedIdentity,
    requested: BillingSelection,
  ): Promise<PaidChangePreview> {
    return this.owned(identity, async (c, workspace) => {
      await this.resolve(c, workspace)
      const row = await this.active(c, workspace)
      const pending = await c.query(
        `select 1 from app_private.billing_paid_change
         where environment=@billing_environment and workspace_id=$1 and subscription_id=$2
           and status='dispatching' limit 1`,
        [workspace, row.subscription_id],
      )
      if (pending.rowCount) throw new BillingError(409, 'paid_change_pending')
      const blocking = await c.query(
        `select 1 from app_private.billing_cancellation
         where environment=@billing_environment and workspace_id=$1 and subscription_id=$2 limit 1`,
        [workspace, row.subscription_id],
      )
      if (blocking.rowCount) throw new BillingError(409, 'subscription_cancelling')
      const annual =
        row.tier === 'advanced' &&
        row.billing_interval === 'month' &&
        requested.tier === 'advanced' &&
        requested.interval === 'year'
      const upgrade =
        row.tier === 'basic' &&
        row.billing_interval === 'month' &&
        requested.tier === 'advanced' &&
        requested.interval === 'month'
      if (!annual && !upgrade) throw new BillingError(409, 'paid_change_unavailable')
      const invoices = await c.query<{ resource: InvoiceResource }>(
        `select resource from app_private.billing_invoice_ledger
         where environment=@billing_environment and workspace_id=$1 and store_id=$2 and subscription_id=$3
           and (resource->'attributes'->>'created_at')::timestamptz >= $4
           and (resource->'attributes'->>'created_at')::timestamptz < now()`,
        [workspace, row.store_id, row.subscription_id, row.starts_at],
      )
      const paid = invoices.rows
        .map(({ resource }) => resource)
        .filter(
          (i) =>
            i.attributes.status === 'paid' &&
            i.attributes.refunded_amount === 0 &&
            i.attributes.currency === 'TWD' &&
            i.attributes.subtotal > 0 &&
            ['initial', 'renewal', 'updated'].includes(i.attributes.billing_reason),
        )
      if (
        !paid.some((i) => i.id === row.invoice_id) ||
        invoices.rows.some(
          ({ resource }) =>
            resource.attributes.status !== 'paid' ||
            resource.attributes.refunded_amount !== 0 ||
            resource.attributes.currency !== 'TWD',
        )
      )
        throw new BillingError(409, 'paid_evidence_unavailable')
      const creditable = paid.reduce((total, i) => total + i.attributes.subtotal, 0)
      const now = new Date()
      const remaining = row.ends_at.getTime() - now.getTime()
      const duration = row.ends_at.getTime() - row.starts_at.getTime()
      if (!Number.isSafeInteger(creditable) || creditable <= 0 || duration <= 0 || remaining <= 0)
        throw new BillingError(409, 'paid_evidence_unavailable')
      const estimate = annual
        ? upgradeSettlementReference({
            creditablePaid: { amountMinor: creditable, currency: 'TWD' },
            newPeriodPrice: { amountMinor: 145000, currency: 'TWD' },
            periodStartedAt: row.starts_at,
            periodEndsAt: row.ends_at,
            changeAt: now,
          }).dueNowMinor
        : Math.round(((14500 - creditable) * remaining) / duration)
      if (!Number.isSafeInteger(estimate) || estimate <= 0)
        throw new BillingError(409, 'paid_evidence_unavailable')
      const targetVariant = this.variants[`${requested.tier}_${requested.interval}`]
      if (!targetVariant) throw new BillingError(503, 'billing_unavailable')
      const expiresAt = new Date(now.getTime() + 120000)
      const inserted = await c.query<{ id: string }>(
        `insert into app_private.billing_paid_change
         (environment,store_id,subscription_id,workspace_id,from_variant_id,target_variant_id,target_tier,
          target_interval,subscription_version,period_key,period_ends_at,estimate_minor,expires_at)
         values(@billing_environment,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
        [
          row.store_id,
          row.subscription_id,
          workspace,
          row.resource.attributes.variant_id,
          targetVariant,
          requested.tier,
          requested.interval,
          row.resource.attributes.updated_at,
          row.period_key,
          row.ends_at,
          estimate,
          expiresAt,
        ],
      )
      return {
        id: inserted.rows[0]!.id,
        tier: requested.tier,
        interval: requested.interval,
        estimate: { amount: estimate, currency: 'TWD' },
        expiresAt: expiresAt.toISOString(),
      }
    })
  }

  async claim(identity: AuthenticatedIdentity, previewId: string): Promise<PaidChangeClaim> {
    return this.owned(identity, async (c, workspace) => {
      await this.resolve(c, workspace)
      const query = await c.query<Command>(
        `select id,store_id,subscription_id,from_variant_id,target_variant_id,
                subscription_version,period_key,period_ends_at,status,expires_at
         from app_private.billing_paid_change where id=$1 and environment=@billing_environment and workspace_id=$2
         for update`,
        [previewId, workspace],
      )
      const row = query.rows[0]
      if (!row) throw new BillingError(404, 'paid_change_preview_not_found')
      const owned = await c.query<{ resource: SubscriptionResource }>(
        `select resource from app_private.billing_subscription_ledger
         where environment=@billing_environment and workspace_id=$1 and store_id=$2 and provider_id=$3`,
        [workspace, row.store_id, row.subscription_id],
      )
      const customerId = owned.rows[0]?.resource.attributes.customer_id
      if (!customerId) throw new BillingError(409, 'subscription_changed')
      const base = {
        id: row.id,
        subscriptionId: row.subscription_id,
        storeId: row.store_id,
        customerId,
        fromVariantId: row.from_variant_id,
        targetVariantId: row.target_variant_id,
      }
      if (row.status !== 'previewed') return { ...base, dispatch: false }
      if (row.expires_at.getTime() <= Date.now())
        throw new BillingError(409, 'paid_change_preview_expired')
      const period = await this.active(c, workspace)
      const cancellation = await c.query(
        `select 1 from app_private.billing_cancellation
         where environment=@billing_environment and workspace_id=$1 and subscription_id=$2 limit 1`,
        [workspace, row.subscription_id],
      )
      if (cancellation.rowCount) throw new BillingError(409, 'subscription_cancelling')
      if (
        period.subscription_id !== row.subscription_id ||
        period.store_id !== row.store_id ||
        period.period_key !== row.period_key ||
        period.ends_at.getTime() !== row.period_ends_at.getTime() ||
        Date.parse(period.resource.attributes.updated_at) !== row.subscription_version.getTime() ||
        period.resource.attributes.variant_id !== row.from_variant_id
      )
        throw new BillingError(409, 'paid_change_preview_expired')
      const pending = await c.query(
        `select 1 from app_private.billing_paid_change
         where environment=@billing_environment and workspace_id=$1 and subscription_id=$2
           and status='dispatching' limit 1`,
        [workspace, row.subscription_id],
      )
      if (pending.rowCount) throw new BillingError(409, 'paid_change_pending')
      await c.query(
        `update app_private.billing_paid_change
         set status='dispatching',dispatched_at=now() where id=$1 and status='previewed'`,
        [row.id],
      )
      return { ...base, dispatch: true }
    })
  }
}
