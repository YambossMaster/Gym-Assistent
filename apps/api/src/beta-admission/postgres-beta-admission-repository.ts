import { createHmac, randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { BetaAdmissionRepository, BetaGrant, RedemptionFailure } from './beta-admission.js'

interface GrantRow {
  kind: 'promotional' | 'permanent'
  started_at: Date
  ends_at: Date | null
  state: 'promotional' | 'free' | 'permanent'
}

interface CodeRow {
  id: string
  redemption_limit: number
  redemption_count: number
  closes_at: Date
  revoked_at: Date | null
}

export class PostgresBetaAdmissionRepository implements BetaAdmissionRepository {
  constructor(
    private readonly pool: Pool,
    private readonly secret: string,
  ) {}

  async grant(userId: string): Promise<BetaGrant> {
    const result = await this.pool.query<GrantRow>(
      `select g.kind,g.started_at,g.ends_at,
        case when g.kind='permanent' then 'permanent'
             when g.ends_at>now() then 'promotional' else 'free' end as state
       from app_private.workspace w
       join app_private.beta_grant g on g.workspace_id=w.id
       where w.owner_user_id=$1`,
      [userId],
    )
    return mapGrant(result.rows[0])
  }

  async redeem(input: {
    userId: string
    verifiedEmail: string
    codeDigest: string
    disclosureVersion: string
    now: Date
    endsAt: Date
  }): Promise<BetaGrant | RedemptionFailure> {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [input.userId])
      const existing = await grantForUser(client, input.userId)
      if (existing) {
        await client.query('commit')
        return mapGrant(existing)
      }
      const code = (
        await client.query<CodeRow>(
          `select id,redemption_limit,redemption_count,closes_at,revoked_at
           from app_private.beta_code where code_digest=$1 for update`,
          [input.codeDigest],
        )
      ).rows[0]
      if (!code) return await decline(client, 'invalid_code')
      if (code.revoked_at || code.closes_at <= input.now)
        return await decline(client, 'code_closed')
      if (code.redemption_count >= code.redemption_limit)
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
          (workspace_id,code_id,kind,started_at,ends_at,disclosure_version,disclosure_accepted_at)
         values ($1,$2,'promotional',$3,$4,$5,$3)`,
        [workspaceId, code.id, input.now, input.endsAt, input.disclosureVersion],
      )
      await client.query(
        'update app_private.beta_code set redemption_count=redemption_count+1 where id=$1',
        [code.id],
      )
      await client.query('commit')
      return {
        state: 'promotional',
        startedAt: input.now.toISOString(),
        endsAt: input.endsAt.toISOString(),
      }
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

async function grantForUser(client: PoolClient, userId: string): Promise<GrantRow | undefined> {
  const result = await client.query<GrantRow>(
    `select g.kind,g.started_at,g.ends_at,
      case when g.kind='permanent' then 'permanent'
           when g.ends_at>now() then 'promotional' else 'free' end as state
     from app_private.workspace w
     join app_private.beta_grant g on g.workspace_id=w.id
     where w.owner_user_id=$1 for update of g`,
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
  if (!row) return { state: 'unactivated' }
  if (row.state === 'permanent')
    return { state: 'permanent', startedAt: row.started_at.toISOString() }
  return {
    state: row.state,
    startedAt: row.started_at.toISOString(),
    endsAt: row.ends_at!.toISOString(),
  }
}
