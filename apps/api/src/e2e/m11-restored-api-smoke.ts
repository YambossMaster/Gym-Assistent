import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { PostgresPublicAccessRepository } from '../adapters/postgres-public-access-repository.js'
import { PostgresSchedulingRepository } from '../adapters/postgres-scheduling-repository.js'
import { newToken, tokenHash } from '../public-access/public-access-module.js'
import { PublicCapabilityError } from '../public-access/public-access.js'
import { SchedulingStudentChangeError } from '../scheduling/scheduling-repository.js'

// This runs only after the Development dump has been restored to a disposable DB.
const host = process.env.M11_RESTORE_DB_HOST
if (process.env.M11_RESTORE_ISOLATED !== '1' || !host || !/^(10\.|172\.|192\.168\.)/.test(host)) {
  throw new Error('M11 restored API smoke requires an isolated Docker bridge address.')
}

const groupId = 'f1100000-0000-4000-8000-000000000011'
const historicalSessionId = 'f1100000-0000-4000-8000-000000000013'
const pool = new Pool({
  host,
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
  max: 2,
  connectionTimeoutMillis: 10_000,
})

try {
  const group = await pool.query<{ workspace_id: string; student_id: string }>(
    `select g.workspace_id,m.student_id from app_private.student g
     join app_private.student_group_member m
       on m.workspace_id=g.workspace_id and m.group_id=g.id
     where g.id=$1 and m.removed_at is null`,
    [groupId],
  )
  assert.equal(group.rowCount, 1)
  const workspaceId = group.rows[0]!.workspace_id
  const personId = group.rows[0]!.student_id
  const sessionId = randomUUID()
  const purchaseId = randomUUID()
  const now = new Date()

  await pool.query(
    `insert into app_private.lesson_purchase
       (id,workspace_id,student_id,purchased_at,lesson_count)
     values($1,$2,$3,$4,1)`,
    [purchaseId, workspaceId, groupId, now],
  )
  await pool.query(
    `insert into app_private.course_session
       (id,workspace_id,student_id,status,is_legacy,starts_at,ends_at,location)
     values($1,$2,$3,'scheduled',false,$4,$5,'M11 isolated adapter smoke')`,
    [sessionId, workspaceId, groupId, new Date(now.getTime() - 3_600_000), now],
  )
  await pool.query(
    `insert into app_private.course_session_participant
       (workspace_id,session_id,student_id,attendance,attendance_edited)
     values($1,$2,$3,'absent',true)`,
    [workspaceId, sessionId, personId],
  )
  await pool.query(
    `insert into app_private.training_record(id,workspace_id,session_id)
     values($1,$2,$3)`,
    [randomUUID(), workspaceId, sessionId],
  )

  const scheduling = new PostgresSchedulingRepository(pool)
  const completed = await scheduling.transitionSession(
    workspaceId,
    sessionId,
    'complete',
    1,
    new Date(now.getTime() + 1_000),
  )
  assert.equal(completed?.status, 'completed')
  const sources = await pool.query<{ student_id: string; purchase_id: string }>(
    `select student_id,purchase_id from app_private.session_lesson_source
     where workspace_id=$1 and session_id=$2`,
    [workspaceId, sessionId],
  )
  assert.equal(sources.rowCount, 1)
  assert.equal(sources.rows[0]!.student_id, groupId)
  assert.equal(sources.rows[0]!.purchase_id, purchaseId)
  const attendance = await pool.query<{ attendance: string }>(
    `select attendance from app_private.course_session_participant
     where workspace_id=$1 and session_id=$2 and student_id=$3`,
    [workspaceId, sessionId, personId],
  )
  assert.equal(attendance.rows[0]?.attendance, 'absent')
  console.log('PASS one-member all-absent group completion allocates exactly one group purchase.')

  const newSession = async () =>
    scheduling.createSession(workspaceId, {
      id: randomUUID(),
      studentId: groupId,
      startsAt: new Date(now.getTime() + 86_400_000),
      endsAt: new Date(now.getTime() + 90_000_000),
      location: 'M11 isolated reassignment',
      now,
    })
  const emptyGroupSession = await newSession()
  const reassigned = await scheduling.updateSession(workspaceId, emptyGroupSession.id, {
    studentId: personId,
    startsAt: new Date(emptyGroupSession.startsAt!),
    endsAt: new Date(emptyGroupSession.endsAt!),
    location: 'M11 isolated reassignment',
    expectedVersion: emptyGroupSession.version!,
    now,
  })
  assert.equal(reassigned?.studentId, personId)
  const oldSnapshot = await pool.query(
    `select 1 from app_private.course_session_participant
     where workspace_id=$1 and session_id=$2`,
    [workspaceId, emptyGroupSession.id],
  )
  assert.equal(oldSnapshot.rowCount, 0)

  const editedGroupSession = await newSession()
  await pool.query(
    `update app_private.course_session_participant
     set attendance='absent',attendance_edited=true,version=version+1
     where workspace_id=$1 and session_id=$2`,
    [workspaceId, editedGroupSession.id],
  )
  await assert.rejects(
    scheduling.updateSession(workspaceId, editedGroupSession.id, {
      studentId: personId,
      startsAt: new Date(editedGroupSession.startsAt!),
      endsAt: new Date(editedGroupSession.endsAt!),
      location: 'M11 isolated reassignment',
      expectedVersion: editedGroupSession.version!,
      now,
    }),
    (error) =>
      error instanceof SchedulingStudentChangeError && error.reason === 'group_draft_present',
  )
  const retained = await pool.query<{ student_id: string; version: number }>(
    `select student_id,version from app_private.course_session
     where workspace_id=$1 and id=$2`,
    [workspaceId, editedGroupSession.id],
  )
  assert.equal(retained.rows[0]?.student_id, groupId)
  assert.equal(retained.rows[0]?.version, editedGroupSession.version)
  console.log(
    'PASS empty group Session reassigns atomically; edited attendance blocks reassignment.',
  )

  const publicAccess = new PostgresPublicAccessRepository(pool)
  const token = newToken()
  const hash = tokenHash(token)
  const issued = await publicAccess.issue(
    workspaceId,
    historicalSessionId,
    { purpose: 'training_result', includeTrainingNote: false, tokenHash: hash },
    now,
  )
  assert.ok(issued)
  const original = await publicAccess.readTraining(hash, now)
  assert.equal(original.participants?.[0]?.attendance, 'absent')
  assert.equal(original.exercises.length, 0)
  await pool.query(
    `update app_private.course_session_participant
     set attendance='present',version=version+1
     where workspace_id=$1 and session_id=$2 and student_id=$3`,
    [workspaceId, historicalSessionId, personId],
  )
  await assert.rejects(
    publicAccess.readTraining(hash, now),
    (error) => error instanceof PublicCapabilityError && error.statusCode === 410,
  )
  await assert.rejects(
    publicAccess.readTraining(tokenHash(newToken()), now),
    (error) => error instanceof PublicCapabilityError && error.statusCode === 404,
  )
  const otherWorkspace = await pool.query<{ id: string }>(
    'select id from app_private.workspace where id<>$1 order by id limit 1',
    [workspaceId],
  )
  assert.ok(otherWorkspace.rows[0])
  assert.equal(
    await publicAccess.issue(
      otherWorkspace.rows[0].id,
      historicalSessionId,
      { purpose: 'training_result', includeTrainingNote: false, tokenHash: tokenHash(newToken()) },
      now,
    ),
    null,
  )
  console.log(
    'PASS changed attendance revokes old result token; invalid token and other Workspace reveal no result.',
  )
} finally {
  await pool.end()
}
