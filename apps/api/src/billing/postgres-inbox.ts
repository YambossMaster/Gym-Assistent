import { createHash, randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import {
  effectiveBillingEnvironment,
  scopedBillingPool,
  type BillingEnvironment,
} from './billing-sql.js'
import type { BillingInboxRepository, BillingJob, BillingNotification } from './event-inbox.js'
import {
  ReconciliationError,
  resourceUpdate,
  type BillingResource,
  type SubscriptionResource,
} from './resources.js'
import {
  initialPeriod,
  paidMonthlyTierUpgrade,
  paidMonthlyToAnnualSwitch,
  renewalPeriod,
} from './period-authority.js'

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
  private readonly pool: Pool
  private readonly environment: BillingEnvironment
  constructor(
    pool: Pool,
    private readonly variants: Record<string, string>,
    environment?: BillingEnvironment,
  ) {
    this.environment = effectiveBillingEnvironment(environment)
    this.pool = scopedBillingPool(pool, this.environment)
  }
  async boundSubscriptionsAfter(
    storeId: string,
    cursor: string | null,
    limit: number,
  ): Promise<
    Array<{
      id: string
      intentId: string
    }>
  > {
    const result = await this.pool.query<{ provider_id: string; intent_id: string }>(
      `select provider_id,intent_id from app_private.billing_subscription_ledger
       where environment=@billing_environment and store_id=$1 and ($2::text is null or provider_id>$2)
       order by provider_id limit $3`,
      [storeId, cursor, limit],
    )
    return result.rows.map((row) => ({ id: row.provider_id, intentId: row.intent_id }))
  }
  async receive(notification: BillingNotification) {
    await this.pool.query(
      `insert into app_private.billing_event_inbox(environment,digest,notification)
      values(@billing_environment,$1,$2) on conflict(environment,digest) do nothing`,
      [notification.digest, JSON.stringify(notification)],
    )
  }
  async claim(now: Date): Promise<BillingJob | null> {
    await this.pool.query(
      `update app_private.billing_event_inbox set status='dead',error_code='attempts_exhausted',
      lease_token=null,lease_until=null where environment=@billing_environment and status='processing' and attempts>=8 and lease_until<=$1`,
      [now],
    )
    const lease = randomUUID()
    const result = await this.pool.query<{
      id: string
      notification: BillingNotification
      attempts: number
    }>(
      `with candidate as (
        select id from app_private.billing_event_inbox where environment=@billing_environment and
        attempts<8 and ((status='queued' and next_attempt_at<=$1) or (status='processing' and lease_until<=$1))
        order by created_at for update skip locked limit 1
      ) update app_private.billing_event_inbox e set status='processing',lease_token=$2,
        lease_until=$1::timestamptz+interval '60 seconds',attempts=e.attempts+1
        from candidate c where e.id=c.id returning e.id,e.notification,e.attempts`,
      [now, lease],
    )
    const row = result.rows[0]
    return row
      ? {
          ...row.notification,
          id: row.id,
          lease,
          attempts: row.attempts,
        }
      : null
  }
  async commit(job: BillingJob, resource: BillingResource, now: Date) {
    await billingTransaction(this.pool, async (c) => {
      const held = await c.query(
        `select id from app_private.billing_event_inbox where id=$1 and
        environment=@billing_environment and status='processing' and lease_token=$2 and lease_until>$3 for update`,
        [job.id, job.lease, now],
      )
      if (!held.rowCount) throw new ReconciliationError('lease_lost')
      const subscriptionId =
        resource.type === 'subscriptions' ? resource.id : resource.attributes.subscription_id
      // Serialize first binding too, when the row does not exist yet.
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `billing:${this.environment}:${job.storeId}:${subscriptionId}`,
      ])
      const binding = await c.query<{
        workspace_id: string
        customer_id: string
        intent_id: string
        resource: BillingResource
      }>(
        `select workspace_id,customer_id,intent_id,resource from app_private.billing_subscription_ledger
         where environment=@billing_environment and store_id=$1 and provider_id=$2 for update`,
        [job.storeId, subscriptionId],
      )
      const owner = binding.rows[0]
      let currentSubscription: SubscriptionResource | null =
        resource.type === 'subscriptions' ? resource : null
      if (!owner) {
        if (resource.type !== 'subscriptions' || !job.intentId)
          throw new ReconciliationError('binding_not_ready', true)
        // Two different subscriptions can present the same copied checkout proof at once.
        // Serialize by intent as well as subscription before checking one-time use.
        await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
          `billing:${this.environment}:intent:${job.intentId}`,
        ])
        const intent = await c.query<{
          workspace_id: string
          variant_key: string
          created_at: Date
          expires_at: string
        }>(
          `select i.workspace_id,(q.quote->>'tier')||'_'||(q.quote->>'interval') variant_key,
          i.created_at,i.intent->>'expiresAt' expires_at
          from app_private.billing_checkout_intent i join app_private.billing_checkout_quote q on q.id=i.quote_id
          where i.id=$1 and i.environment=@billing_environment and q.environment=@billing_environment and q.workspace_id=i.workspace_id`,
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
        const priorIntentBinding = await c.query<{ provider_id: string }>(
          `select provider_id from app_private.billing_subscription_ledger
           where environment=@billing_environment and intent_id=$1`,
          [job.intentId],
        )
        if (priorIntentBinding.rows.length) throw new ReconciliationError('checkout_proof_replay')
        await c.query(
          `insert into app_private.billing_subscription_ledger
          (environment,store_id,provider_id,workspace_id,intent_id,customer_id,resource,reconciled_at)
          values(@billing_environment,$1,$2,$3,$4,$5,$6,$7)`,
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
        if (job.intentId && job.intentId !== owner.intent_id)
          throw new ReconciliationError('intent_binding_mismatch')
        if (owner.customer_id !== resource.attributes.customer_id)
          throw new ReconciliationError('customer_mismatch')
        if (resource.type === 'subscriptions') {
          if (resourceUpdate(owner.resource, resource) === 'apply') {
            await c.query(
              `update app_private.billing_subscription_ledger set resource=$3,reconciled_at=$4
              where environment=@billing_environment and store_id=$1 and provider_id=$2`,
              [job.storeId, resource.id, JSON.stringify(resource), now],
            )
          } else currentSubscription = owner.resource as SubscriptionResource
        } else {
          const prior = await c.query<{ resource: BillingResource }>(
            `select resource from app_private.billing_invoice_ledger
            where environment=@billing_environment and store_id=$1 and provider_id=$2 for update`,
            [job.storeId, resource.id],
          )
          if (resourceUpdate(prior.rows[0]?.resource ?? null, resource) === 'apply') {
            await c.query(
              `insert into app_private.billing_invoice_ledger
              (environment,store_id,provider_id,subscription_id,workspace_id,resource,reconciled_at) values(@billing_environment,$1,$2,$3,$4,$5,$6)
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
      const authoritative = await c.query<{
        workspace_id: string
        intent_id: string
        resource: SubscriptionResource
      }>(
        `select workspace_id,intent_id,resource from app_private.billing_subscription_ledger
         where environment=@billing_environment and store_id=$1 and provider_id=$2`,
        [job.storeId, subscriptionId],
      )
      const bound = authoritative.rows[0]!
      const intent = await c.query<{
        status: string
        quote: {
          tier: 'basic' | 'advanced'
          interval: 'month' | 'year'
          trial: string | null
        }
      }>(
        `select i.status,q.quote from app_private.billing_checkout_intent i
         join app_private.billing_checkout_quote q on q.id=i.quote_id
         where i.id=$1 and i.workspace_id=$2 and i.environment=@billing_environment`,
        [bound.intent_id, bound.workspace_id],
      )
      const checkout = intent.rows[0]
      if (!checkout) throw new ReconciliationError('intent_binding_mismatch')
      const confirmedTrialChange = await c.query<{
        target_tier: 'basic' | 'advanced'
        target_interval: 'month' | 'year'
        target_variant_id: string
      }>(
        `select target_tier,target_interval,target_variant_id
         from app_private.billing_trial_change
         where environment=@billing_environment and workspace_id=$1 and store_id=$2 and subscription_id=$3
           and status='confirmed'
         order by confirmed_at desc,id desc limit 1`,
        [bound.workspace_id, job.storeId, subscriptionId],
      )
      let effective = confirmedTrialChange.rows[0] ?? {
        target_tier: checkout.quote.tier,
        target_interval: checkout.quote.interval,
        target_variant_id: this.variants[`${checkout.quote.tier}_${checkout.quote.interval}`],
      }
      const basicMonthVariant = this.variants.basic_month
      const advancedMonthVariant = this.variants.advanced_month
      if (!basicMonthVariant || !advancedMonthVariant)
        throw new ReconciliationError('unknown_variant')
      if (effective.target_variant_id !== bound.resource.attributes.variant_id) {
        const paidPeriod = await c.query<{
          period_key: string
          tier: string
          billing_interval: string
          starts_at: Date
          ends_at: Date
          invoice_id: string | null
        }>(
          `select period_key,tier,billing_interval,starts_at,ends_at,invoice_id
           from app_private.billing_verified_period
           where environment=@billing_environment and store_id=$1 and subscription_id=$2
             and origin in ('payment','renewal') and superseded_at is null
             and starts_at<=$3 and ends_at>$3
           order by ends_at desc limit 2`,
          [job.storeId, subscriptionId, now],
        )
        if (paidPeriod.rows.length !== 1) throw new ReconciliationError('period_variant_mismatch')
        const period = paidPeriod.rows[0]!
        const periodVariant = this.variants[`${period.tier}_${period.billing_interval}`]
        const previouslyVerified = await c.query<{ invoice_id: string }>(
          `select invoice_id from app_private.billing_paid_upgrade_evidence
           where environment=@billing_environment and store_id=$1 and subscription_id=$2
             and period_key=$3 order by verified_at desc limit 1`,
          [job.storeId, subscriptionId, period.period_key],
        )
        if (
          periodVariant === bound.resource.attributes.variant_id &&
          (previouslyVerified.rowCount ||
            (period.period_key === `change:${period.invoice_id}` && period.invoice_id !== null))
        ) {
          effective = {
            target_tier: period.tier as 'basic' | 'advanced',
            target_interval: period.billing_interval as 'month' | 'year',
            target_variant_id: periodVariant,
          }
        } else if (
          resource.type === 'subscriptions' &&
          owner?.resource.type === 'subscriptions' &&
          period.tier === 'basic' &&
          period.billing_interval === 'month' &&
          effective.target_variant_id === basicMonthVariant &&
          bound.resource.attributes.variant_id === advancedMonthVariant
        ) {
          const updated = await c.query<{
            resource: import('./resources.js').InvoiceResource
          }>(
            `select resource from app_private.billing_invoice_ledger
             where environment=@billing_environment and store_id=$1 and subscription_id=$2
               and resource#>>'{attributes,billing_reason}'='updated'
               and resource#>>'{attributes,status}'='paid'
             order by resource->'attributes'->>'created_at' desc limit 2`,
            [job.storeId, subscriptionId],
          )
          const matches = updated.rows
            .map((row) =>
              paidMonthlyTierUpgrade(
                owner.resource as SubscriptionResource,
                bound.resource,
                row.resource,
                {
                  tier: period.tier,
                  billingInterval: period.billing_interval,
                  startsAt: period.starts_at.toISOString(),
                  endsAt: period.ends_at.toISOString(),
                },
                { basicMonth: basicMonthVariant, advancedMonth: advancedMonthVariant },
              ),
            )
            .filter((evidence) => evidence !== null)
          if (matches.length !== 1)
            throw new ReconciliationError(
              matches.length ? 'paid_upgrade_invoice_conflict' : 'paid_upgrade_payment_pending',
              matches.length === 0,
            )
          const evidence = matches[0]!
          const recorded = await c.query(
            `insert into app_private.billing_paid_upgrade_evidence
             (environment,store_id,subscription_id,workspace_id,invoice_id,from_variant_id,to_variant_id,
              period_key,period_ends_at,subscription_version)
             values(@billing_environment,$1,$2,$3,$4,$5,$6,$7,$8,$9)
             on conflict(environment,store_id,subscription_id,invoice_id) do nothing`,
            [
              job.storeId,
              subscriptionId,
              bound.workspace_id,
              evidence.invoiceId,
              basicMonthVariant,
              advancedMonthVariant,
              period.period_key,
              evidence.periodEndsAt,
              evidence.subscriptionVersion,
            ],
          )
          if (recorded.rowCount !== 1) throw new ReconciliationError('paid_upgrade_replay_conflict')
          const changed = await c.query(
            `update app_private.billing_verified_period
             set tier='advanced',subscription_version=$5,verified_at=$6
             where environment=@billing_environment and store_id=$1 and subscription_id=$2
               and period_key=$3 and tier='basic' and billing_interval='month'
               and ends_at=$4`,
            [
              job.storeId,
              subscriptionId,
              period.period_key,
              period.ends_at,
              evidence.subscriptionVersion,
              now,
            ],
          )
          if (changed.rowCount !== 1) throw new ReconciliationError('paid_upgrade_period_changed')
          effective = {
            target_tier: 'advanced',
            target_interval: 'month',
            target_variant_id: advancedMonthVariant,
          }
        } else if (
          resource.type === 'subscriptions' &&
          owner?.resource.type === 'subscriptions' &&
          period.billing_interval === 'month' &&
          owner.resource.attributes.variant_id === periodVariant &&
          bound.resource.attributes.variant_id === this.variants[`${period.tier}_year`]
        ) {
          const updated = await c.query<{
            resource: import('./resources.js').InvoiceResource
          }>(
            `select resource from app_private.billing_invoice_ledger
             where environment=@billing_environment and store_id=$1 and subscription_id=$2
               and resource#>>'{attributes,billing_reason}'='updated'
               and resource#>>'{attributes,status}'='paid'
             order by resource->'attributes'->>'created_at' desc limit 3`,
            [job.storeId, subscriptionId],
          )
          const matches = updated.rows
            .map((row) =>
              paidMonthlyToAnnualSwitch(
                owner.resource as SubscriptionResource,
                bound.resource,
                row.resource,
                {
                  tier: period.tier,
                  billingInterval: period.billing_interval,
                  startsAt: period.starts_at.toISOString(),
                  endsAt: period.ends_at.toISOString(),
                },
                {
                  currentMonth: periodVariant,
                  targetYear: this.variants[`${period.tier}_year`]!,
                },
              ),
            )
            .filter((evidence) => evidence !== null)
          if (matches.length !== 1)
            throw new ReconciliationError(
              matches.length ? 'paid_annual_invoice_conflict' : 'paid_annual_payment_pending',
              matches.length === 0,
            )
          const evidence = matches[0]!
          const inserted = await c.query(
            `insert into app_private.billing_verified_period
             (environment,store_id,subscription_id,workspace_id,period_key,origin,tier,billing_interval,
              starts_at,ends_at,original_due_at,subscription_version,invoice_id,invoice_version)
             values(@billing_environment,$1,$2,$3,$4,'payment',$5,'year',$6,$7,$7,$8,$9,$10)
             on conflict(environment,store_id,subscription_id,period_key) do nothing`,
            [
              job.storeId,
              subscriptionId,
              bound.workspace_id,
              `change:${evidence.invoiceId}`,
              period.tier,
              evidence.startsAt,
              evidence.periodEndsAt,
              evidence.subscriptionVersion,
              evidence.invoiceId,
              updated.rows.find((row) => row.resource.id === evidence.invoiceId)!.resource
                .attributes.updated_at,
            ],
          )
          if (inserted.rowCount !== 1) throw new ReconciliationError('paid_annual_period_conflict')
          const superseded = await c.query(
            `update app_private.billing_verified_period set superseded_at=$5
             where environment=@billing_environment and store_id=$1 and subscription_id=$2
               and period_key=$3 and ends_at=$4 and superseded_at is null`,
            [job.storeId, subscriptionId, period.period_key, period.ends_at, evidence.startsAt],
          )
          if (superseded.rowCount !== 1)
            throw new ReconciliationError('paid_annual_previous_period_changed')
          effective = {
            target_tier: period.tier as 'basic' | 'advanced',
            target_interval: 'year',
            target_variant_id: this.variants[`${period.tier}_year`]!,
          }
        } else {
          throw new ReconciliationError('period_variant_mismatch')
        }
      }
      if (!effective.target_variant_id) throw new ReconciliationError('unknown_variant')
      // The same account row serializes checkout eligibility and first-trial consumption.
      const marker = await c.query(
        `update app_private.billing_checkout_account
         set first_subscribed_at=$2,version=version+1
         where workspace_id=$1 and environment=@billing_environment and first_subscribed_at is null`,
        [bound.workspace_id, bound.resource.attributes.created_at],
      )
      if (marker.rowCount !== 0 && marker.rowCount !== 1)
        throw new ReconciliationError('first_subscription_marker_conflict')
      const periods = await c.query<{ origin: string; invoice_id: string | null }>(
        `select origin,invoice_id from app_private.billing_verified_period
         where environment=@billing_environment and store_id=$1 and subscription_id=$2 and period_key='initial'`,
        [job.storeId, subscriptionId],
      )
      const existing = periods.rows[0]
      if (
        existing &&
        resource.type === 'subscription-invoices' &&
        resource.attributes.billing_reason === 'initial' &&
        existing.invoice_id &&
        existing.invoice_id !== resource.id
      )
        throw new ReconciliationError('initial_invoice_conflict')
      let origin = existing?.origin ?? null
      if (!existing) {
        const invoices = await c.query<{ resource: BillingResource }>(
          `select resource from app_private.billing_invoice_ledger
           where environment=@billing_environment and store_id=$1 and subscription_id=$2
             and resource#>>'{attributes,billing_reason}'='initial'`,
          [job.storeId, subscriptionId],
        )
        if (invoices.rows.length > 1) throw new ReconciliationError('initial_invoice_conflict')
        const period = initialPeriod(
          bound.resource,
          (invoices.rows[0]?.resource as import('./resources.js').InvoiceResource | undefined) ??
            null,
          checkout.quote.trial !== null,
          {
            currency: 'TWD',
            total:
              (checkout.quote.tier === 'advanced' ? 14500 : 11500) *
              (checkout.quote.interval === 'year' ? 10 : 1),
          },
        )
        if (period) {
          await c.query(
            `insert into app_private.billing_verified_period
             (environment,store_id,subscription_id,workspace_id,period_key,origin,tier,billing_interval,
              starts_at,ends_at,original_due_at,subscription_version,invoice_id,invoice_version)
             values(@billing_environment,$1,$2,$3,'initial',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              job.storeId,
              subscriptionId,
              bound.workspace_id,
              period.origin,
              checkout.quote.tier,
              checkout.quote.interval,
              period.startsAt,
              period.endsAt,
              period.originalDueAt,
              period.subscriptionVersion,
              period.invoiceId,
              period.invoiceVersion,
            ],
          )
          origin = period.origin
        }
      }
      const latestPeriod = await c.query<{
        ends_at: Date
      }>(
        `select ends_at from app_private.billing_verified_period
         where environment=@billing_environment and store_id=$1 and subscription_id=$2
           and superseded_at is null
         order by ends_at desc limit 1`,
        [job.storeId, subscriptionId],
      )
      if (latestPeriod.rows[0]) {
        const paidRenewals = await c.query<{
          resource: import('./resources.js').InvoiceResource
        }>(
          `select resource from app_private.billing_invoice_ledger
           where environment=@billing_environment and store_id=$1 and subscription_id=$2
             and resource#>>'{attributes,billing_reason}'='renewal'
             and resource#>>'{attributes,status}'='paid'
           order by resource->'attributes'->>'created_at'`,
          [job.storeId, subscriptionId],
        )
        for (const paid of paidRenewals.rows) {
          const period = renewalPeriod(
            bound.resource,
            paid.resource,
            latestPeriod.rows[0]!.ends_at.toISOString(),
            {
              variantId: effective.target_variant_id,
              currency: 'TWD',
              total:
                (effective.target_tier === 'advanced' ? 14500 : 11500) *
                (effective.target_interval === 'year' ? 10 : 1),
            },
          )
          if (!period) continue
          await c.query(
            `insert into app_private.billing_verified_period
             (environment,store_id,subscription_id,workspace_id,period_key,origin,tier,billing_interval,
              starts_at,ends_at,original_due_at,subscription_version,invoice_id,invoice_version)
             values(@billing_environment,$1,$2,$3,$4,'renewal',$5,$6,$7,$8,$9,$10,$11,$12)
             on conflict(environment,store_id,subscription_id,period_key) do nothing`,
            [
              job.storeId,
              subscriptionId,
              bound.workspace_id,
              `renewal:${period.invoiceId}`,
              effective.target_tier,
              effective.target_interval,
              period.startsAt,
              period.endsAt,
              period.originalDueAt,
              period.subscriptionVersion,
              period.invoiceId,
              period.invoiceVersion,
            ],
          )
          break
        }
      }
      if (checkout.status !== 'confirmed') {
        const status = origin ? 'confirmed' : 'pending'
        await c.query(
          `update app_private.billing_checkout_intent
           set status=$2,intent=(intent-'url')||jsonb_build_object('status',$2::text,'url',null,'activation',$4::text)
          where id=$1 and workspace_id=$3 and environment=@billing_environment and status in ('creating','open','pending','abandon_requested','abandoned')`,
          [bound.intent_id, status, bound.workspace_id, origin === 'payment' ? 'paid' : origin],
        )
      }
      if (
        currentSubscription &&
        (currentSubscription.attributes.cancelled ||
          currentSubscription.attributes.status === 'expired') &&
        currentSubscription.attributes.ends_at
      ) {
        await c.query(
          `update app_private.billing_cancellation set status='confirmed',confirmed_at=$3,confirmation=$4
          where environment=@billing_environment and store_id=$1 and subscription_id=$2 and status='pending'`,
          [job.storeId, subscriptionId, now, JSON.stringify(currentSubscription)],
        )
      }
      if (
        resource.type === 'subscription-invoices' &&
        resource.attributes.billing_reason === 'updated' &&
        resource.attributes.status === 'paid'
      ) {
        const digest = createHash('sha256')
          .update(`billing-paid-update:${job.storeId}:${resource.id}`)
          .digest('hex')
        await c.query(
          `insert into app_private.billing_event_inbox(environment,digest,notification)
           values(@billing_environment,$1,$2) on conflict(environment,digest) do nothing`,
          [
            digest,
            JSON.stringify({
              digest,
              storeId: job.storeId,
              kind: 'subscriptions',
              resourceId: subscriptionId,
              intentId: bound.intent_id,
            }),
          ],
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
      error_code=$5,lease_token=null,lease_until=null where id=$1 and environment=@billing_environment and status='processing' and lease_token=$2`,
      [job.id, job.lease, retryAt ? 'queued' : 'dead', retryAt, code],
    )
  }
}
