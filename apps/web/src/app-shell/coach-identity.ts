export interface CoachIdentitySource {
  displayName?: string | null
  email?: string | null
}

export interface CoachIdentity {
  name: string
  initials: string
  email: string | null
}

export function resolveCoachIdentity({ displayName, email }: CoachIdentitySource): CoachIdentity {
  const name = displayName?.trim() || email?.trim().split('@')[0] || '教練'
  return {
    name,
    initials: Array.from(name).slice(0, 2).join('').toUpperCase(),
    email: email?.trim() || null
  }
}
