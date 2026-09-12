import { describe, expect, it } from 'vitest'
import { resolveCoachIdentity } from './coach-identity'

describe('resolveCoachIdentity', () => {
  it('uses the nonblank Workspace display name for both name and avatar', () => {
    expect(resolveCoachIdentity({ displayName: ' 林教練 ', email: 'coach@example.com' })).toEqual({
      name: '林教練',
      initials: '林教',
      email: 'coach@example.com'
    })
  })

  it('falls back from Workspace settings to the email local part, then Coach', () => {
    expect(
      resolveCoachIdentity({ displayName: ' ', email: 'form.coach@example.com' })
    ).toMatchObject({
      name: 'form.coach',
      initials: 'FO'
    })
    expect(resolveCoachIdentity({ displayName: null, email: null })).toMatchObject({
      name: '教練',
      initials: '教練'
    })
  })
})
