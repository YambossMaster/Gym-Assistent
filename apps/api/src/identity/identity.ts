export interface AuthenticatedIdentity {
  userId: string
  email?: string
}

export interface IdentityVerifier {
  verify(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity>
}

export class IdentityVerificationError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'IdentityVerificationError'
  }
}

export function readBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new IdentityVerificationError()
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()
  if (!token) {
    throw new IdentityVerificationError()
  }

  return token
}
