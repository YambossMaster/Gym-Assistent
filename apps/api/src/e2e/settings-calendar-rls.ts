// Development-only, rollback-only proof using the actual API database role.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Pool } from 'pg'

const url = new URL(process.env.DATABASE_URL!)
assert.equal(url.username, 'gym_assistant_runtime.yvhijxhtelujfsaplzpi')
assert.equal(url.hostname, 'aws-0-ap-northeast-2.pooler.supabase.com')
const [a, b] = process.argv.slice(2)
assert.ok(a && b && a !== b, 'two existing development Workspace IDs required')
const pool = new Pool({ connectionString: url.toString(), max: 1 })
const client = await pool.connect()
const scope = (workspace: string, hash = '') =>
  client.query(
    "select set_config('app.current_workspace_id',$1,true), set_config('app.calendar_token_hash',$2,true)",
    [workspace, hash],
  )
try {
  await client.query('begin')
  await client.query("set local statement_timeout = '5000ms'")
  const role = await client.query(
    'select rolbypassrls, rolsuper from pg_roles where rolname=current_user',
  )
  assert.equal(role.rows[0].rolbypassrls, false)
  assert.equal(role.rows[0].rolsuper, false)
  const hashes = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')]
  for (const [index, id] of [a, b].entries()) {
    await scope(id!)
    // No upsert: an existing subscription must never be overwritten, even temporarily.
    await client.query(
      'insert into app_private.calendar_subscription(workspace_id,token_hash) values($1,$2)',
      [id, hashes[index]],
    )
    await client.query(
      "insert into app_private.calendar_published_event(workspace_id,uid,fingerprint,sequence,starts_at,ends_at,revised_at) values($1,'rls-proof','synthetic',0,now(),now()+interval '1 hour',now())",
      [id],
    )
  }
  await scope('')
  assert.equal((await client.query('select * from app_private.calendar_subscription')).rowCount, 0)
  await scope(a!)
  assert.deepEqual(
    (await client.query('select workspace_id from app_private.calendar_subscription')).rows,
    [{ workspace_id: a }],
  )
  assert.deepEqual(
    (await client.query('select workspace_id from app_private.calendar_published_event')).rows,
    [{ workspace_id: a }],
  )
  assert.equal(
    (
      await client.query(
        'update app_private.calendar_subscription set version=2 where workspace_id=$1',
        [b],
      )
    ).rowCount,
    0,
  )
  await scope('', hashes[1])
  assert.deepEqual(
    (await client.query('select workspace_id from app_private.calendar_subscription')).rows,
    [{ workspace_id: b }],
  )
  assert.equal(
    (await client.query('select * from app_private.calendar_published_event')).rowCount,
    0,
  )
  assert.equal(
    (await client.query('update app_private.calendar_subscription set version=2')).rowCount,
    0,
  )
  console.log(JSON.stringify({ checks: 9, result: 'passed', persistence: 'rollback-only' }))
} finally {
  await client.query('rollback')
  client.release()
  await pool.end()
}
