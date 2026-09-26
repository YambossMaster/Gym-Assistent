import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import {
  applicableRule,
  creditSchema,
  coachSuppliedStudentSchema,
  createVenueSchema,
  editVenueSchema,
  editEntrySchema,
  entryVersionSchema,
  FinanceError,
  financeLedger,
  historySchema,
  manualEntrySchema,
  monthlyFinance,
  payoutSchema,
  ruleSchema,
  salarySchema,
  venueCourseRecords,
  venueCreditBalances,
  type FeeRule,
  type FinanceSnapshot,
} from '../finances/finance.js'
import type { FinanceRepository } from '../finances/finance-module.js'
import { localMonthPeriod } from '../today/today.js'

export class PostgresFinanceRepository implements FinanceRepository {
  constructor(private readonly pool: Pool) {}
  async scoped<T>(workspaceId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const c = await this.pool.connect()
      try {
        await c.query('begin isolation level repeatable read')
        await c.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
        const result = await work(c)
        await c.query('commit')
        return result
      } catch (e) {
        await c.query('rollback')
        // Retry only transactions known to have rolled back; version checks run on fresh state.
        if (!['40001', '40P01'].includes((e as { code?: string }).code ?? '') || attempt >= 2)
          throw e
      } finally {
        c.release()
      }
    }
  }
  async income(w: string, startsAt?: Date, endsAt?: Date) {
    return this.scoped(w, async (c) => {
      const result = await c.query(
        `select currency,sum(amount_minor)::text amount from app_private.lesson_purchase
         where workspace_id=$1 and ($2::timestamptz is null or purchased_at >= $2)
           and ($3::timestamptz is null or purchased_at < $3)
         group by currency order by currency`,
        [w, startsAt ?? null, endsAt ?? null],
      )
      return result.rows.map((r) => ({
        currency: String(r.currency),
        amountMinor: Number(r.amount),
      }))
    })
  }
  async snapshot(workspaceId: string) {
    return this.scoped(workspaceId, (c) => this.load(c, workspaceId))
  }
  private async load(c: PoolClient, w: string): Promise<FinanceSnapshot> {
    const timeZone = (await c.query('select time_zone from app_private.workspace where id=$1', [w]))
      .rows[0].time_zone as string
    const venues = (
      await c.query(
        `select v.id,v.name,v.address,v.active,v.version,v.low_occurrence "lowOccurrence",v.low_occurred_at "lowOccurredAt",
          not (
            exists(select 1 from app_private.course_session s where s.workspace_id=v.workspace_id and s.venue_id=v.id) or
            exists(select 1 from app_private.schedule_series s where s.workspace_id=v.workspace_id and s.venue_id=v.id) or
            exists(select 1 from app_private.lesson_purchase p where p.workspace_id=v.workspace_id and (p.venue_id=v.id or p.entitlement_venue_id=v.id)) or
            exists(select 1 from app_private.venue_credit_purchase p where p.workspace_id=v.workspace_id and p.venue_id=v.id) or
            exists(select 1 from app_private.venue_payout p where p.workspace_id=v.workspace_id and p.venue_id=v.id) or
            exists(select 1 from app_private.venue_salary_rule sr where sr.workspace_id=v.workspace_id and sr.venue_id=v.id) or
            exists(select 1 from app_private.venue_coach_supplied_student cs where cs.workspace_id=v.workspace_id and cs.venue_id=v.id) or
            exists(select 1 from app_private.student s where s.workspace_id=v.workspace_id and s.default_venue_id=v.id)
          ) "canDelete"
          from app_private.venue v where v.workspace_id=$1 order by v.name,v.id`,
        [w],
      )
    ).rows.map((v) => ({ ...v, lowOccurredAt: v.lowOccurredAt?.toISOString() ?? null }))
    const rules = (
      await c.query(
        'select id,venue_id "venueId",effective_from::text "effectiveFrom",effective_at "effectiveAt",kind,collection_mode "collectionMode",rate,coach_rate "coachRate",venue_rate "venueRate",amount_minor "amountMinor",currency from app_private.venue_fee_rule where workspace_id=$1 order by effective_at,id',
        [w],
      )
    ).rows.map((r) => ({
      ...r,
      effectiveAt: r.effectiveAt.toISOString(),
      rate: r.rate === null ? null : Number(r.rate),
      coachRate: r.coachRate === null ? null : Number(r.coachRate),
      venueRate: r.venueRate === null ? null : Number(r.venueRate),
      amountMinor: r.amountMinor === null ? null : Number(r.amountMinor),
    }))
    const purchases = (
      await c.query(
        `select p.id,p.purchased_at "purchasedAt",p.student_id "studentId",s.name "studentName",(p.purchased_at at time zone $2)::date::text "purchasedOn",p.lesson_count "lessonCount",p.amount_minor "amountMinor",p.currency,p.collection_mode "collectionMode",p.entitlement_venue_id "venueId",p.entitlement_customer_source "customerSource" from app_private.lesson_purchase p join app_private.student s on s.workspace_id=p.workspace_id and s.id=p.student_id where p.workspace_id=$1 order by p.purchased_at,p.id`,
        [w, timeZone],
      )
    ).rows.map((p) => ({
      ...p,
      purchasedAt: p.purchasedAt.toISOString(),
      amountMinor: Number(p.amountMinor),
    }))
    const sessions = (
      await c.query(
        `select c.id,c.starts_at "startsAt",c.ends_at "endsAt",c.student_id "studentId",s.name "studentName",(c.ends_at at time zone $2)::date::text date,c.status,c.venue_id "venueId",c.fee_rule_id "feeRuleId",c.customer_source "customerSource",c.location,c.version from app_private.course_session c join app_private.student s on s.workspace_id=c.workspace_id and s.id=c.student_id where c.workspace_id=$1 order by c.ends_at nulls first,c.id`,
        [w, timeZone],
      )
    ).rows.map((s) => ({
      ...s,
      startsAt: s.startsAt?.toISOString() ?? null,
      endsAt: s.endsAt?.toISOString() ?? null,
    }))
    const credits = (
      await c.query(
        'select id,venue_id "venueId",purchased_on::text "purchasedOn",starts_deducting_at "startsDeductingAt",lesson_count "lessonCount",amount_minor "amountMinor",currency,private_note "privateNote",version from app_private.venue_credit_purchase where workspace_id=$1 order by purchased_on,id',
        [w],
      )
    ).rows.map((p) => ({
      ...p,
      startsDeductingAt: p.startsDeductingAt.toISOString(),
      amountMinor: Number(p.amountMinor),
    }))
    const payouts = (
      await c.query(
        'select id,venue_id "venueId",purchase_id "purchaseId",session_id "sessionId",received_on::text "receivedOn",amount_minor "amountMinor",currency,version from app_private.venue_payout where workspace_id=$1 order by received_on,id',
        [w],
      )
    ).rows.map((p) => ({ ...p, amountMinor: Number(p.amountMinor) }))
    const series = (
      await c.query(
        'select ss.id,ss.version,ss.location,ss.venue_id "venueId",ss.customer_source "customerSource",s.name "studentName" from app_private.schedule_series ss join app_private.student s on s.workspace_id=ss.workspace_id and s.id=ss.student_id where ss.workspace_id=$1 order by s.name,ss.id',
        [w],
      )
    ).rows
    const salaryRules = (
      await c.query(
        'select id,venue_id "venueId",effective_from::text "effectiveFrom",enabled,amount_minor "amountMinor",currency,pay_day "payDay" from app_private.venue_salary_rule where workspace_id=$1 order by effective_from,id',
        [w],
      )
    ).rows.map((r) => ({
      ...r,
      amountMinor: r.amountMinor === null ? null : Number(r.amountMinor),
    }))
    const coachSuppliedStudents = (
      await c.query(
        'select venue_id "venueId",student_id "studentId" from app_private.venue_coach_supplied_student where workspace_id=$1 order by venue_id,student_id',
        [w],
      )
    ).rows
    const sessionAdjustments = (
      await c.query(
        'select session_id "sessionId",venue_id "venueId",mode,credit_id "creditId",amount_minor "amountMinor",rate,version from app_private.venue_session_adjustment where workspace_id=$1',
        [w],
      )
    ).rows.map((a) => ({
      ...a,
      amountMinor: a.amountMinor === null ? null : Number(a.amountMinor),
      rate: a.rate === null ? null : Number(a.rate),
    }))
    const entryStates = (
      await c.query(
        'select entry_id "entryId",version,hidden,manual_amount_minor "manualAmountMinor",manual_at "manualAt",manual_label "manualLabel",source_fingerprint "sourceFingerprint",source_snapshot "sourceSnapshot" from app_private.finance_entry_state where workspace_id=$1',
        [w],
      )
    ).rows.map((s) => ({
      ...s,
      manualAmountMinor: s.manualAmountMinor === null ? null : Number(s.manualAmountMinor),
      manualAt: s.manualAt?.toISOString() ?? null,
    }))
    const manualEntries = (
      await c.query(
        'select id,occurred_at "occurredAt",label,direction,amount_minor "amountMinor",currency,private_note "privateNote",version from app_private.finance_manual_entry where workspace_id=$1',
        [w],
      )
    ).rows.map((e) => ({
      ...e,
      occurredAt: e.occurredAt.toISOString(),
      amountMinor: Number(e.amountMinor),
    }))
    return {
      timeZone,
      venues,
      rules,
      purchases,
      sessions,
      credits,
      payouts,
      series,
      salaryRules,
      coachSuppliedStudents,
      sessionAdjustments,
      entryStates,
      manualEntries,
    }
  }
  async command(
    w: string,
    op: string,
    venueId: string | undefined,
    entityId: string | undefined,
    raw: unknown,
  ) {
    return this.scoped(w, async (c) => {
      // Serialize finance edits for a Workspace; version checks still reject stale clients.
      if (entityId && !op.startsWith('entry-')) z.uuid().parse(entityId)
      await c.query('select id from app_private.workspace where id=$1 for update', [w])
      if (op.startsWith('entry-')) return this.entryCommand(c, w, op, entityId, raw)
      if (op === 'course-record-edit' || op === 'course-record-preview')
        return this.courseRecordCommand(
          c,
          w,
          venueId!,
          entityId!,
          raw,
          op === 'course-record-preview',
        )
      if (op === 'create') {
        const input = createVenueSchema.parse(raw),
          id = randomUUID()
        const existing = (
          await c.query(
            'select id,name,active,version from app_private.venue where workspace_id=$1 and lower(btrim(name))=lower(btrim($2)) order by version desc,id limit 1',
            [w, input.name],
          )
        ).rows[0]
        if (existing) throw new FinanceError(409, '該場地已存在。', existing)
        await c.query(
          'insert into app_private.venue(id,workspace_id,name,address) values($1,$2,$3,$4)',
          [id, w, input.name, input.address?.trim() || null],
        )
        const rule = input.rule ? ruleSchema.parse({ ...input.rule, version: 1 }) : null
        const salary = input.salary ? salarySchema.parse({ ...input.salary, version: 1 }) : null
        const credit = input.credit ? creditSchema.parse(input.credit) : null
        if (credit && rule?.kind !== 'prepaid')
          throw new FinanceError(400, '只有預購堂數場地可以登錄預購。')
        await c.query(
          'insert into app_private.venue_fee_rule(workspace_id,venue_id,effective_from,kind,collection_mode,rate,coach_rate,venue_rate,amount_minor,currency,effective_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,coalesce($11::timestamptz,$3::date::timestamp at time zone (select time_zone from app_private.workspace where id=$1)))',
          [
            w,
            id,
            rule?.effectiveFrom ?? '0001-01-01',
            rule?.kind ?? 'untracked',
            rule?.collectionMode ?? 'coach',
            rule?.rate ?? null,
            rule?.coachRate ?? null,
            rule?.venueRate ?? null,
            rule?.amountMinor ?? null,
            rule?.currency ?? null,
            rule?.effectiveAt ?? null,
          ],
        )
        if (salary?.enabled) {
          await c.query(
            'insert into app_private.venue_salary_rule(id,workspace_id,venue_id,effective_from,enabled,amount_minor,currency,pay_day) values($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              randomUUID(),
              w,
              id,
              salary.effectiveFrom,
              true,
              salary.amountMinor,
              salary.currency,
              salary.payDay,
            ],
          )
        }
        if (credit) {
          await c.query(
            'insert into app_private.venue_credit_purchase(id,workspace_id,venue_id,purchased_on,lesson_count,amount_minor,currency,private_note,starts_deducting_at) values($1,$2,$3,$4,$5,$6,$7,$8,coalesce($9::timestamptz,$4::date::timestamp at time zone (select time_zone from app_private.workspace where id=$2)))',
            [
              randomUUID(),
              w,
              id,
              credit.purchasedOn,
              credit.lessonCount,
              credit.amountMinor,
              credit.currency,
              credit.privateNote,
              credit.startsDeductingAt ?? null,
            ],
          )
        }
        return {
          entity: {
            id,
            name: input.name,
            address: input.address?.trim() || null,
            active: true,
            version: 1,
          },
          affected: ['venues', 'finances'],
        }
      }
      z.uuid().parse(venueId)
      const venue = (
        await c.query(
          'select id,name,active,version,address from app_private.venue where workspace_id=$1 and id=$2 for update',
          [w, venueId],
        )
      ).rows[0]
      if (!venue) throw new FinanceError(404, '找不到場地。')
      const checkVersion = (version: number, current = venue) => {
        if (version !== current.version)
          throw new FinanceError(409, '資料已更新，請確認最新內容後再儲存。', current)
      }
      if (op === 'delete') {
        const input = z.object({ version: z.number().int().positive() }).strict().parse(raw)
        checkVersion(input.version)
        const references = await c.query(
          `select
            exists(select 1 from app_private.course_session where workspace_id=$1 and venue_id=$2) or
            exists(select 1 from app_private.schedule_series where workspace_id=$1 and venue_id=$2) or
            exists(select 1 from app_private.lesson_purchase where workspace_id=$1 and (venue_id=$2 or entitlement_venue_id=$2)) or
            exists(select 1 from app_private.venue_credit_purchase where workspace_id=$1 and venue_id=$2) or
            exists(select 1 from app_private.venue_payout where workspace_id=$1 and venue_id=$2) or
            exists(select 1 from app_private.venue_salary_rule where workspace_id=$1 and venue_id=$2) or
            exists(select 1 from app_private.venue_coach_supplied_student where workspace_id=$1 and venue_id=$2) or
            exists(select 1 from app_private.student where workspace_id=$1 and default_venue_id=$2)
            as used`,
          [w, venueId],
        )
        if (references.rows[0]?.used)
          throw new FinanceError(409, '此場地已有課程、購課或收支紀錄，無法刪除；可以維持封存。')
        await c.query('delete from app_private.venue where workspace_id=$1 and id=$2', [w, venueId])
        return { entity: { id: venueId }, affected: ['venues', 'finances', 'calendar', 'today'] }
      }
      if (op === 'edit') {
        const input = editVenueSchema.parse(raw)
        checkVersion(input.version)
        if (input.name !== venue.name) {
          const duplicate = (
            await c.query(
              'select id,name,active,version from app_private.venue where workspace_id=$1 and id<>$2 and lower(btrim(name))=lower(btrim($3)) limit 1',
              [w, venueId, input.name],
            )
          ).rows[0]
          if (duplicate) throw new FinanceError(409, '該場地已存在。', duplicate)
        }
        const result = await c.query(
          'update app_private.venue set name=$3,active=$4,address=$5,version=version+1 where workspace_id=$1 and id=$2 returning id,name,active,version,address',
          [
            w,
            venueId,
            input.name,
            input.active,
            input.address === undefined ? venue.address : input.address?.trim() || null,
          ],
        )
        return { entity: result.rows[0], affected: ['venues', 'finances', 'calendar', 'today'] }
      }
      if (op === 'salary') {
        const input = salarySchema.parse(raw)
        checkVersion(input.version)
        const exists = await c.query(
          'select id from app_private.venue_salary_rule where workspace_id=$1 and venue_id=$2 and effective_from=$3',
          [w, venueId, input.effectiveFrom],
        )
        if (exists.rowCount) throw new FinanceError(409, '此日期已有底薪設定，請選擇其他生效日期。')
        const id = randomUUID()
        await c.query(
          'insert into app_private.venue_salary_rule(id,workspace_id,venue_id,effective_from,enabled,amount_minor,currency,pay_day) values($1,$2,$3,$4,$5,$6,$7,$8)',
          [
            id,
            w,
            venueId,
            input.effectiveFrom,
            input.enabled,
            input.amountMinor,
            input.currency,
            input.payDay,
          ],
        )
        await c.query(
          'update app_private.venue set version=version+1 where workspace_id=$1 and id=$2',
          [w, venueId],
        )
        return { entity: { id, ...input }, affected: ['venues', 'finances'] }
      }
      if (op === 'coach-supplied-student') {
        const input = coachSuppliedStudentSchema.parse(raw)
        checkVersion(input.version)
        const student = await c.query(
          'select id from app_private.student where workspace_id=$1 and id=$2',
          [w, input.studentId],
        )
        if (!student.rowCount) throw new FinanceError(404, '找不到學生。')
        if (input.coachSupplied)
          await c.query(
            'insert into app_private.venue_coach_supplied_student(workspace_id,venue_id,student_id) values($1,$2,$3) on conflict do nothing',
            [w, venueId, input.studentId],
          )
        else
          await c.query(
            'delete from app_private.venue_coach_supplied_student where workspace_id=$1 and venue_id=$2 and student_id=$3',
            [w, venueId, input.studentId],
          )
        const source = input.coachSupplied ? 'coach' : 'venue'
        await c.query(
          "update app_private.course_session set customer_source=$4,version=version+1 where workspace_id=$1 and venue_id=$2 and student_id=$3 and status='scheduled' and customer_source is distinct from $4",
          [w, venueId, input.studentId, source],
        )
        await c.query(
          'update app_private.schedule_series set customer_source=$4,version=version+1 where workspace_id=$1 and venue_id=$2 and student_id=$3 and customer_source is distinct from $4',
          [w, venueId, input.studentId, source],
        )
        await c.query(
          'update app_private.venue set version=version+1 where workspace_id=$1 and id=$2',
          [w, venueId],
        )
        return {
          entity: { studentId: input.studentId, coachSupplied: input.coachSupplied },
          affected: ['venues', 'finances', 'calendar', 'students'],
        }
      }
      if (op === 'rule' || op === 'rule-preview') {
        const input = ruleSchema.parse(raw)
        checkVersion(input.version)
        const before = await this.load(c, w),
          today = localMonthPeriod(new Date(), before.timeZone).date
        if (
          before.rules.some(
            (r) =>
              r.venueId === venueId &&
              (r.effectiveAt ?? r.effectiveFrom) === (input.effectiveAt ?? input.effectiveFrom),
          )
        )
          throw new FinanceError(400, '此生效時間已有費率，請使用不同時間建立新版本。')
        const rule: FeeRule = { ...input, id: randomUUID(), venueId: venueId! }
        const after = {
          ...before,
          rules: [...before.rules, rule],
          sessions: before.sessions.map((s) =>
            s.venueId === venueId && s.status === 'scheduled' && s.date
              ? {
                  ...s,
                  feeRuleId:
                    applicableRule([...before.rules, rule], venueId!, s.endsAt ?? s.date)?.id ??
                    null,
                }
              : s,
          ),
        }
        const scheduled = after.sessions.filter(
          (s, i) => s.feeRuleId !== before.sessions[i]?.feeRuleId,
        )
        const completed = before.sessions.filter(
          (s) =>
            s.venueId === venueId &&
            s.status === 'completed' &&
            s.date &&
            applicableRule([...before.rules, rule], venueId!, s.endsAt ?? s.date)?.id === rule.id,
        )
        const months = [
          ...new Set(
            [...scheduled, ...completed].flatMap((s) => (s.date ? [s.date.slice(0, 7)] : [])),
          ),
        ]
          .sort()
          .reverse()
        const preview = {
          scheduledCount: scheduled.length,
          completedCount: completed.length,
          completedChangedCount: completed.length,
          completed: completed.map((s) => ({
            sessionId: s.id,
            studentName: s.studentName,
            endsAt: s.endsAt,
          })),
          months: months.map((month) => ({
            month,
            before: monthlyFinance(before, month, today).totals,
            after: monthlyFinance(after, month, today).totals,
          })),
        }
        if (op === 'rule-preview') return preview
        await c.query(
          'insert into app_private.venue_fee_rule(id,workspace_id,venue_id,effective_from,kind,collection_mode,rate,coach_rate,venue_rate,amount_minor,currency,effective_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,coalesce($12::timestamptz,$4::date::timestamp at time zone (select time_zone from app_private.workspace where id=$2)))',
          [
            rule.id,
            w,
            venueId,
            input.effectiveFrom,
            input.kind,
            input.collectionMode,
            input.rate,
            input.coachRate,
            input.venueRate,
            input.amountMinor,
            input.currency,
            input.effectiveAt ?? null,
          ],
        )
        for (const s of scheduled) {
          const changed = await c.query(
            'update app_private.course_session set fee_rule_id=$3,version=version+1 where workspace_id=$1 and id=$2 and version=$4',
            [w, s.id, s.feeRuleId, s.version],
          )
          if (changed.rowCount !== 1) throw new FinanceError(409, '課程已更新，請重新預覽。')
        }
        for (const s of completed) {
          const changed = await c.query(
            'update app_private.course_session set fee_rule_id=$3,version=version+1 where workspace_id=$1 and id=$2 and version=$4',
            [w, s.id, rule.id, s.version],
          )
          if (changed.rowCount !== 1) throw new FinanceError(409, '課程已更新，請重新預覽。')
        }
        await c.query(
          'update app_private.venue set version=version+1 where workspace_id=$1 and id=$2',
          [w, venueId],
        )
        return {
          entity: rule,
          affected: ['venues', 'finances', 'calendar', 'today'],
          months,
          preview,
        }
      }
      if (
        op === 'credit' ||
        op === 'credit-edit' ||
        op === 'credit-preview' ||
        op === 'credit-edit-preview'
      ) {
        const months = new Set<string>()
        const input = (
          op === 'credit' || op === 'credit-preview'
            ? creditSchema
            : creditSchema.extend({ version: z.number().int().positive() })
        ).parse(raw)
        const id = entityId ?? randomUUID()
        months.add(input.purchasedOn.slice(0, 7))
        const before = await this.load(c, w)
        if (op === 'credit-edit' || op === 'credit-edit-preview') {
          const current = before.credits.find((p) => p.id === id && p.venueId === venueId)
          if (!current) throw new FinanceError(404, '找不到預購紀錄。')
          months.add(current.purchasedOn.slice(0, 7))
          checkVersion(
            z.object({ version: z.number().int().positive() }).parse(raw).version,
            current,
          )
          const manualAllocations =
            (
              await c.query(
                "select count(*)::int count from app_private.venue_session_adjustment where workspace_id=$1 and venue_id=$2 and credit_id=$3 and mode='batch'",
                [w, venueId, id],
              )
            ).rows[0]?.count ?? 0
          if (manualAllocations > input.lessonCount)
            throw new FinanceError(409, '指定到此批次的課堂超過新堂數。')
        }
        if (op === 'credit-preview' || op === 'credit-edit-preview') {
          const after: FinanceSnapshot = {
            ...before,
            credits: [
              ...before.credits.filter((p) => p.id !== id),
              {
                ...input,
                id,
                venueId: venueId!,
                version:
                  op === 'credit-edit-preview' ? (raw as { version: number }).version + 1 : 1,
              },
            ],
          }
          const beforeRows = venueCourseRecords(
            before,
            venueId!,
            localMonthPeriod(new Date(), before.timeZone).date,
          )
          const afterRows = venueCourseRecords(
            after,
            venueId!,
            localMonthPeriod(new Date(), before.timeZone).date,
          )
          const affected = afterRows.filter(
            (row) =>
              row.creditId !== beforeRows.find((old) => old.sessionId === row.sessionId)?.creditId,
          )
          return {
            affected: affected.map((row) => ({
              sessionId: row.sessionId,
              studentName: row.studentName,
              endsAt: row.endsAt,
              beforeCreditId:
                beforeRows.find((old) => old.sessionId === row.sessionId)?.creditId ?? null,
              afterCreditId: row.creditId,
            })),
            creditsBefore: venueCreditBalances(before).filter(
              (credit) => credit.venueId === venueId,
            ),
            creditsAfter: venueCreditBalances(after).filter((credit) => credit.venueId === venueId),
            months: [...months].sort().map((month) => ({
              month,
              before: monthlyFinance(
                before,
                month,
                localMonthPeriod(new Date(), before.timeZone).date,
              ).totals,
              after: monthlyFinance(
                after,
                month,
                localMonthPeriod(new Date(), before.timeZone).date,
              ).totals,
            })),
          }
        }
        if (op === 'credit-edit') {
          await c.query(
            'update app_private.venue_credit_purchase set purchased_on=$4,lesson_count=$5,amount_minor=$6,currency=$7,private_note=$8,starts_deducting_at=coalesce($9::timestamptz,$4::date::timestamp at time zone (select time_zone from app_private.workspace where id=$1)),version=version+1 where workspace_id=$1 and venue_id=$2 and id=$3',
            [
              w,
              venueId,
              id,
              input.purchasedOn,
              input.lessonCount,
              input.amountMinor,
              input.currency,
              input.privateNote,
              input.startsDeductingAt ?? null,
            ],
          )
        } else
          await c.query(
            'insert into app_private.venue_credit_purchase(id,workspace_id,venue_id,purchased_on,lesson_count,amount_minor,currency,private_note,starts_deducting_at) values($1,$2,$3,$4,$5,$6,$7,$8,coalesce($9::timestamptz,$4::date::timestamp at time zone (select time_zone from app_private.workspace where id=$2)))',
            [
              id,
              w,
              venueId,
              input.purchasedOn,
              input.lessonCount,
              input.amountMinor,
              input.currency,
              input.privateNote,
              input.startsDeductingAt ?? null,
            ],
          )
        return {
          entity: (await this.load(c, w)).credits.find((p) => p.id === id),
          affected: ['venues', 'finances', 'today'],
          months: [...months].sort().reverse(),
        }
      }
      if (op === 'credit-delete') {
        const input = z.object({ version: z.number().int().positive() }).strict().parse(raw)
        const current = (
          await c.query(
            'select id,purchased_on::text "purchasedOn",version from app_private.venue_credit_purchase where workspace_id=$1 and venue_id=$2 and id=$3 for update',
            [w, venueId, entityId],
          )
        ).rows[0]
        if (!current) throw new FinanceError(404, '找不到預購紀錄。')
        checkVersion(input.version, current)
        const manualAllocations =
          (
            await c.query(
              "select count(*)::int count from app_private.venue_session_adjustment where workspace_id=$1 and venue_id=$2 and credit_id=$3 and mode='batch'",
              [w, venueId, entityId],
            )
          ).rows[0]?.count ?? 0
        if (manualAllocations)
          throw new FinanceError(409, '此批次仍有手動指定的課堂，請先調整課堂紀錄。')
        await c.query(
          "update app_private.venue_session_adjustment set credit_id=null,version=version+1,updated_at=now() where workspace_id=$1 and venue_id=$2 and credit_id=$3 and mode='auto'",
          [w, venueId, entityId],
        )
        const removed = await c.query(
          'delete from app_private.venue_credit_purchase where workspace_id=$1 and venue_id=$2 and id=$3 and version=$4',
          [w, venueId, entityId, input.version],
        )
        if (removed.rowCount !== 1) throw new FinanceError(409, '預購紀錄已更新，請確認最新內容。')
        return {
          entity: { id: entityId },
          affected: ['venues', 'finances', 'today'],
          months: [current.purchasedOn.slice(0, 7)],
        }
      }
      if (op === 'payout' || op === 'payout-edit') {
        const months = new Set<string>()
        const input = (
          op === 'payout'
            ? payoutSchema
            : payoutSchema.safeExtend({ version: z.number().int().positive() })
        ).parse(raw)
        const snapshot = await this.load(c, w)
        months.add(input.receivedOn.slice(0, 7))
        if (
          input.purchaseId &&
          !snapshot.purchases.some(
            (p) =>
              p.id === input.purchaseId &&
              p.venueId === venueId &&
              p.collectionMode === 'venue' &&
              p.currency === input.currency,
          )
        )
          throw new FinanceError(404, '找不到此場地代收的購課紀錄。')
        if (
          input.sessionId &&
          !snapshot.sessions.some(
            (s) =>
              s.id === input.sessionId &&
              s.venueId === venueId &&
              s.status === 'completed' &&
              snapshot.rules.some(
                (r) =>
                  r.id === s.feeRuleId && r.kind === 'commission' && r.collectionMode === 'venue',
              ),
          )
        )
          throw new FinanceError(404, '找不到此場地代收的已完成課程。')
        const id = entityId ?? randomUUID()
        if (op === 'payout-edit') {
          const current = snapshot.payouts.find((p) => p.id === id && p.venueId === venueId)
          if (!current) throw new FinanceError(404, '找不到撥款紀錄。')
          months.add(current.receivedOn.slice(0, 7))
          checkVersion(
            z.object({ version: z.number().int().positive() }).parse(raw).version,
            current,
          )
          await c.query(
            'update app_private.venue_payout set received_on=$4,amount_minor=$5,currency=$6,purchase_id=$7,session_id=$8,version=version+1 where workspace_id=$1 and venue_id=$2 and id=$3',
            [
              w,
              venueId,
              id,
              input.receivedOn,
              input.amountMinor,
              input.currency,
              input.purchaseId,
              input.sessionId,
            ],
          )
        } else
          await c.query(
            'insert into app_private.venue_payout(id,workspace_id,venue_id,received_on,amount_minor,currency,purchase_id,session_id) values($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              id,
              w,
              venueId,
              input.receivedOn,
              input.amountMinor,
              input.currency,
              input.purchaseId,
              input.sessionId,
            ],
          )
        return {
          entity: (await this.load(c, w)).payouts.find((p) => p.id === id),
          affected: ['venues', 'finances', 'today'],
          months: [...months].sort().reverse(),
        }
      }
      if (op === 'history' || op === 'history-preview') {
        const input = historySchema.parse(raw)
        checkVersion(input.version)
        if (
          new Set(input.sessions.map((s) => s.id)).size !== input.sessions.length ||
          new Set(input.series.map((s) => s.id)).size !== input.series.length
        )
          throw new FinanceError(400, '不可重複選取課程。')
        const before = await this.load(c, w),
          today = localMonthPeriod(new Date(), before.timeZone).date
        const after: FinanceSnapshot = {
          ...before,
          sessions: before.sessions.map((s) => ({ ...s })),
        }
        const sourceFor = (studentId: string) =>
          before.coachSuppliedStudents?.some(
            (entry) => entry.venueId === venueId && entry.studentId === studentId,
          )
            ? ('coach' as const)
            : ('venue' as const)
        for (const ref of input.sessions) {
          const s = after.sessions.find((s) => s.id === ref.id)
          if (!s) throw new FinanceError(404, '找不到課程。')
          if (s.version !== ref.version) throw new FinanceError(409, '課程已更新。', s)
          if (!s.date) throw new FinanceError(400, '沒有授課日期的舊課程無法回填費用。')
          const rule = applicableRule(before.rules, venueId!, s.endsAt ?? s.date)
          if (!rule) throw new FinanceError(400, '請先建立對應日期的費率。')
          s.venueId = venueId!
          s.feeRuleId = rule.id
          s.customerSource = sourceFor(s.studentId)
        }
        const seriesSources = new Map<string, 'coach' | 'venue'>()
        for (const ref of input.series) {
          const s = (
            await c.query(
              'select id,version,student_id from app_private.schedule_series where workspace_id=$1 and id=$2',
              [w, ref.id],
            )
          ).rows[0]
          if (!s) throw new FinanceError(404, '找不到固定排程。')
          checkVersion(ref.version, s)
          seriesSources.set(ref.id, sourceFor(s.student_id))
        }
        const months = [
          ...new Set(
            after.sessions
              .filter((s) => input.sessions.some((r) => r.id === s.id))
              .map((s) => s.date!.slice(0, 7)),
          ),
        ]
          .sort()
          .reverse()
        const preview = {
          matches: after.sessions.filter((s) => input.sessions.some((r) => r.id === s.id)),
          seriesCount: input.series.length,
          months: months.map((month) => ({
            month,
            before: monthlyFinance(before, month, today).totals,
            after: monthlyFinance(after, month, today).totals,
          })),
        }
        if (op === 'history-preview') return preview
        for (const s of preview.matches) {
          const result = await c.query(
            'update app_private.course_session set venue_id=$3,fee_rule_id=$4,customer_source=$5,version=version+1 where workspace_id=$1 and id=$2 and version=$6',
            [w, s.id, venueId, s.feeRuleId, s.customerSource, s.version],
          )
          if (result.rowCount !== 1) throw new FinanceError(409, '課程已更新。')
        }
        for (const s of input.series) {
          const result = await c.query(
            'update app_private.schedule_series set venue_id=$3,customer_source=$4,version=version+1 where workspace_id=$1 and id=$2 and version=$5',
            [w, s.id, venueId, seriesSources.get(s.id), s.version],
          )
          if (result.rowCount !== 1) throw new FinanceError(409, '固定排程已更新。')
        }
        await c.query(
          'update app_private.venue set version=version+1 where workspace_id=$1 and id=$2',
          [w, venueId],
        )
        return {
          entity: preview,
          affected: ['venues', 'finances', 'calendar', 'today', 'students'],
          months,
        }
      }
      throw new FinanceError(400, '不支援的操作。')
    })
  }
  private async entryCommand(
    c: PoolClient,
    w: string,
    op: string,
    entryId: string | undefined,
    raw: unknown,
  ) {
    const snapshot = await this.load(c, w)
    const today = localMonthPeriod(new Date(), snapshot.timeZone).date
    if (op === 'entry-create') {
      const input = manualEntrySchema.parse(raw)
      const id = input.id ?? randomUUID()
      const result = await c.query(
        'insert into app_private.finance_manual_entry(id,workspace_id,occurred_at,label,direction,amount_minor,currency,private_note) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do nothing returning id',
        [
          id,
          w,
          input.occurredAt,
          input.label,
          input.direction,
          input.amountMinor,
          input.currency,
          input.privateNote,
        ],
      )
      if (!result.rowCount) {
        const prior = snapshot.manualEntries?.find((e) => e.id === id)
        if (
          !prior ||
          prior.occurredAt !== input.occurredAt ||
          prior.label !== input.label ||
          prior.direction !== input.direction ||
          prior.amountMinor !== input.amountMinor ||
          prior.currency !== input.currency ||
          prior.privateNote !== input.privateNote
        )
          throw new FinanceError(409, '明細識別已使用。')
      }
      return { entity: { id: `manual:${id}` }, affected: ['finances', 'today'] }
    }
    if (!entryId) throw new FinanceError(400, '缺少明細識別。')
    const manual = entryId.startsWith('manual:')
      ? snapshot.manualEntries?.find((e) => `manual:${e.id}` === entryId)
      : undefined
    const ledger = financeLedger(snapshot, today)
    const row = [...ledger.rows, ...ledger.deleted].find((r) => r.id === entryId)
    if (!row && !manual) throw new FinanceError(404, '找不到明細。')
    const version =
      op === 'entry-edit'
        ? editEntrySchema.parse(raw).version
        : entryVersionSchema.parse(raw).version
    if (manual) {
      if (version !== manual.version) throw new FinanceError(409, '明細已更新。', manual)
      if (op === 'entry-delete') {
        await c.query(
          'delete from app_private.finance_manual_entry where workspace_id=$1 and id=$2 and version=$3',
          [w, manual.id, version],
        )
        return { entity: { id: entryId }, affected: ['finances', 'today'] }
      }
      if (op !== 'entry-edit') throw new FinanceError(400, '自行新增的明細沒有這項操作。')
      const input = editEntrySchema.parse(raw)
      if (input.amountMinor !== undefined && input.amountMinor < 0)
        throw new FinanceError(400, '自行新增明細金額不可為負。')
      await c.query(
        'update app_private.finance_manual_entry set occurred_at=coalesce($4,occurred_at),label=coalesce($5,label),amount_minor=coalesce($6,amount_minor),version=version+1 where workspace_id=$1 and id=$2 and version=$3',
        [
          w,
          manual.id,
          version,
          input.occurredAt ?? null,
          input.label ?? null,
          input.amountMinor ?? null,
        ],
      )
      return { entity: { id: entryId }, affected: ['finances', 'today'] }
    }
    const state = snapshot.entryStates?.find((s) => s.entryId === entryId)
    if (version !== (state?.version ?? 0)) throw new FinanceError(409, '明細已更新。', row)
    const source = row!
    if (op === 'entry-restore' && source.sourceRemoved)
      throw new FinanceError(409, '來源已移除，請另存為自行新增。', source)
    const input = op === 'entry-edit' ? editEntrySchema.parse(raw) : null
    if (input?.amountMinor !== undefined && input.amountMinor < 0 && source.kind !== 'commission')
      throw new FinanceError(400, '只有抽成差額可以是負支出。')
    const hidden =
      op === 'entry-delete' ? true : op === 'entry-restore' ? false : (state?.hidden ?? false)
    const manualAmount =
      op === 'entry-reset' ? null : (input?.amountMinor ?? state?.manualAmountMinor ?? null)
    const manualAt = op === 'entry-reset' ? null : (input?.occurredAt ?? state?.manualAt ?? null)
    const manualLabel = op === 'entry-reset' ? null : (input?.label ?? state?.manualLabel ?? null)
    if (!['entry-edit', 'entry-delete', 'entry-restore', 'entry-reset'].includes(op))
      throw new FinanceError(400, '不支援的明細操作。')
    const fingerprint = source.sourceFingerprint ?? state?.sourceFingerprint ?? null
    const result = await c.query(
      `insert into app_private.finance_entry_state(workspace_id,entry_id,hidden,manual_amount_minor,manual_at,manual_label,source_fingerprint,source_snapshot)
       values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       on conflict(workspace_id,entry_id) do update set hidden=$3,manual_amount_minor=$4,manual_at=$5,manual_label=$6,
         source_fingerprint=case when $9='entry-reset' then $7 else app_private.finance_entry_state.source_fingerprint end,
         source_snapshot=$8::jsonb,version=app_private.finance_entry_state.version+1,updated_at=now()
       where app_private.finance_entry_state.version=$10 returning version`,
      [
        w,
        entryId,
        hidden,
        manualAmount,
        manualAt,
        manualLabel,
        fingerprint,
        JSON.stringify(source),
        op,
        version,
      ],
    )
    if (!result.rowCount) throw new FinanceError(409, '明細已更新。', source)
    return {
      entity: { id: entryId, version: result.rows[0].version },
      affected: ['finances', 'today'],
      months: [
        ...new Set([
          source.date.slice(0, 7),
          manualAt
            ? localMonthPeriod(new Date(manualAt), snapshot.timeZone).date.slice(0, 7)
            : source.originalDate?.slice(0, 7),
        ]),
      ],
    }
  }
  private async courseRecordCommand(
    c: PoolClient,
    w: string,
    venueId: string,
    sessionId: string,
    raw: unknown,
    preview = false,
  ) {
    const input = z
      .object({
        sessionVersion: z.number().int().positive(),
        recordVersion: z.number().int().nonnegative(),
        mode: z.enum(['auto', 'exempt', 'batch', 'amount', 'rate']),
        creditId: z.uuid().nullable().optional(),
        amountMinor: z.number().int().min(-999999999999).max(999999999999).nullable().optional(),
        rate: z.number().min(0).max(100).multipleOf(0.01).nullable().optional(),
      })
      .strict()
      .parse(raw)
    const snapshot = await this.load(c, w)
    if (!snapshot.venues.some((v) => v.id === venueId)) throw new FinanceError(404, '找不到場地。')
    const today = localMonthPeriod(new Date(), snapshot.timeZone).date
    const current = venueCourseRecords(snapshot, venueId, today).find(
      (r) => r.sessionId === sessionId,
    )
    if (!current) throw new FinanceError(404, '找不到已完成的場地課程。')
    if (
      current.sessionVersion !== input.sessionVersion ||
      current.recordVersion !== input.recordVersion
    )
      throw new FinanceError(409, '場地課程紀錄已更新。', current)
    if (current.rule?.kind === 'prepaid' && !['auto', 'exempt', 'batch'].includes(input.mode))
      throw new FinanceError(400, '預購課程只能調整扣堂。')
    if (current.rule?.kind !== 'prepaid' && input.mode === 'batch')
      throw new FinanceError(400, '這堂課不適用預購扣堂。')
    if (
      input.mode === 'amount' &&
      (input.amountMinor === undefined ||
        input.amountMinor === null ||
        (input.amountMinor < 0 && current.rule?.kind !== 'commission'))
    )
      throw new FinanceError(400, '請輸入此課堂有效的場地金額。')
    if (
      input.mode === 'rate' &&
      (input.rate === undefined || input.rate === null || current.rule?.kind !== 'commission')
    )
      throw new FinanceError(400, '只有抽成課堂可以調整費率。')
    if (input.mode === 'batch') {
      const batch = snapshot.credits.find((p) => p.id === input.creditId && p.venueId === venueId)
      if (!batch) throw new FinanceError(404, '找不到預購批次。')
      const occupied = venueCourseRecords(snapshot, venueId, today).filter(
        (r) => r.creditId === batch.id && r.sessionId !== sessionId,
      ).length
      if (occupied >= batch.lessonCount)
        throw new FinanceError(409, '此預購批次已無剩餘堂數。', current)
    }
    if (preview) {
      const changed: FinanceSnapshot = {
        ...snapshot,
        sessionAdjustments: [
          ...(snapshot.sessionAdjustments ?? []).filter((a) => a.sessionId !== sessionId),
          {
            sessionId,
            venueId,
            version: current.recordVersion + 1,
            mode: input.mode,
            creditId: input.mode === 'batch' ? (input.creditId ?? null) : null,
            amountMinor: input.mode === 'amount' ? (input.amountMinor ?? null) : null,
            rate: input.mode === 'rate' ? (input.rate ?? null) : null,
          },
        ],
      }
      const next = venueCourseRecords(changed, venueId, today).find(
        (r) => r.sessionId === sessionId,
      )
      const month = localMonthPeriod(new Date(current.endsAt!), snapshot.timeZone).date.slice(0, 7)
      return {
        sessionId,
        before: current,
        after: next,
        month,
        totalsBefore: monthlyFinance(snapshot, month, today).totals,
        totalsAfter: monthlyFinance(changed, month, today).totals,
        credits: snapshot.credits
          .filter((credit) => credit.venueId === venueId)
          .map((credit) => ({
            id: credit.id,
            purchasedOn: credit.purchasedOn,
            before: venueCourseRecords(snapshot, venueId, today).filter(
              (r) => r.creditId === credit.id,
            ).length,
            after: venueCourseRecords(changed, venueId, today).filter(
              (r) => r.creditId === credit.id,
            ).length,
            lessonCount: credit.lessonCount,
          })),
      }
    }
    const result = await c.query(
      `insert into app_private.venue_session_adjustment(workspace_id,session_id,venue_id,mode,credit_id,amount_minor,rate)
       values($1,$2,$3,$4,$5,$6,$7)
       on conflict(workspace_id,session_id) do update set mode=$4,credit_id=$5,amount_minor=$6,rate=$7,
         version=app_private.venue_session_adjustment.version+1,updated_at=now()
       where app_private.venue_session_adjustment.version=$8 returning version`,
      [
        w,
        sessionId,
        venueId,
        input.mode,
        input.mode === 'batch' ? input.creditId : null,
        input.mode === 'amount' ? input.amountMinor : null,
        input.mode === 'rate' ? input.rate : null,
        input.recordVersion,
      ],
    )
    if (!result.rowCount) throw new FinanceError(409, '場地課程紀錄已更新。', current)
    await c.query('select app_private.refresh_venue_balance($1,$2)', [w, venueId])
    const latest = (
      await c.query(
        'select version,credit_id "creditId" from app_private.venue_session_adjustment where workspace_id=$1 and session_id=$2',
        [w, sessionId],
      )
    ).rows[0]
    return {
      entity: { sessionId, version: latest.version, creditId: latest.creditId },
      affected: ['venues', 'finances', 'today'],
      months: [current.endsAt!.slice(0, 7)],
    }
  }
  async lowNotices(w: string) {
    return this.scoped(w, async (c) => {
      // SQL recomputes only venue balances; no Student ledger or training data is loaded for Today.
      await c.query(
        'select app_private.refresh_venue_balance(workspace_id,id) from app_private.venue where workspace_id=$1',
        [w],
      )
      const rows = (
        await c.query(
          `select v.id,v.name,v.low_occurrence,v.low_occurred_at,
        coalesce((select sum(p.lesson_count) from app_private.venue_credit_purchase p where p.workspace_id=v.workspace_id and p.venue_id=v.id),0)
        -(select count(*) from app_private.venue_session_adjustment a where a.workspace_id=v.workspace_id and a.venue_id=v.id and a.credit_id is not null) remaining,
        (select count(*) from app_private.course_session s join app_private.venue_fee_rule r on r.workspace_id=s.workspace_id and r.id=s.fee_rule_id and r.venue_id=s.venue_id
          where s.workspace_id=v.workspace_id and s.venue_id=v.id and s.status='completed' and r.kind='prepaid'
          and not exists(select 1 from app_private.venue_session_adjustment a where a.workspace_id=s.workspace_id and a.session_id=s.id and (a.credit_id is not null or a.mode='exempt'))) pending
        from app_private.venue v where v.workspace_id=$1 and v.low_occurrence is not null`,
          [w],
        )
      ).rows
      return rows.map((v) => ({
        id: `venue-balance:${v.id}:${v.low_occurrence}`,
        kind: 'low_venue_balance' as const,
        title: `${v.name} · 場地剩餘堂數偏低`,
        detail: `可用 ${v.remaining} 堂${Number(v.pending) ? ` · 待處理 ${v.pending} 堂` : ''}`,
        targetRoute: '/students/venues',
        occurredAt: v.low_occurred_at.toISOString(),
        readAt: null,
      }))
    })
  }
}
