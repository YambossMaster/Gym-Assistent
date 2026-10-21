import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'

/** Choose exactly one entitlement for a Session inside its completion transaction. */
export async function allocateLessonSource(
  client: PoolClient,
  workspaceId: string,
  sessionId: string,
  studentId: string,
  venueId: string | null,
  endsAt: Date,
  now: Date,
) {
  const localDate = await client.query<{ local_day: string }>(
    'select ($2::timestamptz at time zone time_zone)::date::text as local_day from app_private.workspace where id=$1',
    [workspaceId, endsAt],
  )
  const chosen = await client.query<{ id: string }>(
    `select p.id from app_private.lesson_purchase p
     where p.workspace_id=$1 and p.student_id=$2 and p.source_kind='manual'
       and (p.entitlement_venue_id is null or p.entitlement_venue_id=$3)
       and (p.purchased_at at time zone (select time_zone from app_private.workspace where id=$1))::date <= $4::date
       and (select count(*) from app_private.session_lesson_source a
            where a.workspace_id=$1 and a.kind='manual' and a.purchase_id=p.id) < p.lesson_count
     order by (p.entitlement_venue_id is not null) desc,p.purchased_at,p.id limit 1`,
    [workspaceId, studentId, venueId, localDate.rows[0]?.local_day],
  )
  if (chosen.rows[0]) {
    await client.query(
      "insert into app_private.session_lesson_source(workspace_id,session_id,student_id,kind,purchase_id,decided_at) values($1,$2,$3,'manual',$4,$5)",
      [workspaceId, sessionId, studentId, chosen.rows[0].id, now],
    )
    return
  }
  const price = await client.query<{
    single_lesson_amount_minor: string | null
    single_lesson_currency: string | null
  }>(
    'select single_lesson_amount_minor,single_lesson_currency from app_private.student where workspace_id=$1 and id=$2',
    [workspaceId, studentId],
  )
  const value = price.rows[0]
  if (value && value.single_lesson_amount_minor !== null && value.single_lesson_currency) {
    const purchaseId = randomUUID()
    await client.query(
      `insert into app_private.lesson_purchase
       (id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency,private_note,created_at,updated_at,collection_mode,entitlement_venue_id,source_kind,source_session_id)
       values($1,$2,$3,$4,1,$5,$6,'',$7,$7,'coach',null,'generated_single',$8)`,
      [
        purchaseId,
        workspaceId,
        studentId,
        endsAt,
        value.single_lesson_amount_minor,
        value.single_lesson_currency,
        now,
        sessionId,
      ],
    )
    await client.query(
      "insert into app_private.session_lesson_source(workspace_id,session_id,student_id,kind,purchase_id,decided_at) values($1,$2,$3,'generated_single',$4,$5)",
      [workspaceId, sessionId, studentId, purchaseId, now],
    )
    return
  }
  await client.query(
    "insert into app_private.session_lesson_source(workspace_id,session_id,student_id,kind,decided_at) values($1,$2,$3,'pending',$4)",
    [workspaceId, sessionId, studentId, now],
  )
}
