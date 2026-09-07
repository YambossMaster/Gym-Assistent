import { createRemoteJWKSet, jwtVerify } from 'jose'
import {
  type AuthenticatedIdentity,
  type IdentityVerifier,
  IdentityVerificationError,
  readBearerToken,
} from './identity.js'

export interface OidcIdentityConfig {
  issuer: string
  audience: string
  jwksUrl: string
}

export class OidcIdentityVerifier implements IdentityVerifier {
  readonly #config: OidcIdentityConfig
  readonly #jwks: ReturnType<typeof createRemoteJWKSet>

  constructor(config: OidcIdentityConfig) {
    this.#config = config
    this.#jwks = createRemoteJWKSet(new URL(config.jwksUrl))
  }

  async verify(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity> {
    const token = readBearerToken(authorizationHeader)

    try {
      const { payload } = await jwtVerify(token, this.#jwks, {
        issuer: this.#config.issuer,
        audience: this.#config.audience,
      })

      if (!payload.sub) {
        throw new IdentityVerificationError('Verified token has no subject')
      }

      return {
        userId: payload.sub,
        ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      }
    } catch (error) {
      if (error instanceof IdentityVerificationError) {
        throw error
      }
      throw new IdentityVerificationError('Invalid or expired access token')
    }
  }
}
