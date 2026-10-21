import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { StudentModule } from '../students/student-module.js'
import type { PlanAccessModule } from './plan-access.js'

export async function reconcileFreeGroupPlans(
  owners: AsyncIterable<AuthenticatedIdentity> | Iterable<AuthenticatedIdentity>,
  planAccess: PlanAccessModule,
  students: StudentModule,
): Promise<number> {
  let archived = 0
  for await (const owner of owners) {
    if ((await planAccess.get(owner)).tier === 'free')
      archived += await students.archiveActiveGroupsForFreePlan(owner)
  }
  return archived
}
