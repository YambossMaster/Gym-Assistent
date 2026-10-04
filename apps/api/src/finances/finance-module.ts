import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { StudentRepository } from '../students/student-repository.js'
import { localMonthPeriod } from '../today/today.js'
import {
  deriveFinance,
  FinanceError,
  financeLedger,
  monthSchema,
  monthlyFinance,
  venueCourseRecords,
  venueCreditBalances,
  type FinanceSnapshot,
} from './finance.js'

export interface FinanceRepository {
  snapshot(workspaceId: string): Promise<FinanceSnapshot>
  command(
    workspaceId: string,
    operation: string,
    venueId: string | undefined,
    entityId: string | undefined,
    input: unknown,
  ): Promise<unknown>
}
export class FinanceModule {
  constructor(
    private readonly workspace: Pick<StudentRepository, 'resolveWorkspace'>,
    private readonly repository: FinanceRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async exportVisibleRows(identity: AuthenticatedIdentity) {
    const snapshot = await this.repository.snapshot(await this.workspace.resolveWorkspace(identity))
    const today = localMonthPeriod(this.now(), snapshot.timeZone).date
    return {
      rows: financeLedger(snapshot, today).rows,
      venues: snapshot.venues.map(({ id, name }) => ({ id, name })),
      manualNotes: new Map(
        (snapshot.manualEntries ?? []).map(({ id, privateNote }) => [`manual:${id}`, privateNote]),
      ),
    }
  }
  async read(
    identity: AuthenticatedIdentity,
    kind: 'venues' | 'current' | 'months' | 'month' | 'deleted' | 'course-records',
    value?: string,
  ) {
    const snapshot = await this.repository.snapshot(await this.workspace.resolveWorkspace(identity))
    const today = localMonthPeriod(this.now(), snapshot.timeZone).date
    if (kind === 'course-records') {
      const [venueId, cursor] = (value ?? '').split(':')
      if (!snapshot.venues.some((venue) => venue.id === venueId))
        throw new FinanceError(404, '找不到場地。')
      const records = venueCourseRecords(snapshot, venueId ?? '', today)
      const found = cursor ? records.findIndex((r) => r.sessionId === cursor) : -1
      if (cursor && found < 0) throw new FinanceError(400, '課程列表已更新，請重新載入。')
      const start = cursor ? found + 1 : 0
      return {
        records: records.slice(start, start + 30),
        nextCursor: records.length > start + 30 ? records[start + 29]?.sessionId : null,
      }
    }
    if (kind === 'deleted') {
      const [month, cursor] = (value ?? '').split('|')
      monthSchema.parse(month)
      const deleted = financeLedger(snapshot, today).deleted.filter(
        (r) => r.date.slice(0, 7) === month,
      )
      const start = cursor ? Math.max(0, deleted.findIndex((r) => r.id === cursor) + 1) : 0
      return {
        rows: deleted.slice(start, start + 30),
        nextCursor: deleted.length > start + 30 ? deleted[start + 29]?.id : null,
      }
    }
    if (kind === 'venues')
      return {
        today,
        timeZone: snapshot.timeZone,
        ...deriveFinance(snapshot, today),
        rules: snapshot.rules,
        credits: venueCreditBalances(snapshot),
        salaryRules: snapshot.salaryRules ?? [],
        coachSuppliedStudents: snapshot.coachSuppliedStudents ?? [],
        sessions: snapshot.sessions,
        purchases: snapshot.purchases.map((purchase) => ({
          studentId: purchase.studentId,
          venueId: purchase.venueId,
          lessonCount: purchase.lessonCount,
        })),
        series: snapshot.series ?? [],
      }
    if (kind === 'months') {
      if (value) monthSchema.parse(value)
      const months = [
        ...new Set(financeLedger(snapshot, today).rows.map((r) => r.date.slice(0, 7))),
      ]
        .sort()
        .reverse()
        .filter((m) => !value || m < value)
      return { months: months.slice(0, 24), nextCursor: months.length > 24 ? months[23] : null }
    }
    return monthlyFinance(
      snapshot,
      kind === 'current' ? today.slice(0, 7) : monthSchema.parse(value),
      today,
    )
  }
  async command(
    identity: AuthenticatedIdentity,
    operation: string,
    venueId: string | undefined,
    entityId: string | undefined,
    input: unknown,
  ) {
    return this.repository.command(
      await this.workspace.resolveWorkspace(identity),
      operation,
      venueId,
      entityId,
      input,
    )
  }
}
