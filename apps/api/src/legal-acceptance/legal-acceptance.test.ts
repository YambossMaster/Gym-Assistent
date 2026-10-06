import { describe, expect, it } from 'vitest'
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LegalAcceptanceError,
  LegalAcceptanceModule,
  type LegalAcceptanceRepository,
} from './legal-acceptance.js'

class MemoryLegalAcceptanceRepository implements LegalAcceptanceRepository {
  acceptedAt: string | null = null

  async status() {
    return this.acceptedAt
  }

  async accept(input: { acceptedAt: Date }) {
    this.acceptedAt ??= input.acceptedAt.toISOString()
    return this.acceptedAt
  }
}

const identity = { userId: '00000000-0000-4000-8000-000000000001' }

describe('legal acceptance', () => {
  it('requires the current documents and an explicit no-backup acknowledgement', async () => {
    const module = new LegalAcceptanceModule(new MemoryLegalAcceptanceRepository())
    await expect(
      module.accept(identity, {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        accepted: true,
        noBackupAcknowledged: false,
      }),
    ).rejects.toEqual(new LegalAcceptanceError('explicit_acceptance_required'))
  })

  it('records the authenticated Coach and returns an idempotent acceptance', async () => {
    const repository = new MemoryLegalAcceptanceRepository()
    const module = new LegalAcceptanceModule(repository, () => new Date('2026-10-06T15:00:00Z'))
    const input = {
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      accepted: true,
      noBackupAcknowledged: true,
    }
    expect(await module.status(identity)).toMatchObject({ accepted: false, acceptedAt: null })
    expect(await module.accept(identity, input)).toMatchObject({
      accepted: true,
      acceptedAt: '2026-10-06T15:00:00.000Z',
    })
    expect(await module.accept(identity, input)).toMatchObject({
      acceptedAt: '2026-10-06T15:00:00.000Z',
    })
  })
})
