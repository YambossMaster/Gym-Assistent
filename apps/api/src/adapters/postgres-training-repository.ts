import { createHash, randomUUID } from 'node:crypto'
import type { Pool, PoolClient, QueryResult } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { trainingCatalog } from '../training/catalog.js'
import {
  displayWeight,
  filterLibrary,
  qualifiedBest,
  todayTrainingPlan,
  type ExerciseDefinition,
  type ExerciseLibrary,
  type PerformanceMetric,
  type SaveTrainingInput,
  type SessionTraining,
  type TrainingExercise,
  type WeightUnit,
} from '../training/training.js'
import {
  TrainingVersionConflictError,
  type TrainingRepository,
} from '../training/training-repository.js'

type Queryable = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>
}

export class PostgresTrainingRepository implements TrainingRepository {
  constructor(private readonly pool: Pool) {}

  async resolveWorkspace(identity: AuthenticatedIdentity) {
    const row = await this.pool.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [identity.userId],
    )
    if (!row.rows[0]) throw new Error('Workspace was not found.')
    return row.rows[0].id
  }

  async bootstrapCatalog(workspaceId: string) {
    await this.scoped(workspaceId, async (client) => {
      const values: unknown[] = []
      const tuples = trainingCatalog.map((item, index) => {
        const offset = index * 8
        values.push(
          randomUUID(),
          workspaceId,
          item.catalogKey,
          item.name,
          item.equipment,
          item.bodyParts,
          item.movementType,
          item.performanceMetric,
        )
        return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},true)`
      })
      await client.query(
        `insert into app_private.exercise_definition (id,workspace_id,catalog_key,name,equipment,body_parts,movement_type,performance_metric,is_system) values ${tuples.join(',')} on conflict (workspace_id,catalog_key) do nothing`,
        values,
      )
      await client.query(
        `insert into app_private.training_preference(workspace_id) values($1) on conflict do nothing`,
        [workspaceId],
      )
    })
  }

  async listDefinitions(
    workspaceId: string,
    filters: {
      q?: string
      equipment?: string
      bodyParts?: string[]
      movementType?: string
      view?: string
    },
  ): Promise<ExerciseLibrary> {
    const result = await this.scoped(workspaceId, (client) =>
      client.query(
        `select * from app_private.exercise_definition where workspace_id=$1 and deleted_at is null order by catalog_key nulls last,created_at,id`,
        [workspaceId],
      ),
    )
    const all = result.rows.map(mapDefinition)
    return {
      definitions: filterLibrary(all, filters),
      filters: {
        equipment: [...new Set(all.map((item) => item.equipment))],
        bodyParts: [...new Set(all.flatMap((item) => item.bodyParts))],
        movementTypes: [...new Set(all.map((item) => item.movementType))],
      },
      totals: {
        all: all.length,
        favorite: all.filter((item) => item.favorite).length,
        custom: all.filter((item) => !item.isSystem).length,
      },
    }
  }

  async createDefinition(
    workspaceId: string,
    input: Parameters<TrainingRepository['createDefinition']>[1],
  ) {
    return this.withReceipt(
      workspaceId,
      input.operationId,
      'exercise:create',
      input,
      async (client) => {
        const row = await client.query(
          `insert into app_private.exercise_definition(id,workspace_id,name,equipment,body_parts,movement_type,performance_metric,is_system) values($1,$2,$3,$4,$5,$6,$7,false) returning *`,
          [
            randomUUID(),
            workspaceId,
            input.name,
            input.equipment,
            input.bodyParts,
            input.movementType,
            input.performanceMetric,
          ],
        )
        return mapDefinition(row.rows[0])
      },
    )
  }

  async updateDefinition(
    workspaceId: string,
    id: string,
    input: Parameters<TrainingRepository['updateDefinition']>[2],
  ) {
    return this.withReceipt(
      workspaceId,
      input.operationId,
      `exercise:${id}:update`,
      input,
      async (client) => {
        const current = await lockDefinition(client, workspaceId, id)
        if (!current) return null
        if (Number(current.version) !== input.version)
          throw new TrainingVersionConflictError('version_conflict', mapDefinition(current))
        const row = await client.query(
          `update app_private.exercise_definition set name=$3,equipment=$4,body_parts=$5,movement_type=$6,performance_metric=$7,version=version+1,updated_at=now() where workspace_id=$1 and id=$2 and deleted_at is null returning *`,
          [
            workspaceId,
            id,
            input.name,
            input.equipment,
            input.bodyParts,
            input.movementType,
            input.performanceMetric,
          ],
        )
        return row.rows[0] ? mapDefinition(row.rows[0]) : null
      },
    )
  }

  async favoriteDefinition(
    workspaceId: string,
    id: string,
    input: Parameters<TrainingRepository['favoriteDefinition']>[2],
  ) {
    return this.withReceipt(
      workspaceId,
      input.operationId,
      `exercise:${id}:favorite`,
      input,
      async (client) => {
        const current = await lockDefinition(client, workspaceId, id)
        if (!current) return null
        if (Number(current.version) !== input.version)
          throw new TrainingVersionConflictError('version_conflict', mapDefinition(current))
        const row = await client.query(
          `update app_private.exercise_definition set favorite=$3,version=version+1,updated_at=now() where workspace_id=$1 and id=$2 and deleted_at is null returning *`,
          [workspaceId, id, input.favorite],
        )
        return row.rows[0] ? mapDefinition(row.rows[0]) : null
      },
    )
  }

  async deleteDefinition(
    workspaceId: string,
    id: string,
    input: Parameters<TrainingRepository['deleteDefinition']>[2],
  ) {
    return this.withReceipt(
      workspaceId,
      input.operationId,
      `exercise:${id}:delete`,
      input,
      async (client) => {
        const current = await lockDefinition(client, workspaceId, id)
        if (!current) return null
        if (Number(current.version) !== input.version)
          throw new TrainingVersionConflictError('version_conflict', mapDefinition(current))
        await client.query(
          `update app_private.exercise_definition set deleted_at=now(),version=version+1,updated_at=now() where workspace_id=$1 and id=$2`,
          [workspaceId, id],
        )
        return true
      },
    )
  }

  async getPreference(workspaceId: string) {
    const row = await this.scoped(workspaceId, (client) =>
      client.query<{ default_weight_unit: WeightUnit; version: number }>(
        `select default_weight_unit,version from app_private.training_preference where workspace_id=$1`,
        [workspaceId],
      ),
    )
    return row.rows[0]
      ? { defaultWeightUnit: row.rows[0].default_weight_unit, version: Number(row.rows[0].version) }
      : { defaultWeightUnit: 'kg' as const, version: 0 }
  }

  async setPreference(
    workspaceId: string,
    input: Parameters<TrainingRepository['setPreference']>[1],
  ) {
    return this.withReceipt(workspaceId, input.operationId, 'preference', input, async (client) => {
      const current = await client.query<{ default_weight_unit: WeightUnit; version: number }>(
        `select default_weight_unit,version from app_private.training_preference where workspace_id=$1 for update`,
        [workspaceId],
      )
      const version = Number(current.rows[0]?.version ?? 0)
      if (version !== input.version)
        throw new TrainingVersionConflictError(
          'version_conflict',
          current.rows[0] && { defaultWeightUnit: current.rows[0].default_weight_unit, version },
        )
      const row = await client.query<{ default_weight_unit: WeightUnit; version: number }>(
        `insert into app_private.training_preference(workspace_id,default_weight_unit,version) values($1,$2,1) on conflict(workspace_id) do update set default_weight_unit=excluded.default_weight_unit,version=app_private.training_preference.version+1,updated_at=now() returning default_weight_unit,version`,
        [workspaceId, input.defaultWeightUnit],
      )
      return {
        defaultWeightUnit: row.rows[0]!.default_weight_unit,
        version: Number(row.rows[0]!.version),
      }
    })
  }

  async getSessionTraining(workspaceId: string, sessionId: string) {
    return this.scoped(workspaceId, (client) =>
      this.readSessionTraining(client, workspaceId, sessionId),
    )
  }

  async todayTrainingPlans(workspaceId: string, sessionIds: string[]) {
    if (!sessionIds.length) return {}
    const result = await this.scoped(workspaceId, (client) =>
      client.query<{
        session_id: string
        exercise_count: number
        exercises_with_sets: number
        set_count: number
        planned_set_count: number
      }>(
        `select cs.id session_id,
          count(distinct te.id)::int exercise_count,
          count(distinct te.id) filter (where ts.id is not null)::int exercises_with_sets,
          count(ts.id)::int set_count,
          count(ts.id) filter (where ts.planned_reps is not null and
            (te.performance_metric='reps' or ts.planned_weight is not null))::int planned_set_count
         from app_private.course_session cs
         left join app_private.training_record tr on tr.workspace_id=cs.workspace_id and tr.session_id=cs.id
         left join app_private.training_exercise te on te.workspace_id=tr.workspace_id and te.record_id=tr.id
         left join app_private.training_set ts on ts.workspace_id=te.workspace_id and ts.exercise_id=te.id
         where cs.workspace_id=$1 and cs.id=any($2::uuid[]) and not cs.is_legacy
         group by cs.id`,
        [workspaceId, sessionIds],
      ),
    )
    return Object.fromEntries(
      result.rows.map((row) => [
        row.session_id,
        todayTrainingPlan({
          exerciseCount: Number(row.exercise_count),
          exercisesWithSets: Number(row.exercises_with_sets),
          setCount: Number(row.set_count),
          plannedSetCount: Number(row.planned_set_count),
        }),
      ]),
    )
  }

  async saveSessionTraining(
    workspaceId: string,
    sessionId: string,
    input: SaveTrainingInput,
    complete: boolean,
  ) {
    return this.withReceipt(
      workspaceId,
      input.operationId,
      `session:${sessionId}:${complete ? 'complete' : 'save'}`,
      input,
      async (client) => {
        const sessionRow = await client.query(
          `select * from app_private.course_session where workspace_id=$1 and id=$2 and not is_legacy for update`,
          [workspaceId, sessionId],
        )
        const session = sessionRow.rows[0]
        if (!session) return null
        if (complete && Number(session.version) !== input.sessionVersion)
          throw new TrainingVersionConflictError('version_conflict', {
            sessionVersion: Number(session.version),
          })
        if (session.status === 'cancelled' || (complete && session.status !== 'scheduled'))
          throw new TrainingVersionConflictError('version_conflict', {
            status: session.status,
            sessionVersion: Number(session.version),
          })
        const recordRows = await client.query(
          `select * from app_private.training_record where workspace_id=$1 and session_id=$2 for update`,
          [workspaceId, sessionId],
        )
        const currentRecord = recordRows.rows[0]
        if (Number(currentRecord?.version ?? 0) !== input.recordVersion)
          throw new TrainingVersionConflictError('version_conflict', {
            recordVersion: Number(currentRecord?.version ?? 0),
          })

        const existingExercises = currentRecord
          ? await client.query(
              `select * from app_private.training_exercise where workspace_id=$1 and record_id=$2`,
              [workspaceId, currentRecord.id],
            )
          : { rows: [] }
        const existingSets = currentRecord
          ? await client.query(
              `select ts.* from app_private.training_set ts join app_private.training_exercise te on te.workspace_id=ts.workspace_id and te.id=ts.exercise_id where te.workspace_id=$1 and te.record_id=$2`,
              [workspaceId, currentRecord.id],
            )
          : { rows: [] }
        const existingById = new Map(existingExercises.rows.map((row) => [String(row.id), row]))
        const setParents = new Map(
          existingSets.rows.map((row) => [String(row.id), String(row.exercise_id)]),
        )
        for (const exercise of input.exercises) {
          const existing = existingById.get(exercise.id)
          if (existing && String(existing.definition_id) !== exercise.definitionId)
            throw new TrainingVersionConflictError('definition_conflict')
          for (const set of exercise.sets)
            if (setParents.has(set.id) && setParents.get(set.id) !== exercise.id)
              throw new TrainingVersionConflictError('definition_conflict')
        }
        const definitionIds = [
          ...new Set(
            input.exercises.filter((x) => !existingById.has(x.id)).map((x) => x.definitionId),
          ),
        ].sort()
        const definitions = new Map<string, Record<string, unknown>>()
        for (const definitionId of definitionIds) {
          const definition = await lockDefinition(client, workspaceId, definitionId)
          if (!definition) throw new TrainingVersionConflictError('definition_conflict')
          const occurrence = input.exercises.find(
            (x) => x.definitionId === definitionId && !existingById.has(x.id),
          )!
          if (
            !occurrence.definitionVersion ||
            Number(definition.version) !== occurrence.definitionVersion
          )
            throw new TrainingVersionConflictError('definition_conflict', mapDefinition(definition))
          definitions.set(definitionId, definition)
        }

        const recordId = String(currentRecord?.id ?? randomUUID())
        const nextContent = JSON.stringify({
          privateNote: input.privateNote,
          exercises: input.exercises.map(({ definitionVersion: _, ...x }) => x),
        })
        const currentContent = JSON.stringify({
          privateNote: String(currentRecord?.private_note ?? ''),
          exercises: existingInput(existingExercises.rows, existingSets.rows),
        })
        const changed = nextContent !== currentContent
        if (!currentRecord)
          await client.query(
            `insert into app_private.training_record(id,workspace_id,session_id,private_note) values($1,$2,$3,$4)`,
            [recordId, workspaceId, sessionId, input.privateNote],
          )
        else if (changed)
          await client.query(
            `update app_private.training_record set private_note=$3,version=version+1,updated_at=now() where workspace_id=$1 and id=$2`,
            [workspaceId, recordId, input.privateNote],
          )
        if (changed || !currentRecord) {
          await client.query(
            `delete from app_private.training_exercise where workspace_id=$1 and record_id=$2`,
            [workspaceId, recordId],
          )
          for (const [position, exercise] of input.exercises.entries()) {
            const source = existingById.get(exercise.id) ?? definitions.get(exercise.definitionId)!
            await client.query(
              `insert into app_private.training_exercise(id,workspace_id,record_id,position,definition_id,definition_name,equipment,body_parts,movement_type,performance_metric) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [
                exercise.id,
                workspaceId,
                recordId,
                position,
                exercise.definitionId,
                source.definition_name ?? source.name,
                source.equipment,
                source.body_parts,
                source.movement_type,
                source.performance_metric,
              ],
            )
            for (const [setPosition, set] of exercise.sets.entries())
              await client.query(
                `insert into app_private.training_set(id,workspace_id,exercise_id,position,planned_weight,planned_reps,actual_reps,rpe,result,unit) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [
                  set.id,
                  workspaceId,
                  exercise.id,
                  setPosition,
                  set.plannedWeight,
                  set.plannedReps,
                  set.actualReps,
                  set.rpe,
                  set.result,
                  set.unit,
                ],
              )
          }
        }
        if (complete)
          await client.query(
            `update app_private.course_session set status='completed',completed_at=now(),version=version+1,updated_at=now() where workspace_id=$1 and id=$2`,
            [workspaceId, sessionId],
          )
        return this.readSessionTraining(client, workspaceId, sessionId)
      },
    )
  }

  async getDefaults(
    workspaceId: string,
    sessionId: string,
    definitionId: string,
    metric: PerformanceMetric,
  ) {
    return this.scoped(workspaceId, async (client) => {
      const owns = await client.query(
        `select 1 from app_private.course_session where workspace_id=$1 and id=$2 and not is_legacy`,
        [workspaceId, sessionId],
      )
      if (!owns.rowCount) return null
      const row = await client.query(
        `select ts.planned_weight,coalesce(ts.actual_reps,ts.planned_reps) planned_reps,ts.unit from app_private.course_session current_session join app_private.course_session previous on previous.workspace_id=current_session.workspace_id and previous.student_id=current_session.student_id and previous.starts_at<current_session.starts_at and previous.status<>'cancelled' join app_private.training_record tr on tr.workspace_id=previous.workspace_id and tr.session_id=previous.id join app_private.training_exercise te on te.workspace_id=tr.workspace_id and te.record_id=tr.id and te.definition_id=$3 and te.performance_metric=$4 join app_private.training_set ts on ts.workspace_id=te.workspace_id and ts.exercise_id=te.id where current_session.workspace_id=$1 and current_session.id=$2 and te.position=(select min(x.position) from app_private.training_exercise x where x.workspace_id=te.workspace_id and x.record_id=te.record_id and x.definition_id=$3 and x.performance_metric=$4) order by previous.starts_at desc,previous.id desc,ts.position limit 100`,
        [workspaceId, sessionId, definitionId, metric],
      )
      return row.rows.map((set) => ({
        plannedWeight: set.planned_weight === null ? null : Number(set.planned_weight),
        plannedReps: set.planned_reps === null ? null : Number(set.planned_reps),
        unit: set.unit as WeightUnit,
      }))
    })
  }

  async getStudentPerformance(workspaceId: string, studentId: string) {
    const owns = await this.pool.query(
      `select 1 from app_private.student where workspace_id=$1 and id=$2`,
      [workspaceId, studentId],
    )
    if (!owns.rowCount) return null
    const points = await this.performancePoints(workspaceId, studentId)
    const groups = new Map<string, typeof points>()
    for (const point of points) {
      const key = `${point.definitionId}:${point.metric}`
      groups.set(key, [...(groups.get(key) ?? []), point])
    }
    return [...groups.entries()]
      .map(([key, series]) => {
        const latest = series.at(-1)!
        return {
          definitionId: key.split(':')[0],
          metric: latest.metric,
          name: latest.name,
          sessionCount: new Set(series.map((x) => x.sessionId)).size,
          latest: latest.value,
          personal: Math.max(...series.map((x) => x.value)),
          unit: latest.unit,
          latestAt: latest.startsAt,
        }
      })
      .sort(
        (a, b) =>
          b.sessionCount - a.sessionCount ||
          String(b.latestAt).localeCompare(String(a.latestAt)) ||
          a.name.localeCompare(b.name),
      )
  }

  async getStudentTrend(
    workspaceId: string,
    studentId: string,
    definitionId: string,
    metric: PerformanceMetric,
  ) {
    const directory = await this.getStudentPerformance(workspaceId, studentId)
    if (!directory) return null
    const points = (await this.performancePoints(workspaceId, studentId)).filter(
      (x) => x.definitionId === definitionId && x.metric === metric,
    )
    const entry = directory.find((x: any) => x.definitionId === definitionId && x.metric === metric)
    return entry
      ? { ...entry, points: points.map(({ sessionStatus: _status, ...point }) => point) }
      : { definitionId, metric, points: [] }
  }

  private async performancePoints(workspaceId: string, studentId: string) {
    const pref = await this.getPreference(workspaceId)
    return this.scoped(workspaceId, (client) =>
      this.performancePointsWith(client, workspaceId, studentId, pref.defaultWeightUnit),
    )
  }

  private async performancePointsWith(
    queryable: Queryable,
    workspaceId: string,
    studentId: string,
    defaultUnit: WeightUnit,
  ) {
    const rows = await queryable.query(
      `select cs.id session_id,cs.status session_status,cs.starts_at,te.definition_id,te.definition_name,te.performance_metric,ts.planned_weight,ts.actual_reps,ts.unit from app_private.course_session cs join app_private.training_record tr on tr.workspace_id=cs.workspace_id and tr.session_id=cs.id join app_private.training_exercise te on te.workspace_id=tr.workspace_id and te.record_id=tr.id join app_private.training_set ts on ts.workspace_id=te.workspace_id and ts.exercise_id=te.id where cs.workspace_id=$1 and cs.student_id=$2 and cs.status in ('scheduled','completed') and not cs.is_legacy and ts.result='completed' order by cs.starts_at,cs.id,te.position,ts.position`,
      [workspaceId, studentId],
    )
    const groups = new Map<string, any[]>()
    for (const row of rows.rows) {
      const key = `${row.session_id}:${row.definition_id}:${row.performance_metric}`
      groups.set(key, [...(groups.get(key) ?? []), row])
    }
    return [...groups.values()].flatMap((sets) => {
      const first = sets[0]
      const value =
        first.performance_metric === 'reps'
          ? Math.max(
              ...sets
                .filter((x) => x.actual_reps !== null)
                .map((x) => Number(x.actual_reps))
                .filter(Number.isFinite),
            )
          : qualifiedBest(
              'weight',
              sets.map((x) => ({
                plannedWeight: x.planned_weight === null ? null : Number(x.planned_weight),
                plannedReps: null,
                actualReps: null,
                rpe: null,
                result: 'completed',
                unit: x.unit,
                id: '',
              })),
              defaultUnit,
            )
      return value === null || !Number.isFinite(value)
        ? []
        : [
            {
              sessionId: first.session_id,
              sessionStatus: first.session_status,
              startsAt: first.starts_at,
              definitionId: first.definition_id,
              name: first.definition_name,
              metric: first.performance_metric as PerformanceMetric,
              value: first.performance_metric === 'weight' ? displayWeight(value) : value,
              unit: first.performance_metric === 'weight' ? defaultUnit : null,
            },
          ]
    })
  }

  private async readSessionTraining(
    queryable: Queryable,
    workspaceId: string,
    sessionId: string,
  ): Promise<SessionTraining | null> {
    const sessionRows = await queryable.query(
      `select cs.*,s.name student_name,
        coalesce((select sum(lesson_count)::int from app_private.lesson_purchase lp where lp.workspace_id=cs.workspace_id and lp.student_id=cs.student_id),0) purchased,
        (select count(*)::int from app_private.course_session x where x.workspace_id=cs.workspace_id and x.student_id=cs.student_id and x.status='completed') completed,
        tr.id training_record_id,tr.version training_record_version,
        tr.private_note training_private_note,tr.updated_at training_updated_at,
        coalesce(tp.default_weight_unit,'kg') default_weight_unit
       from app_private.course_session cs
       join app_private.student s on s.workspace_id=cs.workspace_id and s.id=cs.student_id
       left join app_private.training_record tr on tr.workspace_id=cs.workspace_id and tr.session_id=cs.id
       left join app_private.training_preference tp on tp.workspace_id=cs.workspace_id
       where cs.workspace_id=$1 and cs.id=$2 and not cs.is_legacy`,
      [workspaceId, sessionId],
    )
    const s = sessionRows.rows[0]
    if (!s) return null
    const record = s.training_record_id
      ? {
          id: s.training_record_id,
          version: s.training_record_version,
          private_note: s.training_private_note,
          updated_at: s.training_updated_at,
        }
      : null
    const currentRows = record
      ? await queryable.query(
          `select te.*,
            ts.id set_id,ts.planned_weight,ts.planned_reps,ts.actual_reps,
            ts.rpe,ts.result,ts.unit
           from app_private.training_exercise te
           left join app_private.training_set ts
             on ts.workspace_id=te.workspace_id and ts.exercise_id=te.id
           where te.workspace_id=$1 and te.record_id=$2
           order by te.position,ts.position`,
          [workspaceId, record.id],
        )
      : { rows: [] }
    const currentByExercise = new Map<string, { row: any; sets: any[] }>()
    for (const row of currentRows.rows) {
      const exerciseId = String(row.id)
      const current = currentByExercise.get(exerciseId) ?? { row, sets: [] }
      if (row.set_id)
        current.sets.push({
          id: row.set_id,
          exercise_id: row.id,
          planned_weight: row.planned_weight,
          planned_reps: row.planned_reps,
          actual_reps: row.actual_reps,
          rpe: row.rpe,
          result: row.result,
          unit: row.unit,
        })
      currentByExercise.set(exerciseId, current)
    }
    const exercises = [...currentByExercise.values()].map(({ row, sets }) => mapExercise(row, sets))
    const defaultUnit = (s.default_weight_unit ?? 'kg') as WeightUnit
    const historical = await this.performancePointsWith(
      queryable,
      workspaceId,
      String(s.student_id),
      defaultUnit,
    )
    const summaries = exercises.map((exercise) => {
      const unit = defaultUnit as WeightUnit
      const current = qualifiedBest(exercise.performanceMetric, exercise.sets, unit)
      const history = historical.filter(
        (point) =>
          point.definitionId === exercise.definitionId &&
          point.metric === exercise.performanceMetric,
      )
      const previous = history
        .filter(
          (point) =>
            point.sessionStatus === 'completed' &&
            new Date(point.startsAt).getTime() < new Date(String(s.starts_at)).getTime(),
        )
        .at(-1)
      const displayedCurrent =
        current === null
          ? null
          : exercise.performanceMetric === 'weight'
            ? displayWeight(current)
            : current
      const personalValues = [
        ...history.map((point) => point.value),
        ...(displayedCurrent === null ? [] : [displayedCurrent]),
      ]
      return {
        occurrenceId: exercise.id,
        definitionId: exercise.definitionId,
        metric: exercise.performanceMetric,
        unit: exercise.performanceMetric === 'weight' ? unit : null,
        current: displayedCurrent,
        previous: previous?.value ?? null,
        personal: personalValues.length ? Math.max(...personalValues) : null,
        history: history.map(({ sessionId, startsAt, value, unit: pointUnit }) => ({
          sessionId,
          startsAt: new Date(startsAt),
          value,
          unit: pointUnit,
        })),
      }
    })
    const purchased = Number(s.purchased),
      completed = Number(s.completed)
    return {
      session: {
        id: String(s.id),
        studentId: String(s.student_id),
        studentName: String(s.student_name),
        startsAt: new Date(String(s.starts_at)),
        endsAt: new Date(String(s.ends_at)),
        location: String(s.location),
        status: s.status as any,
        version: Number(s.version),
        isLegacy: false,
      },
      lessonSummary: { purchased, completed, remaining: purchased - completed },
      record: {
        id: record ? String(record.id) : null,
        version: Number(record?.version ?? 0),
        privateNote: String(record?.private_note ?? ''),
        exercises,
        updatedAt: record ? new Date(String(record.updated_at)) : null,
      },
      defaultWeightUnit: defaultUnit,
      exerciseSummaries: summaries,
      allowedActions: {
        canEditTraining: s.status !== 'cancelled',
        canComplete: s.status === 'scheduled',
        canReopen: s.status === 'completed',
      },
    }
  }

  private async withReceipt<T>(
    workspaceId: string,
    operationId: string,
    target: string,
    payload: unknown,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect()
    const hash = createHash('sha256').update(stableJson(payload)).digest('hex')
    try {
      await client.query('begin')
      await client.query(`select set_config('app.current_workspace_id',$1,true)`, [workspaceId])
      const prior = await client.query<{ target: string; payload_hash: string; response: T }>(
        `select target,payload_hash,response from app_private.training_mutation_receipt where workspace_id=$1 and operation_id=$2 and accepted_at>now()-interval '7 days' for update`,
        [workspaceId, operationId],
      )
      if (prior.rows[0]) {
        if (prior.rows[0].target !== target || prior.rows[0].payload_hash !== hash)
          throw new TrainingVersionConflictError('operation_mismatch')
        await client.query('commit')
        return prior.rows[0].response
      }
      const result = await work(client)
      await client.query(
        `insert into app_private.training_mutation_receipt(workspace_id,operation_id,target,payload_hash,response) values($1,$2,$3,$4,$5)`,
        [workspaceId, operationId, target, hash, JSON.stringify(result)],
      )
      await client.query(
        `delete from app_private.training_mutation_receipt where accepted_at<=now()-interval '7 days'`,
      )
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  private async scoped<T>(
    workspaceId: string,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
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

function mapDefinition(row: any): ExerciseDefinition {
  return {
    id: String(row.id),
    catalogKey: row.catalog_key ?? null,
    name: String(row.name),
    equipment: String(row.equipment),
    bodyParts: row.body_parts as string[],
    movementType: row.movement_type,
    performanceMetric: row.performance_metric,
    isSystem: Boolean(row.is_system),
    favorite: Boolean(row.favorite),
    version: Number(row.version),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}
function mapExercise(row: any, sets: any[]): TrainingExercise {
  return {
    id: String(row.id),
    definitionId: String(row.definition_id),
    definitionName: String(row.definition_name),
    equipment: String(row.equipment),
    bodyParts: row.body_parts as string[],
    movementType: row.movement_type,
    performanceMetric: row.performance_metric,
    sets: sets.map((set) => ({
      id: String(set.id),
      plannedWeight: set.planned_weight === null ? null : Number(set.planned_weight),
      plannedReps: set.planned_reps === null ? null : Number(set.planned_reps),
      actualReps: set.actual_reps === null ? null : Number(set.actual_reps),
      rpe: set.rpe === null ? null : Number(set.rpe),
      result: set.result,
      unit: set.unit,
    })),
  }
}
function existingInput(exercises: any[], sets: any[]) {
  return exercises
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((exercise) => ({
      id: String(exercise.id),
      definitionId: String(exercise.definition_id),
      sets: sets
        .filter((set) => set.exercise_id === exercise.id)
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((set) => ({
          id: String(set.id),
          plannedWeight: set.planned_weight === null ? null : Number(set.planned_weight),
          plannedReps: set.planned_reps === null ? null : Number(set.planned_reps),
          actualReps: set.actual_reps === null ? null : Number(set.actual_reps),
          rpe: set.rpe === null ? null : Number(set.rpe),
          result: set.result,
          unit: set.unit,
        })),
    }))
}
async function lockDefinition(client: Queryable, workspaceId: string, id: string) {
  const row = await client.query(
    `select * from app_private.exercise_definition where workspace_id=$1 and id=$2 and deleted_at is null for update`,
    [workspaceId, id],
  )
  return row.rows[0] ?? null
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'operationId')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
