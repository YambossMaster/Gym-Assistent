import { createServer, type Server } from 'node:http'
import { type AddressInfo } from 'node:net'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { afterEach, describe, expect, it } from 'vitest'
import { IdentityVerificationError } from './identity.js'
import { OidcIdentityVerifier } from './oidc-identity.js'

const issuer = 'https://project.supabase.co/auth/v1'
const audience = 'authenticated'
const openServers: Server[] = []

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  )
})

describe('OidcIdentityVerifier', () => {
  it('accepts a correctly signed Supabase-style access token', async () => {
    const fixture = await createJwksFixture()
    const verifier = new OidcIdentityVerifier({ issuer, audience, jwksUrl: fixture.jwksUrl })
    const token = await fixture.sign({
      subject: '00000000-0000-4000-8000-000000000001',
      email: 'coach@example.com',
    })

    await expect(verifier.verify(`Bearer ${token}`)).resolves.toEqual({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'coach@example.com',
    })
  })

  it('rejects a token issued for a different audience', async () => {
    const fixture = await createJwksFixture()
    const verifier = new OidcIdentityVerifier({ issuer, audience, jwksUrl: fixture.jwksUrl })
    const token = await fixture.sign({
      subject: '00000000-0000-4000-8000-000000000001',
      audience: 'service_role',
    })

    await expect(verifier.verify(`Bearer ${token}`)).rejects.toBeInstanceOf(
      IdentityVerificationError,
    )
  })
})

async function createJwksFixture() {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const publicJwk = await exportJWK(publicKey)
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ keys: [{ ...publicJwk, alg: 'RS256', kid: 'test-key' }] }))
  })
  openServers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    jwksUrl: `http://127.0.0.1:${port}/.well-known/jwks.json`,
    sign: ({
      subject,
      email,
      audience: tokenAudience = audience,
    }: {
      subject: string
      email?: string
      audience?: string
    }) =>
      new SignJWT(email ? { email } : {})
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(issuer)
        .setAudience(tokenAudience)
        .setSubject(subject)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey),
  }
}
