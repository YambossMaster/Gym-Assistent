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
    expect(
      resolveCoachIdentity({ displayName: '我的工作台', email: 'alpha.coach@example.com' })
    ).toMatchObject({
      name: 'alpha.coach',
      initials: 'AL'
    })
    expect(resolveCoachIdentity({ displayName: null, email: null })).toMatchObject({
      name: '訪客',
      initials: '訪客'
    })
  })
})
