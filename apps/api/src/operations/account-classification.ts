import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'

export type AccountClass = 'real' | 'test'
export type TestKind = 'owner' | 'manual' | 'automation'

export type ClassificationInput = {
  userId: string
  accountClass: AccountClass
  testKind: TestKind | null
  actor: string
  reason: string
}

export function validateClassification(input: ClassificationInput): ClassificationInput {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.userId)
  )
    throw new Error('A valid Auth user UUID is required')
  if (input.accountClass !== 'real' && input.accountClass !== 'test')
    throw new Error('Account class must be real or test')
  if (
    (input.accountClass === 'real' && input.testKind !== null) ||
    (input.accountClass === 'test' &&
      !['owner', 'manual', 'automation'].includes(input.testKind ?? ''))
  )
    throw new Error('Test kind must be owner, manual or automation for test accounts only')
  if (input.actor.trim().length < 2 || input.actor.length > 120)
    throw new Error('Actor must be 2–120 characters')
  if (input.reason.trim().length < 4 || input.reason.length > 500)
    throw new Error('Reason must be 4–500 characters')
  return { ...input, actor: input.actor.trim(), reason: input.reason.trim() }
}

export async function setAccountClassification(pool: Pool, raw: ClassificationInput) {
  const input = validateClassification(raw)
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      "select pg_advisory_xact_lock(hashtext('account-reporting-classification'),hashtext($1))",
      [input.userId],
    )
    const current = await client.query<{ account_class: AccountClass; test_kind: TestKind | null }>(
      `select account_class,test_kind from app_private.account_reporting_classification
       where user_id=$1 for update`,
      [input.userId],
    )
    const previous = current.rows[0]
    if (previous?.account_class === input.accountClass && previous.test_kind === input.testKind) {
      await client.query('commit')
      return false
    }
    await client.query(
      `insert into app_private.account_reporting_classification
         (user_id,account_class,test_kind,classified_by,reason)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id) do update set
         account_class=excluded.account_class,test_kind=excluded.test_kind,
         classified_at=now(),classified_by=excluded.classified_by,reason=excluded.reason`,
      [input.userId, input.accountClass, input.testKind, input.actor, input.reason],
    )
    await client.query(
      `insert into app_private.account_reporting_classification_event
         (id,user_id,previous_class,previous_test_kind,account_class,test_kind,actor,reason)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        randomUUID(),
        input.userId,
        previous?.account_class ?? null,
        previous?.test_kind ?? null,
        input.accountClass,
        input.testKind,
        input.actor,
        input.reason,
      ],
    )
    await client.query('commit')
    return true
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
