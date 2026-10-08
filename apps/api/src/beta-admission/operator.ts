import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { loadConfig } from '../config.js'
import { codeDigest, newBetaCode } from './beta-admission.js'

const config = loadConfig()
const pool = new Pool({ connectionString: config.DATABASE_URL })

async function main(args: string[]) {
  const [action, ...values] = args
  if (action === 'issue') {
    const [limitText, closesText, actor, ...reasonWords] = values
    const limit = Number(limitText)
    const closesAt = new Date(closesText ?? '')
    const reason = reasonWords.join(' ').trim()
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      !Number.isFinite(closesAt.getTime()) ||
      closesAt <= new Date() ||
      !actor ||
      !reason
    )
      throw new Error('Usage: issue <positive-limit> <future-ISO-close> <actor> <reason>')
    const code = newBetaCode()
    const id = randomUUID()
    await transaction(async (client) => {
      await client.query(
        `insert into app_private.beta_code
          (id,code_digest,redemption_limit,closes_at) values ($1,$2,$3,$4)`,
        [id, codeDigest(code), limit, closesAt],
      )
      await client.query(
        `insert into app_private.beta_operator_event
          (id,action,actor,code_id,reason) values ($1,'issue_code',$2,$3,$4)`,
        [randomUUID(), actor, id, reason],
      )
    })
    process.stdout.write(`Code ID: ${id}\nCode (shown once): ${code}\n`)
    return
  }
  if (action === 'issue-named') {
    const [kind, code, limitText, closesText, actor, ...reasonWords] = values
    const limit = limitText === 'unlimited' ? null : Number(limitText)
    const closesAt = new Date(closesText ?? '')
    const reason = reasonWords.join(' ').trim()
    if (
      !['promotional', 'permanent', 'tester'].includes(kind ?? '') ||
      !code ||
      !/^[A-Za-z0-9_-]{8,64}$/.test(code) ||
      (limit !== null && (!Number.isInteger(limit) || limit < 1)) ||
      ((kind === 'permanent' || kind === 'tester') && limit !== 1) ||
      !Number.isFinite(closesAt.getTime()) ||
      closesAt <= new Date() ||
      !actor ||
      !reason
    )
      throw new Error(
        'Usage: issue-named <promotional|permanent|tester> <code> <positive-limit|unlimited> <future-ISO-close> <actor> <reason>',
      )
    const id = randomUUID()
    await transaction(async (client) => {
      await client.query(
        `insert into app_private.beta_code
          (id,code_digest,code_kind,redemption_limit,closes_at) values ($1,$2,$3,$4,$5)`,
        [id, codeDigest(code), kind, limit, closesAt],
      )
      await event(client, 'issue_code', actor, reason, id, null)
    })
    process.stdout.write(`Code ID: ${id}\nNamed code stored as a digest.\n`)
    return
  }
  if (action === 'list') {
    const result = await pool.query(
      `select id,code_kind,redemption_limit,redemption_count,closes_at,revoked_at,created_at
       from app_private.beta_code order by created_at desc`,
    )
    process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`)
    return
  }
  if (action === 'revoke-code') {
    const [codeId, actor, ...reasonWords] = values
    const reason = reasonWords.join(' ').trim()
    if (!codeId || !actor || !reason)
      throw new Error('Usage: revoke-code <code-id> <actor> <reason>')
    await transaction(async (client) => {
      const result = await client.query(
        `update app_private.beta_code set revoked_at=coalesce(revoked_at,now())
         where id=$1 returning id`,
        [codeId],
      )
      if (!result.rowCount) throw new Error('Code not found')
      await event(client, 'revoke_code', actor, reason, codeId, null)
    })
    return
  }
  if (action === 'revoke-permanent') {
    const [userId, actor, ...reasonWords] = values
    const reason = reasonWords.join(' ').trim()
    if (!userId || !actor || !reason)
      throw new Error(`Usage: ${action} <verified-coach-user-id> <actor> <reason>`)
    await transaction(async (client) => {
      const result = await client.query<{
        workspace_id: string
        kind: string | null
        ends_at: Date | null
        prior_ends_at: Date | null
      }>(
        `select w.id as workspace_id,g.kind,g.ends_at,g.prior_ends_at
         from app_private.workspace w left join app_private.beta_grant g on g.workspace_id=w.id
         where w.owner_user_id=$1 for update of w`,
        [userId],
      )
      const grant = result.rows[0]
      if (!grant) throw new Error('Coach Workspace not found')
      if (grant.kind !== 'permanent') throw new Error('Permanent grant not found')
      if (grant.prior_ends_at) {
        await client.query(
          `update app_private.beta_grant
           set kind='promotional',ends_at=prior_ends_at,prior_ends_at=null where workspace_id=$1`,
          [grant.workspace_id],
        )
      } else {
        await client.query('delete from app_private.beta_grant where workspace_id=$1', [
          grant.workspace_id,
        ])
      }
      await event(client, 'revoke_permanent', actor, reason, null, grant.workspace_id)
    })
    return
  }
  throw new Error('Actions: issue, issue-named, list, revoke-code, revoke-permanent')
}

async function transaction(run: (client: PoolClient) => Promise<void>) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await run(client)
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function event(
  client: PoolClient,
  action: string,
  actor: string,
  reason: string,
  codeId: string | null,
  workspaceId: string | null,
) {
  await client.query(
    `insert into app_private.beta_operator_event
      (id,action,actor,reason,code_id,workspace_id) values ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), action, actor, reason, codeId, workspaceId],
  )
}

void main(process.argv.slice(2))
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Operator command failed'}\n`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
