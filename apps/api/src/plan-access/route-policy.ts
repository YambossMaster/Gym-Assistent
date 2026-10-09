export type RoutePolicy =
  | 'allow'
  | 'premium'
  | 'operational-write'
  | 'create-student'
  | 'update-student'
  | 'delete-student'
  | 'create-venue'
  | 'update-venue'
  | 'delete-venue'

export function routePolicy(method: string, route: string | undefined): RoutePolicy {
  if (!route?.startsWith('/v1/')) return 'allow'
  if (route.startsWith('/v1/public/')) return 'allow'
  if (
    route === '/v1/finances/current' ||
    route === '/v1/finances/months' ||
    route === '/v1/finances/months/:month' ||
    route === '/v1/finances/deleted' ||
    route.startsWith('/v1/finances/entries') ||
    route === '/v1/students/:studentId/performance' ||
    route === '/v1/students/:studentId/performance/:definitionId'
  )
    return 'premium'
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'allow'
  if (route === '/v1/students' && method === 'POST') return 'create-student'
  if (route === '/v1/students/:studentId' && method === 'PATCH') return 'update-student'
  if (route === '/v1/students/:studentId' && method === 'DELETE') return 'delete-student'
  if (route === '/v1/venues' && method === 'POST') return 'create-venue'
  if (route === '/v1/venues/:venueId' && method === 'PATCH') return 'update-venue'
  if (route === '/v1/venues/:venueId' && method === 'DELETE') return 'delete-venue'
  if (
    route === '/v1/beta/redeem' ||
    route === '/v1/plan/subscription' ||
    route === '/v1/exports' ||
    route === '/v1/finance-export' ||
    route.startsWith('/v1/calendar-integration') ||
    route === '/v1/workspace-settings' ||
    route.startsWith('/v1/account') ||
    route === '/v1/today/notifications/read' ||
    route === '/v1/today/notifications/dismiss' ||
    route === '/v1/capability-links/:linkId/revoke' ||
    route.endsWith('/preview')
  )
    return 'allow'
  return 'operational-write'
}

export function isStudentArchiveOnly(body: unknown, current: Record<string, unknown>): boolean {
  if (!body || typeof body !== 'object') return false
  const input = body as Record<string, unknown>
  if (current.active !== true || input.active !== false || input.version !== current.version)
    return false
  return ['name', 'phone', 'goal', 'privateNote', 'ageRange', 'defaultVenueId', 'lineLinked'].every(
    (key) => input[key] === current[key],
  )
}

export function isVenueArchiveOnly(body: unknown, current: Record<string, unknown>): boolean {
  if (!body || typeof body !== 'object') return false
  const input = body as Record<string, unknown>
  if (
    current.active !== true ||
    input.active !== false ||
    input.version !== current.version ||
    input.name !== current.name
  )
    return false
  return input.address === undefined || input.address === current.address
}
