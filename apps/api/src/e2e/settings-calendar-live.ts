// Development-only adapter proof; savepoints keep every operation inside one rollback-only fixture.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { PostgresCalendarIntegration } from '../calendar-integration/postgres-calendar.js'
import { defaultSharing, eventUid } from '../calendar-integration/calendar.js'

const url = new URL(process.env.DATABASE_URL!)
assert.equal(url.username, 'gym_assistant_runtime.yvhijxhtelujfsaplzpi')
assert.equal(url.hostname, 'aws-0-ap-northeast-2.pooler.supabase.com')
const [workspace] = process.argv.slice(2)
assert.ok(workspace, 'existing development Workspace required')
const pool = new Pool({ connectionString: url.toString(), max: 1 })
const client = await pool.connect()
const blockId = randomUUID()
const scope = () =>
  client.query("select set_config('app.current_workspace_id',$1,true)", [workspace])
const fixtureClient = {
  query: (sql: string, values?: unknown[]) => {
    if (sql === 'begin') return client.query('savepoint adapter_operation')
    if (sql === 'commit') return client.query('release savepoint adapter_operation')
    if (sql === 'rollback') return client.query('rollback to savepoint adapter_operation')
    return client.query(sql, values)
  },
  release: () => undefined,
} as unknown as PoolClient
const now = new Date('2026-10-10T02:00:00Z')
const adapter = new PostgresCalendarIntegration(
  { connect: async () => fixtureClient } as unknown as Pool,
  async () => workspace,
  { get: async () => ({ tier: 'advanced' }) } as never,
  () => now,
)
const identity = { userId: 'rollback-only' }
const sharing = { ...defaultSharing, includeBlocks: true }
try {
  await client.query('begin')
  await scope()
  // Do not overwrite a pre-existing integration, including temporarily.
  assert.equal((await adapter.get(identity)).version, 0)
  await client.query(
    `insert into app_private.calendar_block(id,workspace_id,starts_at,ends_at,note)
     values($1,$2,'2026-10-11T02:00:00Z','2026-10-11T03:00:00Z','PRIVATE-LIVE-PROOF')`,
    [blockId, workspace],
  )
  const created = await adapter.change(identity, { action: 'create', version: 0, sharing })
  assert.ok(created.token)
  const first = await adapter.feed(created.token)
  assert.ok(
    first
      .toString()
      .replace(/\r\n[ \t]/g, '')
      .includes(eventUid('block', blockId)),
  )
  assert.ok(!first.toString().includes('PRIVATE-LIVE-PROOF'))
  assert.deepEqual(await adapter.feed(created.token), first)
  const downloaded = await adapter.download(identity, {
    ...sharing,
    start: '2026-10-11',
    end: '2026-10-11',
  })
  assert.ok(
    downloaded.body
      .toString()
      .replace(/\r\n[ \t]/g, '')
      .includes(eventUid('block', blockId)),
  )
  await assert.rejects(adapter.change(identity, { action: 'update', version: 0, sharing }), {
    code: 'version_conflict',
  })
  await scope()
  await client.query('delete from app_private.calendar_block where id=$1 and workspace_id=$2', [
    blockId,
    workspace,
  ])
  const cancelled = await adapter.feed(created.token)
  assert.ok(cancelled.toString().includes('STATUS:CANCELLED'))
  const reset = await adapter.change(identity, {
    action: 'reset',
    version: created.version,
    sharing,
  })
  assert.ok(reset.token)
  await assert.rejects(adapter.feed(created.token), { code: 'not_found' })
  await adapter.change(identity, { action: 'disable', version: reset.version })
  await assert.rejects(adapter.feed(reset.token), { code: 'not_found' })
  console.log(
    JSON.stringify({
      result: 'passed',
      scope: 'real development adapter SQL; stub Prime; sequential savepoints',
      persistence: 'rollback-only',
    }),
  )
} finally {
  await client.query('rollback')
  client.release()
  await pool.end()
}
