import {
  type AuthenticatedIdentity,
  type IdentityVerifier,
  IdentityVerificationError,
  readBearerToken,
} from './identity.js'

export class DevelopmentIdentityVerifier implements IdentityVerifier {
  async verify(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity> {
    const token = readBearerToken(authorizationHeader)
    if (!token.startsWith('dev:')) {
      throw new IdentityVerificationError('Invalid development identity')
    }

    const userId = token.slice('dev:'.length).trim()
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    ) {
      throw new IdentityVerificationError('Invalid development identity')
    }

    return { userId }
  }
}
