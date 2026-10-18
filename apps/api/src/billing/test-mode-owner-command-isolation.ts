import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'

const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const database = new URL(process.env.DATABASE_URL!)
assert.ok(database.username.startsWith('gym_assistant_runtime.'))
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `../../output/billing-test-mode/${name}`), 'utf8'),
  ) as {
    environment: string
    userId: string
  }
const a = fixture('fixture-account-returning-r04-return.json')
const b = fixture('fixture-account-r04-ui.json')
assert.equal(a.environment, 'Development/Test Mode')
assert.equal(b.environment, 'Development/Test Mode')
assert.notEqual(a.userId, b.userId)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  const owners = await pool.query<{ owner_user_id: string; id: string }>(
    'select owner_user_id,id from app_private.workspace where owner_user_id=any($1::uuid[])',
    [[a.userId, b.userId]],
  )
  assert.equal(owners.rowCount, 2)
  const aWorkspace = owners.rows.find((row) => row.owner_user_id === a.userId)!.id
  const bWorkspace = owners.rows.find((row) => row.owner_user_id === b.userId)!.id
  const client = await pool.connect()
  try {
    await client.query('begin read only')
    await client.query("select set_config('app.current_workspace_id',$1,true)", [aWorkspace])
    const command = await client.query<{ id: string }>(
      `select id from app_private.billing_paid_change
       where environment='test' and workspace_id=$1 and subscription_id='2615463'`,
      [aWorkspace],
    )
    assert.equal(command.rowCount, 1, 'owner sees its existing paid change command')
    const invoice = await client.query<{ provider_id: string }>(
      `select provider_id from app_private.billing_invoice_ledger
       where environment='test' and workspace_id=$1 and provider_id='8749952'`,
      [aWorkspace],
    )
    assert.equal(invoice.rowCount, 1, 'owner sees its upgrade invoice')
    await client.query('rollback')
    await client.query('begin read only')
    await client.query("select set_config('app.current_workspace_id',$1,true)", [bWorkspace])
    const foreign = await client.query<{
      commands: number
      invoices: number
      subscriptions: number
    }>(
      `select
       (select count(*)::int from app_private.billing_paid_change where id=$1) commands,
       (select count(*)::int from app_private.billing_invoice_ledger where provider_id='8749952') invoices,
       (select count(*)::int from app_private.billing_subscription_ledger where provider_id='2615463') subscriptions`,
      [command.rows[0]!.id],
    )
    assert.deepEqual(foreign.rows, [{ commands: 0, invoices: 0, subscriptions: 0 }])
    await client.query('rollback')
    console.log(
      JSON.stringify({
        ownCommand: true,
        ownInvoice: true,
        foreignCommands: 0,
        foreignInvoices: 0,
        foreignSubscriptions: 0,
      }),
    )
  } finally {
    client.release()
  }
} finally {
  await pool.end()
}
