import type { Pool } from 'pg'
import type { TestKind } from './account-classification.js'

type TestAccountIntent = {
  email: string
  testKind: TestKind
  actor: string
  reason: string
}

export async function createTestAccountIntent(pool: Pool, input: TestAccountIntent) {
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) throw new Error('A valid test account Email is required')
  if (!['owner', 'manual', 'automation'].includes(input.testKind))
    throw new Error('A valid test account kind is required')
  if (input.actor.trim().length < 2 || input.actor.length > 120)
    throw new Error('Actor must be 2–120 characters')
  if (input.reason.trim().length < 4 || input.reason.length > 500)
    throw new Error('Reason must be 4–500 characters')

  await pool.query(
    `insert into app_private.account_reporting_test_intent
       (email,test_kind,actor,reason,expires_at)
     values ($1,$2,$3,$4,now()+interval '10 minutes')
     on conflict (email) do update set
       test_kind=excluded.test_kind,actor=excluded.actor,reason=excluded.reason,
       expires_at=excluded.expires_at,created_at=now()`,
    [email, input.testKind, input.actor.trim(), input.reason.trim()],
  )
}

export async function clearTestAccountIntent(pool: Pool, email: string) {
  await pool.query('delete from app_private.account_reporting_test_intent where email=$1', [
    email.trim().toLowerCase(),
  ])
}
