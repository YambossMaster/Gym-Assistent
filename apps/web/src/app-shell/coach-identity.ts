export interface CoachIdentitySource {
  displayName?: string | null
  email?: string | null
}

export interface CoachIdentity {
  name: string
  initials: string
  email: string | null
}

const legacyDefaultDisplayNames = new Set(['我的工作台'])

export function resolveCoachDisplayName(
  displayName?: string | null,
  email?: string | null
): string {
  const workspaceName = displayName?.trim()
  if (workspaceName && !legacyDefaultDisplayNames.has(workspaceName)) return workspaceName
  return email?.trim().split('@')[0]?.trim() || '訪客'
}

export function resolveCoachIdentity({ displayName, email }: CoachIdentitySource): CoachIdentity {
  const name = resolveCoachDisplayName(displayName, email)
  return {
    name,
    initials: Array.from(name).slice(0, 2).join('').toUpperCase(),
    email: email?.trim() || null
  }
}
