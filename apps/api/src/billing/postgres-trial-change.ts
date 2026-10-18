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
import { resourceUpdate, type SubscriptionResource } from './resources.js'
import type {
  TrialChangeCandidate,
  TrialChangeClaim,
  TrialChangeRepository,
} from './trial-change.js'

type TrialRow = {
  id: string
  store_id: string
  subscription_id: string
  old_variant_id: string
  target_variant_id: string
  trial_ends_at: Date
  request_version: Date
  baseline_invoice_ids: string[]
  status: 'pending' | 'confirmed'
}

/** Owner-scoped Test Mode command store. The provider remains the subscription authority. */
export class PostgresTrialChange implements TrialChangeRepository {
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
    work: (client: PoolClient, workspaceId: string) => Promise<T>,
  ) {
    return billingTransaction(this.pool, async (client) => {
      const workspace = await client.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [identity.userId],
      )
      const workspaceId = workspace.rows[0]?.id
      if (!workspaceId) throw new BillingError(404, 'workspace_not_found')
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `billing-trial-change:${workspaceId}`,
      ])
      return work(client, workspaceId)
    })
  }

  private async candidate(
    client: PoolClient,
    workspaceId: string,
    requested: BillingSelection,
  ): Promise<TrialChangeCandidate | null> {
    const rows = await client.query<{
      store_id: string
      subscription_id: string
      tier: 'basic' | 'advanced'
      billing_interval: 'month' | 'year'
      ends_at: Date
      resource: SubscriptionResource
    }>(
      `select p.store_id,p.subscription_id,p.tier,p.billing_interval,p.ends_at,s.resource
       from app_private.billing_verified_period p
       join app_private.billing_subscription_ledger s
         on s.environment=p.environment and s.store_id=p.store_id
        and s.provider_id=p.subscription_id and s.workspace_id=p.workspace_id
       where p.environment=@billing_environment and p.workspace_id=$1 and p.origin='trial' and p.ends_at>now()
       order by p.starts_at desc limit 2`,
      [workspaceId],
    )
    if (rows.rows.length !== 1)
      throw new BillingError(409, rows.rowCount ? 'subscription_conflict' : 'no_trial')
    const row = rows.rows[0]!
    const latest = await client.query<{
      target_tier: 'basic' | 'advanced'
      target_interval: 'month' | 'year'
      confirmation: SubscriptionResource
    }>(
      `select target_tier,target_interval,confirmation
       from app_private.billing_trial_change
       where environment=@billing_environment and workspace_id=$1 and store_id=$2 and subscription_id=$3
         and status='confirmed' and confirmation is not null
       order by confirmed_at desc,id desc limit 1`,
      [workspaceId, row.store_id, row.subscription_id],
    )
    const confirmed = latest.rows[0]
    const resource =
      confirmed &&
      Date.parse(confirmed.confirmation.attributes.updated_at) >=
        Date.parse(row.resource.attributes.updated_at)
        ? confirmed.confirmation
        : row.resource
    const current = confirmed
      ? { tier: confirmed.target_tier, interval: confirmed.target_interval }
      : { tier: row.tier, interval: row.billing_interval }
    if (current.tier === requested.tier && current.interval === requested.interval) return null
    if (
      (current.tier === 'advanced' && requested.tier === 'basic') ||
      (current.interval === 'year' && requested.interval === 'month')
    )
      throw new BillingError(409, 'downgrade_unavailable')
    const targetVariantId = this.variants[`${requested.tier}_${requested.interval}`]
    if (!targetVariantId) throw new BillingError(503, 'billing_unavailable')
    const trialEndsAt = resource.attributes.trial_ends_at
    if (
      resource.type !== 'subscriptions' ||
      resource.attributes.status !== 'on_trial' ||
      resource.attributes.cancelled ||
      !trialEndsAt ||
      Date.parse(trialEndsAt) !== row.ends_at.getTime() ||
      Date.parse(trialEndsAt) <= Date.now()
    )
      throw new BillingError(409, 'trial_changed')
    return {
      subscriptionId: resource.id,
      storeId: resource.attributes.store_id,
      customerId: resource.attributes.customer_id,
      oldVariantId: resource.attributes.variant_id,
      targetVariantId,
      trialEndsAt,
      requestVersion: resource.attributes.updated_at,
    }
  }

  preview(identity: AuthenticatedIdentity, requested: BillingSelection) {
    return this.owned(identity, (client, workspaceId) =>
      this.candidate(client, workspaceId, requested),
    )
  }

  claim(
    identity: AuthenticatedIdentity,
    candidate: TrialChangeCandidate,
    baselineInvoiceIds: string[],
  ) {
    return this.owned(identity, async (client, workspaceId) => {
      const existing = await client.query<TrialRow>(
        `select id,store_id,subscription_id,old_variant_id,target_variant_id,trial_ends_at,
                request_version,baseline_invoice_ids,status
         from app_private.billing_trial_change
         where environment=@billing_environment and workspace_id=$1 and store_id=$2 and subscription_id=$3
           and status='pending' order by created_at desc,id desc limit 1`,
        [workspaceId, candidate.storeId, candidate.subscriptionId],
      )
      if (existing.rows[0]) {
        const row = existing.rows[0]
        if (row.target_variant_id !== candidate.targetVariantId)
          throw new BillingError(409, 'trial_change_pending')
        return this.toClaim(row, candidate.customerId, false)
      }
      const requested = this.selectionForVariant(candidate.targetVariantId)
      if (!requested) throw new BillingError(503, 'billing_unavailable')
      const fresh = await this.candidate(client, workspaceId, requested)
      if (
        !fresh ||
        fresh.subscriptionId !== candidate.subscriptionId ||
        fresh.storeId !== candidate.storeId ||
        fresh.customerId !== candidate.customerId ||
        fresh.oldVariantId !== candidate.oldVariantId ||
        fresh.targetVariantId !== candidate.targetVariantId ||
        fresh.trialEndsAt !== candidate.trialEndsAt ||
        fresh.requestVersion !== candidate.requestVersion
      )
        return null
      const old = this.selectionForVariant(candidate.oldVariantId)
      if (!old) throw new BillingError(409, 'unknown_current_variant')
      const inserted = await client.query<TrialRow>(
        `insert into app_private.billing_trial_change
          (environment,store_id,subscription_id,workspace_id,old_variant_id,target_variant_id,
           old_tier,old_interval,target_tier,target_interval,trial_ends_at,request_version,
           baseline_invoice_ids)
         values(@billing_environment,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning id,store_id,subscription_id,old_variant_id,target_variant_id,trial_ends_at,
                   request_version,baseline_invoice_ids,status`,
        [
          candidate.storeId,
          candidate.subscriptionId,
          workspaceId,
          candidate.oldVariantId,
          candidate.targetVariantId,
          old.tier,
          old.interval,
          requested.tier,
          requested.interval,
          candidate.trialEndsAt,
          candidate.requestVersion,
          JSON.stringify([...new Set(baselineInvoiceIds)].sort()),
        ],
      )
      return this.toClaim(inserted.rows[0]!, candidate.customerId, true)
    })
  }

  confirm(
    identity: AuthenticatedIdentity,
    claim: TrialChangeClaim,
    resource: SubscriptionResource,
  ) {
    return this.owned(identity, async (client, workspaceId) => {
      const command = await client.query<{
        old_tier: 'basic' | 'advanced'
        target_tier: 'basic' | 'advanced'
        target_interval: 'month' | 'year'
      }>(
        `select old_tier,target_tier,target_interval from app_private.billing_trial_change
         where id=$1 and environment=@billing_environment and workspace_id=$2 and store_id=$3
           and subscription_id=$4 and status='pending' for update`,
        [claim.id, workspaceId, claim.storeId, claim.subscriptionId],
      )
      const row = command.rows[0]
      if (!row) throw new BillingError(409, 'trial_change_changed')
      const ledger = await client.query<{ resource: SubscriptionResource }>(
        `select resource from app_private.billing_subscription_ledger
         where environment=@billing_environment and workspace_id=$1 and store_id=$2 and provider_id=$3`,
        [workspaceId, claim.storeId, claim.subscriptionId],
      )
      const prior = ledger.rows[0]?.resource
      if (!prior || resourceUpdate(prior, resource) === 'ignore')
        throw new BillingError(409, 'subscription_changed')
      await client.query(
        `update app_private.billing_trial_change
         set status='confirmed',confirmed_at=now(),confirmation=$5
         where id=$1 and environment=@billing_environment and workspace_id=$2 and store_id=$3
           and subscription_id=$4 and status='pending'`,
        [claim.id, workspaceId, claim.storeId, claim.subscriptionId, JSON.stringify(resource)],
      )
      // Cadence changes affect the first charge. A tier upgrade grants Prime now; a Prime-to-Pro
      // downgrade deliberately keeps Prime rights through the original trial end.
      await client.query(
        `update app_private.billing_verified_period
         set tier=case when $5='advanced' then 'advanced' else tier end,
             billing_interval=case when $4=$5 then $6 else billing_interval end,
             subscription_version=$7,verified_at=now()
         where environment=@billing_environment and workspace_id=$1 and store_id=$2
           and subscription_id=$3 and origin='trial' and ends_at>now()`,
        [
          workspaceId,
          claim.storeId,
          claim.subscriptionId,
          row.old_tier,
          row.target_tier,
          row.target_interval,
          resource.attributes.updated_at,
        ],
      )
    })
  }

  private selectionForVariant(variantId: string): BillingSelection | null {
    for (const [key, value] of Object.entries(this.variants)) {
      if (value !== variantId) continue
      const [tier, interval] = key.split('_')
      if (
        (tier === 'basic' || tier === 'advanced') &&
        (interval === 'month' || interval === 'year')
      )
        return { tier, interval }
    }
    return null
  }

  private toClaim(row: TrialRow, customerId: string, dispatch: boolean): TrialChangeClaim {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      storeId: row.store_id,
      customerId,
      oldVariantId: row.old_variant_id,
      targetVariantId: row.target_variant_id,
      trialEndsAt: row.trial_ends_at.toISOString(),
      baselineInvoiceIds: row.baseline_invoice_ids,
      dispatch,
      confirmed: row.status === 'confirmed',
    }
  }
}
