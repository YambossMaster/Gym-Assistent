import { Pool } from 'pg'
import { PostgresStudentRepository } from './adapters/postgres-student-repository.js'
import { loadConfig } from './config.js'
import { buildServer } from './http/server.js'
import { OidcIdentityVerifier } from './identity/oidc-identity.js'
import { StudentModule } from './students/student-module.js'
import { WorkspaceModule } from './workspace/workspace-module.js'
import { AccountLifecycleModule } from './account-lifecycle/account-lifecycle-module.js'
import { SupabaseAccountDeletionExecutor } from './account-lifecycle/supabase-account-deletion-executor.js'
import { SupabaseRegistrationEmailLookup } from './account-registration/supabase-registration-email-lookup.js'

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
  workspace: new WorkspaceModule({ repository }),
  accountLifecycle: new AccountLifecycleModule({
    repository,
    deletionExecutor: new SupabaseAccountDeletionExecutor({
      supabaseUrl: config.SUPABASE_URL,
      secretKey: config.SUPABASE_SECRET_KEY,
    }),
  }),
  registrationEmails: new SupabaseRegistrationEmailLookup({
    supabaseUrl: config.SUPABASE_URL,
    ...(config.SUPABASE_SECRET_KEY ? { secretKey: config.SUPABASE_SECRET_KEY } : {}),
  }),
  logger: true,
})

server.addHook('onClose', async () => {
  await pool.end()
})

await server.listen({ host: config.HOST, port: config.PORT })
