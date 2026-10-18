import { createHmac, randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { BetaAdmissionRepository, BetaGrant, RedemptionFailure } from './beta-admission.js'
import type { BillingEnvironment } from '../billing/billing-sql.js'

interface GrantRow {
  kind: 'promotional' | 'permanent'
  started_at: Date
  ends_at: Date | null
  state: 'promotional' | 'free' | 'permanent'
  code_digest: string | null
}

interface CodeRow {
  id: string
  code_kind: 'promotional' | 'permanent'
  redemption_limit: number | null
  redemption_count: number
  closes_at: Date
  revoked_at: Date | null
}

export class PostgresBetaAdmissionRepository implements BetaAdmissionRepository {
  constructor(
    private readonly pool: Pool,
    private readonly secret: string,
    private readonly billingEnvironment: BillingEnvironment | null = null,
  ) {}

  async grant(userId: string): Promise<BetaGrant> {
    const result = await this.pool.query<GrantRow>(
      `select g.kind,g.started_at,g.ends_at,c.code_digest,
        case when g.kind='permanent' then 'permanent'
             when g.ends_at>now() then 'promotional' else 'free' end as state
       from app_private.workspace w
       join app_private.beta_grant g on g.workspace_id=w.id
       left join app_private.beta_code c on c.id=g.code_id
       where w.owner_user_id=$1 and g.kind in ('promotional','permanent')`,
      [userId],
    )
    return mapGrant(result.rows[0])
  }

  async redeem(input: {
    userId: string
    verifiedEmail: string
    codeDigest: string
    now: Date
  }): Promise<BetaGrant | RedemptionFailure> {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [input.userId])
      if (
        this.billingEnvironment &&
        (await hasBillingCommitment(client, input.userId, this.billingEnvironment))
      )
        return await decline(client, 'already_eligible')
      const existing = await grantForUser(client, input.userId)
      if (existing) {
        await client.query('commit')
        return existing.code_digest === input.codeDigest ? mapGrant(existing) : 'already_eligible'
      }
      const code = (
        await client.query<CodeRow>(
          `select id,code_kind,redemption_limit,redemption_count,closes_at,revoked_at
           from app_private.beta_code
           where code_digest=$1 and code_kind in ('promotional','permanent') for update`,
          [input.codeDigest],
        )
      ).rows[0]
      if (!code) return await decline(client, 'invalid_code')
      if (code.code_kind === 'promotional') return await decline(client, 'promotion_unavailable')
      if (code.revoked_at || code.closes_at <= input.now)
        return await decline(client, 'code_closed')
      if (code.redemption_limit !== null && code.redemption_count >= code.redemption_limit)
        return await decline(client, 'code_exhausted')
      const emailCodeDigest = createHmac('sha256', this.secret)
        .update(`${code.id}:${input.verifiedEmail}`)
        .digest('hex')
      const prior = await client.query(
        'select 1 from app_private.beta_redemption where code_id=$1 and email_code_digest=$2',
        [code.id, emailCodeDigest],
      )
      if (prior.rowCount) return await decline(client, 'already_used')
      const workspaceId = await existingOrNewWorkspace(client, input.userId)
      await client.query(
        `insert into app_private.beta_redemption
          (id,code_id,email_code_digest,redeemed_at) values ($1,$2,$3,$4)`,
        [randomUUID(), code.id, emailCodeDigest, input.now],
      )
      await client.query(
        `insert into app_private.beta_grant
          (workspace_id,code_id,kind,started_at,ends_at)
         values ($1,$2,$3,$4,$5)`,
        [workspaceId, code.id, code.code_kind, input.now, null],
      )
      await client.query(
        'update app_private.beta_code set redemption_count=redemption_count+1 where id=$1',
        [code.id],
      )
      await client.query('commit')
      return { state: 'permanent', startedAt: input.now.toISOString() }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async consumeRateLimit(
    kind: 'identity' | 'ip',
    digest: string,
    limit: number,
    now: Date,
  ): Promise<{ allowed: boolean; retryAfter: number }> {
    const bucketMs = 300_000
    const startedAt = new Date(Math.floor(now.getTime() / bucketMs) * bucketMs)
    const result = await this.pool.query<{ request_count: number }>(
      `insert into app_private.beta_rate_limit_bucket
        (subject_kind,subject_digest,bucket_started_at,request_count)
       values ($1,$2,$3,1)
       on conflict(subject_kind,subject_digest,bucket_started_at) do update
         set request_count=app_private.beta_rate_limit_bucket.request_count+1
       returning request_count`,
      [kind, digest, startedAt],
    )
    return {
      allowed: Number(result.rows[0]?.request_count) <= limit,
      retryAfter: Math.max(1, Math.ceil((startedAt.getTime() + bucketMs - now.getTime()) / 1000)),
    }
  }
}

async function hasBillingCommitment(
  client: PoolClient,
  userId: string,
  environment: BillingEnvironment,
): Promise<boolean> {
  const workspace = await client.query<{ id: string }>(
    'select id from app_private.workspace where owner_user_id=$1',
    [userId],
  )
  const id = workspace.rows[0]?.id
  if (!id) return false
  await client.query("select set_config('app.current_workspace_id',$1,true)", [id])
  await client.query(
    'insert into app_private.billing_checkout_account(workspace_id,environment) values($1,$2) on conflict do nothing',
    [id, environment],
  )
  await client.query(
    'select workspace_id from app_private.billing_checkout_account where workspace_id=$1 and environment=$2 for update',
    [id, environment],
  )
  const result = await client.query<{ committed: boolean }>(
    `select
       exists(select 1 from app_private.billing_checkout_intent i
         where i.workspace_id=$1 and i.environment=$2
           and i.status in ('creating','open','pending'))
       or exists(select 1 from app_private.billing_subscription_ledger s
         where s.workspace_id=$1 and s.environment=$2
           and coalesce(s.resource#>>'{attributes,status}','')<>'expired'
           and (nullif(s.resource#>>'{attributes,ends_at}','') is null
             or (s.resource#>>'{attributes,ends_at}')::timestamptz>now()))
       or exists(select 1 from app_private.billing_verified_period p
         where p.workspace_id=$1 and p.environment=$2 and p.superseded_at is null
           and p.ends_at>now()) as committed`,
    [id, environment],
  )
  return Boolean(result.rows[0]?.committed)
}

async function grantForUser(client: PoolClient, userId: string): Promise<GrantRow | undefined> {
  const result = await client.query<GrantRow>(
    `select g.kind,g.started_at,g.ends_at,c.code_digest,
      case when g.kind='permanent' then 'permanent'
           when g.ends_at>now() then 'promotional' else 'free' end as state
     from app_private.workspace w
     join app_private.beta_grant g on g.workspace_id=w.id
     left join app_private.beta_code c on c.id=g.code_id
     where w.owner_user_id=$1 and g.kind in ('promotional','permanent') for update of g`,
    [userId],
  )
  return result.rows[0]
}

async function existingOrNewWorkspace(client: PoolClient, userId: string): Promise<string> {
  const result = await client.query<{ id: string }>(
    'select id from app_private.workspace where owner_user_id=$1',
    [userId],
  )
  if (result.rows[0]) return result.rows[0].id
  const id = randomUUID()
  await client.query('insert into app_private.workspace(id,owner_user_id) values ($1,$2)', [
    id,
    userId,
  ])
  return id
}

async function decline(client: PoolClient, reason: RedemptionFailure): Promise<RedemptionFailure> {
  await client.query('commit')
  return reason
}

function mapGrant(row: GrantRow | undefined): BetaGrant {
  if (!row) return { state: 'free' }
  if (row.state === 'permanent')
    return { state: 'permanent', startedAt: row.started_at.toISOString() }
  return {
    state: row.state,
    startedAt: row.started_at.toISOString(),
    endsAt: row.ends_at!.toISOString(),
  }
}
