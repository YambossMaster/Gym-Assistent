import { createHash, randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'

const money = z.object({
  amountMinor: z.number().int().min(0).max(999_999_999_999),
  currency: z.string().regex(/^[A-Z]{3}$/),
})
export const settleSchema = z
  .object({
    requestId: z.uuid(),
    items: z
      .array(money.extend({ sessionId: z.uuid(), expectedVersion: z.number().int().positive() }))
      .min(1)
      .max(50),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>()
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.sessionId))
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'sessionId'],
          message: '重複的課程。',
        })
      seen.add(item.sessionId)
    }
  })
export const correctPriceSchema = money
  .extend({
    expectedSessionVersion: z.number().int().positive(),
    expectedPurchaseVersion: z.number().int().positive(),
  })
  .strict()
export const reEvaluateSchema = z
  .object({
    expectedSessionVersion: z.number().int().positive(),
    expectedSourceVersion: z.number().int().positive(),
  })
  .strict()

export class SingleLessonConflict extends Error {
  constructor(
    public readonly code: string,
    public readonly affectedIds: string[] = [],
    public readonly current: unknown = null,
  ) {
    super(code)
  }
}

type SourceRow = {
  session_id: string
  student_id: string
  session_version: number
  source_version: number
  kind: string
  purchase_id: string | null
  purchase_version: number | null
  ends_at: Date
  venue_id: string | null
}

export class SingleLessonBillingModule {
  constructor(
    private readonly pool: Pool,
    private readonly workspaceOf: (identity: AuthenticatedIdentity) => Promise<string>,
  ) {}

  private async transact<T>(
    identity: AuthenticatedIdentity,
    work: (client: PoolClient, workspaceId: string) => Promise<T>,
  ): Promise<T> {
    const workspaceId = await this.workspaceOf(identity)
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      const result = await work(client, workspaceId)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async pending(identity: AuthenticatedIdentity, cursor?: string) {
    const after = cursor ? z.uuid().parse(cursor) : null
    return this.transact(identity, async (client, workspaceId) => {
      const result = await client.query(
        `select s.id "sessionId",s.version "sessionVersion",a.version "sourceVersion",
          st.id "studentId",st.name "studentName",v.name "venueName",
          (s.ends_at at time zone w.time_zone)::date::text date,
          st.single_lesson_amount_minor "suggestedAmountMinor",st.single_lesson_currency "suggestedCurrency"
         from app_private.session_lesson_source a
         join app_private.course_session s on s.workspace_id=a.workspace_id and s.id=a.session_id
         join app_private.student st on st.workspace_id=a.workspace_id and st.id=a.student_id
         join app_private.workspace w on w.id=a.workspace_id
         left join app_private.venue v on v.workspace_id=s.workspace_id and v.id=s.venue_id
         where a.workspace_id=$1 and a.kind='pending' and s.status='completed'
           and ($2::uuid is null or s.id>$2)
         order by s.id limit 51`,
        [workspaceId, after],
      )
      const items = result.rows.slice(0, 50).map((row) => ({
        ...row,
        suggestedAmountMinor:
          row.suggestedAmountMinor === null ? null : Number(row.suggestedAmountMinor),
      }))
      return { items, nextCursor: result.rows.length > 50 ? items.at(-1)?.sessionId : null }
    })
  }

  private async lockSessions(
    client: PoolClient,
    workspaceId: string,
    ids: string[],
  ): Promise<SourceRow[]> {
    // Every completion and purchase edit locks its Student first. Follow the same order here.
    const owners = await client.query<{ student_id: string }>(
      'select distinct student_id from app_private.course_session where workspace_id=$1 and id=any($2::uuid[]) order by student_id',
      [workspaceId, ids],
    )
    for (const owner of owners.rows)
      await client.query(
        'select id from app_private.student where workspace_id=$1 and id=$2 for update',
        [workspaceId, owner.student_id],
      )
    const result = await client.query<SourceRow>(
      `select s.id session_id,s.student_id,s.version session_version,a.version source_version,a.kind,a.purchase_id,p.version purchase_version,s.ends_at,s.venue_id
       from app_private.course_session s
       join app_private.session_lesson_source a on a.workspace_id=s.workspace_id and a.session_id=s.id
       left join app_private.lesson_purchase p on p.workspace_id=a.workspace_id and p.id=a.purchase_id
       where s.workspace_id=$1 and s.id=any($2::uuid[]) and s.status='completed'
       order by s.id for update of s,a`,
      [workspaceId, ids],
    )
    return result.rows
  }

  private async createSingle(
    client: PoolClient,
    workspaceId: string,
    source: SourceRow,
    amountMinor: number,
    currency: string,
  ) {
    const purchaseId = randomUUID()
    await client.query(
      `insert into app_private.lesson_purchase
       (id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency,private_note,collection_mode,source_kind,source_session_id)
       values($1,$2,$3,$4,1,$5,$6,'','coach','generated_single',$7)`,
      [
        purchaseId,
        workspaceId,
        source.student_id,
        source.ends_at,
        amountMinor,
        currency,
        source.session_id,
      ],
    )
    await client.query(
      "update app_private.session_lesson_source set kind='generated_single',purchase_id=$3,version=version+1,decided_at=now() where workspace_id=$1 and session_id=$2",
      [workspaceId, source.session_id, purchaseId],
    )
    const changed = await client.query<{ version: number }>(
      'update app_private.course_session set version=version+1,updated_at=now() where workspace_id=$1 and id=$2 returning version',
      [workspaceId, source.session_id],
    )
    return {
      sessionId: source.session_id,
      sessionVersion: changed.rows[0]!.version,
      sourceVersion: source.source_version + 1,
      purchaseId,
      purchaseVersion: 1,
    }
  }

  async settle(identity: AuthenticatedIdentity, raw: unknown) {
    const input = settleSchema.parse(raw)
    const hash = createHash('sha256').update(JSON.stringify(input.items)).digest('hex')
    return this.transact(identity, async (client, workspaceId) => {
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [
        `single-settle:${workspaceId}:${input.requestId}`,
      ])
      const prior = await client.query<{ payload_hash: string; response: unknown }>(
        'select payload_hash,response from app_private.single_lesson_settlement_request where workspace_id=$1 and request_id=$2',
        [workspaceId, input.requestId],
      )
      if (prior.rows[0]) {
        if (prior.rows[0].payload_hash !== hash) throw new SingleLessonConflict('request_id_reused')
        return prior.rows[0].response
      }
      const ids = input.items.map((item) => item.sessionId)
      const sources = new Map(
        (await this.lockSessions(client, workspaceId, ids)).map((source) => [
          source.session_id,
          source,
        ]),
      )
      const affected = input.items
        .filter((item) => {
          const source = sources.get(item.sessionId)
          return (
            !source || source.kind !== 'pending' || source.session_version !== item.expectedVersion
          )
        })
        .map((item) => item.sessionId)
      if (affected.length)
        throw new SingleLessonConflict(
          'pending_changed',
          affected,
          affected.map((sessionId) => {
            const source = sources.get(sessionId)
            return source
              ? {
                  sessionId,
                  sessionVersion: source.session_version,
                  sourceVersion: source.source_version,
                  kind: source.kind,
                }
              : { sessionId, state: 'unavailable' }
          }),
        )
      const items = []
      for (const item of input.items)
        items.push(
          await this.createSingle(
            client,
            workspaceId,
            sources.get(item.sessionId)!,
            item.amountMinor,
            item.currency,
          ),
        )
      const response = { items }
      await client.query(
        'insert into app_private.single_lesson_settlement_request(workspace_id,request_id,payload_hash,response) values($1,$2,$3,$4::jsonb)',
        [workspaceId, input.requestId, hash, JSON.stringify(response)],
      )
      return response
    })
  }

  async correctPrice(identity: AuthenticatedIdentity, sessionId: string, raw: unknown) {
    const input = correctPriceSchema.parse(raw)
    return this.transact(identity, async (client, workspaceId) => {
      const source = (await this.lockSessions(client, workspaceId, [sessionId]))[0]
      if (
        !source ||
        source.kind !== 'generated_single' ||
        source.session_version !== input.expectedSessionVersion ||
        source.purchase_version !== input.expectedPurchaseVersion
      )
        throw new SingleLessonConflict(
          'single_lesson_changed',
          [sessionId],
          source
            ? {
                sessionId,
                sessionVersion: source.session_version,
                sourceVersion: source.source_version,
                kind: source.kind,
                purchaseVersion: source.purchase_version,
              }
            : null,
        )
      const purchase = await client.query<{ version: number }>(
        "update app_private.lesson_purchase set amount_minor=$3,currency=$4,version=version+1,updated_at=now() where workspace_id=$1 and id=$2 and source_kind='generated_single' returning version",
        [workspaceId, source.purchase_id, input.amountMinor, input.currency],
      )
      const session = await client.query<{ version: number }>(
        'update app_private.course_session set version=version+1,updated_at=now() where workspace_id=$1 and id=$2 returning version',
        [workspaceId, sessionId],
      )
      return {
        sessionId,
        sessionVersion: session.rows[0]!.version,
        purchaseId: source.purchase_id,
        purchaseVersion: purchase.rows[0]!.version,
      }
    })
  }

  async reEvaluate(identity: AuthenticatedIdentity, sessionId: string, raw: unknown) {
    const input = reEvaluateSchema.parse(raw)
    return this.transact(identity, async (client, workspaceId) => {
      const source = (await this.lockSessions(client, workspaceId, [sessionId]))[0]
      if (
        !source ||
        !['generated_single', 'pending'].includes(source.kind) ||
        source.session_version !== input.expectedSessionVersion ||
        source.source_version !== input.expectedSourceVersion
      )
        throw new SingleLessonConflict(
          'single_lesson_changed',
          [sessionId],
          source
            ? {
                sessionId,
                sessionVersion: source.session_version,
                sourceVersion: source.source_version,
                kind: source.kind,
                purchaseVersion: source.purchase_version,
              }
            : null,
        )
      const chosen = await client.query<{ id: string }>(
        `select p.id from app_private.lesson_purchase p join app_private.workspace w on w.id=p.workspace_id
         where p.workspace_id=$1 and p.student_id=$2 and p.source_kind='manual'
           and (p.entitlement_venue_id is null or p.entitlement_venue_id=$3)
           and (p.purchased_at at time zone w.time_zone)::date <= ($4::timestamptz at time zone w.time_zone)::date
           and (select count(*) from app_private.session_lesson_source a where a.workspace_id=$1 and a.purchase_id=p.id and a.kind='manual') < p.lesson_count
         order by (p.entitlement_venue_id is not null) desc,p.purchased_at,p.id limit 1`,
        [workspaceId, source.student_id, source.venue_id, source.ends_at],
      )
      if (!chosen.rows[0]) throw new SingleLessonConflict('no_eligible_package', [sessionId])
      await client.query(
        "update app_private.session_lesson_source set kind='manual',purchase_id=$3,version=version+1,decided_at=now() where workspace_id=$1 and session_id=$2",
        [workspaceId, sessionId, chosen.rows[0].id],
      )
      if (source.purchase_id)
        await client.query(
          'delete from app_private.lesson_purchase where workspace_id=$1 and id=$2',
          [workspaceId, source.purchase_id],
        )
      const changed = await client.query<{ version: number }>(
        'update app_private.course_session set version=version+1,updated_at=now() where workspace_id=$1 and id=$2 returning version',
        [workspaceId, sessionId],
      )
      return {
        sessionId,
        sessionVersion: changed.rows[0]!.version,
        sourceVersion: source.source_version + 1,
        purchaseId: chosen.rows[0].id,
      }
    })
  }
}
