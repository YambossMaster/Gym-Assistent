import { Pool } from 'pg'
import { PostgresStudentRepository } from './adapters/postgres-student-repository.js'
import { loadConfig } from './config.js'
import { buildServer } from './http/server.js'
import { OidcIdentityVerifier } from './identity/oidc-identity.js'
import { StudentModule } from './students/student-module.js'

const config = loadConfig()
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})
const repository = new PostgresStudentRepository(pool)
const supabaseIssuer = `${config.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`
const identityVerifier = new OidcIdentityVerifier({
  issuer: supabaseIssuer,
  audience: config.SUPABASE_JWT_AUDIENCE,
  jwksUrl: `${supabaseIssuer}/.well-known/jwks.json`,
})
const server = buildServer({
  identityVerifier,
  students: new StudentModule({ repository }),
  logger: true,
})

server.addHook('onClose', async () => {
  await pool.end()
})

await server.listen({ host: config.HOST, port: config.PORT })
