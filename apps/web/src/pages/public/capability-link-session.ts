import type { CapabilityPurpose, IssuedCapabilityLink } from '../../api'

const prefix = 'gym-assistant:capability-link:v1:'

function storageKey(coachId: string, sessionId: string, purpose: CapabilityPurpose) {
  return `${prefix}${coachId}:${sessionId}:${purpose}`
}

export function readCapabilityLink(
  coachId: string,
  sessionId: string,
  purpose: CapabilityPurpose
): IssuedCapabilityLink | null {
  const key = storageKey(coachId, sessionId, purpose)
  try {
    const stored = sessionStorage.getItem(key)
    if (!stored) return null
    const value = JSON.parse(stored) as IssuedCapabilityLink
    if (
      typeof value?.token !== 'string' ||
      !value.token ||
      typeof value.link?.id !== 'string' ||
      value.link.purpose !== purpose ||
      value.link.status !== 'active' ||
      !(Date.parse(value.link.expiresAt) > Date.now())
    ) {
      sessionStorage.removeItem(key)
      return null
    }
    return value
  } catch {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Session storage can be unavailable; the in-memory copy still works.
    }
    return null
  }
}

export function saveCapabilityLink(
  coachId: string,
  sessionId: string,
  value: IssuedCapabilityLink
) {
  try {
    sessionStorage.setItem(
      storageKey(coachId, sessionId, value.link.purpose),
      JSON.stringify(value)
    )
  } catch {
    // Keep the current page usable if browser storage is unavailable.
  }
}

export function clearCapabilityLink(
  coachId: string,
  sessionId: string,
  purpose: CapabilityPurpose
) {
  try {
    sessionStorage.removeItem(storageKey(coachId, sessionId, purpose))
  } catch {
    // No persisted copy exists when browser storage is unavailable.
  }
}

export function clearOtherCoachCapabilityLinks(coachId: string | null) {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index)
      if (!key?.startsWith(prefix)) continue
      if (!coachId || !key.startsWith(`${prefix}${coachId}:`)) {
        sessionStorage.removeItem(key)
        continue
      }
      try {
        const value = JSON.parse(sessionStorage.getItem(key) ?? '') as IssuedCapabilityLink
        if (value.link?.status !== 'active' || !(Date.parse(value.link.expiresAt) > Date.now()))
          sessionStorage.removeItem(key)
      } catch {
        sessionStorage.removeItem(key)
      }
    }
  } catch {
    // No persisted copy exists when browser storage is unavailable.
  }
}
