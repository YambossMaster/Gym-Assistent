import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { PostgresStudentRepository } from '../adapters/postgres-student-repository.js'

// Uses only freshly created, uniquely named fixtures in the configured development accounts.
const env = process.env
const api = env.API_BASE_URL ?? 'http://127.0.0.1:3000'
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 })
const prefix = `M7.5 finance ${Date.now()}`
const login = async (email: string, password: string) => {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(r.status, 200, 'isolated account sign-in')
  return (await r.json()) as any
}
const [a, b] = await Promise.all([
  login(env.COACH_A_EMAIL!, env.COACH_A_PASSWORD!),
  login(env.COACH_B_EMAIL!, env.COACH_B_PASSWORD!),
])
assert.notEqual(a.user.id, b.user.id)
const repo = new PostgresStudentRepository(pool)
const [w, wb] = await Promise.all([
  repo.resolveWorkspace({ userId: a.user.id }),
  repo.resolveWorkspace({ userId: b.user.id }),
])
const req = async (
  url: string,
  method = 'GET',
  body?: unknown,
  status = 200,
  token = a.access_token,
) => {
  const r = await fetch(api + '/v1' + url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  assert.equal(r.status, status, `${method} ${url}: ${await r.clone().text()}`)
  return status === 204 ? null : ((await r.json()) as any)
}
const studentIds: string[] = [],
  venueIds: string[] = []
const venues = () => req('/venues')
const venue = async (name: string) => {
  const v = (await req('/venues', 'POST', { name: `${prefix} ${name}` })).entity
  venueIds.push(v.id)
  return v
}
const student = async () => {
  const s = (await req('/students', 'POST', { name: prefix }, 201)).student
  studentIds.push(s.id)
  return s
}
const rule = async (v: any, body: object) => {
  const current = (await venues()).venues.find((x: any) => x.id === v.id)
  const input = { version: current.version, effectiveFrom: '2026-01-01', ...body }
  const preview = await req(`/venues/${v.id}/fee-rules/preview`, 'POST', input)
  const result = await req(`/venues/${v.id}/fee-rules`, 'POST', input)
  assert.equal(result.preview.scheduledCount, preview.scheduledCount)
  return result.entity
}
const session = async (s: any, v?: any, day = 10) =>
  (
    await req(
      '/sessions',
      'POST',
      {
        studentId: s.id,
        startsAt: `2026-09-${day}T02:00:00Z`,
        endsAt: `2026-09-${day}T03:00:00Z`,
        location: `${prefix} text`,
        ...(v ? { venueId: v.id } : {}),
      },
      201,
    )
  ).session
const transition = async (s: any, action: string) =>
  (await req(`/sessions/${s.id}/transition`, 'POST', { action, version: s.version })).session
const purchase = async (s: any, body: object = {}) =>
  (
    await req(
      `/students/${s.id}/lesson-purchases`,
      'POST',
      {
        purchasedAt: '2026-08-01T02:00:00Z',
        lessonCount: 10,
        amountMinor: 10000,
        currency: 'TWD',
        ...body,
      },
      201,
    )
  ).purchase
const monthly = (m = '2026-09') => req(`/finances/months/${m}`)
const notices = async (v: any) =>
  (await req('/today')).today.notifications.filter((n: any) =>
    n.id.startsWith(`venue-balance:${v.id}:`),
  )
try {
  const s = await student(),
    v = await venue('prepaid')
  assert.equal(
    (await venues()).venues.find((x: any) => x.id === v.id).currentRule.kind,
    'untracked',
  )
  await req(
    `/venues/${v.id}`,
    'PATCH',
    { version: 1, name: 'other', active: true },
    404,
    b.access_token,
  )
  await req('/venues', 'POST', { name: 'invalid', workspaceId: wb }, 400)
  const contested = await Promise.all(
    [0, 1].map(() =>
      fetch(api + `/v1/venues/${v.id}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${a.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, name: v.name, active: true }),
      }),
    ),
  )
  assert.deepEqual(
    contested.map((r) => r.status).sort(),
    [200, 409],
    'concurrent edits return one accepted update and an explicit conflict',
  )
  const conflict = (await contested.find((r) => r.status === 409)!.json()) as any
  assert.equal(conflict.current.id, v.id)
  assert.equal(conflict.current.version, 2)
  await rule(v, { kind: 'prepaid' })
  await purchase(s, { venueId: v.id })
  const stale = await req(
    `/venues/${v.id}`,
    'PATCH',
    { version: 1, name: 'stale', active: true },
    409,
  )
  assert.equal(stale.current.id, v.id)
  const c = (
    await req(`/venues/${v.id}/credit-purchases`, 'POST', {
      purchasedOn: '2026-08-31',
      startsDeductingAt: '2026-08-30T16:00:00Z',
      lessonCount: 2,
      amountMinor: 600,
      currency: 'TWD',
    })
  ).entity
  assert.equal((await notices(v)).length, 0)
  let one = await transition(await session(s, v), 'complete')
  const n1 = (await notices(v))[0]
  assert.ok(n1)
  assert.equal((await notices(v))[0].id, n1.id)
  await req('/today/notifications/read', 'POST', { id: n1.id })
  assert.ok((await notices(v))[0].readAt)
  await req('/today/notifications/dismiss', 'POST', { id: n1.id })
  assert.equal((await notices(v)).length, 0)
  one = await transition(one, 'reopen')
  one = await transition(one, 'complete')
  assert.notEqual((await notices(v))[0].id, n1.id)
  await transition(await session(s, v, 11), 'complete')
  await transition(await session(s, v, 12), 'complete')
  assert.equal((await venues()).venues.find((x: any) => x.id === v.id).remaining, 0)
  const corrected = (
    await req(`/venues/${v.id}/credit-purchases/${c.id}`, 'PATCH', {
      version: c.version,
      purchasedOn: '2026-07-31',
      lessonCount: 5,
      amountMinor: 1500,
      currency: 'TWD',
    })
  ).entity
  assert.equal(corrected.version, 2)
  assert.equal((await notices(v)).length, 0)
  assert.equal((await venues()).venues.find((x: any) => x.id === v.id).remaining, 2)
  assert.ok(!(await monthly('2026-08')).rows.some((r: any) => r.id === `prepaid:${c.id}`))
  assert.equal(
    (await monthly('2026-07')).rows.find((r: any) => r.id === `prepaid:${c.id}`).amountMinor,
    1500,
  )
  console.log('PASS prepaid date/correction/pending/reopen/read/dismiss/new occurrence')

  const sr = await student(),
    vr = await venue('rent')
  await rule(vr, { kind: 'rent', amountMinor: 500, currency: 'TWD' })
  const historic = await transition(await session(sr), 'complete')
  assert.ok(!(await monthly()).rows.some((r: any) => r.id === `session:${historic.id}`))
  let data = await venues(),
    vrNow = data.venues.find((x: any) => x.id === vr.id)
  let history = {
    version: vrNow.version,
    sessions: [{ id: historic.id, version: historic.version }],
    series: [],
  }
  const hp = await req(`/venues/${vr.id}/history/preview`, 'POST', history)
  assert.equal(hp.matches[0].location, `${prefix} text`)
  assert.equal(
    hp.months[0].after.find((x: any) => x.currency === 'TWD').expenseMinor -
      (hp.months[0].before.find((x: any) => x.currency === 'TWD')?.expenseMinor ?? 0),
    500,
  )
  await req(`/venues/${vr.id}/history`, 'POST', history)
  assert.equal(
    (await monthly()).rows.find((r: any) => r.id === `session:${historic.id}`).amountMinor,
    500,
  )
  await rule(vr, { effectiveFrom: '2026-09-01', kind: 'rent', amountMinor: 800, currency: 'TWD' })
  await purchase(sr, { venueId: vr.id })
  assert.equal(
    (await monthly()).rows.find((r: any) => r.id === `session:${historic.id}`).amountMinor,
    800,
  )
  const future = await transition(await session(sr, vr, 13), 'complete')
  assert.equal(
    (await monthly()).rows.find((r: any) => r.id === `session:${future.id}`).amountMinor,
    800,
  )
  data = await venues()
  vrNow = data.venues.find((x: any) => x.id === vr.id)
  await req(`/venues/${vr.id}/history/preview`, 'POST', { ...history, version: vrNow.version }, 409)
  await req(
    `/venues/${v.id}/history/preview`,
    'POST',
    {
      version: (await venues()).venues.find((x: any) => x.id === v.id).version,
      sessions: [{ id: historic.id, version: 1 }],
      series: [],
    },
    404,
    b.access_token,
  )
  console.log('PASS rent/history preview/explicit mapping/pinned versions/current conflict')

  const sc = await student(),
    vc = await venue('commission')
  await purchase(sc, { lessonCount: 3, amountMinor: 1000 })
  await rule(vc, { kind: 'commission', coachRate: 20, venueRate: 40 })
  const commission = await transition(await session(sc, vc, 14), 'complete')
  assert.equal(
    (await monthly()).rows.find((r: any) => r.id === `session:${commission.id}`).amountMinor,
    133,
  )
  const missing = await student()
  await req(
    '/sessions',
    'POST',
    {
      studentId: missing.id,
      startsAt: '2026-09-15T02:00:00Z',
      endsAt: '2026-09-15T03:00:00Z',
      location: prefix,
      venueId: vc.id,
    },
    400,
  )
  const sv = await student(),
    vv = await venue('gross purchase calculation')
  await rule(vv, { kind: 'commission', rate: 30 })
  const p = await purchase(sv)
  const vs = await transition(await session(sv, vv, 16), 'complete')
  assert.ok((await monthly('2026-08')).rows.some((r: any) => r.id === `purchase:${p.id}`))
  assert.equal(
    (await monthly()).rows.find((r: any) => r.id === `session:${vs.id}`).direction,
    'expense',
  )
  const free = await venue('free')
  await rule(free, { kind: 'free' })
  const fs = await transition(await session(sv, free, 17), 'complete')
  assert.ok(!(await monthly()).rows.some((r: any) => r.id === `session:${fs.id}`))
  const series = (
    await req(
      `/students/${sv.id}/schedule-series`,
      'POST',
      {
        startsAt: '2026-09-25T02:00:00Z',
        endsAt: '2026-09-25T03:00:00Z',
        location: prefix,
        venueId: free.id,
        intervalWeeks: 1,
        autoScheduleHorizon: '2_WEEKS',
      },
      201,
    )
  ).series
  assert.equal(series.venueId, free.id)
  const anchor = (await venues()).sessions.filter(
    (x: any) => x.studentId === sv.id && x.status === 'scheduled',
  )
  assert.ok(anchor.length > 0 && anchor.every((x: any) => x.venueId === free.id))
  console.log('PASS Venue-supplied default/uniform commission/eligibility/free/series propagation')

  const db = await pool.connect()
  try {
    await db.query('begin')
    await db.query("select set_config('app.current_workspace_id',$1,true)", [wb])
    const role = (
      await db.query(
        "select pg_has_role(current_user,'gym_assistant_api','member') member,rolsuper,rolbypassrls from pg_roles where rolname=current_user",
      )
    ).rows[0]
    assert.ok(
      role.member && !role.rolsuper && !role.rolbypassrls,
      'runtime inherits API grants without bypassing RLS',
    )
    assert.equal(
      (await db.query('select id from app_private.venue where id = any($1::uuid[])', [venueIds]))
        .rowCount,
      0,
    )
    await db.query('rollback')
  } finally {
    db.release()
  }
  assert.ok(
    !(await req('/venues', 'GET', undefined, 200, b.access_token)).venues.some((x: any) =>
      venueIds.includes(x.id),
    ),
  )
  console.log('PASS both-Coach HTTP and actual database RLS isolation')
} finally {
  for (const id of studentIds) {
    const detail = (await req(`/students/${id}`)).detail
    assert.equal(detail.student.name, prefix, 'cleanup exact fixture Student')
    await req(
      `/students/${id}`,
      'DELETE',
      { confirmation: 'DELETE', version: detail.student.version },
      204,
    )
  }
  const db = await pool.connect()
  try {
    await db.query('begin')
    await db.query("select set_config('app.current_workspace_id',$1,true)", [w])
    const owned = await db.query(
      'select id,name from app_private.venue where workspace_id=$1 and id=any($2::uuid[])',
      [w, venueIds],
    )
    assert.equal(owned.rowCount, venueIds.length)
    assert.ok(owned.rows.every((v) => v.name.startsWith(prefix)))
    assert.equal(
      (
        await db.query(
          'select id from app_private.course_session where workspace_id=$1 and venue_id=any($2::uuid[])',
          [w, venueIds],
        )
      ).rowCount,
      0,
    )
    await db.query('delete from app_private.venue where workspace_id=$1 and id=any($2::uuid[])', [
      w,
      venueIds,
    ])
    await db.query(
      "delete from app_private.today_notification_read where workspace_id=$1 and split_part(notification_id,':',1)='venue-balance' and split_part(notification_id,':',2)=any($2::text[])",
      [w, venueIds],
    )
    await db.query('commit')
    console.log('Cleaned exact isolated finance fixtures; other data preserved.')
  } catch (e) {
    await db.query('rollback')
    throw e
  } finally {
    db.release()
    await pool.end()
  }
}
