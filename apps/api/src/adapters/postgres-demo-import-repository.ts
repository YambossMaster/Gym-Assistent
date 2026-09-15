import { createHash, randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  safeDemoImportPreview,
  type DemoImportPlan,
  type DemoImportPhase,
} from '../migration/demo-import.js'
import {
  DemoImportConflictError,
  type DemoImportRepository,
  type ImportPreview,
  type ImportRun,
} from '../demo-import/demo-import.js'

const phaseNames: DemoImportPhase[] = [
  'foundation',
  'purchases',
  'training',
  'scheduling',
  'capability_links',
]

export class PostgresDemoImportRepository implements DemoImportRepository {
  constructor(private readonly pool: Pool) {}

  async resolveWorkspace(identity: AuthenticatedIdentity) {
    const result = await this.pool.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [identity.userId],
    )
    const id = result.rows[0]?.id
    if (!id) throw new Error('Workspace not found')
    return id
  }

  async listCatalog(workspaceId: string) {
    return this.scoped(workspaceId, async (client) => {
      const result = await client.query<{ id: string; name: string }>(
        `select id,name from app_private.exercise_definition where workspace_id=$1 and is_system and deleted_at is null order by id`,
        [workspaceId],
      )
      return result.rows
    })
  }

  async baselineFingerprint(workspaceId: string) {
    return this.scoped(workspaceId, (client) => baseline(client, workspaceId))
  }

  async savePreview(
    workspaceId: string,
    plan: DemoImportPlan,
    baselineFingerprint: string,
  ): Promise<ImportPreview> {
    return this.scoped(workspaceId, async (client) => {
      const id = randomUUID()
      const expiresAt = new Date(Date.now() + 86_400_000)
      await client.query(
        `insert into app_private.demo_import_preview(id,workspace_id,source_hash,manifest_checksum,baseline_fingerprint,plan,expires_at)
         values($1,$2,$3,$4,$5,$6::jsonb,$7)`,
        [
          id,
          workspaceId,
          plan.sourceHash,
          plan.manifestChecksum,
          baselineFingerprint,
          JSON.stringify(plan),
          expiresAt,
        ],
      )
      await client.query(
        `delete from app_private.demo_import_preview where workspace_id=$1 and expires_at<now() and not exists(select 1 from app_private.demo_import_run where preview_id=demo_import_preview.id)`,
        [workspaceId],
      )
      return { ...safeDemoImportPreview(plan), id, expiresAt }
    })
  }

  async createRun(
    workspaceId: string,
    input: {
      previewId: string
      manifestChecksum: string
      workspaceVersion: number
      preferenceVersion: number
    },
  ) {
    return this.scoped(workspaceId, async (client) => {
      await lockWorkspace(client, workspaceId)
      const active = await client.query(
        `select 1 from app_private.demo_import_run where workspace_id=$1 and status in ('ready','running','partial','rolling_back') limit 1`,
        [workspaceId],
      )
      if (active.rowCount) throw new DemoImportConflictError('active_import')
      const preview = await client.query<any>(
        `select * from app_private.demo_import_preview where workspace_id=$1 and id=$2 for update`,
        [workspaceId, input.previewId],
      )
      const row = preview.rows[0]
      if (
        !row ||
        new Date(row.expires_at).getTime() <= Date.now() ||
        row.manifest_checksum !== input.manifestChecksum ||
        row.baseline_fingerprint !== (await baseline(client, workspaceId))
      )
        throw new DemoImportConflictError('preview_stale')
      const current = await client.query<any>(
        `select w.display_name,w.time_zone,w.version,p.default_weight_unit,p.version as preference_version from app_private.workspace w join app_private.training_preference p on p.workspace_id=w.id where w.id=$1 for update of w,p`,
        [workspaceId],
      )
      const settings = current.rows[0]
      if (
        !settings ||
        Number(settings.version) !== input.workspaceVersion ||
        Number(settings.preference_version) !== input.preferenceVersion
      )
        throw new DemoImportConflictError('preview_stale')
      const favorites = await client.query<any>(
        `select id,favorite,version from app_private.exercise_definition where workspace_id=$1 and is_system and deleted_at is null order by id`,
        [workspaceId],
      )
      const id = randomUUID()
      const before = { workspace: settings, favorites: favorites.rows }
      const result = await client.query(
        `insert into app_private.demo_import_run(id,workspace_id,preview_id,before_state)
         values($1,$2,$3,$4::jsonb) returning *`,
        [id, workspaceId, input.previewId, JSON.stringify(before)],
      )
      return mapRun(result.rows[0])
    })
  }

  async getRun(workspaceId: string, runId: string) {
    return this.scoped(workspaceId, async (client) => {
      const result = await client.query(
        `select * from app_private.demo_import_run where workspace_id=$1 and id=$2`,
        [workspaceId, runId],
      )
      return result.rows[0] ? mapRun(result.rows[0]) : null
    })
  }

  async continueRun(workspaceId: string, runId: string) {
    return this.scoped(workspaceId, async (client) => {
      await lockWorkspace(client, workspaceId)
      const result = await client.query<any>(
        `select r.*,p.plan from app_private.demo_import_run r join app_private.demo_import_preview p on p.id=r.preview_id and p.workspace_id=r.workspace_id where r.workspace_id=$1 and r.id=$2 for update of r`,
        [workspaceId, runId],
      )
      const row = result.rows[0]
      if (!row) return null
      if (
        row.status === 'completed' ||
        row.status === 'rolled_back' ||
        row.status === 'rollback_blocked'
      )
        throw new DemoImportConflictError('import_terminal')
      const phase = Number(row.next_phase)
      const plan = row.plan as DemoImportPlan
      await client.query(
        `update app_private.demo_import_run set status='running',failure=null,updated_at=now() where workspace_id=$1 and id=$2`,
        [workspaceId, runId],
      )
      await client.query('savepoint demo_import_phase')
      try {
        if (phase === 0) await importFoundation(client, workspaceId, runId, plan)
        if (phase === 1) await importPurchases(client, workspaceId, runId, plan)
        if (phase === 2) await importTraining(client, workspaceId, runId, plan)
        if (phase === 3) await importScheduling(client, workspaceId, runId, plan)
        const next = phase + 1
        const completed = [...(row.completed_phases as string[]), phaseNames[phase]!]
        const updated = await client.query(
          `update app_private.demo_import_run set next_phase=$3,completed_phases=$4::jsonb,status=$5,updated_at=now() where workspace_id=$1 and id=$2 returning *`,
          [
            workspaceId,
            runId,
            next,
            JSON.stringify(completed),
            next === phaseNames.length ? 'completed' : 'partial',
          ],
        )
        return mapRun(updated.rows[0])
      } catch (error) {
        await client.query('rollback to savepoint demo_import_phase')
        await client.query(
          `update app_private.demo_import_run set status='partial',failure=$3::jsonb,updated_at=now() where workspace_id=$1 and id=$2`,
          [
            workspaceId,
            runId,
            JSON.stringify({ reason: error instanceof Error ? error.message : 'phase_failed' }),
          ],
        )
        throw error
      }
    })
  }

  async rollbackRun(workspaceId: string, runId: string) {
    return this.scoped(workspaceId, async (client) => {
      await lockWorkspace(client, workspaceId)
      const result = await client.query<any>(
        `select * from app_private.demo_import_run where workspace_id=$1 and id=$2 for update`,
        [workspaceId, runId],
      )
      const run = result.rows[0]
      if (!run) return null
      if (run.status === 'rolled_back') return mapRun(run)
      if (new Date(run.rollback_expires_at).getTime() <= Date.now())
        throw new DemoImportConflictError('rollback_blocked')
      await client.query(
        `update app_private.demo_import_run set status='rolling_back',updated_at=now() where workspace_id=$1 and id=$2`,
        [workspaceId, runId],
      )
      const ledgers = await client.query<any>(
        `select entity_type,target_id,accepted_version from app_private.demo_import_ledger where workspace_id=$1 and run_id=$2 order by phase desc`,
        [workspaceId, runId],
      )
      const blocked = await rollbackBlockers(client, workspaceId, ledgers.rows, run.before_state)
      if (blocked.length) {
        const updated = await client.query(
          `update app_private.demo_import_run set status='rollback_blocked',failure=$3::jsonb,updated_at=now() where workspace_id=$1 and id=$2 returning *`,
          [
            workspaceId,
            runId,
            JSON.stringify({ reason: 'imported_rows_changed', entities: blocked }),
          ],
        )
        return mapRun(updated.rows[0])
      }
      await deleteImported(client, workspaceId, ledgers.rows)
      const before = run.before_state as any
      await client.query(
        `update app_private.workspace set display_name=$2,time_zone=$3,version=version+1,updated_at=now() where id=$1`,
        [workspaceId, before.workspace.display_name, before.workspace.time_zone],
      )
      await client.query(
        `update app_private.training_preference set default_weight_unit=$2,version=version+1,updated_at=now() where workspace_id=$1`,
        [workspaceId, before.workspace.default_weight_unit],
      )
      for (const item of before.favorites ?? [])
        await client.query(
          `update app_private.exercise_definition set favorite=$3,version=version+1,updated_at=now()
           where workspace_id=$1 and id=$2 and favorite is distinct from $3`,
          [workspaceId, item.id, item.favorite],
        )
      const updated = await client.query(
        `update app_private.demo_import_run set status='rolled_back',failure=null,updated_at=now() where workspace_id=$1 and id=$2 returning *`,
        [workspaceId, runId],
      )
      return mapRun(updated.rows[0])
    })
  }

  private async scoped<T>(workspaceId: string, work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query(`select set_config('app.current_workspace_id',$1,true)`, [workspaceId])
      const result = await work(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}

async function baseline(client: PoolClient, workspaceId: string) {
  const result = await client.query<any>(
    `select w.version as workspace_version,p.version as preference_version,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.student where workspace_id=$1) students,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.lesson_purchase where workspace_id=$1) purchases,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.course_session where workspace_id=$1) sessions,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.exercise_definition where workspace_id=$1 and deleted_at is null) definitions,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.training_record where workspace_id=$1) records,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.schedule_series where workspace_id=$1) series,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.calendar_block where workspace_id=$1) blocks,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.availability_rule where workspace_id=$1) availability,
      (select json_build_object('count',count(*),'version',coalesce(sum(version),0),'updated',max(updated_at)) from app_private.availability_override where workspace_id=$1) overrides
     from app_private.workspace w join app_private.training_preference p on p.workspace_id=w.id where w.id=$1`,
    [workspaceId],
  )
  return createHash('sha256')
    .update(JSON.stringify(result.rows[0] ?? null))
    .digest('hex')
}

async function lockWorkspace(client: PoolClient, workspaceId: string) {
  await client.query(`select pg_advisory_xact_lock(hashtextextended($1,71))`, [workspaceId])
}

async function importFoundation(
  client: PoolClient,
  workspaceId: string,
  runId: string,
  plan: DemoImportPlan,
) {
  const settings = plan.normalized.settings
  await client.query(
    `update app_private.workspace set display_name=$2,time_zone=$3,version=version+1,updated_at=now() where id=$1`,
    [workspaceId, settings.displayName, settings.timeZone],
  )
  await client.query(
    `update app_private.training_preference set default_weight_unit=$2,version=version+1,updated_at=now() where workspace_id=$1`,
    [workspaceId, settings.defaultWeightUnit],
  )
  for (const item of plan.normalized.definitions as any[]) {
    if (item.matchedSystem) {
      await client.query(
        `update app_private.exercise_definition set favorite=$3,version=case when favorite=$3 then version else version+1 end,updated_at=case when favorite=$3 then updated_at else now() end where workspace_id=$1 and id=$2`,
        [workspaceId, item.targetId, item.favorite],
      )
      continue
    }
    const inserted = await client.query(
      `insert into app_private.exercise_definition(id,workspace_id,name,equipment,body_parts,movement_type,performance_metric,is_system,favorite)
       values($1,$2,$3,$4,$5,$6,$7,false,$8) on conflict(id) do nothing returning id`,
      [
        item.targetId,
        workspaceId,
        item.name,
        item.equipment,
        item.bodyParts,
        item.movementType,
        item.performanceMetric,
        item.favorite,
      ],
    )
    if (inserted.rowCount)
      await ledger(client, workspaceId, runId, 0, 'exercise_definition', item.targetId, 1)
  }
  for (const item of plan.normalized.students as any[]) {
    const inserted = await client.query(
      `insert into app_private.student(id,workspace_id,name,phone,goal,private_note,active,line_linked,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,false,$8,now()) on conflict(id) do nothing returning id`,
      [
        item.targetId,
        workspaceId,
        item.name,
        item.phone,
        item.goal,
        item.privateNote,
        item.active,
        item.createdAt,
      ],
    )
    if (inserted.rowCount) await ledger(client, workspaceId, runId, 0, 'student', item.targetId, 1)
  }
  const accepted = await client.query<any>(
    `select w.version as workspace_version,p.version as preference_version,
      coalesce(jsonb_agg(jsonb_build_object('id',d.id,'version',d.version) order by d.id)
        filter (where d.id is not null),'[]'::jsonb) as favorites
     from app_private.workspace w join app_private.training_preference p on p.workspace_id=w.id
     left join app_private.exercise_definition d on d.workspace_id=w.id and d.is_system and d.deleted_at is null
     where w.id=$1 group by w.version,p.version`,
    [workspaceId],
  )
  await client.query(
    `update app_private.demo_import_run
     set before_state=jsonb_set(before_state,'{accepted}',$3::jsonb,true),updated_at=now()
     where workspace_id=$1 and id=$2`,
    [workspaceId, runId, JSON.stringify(accepted.rows[0])],
  )
}

async function importPurchases(
  client: PoolClient,
  workspaceId: string,
  runId: string,
  plan: DemoImportPlan,
) {
  for (const item of plan.normalized.purchases as any[]) {
    const inserted = await client.query(
      `insert into app_private.lesson_purchase(id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency,private_note)
       values($1,$2,$3,$4,$5,$6,'TWD',$7) on conflict(id) do nothing returning id`,
      [
        item.targetId,
        workspaceId,
        item.targetStudentId,
        item.purchasedAt,
        item.lessonCount,
        item.amount,
        item.note,
      ],
    )
    if (inserted.rowCount)
      await ledger(client, workspaceId, runId, 1, 'lesson_purchase', item.targetId, 1)
  }
}

async function importTraining(
  client: PoolClient,
  workspaceId: string,
  runId: string,
  plan: DemoImportPlan,
) {
  const sessions = new Map((plan.normalized.sessions as any[]).map((item) => [item.id, item]))
  for (const record of plan.normalized.records as any[]) {
    const sourceSession: any = sessions.get(record.sessionId)
    const session = await client.query(
      `insert into app_private.course_session(id,workspace_id,student_id,status,is_legacy) values($1,$2,$3,$4,true) on conflict(id) do nothing returning id`,
      [sourceSession.targetId, workspaceId, sourceSession.targetStudentId, sourceSession.status],
    )
    if (session.rowCount)
      await ledger(client, workspaceId, runId, 2, 'course_session', sourceSession.targetId, 1)
    for (const exercise of record.exercises)
      if (exercise.orphanDefinition) {
        const orphan = exercise.orphanDefinition
        const inserted = await client.query(
          `insert into app_private.exercise_definition(id,workspace_id,name,equipment,body_parts,movement_type,performance_metric,is_system) values($1,$2,$3,'其他',$4,'局部動作',$5,false) on conflict(id) do nothing returning id`,
          [orphan.id, workspaceId, orphan.name, orphan.bodyParts, orphan.performanceMetric],
        )
        if (inserted.rowCount)
          await ledger(client, workspaceId, runId, 2, 'exercise_definition', orphan.id, 1)
      }
    const accepted = await client.query(
      `insert into app_private.training_record(id,workspace_id,session_id,private_note,created_at,updated_at) values($1,$2,$3,$4,$5,$5) on conflict(id) do nothing returning id`,
      [record.targetId, workspaceId, sourceSession.targetId, record.privateNote, record.updatedAt],
    )
    if (!accepted.rowCount) continue
    await ledger(client, workspaceId, runId, 2, 'training_record', record.targetId, 1)
    for (const exercise of record.exercises) {
      const definition = await client.query<any>(
        `select * from app_private.exercise_definition where workspace_id=$1 and id=$2`,
        [workspaceId, exercise.targetDefinitionId],
      )
      const d = definition.rows[0]
      await client.query(
        `insert into app_private.training_exercise(id,workspace_id,record_id,position,definition_id,definition_name,equipment,body_parts,movement_type,performance_metric) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          exercise.targetId,
          workspaceId,
          record.targetId,
          exercise.position,
          exercise.targetDefinitionId,
          exercise.name,
          d.equipment,
          d.body_parts,
          d.movement_type,
          exercise.performanceMetric,
        ],
      )
      for (const set of exercise.sets)
        await client.query(
          `insert into app_private.training_set(id,workspace_id,exercise_id,position,planned_weight,planned_reps,actual_reps,rpe,result,unit) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            set.targetId,
            workspaceId,
            exercise.targetId,
            set.position,
            set.plannedWeight ?? null,
            set.plannedReps ?? null,
            set.actualReps ?? null,
            set.rpe ?? null,
            set.result ?? null,
            set.unit,
          ],
        )
    }
  }
}

async function importScheduling(
  client: PoolClient,
  workspaceId: string,
  runId: string,
  plan: DemoImportPlan,
) {
  const sessions = plan.normalized.sessions as any[]
  for (const item of plan.normalized.series as any[]) {
    const related = sessions
      .filter((session) => session.seriesId === item.id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    if (!related.length) continue
    const inserted = await client.query(
      `insert into app_private.schedule_series(id,workspace_id,student_id,anchor_starts_at,local_weekday,local_start_time,duration_minutes,interval_weeks,auto_schedule_horizon,location,active)
       values($1,$2,$3,$4,$5,$6,$7,$8,'NONE',$9,$10) on conflict(id) do nothing returning id`,
      [
        item.targetId,
        workspaceId,
        item.targetStudentId,
        related[0].startsAt,
        item.weekday + 1,
        item.localStartTime,
        item.durationMinutes,
        item.intervalWeeks,
        related[0].location,
        item.active,
      ],
    )
    if (inserted.rowCount)
      await ledger(client, workspaceId, runId, 3, 'schedule_series', item.targetId, 1)
  }
  for (const item of sessions) {
    const updated = await client.query(
      `update app_private.course_session set is_legacy=false,series_id=$3,starts_at=$4,ends_at=$5,status=$6,completed_at=$7,location=$8,updated_at=now() where workspace_id=$1 and id=$2 and is_legacy returning id`,
      [
        workspaceId,
        item.targetId,
        item.targetSeriesId,
        item.startsAt,
        item.endsAt,
        item.status,
        item.completedAt ?? null,
        item.location,
      ],
    )
    if (!updated.rowCount) {
      const inserted = await client.query(
        `insert into app_private.course_session(id,workspace_id,student_id,status,is_legacy,series_id,starts_at,ends_at,completed_at,location) values($1,$2,$3,$4,false,$5,$6,$7,$8,$9) on conflict(id) do nothing returning id`,
        [
          item.targetId,
          workspaceId,
          item.targetStudentId,
          item.status,
          item.targetSeriesId,
          item.startsAt,
          item.endsAt,
          item.completedAt ?? null,
          item.location,
        ],
      )
      if (inserted.rowCount)
        await ledger(client, workspaceId, runId, 3, 'course_session', item.targetId, 1)
    }
  }
  for (const item of plan.normalized.availability as any[]) {
    const inserted = await client.query(
      `insert into app_private.availability_rule(id,workspace_id,weekday,start_time,end_time,active) values($1,$2,$3,$4,$5,true) on conflict do nothing returning id`,
      [item.targetId, workspaceId, item.weekday, item.startTime, item.endTime],
    )
    if (inserted.rowCount)
      await ledger(client, workspaceId, runId, 3, 'availability_rule', item.targetId, 1)
  }
  for (const item of plan.normalized.availabilityOverrides as any[]) {
    const inserted = await client.query(
      `insert into app_private.availability_override(id,workspace_id,local_date,windows) values($1,$2,$3,$4::jsonb) on conflict do nothing returning id`,
      [item.targetId, workspaceId, item.date, JSON.stringify(item.windows)],
    )
    if (inserted.rowCount)
      await ledger(client, workspaceId, runId, 3, 'availability_override', item.targetId, 1)
  }
  for (const item of plan.normalized.blocks as any[]) {
    const inserted = await client.query(
      `insert into app_private.calendar_block(id,workspace_id,recurrence_id,starts_at,ends_at,note) values($1,$2,$3,$4,$5,$6) on conflict(id) do nothing returning id`,
      [item.targetId, workspaceId, item.targetRecurrenceId, item.startsAt, item.endsAt, item.note],
    )
    if (inserted.rowCount)
      await ledger(client, workspaceId, runId, 3, 'calendar_block', item.targetId, 1)
  }
}

async function ledger(
  client: PoolClient,
  workspaceId: string,
  runId: string,
  phase: number,
  type: string,
  id: string,
  version: number | null,
) {
  await client.query(
    `insert into app_private.demo_import_ledger(workspace_id,run_id,phase,entity_type,target_id,accepted_version) values($1,$2,$3,$4,$5,$6) on conflict do nothing`,
    [workspaceId, runId, phase, type, id, version],
  )
}

async function rollbackBlockers(
  client: PoolClient,
  workspaceId: string,
  ledgers: any[],
  beforeState: any,
) {
  const blocked: Array<{ entity: string; id: string }> = []
  if (beforeState?.accepted) {
    const current = await client.query<any>(
      `select w.version as workspace_version,p.version as preference_version,
        coalesce(jsonb_agg(jsonb_build_object('id',d.id,'version',d.version) order by d.id)
          filter (where d.id is not null),'[]'::jsonb) as favorites
       from app_private.workspace w join app_private.training_preference p on p.workspace_id=w.id
       left join app_private.exercise_definition d on d.workspace_id=w.id and d.is_system and d.deleted_at is null
       where w.id=$1 group by w.version,p.version`,
      [workspaceId],
    )
    if (!sameAcceptedState(current.rows[0], beforeState.accepted))
      blocked.push({ entity: 'workspace_settings', id: workspaceId })
  }
  const tableFor: Record<string, string> = {
    student: 'student',
    lesson_purchase: 'lesson_purchase',
    course_session: 'course_session',
    exercise_definition: 'exercise_definition',
    training_record: 'training_record',
    schedule_series: 'schedule_series',
    availability_rule: 'availability_rule',
    availability_override: 'availability_override',
    calendar_block: 'calendar_block',
  }
  for (const item of ledgers) {
    const table = tableFor[item.entity_type]
    if (!table || item.accepted_version === null) continue
    const row = await client.query(
      `select version from app_private.${table} where workspace_id=$1 and id=$2`,
      [workspaceId, item.target_id],
    )
    if (!row.rows[0] || Number(row.rows[0].version) !== Number(item.accepted_version))
      blocked.push({ entity: item.entity_type, id: item.target_id })
  }
  const sessionIds = ledgers
    .filter((item) => item.entity_type === 'course_session')
    .map((item) => item.target_id)
  if (sessionIds.length) {
    const links = await client.query(
      `select session_id from app_private.capability_link where workspace_id=$1 and session_id=any($2::uuid[]) limit 20`,
      [workspaceId, sessionIds],
    )
    for (const item of links.rows) blocked.push({ entity: 'capability_link', id: item.session_id })
  }
  return blocked
}

function sameAcceptedState(current: any, accepted: any) {
  if (!current || !accepted) return false
  if (
    Number(current.workspace_version) !== Number(accepted.workspace_version) ||
    Number(current.preference_version) !== Number(accepted.preference_version)
  )
    return false
  const versions = (items: any[]) =>
    (items ?? [])
      .map((item) => `${String(item.id)}:${Number(item.version)}`)
      .sort()
      .join('|')
  return versions(current.favorites) === versions(accepted.favorites)
}

async function deleteImported(client: PoolClient, workspaceId: string, ledgers: any[]) {
  const order = [
    'calendar_block',
    'availability_override',
    'availability_rule',
    'training_record',
    'course_session',
    'schedule_series',
    'lesson_purchase',
    'student',
    'exercise_definition',
  ]
  const tableFor: Record<string, string> = Object.fromEntries(order.map((item) => [item, item]))
  for (const type of order) {
    const ids = ledgers.filter((item) => item.entity_type === type).map((item) => item.target_id)
    if (ids.length)
      await client.query(
        `delete from app_private.${tableFor[type]} where workspace_id=$1 and id=any($2::uuid[])`,
        [workspaceId, ids],
      )
  }
}

function mapRun(row: any): ImportRun {
  return {
    id: String(row.id),
    status: row.status,
    nextPhase: Number(row.next_phase),
    completedPhases: row.completed_phases as string[],
    failure: row.failure ?? null,
    rollbackExpiresAt: new Date(row.rollback_expires_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}
