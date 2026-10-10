import { describe, expect, it } from 'vitest'
import {
  BetaAdmissionError,
  BetaAdmissionModule,
  BetaRedemptionRateError,
  codeDigest,
  newBetaCode,
} from './beta-admission.js'
import { MemoryBetaAdmissionRepository } from './memory-beta-admission-repository.js'

const secret = 'test-secret-that-is-at-least-32-characters'
const first = { userId: '11111111-1111-4111-8111-111111111111' }

function setup() {
  let clock = new Date('2026-10-03T02:00:00.000Z')
  const code = newBetaCode()
  const repository = new MemoryBetaAdmissionRepository(secret, () => clock)
  repository.issueForTest(codeDigest(code), 2, new Date('2026-10-10T00:00:00.000Z'))
  const emails = new Map([[first.userId, 'coach@example.com']])
  const module = new BetaAdmissionModule(
    repository,
    { getVerifiedEmail: async (id) => emails.get(id) ?? null },
    secret,
    () => clock,
  )
  return { module, repository, code, emails, setClock: (next: Date) => (clock = next) }
}

describe('Beta admission', () => {
  it('starts free and requires verified Email only when redeeming', async () => {
    const { module, repository, code, emails } = setup()
    expect(await module.status(first)).toEqual({ state: 'free' })
    expect(repository.usageForTest(codeDigest(code))).toBe(0)
    emails.delete(first.userId)
    await expect(module.redeem(first, '127.0.0.1', { code })).rejects.toMatchObject({
      reason: 'email_unverified',
    })
    expect(repository.usageForTest(codeDigest(code))).toBe(0)
  })

  it('grants exactly 60 days and returns to free at expiry', async () => {
    const { module, code, setClock } = setup()
    const grant = await module.redeem(first, '127.0.0.1', { code })
    expect(grant).toEqual({
      state: 'promotional',
      startedAt: '2026-10-03T02:00:00.000Z',
      endsAt: '2026-12-02T02:00:00.000Z',
    })
    setClock(new Date('2026-12-02T02:00:00.000Z'))
    expect(await module.status(first)).toMatchObject({ state: 'free' })
  })

  it('redeems a single-use permanent code once and keeps an identical retry idempotent', async () => {
    const { module, repository, emails } = setup()
    const code = 'permanent-code'
    repository.issueForTest(codeDigest(code), 1, new Date('2026-10-10T00:00:00.000Z'), 'permanent')
    await expect(module.redeem(first, '127.0.0.1', { code })).resolves.toEqual({
      state: 'permanent',
      startedAt: '2026-10-03T02:00:00.000Z',
    })
    await expect(module.redeem(first, '127.0.0.1', { code })).resolves.toMatchObject({
      state: 'permanent',
    })
    expect(repository.usageForTest(codeDigest(code))).toBe(1)

    const second = { userId: '22222222-2222-4222-8222-222222222222' }
    emails.set(second.userId, 'second@example.com')
    await expect(module.redeem(second, '127.0.0.2', { code })).rejects.toMatchObject({
      reason: 'code_exhausted',
    })
    expect(repository.usageForTest(codeDigest(code))).toBe(1)
  })

  it('does not let one Workspace redeem a second code', async () => {
    const { module, repository, code } = setup()
    const permanentCode = 'another-permanent-code'
    repository.issueForTest(
      codeDigest(permanentCode),
      1,
      new Date('2026-10-10T00:00:00.000Z'),
      'permanent',
    )
    await module.redeem(first, '127.0.0.1', { code })
    await expect(module.redeem(first, '127.0.0.1', { code: permanentCode })).rejects.toMatchObject({
      reason: 'already_eligible',
    })
    expect(repository.usageForTest(codeDigest(code))).toBe(1)
    expect(repository.usageForTest(codeDigest(permanentCode))).toBe(0)
  })

  it('allows an uncapped promotional code while keeping one redemption per verified Email', async () => {
    const { module, repository, emails } = setup()
    const code = 'shared-beta-code'
    repository.issueForTest(codeDigest(code), null, new Date('2026-10-10T00:00:00.000Z'))
    for (let index = 0; index < 12; index += 1) {
      const identity = { userId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }
      emails.set(identity.userId, `coach-${index}@example.com`)
      await expect(
        module.redeem(identity, `127.0.0.${index + 1}`, { code }),
      ).resolves.toMatchObject({
        state: 'promotional',
      })
    }
    expect(repository.usageForTest(codeDigest(code))).toBe(12)
  })

  it('never restores a consumed seat or permits same-Email reuse after deletion', async () => {
    const { module, repository, code, emails } = setup()
    await module.redeem(first, '127.0.0.1', { code })
    repository.deleteUserForTest(first.userId)
    const replacement = { userId: '22222222-2222-4222-8222-222222222222' }
    emails.set(replacement.userId, 'coach@example.com')
    await expect(module.redeem(replacement, '127.0.0.2', { code })).rejects.toMatchObject({
      reason: 'already_used',
    })
    expect(repository.usageForTest(codeDigest(code))).toBe(1)
    const other = { userId: '33333333-3333-4333-8333-333333333333' }
    emails.set(other.userId, 'other@example.com')
    await expect(module.redeem(other, '127.0.0.3', { code })).resolves.toMatchObject({
      state: 'promotional',
    })
    expect(repository.usageForTest(codeDigest(code))).toBe(2)
  })

  it('limits malformed redemption requests per identity and returns retry timing', async () => {
    const { module, repository, code } = setup()
    for (let count = 0; count < 5; count += 1)
      await expect(module.redeem(first, '127.0.0.1', {})).rejects.toBeInstanceOf(BetaAdmissionError)
    await expect(module.redeem(first, '127.0.0.1', { code })).rejects.toBeInstanceOf(
      BetaRedemptionRateError,
    )
    expect(repository.usageForTest(codeDigest(code))).toBe(0)
  })

  it('uses a random full-length code', () => {
    const a = newBetaCode()
    const b = newBetaCode()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
    expect(codeDigest(a)).toMatch(/^[0-9a-f]{64}$/)
  })
})
