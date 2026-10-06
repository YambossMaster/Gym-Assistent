import type { Pool } from 'pg'
import type { LegalAcceptanceRepository } from './legal-acceptance.js'

export class PostgresLegalAcceptanceRepository implements LegalAcceptanceRepository {
  constructor(private readonly pool: Pool) {}

  async status(userId: string, termsVersion: string, privacyVersion: string) {
    const result = await this.pool.query<{ accepted_at: Date }>(
      `select accepted_at
       from app_private.legal_acceptance
       where user_id=$1 and terms_version=$2 and privacy_version=$3`,
      [userId, termsVersion, privacyVersion],
    )
    return result.rows[0]?.accepted_at.toISOString() ?? null
  }

  async accept(input: {
    userId: string
    termsVersion: string
    privacyVersion: string
    source: 'web'
    acceptedAt: Date
  }) {
    const result = await this.pool.query<{ accepted_at: Date }>(
      `insert into app_private.legal_acceptance
         (user_id,terms_version,privacy_version,source,accepted_at)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id,terms_version,privacy_version) do update
         set accepted_at=app_private.legal_acceptance.accepted_at
       returning accepted_at`,
      [input.userId, input.termsVersion, input.privacyVersion, input.source, input.acceptedAt],
    )
    return result.rows[0]!.accepted_at.toISOString()
  }
}
