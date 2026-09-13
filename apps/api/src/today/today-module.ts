import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { StudentRepository } from '../students/student-repository.js'
import type { WorkspaceSettingsRepository } from '../workspace/workspace-repository.js'
import { localMonthPeriod, selectTodayAttention, type TodayProjection } from './today.js'

export class TodayModule {
  constructor(
    private readonly repository: StudentRepository & WorkspaceSettingsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(identity: AuthenticatedIdentity): Promise<TodayProjection> {
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const settings = await this.repository.getWorkspaceSettings(workspaceId)
    const period = localMonthPeriod(this.now(), settings.timeZone)
    const [students, incomeByCurrency] = await Promise.all([
      this.repository.listStudents(workspaceId),
      this.repository.incomeSummaryForPeriod(workspaceId, period.startsAt, period.endsAt),
    ])
    const attention = selectTodayAttention(students)
    return {
      date: period.date,
      timeZone: settings.timeZone,
      summary: {
        activeStudents: students.filter((student) => student.active).length,
        incomePeriod: { startsOn: period.startsOn, endsOn: period.endsOn },
        incomeByCurrency,
        attentionCount: attention.length,
      },
      attention,
    }
  }
}
