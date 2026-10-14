import type { Pool, PoolClient } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { BillingError } from './checkout.js'
import { billingTransaction } from './postgres-inbox.js'
import { resourceUpdate, type InvoiceResource, type SubscriptionResource } from './resources.js'
import type { BillingManagementRepository, CancellationClaim } from './management.js'

export class PostgresBillingManagement implements BillingManagementRepository {
  constructor(private readonly pool: Pool) {}
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
      const subscriptions = await c.query<{ resource: SubscriptionResource }>(
        `select resource from app_private.billing_subscription_ledger
        where environment='test' and workspace_id=$1 order by resource->'attributes'->>'created_at' desc`,
        [workspace],
      )
      const invoices = await c.query<{ resource: InvoiceResource }>(
        `select resource from app_private.billing_invoice_ledger
        where environment='test' and workspace_id=$1 order by resource->'attributes'->>'created_at' desc limit 100`,
        [workspace],
      )
      const pending = await c.query(
        `select 1 from app_private.billing_cancellation where environment='test' and workspace_id=$1 and status='pending' limit 1`,
        [workspace],
      )
      const confirmed = await c.query<{ confirmation: SubscriptionResource }>(
        `select confirmation from app_private.billing_cancellation
        where environment='test' and workspace_id=$1 and status='confirmed' and confirmation is not null
        order by confirmation->'attributes'->>'updated_at' desc`,
        [workspace],
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
      }
    })
  }
  claimCancellation(identity: AuthenticatedIdentity): Promise<CancellationClaim> {
    return this.owned(identity, async (c, workspace) => {
      // The API role only reads the worker ledger; serialize its commands without UPDATE grants.
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `billing-cancel:${workspace}`,
      ])
      const rows = await c.query<{ resource: SubscriptionResource }>(
        `select resource from app_private.billing_subscription_ledger
        where environment='test' and workspace_id=$1 and resource->'attributes'->>'status'<>'expired'
        order by resource->'attributes'->>'created_at' desc`,
        [workspace],
      )
      if (rows.rows.length !== 1)
        throw new BillingError(409, rows.rowCount ? 'subscription_conflict' : 'no_subscription')
      const resource = rows.rows[0]!.resource
      const scope = [workspace, resource.attributes.store_id, resource.id]
      const prior = (
        await c.query<{ id: string; status: string; confirmation: SubscriptionResource | null }>(
          `select id,status,confirmation from app_private.billing_cancellation where environment='test'
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
        `insert into app_private.billing_cancellation(workspace_id,store_id,subscription_id,request_version)
        values($1,$2,$3,$4) returning id,status,confirmation`,
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
        where environment='test' and workspace_id=$1 and store_id=$2 and provider_id=$3`,
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
        where id=$1 and environment='test' and workspace_id=$2 and store_id=$3 and subscription_id=$4`,
        [claim.id, workspace, claim.storeId, claim.subscriptionId, JSON.stringify(resource)],
      )
    })
  }
}
